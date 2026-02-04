import { Injectable, Logger } from '@nestjs/common';
import { ErrorHandlerService } from './error-handler.service';
import { CircuitBreakerService } from './circuit-breaker.service';

export interface DegradationConfig {
  enableCaching: boolean;
  cacheTimeout: number;
  fallbackData: any;
  essentialFeatures: string[];
  nonEssentialFeatures: string[];
}

export interface ServiceHealth {
  serviceName: string;
  isHealthy: boolean;
  lastCheck: Date;
  responseTime: number;
  errorRate: number;
  degradationLevel: 'none' | 'partial' | 'full';
}

@Injectable()
export class GracefulDegradationService {
  private readonly logger = new Logger(GracefulDegradationService.name);
  private readonly serviceHealth = new Map<string, ServiceHealth>();
  private readonly fallbackCache = new Map<string, { data: any; timestamp: Date; ttl: number }>();
  private readonly degradationConfigs = new Map<string, DegradationConfig>();

  constructor(
    private readonly errorHandler: ErrorHandlerService,
    private readonly circuitBreaker: CircuitBreakerService,
  ) {}

  /**
   * Register service for graceful degradation
   */
  registerService(serviceName: string, config: Partial<DegradationConfig> = {}): void {
    const defaultConfig: DegradationConfig = {
      enableCaching: true,
      cacheTimeout: 300000, // 5 minutes
      fallbackData: null,
      essentialFeatures: [],
      nonEssentialFeatures: [],
    };

    this.degradationConfigs.set(serviceName, { ...defaultConfig, ...config });
    
    this.serviceHealth.set(serviceName, {
      serviceName,
      isHealthy: true,
      lastCheck: new Date(),
      responseTime: 0,
      errorRate: 0,
      degradationLevel: 'none',
    });

    this.logger.log(`Service registered for graceful degradation: ${serviceName}`);
  }

  /**
   * Execute operation with graceful degradation
   */
  async executeWithDegradation<T>(
    serviceName: string,
    operation: () => Promise<T>,
    options: {
      cacheKey?: string;
      fallbackData?: T;
      essential?: boolean;
    } = {}
  ): Promise<{
    data: T;
    degraded: boolean;
    degradationLevel: 'none' | 'partial' | 'full';
    source: 'primary' | 'cache' | 'fallback';
  }> {
    const startTime = Date.now();
    
    try {
      // Try primary operation with circuit breaker
      const result = await this.circuitBreaker.executeWithCircuitBreaker(
        serviceName,
        operation,
        options.essential ? undefined : () => this.getFallbackResponse(serviceName, options)
      );

      // Update service health on success
      this.updateServiceHealth(serviceName, Date.now() - startTime, false);

      // Cache successful result if caching is enabled
      if (options.cacheKey) {
        this.cacheResult(serviceName, options.cacheKey, result);
      }

      return {
        data: result,
        degraded: false,
        degradationLevel: 'none',
        source: 'primary',
      };

    } catch (error) {
      this.logger.warn(`Primary operation failed for ${serviceName}: ${error.message}`);
      
      // Update service health on failure
      this.updateServiceHealth(serviceName, Date.now() - startTime, true);

      // Handle error and try degradation strategies
      await this.errorHandler.handleError(error, {
        operation: serviceName,
        metadata: { degradation: true },
      });

      return await this.handleDegradation(serviceName, options, error);
    }
  }

  /**
   * Get service health status
   */
  getServiceHealth(serviceName: string): ServiceHealth | null {
    return this.serviceHealth.get(serviceName) || null;
  }

  /**
   * Get all service health statuses
   */
  getAllServiceHealth(): ServiceHealth[] {
    return Array.from(this.serviceHealth.values());
  }

  /**
   * Check if feature is available based on degradation level
   */
  isFeatureAvailable(serviceName: string, featureName: string): boolean {
    const health = this.serviceHealth.get(serviceName);
    const config = this.degradationConfigs.get(serviceName);
    
    if (!health || !config) {
      return true; // Default to available if not configured
    }

    switch (health.degradationLevel) {
      case 'none':
        return true;
      
      case 'partial':
        // Only essential features are available
        return config.essentialFeatures.includes(featureName);
      
      case 'full':
        // No features are available
        return false;
      
      default:
        return true;
    }
  }

  /**
   * Get degraded feature list
   */
  getDegradedFeatures(serviceName: string): {
    available: string[];
    unavailable: string[];
    degradationLevel: string;
  } {
    const health = this.serviceHealth.get(serviceName);
    const config = this.degradationConfigs.get(serviceName);
    
    if (!health || !config) {
      return {
        available: [],
        unavailable: [],
        degradationLevel: 'none',
      };
    }

    const allFeatures = [...config.essentialFeatures, ...config.nonEssentialFeatures];
    
    switch (health.degradationLevel) {
      case 'none':
        return {
          available: allFeatures,
          unavailable: [],
          degradationLevel: health.degradationLevel,
        };
      
      case 'partial':
        return {
          available: config.essentialFeatures,
          unavailable: config.nonEssentialFeatures,
          degradationLevel: health.degradationLevel,
        };
      
      case 'full':
        return {
          available: [],
          unavailable: allFeatures,
          degradationLevel: health.degradationLevel,
        };
      
      default:
        return {
          available: allFeatures,
          unavailable: [],
          degradationLevel: 'none',
        };
    }
  }

  /**
   * Manually set service degradation level
   */
  setDegradationLevel(serviceName: string, level: 'none' | 'partial' | 'full'): boolean {
    const health = this.serviceHealth.get(serviceName);
    
    if (!health) {
      return false;
    }

    health.degradationLevel = level;
    health.lastCheck = new Date();
    
    this.logger.log(`Degradation level set to ${level} for service: ${serviceName}`);
    return true;
  }

  /**
   * Clear cached data for service
   */
  clearCache(serviceName: string, cacheKey?: string): number {
    let clearedCount = 0;
    
    if (cacheKey) {
      const fullKey = `${serviceName}:${cacheKey}`;
      if (this.fallbackCache.delete(fullKey)) {
        clearedCount = 1;
      }
    } else {
      // Clear all cache entries for the service
      for (const key of this.fallbackCache.keys()) {
        if (key.startsWith(`${serviceName}:`)) {
          this.fallbackCache.delete(key);
          clearedCount++;
        }
      }
    }
    
    this.logger.log(`Cleared ${clearedCount} cache entries for service: ${serviceName}`);
    return clearedCount;
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): {
    totalEntries: number;
    byService: Record<string, number>;
    oldestEntry?: Date;
    newestEntry?: Date;
  } {
    const entries = Array.from(this.fallbackCache.entries());
    const byService: Record<string, number> = {};
    let oldestEntry: Date | undefined;
    let newestEntry: Date | undefined;

    for (const [key, value] of entries) {
      const serviceName = key.split(':')[0];
      byService[serviceName] = (byService[serviceName] || 0) + 1;
      
      if (!oldestEntry || value.timestamp < oldestEntry) {
        oldestEntry = value.timestamp;
      }
      
      if (!newestEntry || value.timestamp > newestEntry) {
        newestEntry = value.timestamp;
      }
    }

    return {
      totalEntries: entries.length,
      byService,
      oldestEntry,
      newestEntry,
    };
  }

  private async handleDegradation<T>(
    serviceName: string,
    options: {
      cacheKey?: string;
      fallbackData?: T;
      essential?: boolean;
    },
    error: Error
  ): Promise<{
    data: T;
    degraded: boolean;
    degradationLevel: 'none' | 'partial' | 'full';
    source: 'primary' | 'cache' | 'fallback';
  }> {
    // Try cached data first
    if (options.cacheKey) {
      const cachedData = this.getCachedResult<T>(serviceName, options.cacheKey);
      if (cachedData) {
        this.logger.log(`Using cached data for ${serviceName}`);
        return {
          data: cachedData,
          degraded: true,
          degradationLevel: 'partial',
          source: 'cache',
        };
      }
    }

    // Try fallback data
    const fallbackData = options.fallbackData || this.getFallbackData<T>(serviceName);
    if (fallbackData) {
      this.logger.log(`Using fallback data for ${serviceName}`);
      return {
        data: fallbackData,
        degraded: true,
        degradationLevel: 'partial',
        source: 'fallback',
      };
    }

    // If essential service, throw error
    if (options.essential) {
      throw error;
    }

    // Return empty/null response for non-essential services
    this.logger.warn(`No fallback available for ${serviceName}, returning null`);
    return {
      data: null as T,
      degraded: true,
      degradationLevel: 'full',
      source: 'fallback',
    };
  }

  private async getFallbackResponse<T>(
    serviceName: string,
    options: { cacheKey?: string; fallbackData?: T }
  ): Promise<T> {
    // Try cached data first
    if (options.cacheKey) {
      const cachedData = this.getCachedResult<T>(serviceName, options.cacheKey);
      if (cachedData) {
        return cachedData;
      }
    }

    // Try fallback data
    const fallbackData = options.fallbackData || this.getFallbackData<T>(serviceName);
    if (fallbackData) {
      return fallbackData;
    }

    throw new Error(`No fallback available for service: ${serviceName}`);
  }

  private updateServiceHealth(serviceName: string, responseTime: number, hasError: boolean): void {
    const health = this.serviceHealth.get(serviceName);
    if (!health) return;

    health.lastCheck = new Date();
    health.responseTime = responseTime;
    
    // Update error rate (simple moving average)
    const errorWeight = hasError ? 1 : 0;
    health.errorRate = (health.errorRate * 0.9) + (errorWeight * 0.1);
    
    // Update health status
    health.isHealthy = health.errorRate < 0.1 && responseTime < 5000; // 10% error rate, 5s response time
    
    // Update degradation level based on health
    if (health.errorRate > 0.5 || responseTime > 10000) {
      health.degradationLevel = 'full';
    } else if (health.errorRate > 0.2 || responseTime > 5000) {
      health.degradationLevel = 'partial';
    } else {
      health.degradationLevel = 'none';
    }
  }

  private cacheResult<T>(serviceName: string, cacheKey: string, data: T): void {
    const config = this.degradationConfigs.get(serviceName);
    if (!config?.enableCaching) return;

    const fullKey = `${serviceName}:${cacheKey}`;
    this.fallbackCache.set(fullKey, {
      data,
      timestamp: new Date(),
      ttl: config.cacheTimeout,
    });
  }

  private getCachedResult<T>(serviceName: string, cacheKey: string): T | null {
    const fullKey = `${serviceName}:${cacheKey}`;
    const cached = this.fallbackCache.get(fullKey);
    
    if (!cached) return null;
    
    // Check if cache has expired
    const now = Date.now();
    if (now - cached.timestamp.getTime() > cached.ttl) {
      this.fallbackCache.delete(fullKey);
      return null;
    }
    
    return cached.data as T;
  }

  private getFallbackData<T>(serviceName: string): T | null {
    const config = this.degradationConfigs.get(serviceName);
    return config?.fallbackData || null;
  }
}
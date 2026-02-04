import { Injectable, Logger } from '@nestjs/common';

export interface CircuitBreakerConfig {
  failureThreshold: number;
  recoveryTimeout: number;
  monitoringPeriod: number;
  halfOpenMaxCalls: number;
}

export enum CircuitState {
  CLOSED = 'closed',
  OPEN = 'open',
  HALF_OPEN = 'half_open',
}

export interface CircuitBreakerStats {
  state: CircuitState;
  failureCount: number;
  successCount: number;
  lastFailureTime?: Date;
  lastSuccessTime?: Date;
  nextAttemptTime?: Date;
  totalCalls: number;
  failureRate: number;
}

@Injectable()
export class CircuitBreakerService {
  private readonly logger = new Logger(CircuitBreakerService.name);
  private readonly circuits = new Map<string, CircuitBreakerStats>();
  private readonly configs = new Map<string, CircuitBreakerConfig>();

  private readonly defaultConfig: CircuitBreakerConfig = {
    failureThreshold: 5,
    recoveryTimeout: 60000, // 1 minute
    monitoringPeriod: 300000, // 5 minutes
    halfOpenMaxCalls: 3,
  };

  /**
   * Register a circuit breaker for a service
   */
  registerCircuit(serviceName: string, config?: Partial<CircuitBreakerConfig>): void {
    const fullConfig = { ...this.defaultConfig, ...config };
    this.configs.set(serviceName, fullConfig);
    
    if (!this.circuits.has(serviceName)) {
      this.circuits.set(serviceName, {
        state: CircuitState.CLOSED,
        failureCount: 0,
        successCount: 0,
        totalCalls: 0,
        failureRate: 0,
      });
    }

    this.logger.log(`Circuit breaker registered for service: ${serviceName}`);
  }

  /**
   * Execute operation with circuit breaker protection
   */
  async executeWithCircuitBreaker<T>(
    serviceName: string,
    operation: () => Promise<T>,
    fallback?: () => Promise<T>
  ): Promise<T> {
    if (!this.circuits.has(serviceName)) {
      this.registerCircuit(serviceName);
    }

    const stats = this.circuits.get(serviceName)!;
    const config = this.configs.get(serviceName)!;

    // Check circuit state
    this.updateCircuitState(serviceName);

    if (stats.state === CircuitState.OPEN) {
      this.logger.warn(`Circuit breaker OPEN for ${serviceName}, using fallback`);
      
      if (fallback) {
        return await fallback();
      } else {
        throw new Error(`Service ${serviceName} is currently unavailable (circuit breaker open)`);
      }
    }

    if (stats.state === CircuitState.HALF_OPEN && stats.totalCalls >= config.halfOpenMaxCalls) {
      this.logger.warn(`Circuit breaker HALF_OPEN for ${serviceName}, max calls reached`);
      
      if (fallback) {
        return await fallback();
      } else {
        throw new Error(`Service ${serviceName} is currently limited (circuit breaker half-open)`);
      }
    }

    try {
      const result = await operation();
      this.recordSuccess(serviceName);
      return result;
    } catch (error) {
      this.recordFailure(serviceName);
      throw error;
    }
  }

  /**
   * Get circuit breaker statistics
   */
  getCircuitStats(serviceName: string): CircuitBreakerStats | null {
    return this.circuits.get(serviceName) || null;
  }

  /**
   * Get all circuit breaker statistics
   */
  getAllCircuitStats(): Record<string, CircuitBreakerStats> {
    const stats: Record<string, CircuitBreakerStats> = {};
    
    for (const [serviceName, circuitStats] of this.circuits.entries()) {
      stats[serviceName] = { ...circuitStats };
    }
    
    return stats;
  }

  /**
   * Reset circuit breaker for a service
   */
  resetCircuit(serviceName: string): boolean {
    const stats = this.circuits.get(serviceName);
    
    if (!stats) {
      return false;
    }

    stats.state = CircuitState.CLOSED;
    stats.failureCount = 0;
    stats.successCount = 0;
    stats.totalCalls = 0;
    stats.failureRate = 0;
    stats.lastFailureTime = undefined;
    stats.lastSuccessTime = undefined;
    stats.nextAttemptTime = undefined;

    this.logger.log(`Circuit breaker reset for service: ${serviceName}`);
    return true;
  }

  /**
   * Force circuit breaker to open state
   */
  openCircuit(serviceName: string): boolean {
    const stats = this.circuits.get(serviceName);
    
    if (!stats) {
      return false;
    }

    stats.state = CircuitState.OPEN;
    stats.lastFailureTime = new Date();
    
    const config = this.configs.get(serviceName)!;
    stats.nextAttemptTime = new Date(Date.now() + config.recoveryTimeout);

    this.logger.warn(`Circuit breaker manually opened for service: ${serviceName}`);
    return true;
  }

  /**
   * Force circuit breaker to closed state
   */
  closeCircuit(serviceName: string): boolean {
    const stats = this.circuits.get(serviceName);
    
    if (!stats) {
      return false;
    }

    stats.state = CircuitState.CLOSED;
    stats.nextAttemptTime = undefined;

    this.logger.log(`Circuit breaker manually closed for service: ${serviceName}`);
    return true;
  }

  private updateCircuitState(serviceName: string): void {
    const stats = this.circuits.get(serviceName)!;
    const config = this.configs.get(serviceName)!;
    const now = new Date();

    switch (stats.state) {
      case CircuitState.CLOSED:
        if (stats.failureCount >= config.failureThreshold) {
          stats.state = CircuitState.OPEN;
          stats.nextAttemptTime = new Date(now.getTime() + config.recoveryTimeout);
          this.logger.warn(`Circuit breaker opened for ${serviceName} (${stats.failureCount} failures)`);
        }
        break;

      case CircuitState.OPEN:
        if (stats.nextAttemptTime && now >= stats.nextAttemptTime) {
          stats.state = CircuitState.HALF_OPEN;
          stats.totalCalls = 0;
          this.logger.log(`Circuit breaker half-opened for ${serviceName}`);
        }
        break;

      case CircuitState.HALF_OPEN:
        // State transitions are handled in recordSuccess/recordFailure
        break;
    }

    // Clean up old statistics
    this.cleanupOldStats(serviceName, now);
  }

  private recordSuccess(serviceName: string): void {
    const stats = this.circuits.get(serviceName)!;
    
    stats.successCount++;
    stats.totalCalls++;
    stats.lastSuccessTime = new Date();
    
    this.updateFailureRate(serviceName);

    if (stats.state === CircuitState.HALF_OPEN) {
      const config = this.configs.get(serviceName)!;
      
      if (stats.totalCalls >= config.halfOpenMaxCalls) {
        stats.state = CircuitState.CLOSED;
        stats.failureCount = 0;
        this.logger.log(`Circuit breaker closed for ${serviceName} after successful recovery`);
      }
    }
  }

  private recordFailure(serviceName: string): void {
    const stats = this.circuits.get(serviceName)!;
    
    stats.failureCount++;
    stats.totalCalls++;
    stats.lastFailureTime = new Date();
    
    this.updateFailureRate(serviceName);

    if (stats.state === CircuitState.HALF_OPEN) {
      stats.state = CircuitState.OPEN;
      const config = this.configs.get(serviceName)!;
      stats.nextAttemptTime = new Date(Date.now() + config.recoveryTimeout);
      this.logger.warn(`Circuit breaker reopened for ${serviceName} after failure in half-open state`);
    }
  }

  private updateFailureRate(serviceName: string): void {
    const stats = this.circuits.get(serviceName)!;
    
    if (stats.totalCalls > 0) {
      stats.failureRate = (stats.failureCount / stats.totalCalls) * 100;
    }
  }

  private cleanupOldStats(serviceName: string, now: Date): void {
    const stats = this.circuits.get(serviceName)!;
    const config = this.configs.get(serviceName)!;
    
    // Reset counters if monitoring period has passed
    if (stats.lastFailureTime) {
      const timeSinceLastFailure = now.getTime() - stats.lastFailureTime.getTime();
      
      if (timeSinceLastFailure > config.monitoringPeriod) {
        stats.failureCount = 0;
        stats.successCount = 0;
        stats.totalCalls = 0;
        stats.failureRate = 0;
      }
    }
  }
}
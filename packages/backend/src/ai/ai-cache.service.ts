import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import { AIExplanationRequest, AIExplanationResponse } from './ai.service';

export interface CacheEntry {
  response: AIExplanationResponse;
  createdAt: Date;
  accessCount: number;
  lastAccessedAt: Date;
  ttl: number;
}

export interface CacheStats {
  totalEntries: number;
  hitRate: number;
  totalHits: number;
  totalMisses: number;
  totalSize: number;
  oldestEntry: Date | null;
  newestEntry: Date | null;
}

@Injectable()
export class AICacheService {
  private readonly logger = new Logger(AICacheService.name);
  private readonly cache = new Map<string, CacheEntry>();
  private readonly defaultTTL = 24 * 60 * 60 * 1000; // 24 hours
  private readonly maxCacheSize = 1000; // Maximum number of entries
  private readonly cleanupInterval = 60 * 60 * 1000; // 1 hour cleanup interval
  
  private stats = {
    hits: 0,
    misses: 0,
  };

  constructor(private readonly configService: ConfigService) {
    // Start periodic cleanup
    setInterval(() => {
      this.cleanup();
    }, this.cleanupInterval);

    this.logger.log('AI Cache Service initialized');
  }

  async get(request: AIExplanationRequest): Promise<AIExplanationResponse | null> {
    const key = this.generateCacheKey(request);
    const entry = this.cache.get(key);

    if (!entry) {
      this.stats.misses++;
      return null;
    }

    // Check if entry has expired
    if (this.isExpired(entry)) {
      this.cache.delete(key);
      this.stats.misses++;
      return null;
    }

    // Update access statistics
    entry.accessCount++;
    entry.lastAccessedAt = new Date();
    this.stats.hits++;

    this.logger.debug(`Cache hit for key: ${key.substring(0, 16)}...`);
    return entry.response;
  }

  async set(
    request: AIExplanationRequest,
    response: AIExplanationResponse,
    customTTL?: number
  ): Promise<void> {
    const key = this.generateCacheKey(request);
    const ttl = customTTL || this.defaultTTL;

    // Check cache size and evict if necessary
    if (this.cache.size >= this.maxCacheSize) {
      this.evictLeastRecentlyUsed();
    }

    const entry: CacheEntry = {
      response,
      createdAt: new Date(),
      accessCount: 0,
      lastAccessedAt: new Date(),
      ttl,
    };

    this.cache.set(key, entry);
    this.logger.debug(`Cached response for key: ${key.substring(0, 16)}...`);
  }

  async invalidate(request: AIExplanationRequest): Promise<boolean> {
    const key = this.generateCacheKey(request);
    const deleted = this.cache.delete(key);
    
    if (deleted) {
      this.logger.debug(`Invalidated cache for key: ${key.substring(0, 16)}...`);
    }
    
    return deleted;
  }

  async invalidateByPattern(pattern: string): Promise<number> {
    let deletedCount = 0;
    
    for (const [key, entry] of this.cache.entries()) {
      if (key.includes(pattern)) {
        this.cache.delete(key);
        deletedCount++;
      }
    }

    if (deletedCount > 0) {
      this.logger.debug(`Invalidated ${deletedCount} cache entries matching pattern: ${pattern}`);
    }

    return deletedCount;
  }

  async clear(): Promise<void> {
    const size = this.cache.size;
    this.cache.clear();
    this.stats.hits = 0;
    this.stats.misses = 0;
    
    this.logger.log(`Cleared cache (${size} entries)`);
  }

  getStats(): CacheStats {
    const entries = Array.from(this.cache.values());
    const totalRequests = this.stats.hits + this.stats.misses;
    
    return {
      totalEntries: this.cache.size,
      hitRate: totalRequests > 0 ? this.stats.hits / totalRequests : 0,
      totalHits: this.stats.hits,
      totalMisses: this.stats.misses,
      totalSize: this.estimateCacheSize(),
      oldestEntry: entries.length > 0 ? 
        new Date(Math.min(...entries.map(e => e.createdAt.getTime()))) : null,
      newestEntry: entries.length > 0 ? 
        new Date(Math.max(...entries.map(e => e.createdAt.getTime()))) : null,
    };
  }

  private generateCacheKey(request: AIExplanationRequest): string {
    // Create a deterministic hash of the request
    const keyData = {
      type: request.type,
      code: request.context.code,
      filePath: request.context.filePath,
      additionalContext: request.context.additionalContext,
      options: {
        includeCodeSuggestions: request.options?.includeCodeSuggestions,
        includeSecurityAnalysis: request.options?.includeSecurityAnalysis,
        includePerformanceAnalysis: request.options?.includePerformanceAnalysis,
        maxTokens: request.options?.maxTokens,
        temperature: request.options?.temperature,
        language: request.options?.language,
      },
    };

    const keyString = JSON.stringify(keyData, Object.keys(keyData).sort());
    return crypto.createHash('sha256').update(keyString).digest('hex');
  }

  private isExpired(entry: CacheEntry): boolean {
    const now = Date.now();
    const expirationTime = entry.createdAt.getTime() + entry.ttl;
    return now > expirationTime;
  }

  private evictLeastRecentlyUsed(): void {
    let lruKey: string | null = null;
    let lruTime = Date.now();

    for (const [key, entry] of this.cache.entries()) {
      if (entry.lastAccessedAt.getTime() < lruTime) {
        lruTime = entry.lastAccessedAt.getTime();
        lruKey = key;
      }
    }

    if (lruKey) {
      this.cache.delete(lruKey);
      this.logger.debug(`Evicted LRU entry: ${lruKey.substring(0, 16)}...`);
    }
  }

  private cleanup(): void {
    const beforeSize = this.cache.size;
    let expiredCount = 0;

    for (const [key, entry] of this.cache.entries()) {
      if (this.isExpired(entry)) {
        this.cache.delete(key);
        expiredCount++;
      }
    }

    if (expiredCount > 0) {
      this.logger.debug(`Cleanup removed ${expiredCount} expired entries (${beforeSize} -> ${this.cache.size})`);
    }
  }

  private estimateCacheSize(): number {
    // Rough estimation of memory usage in bytes
    let totalSize = 0;

    for (const [key, entry] of this.cache.entries()) {
      // Key size
      totalSize += key.length * 2; // UTF-16 characters

      // Entry size estimation
      totalSize += JSON.stringify(entry.response).length * 2;
      totalSize += 100; // Overhead for dates, numbers, etc.
    }

    return totalSize;
  }

  // Cache warming methods
  async warmCache(requests: AIExplanationRequest[]): Promise<void> {
    this.logger.log(`Warming cache with ${requests.length} requests`);
    
    // This would typically be called during application startup
    // with common or frequently requested analyses
    for (const request of requests) {
      const key = this.generateCacheKey(request);
      if (!this.cache.has(key)) {
        // In a real implementation, you might want to pre-generate responses
        // or load them from a persistent cache
        this.logger.debug(`Cache warming placeholder for: ${key.substring(0, 16)}...`);
      }
    }
  }

  // Cache invalidation strategies
  async invalidateByFileChange(filePath: string): Promise<number> {
    // Invalidate all cache entries related to a specific file
    return this.invalidateByPattern(filePath);
  }

  async invalidateByCodeChange(codeHash: string): Promise<number> {
    // Invalidate cache entries for specific code content
    return this.invalidateByPattern(codeHash);
  }

  // Export/Import for persistence
  exportCache(): any {
    const exportData = {
      entries: Array.from(this.cache.entries()).map(([key, entry]) => ({
        key,
        ...entry,
        createdAt: entry.createdAt.toISOString(),
        lastAccessedAt: entry.lastAccessedAt.toISOString(),
      })),
      stats: this.stats,
      exportedAt: new Date().toISOString(),
    };

    return exportData;
  }

  importCache(data: any): void {
    this.cache.clear();
    
    if (data.entries && Array.isArray(data.entries)) {
      for (const item of data.entries) {
        const entry: CacheEntry = {
          response: item.response,
          createdAt: new Date(item.createdAt),
          accessCount: item.accessCount || 0,
          lastAccessedAt: new Date(item.lastAccessedAt),
          ttl: item.ttl || this.defaultTTL,
        };

        // Only import non-expired entries
        if (!this.isExpired(entry)) {
          this.cache.set(item.key, entry);
        }
      }
    }

    if (data.stats) {
      this.stats = { ...this.stats, ...data.stats };
    }

    this.logger.log(`Imported ${this.cache.size} cache entries`);
  }
}
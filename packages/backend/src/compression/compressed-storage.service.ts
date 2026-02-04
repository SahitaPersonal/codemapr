import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, FindOptionsWhere, FindManyOptions } from 'typeorm';
import { DataCompressionService, CompressionOptions } from './data-compression.service';
import { CompressedDataEntity } from './entities/compressed-data.entity';

export interface StorageOptions {
  compression?: CompressionOptions;
  ttl?: number; // Time to live in seconds
  tags?: string[]; // Tags for categorization
  metadata?: Record<string, any>;
}

export interface StorageResult {
  id: string;
  originalSize: number;
  compressedSize: number;
  compressionRatio: number;
  algorithm: string;
  createdAt: Date;
}

export interface RetrievalResult<T = any> {
  id: string;
  data: T;
  metadata: Record<string, any>;
  originalSize: number;
  compressedSize: number;
  compressionRatio: number;
  algorithm: string;
  createdAt: Date;
  lastAccessedAt: Date;
}

export interface StorageStats {
  totalEntries: number;
  totalOriginalSize: number;
  totalCompressedSize: number;
  totalSpaceSaved: number;
  averageCompressionRatio: number;
  entriesByAlgorithm: Map<string, number>;
  oldestEntry: Date | null;
  newestEntry: Date | null;
}

@Injectable()
export class CompressedStorageService {
  private readonly logger = new Logger(CompressedStorageService.name);

  constructor(
    @InjectRepository(CompressedDataEntity)
    private readonly compressedDataRepository: Repository<CompressedDataEntity>,
    private readonly compressionService: DataCompressionService,
  ) {}

  async store<T = any>(
    key: string,
    data: T,
    options: StorageOptions = {}
  ): Promise<StorageResult> {
    this.logger.debug(`Storing data with key: ${key}`);

    try {
      // Compress the data
      const compressionResult = await this.compressionService.compressJSON(data, options.compression);

      // Calculate expiration date if TTL is provided
      let expiresAt: Date | null = null;
      if (options.ttl) {
        expiresAt = new Date(Date.now() + options.ttl * 1000);
      }

      // Create or update the entity
      let entity = await this.compressedDataRepository.findOne({ where: { key } });
      
      if (entity) {
        // Update existing entity
        entity.compressedData = compressionResult.compressed;
        entity.originalSize = compressionResult.originalSize;
        entity.compressedSize = compressionResult.compressedSize;
        entity.compressionRatio = compressionResult.compressionRatio;
        entity.algorithm = compressionResult.algorithm;
        entity.checksum = compressionResult.metadata.checksum;
        entity.metadata = options.metadata || {};
        entity.tags = options.tags || [];
        entity.expiresAt = expiresAt;
        entity.updatedAt = new Date();
      } else {
        // Create new entity
        entity = this.compressedDataRepository.create({
          key,
          compressedData: compressionResult.compressed,
          originalSize: compressionResult.originalSize,
          compressedSize: compressionResult.compressedSize,
          compressionRatio: compressionResult.compressionRatio,
          algorithm: compressionResult.algorithm,
          checksum: compressionResult.metadata.checksum,
          metadata: options.metadata || {},
          tags: options.tags || [],
          expiresAt,
        });
      }

      const saved = await this.compressedDataRepository.save(entity);

      this.logger.debug(
        `Stored data with key ${key}: ${compressionResult.originalSize} -> ${compressionResult.compressedSize} bytes ` +
        `(${compressionResult.compressionRatio.toFixed(2)}x compression)`
      );

      return {
        id: saved.id,
        originalSize: saved.originalSize,
        compressedSize: saved.compressedSize,
        compressionRatio: saved.compressionRatio,
        algorithm: saved.algorithm,
        createdAt: saved.createdAt,
      };

    } catch (error) {
      this.logger.error(`Failed to store data with key ${key}:`, error);
      throw new Error(`Storage failed: ${error.message}`);
    }
  }

  async retrieve<T = any>(key: string): Promise<RetrievalResult<T> | null> {
    this.logger.debug(`Retrieving data with key: ${key}`);

    try {
      const entity = await this.compressedDataRepository.findOne({ where: { key } });

      if (!entity) {
        this.logger.debug(`No data found for key: ${key}`);
        return null;
      }

      // Check if data has expired
      if (entity.expiresAt && entity.expiresAt < new Date()) {
        this.logger.debug(`Data with key ${key} has expired, removing`);
        await this.compressedDataRepository.remove(entity);
        return null;
      }

      // Decompress the data
      const decompressionResult = await this.compressionService.decompressJSON<T>(
        entity.compressedData,
        entity.algorithm,
        entity.checksum
      );

      if (!decompressionResult.isValid) {
        this.logger.warn(`Data integrity check failed for key: ${key}`);
      }

      // Update last accessed timestamp
      entity.lastAccessedAt = new Date();
      entity.accessCount = (entity.accessCount || 0) + 1;
      await this.compressedDataRepository.save(entity);

      this.logger.debug(`Retrieved data with key ${key} (${entity.originalSize} bytes)`);

      return {
        id: entity.id,
        data: decompressionResult.data,
        metadata: entity.metadata,
        originalSize: entity.originalSize,
        compressedSize: entity.compressedSize,
        compressionRatio: entity.compressionRatio,
        algorithm: entity.algorithm,
        createdAt: entity.createdAt,
        lastAccessedAt: entity.lastAccessedAt,
      };

    } catch (error) {
      this.logger.error(`Failed to retrieve data with key ${key}:`, error);
      throw new Error(`Retrieval failed: ${error.message}`);
    }
  }

  async exists(key: string): Promise<boolean> {
    const count = await this.compressedDataRepository.count({ where: { key } });
    return count > 0;
  }

  async delete(key: string): Promise<boolean> {
    this.logger.debug(`Deleting data with key: ${key}`);

    try {
      const result = await this.compressedDataRepository.delete({ key });
      const deleted = result.affected > 0;

      if (deleted) {
        this.logger.debug(`Deleted data with key: ${key}`);
      } else {
        this.logger.debug(`No data found to delete for key: ${key}`);
      }

      return deleted;

    } catch (error) {
      this.logger.error(`Failed to delete data with key ${key}:`, error);
      throw new Error(`Deletion failed: ${error.message}`);
    }
  }

  async findByTags(tags: string[], limit: number = 100): Promise<RetrievalResult[]> {
    this.logger.debug(`Finding data by tags: ${tags.join(', ')}`);

    try {
      // For SQLite, we need to use a different approach since it doesn't support array operators
      const entities = await this.compressedDataRepository
        .createQueryBuilder('data')
        .where(
          tags.map((_, index) => `data.tags LIKE :tag${index}`).join(' OR '),
          tags.reduce((params, tag, index) => {
            params[`tag${index}`] = `%${tag}%`;
            return params;
          }, {} as any)
        )
        .orderBy('data.createdAt', 'DESC')
        .limit(limit)
        .getMany();

      const results: RetrievalResult[] = [];

      for (const entity of entities) {
        // Check expiration
        if (entity.expiresAt && entity.expiresAt < new Date()) {
          await this.compressedDataRepository.remove(entity);
          continue;
        }

        try {
          const decompressionResult = await this.compressionService.decompressJSON(
            entity.compressedData,
            entity.algorithm,
            entity.checksum
          );

          results.push({
            id: entity.id,
            data: decompressionResult.data,
            metadata: entity.metadata,
            originalSize: entity.originalSize,
            compressedSize: entity.compressedSize,
            compressionRatio: entity.compressionRatio,
            algorithm: entity.algorithm,
            createdAt: entity.createdAt,
            lastAccessedAt: entity.lastAccessedAt,
          });

        } catch (error) {
          this.logger.warn(`Failed to decompress data for entity ${entity.id}:`, error);
        }
      }

      this.logger.debug(`Found ${results.length} entries for tags: ${tags.join(', ')}`);
      return results;

    } catch (error) {
      this.logger.error(`Failed to find data by tags:`, error);
      throw new Error(`Tag search failed: ${error.message}`);
    }
  }

  async cleanup(options: {
    removeExpired?: boolean;
    removeOlderThan?: Date;
    removeUnaccessed?: boolean;
    dryRun?: boolean;
  } = {}): Promise<{
    removedCount: number;
    spaceSaved: number;
    errors: string[];
  }> {
    this.logger.log('Starting storage cleanup...');

    const errors: string[] = [];
    let removedCount = 0;
    let spaceSaved = 0;

    try {
      const queryBuilder = this.compressedDataRepository.createQueryBuilder('data');

      // Build cleanup conditions
      const conditions: string[] = [];
      const parameters: any = {};

      if (options.removeExpired) {
        conditions.push('data.expiresAt < :now');
        parameters.now = new Date();
      }

      if (options.removeOlderThan) {
        conditions.push('data.createdAt < :olderThan');
        parameters.olderThan = options.removeOlderThan;
      }

      if (options.removeUnaccessed) {
        conditions.push('data.lastAccessedAt IS NULL OR data.accessCount = 0');
      }

      if (conditions.length === 0) {
        this.logger.warn('No cleanup conditions specified');
        return { removedCount: 0, spaceSaved: 0, errors: [] };
      }

      // Find entities to remove
      const entitiesToRemove = await queryBuilder
        .where(conditions.join(' OR '), parameters)
        .getMany();

      this.logger.log(`Found ${entitiesToRemove.length} entities to remove`);

      if (options.dryRun) {
        // Calculate what would be removed
        for (const entity of entitiesToRemove) {
          spaceSaved += entity.compressedSize;
        }
        removedCount = entitiesToRemove.length;
      } else {
        // Actually remove entities
        for (const entity of entitiesToRemove) {
          try {
            await this.compressedDataRepository.remove(entity);
            removedCount++;
            spaceSaved += entity.compressedSize;
          } catch (error) {
            errors.push(`Failed to remove entity ${entity.id}: ${error.message}`);
          }
        }
      }

      this.logger.log(
        `Cleanup completed: ${removedCount} entities removed, ${spaceSaved} bytes freed` +
        (options.dryRun ? ' (dry run)' : '')
      );

      return { removedCount, spaceSaved, errors };

    } catch (error) {
      this.logger.error('Cleanup failed:', error);
      throw new Error(`Cleanup failed: ${error.message}`);
    }
  }

  async getStorageStats(): Promise<StorageStats> {
    this.logger.debug('Calculating storage statistics...');

    try {
      const entities = await this.compressedDataRepository.find({
        select: ['originalSize', 'compressedSize', 'algorithm', 'createdAt'],
      });

      const stats: StorageStats = {
        totalEntries: entities.length,
        totalOriginalSize: 0,
        totalCompressedSize: 0,
        totalSpaceSaved: 0,
        averageCompressionRatio: 0,
        entriesByAlgorithm: new Map(),
        oldestEntry: null,
        newestEntry: null,
      };

      if (entities.length === 0) {
        return stats;
      }

      let oldestDate = entities[0].createdAt;
      let newestDate = entities[0].createdAt;

      for (const entity of entities) {
        stats.totalOriginalSize += entity.originalSize;
        stats.totalCompressedSize += entity.compressedSize;

        // Track algorithm usage
        const count = stats.entriesByAlgorithm.get(entity.algorithm) || 0;
        stats.entriesByAlgorithm.set(entity.algorithm, count + 1);

        // Track date range
        if (entity.createdAt < oldestDate) {
          oldestDate = entity.createdAt;
        }
        if (entity.createdAt > newestDate) {
          newestDate = entity.createdAt;
        }
      }

      stats.totalSpaceSaved = stats.totalOriginalSize - stats.totalCompressedSize;
      stats.averageCompressionRatio = stats.totalOriginalSize / stats.totalCompressedSize;
      stats.oldestEntry = oldestDate;
      stats.newestEntry = newestDate;

      this.logger.debug(
        `Storage stats: ${stats.totalEntries} entries, ` +
        `${stats.totalSpaceSaved} bytes saved (${stats.averageCompressionRatio.toFixed(2)}x compression)`
      );

      return stats;

    } catch (error) {
      this.logger.error('Failed to calculate storage statistics:', error);
      throw new Error(`Statistics calculation failed: ${error.message}`);
    }
  }

  async optimizeStorage(): Promise<{
    recompressedCount: number;
    spaceSaved: number;
    errors: string[];
  }> {
    this.logger.log('Starting storage optimization...');

    const errors: string[] = [];
    let recompressedCount = 0;
    let spaceSaved = 0;

    try {
      // Find entities that could benefit from better compression
      const entities = await this.compressedDataRepository
        .createQueryBuilder('data')
        .where('data.compressionRatio < :threshold', { threshold: 2.0 })
        .andWhere('data.originalSize > :minSize', { minSize: 10240 }) // 10KB minimum
        .orderBy('data.originalSize', 'DESC')
        .limit(100) // Process in batches
        .getMany();

      this.logger.log(`Found ${entities.length} entities for optimization`);

      for (const entity of entities) {
        try {
          // Decompress current data
          const currentData = await this.compressionService.decompressJSON(
            entity.compressedData,
            entity.algorithm,
            entity.checksum
          );

          // Find optimal compression algorithm
          const optimal = await this.compressionService.getOptimalAlgorithm(
            currentData.data,
            'ratio'
          );

          // Recompress with optimal algorithm
          const newCompression = await this.compressionService.compressJSON(
            currentData.data,
            { algorithm: optimal.algorithm, level: 9 }
          );

          // Check if optimization is worthwhile
          const improvement = entity.compressedSize - newCompression.compressedSize;
          if (improvement > entity.compressedSize * 0.1) { // At least 10% improvement
            entity.compressedData = newCompression.compressed;
            entity.compressedSize = newCompression.compressedSize;
            entity.compressionRatio = newCompression.compressionRatio;
            entity.algorithm = newCompression.algorithm;
            entity.checksum = newCompression.metadata.checksum;
            entity.updatedAt = new Date();

            await this.compressedDataRepository.save(entity);

            recompressedCount++;
            spaceSaved += improvement;

            this.logger.debug(
              `Optimized entity ${entity.id}: ${improvement} bytes saved ` +
              `(${entity.algorithm} -> ${optimal.algorithm})`
            );
          }

        } catch (error) {
          errors.push(`Failed to optimize entity ${entity.id}: ${error.message}`);
        }
      }

      this.logger.log(
        `Storage optimization completed: ${recompressedCount} entities recompressed, ` +
        `${spaceSaved} bytes saved`
      );

      return { recompressedCount, spaceSaved, errors };

    } catch (error) {
      this.logger.error('Storage optimization failed:', error);
      throw new Error(`Optimization failed: ${error.message}`);
    }
  }
}
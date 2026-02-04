import { Controller, Get, Post, Delete, Body, Param, Query, Logger, HttpException, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiQuery, ApiBody } from '@nestjs/swagger';
import { IsString, IsOptional, IsObject, IsArray, IsNumber, IsEnum, IsBoolean } from 'class-validator';
import { DataCompressionService, CompressionOptions } from './data-compression.service';
import { CompressedStorageService, StorageOptions } from './compressed-storage.service';

export class CompressDataDto {
  @IsObject()
  data: any;

  @IsOptional()
  @IsEnum(['gzip', 'deflate', 'brotli'])
  algorithm?: 'gzip' | 'deflate' | 'brotli';

  @IsOptional()
  @IsNumber()
  level?: number;

  @IsOptional()
  @IsNumber()
  threshold?: number;
}

export class StoreDataDto {
  @IsString()
  key: string;

  @IsObject()
  data: any;

  @IsOptional()
  @IsObject()
  compression?: CompressionOptions;

  @IsOptional()
  @IsNumber()
  ttl?: number;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}

export class BenchmarkDto {
  @IsObject()
  data: any;

  @IsOptional()
  @IsArray()
  @IsEnum(['gzip', 'deflate', 'brotli'], { each: true })
  algorithms?: ('gzip' | 'deflate' | 'brotli')[];
}

export class OptimalAlgorithmDto {
  @IsObject()
  data: any;

  @IsOptional()
  @IsEnum(['ratio', 'speed', 'balanced'])
  priority?: 'ratio' | 'speed' | 'balanced';
}

export class CleanupDto {
  @IsOptional()
  @IsBoolean()
  removeExpired?: boolean;

  @IsOptional()
  @IsString()
  removeOlderThan?: string; // ISO date string

  @IsOptional()
  @IsBoolean()
  removeUnaccessed?: boolean;

  @IsOptional()
  @IsBoolean()
  dryRun?: boolean;
}

@ApiTags('Data Compression')
@Controller('api/compression')
export class CompressionController {
  private readonly logger = new Logger(CompressionController.name);

  constructor(
    private readonly compressionService: DataCompressionService,
    private readonly storageService: CompressedStorageService,
  ) {}

  @Post('compress')
  @ApiOperation({ 
    summary: 'Compress data',
    description: 'Compresses data using the specified algorithm and returns compression statistics.'
  })
  @ApiBody({ 
    type: CompressDataDto,
    description: 'Data to compress with compression options'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Data compressed successfully',
    schema: {
      type: 'object',
      properties: {
        compressed: { type: 'string', description: 'Base64 encoded compressed data' },
        originalSize: { type: 'number' },
        compressedSize: { type: 'number' },
        compressionRatio: { type: 'number' },
        algorithm: { type: 'string' },
        metadata: { type: 'object' }
      }
    }
  })
  async compressData(@Body() compressDto: CompressDataDto) {
    this.logger.log('Compress data requested');

    try {
      const options: CompressionOptions = {
        algorithm: compressDto.algorithm || 'gzip',
        level: compressDto.level,
        threshold: compressDto.threshold,
      };

      const result = await this.compressionService.compressData(compressDto.data, options);

      return {
        compressed: result.compressed.toString('base64'),
        originalSize: result.originalSize,
        compressedSize: result.compressedSize,
        compressionRatio: result.compressionRatio,
        algorithm: result.algorithm,
        metadata: result.metadata,
      };

    } catch (error) {
      this.logger.error('Data compression failed:', error);
      throw new HttpException(
        `Compression failed: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Post('benchmark')
  @ApiOperation({ 
    summary: 'Benchmark compression algorithms',
    description: 'Tests multiple compression algorithms on the provided data and returns performance metrics.'
  })
  @ApiBody({ 
    type: BenchmarkDto,
    description: 'Data to benchmark with optional algorithm list'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Benchmark completed successfully',
    schema: {
      type: 'object',
      additionalProperties: {
        type: 'object',
        properties: {
          compressionRatio: { type: 'number' },
          compressionTime: { type: 'number' },
          decompressionTime: { type: 'number' },
          compressedSize: { type: 'number' },
          originalSize: { type: 'number' }
        }
      }
    }
  })
  async benchmarkAlgorithms(@Body() benchmarkDto: BenchmarkDto) {
    this.logger.log('Compression benchmark requested');

    try {
      const results = await this.compressionService.benchmarkAlgorithms(
        benchmarkDto.data,
        benchmarkDto.algorithms
      );

      const response: any = {};
      for (const [algorithm, benchmark] of results) {
        response[algorithm] = {
          compressionRatio: benchmark.result.compressionRatio,
          compressionTime: benchmark.compressionTime,
          decompressionTime: benchmark.decompressionTime,
          compressedSize: benchmark.result.compressedSize,
          originalSize: benchmark.result.originalSize,
        };
      }

      return response;

    } catch (error) {
      this.logger.error('Compression benchmark failed:', error);
      throw new HttpException(
        `Benchmark failed: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Post('optimal')
  @ApiOperation({ 
    summary: 'Find optimal compression algorithm',
    description: 'Analyzes data and recommends the best compression algorithm based on the specified priority.'
  })
  @ApiBody({ 
    type: OptimalAlgorithmDto,
    description: 'Data to analyze with optimization priority'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Optimal algorithm determined successfully',
    schema: {
      type: 'object',
      properties: {
        algorithm: { type: 'string' },
        score: { type: 'number' },
        recommendation: { type: 'string' }
      }
    }
  })
  async getOptimalAlgorithm(@Body() optimalDto: OptimalAlgorithmDto) {
    this.logger.log('Optimal algorithm analysis requested');

    try {
      const result = await this.compressionService.getOptimalAlgorithm(
        optimalDto.data,
        optimalDto.priority || 'balanced'
      );

      return {
        algorithm: result.algorithm,
        score: result.score,
        recommendation: `Use ${result.algorithm} for ${optimalDto.priority || 'balanced'} optimization`,
      };

    } catch (error) {
      this.logger.error('Optimal algorithm analysis failed:', error);
      throw new HttpException(
        `Analysis failed: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Get('stats')
  @ApiOperation({ 
    summary: 'Get compression statistics',
    description: 'Retrieves compression service statistics including algorithm usage and performance metrics.'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Compression statistics retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        totalOperations: { type: 'number' },
        totalOriginalSize: { type: 'number' },
        totalCompressedSize: { type: 'number' },
        averageCompressionRatio: { type: 'number' },
        algorithmStats: { type: 'object' }
      }
    }
  })
  async getCompressionStats() {
    this.logger.log('Compression statistics requested');

    try {
      const stats = this.compressionService.getCompressionStats();
      
      // Convert Map to object for JSON serialization
      const algorithmStats: any = {};
      for (const [algorithm, stat] of stats.algorithmStats) {
        algorithmStats[algorithm] = stat;
      }

      return {
        ...stats,
        algorithmStats,
      };

    } catch (error) {
      this.logger.error('Failed to get compression statistics:', error);
      throw new HttpException(
        `Statistics retrieval failed: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Post('store')
  @ApiOperation({ 
    summary: 'Store compressed data',
    description: 'Stores data in compressed format with optional metadata and expiration.'
  })
  @ApiBody({ 
    type: StoreDataDto,
    description: 'Data to store with storage options'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Data stored successfully',
    schema: {
      type: 'object',
      properties: {
        id: { type: 'string' },
        originalSize: { type: 'number' },
        compressedSize: { type: 'number' },
        compressionRatio: { type: 'number' },
        algorithm: { type: 'string' },
        createdAt: { type: 'string' }
      }
    }
  })
  async storeData(@Body() storeDto: StoreDataDto) {
    this.logger.log(`Store data requested for key: ${storeDto.key}`);

    try {
      const options: StorageOptions = {
        compression: storeDto.compression,
        ttl: storeDto.ttl,
        tags: storeDto.tags,
        metadata: storeDto.metadata,
      };

      const result = await this.storageService.store(storeDto.key, storeDto.data, options);
      return result;

    } catch (error) {
      this.logger.error(`Data storage failed for key ${storeDto.key}:`, error);
      throw new HttpException(
        `Storage failed: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Get('retrieve/:key')
  @ApiOperation({ 
    summary: 'Retrieve compressed data',
    description: 'Retrieves and decompresses data by key.'
  })
  @ApiParam({ 
    name: 'key', 
    description: 'Storage key to retrieve data for',
    type: 'string'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Data retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        id: { type: 'string' },
        data: { type: 'object' },
        metadata: { type: 'object' },
        originalSize: { type: 'number' },
        compressedSize: { type: 'number' },
        compressionRatio: { type: 'number' },
        algorithm: { type: 'string' },
        createdAt: { type: 'string' },
        lastAccessedAt: { type: 'string' }
      }
    }
  })
  @ApiResponse({ 
    status: 404, 
    description: 'Data not found or expired' 
  })
  async retrieveData(@Param('key') key: string) {
    this.logger.log(`Retrieve data requested for key: ${key}`);

    try {
      const result = await this.storageService.retrieve(key);
      
      if (!result) {
        throw new HttpException('Data not found or expired', HttpStatus.NOT_FOUND);
      }

      return result;

    } catch (error) {
      this.logger.error(`Data retrieval failed for key ${key}:`, error);
      
      if (error instanceof HttpException) {
        throw error;
      }
      
      throw new HttpException(
        `Retrieval failed: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Delete('delete/:key')
  @ApiOperation({ 
    summary: 'Delete compressed data',
    description: 'Deletes stored compressed data by key.'
  })
  @ApiParam({ 
    name: 'key', 
    description: 'Storage key to delete data for',
    type: 'string'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Data deleted successfully',
    schema: {
      type: 'object',
      properties: {
        deleted: { type: 'boolean' },
        key: { type: 'string' }
      }
    }
  })
  async deleteData(@Param('key') key: string) {
    this.logger.log(`Delete data requested for key: ${key}`);

    try {
      const deleted = await this.storageService.delete(key);
      return { deleted, key };

    } catch (error) {
      this.logger.error(`Data deletion failed for key ${key}:`, error);
      throw new HttpException(
        `Deletion failed: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Get('search')
  @ApiOperation({ 
    summary: 'Search data by tags',
    description: 'Searches for stored data using tags.'
  })
  @ApiQuery({ 
    name: 'tags', 
    description: 'Comma-separated list of tags to search for',
    type: 'string'
  })
  @ApiQuery({ 
    name: 'limit', 
    description: 'Maximum number of results to return',
    type: 'number',
    required: false
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Search completed successfully',
    schema: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          data: { type: 'object' },
          metadata: { type: 'object' },
          originalSize: { type: 'number' },
          compressedSize: { type: 'number' },
          compressionRatio: { type: 'number' },
          algorithm: { type: 'string' },
          createdAt: { type: 'string' },
          lastAccessedAt: { type: 'string' }
        }
      }
    }
  })
  async searchByTags(
    @Query('tags') tagsParam: string,
    @Query('limit') limit?: number
  ) {
    this.logger.log(`Search by tags requested: ${tagsParam}`);

    try {
      if (!tagsParam) {
        throw new HttpException('Tags parameter is required', HttpStatus.BAD_REQUEST);
      }

      const tags = tagsParam.split(',').map(tag => tag.trim());
      const results = await this.storageService.findByTags(tags, limit);

      this.logger.log(`Found ${results.length} results for tags: ${tags.join(', ')}`);
      return results;

    } catch (error) {
      this.logger.error('Tag search failed:', error);
      
      if (error instanceof HttpException) {
        throw error;
      }
      
      throw new HttpException(
        `Search failed: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Post('cleanup')
  @ApiOperation({ 
    summary: 'Cleanup stored data',
    description: 'Removes expired, old, or unused data from storage.'
  })
  @ApiBody({ 
    type: CleanupDto,
    description: 'Cleanup options'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Cleanup completed successfully',
    schema: {
      type: 'object',
      properties: {
        removedCount: { type: 'number' },
        spaceSaved: { type: 'number' },
        errors: { type: 'array', items: { type: 'string' } }
      }
    }
  })
  async cleanupStorage(@Body() cleanupDto: CleanupDto) {
    this.logger.log('Storage cleanup requested');

    try {
      const options = {
        removeExpired: cleanupDto.removeExpired,
        removeOlderThan: cleanupDto.removeOlderThan ? new Date(cleanupDto.removeOlderThan) : undefined,
        removeUnaccessed: cleanupDto.removeUnaccessed,
        dryRun: cleanupDto.dryRun,
      };

      const result = await this.storageService.cleanup(options);
      
      this.logger.log(
        `Cleanup completed: ${result.removedCount} items removed, ${result.spaceSaved} bytes saved` +
        (cleanupDto.dryRun ? ' (dry run)' : '')
      );

      return result;

    } catch (error) {
      this.logger.error('Storage cleanup failed:', error);
      throw new HttpException(
        `Cleanup failed: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Get('storage/stats')
  @ApiOperation({ 
    summary: 'Get storage statistics',
    description: 'Retrieves comprehensive storage statistics including space usage and compression ratios.'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Storage statistics retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        totalEntries: { type: 'number' },
        totalOriginalSize: { type: 'number' },
        totalCompressedSize: { type: 'number' },
        totalSpaceSaved: { type: 'number' },
        averageCompressionRatio: { type: 'number' },
        entriesByAlgorithm: { type: 'object' },
        oldestEntry: { type: 'string' },
        newestEntry: { type: 'string' }
      }
    }
  })
  async getStorageStats() {
    this.logger.log('Storage statistics requested');

    try {
      const stats = await this.storageService.getStorageStats();
      
      // Convert Map to object for JSON serialization
      const entriesByAlgorithm: any = {};
      for (const [algorithm, count] of stats.entriesByAlgorithm) {
        entriesByAlgorithm[algorithm] = count;
      }

      return {
        ...stats,
        entriesByAlgorithm,
      };

    } catch (error) {
      this.logger.error('Failed to get storage statistics:', error);
      throw new HttpException(
        `Statistics retrieval failed: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Post('optimize')
  @ApiOperation({ 
    summary: 'Optimize storage',
    description: 'Recompresses stored data with better algorithms to save space.'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Storage optimization completed successfully',
    schema: {
      type: 'object',
      properties: {
        recompressedCount: { type: 'number' },
        spaceSaved: { type: 'number' },
        errors: { type: 'array', items: { type: 'string' } }
      }
    }
  })
  async optimizeStorage() {
    this.logger.log('Storage optimization requested');

    try {
      const result = await this.storageService.optimizeStorage();
      
      this.logger.log(
        `Storage optimization completed: ${result.recompressedCount} items recompressed, ` +
        `${result.spaceSaved} bytes saved`
      );

      return result;

    } catch (error) {
      this.logger.error('Storage optimization failed:', error);
      throw new HttpException(
        `Optimization failed: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Get('health')
  @ApiOperation({ 
    summary: 'Compression service health check',
    description: 'Checks if the compression service is operational.'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Compression service is healthy',
    schema: {
      type: 'object',
      properties: {
        status: { type: 'string' },
        timestamp: { type: 'string' },
        service: { type: 'string' }
      }
    }
  })
  async healthCheck() {
    return {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      service: 'CompressionService',
    };
  }
}
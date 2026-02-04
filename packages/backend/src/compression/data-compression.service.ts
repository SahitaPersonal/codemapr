import { Injectable, Logger } from '@nestjs/common';
import * as zlib from 'zlib';
import { promisify } from 'util';

export interface CompressionOptions {
  algorithm: 'gzip' | 'deflate' | 'brotli';
  level?: number; // 1-9 for gzip/deflate, 1-11 for brotli
  threshold?: number; // Minimum size in bytes to compress
}

export interface CompressionResult {
  compressed: Buffer;
  originalSize: number;
  compressedSize: number;
  compressionRatio: number;
  algorithm: string;
  metadata: {
    timestamp: Date;
    checksum: string;
  };
}

export interface DecompressionResult {
  decompressed: Buffer;
  originalSize: number;
  algorithm: string;
  isValid: boolean;
}

export interface CompressionStats {
  totalOperations: number;
  totalOriginalSize: number;
  totalCompressedSize: number;
  averageCompressionRatio: number;
  algorithmStats: Map<string, {
    operations: number;
    totalSaved: number;
    averageRatio: number;
  }>;
}

@Injectable()
export class DataCompressionService {
  private readonly logger = new Logger(DataCompressionService.name);
  private readonly stats: CompressionStats = {
    totalOperations: 0,
    totalOriginalSize: 0,
    totalCompressedSize: 0,
    averageCompressionRatio: 0,
    algorithmStats: new Map(),
  };

  // Promisified compression functions
  private readonly gzipAsync = promisify(zlib.gzip);
  private readonly gunzipAsync = promisify(zlib.gunzip);
  private readonly deflateAsync = promisify(zlib.deflate);
  private readonly inflateAsync = promisify(zlib.inflate);
  private readonly brotliCompressAsync = promisify(zlib.brotliCompress);
  private readonly brotliDecompressAsync = promisify(zlib.brotliDecompress);

  async compressData(
    data: string | Buffer | object,
    options: CompressionOptions = { algorithm: 'gzip', level: 6, threshold: 1024 }
  ): Promise<CompressionResult> {
    const startTime = Date.now();
    
    // Convert input to buffer
    let inputBuffer: Buffer;
    if (typeof data === 'string') {
      inputBuffer = Buffer.from(data, 'utf8');
    } else if (Buffer.isBuffer(data)) {
      inputBuffer = data;
    } else {
      inputBuffer = Buffer.from(JSON.stringify(data), 'utf8');
    }

    const originalSize = inputBuffer.length;

    // Check if data meets compression threshold
    if (originalSize < (options.threshold || 1024)) {
      this.logger.debug(`Data size ${originalSize} bytes below threshold, skipping compression`);
      return {
        compressed: inputBuffer,
        originalSize,
        compressedSize: originalSize,
        compressionRatio: 1.0,
        algorithm: 'none',
        metadata: {
          timestamp: new Date(),
          checksum: this.calculateChecksum(inputBuffer),
        },
      };
    }

    let compressed: Buffer;
    
    try {
      switch (options.algorithm) {
        case 'gzip':
          compressed = await this.gzipAsync(inputBuffer, { level: options.level || 6 });
          break;
        case 'deflate':
          compressed = await this.deflateAsync(inputBuffer, { level: options.level || 6 });
          break;
        case 'brotli':
          compressed = await this.brotliCompressAsync(inputBuffer, {
            params: {
              [zlib.constants.BROTLI_PARAM_QUALITY]: options.level || 6,
            },
          });
          break;
        default:
          throw new Error(`Unsupported compression algorithm: ${options.algorithm}`);
      }

      const compressedSize = compressed.length;
      const compressionRatio = originalSize / compressedSize;
      const compressionTime = Date.now() - startTime;

      // Update statistics
      this.updateStats(options.algorithm, originalSize, compressedSize, compressionRatio);

      this.logger.debug(
        `Compressed ${originalSize} bytes to ${compressedSize} bytes using ${options.algorithm} ` +
        `(ratio: ${compressionRatio.toFixed(2)}x, time: ${compressionTime}ms)`
      );

      return {
        compressed,
        originalSize,
        compressedSize,
        compressionRatio,
        algorithm: options.algorithm,
        metadata: {
          timestamp: new Date(),
          checksum: this.calculateChecksum(inputBuffer),
        },
      };

    } catch (error) {
      this.logger.error(`Compression failed with ${options.algorithm}:`, error);
      throw new Error(`Compression failed: ${error.message}`);
    }
  }

  async decompressData(
    compressedData: Buffer,
    algorithm: string,
    expectedChecksum?: string
  ): Promise<DecompressionResult> {
    const startTime = Date.now();

    if (algorithm === 'none') {
      return {
        decompressed: compressedData,
        originalSize: compressedData.length,
        algorithm: 'none',
        isValid: true,
      };
    }

    let decompressed: Buffer;

    try {
      switch (algorithm) {
        case 'gzip':
          decompressed = await this.gunzipAsync(compressedData);
          break;
        case 'deflate':
          decompressed = await this.inflateAsync(compressedData);
          break;
        case 'brotli':
          decompressed = await this.brotliDecompressAsync(compressedData);
          break;
        default:
          throw new Error(`Unsupported decompression algorithm: ${algorithm}`);
      }

      const decompressionTime = Date.now() - startTime;
      
      // Verify checksum if provided
      let isValid = true;
      if (expectedChecksum) {
        const actualChecksum = this.calculateChecksum(decompressed);
        isValid = actualChecksum === expectedChecksum;
        
        if (!isValid) {
          this.logger.warn(`Checksum mismatch: expected ${expectedChecksum}, got ${actualChecksum}`);
        }
      }

      this.logger.debug(
        `Decompressed ${compressedData.length} bytes to ${decompressed.length} bytes using ${algorithm} ` +
        `(time: ${decompressionTime}ms, valid: ${isValid})`
      );

      return {
        decompressed,
        originalSize: decompressed.length,
        algorithm,
        isValid,
      };

    } catch (error) {
      this.logger.error(`Decompression failed with ${algorithm}:`, error);
      throw new Error(`Decompression failed: ${error.message}`);
    }
  }

  async compressJSON(obj: any, options?: CompressionOptions): Promise<CompressionResult> {
    const jsonString = JSON.stringify(obj);
    return this.compressData(jsonString, options);
  }

  async decompressJSON<T = any>(
    compressedData: Buffer,
    algorithm: string,
    expectedChecksum?: string
  ): Promise<{ data: T; isValid: boolean }> {
    const result = await this.decompressData(compressedData, algorithm, expectedChecksum);
    
    try {
      const data = JSON.parse(result.decompressed.toString('utf8'));
      return { data, isValid: result.isValid };
    } catch (error) {
      this.logger.error('Failed to parse decompressed JSON:', error);
      throw new Error(`JSON parsing failed: ${error.message}`);
    }
  }

  async benchmarkAlgorithms(
    data: string | Buffer | object,
    algorithms: CompressionOptions['algorithm'][] = ['gzip', 'deflate', 'brotli']
  ): Promise<Map<string, { result: CompressionResult; compressionTime: number; decompressionTime: number }>> {
    const results = new Map();

    for (const algorithm of algorithms) {
      try {
        // Compression benchmark
        const compressStart = Date.now();
        const compressionResult = await this.compressData(data, { algorithm, level: 6 });
        const compressionTime = Date.now() - compressStart;

        // Decompression benchmark
        const decompressStart = Date.now();
        await this.decompressData(
          compressionResult.compressed,
          compressionResult.algorithm,
          compressionResult.metadata.checksum
        );
        const decompressionTime = Date.now() - decompressStart;

        results.set(algorithm, {
          result: compressionResult,
          compressionTime,
          decompressionTime,
        });

        this.logger.debug(
          `${algorithm}: ${compressionResult.compressionRatio.toFixed(2)}x ratio, ` +
          `${compressionTime}ms compress, ${decompressionTime}ms decompress`
        );

      } catch (error) {
        this.logger.warn(`Benchmark failed for ${algorithm}:`, error.message);
      }
    }

    return results;
  }

  async getOptimalAlgorithm(
    data: string | Buffer | object,
    priority: 'ratio' | 'speed' | 'balanced' = 'balanced'
  ): Promise<{ algorithm: CompressionOptions['algorithm']; score: number }> {
    const benchmarks = await this.benchmarkAlgorithms(data);
    let bestAlgorithm: CompressionOptions['algorithm'] = 'gzip';
    let bestScore = 0;

    for (const [algorithm, benchmark] of benchmarks) {
      let score: number;

      switch (priority) {
        case 'ratio':
          score = benchmark.result.compressionRatio;
          break;
        case 'speed':
          score = 1000 / (benchmark.compressionTime + benchmark.decompressionTime);
          break;
        case 'balanced':
          score = (benchmark.result.compressionRatio * 0.7) + 
                  (1000 / (benchmark.compressionTime + benchmark.decompressionTime) * 0.3);
          break;
      }

      if (score > bestScore) {
        bestScore = score;
        bestAlgorithm = algorithm as CompressionOptions['algorithm'];
      }
    }

    this.logger.log(`Optimal algorithm for ${priority} priority: ${bestAlgorithm} (score: ${bestScore.toFixed(2)})`);
    return { algorithm: bestAlgorithm, score: bestScore };
  }

  getCompressionStats(): CompressionStats {
    return {
      ...this.stats,
      algorithmStats: new Map(this.stats.algorithmStats),
    };
  }

  resetStats(): void {
    this.stats.totalOperations = 0;
    this.stats.totalOriginalSize = 0;
    this.stats.totalCompressedSize = 0;
    this.stats.averageCompressionRatio = 0;
    this.stats.algorithmStats.clear();
    this.logger.log('Compression statistics reset');
  }

  private updateStats(
    algorithm: string,
    originalSize: number,
    compressedSize: number,
    compressionRatio: number
  ): void {
    this.stats.totalOperations++;
    this.stats.totalOriginalSize += originalSize;
    this.stats.totalCompressedSize += compressedSize;
    this.stats.averageCompressionRatio = this.stats.totalOriginalSize / this.stats.totalCompressedSize;

    if (!this.stats.algorithmStats.has(algorithm)) {
      this.stats.algorithmStats.set(algorithm, {
        operations: 0,
        totalSaved: 0,
        averageRatio: 0,
      });
    }

    const algorithmStat = this.stats.algorithmStats.get(algorithm)!;
    algorithmStat.operations++;
    algorithmStat.totalSaved += (originalSize - compressedSize);
    algorithmStat.averageRatio = (algorithmStat.averageRatio * (algorithmStat.operations - 1) + compressionRatio) / algorithmStat.operations;
  }

  private calculateChecksum(data: Buffer): string {
    const crypto = require('crypto');
    return crypto.createHash('sha256').update(data).digest('hex');
  }
}
import { Controller, Get, Post, Delete, Body, Query, Logger, HttpException, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery, ApiBody } from '@nestjs/swagger';
import { IsString, IsOptional, IsNumber, IsArray } from 'class-validator';
import { 
  IncrementalAnalysisService, 
  IncrementalAnalysisResult, 
  AnalysisComparison,
  FileChangeType
} from './incremental-analysis.service';

export class IncrementalAnalysisRequestDto {
  @IsString()
  projectPath: string;
}

export class CacheInvalidationRequestDto {
  @IsString()
  projectPath: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  filePaths?: string[];
}

export class AnalysisComparisonRequestDto {
  @IsString()
  projectPath: string;

  @IsOptional()
  @IsNumber()
  previousVersion?: number;
}

@ApiTags('Incremental Analysis')
@Controller('api/incremental-analysis')
export class IncrementalAnalysisController {
  private readonly logger = new Logger(IncrementalAnalysisController.name);

  constructor(private readonly incrementalAnalysisService: IncrementalAnalysisService) {}

  @Post('analyze')
  @ApiOperation({ 
    summary: 'Perform incremental analysis on project',
    description: 'Analyzes only changed files since last analysis, dramatically improving performance for large projects.'
  })
  @ApiBody({ 
    type: IncrementalAnalysisRequestDto,
    description: 'Project path to perform incremental analysis on'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Incremental analysis completed successfully',
    schema: {
      type: 'object',
      properties: {
        analysisId: { type: 'string' },
        projectPath: { type: 'string' },
        totalFiles: { type: 'number' },
        changedFiles: { type: 'number' },
        newFiles: { type: 'number' },
        deletedFiles: { type: 'number' },
        unchangedFiles: { type: 'number' },
        analysisTime: { type: 'number' },
        cacheHitRate: { type: 'number' },
        changes: { type: 'array' },
        projectAnalysis: { type: 'object' },
        status: { type: 'string' }
      }
    }
  })
  @ApiResponse({ 
    status: 400, 
    description: 'Invalid project path or analysis parameters' 
  })
  @ApiResponse({ 
    status: 500, 
    description: 'Internal server error during incremental analysis' 
  })
  async performIncrementalAnalysis(@Body() request: IncrementalAnalysisRequestDto): Promise<IncrementalAnalysisResult> {
    this.logger.log(`Incremental analysis requested for project: ${request.projectPath}`);

    try {
      if (!request.projectPath) {
        throw new HttpException('Project path is required', HttpStatus.BAD_REQUEST);
      }

      const result = await this.incrementalAnalysisService.performIncrementalAnalysis(request.projectPath);
      
      this.logger.log(`Incremental analysis completed for ${request.projectPath}: ${result.changedFiles} changed files, ${(result.cacheHitRate * 100).toFixed(1)}% cache hit rate`);
      return result;

    } catch (error) {
      this.logger.error(`Incremental analysis failed for project ${request.projectPath}:`, error);
      
      if (error instanceof HttpException) {
        throw error;
      }
      
      throw new HttpException(
        `Incremental analysis failed: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Post('compare')
  @ApiOperation({ 
    summary: 'Compare analysis versions',
    description: 'Compares current analysis with a previous version to show changes in complexity, performance, and security.'
  })
  @ApiBody({ 
    type: AnalysisComparisonRequestDto,
    description: 'Project path and optional previous version to compare against'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Analysis comparison completed successfully',
    schema: {
      type: 'object',
      properties: {
        previousVersion: { type: 'number' },
        currentVersion: { type: 'number' },
        addedFiles: { type: 'array' },
        modifiedFiles: { type: 'array' },
        deletedFiles: { type: 'array' },
        unchangedFiles: { type: 'array' },
        complexityChanges: { type: 'array' },
        performanceChanges: { type: 'array' },
        securityChanges: { type: 'array' }
      }
    }
  })
  @ApiResponse({ 
    status: 400, 
    description: 'Invalid comparison parameters' 
  })
  @ApiResponse({ 
    status: 404, 
    description: 'Previous version not found' 
  })
  async compareAnalysisVersions(@Body() request: AnalysisComparisonRequestDto): Promise<AnalysisComparison> {
    this.logger.log(`Analysis comparison requested for project: ${request.projectPath}`);

    try {
      if (!request.projectPath) {
        throw new HttpException('Project path is required', HttpStatus.BAD_REQUEST);
      }

      const comparison = await this.incrementalAnalysisService.compareAnalysisVersions(
        request.projectPath,
        request.previousVersion
      );
      
      this.logger.log(`Analysis comparison completed for ${request.projectPath}: ${comparison.modifiedFiles.length} modified files`);
      return comparison;

    } catch (error) {
      this.logger.error(`Analysis comparison failed for project ${request.projectPath}:`, error);
      
      if (error.message.includes('not found')) {
        throw new HttpException(error.message, HttpStatus.NOT_FOUND);
      }
      
      if (error instanceof HttpException) {
        throw error;
      }
      
      throw new HttpException(
        `Analysis comparison failed: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Delete('cache')
  @ApiOperation({ 
    summary: 'Invalidate analysis cache',
    description: 'Invalidates the analysis cache for a project or specific files, forcing re-analysis on next run.'
  })
  @ApiBody({ 
    type: CacheInvalidationRequestDto,
    description: 'Project path and optional specific files to invalidate'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Cache invalidated successfully',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string' },
        projectPath: { type: 'string' },
        invalidatedFiles: { type: 'number' }
      }
    }
  })
  @ApiResponse({ 
    status: 400, 
    description: 'Invalid invalidation parameters' 
  })
  async invalidateCache(@Body() request: CacheInvalidationRequestDto) {
    this.logger.log(`Cache invalidation requested for project: ${request.projectPath}`);

    try {
      if (!request.projectPath) {
        throw new HttpException('Project path is required', HttpStatus.BAD_REQUEST);
      }

      await this.incrementalAnalysisService.invalidateCache(request.projectPath, request.filePaths);
      
      const invalidatedCount = request.filePaths ? request.filePaths.length : 'all';
      this.logger.log(`Cache invalidated for ${request.projectPath}: ${invalidatedCount} files`);
      
      return {
        message: 'Cache invalidated successfully',
        projectPath: request.projectPath,
        invalidatedFiles: request.filePaths ? request.filePaths.length : -1,
      };

    } catch (error) {
      this.logger.error(`Cache invalidation failed for project ${request.projectPath}:`, error);
      
      if (error instanceof HttpException) {
        throw error;
      }
      
      throw new HttpException(
        `Cache invalidation failed: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Get('cache/statistics')
  @ApiOperation({ 
    summary: 'Get cache statistics',
    description: 'Retrieves detailed statistics about the analysis cache for a project.'
  })
  @ApiQuery({ 
    name: 'projectPath', 
    description: 'Project path to get cache statistics for',
    type: 'string'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Cache statistics retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        cacheSize: { type: 'number' },
        fileCount: { type: 'number' },
        lastAnalysis: { type: 'string' },
        version: { type: 'number' },
        hitRate: { type: 'number' },
        diskSize: { type: 'number' }
      }
    }
  })
  @ApiResponse({ 
    status: 400, 
    description: 'Invalid project path' 
  })
  async getCacheStatistics(@Query('projectPath') projectPath: string) {
    this.logger.log(`Cache statistics requested for project: ${projectPath}`);

    try {
      if (!projectPath) {
        throw new HttpException('Project path is required', HttpStatus.BAD_REQUEST);
      }

      const statistics = await this.incrementalAnalysisService.getCacheStatistics(projectPath);
      
      this.logger.log(`Cache statistics retrieved for ${projectPath}: ${statistics.fileCount} files cached`);
      return statistics;

    } catch (error) {
      this.logger.error(`Failed to get cache statistics for ${projectPath}:`, error);
      
      if (error instanceof HttpException) {
        throw error;
      }
      
      throw new HttpException(
        `Failed to get cache statistics: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Get('changes')
  @ApiOperation({ 
    summary: 'Get recent file changes',
    description: 'Retrieves information about recent file changes detected by the incremental analysis system.'
  })
  @ApiQuery({ 
    name: 'projectPath', 
    description: 'Project path to get changes for',
    type: 'string'
  })
  @ApiQuery({ 
    name: 'changeType', 
    description: 'Filter by change type',
    enum: FileChangeType,
    required: false
  })
  @ApiResponse({ 
    status: 200, 
    description: 'File changes retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        projectPath: { type: 'string' },
        totalChanges: { type: 'number' },
        changes: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              filePath: { type: 'string' },
              lastModified: { type: 'string' },
              size: { type: 'number' },
              hash: { type: 'string' },
              changeType: { type: 'string' }
            }
          }
        },
        summary: {
          type: 'object',
          properties: {
            added: { type: 'number' },
            modified: { type: 'number' },
            deleted: { type: 'number' },
            unchanged: { type: 'number' }
          }
        }
      }
    }
  })
  @ApiResponse({ 
    status: 400, 
    description: 'Invalid project path' 
  })
  async getRecentChanges(
    @Query('projectPath') projectPath: string,
    @Query('changeType') changeType?: FileChangeType
  ) {
    this.logger.log(`Recent changes requested for project: ${projectPath}`);

    try {
      if (!projectPath) {
        throw new HttpException('Project path is required', HttpStatus.BAD_REQUEST);
      }

      // Perform a quick analysis to get current changes
      const result = await this.incrementalAnalysisService.performIncrementalAnalysis(projectPath);
      let changes = result.changes;

      // Filter by change type if specified
      if (changeType) {
        changes = changes.filter(change => change.changeType === changeType);
      }

      // Create summary
      const summary = {
        added: result.changes.filter(c => c.changeType === FileChangeType.ADDED).length,
        modified: result.changes.filter(c => c.changeType === FileChangeType.MODIFIED).length,
        deleted: result.changes.filter(c => c.changeType === FileChangeType.DELETED).length,
        unchanged: result.changes.filter(c => c.changeType === FileChangeType.UNCHANGED).length,
      };

      this.logger.log(`Recent changes retrieved for ${projectPath}: ${changes.length} changes`);
      
      return {
        projectPath,
        totalChanges: changes.length,
        changes,
        summary,
      };

    } catch (error) {
      this.logger.error(`Failed to get recent changes for ${projectPath}:`, error);
      
      if (error instanceof HttpException) {
        throw error;
      }
      
      throw new HttpException(
        `Failed to get recent changes: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Get('health')
  @ApiOperation({ 
    summary: 'Incremental analysis service health check',
    description: 'Checks if the incremental analysis service is operational.'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Incremental analysis service is healthy',
    schema: {
      type: 'object',
      properties: {
        status: { type: 'string' },
        timestamp: { type: 'string' },
        service: { type: 'string' },
        cacheDirectory: { type: 'string' },
        activeCaches: { type: 'number' }
      }
    }
  })
  async healthCheck() {
    return {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      service: 'IncrementalAnalysisService',
      cacheDirectory: '.cache/analysis',
      activeCaches: 0, // Would be actual count in real implementation
    };
  }
}
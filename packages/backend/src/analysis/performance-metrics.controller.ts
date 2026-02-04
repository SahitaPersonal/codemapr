import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
  ApiBody,
} from '@nestjs/swagger';
import { IsString, IsOptional, IsNumber } from 'class-validator';
import { PerformanceMetricsService } from './performance-metrics.service';

export class AnalyzePerformanceDto {
  @IsString()
  filePath!: string;

  @IsString()
  sourceCode!: string;

  @IsOptional()
  @IsNumber()
  executionTime?: number;

  @IsOptional()
  @IsNumber()
  memoryUsage?: number;

  @IsOptional()
  @IsNumber()
  cpuUsage?: number;
}

export class ProjectPerformanceDto {
  @IsString()
  projectPath!: string;

  @IsOptional()
  @IsString()
  analysisId?: string;
}

@ApiTags('Performance Metrics')
@Controller('analysis/performance')
export class PerformanceMetricsController {
  private readonly logger = new Logger(PerformanceMetricsController.name);

  constructor(private readonly performanceMetricsService: PerformanceMetricsService) {}

  @Post('analyze')
  @ApiOperation({
    summary: 'Analyze performance metrics for code',
    description: 'Analyzes code for performance issues, bottlenecks, and optimization opportunities',
  })
  @ApiBody({ type: AnalyzePerformanceDto })
  @ApiResponse({
    status: 200,
    description: 'Performance analysis completed successfully',
    schema: {
      type: 'object',
      properties: {
        filePath: { type: 'string' },
        performanceScore: { type: 'number' },
        executionTime: { type: 'number' },
        memoryUsage: { type: 'number' },
        cpuUsage: { type: 'number' },
        bottlenecks: { type: 'array' },
        performanceIssues: { type: 'array' },
        recommendations: { type: 'array' },
        optimizationOpportunities: { type: 'array' },
      },
    },
  })
  async analyzePerformance(@Body() dto: AnalyzePerformanceDto) {
    try {
      this.logger.log(`Analyzing performance for file: ${dto.filePath}`);
      
      const analysis = await this.performanceMetricsService.analyzePerformance(
        dto.filePath,
        dto.sourceCode,
        {
          executionTime: dto.executionTime,
          memoryUsage: dto.memoryUsage,
          cpuUsage: dto.cpuUsage,
        }
      );
      
      this.logger.log(`Performance analysis completed for ${dto.filePath}`);
      return analysis;
    } catch (error) {
      this.logger.error(`Failed to analyze performance: ${error.message}`);
      throw new HttpException(
        'Failed to analyze performance',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post('project')
  @ApiOperation({
    summary: 'Analyze performance metrics for entire project',
    description: 'Performs comprehensive performance analysis for all files in a project',
  })
  @ApiBody({ type: ProjectPerformanceDto })
  @ApiResponse({
    status: 200,
    description: 'Project performance analysis completed successfully',
  })
  async analyzeProjectPerformance(@Body() dto: ProjectPerformanceDto) {
    try {
      this.logger.log(`Starting project performance analysis: ${dto.projectPath}`);
      
      const report = await this.performanceMetricsService.analyzeProjectPerformance(
        dto.projectPath,
        dto.analysisId
      );
      
      this.logger.log(`Project performance analysis completed for ${dto.projectPath}`);
      return report;
    } catch (error) {
      this.logger.error(`Failed to analyze project performance: ${error.message}`);
      throw new HttpException(
        'Failed to analyze project performance',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('bottlenecks/:projectPath')
  @ApiOperation({
    summary: 'Get performance bottlenecks for a project',
    description: 'Returns identified performance bottlenecks and slow operations',
  })
  @ApiParam({ name: 'projectPath', description: 'Path to the project directory' })
  @ApiQuery({ name: 'threshold', required: false, description: 'Performance threshold in milliseconds' })
  @ApiResponse({
    status: 200,
    description: 'Performance bottlenecks retrieved successfully',
  })
  async getBottlenecks(
    @Param('projectPath') projectPath: string,
    @Query('threshold') threshold?: string,
  ) {
    try {
      this.logger.log(`Getting performance bottlenecks for project: ${projectPath}`);
      
      const thresholdMs = threshold ? parseInt(threshold, 10) : 100;
      const bottlenecks = await this.performanceMetricsService.identifyBottlenecks(
        projectPath,
        thresholdMs
      );
      
      return {
        projectPath,
        threshold: thresholdMs,
        bottlenecks,
        totalBottlenecks: bottlenecks.length,
      };
    } catch (error) {
      this.logger.error(`Failed to get performance bottlenecks: ${error.message}`);
      throw new HttpException(
        'Failed to get performance bottlenecks',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('optimization/:projectPath')
  @ApiOperation({
    summary: 'Get optimization recommendations for a project',
    description: 'Returns actionable performance optimization recommendations',
  })
  @ApiParam({ name: 'projectPath', description: 'Path to the project directory' })
  @ApiQuery({ name: 'priority', required: false, description: 'Filter by priority level' })
  @ApiResponse({
    status: 200,
    description: 'Optimization recommendations retrieved successfully',
  })
  async getOptimizationRecommendations(
    @Param('projectPath') projectPath: string,
    @Query('priority') priority?: string,
  ) {
    try {
      this.logger.log(`Getting optimization recommendations for project: ${projectPath}`);
      
      const recommendations = await this.performanceMetricsService.getOptimizationRecommendations(
        projectPath,
        priority as 'high' | 'medium' | 'low'
      );
      
      return {
        projectPath,
        recommendations,
        totalRecommendations: recommendations.length,
        priorityBreakdown: {
          high: recommendations.filter(r => r.priority === 'high').length,
          medium: recommendations.filter(r => r.priority === 'medium').length,
          low: recommendations.filter(r => r.priority === 'low').length,
        },
      };
    } catch (error) {
      this.logger.error(`Failed to get optimization recommendations: ${error.message}`);
      throw new HttpException(
        'Failed to get optimization recommendations',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('metrics/:projectPath/summary')
  @ApiOperation({
    summary: 'Get performance metrics summary for a project',
    description: 'Returns high-level performance metrics and trends',
  })
  @ApiParam({ name: 'projectPath', description: 'Path to the project directory' })
  @ApiResponse({
    status: 200,
    description: 'Performance metrics summary retrieved successfully',
  })
  async getPerformanceMetricsSummary(@Param('projectPath') projectPath: string) {
    try {
      this.logger.log(`Getting performance metrics summary for project: ${projectPath}`);
      
      const summary = await this.performanceMetricsService.getPerformanceMetricsSummary(projectPath);
      
      return summary;
    } catch (error) {
      this.logger.error(`Failed to get performance metrics summary: ${error.message}`);
      throw new HttpException(
        'Failed to get performance metrics summary',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
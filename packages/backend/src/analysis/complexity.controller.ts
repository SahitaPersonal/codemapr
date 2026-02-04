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
import { IsString, IsOptional } from 'class-validator';
import { ComplexityService, ProjectComplexityReport } from './complexity.service';
import { FileComplexityAnalysis } from './analyzers/complexity.analyzer';

export class AnalyzeFileComplexityDto {
  @IsString()
  filePath!: string;

  @IsString()
  sourceCode!: string;
}

export class AnalyzeProjectComplexityDto {
  @IsString()
  projectPath!: string;
}

@ApiTags('Complexity Analysis')
@Controller('analysis/complexity')
export class ComplexityController {
  private readonly logger = new Logger(ComplexityController.name);

  constructor(private readonly complexityService: ComplexityService) {}

  @Post('file')
  @ApiOperation({
    summary: 'Analyze complexity for a single file',
    description: 'Calculates cyclomatic complexity, maintainability index, and technical debt for a single file',
  })
  @ApiBody({ type: AnalyzeFileComplexityDto })
  @ApiResponse({
    status: 200,
    description: 'File complexity analysis completed successfully',
    schema: {
      type: 'object',
      properties: {
        filePath: { type: 'string' },
        metrics: {
          type: 'object',
          properties: {
            cyclomaticComplexity: { type: 'number' },
            cognitiveComplexity: { type: 'number' },
            maintainabilityIndex: { type: 'number' },
            linesOfCode: { type: 'number' },
            technicalDebtScore: { type: 'number' },
            technicalDebtMinutes: { type: 'number' },
          },
        },
        functions: { type: 'array' },
        classes: { type: 'array' },
        issues: { type: 'array' },
        recommendations: { type: 'array' },
      },
    },
  })
  async analyzeFile(@Body() dto: AnalyzeFileComplexityDto): Promise<FileComplexityAnalysis> {
    try {
      this.logger.log(`Analyzing complexity for file: ${dto.filePath}`);
      
      const analysis = await this.complexityService.analyzeFile(dto.filePath, dto.sourceCode);
      
      this.logger.log(`Complexity analysis completed for ${dto.filePath}`);
      return analysis;
    } catch (error) {
      this.logger.error(`Failed to analyze file complexity: ${error.message}`);
      throw new HttpException(
        'Failed to analyze file complexity',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post('project')
  @ApiOperation({
    summary: 'Analyze complexity for an entire project',
    description: 'Performs comprehensive complexity analysis for all files in a project',
  })
  @ApiBody({ type: AnalyzeProjectComplexityDto })
  @ApiResponse({
    status: 200,
    description: 'Project complexity analysis completed successfully',
    schema: {
      type: 'object',
      properties: {
        projectPath: { type: 'string' },
        totalFiles: { type: 'number' },
        analyzedFiles: { type: 'number' },
        overallMetrics: {
          type: 'object',
          properties: {
            totalCyclomaticComplexity: { type: 'number' },
            averageMaintainabilityIndex: { type: 'number' },
            totalTechnicalDebtScore: { type: 'number' },
            totalTechnicalDebtMinutes: { type: 'number' },
            criticalIssues: { type: 'number' },
            highIssues: { type: 'number' },
          },
        },
        hotspots: { type: 'array' },
        recommendations: { type: 'array' },
        technicalDebtSummary: { type: 'object' },
      },
    },
  })
  async analyzeProject(@Body() dto: AnalyzeProjectComplexityDto): Promise<ProjectComplexityReport> {
    try {
      this.logger.log(`Starting project complexity analysis: ${dto.projectPath}`);
      
      const report = await this.complexityService.analyzeProject(dto.projectPath);
      
      this.logger.log(`Project complexity analysis completed for ${dto.projectPath}`);
      return report;
    } catch (error) {
      this.logger.error(`Failed to analyze project complexity: ${error.message}`);
      throw new HttpException(
        'Failed to analyze project complexity',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('project/:projectPath/summary')
  @ApiOperation({
    summary: 'Get complexity summary for a project',
    description: 'Returns a high-level summary of project complexity metrics',
  })
  @ApiParam({ name: 'projectPath', description: 'Path to the project directory' })
  @ApiResponse({
    status: 200,
    description: 'Project complexity summary retrieved successfully',
  })
  async getProjectSummary(@Param('projectPath') projectPath: string) {
    try {
      this.logger.log(`Getting complexity summary for project: ${projectPath}`);
      
      const report = await this.complexityService.analyzeProject(projectPath);
      
      // Return a simplified summary
      return {
        projectPath: report.projectPath,
        totalFiles: report.totalFiles,
        analyzedFiles: report.analyzedFiles,
        overallMetrics: {
          totalLinesOfCode: report.overallMetrics.totalLinesOfCode,
          totalFunctions: report.overallMetrics.totalFunctions,
          totalClasses: report.overallMetrics.totalClasses,
          averageMaintainabilityIndex: Math.round(report.overallMetrics.averageMaintainabilityIndex),
          totalTechnicalDebtHours: Math.ceil(report.overallMetrics.totalTechnicalDebtMinutes / 60),
          criticalIssues: report.overallMetrics.criticalIssues,
          highIssues: report.overallMetrics.highIssues,
        },
        topHotspots: report.hotspots.slice(0, 5),
        topRecommendations: report.recommendations.slice(0, 3),
        technicalDebtSummary: {
          totalDebtHours: report.technicalDebtSummary.totalDebtHours,
          totalDebtDays: report.technicalDebtSummary.totalDebtDays,
          paybackPriority: report.technicalDebtSummary.paybackPriority.slice(0, 5),
        },
      };
    } catch (error) {
      this.logger.error(`Failed to get project complexity summary: ${error.message}`);
      throw new HttpException(
        'Failed to get project complexity summary',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('project/:projectPath/hotspots')
  @ApiOperation({
    summary: 'Get complexity hotspots for a project',
    description: 'Returns the most complex files, functions, and classes in the project',
  })
  @ApiParam({ name: 'projectPath', description: 'Path to the project directory' })
  @ApiQuery({ name: 'limit', required: false, description: 'Maximum number of hotspots to return' })
  @ApiQuery({ name: 'severity', required: false, description: 'Filter by severity level' })
  @ApiResponse({
    status: 200,
    description: 'Complexity hotspots retrieved successfully',
  })
  async getProjectHotspots(
    @Param('projectPath') projectPath: string,
    @Query('limit') limit?: string,
    @Query('severity') severity?: string,
  ) {
    try {
      this.logger.log(`Getting complexity hotspots for project: ${projectPath}`);
      
      const report = await this.complexityService.analyzeProject(projectPath);
      let hotspots = report.hotspots;

      // Filter by severity if specified
      if (severity) {
        hotspots = hotspots.filter(h => h.severity === severity);
      }

      // Limit results if specified
      const limitNum = limit ? parseInt(limit, 10) : 20;
      hotspots = hotspots.slice(0, limitNum);

      return {
        projectPath: report.projectPath,
        totalHotspots: report.hotspots.length,
        filteredHotspots: hotspots.length,
        hotspots,
        severityBreakdown: {
          critical: report.hotspots.filter(h => h.severity === 'critical').length,
          high: report.hotspots.filter(h => h.severity === 'high').length,
          medium: report.hotspots.filter(h => h.severity === 'medium').length,
          low: report.hotspots.filter(h => h.severity === 'low').length,
        },
      };
    } catch (error) {
      this.logger.error(`Failed to get project hotspots: ${error.message}`);
      throw new HttpException(
        'Failed to get project hotspots',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('project/:projectPath/recommendations')
  @ApiOperation({
    summary: 'Get complexity recommendations for a project',
    description: 'Returns actionable recommendations to improve code complexity and maintainability',
  })
  @ApiParam({ name: 'projectPath', description: 'Path to the project directory' })
  @ApiQuery({ name: 'priority', required: false, description: 'Filter by priority level' })
  @ApiResponse({
    status: 200,
    description: 'Complexity recommendations retrieved successfully',
  })
  async getProjectRecommendations(
    @Param('projectPath') projectPath: string,
    @Query('priority') priority?: string,
  ) {
    try {
      this.logger.log(`Getting complexity recommendations for project: ${projectPath}`);
      
      const report = await this.complexityService.analyzeProject(projectPath);
      let recommendations = report.recommendations;

      // Filter by priority if specified
      if (priority) {
        recommendations = recommendations.filter(r => r.priority === priority);
      }

      return {
        projectPath: report.projectPath,
        totalRecommendations: report.recommendations.length,
        filteredRecommendations: recommendations.length,
        recommendations,
        priorityBreakdown: {
          critical: report.recommendations.filter(r => r.priority === 'critical').length,
          high: report.recommendations.filter(r => r.priority === 'high').length,
          medium: report.recommendations.filter(r => r.priority === 'medium').length,
          low: report.recommendations.filter(r => r.priority === 'low').length,
        },
      };
    } catch (error) {
      this.logger.error(`Failed to get project recommendations: ${error.message}`);
      throw new HttpException(
        'Failed to get project recommendations',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('project/:projectPath/technical-debt')
  @ApiOperation({
    summary: 'Get technical debt analysis for a project',
    description: 'Returns detailed technical debt analysis and payback recommendations',
  })
  @ApiParam({ name: 'projectPath', description: 'Path to the project directory' })
  @ApiResponse({
    status: 200,
    description: 'Technical debt analysis retrieved successfully',
  })
  async getTechnicalDebtAnalysis(@Param('projectPath') projectPath: string) {
    try {
      this.logger.log(`Getting technical debt analysis for project: ${projectPath}`);
      
      const report = await this.complexityService.analyzeProject(projectPath);
      
      return {
        projectPath: report.projectPath,
        technicalDebtSummary: report.technicalDebtSummary,
        debtMetrics: {
          totalScore: report.overallMetrics.totalTechnicalDebtScore,
          totalMinutes: report.overallMetrics.totalTechnicalDebtMinutes,
          totalHours: Math.ceil(report.overallMetrics.totalTechnicalDebtMinutes / 60),
          totalDays: Math.ceil(report.overallMetrics.totalTechnicalDebtMinutes / (60 * 8)),
          averagePerFile: Math.round(report.overallMetrics.totalTechnicalDebtScore / report.analyzedFiles),
        },
        highDebtFiles: report.fileAnalyses
          .filter(f => f.metrics.technicalDebtScore > 50)
          .sort((a, b) => b.metrics.technicalDebtScore - a.metrics.technicalDebtScore)
          .slice(0, 10)
          .map(f => ({
            filePath: f.filePath,
            debtScore: f.metrics.technicalDebtScore,
            debtMinutes: f.metrics.technicalDebtMinutes,
            maintainabilityIndex: Math.round(f.metrics.maintainabilityIndex),
            codeSmells: f.issues.length,
          })),
        recommendations: report.recommendations.filter(r => r.category === 'technical_debt'),
      };
    } catch (error) {
      this.logger.error(`Failed to get technical debt analysis: ${error.message}`);
      throw new HttpException(
        'Failed to get technical debt analysis',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('project/:projectPath/trends')
  @ApiOperation({
    summary: 'Get complexity trends for a project',
    description: 'Returns complexity trends over time (placeholder for future implementation)',
  })
  @ApiParam({ name: 'projectPath', description: 'Path to the project directory' })
  @ApiQuery({ name: 'timeRange', required: false, description: 'Time range for trends (e.g., "30d", "6m", "1y")' })
  @ApiResponse({
    status: 200,
    description: 'Complexity trends retrieved successfully',
  })
  async getComplexityTrends(
    @Param('projectPath') projectPath: string,
    @Query('timeRange') timeRange = '30d',
  ) {
    try {
      this.logger.log(`Getting complexity trends for project: ${projectPath}`);
      
      const trends = await this.complexityService.getComplexityTrends(projectPath, timeRange);
      
      return trends;
    } catch (error) {
      this.logger.error(`Failed to get complexity trends: ${error.message}`);
      throw new HttpException(
        'Failed to get complexity trends',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
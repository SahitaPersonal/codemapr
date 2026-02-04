import { Controller, Get, Post, Body, Query, Logger, HttpException, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery, ApiBody } from '@nestjs/swagger';
import { IsString, IsOptional, IsEnum } from 'class-validator';
import { 
  OptimizationRecommendationService, 
  OptimizationAnalysisResult, 
  OptimizationRecommendation,
  OptimizationType,
  OptimizationPriority,
  OptimizationCategory
} from './optimization-recommendation.service';

export class OptimizationAnalysisRequestDto {
  @IsString()
  projectPath: string;
}

export class OptimizationFilterDto {
  @IsOptional()
  @IsEnum(OptimizationType)
  type?: OptimizationType;

  @IsOptional()
  @IsEnum(OptimizationPriority)
  priority?: OptimizationPriority;

  @IsOptional()
  @IsEnum(OptimizationCategory)
  category?: OptimizationCategory;

  @IsOptional()
  @IsString()
  filePath?: string;
}

@ApiTags('Optimization Recommendations')
@Controller('api/optimization')
export class OptimizationRecommendationController {
  private readonly logger = new Logger(OptimizationRecommendationController.name);

  constructor(private readonly optimizationService: OptimizationRecommendationService) {}

  @Post('analyze')
  @ApiOperation({ 
    summary: 'Analyze project for optimization opportunities',
    description: 'Performs comprehensive analysis of the project and generates actionable optimization recommendations.'
  })
  @ApiBody({ 
    type: OptimizationAnalysisRequestDto,
    description: 'Project path to analyze for optimization opportunities'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Optimization analysis completed successfully',
    schema: {
      type: 'object',
      properties: {
        projectPath: { type: 'string' },
        totalFiles: { type: 'number' },
        analyzedFiles: { type: 'number' },
        recommendations: { type: 'array' },
        summary: {
          type: 'object',
          properties: {
            totalRecommendations: { type: 'number' },
            highPriorityCount: { type: 'number' },
            mediumPriorityCount: { type: 'number' },
            lowPriorityCount: { type: 'number' },
            categoryCounts: { type: 'object' },
            estimatedTotalImpact: { type: 'string' }
          }
        },
        analysisTime: { type: 'number' }
      }
    }
  })
  @ApiResponse({ 
    status: 400, 
    description: 'Invalid project path or analysis parameters' 
  })
  @ApiResponse({ 
    status: 500, 
    description: 'Internal server error during optimization analysis' 
  })
  async analyzeProject(@Body() request: OptimizationAnalysisRequestDto): Promise<OptimizationAnalysisResult> {
    this.logger.log(`Optimization analysis requested for project: ${request.projectPath}`);

    try {
      if (!request.projectPath) {
        throw new HttpException('Project path is required', HttpStatus.BAD_REQUEST);
      }

      const result = await this.optimizationService.analyzeProject(request.projectPath);
      
      this.logger.log(`Optimization analysis completed for ${request.projectPath}: ${result.recommendations.length} recommendations generated`);
      return result;

    } catch (error) {
      this.logger.error(`Optimization analysis failed for project ${request.projectPath}:`, error);
      
      if (error instanceof HttpException) {
        throw error;
      }
      
      throw new HttpException(
        `Optimization analysis failed: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Get('recommendations')
  @ApiOperation({ 
    summary: 'Get filtered optimization recommendations',
    description: 'Retrieves optimization recommendations with optional filtering by type, priority, category, or file.'
  })
  @ApiQuery({ 
    name: 'projectPath', 
    description: 'Project path to analyze',
    type: 'string'
  })
  @ApiQuery({ 
    name: 'type', 
    description: 'Filter by optimization type',
    enum: OptimizationType,
    required: false
  })
  @ApiQuery({ 
    name: 'priority', 
    description: 'Filter by priority level',
    enum: OptimizationPriority,
    required: false
  })
  @ApiQuery({ 
    name: 'category', 
    description: 'Filter by optimization category',
    enum: OptimizationCategory,
    required: false
  })
  @ApiQuery({ 
    name: 'filePath', 
    description: 'Filter by specific file path',
    type: 'string',
    required: false
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Optimization recommendations retrieved successfully',
    schema: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          type: { type: 'string' },
          priority: { type: 'string' },
          title: { type: 'string' },
          description: { type: 'string' },
          category: { type: 'string' },
          affectedFiles: { type: 'array' },
          codeExamples: { type: 'array' },
          actionItems: { type: 'array' },
          estimatedImpact: { type: 'string' },
          difficulty: { type: 'string' },
          tags: { type: 'array' },
          metadata: { type: 'object' }
        }
      }
    }
  })
  @ApiResponse({ 
    status: 400, 
    description: 'Invalid project path or filter parameters' 
  })
  async getRecommendations(
    @Query('projectPath') projectPath: string,
    @Query('type') type?: OptimizationType,
    @Query('priority') priority?: OptimizationPriority,
    @Query('category') category?: OptimizationCategory,
    @Query('filePath') filePath?: string
  ): Promise<OptimizationRecommendation[]> {
    this.logger.log(`Optimization recommendations requested for project: ${projectPath}`);

    try {
      if (!projectPath) {
        throw new HttpException('Project path is required', HttpStatus.BAD_REQUEST);
      }

      const result = await this.optimizationService.analyzeProject(projectPath);
      let recommendations = result.recommendations;

      // Apply filters
      if (type) {
        recommendations = recommendations.filter(rec => rec.type === type);
      }
      
      if (priority) {
        recommendations = recommendations.filter(rec => rec.priority === priority);
      }
      
      if (category) {
        recommendations = recommendations.filter(rec => rec.category === category);
      }
      
      if (filePath) {
        recommendations = recommendations.filter(rec => 
          rec.affectedFiles.some(file => file.includes(filePath))
        );
      }

      this.logger.log(`Filtered recommendations for ${projectPath}: ${recommendations.length} recommendations`);
      return recommendations;

    } catch (error) {
      this.logger.error(`Failed to get optimization recommendations for ${projectPath}:`, error);
      
      if (error instanceof HttpException) {
        throw error;
      }
      
      throw new HttpException(
        `Failed to get optimization recommendations: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Get('summary')
  @ApiOperation({ 
    summary: 'Get optimization analysis summary',
    description: 'Retrieves a summary of optimization opportunities and their potential impact.'
  })
  @ApiQuery({ 
    name: 'projectPath', 
    description: 'Project path to analyze',
    type: 'string'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Optimization summary retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        totalRecommendations: { type: 'number' },
        highPriorityCount: { type: 'number' },
        mediumPriorityCount: { type: 'number' },
        lowPriorityCount: { type: 'number' },
        categoryCounts: { type: 'object' },
        estimatedTotalImpact: { type: 'string' },
        topCategories: { type: 'array' },
        quickWins: { type: 'array' },
        highImpactItems: { type: 'array' }
      }
    }
  })
  @ApiResponse({ 
    status: 400, 
    description: 'Invalid project path' 
  })
  async getOptimizationSummary(@Query('projectPath') projectPath: string) {
    this.logger.log(`Optimization summary requested for project: ${projectPath}`);

    try {
      if (!projectPath) {
        throw new HttpException('Project path is required', HttpStatus.BAD_REQUEST);
      }

      const result = await this.optimizationService.analyzeProject(projectPath);
      const { summary, recommendations } = result;

      // Find top categories
      const topCategories = Object.entries(summary.categoryCounts)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 5)
        .map(([category, count]) => ({ category, count }));

      // Find quick wins (high impact, easy difficulty)
      const quickWins = recommendations
        .filter(rec => rec.difficulty === 'easy' && rec.estimatedImpact === 'high')
        .slice(0, 5)
        .map(rec => ({
          id: rec.id,
          title: rec.title,
          category: rec.category,
          estimatedImpact: rec.estimatedImpact,
          difficulty: rec.difficulty
        }));

      // Find high impact items
      const highImpactItems = recommendations
        .filter(rec => rec.estimatedImpact === 'high')
        .slice(0, 10)
        .map(rec => ({
          id: rec.id,
          title: rec.title,
          category: rec.category,
          priority: rec.priority,
          affectedFiles: rec.affectedFiles.length
        }));

      const enhancedSummary = {
        ...summary,
        topCategories,
        quickWins,
        highImpactItems,
      };

      this.logger.log(`Optimization summary retrieved for ${projectPath}: ${summary.totalRecommendations} total recommendations`);
      return enhancedSummary;

    } catch (error) {
      this.logger.error(`Failed to get optimization summary for ${projectPath}:`, error);
      
      if (error instanceof HttpException) {
        throw error;
      }
      
      throw new HttpException(
        `Failed to get optimization summary: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Get('categories')
  @ApiOperation({ 
    summary: 'Get available optimization categories',
    description: 'Retrieves all available optimization categories and types for filtering.'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Optimization categories retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        types: { type: 'array' },
        priorities: { type: 'array' },
        categories: { type: 'array' },
        impactLevels: { type: 'array' },
        difficultyLevels: { type: 'array' }
      }
    }
  })
  async getOptimizationCategories() {
    return {
      types: Object.values(OptimizationType),
      priorities: Object.values(OptimizationPriority),
      categories: Object.values(OptimizationCategory),
      impactLevels: ['high', 'medium', 'low'],
      difficultyLevels: ['easy', 'medium', 'hard'],
    };
  }

  @Get('health')
  @ApiOperation({ 
    summary: 'Optimization service health check',
    description: 'Checks if the optimization recommendation service is operational.'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Optimization service is healthy',
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
      service: 'OptimizationRecommendationService',
    };
  }
}
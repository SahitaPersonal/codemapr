import {
  Controller,
  Post,
  Get,
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
import { AIService, AIExplanationRequest, AIExplanationResponse } from './ai.service';
import { ExplainCodeDto, AnalyzeSecurityDto, AnalyzePerformanceDto, GenerateSuggestionsDto } from './dto/ai.dto';

@ApiTags('AI')
@Controller('ai')
export class AIController {
  private readonly logger = new Logger(AIController.name);

  constructor(private readonly aiService: AIService) {}

  @Post('explain')
  @ApiOperation({
    summary: 'Generate AI explanation for code',
    description: 'Uses GPT-4 to provide detailed explanations of code functionality, structure, and patterns',
  })
  @ApiBody({ type: ExplainCodeDto })
  @ApiResponse({
    status: 201,
    description: 'AI explanation generated successfully',
    schema: {
      type: 'object',
      properties: {
        explanation: { type: 'string' },
        suggestions: { type: 'array', items: { type: 'object' } },
        confidence: { type: 'number' },
        tokensUsed: { type: 'number' },
        processingTime: { type: 'number' },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid request data',
  })
  @ApiResponse({
    status: 429,
    description: 'Rate limit exceeded',
  })
  @ApiResponse({
    status: 503,
    description: 'AI service unavailable',
  })
  async explainCode(@Body() dto: ExplainCodeDto): Promise<AIExplanationResponse> {
    try {
      this.logger.debug(`Generating AI explanation for ${dto.type}`);

      const request: AIExplanationRequest = {
        type: dto.type,
        context: {
          code: dto.code,
          filePath: dto.filePath,
          additionalContext: dto.additionalContext,
        },
        options: {
          includeCodeSuggestions: dto.includeSuggestions,
          includeSecurityAnalysis: dto.includeSecurityAnalysis,
          includePerformanceAnalysis: dto.includePerformanceAnalysis,
          maxTokens: dto.maxTokens,
          temperature: dto.temperature,
          language: dto.language,
        },
      };

      return await this.aiService.generateExplanation(request);
    } catch (error) {
      this.logger.error(`AI explanation failed: ${error.message}`);
      
      if (error.message.includes('Rate limit')) {
        throw new HttpException(error.message, HttpStatus.TOO_MANY_REQUESTS);
      }
      
      if (error.message.includes('not configured')) {
        throw new HttpException('AI service not configured', HttpStatus.SERVICE_UNAVAILABLE);
      }

      throw new HttpException(
        'Failed to generate AI explanation',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post('analyze/security')
  @ApiOperation({
    summary: 'Analyze code for security vulnerabilities',
    description: 'Uses AI to identify potential security issues and provide remediation recommendations',
  })
  @ApiBody({ type: AnalyzeSecurityDto })
  @ApiResponse({
    status: 201,
    description: 'Security analysis completed',
    schema: {
      type: 'object',
      properties: {
        issues: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              type: { type: 'string' },
              severity: { type: 'string' },
              title: { type: 'string' },
              description: { type: 'string' },
              recommendation: { type: 'string' },
              location: { type: 'object' },
              cweId: { type: 'string' },
            },
          },
        },
        summary: {
          type: 'object',
          properties: {
            totalIssues: { type: 'number' },
            criticalIssues: { type: 'number' },
            highIssues: { type: 'number' },
            mediumIssues: { type: 'number' },
            lowIssues: { type: 'number' },
          },
        },
      },
    },
  })
  async analyzeCodeSecurity(@Body() dto: AnalyzeSecurityDto): Promise<{
    issues: any[];
    summary: {
      totalIssues: number;
      criticalIssues: number;
      highIssues: number;
      mediumIssues: number;
      lowIssues: number;
    };
  }> {
    try {
      this.logger.debug(`Analyzing security for ${dto.filePath}`);

      const issues = await this.aiService.analyzeCodeSecurity(
        dto.code,
        dto.filePath,
        dto.fileAnalysis,
      );

      const summary = {
        totalIssues: issues.length,
        criticalIssues: issues.filter(i => i.severity === 'critical').length,
        highIssues: issues.filter(i => i.severity === 'high').length,
        mediumIssues: issues.filter(i => i.severity === 'medium').length,
        lowIssues: issues.filter(i => i.severity === 'low').length,
      };

      return { issues, summary };
    } catch (error) {
      this.logger.error(`Security analysis failed: ${error.message}`);
      throw new HttpException(
        'Failed to analyze code security',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post('analyze/performance')
  @ApiOperation({
    summary: 'Analyze code for performance issues',
    description: 'Uses AI to identify performance bottlenecks and optimization opportunities',
  })
  @ApiBody({ type: AnalyzePerformanceDto })
  @ApiResponse({
    status: 201,
    description: 'Performance analysis completed',
    schema: {
      type: 'object',
      properties: {
        issues: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              type: { type: 'string' },
              severity: { type: 'string' },
              title: { type: 'string' },
              description: { type: 'string' },
              recommendation: { type: 'string' },
              location: { type: 'object' },
              estimatedImpact: { type: 'string' },
            },
          },
        },
        summary: {
          type: 'object',
          properties: {
            totalIssues: { type: 'number' },
            highImpactIssues: { type: 'number' },
            mediumImpactIssues: { type: 'number' },
            lowImpactIssues: { type: 'number' },
          },
        },
      },
    },
  })
  async analyzeCodePerformance(@Body() dto: AnalyzePerformanceDto): Promise<{
    issues: any[];
    summary: {
      totalIssues: number;
      highImpactIssues: number;
      mediumImpactIssues: number;
      lowImpactIssues: number;
    };
  }> {
    try {
      this.logger.debug(`Analyzing performance for ${dto.filePath}`);

      const issues = await this.aiService.analyzeCodePerformance(
        dto.code,
        dto.filePath,
        dto.complexity,
      );

      const summary = {
        totalIssues: issues.length,
        highImpactIssues: issues.filter(i => i.severity === 'high').length,
        mediumImpactIssues: issues.filter(i => i.severity === 'medium').length,
        lowImpactIssues: issues.filter(i => i.severity === 'low').length,
      };

      return { issues, summary };
    } catch (error) {
      this.logger.error(`Performance analysis failed: ${error.message}`);
      throw new HttpException(
        'Failed to analyze code performance',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post('suggestions')
  @ApiOperation({
    summary: 'Generate code improvement suggestions',
    description: 'Uses AI to provide refactoring and optimization suggestions',
  })
  @ApiBody({ type: GenerateSuggestionsDto })
  @ApiResponse({
    status: 201,
    description: 'Code suggestions generated',
    schema: {
      type: 'object',
      properties: {
        suggestions: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              type: { type: 'string' },
              title: { type: 'string' },
              description: { type: 'string' },
              originalCode: { type: 'string' },
              suggestedCode: { type: 'string' },
              impact: { type: 'string' },
              effort: { type: 'string' },
            },
          },
        },
        summary: {
          type: 'object',
          properties: {
            totalSuggestions: { type: 'number' },
            highImpactSuggestions: { type: 'number' },
            lowEffortSuggestions: { type: 'number' },
          },
        },
      },
    },
  })
  async generateCodeSuggestions(@Body() dto: GenerateSuggestionsDto): Promise<{
    suggestions: any[];
    summary: {
      totalSuggestions: number;
      highImpactSuggestions: number;
      lowEffortSuggestions: number;
    };
  }> {
    try {
      this.logger.debug(`Generating suggestions for ${dto.filePath}`);

      const suggestions = await this.aiService.generateCodeSuggestions(
        dto.code,
        dto.filePath,
        dto.fileAnalysis,
      );

      const summary = {
        totalSuggestions: suggestions.length,
        highImpactSuggestions: suggestions.filter(s => s.impact === 'high').length,
        lowEffortSuggestions: suggestions.filter(s => s.effort === 'low').length,
      };

      return { suggestions, summary };
    } catch (error) {
      this.logger.error(`Code suggestions failed: ${error.message}`);
      throw new HttpException(
        'Failed to generate code suggestions',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('health')
  @ApiOperation({
    summary: 'Check AI service health',
    description: 'Returns the current status of the AI service and rate limiting information',
  })
  @ApiResponse({
    status: 200,
    description: 'AI service health status',
    schema: {
      type: 'object',
      properties: {
        status: { type: 'string', enum: ['healthy', 'degraded', 'unhealthy'] },
        configured: { type: 'boolean' },
        rateLimitStatus: {
          type: 'object',
          properties: {
            requestsInLastMinute: { type: 'number' },
            maxRequestsPerMinute: { type: 'number' },
          },
        },
        timestamp: { type: 'string' },
      },
    },
  })
  async checkHealth(): Promise<{
    status: string;
    configured: boolean;
    rateLimitStatus: {
      requestsInLastMinute: number;
      maxRequestsPerMinute: number;
    };
    timestamp: string;
  }> {
    const health = await this.aiService.getServiceHealth();
    
    return {
      ...health,
      timestamp: new Date().toISOString(),
    };
  }

  @Get('models')
  @ApiOperation({
    summary: 'Get available AI models',
    description: 'Returns information about available AI models and their capabilities',
  })
  @ApiResponse({
    status: 200,
    description: 'Available AI models',
    schema: {
      type: 'object',
      properties: {
        models: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              name: { type: 'string' },
              description: { type: 'string' },
              maxTokens: { type: 'number' },
              capabilities: { type: 'array', items: { type: 'string' } },
            },
          },
        },
      },
    },
  })
  getAvailableModels() {
    return {
      models: [
        {
          id: 'gpt-4',
          name: 'GPT-4',
          description: 'Most capable model for code analysis and explanation',
          maxTokens: 8192,
          capabilities: [
            'code_explanation',
            'security_analysis',
            'performance_analysis',
            'refactoring_suggestions',
            'code_review',
          ],
        },
        {
          id: 'gpt-3.5-turbo',
          name: 'GPT-3.5 Turbo',
          description: 'Fast and efficient model for basic code analysis',
          maxTokens: 4096,
          capabilities: [
            'code_explanation',
            'basic_analysis',
          ],
        },
      ],
    };
  }

  @Get('usage')
  @ApiOperation({
    summary: 'Get AI service usage statistics',
    description: 'Returns current usage statistics and rate limiting information',
  })
  @ApiResponse({
    status: 200,
    description: 'AI service usage statistics',
    schema: {
      type: 'object',
      properties: {
        currentPeriod: {
          type: 'object',
          properties: {
            requests: { type: 'number' },
            tokensUsed: { type: 'number' },
            errors: { type: 'number' },
          },
        },
        rateLimits: {
          type: 'object',
          properties: {
            requestsPerMinute: { type: 'number' },
            tokensPerMinute: { type: 'number' },
            requestsRemaining: { type: 'number' },
          },
        },
      },
    },
  })
  async getUsageStatistics() {
    const health = await this.aiService.getServiceHealth();
    
    return {
      currentPeriod: {
        requests: health.rateLimitStatus.requestsInLastMinute,
        tokensUsed: 0, // Would track this in production
        errors: 0, // Would track this in production
      },
      rateLimits: {
        requestsPerMinute: health.rateLimitStatus.maxRequestsPerMinute,
        tokensPerMinute: 60000, // Typical OpenAI limit
        requestsRemaining: health.rateLimitStatus.maxRequestsPerMinute - health.rateLimitStatus.requestsInLastMinute,
      },
    };
  }

  @Get('cache/stats')
  @ApiOperation({
    summary: 'Get AI cache statistics',
    description: 'Returns detailed statistics about the AI response cache',
  })
  @ApiResponse({
    status: 200,
    description: 'AI cache statistics',
    schema: {
      type: 'object',
      properties: {
        totalEntries: { type: 'number' },
        hitRate: { type: 'number' },
        totalHits: { type: 'number' },
        totalMisses: { type: 'number' },
        totalSize: { type: 'number' },
        oldestEntry: { type: 'string' },
        newestEntry: { type: 'string' },
      },
    },
  })
  async getCacheStats() {
    return await this.aiService.getCacheStats();
  }

  @Post('cache/invalidate')
  @ApiOperation({
    summary: 'Invalidate AI cache',
    description: 'Clears AI response cache entries, optionally for a specific file',
  })
  @ApiQuery({
    name: 'filePath',
    required: false,
    description: 'Optional file path to invalidate cache for specific file',
  })
  @ApiResponse({
    status: 200,
    description: 'Cache invalidation completed',
    schema: {
      type: 'object',
      properties: {
        invalidatedEntries: { type: 'number' },
        message: { type: 'string' },
      },
    },
  })
  async invalidateCache(@Query('filePath') filePath?: string) {
    const invalidatedEntries = await this.aiService.invalidateCache(filePath);
    
    return {
      invalidatedEntries,
      message: filePath 
        ? `Invalidated ${invalidatedEntries} cache entries for file: ${filePath}`
        : 'All cache entries cleared',
    };
  }
}
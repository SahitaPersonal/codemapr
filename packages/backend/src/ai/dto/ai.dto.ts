import { IsString, IsOptional, IsBoolean, IsNumber, IsEnum, IsObject, Min, Max } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { FileAnalysis, ComplexityMetrics } from '@codemapr/shared';
import { ExplanationType } from '../ai.service';

export class ExplainCodeDto {
  @ApiProperty({
    description: 'Type of explanation to generate',
    enum: ExplanationType,
    example: ExplanationType.CODE_EXPLANATION,
  })
  @IsEnum(ExplanationType)
  type: ExplanationType;

  @ApiProperty({
    description: 'Code to analyze and explain',
    example: 'function calculateTotal(items) { return items.reduce((sum, item) => sum + item.price, 0); }',
  })
  @IsString()
  code: string;

  @ApiPropertyOptional({
    description: 'File path for context',
    example: 'src/utils/calculator.js',
  })
  @IsOptional()
  @IsString()
  filePath?: string;

  @ApiPropertyOptional({
    description: 'Additional context information',
    example: 'This function is used in the shopping cart component',
  })
  @IsOptional()
  @IsString()
  additionalContext?: string;

  @ApiPropertyOptional({
    description: 'Include code improvement suggestions',
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  includeSuggestions?: boolean;

  @ApiPropertyOptional({
    description: 'Include security analysis',
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  includeSecurityAnalysis?: boolean;

  @ApiPropertyOptional({
    description: 'Include performance analysis',
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  includePerformanceAnalysis?: boolean;

  @ApiPropertyOptional({
    description: 'Maximum tokens for the response',
    minimum: 100,
    maximum: 4000,
    default: 2000,
  })
  @IsOptional()
  @IsNumber()
  @Min(100)
  @Max(4000)
  maxTokens?: number;

  @ApiPropertyOptional({
    description: 'Temperature for response creativity (0.0 = deterministic, 1.0 = creative)',
    minimum: 0,
    maximum: 1,
    default: 0.3,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1)
  temperature?: number;

  @ApiPropertyOptional({
    description: 'Language for the explanation',
    enum: ['en', 'es', 'fr', 'de', 'zh', 'ja'],
    default: 'en',
  })
  @IsOptional()
  @IsEnum(['en', 'es', 'fr', 'de', 'zh', 'ja'])
  language?: 'en' | 'es' | 'fr' | 'de' | 'zh' | 'ja';
}

export class AnalyzeSecurityDto {
  @ApiProperty({
    description: 'Code to analyze for security issues',
    example: 'const query = `SELECT * FROM users WHERE id = ${userId}`;',
  })
  @IsString()
  code: string;

  @ApiProperty({
    description: 'File path for context',
    example: 'src/database/queries.js',
  })
  @IsString()
  filePath: string;

  @ApiPropertyOptional({
    description: 'File analysis data for additional context',
  })
  @IsOptional()
  @IsObject()
  fileAnalysis?: FileAnalysis;

  @ApiPropertyOptional({
    description: 'Focus on specific security categories',
    type: [String],
    example: ['injection', 'authentication', 'authorization'],
  })
  @IsOptional()
  @IsString({ each: true })
  focusAreas?: string[];

  @ApiPropertyOptional({
    description: 'Include OWASP Top 10 mapping',
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  includeOwaspMapping?: boolean;

  @ApiPropertyOptional({
    description: 'Include CWE references',
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  includeCweReferences?: boolean;
}

export class AnalyzePerformanceDto {
  @ApiProperty({
    description: 'Code to analyze for performance issues',
    example: 'for (let i = 0; i < items.length; i++) { for (let j = 0; j < items.length; j++) { /* nested loop */ } }',
  })
  @IsString()
  code: string;

  @ApiProperty({
    description: 'File path for context',
    example: 'src/algorithms/sorting.js',
  })
  @IsString()
  filePath: string;

  @ApiPropertyOptional({
    description: 'Complexity metrics for additional context',
  })
  @IsOptional()
  @IsObject()
  complexity?: ComplexityMetrics;

  @ApiPropertyOptional({
    description: 'Focus on specific performance categories',
    type: [String],
    example: ['algorithm', 'memory', 'io'],
  })
  @IsOptional()
  @IsString({ each: true })
  focusAreas?: string[];

  @ApiPropertyOptional({
    description: 'Include algorithmic complexity analysis',
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  includeComplexityAnalysis?: boolean;

  @ApiPropertyOptional({
    description: 'Include memory usage analysis',
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  includeMemoryAnalysis?: boolean;
}

export class GenerateSuggestionsDto {
  @ApiProperty({
    description: 'Code to generate suggestions for',
    example: 'function processData(data) { var result = []; for (var i = 0; i < data.length; i++) { result.push(data[i].toUpperCase()); } return result; }',
  })
  @IsString()
  code: string;

  @ApiProperty({
    description: 'File path for context',
    example: 'src/utils/dataProcessor.js',
  })
  @IsString()
  filePath: string;

  @ApiPropertyOptional({
    description: 'File analysis data for additional context',
  })
  @IsOptional()
  @IsObject()
  fileAnalysis?: FileAnalysis;

  @ApiPropertyOptional({
    description: 'Types of suggestions to focus on',
    type: [String],
    example: ['refactor', 'optimization', 'best_practice'],
  })
  @IsOptional()
  @IsString({ each: true })
  suggestionTypes?: string[];

  @ApiPropertyOptional({
    description: 'Include before/after code examples',
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  includeCodeExamples?: boolean;

  @ApiPropertyOptional({
    description: 'Include effort and impact estimates',
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  includeEstimates?: boolean;

  @ApiPropertyOptional({
    description: 'Maximum number of suggestions to return',
    minimum: 1,
    maximum: 20,
    default: 10,
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(20)
  maxSuggestions?: number;
}

export class AIExplanationResponseDto {
  @ApiProperty({
    description: 'Generated explanation text',
    example: 'This function calculates the total price of items in a shopping cart...',
  })
  explanation: string;

  @ApiPropertyOptional({
    description: 'Code improvement suggestions',
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
  })
  suggestions?: any[];

  @ApiPropertyOptional({
    description: 'Security issues found',
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
  })
  securityIssues?: any[];

  @ApiPropertyOptional({
    description: 'Performance issues found',
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
  })
  performanceIssues?: any[];

  @ApiProperty({
    description: 'Confidence score for the analysis (0.0 to 1.0)',
    minimum: 0,
    maximum: 1,
    example: 0.85,
  })
  confidence: number;

  @ApiProperty({
    description: 'Number of tokens used in the API call',
    example: 1250,
  })
  tokensUsed: number;

  @ApiProperty({
    description: 'Processing time in milliseconds',
    example: 2340,
  })
  processingTime: number;
}

export class AIHealthResponseDto {
  @ApiProperty({
    description: 'Service health status',
    enum: ['healthy', 'degraded', 'unhealthy'],
    example: 'healthy',
  })
  status: 'healthy' | 'degraded' | 'unhealthy';

  @ApiProperty({
    description: 'Whether the AI service is properly configured',
    example: true,
  })
  configured: boolean;

  @ApiProperty({
    description: 'Rate limiting status',
    type: 'object',
    properties: {
      requestsInLastMinute: { type: 'number' },
      maxRequestsPerMinute: { type: 'number' },
    },
  })
  rateLimitStatus: {
    requestsInLastMinute: number;
    maxRequestsPerMinute: number;
  };

  @ApiProperty({
    description: 'Timestamp of the health check',
    example: '2024-01-15T10:30:00.000Z',
  })
  timestamp: string;
}

export class AIErrorResponseDto {
  @ApiProperty({
    description: 'Error message',
    example: 'Rate limit exceeded. Try again in 30 seconds.',
  })
  message: string;

  @ApiProperty({
    description: 'Error code',
    example: 'RATE_LIMIT_EXCEEDED',
  })
  error: string;

  @ApiProperty({
    description: 'HTTP status code',
    example: 429,
  })
  statusCode: number;

  @ApiPropertyOptional({
    description: 'Additional error details',
  })
  details?: any;
}
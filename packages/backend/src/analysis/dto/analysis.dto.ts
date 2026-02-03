import { IsString, IsOptional, IsArray, IsNumber, IsBoolean, IsEnum } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { SupportedLanguage } from '@codemapr/shared';

export class AnalyzeProjectDto {
  @ApiProperty({ description: 'Project name' })
  @IsString()
  name: string;

  @ApiProperty({ description: 'Primary language of the project', enum: SupportedLanguage })
  @IsEnum(SupportedLanguage)
  language: SupportedLanguage;

  @ApiPropertyOptional({ description: 'File patterns to exclude', type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  excludePatterns?: string[];

  @ApiPropertyOptional({ description: 'Whether to include test files', default: false })
  @IsOptional()
  @IsBoolean()
  includeTestFiles?: boolean;

  @ApiPropertyOptional({ description: 'Maximum file size in bytes', default: 1048576 })
  @IsOptional()
  @IsNumber()
  maxFileSize?: number;

  @ApiPropertyOptional({ description: 'Analysis timeout in milliseconds', default: 300000 })
  @IsOptional()
  @IsNumber()
  timeoutMs?: number;
}

export class AnalyzeFileDto {
  @ApiProperty({ description: 'File path' })
  @IsString()
  filePath: string;

  @ApiProperty({ description: 'File content' })
  @IsString()
  content: string;

  @ApiProperty({ description: 'File language', enum: SupportedLanguage })
  @IsEnum(SupportedLanguage)
  language: SupportedLanguage;
}

export class GetAnalysisResultDto {
  @ApiProperty({ description: 'Analysis ID' })
  @IsString()
  id: string;
}

export class GetProjectAnalysisDto {
  @ApiProperty({ description: 'Project ID' })
  @IsString()
  projectId: string;

  @ApiPropertyOptional({ description: 'Number of results to return', default: 10 })
  @IsOptional()
  @IsNumber()
  limit?: number;

  @ApiPropertyOptional({ description: 'Number of results to skip', default: 0 })
  @IsOptional()
  @IsNumber()
  offset?: number;
}
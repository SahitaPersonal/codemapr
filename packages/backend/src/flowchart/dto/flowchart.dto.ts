import { IsString, IsOptional, IsEnum, IsObject } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { FlowchartType, LayoutAlgorithm, LayoutDirection, LayoutAlignment } from '@codemapr/shared';

export class GenerateFlowchartDto {
  @ApiProperty({
    description: 'Type of flowchart to generate',
    enum: FlowchartType,
    example: FlowchartType.PROJECT_OVERVIEW,
  })
  @IsEnum(FlowchartType)
  type: FlowchartType;

  @ApiPropertyOptional({
    description: 'Specific file path for file-specific flowcharts',
    example: 'src/components/Button.tsx',
  })
  @IsOptional()
  @IsString()
  filePath?: string;

  @ApiProperty({
    description: 'Analysis data to generate flowchart from',
    type: 'object',
  })
  @IsObject()
  analysisData: any;

  @ApiPropertyOptional({
    description: 'Layout algorithm to use',
    enum: LayoutAlgorithm,
    example: LayoutAlgorithm.HIERARCHICAL,
  })
  @IsOptional()
  @IsEnum(LayoutAlgorithm)
  layoutAlgorithm?: LayoutAlgorithm;

  @ApiPropertyOptional({
    description: 'Layout direction',
    enum: LayoutDirection,
    example: LayoutDirection.TOP_BOTTOM,
  })
  @IsOptional()
  @IsEnum(LayoutDirection)
  layoutDirection?: LayoutDirection;

  @ApiPropertyOptional({
    description: 'Layout alignment',
    enum: LayoutAlignment,
    example: LayoutAlignment.CENTER,
  })
  @IsOptional()
  @IsEnum(LayoutAlignment)
  layoutAlignment?: LayoutAlignment;
}

export class FlowchartResponseDto {
  @ApiProperty({
    description: 'Generated flowchart data',
    type: 'object',
  })
  @IsObject()
  flowchart: any; // FlowchartData type from shared package

  @ApiProperty({
    description: 'Generation timestamp',
    example: '2024-01-15T10:30:00Z',
  })
  generatedAt: Date;

  @ApiProperty({
    description: 'Processing time in milliseconds',
    example: 1250,
  })
  processingTime: number;
}

export class FlowchartErrorDto {
  @ApiProperty({
    description: 'Error message',
    example: 'File not found in analysis results',
  })
  message: string;

  @ApiProperty({
    description: 'Error code',
    example: 'FILE_NOT_FOUND',
  })
  code: string;

  @ApiProperty({
    description: 'Error timestamp',
    example: '2024-01-15T10:30:00Z',
  })
  timestamp: Date;
}
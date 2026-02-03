import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  Query,
  UseInterceptors,
  UploadedFiles,
  BadRequestException,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiConsumes,
  ApiBody,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { AnalysisService } from './analysis.service';
import {
  AnalyzeProjectDto,
  AnalyzeFileDto,
  GetAnalysisResultDto,
  GetProjectAnalysisDto,
} from './dto/analysis.dto';
import { ProjectAnalysis, FileAnalysis, AnalysisStatus } from '@codemapr/shared';

@ApiTags('Analysis')
@Controller('analysis')
export class AnalysisController {
  constructor(private readonly analysisService: AnalysisService) {}

  @Post('project')
  @ApiOperation({ summary: 'Analyze a complete project' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        files: {
          type: 'array',
          items: {
            type: 'string',
            format: 'binary',
          },
        },
        name: { type: 'string' },
        language: { type: 'string', enum: ['javascript', 'typescript', 'jsx', 'tsx'] },
        excludePatterns: { type: 'array', items: { type: 'string' } },
        includeTestFiles: { type: 'boolean' },
        maxFileSize: { type: 'number' },
        timeoutMs: { type: 'number' },
      },
    },
  })
  @ApiResponse({
    status: 201,
    description: 'Analysis started successfully',
    schema: {
      type: 'object',
      properties: {
        analysisId: { type: 'string' },
        status: { type: 'string', enum: ['pending', 'in_progress', 'completed', 'failed'] },
      },
    },
  })
  @UseInterceptors(FilesInterceptor('files', 10000)) // Max 10k files
  async analyzeProject(
    @UploadedFiles() files: Express.Multer.File[],
    @Body() dto: AnalyzeProjectDto,
  ): Promise<{ analysisId: string; status: AnalysisStatus }> {
    if (!files || files.length === 0) {
      throw new BadRequestException('No files provided for analysis');
    }

    return this.analysisService.analyzeProject(files, dto);
  }

  @Post('file')
  @ApiOperation({ summary: 'Analyze a single file' })
  @ApiResponse({
    status: 201,
    description: 'File analyzed successfully',
    type: 'object', // FileAnalysis type would be complex to define here
  })
  async analyzeFile(@Body() dto: AnalyzeFileDto): Promise<FileAnalysis> {
    return this.analysisService.analyzeFile(dto);
  }

  @Get('result/:id')
  @ApiOperation({ summary: 'Get analysis result by ID' })
  @ApiParam({ name: 'id', description: 'Analysis ID' })
  @ApiResponse({
    status: 200,
    description: 'Analysis result retrieved successfully',
    type: 'object', // ProjectAnalysis type would be complex to define here
  })
  @ApiResponse({
    status: 404,
    description: 'Analysis result not found',
  })
  async getAnalysisResult(@Param('id') id: string): Promise<ProjectAnalysis | null> {
    return this.analysisService.getAnalysisResult(id);
  }

  @Get('status/:id')
  @ApiOperation({ summary: 'Get analysis status by ID' })
  @ApiParam({ name: 'id', description: 'Analysis ID' })
  @ApiResponse({
    status: 200,
    description: 'Analysis status retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        status: { type: 'string', enum: ['pending', 'in_progress', 'completed', 'failed'] },
      },
    },
  })
  async getAnalysisStatus(@Param('id') id: string): Promise<{ status: AnalysisStatus }> {
    return this.analysisService.getAnalysisStatus(id);
  }

  @Get('project/:projectId')
  @ApiOperation({ summary: 'Get analysis results for a project' })
  @ApiParam({ name: 'projectId', description: 'Project ID' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Number of results to return' })
  @ApiQuery({ name: 'offset', required: false, type: Number, description: 'Number of results to skip' })
  @ApiResponse({
    status: 200,
    description: 'Project analysis results retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        results: { type: 'array', items: { type: 'object' } },
        total: { type: 'number' },
      },
    },
  })
  async getProjectAnalysisResults(
    @Param('projectId') projectId: string,
    @Query('limit') limit?: number,
    @Query('offset') offset?: number,
  ): Promise<{ results: any[]; total: number }> {
    return this.analysisService.getProjectAnalysisResults(projectId, limit, offset);
  }

  @Get('flows/:id')
  @ApiOperation({ summary: 'Get end-to-end flows for an analysis' })
  @ApiParam({ name: 'id', description: 'Analysis ID' })
  @ApiResponse({
    status: 200,
    description: 'End-to-end flows retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        flows: { type: 'array', items: { type: 'object' } },
        total: { type: 'number' },
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: 'Analysis not found',
  })
  async getEndToEndFlows(@Param('id') id: string): Promise<{ flows: any[]; total: number }> {
    const analysis = await this.analysisService.getAnalysisResult(id);
    if (!analysis) {
      return { flows: [], total: 0 };
    }

    const flows = analysis.endToEndFlows || [];
    return {
      flows,
      total: flows.length,
    };
  }

  @Get('health')
  @ApiOperation({ summary: 'Check analysis service health' })
  @ApiResponse({
    status: 200,
    description: 'Analysis service is healthy',
    schema: {
      type: 'object',
      properties: {
        status: { type: 'string' },
        timestamp: { type: 'string' },
        analyzers: {
          type: 'object',
          properties: {
            typescript: { type: 'boolean' },
            javascript: { type: 'boolean' },
            react: { type: 'boolean' },
          },
        },
      },
    },
  })
  async checkHealth(): Promise<{
    status: string;
    timestamp: string;
    analyzers: { typescript: boolean; javascript: boolean; react: boolean };
  }> {
    return {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      analyzers: {
        typescript: true,
        javascript: true,
        react: true,
      },
    };
  }
}
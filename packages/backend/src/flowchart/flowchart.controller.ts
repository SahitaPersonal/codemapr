import {
  Controller,
  Post,
  Body,
  Get,
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
} from '@nestjs/swagger';
import { FlowchartService } from './flowchart.service';
import {
  GenerateFlowchartDto,
  FlowchartResponseDto,
  FlowchartErrorDto,
} from './dto/flowchart.dto';
import {
  ProjectAnalysis,
  FileAnalysis,
  FlowchartType,
  LayoutAlgorithm,
  LayoutDirection,
  LayoutAlignment,
} from '@codemapr/shared';

@ApiTags('flowchart')
@Controller('flowchart')
export class FlowchartController {
  private readonly logger = new Logger(FlowchartController.name);

  constructor(private readonly flowchartService: FlowchartService) {}

  @Post('generate')
  @ApiOperation({
    summary: 'Generate flowchart from analysis data',
    description: 'Creates a flowchart visualization from provided code analysis data',
  })
  @ApiResponse({
    status: 201,
    description: 'Flowchart generated successfully',
    type: FlowchartResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid request data',
    type: FlowchartErrorDto,
  })
  @ApiResponse({
    status: 500,
    description: 'Internal server error',
    type: FlowchartErrorDto,
  })
  async generateFlowchart(
    @Body() generateDto: GenerateFlowchartDto,
    @Body('analysisData') analysisData: ProjectAnalysis | FileAnalysis,
  ): Promise<FlowchartResponseDto> {
    const startTime = Date.now();

    try {
      this.logger.debug(`Generating ${generateDto.type} flowchart`);

      let flowchart;

      switch (generateDto.type) {
        case FlowchartType.PROJECT_OVERVIEW:
          if (!this.isProjectAnalysis(analysisData)) {
            throw new HttpException(
              'Project analysis data required for project overview flowchart',
              HttpStatus.BAD_REQUEST,
            );
          }
          flowchart = await this.flowchartService.generateProjectFlowchart(analysisData);
          break;

        case FlowchartType.FILE_SPECIFIC:
          if (!generateDto.filePath) {
            throw new HttpException(
              'File path required for file-specific flowchart',
              HttpStatus.BAD_REQUEST,
            );
          }
          
          let fileAnalysis: FileAnalysis;
          if (this.isProjectAnalysis(analysisData)) {
            const targetFile = analysisData.files.find(f => f.filePath === generateDto.filePath);
            if (!targetFile) {
              throw new HttpException(
                `File ${generateDto.filePath} not found in analysis data`,
                HttpStatus.NOT_FOUND,
              );
            }
            fileAnalysis = targetFile;
          } else {
            fileAnalysis = analysisData;
          }
          
          flowchart = await this.flowchartService.generateFileFlowchart(fileAnalysis);
          break;

        case FlowchartType.DEPENDENCY_GRAPH:
          if (!this.isProjectAnalysis(analysisData)) {
            throw new HttpException(
              'Project analysis data required for dependency graph flowchart',
              HttpStatus.BAD_REQUEST,
            );
          }
          flowchart = await this.flowchartService.generateDependencyGraph(analysisData);
          break;

        default:
          throw new HttpException(
            `Unsupported flowchart type: ${generateDto.type}`,
            HttpStatus.BAD_REQUEST,
          );
      }

      const processingTime = Date.now() - startTime;

      this.logger.debug(`Flowchart generated in ${processingTime}ms`);

      return {
        flowchart,
        generatedAt: new Date(),
        processingTime,
      };
    } catch (error) {
      this.logger.error(`Error generating flowchart: ${error.message}`, error.stack);
      
      if (error instanceof HttpException) {
        throw error;
      }

      throw new HttpException(
        'Failed to generate flowchart',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('types')
  @ApiOperation({
    summary: 'Get available flowchart types',
    description: 'Returns a list of all supported flowchart types',
  })
  @ApiResponse({
    status: 200,
    description: 'List of flowchart types',
    schema: {
      type: 'object',
      properties: {
        types: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              type: { type: 'string' },
              name: { type: 'string' },
              description: { type: 'string' },
              requiresFilePath: { type: 'boolean' },
            },
          },
        },
      },
    },
  })
  getFlowchartTypes() {
    return {
      types: [
        {
          type: FlowchartType.PROJECT_OVERVIEW,
          name: 'Project Overview',
          description: 'High-level view of the entire project structure',
          requiresFilePath: false,
        },
        {
          type: FlowchartType.FILE_SPECIFIC,
          name: 'File Structure',
          description: 'Detailed view of a specific file\'s internal structure',
          requiresFilePath: true,
        },
        {
          type: FlowchartType.DEPENDENCY_GRAPH,
          name: 'Dependency Graph',
          description: 'Visual representation of file and module dependencies',
          requiresFilePath: false,
        },
        {
          type: FlowchartType.FUNCTION_FLOW,
          name: 'Function Flow',
          description: 'Control flow within functions and methods',
          requiresFilePath: true,
        },
        {
          type: FlowchartType.SERVICE_FLOW,
          name: 'Service Flow',
          description: 'Service calls and external integrations',
          requiresFilePath: false,
        },
      ],
    };
  }

  @Get('layouts')
  @ApiOperation({
    summary: 'Get available layout algorithms',
    description: 'Returns a list of all supported layout algorithms and their configurations',
  })
  @ApiResponse({
    status: 200,
    description: 'List of layout algorithms',
    schema: {
      type: 'object',
      properties: {
        algorithms: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              algorithm: { type: 'string' },
              name: { type: 'string' },
              description: { type: 'string' },
              directions: { type: 'array', items: { type: 'string' } },
              alignments: { type: 'array', items: { type: 'string' } },
            },
          },
        },
      },
    },
  })
  getLayoutAlgorithms() {
    return {
      algorithms: [
        {
          algorithm: LayoutAlgorithm.HIERARCHICAL,
          name: 'Hierarchical',
          description: 'Organizes nodes in hierarchical levels',
          directions: Object.values(LayoutDirection),
          alignments: Object.values(LayoutAlignment),
        },
        {
          algorithm: LayoutAlgorithm.FORCE_DIRECTED,
          name: 'Force Directed',
          description: 'Uses physics simulation for natural node positioning',
          directions: [LayoutDirection.TOP_BOTTOM],
          alignments: [LayoutAlignment.CENTER],
        },
        {
          algorithm: LayoutAlgorithm.CIRCULAR,
          name: 'Circular',
          description: 'Arranges nodes in circular patterns',
          directions: [LayoutDirection.TOP_BOTTOM],
          alignments: Object.values(LayoutAlignment),
        },
        {
          algorithm: LayoutAlgorithm.TREE,
          name: 'Tree',
          description: 'Tree-like structure for hierarchical data',
          directions: Object.values(LayoutDirection),
          alignments: Object.values(LayoutAlignment),
        },
      ],
    };
  }

  private isProjectAnalysis(data: ProjectAnalysis | FileAnalysis): data is ProjectAnalysis {
    return 'files' in data && Array.isArray((data as ProjectAnalysis).files);
  }
}
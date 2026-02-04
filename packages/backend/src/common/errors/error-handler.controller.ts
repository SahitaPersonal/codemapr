import { Controller, Get, Post, Query, Body, Param, Logger, HttpException, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery, ApiParam, ApiBody } from '@nestjs/swagger';
import { IsString, IsOptional, IsArray, IsEnum, IsNumber, IsDateString } from 'class-validator';
import { ErrorHandlerService, ErrorReport } from './error-handler.service';

export class ErrorReportFilterDto {
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  severity?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  type?: string[];

  @IsOptional()
  @IsString()
  userId?: string;

  @IsOptional()
  @IsString()
  operation?: string;

  @IsOptional()
  @IsDateString()
  since?: string;

  @IsOptional()
  @IsNumber()
  limit?: number;
}

export class ClearErrorsDto {
  @IsDateString()
  olderThan: string;
}

export class TestErrorDto {
  @IsEnum(['low', 'medium', 'high', 'critical'])
  severity: 'low' | 'medium' | 'high' | 'critical';

  @IsString()
  message: string;

  @IsOptional()
  @IsString()
  operation?: string;

  @IsOptional()
  @IsString()
  userId?: string;
}

@ApiTags('Error Handling')
@Controller('api/errors')
export class ErrorHandlerController {
  private readonly logger = new Logger(ErrorHandlerController.name);

  constructor(private readonly errorHandlerService: ErrorHandlerService) {}

  @Get('reports')
  @ApiOperation({ 
    summary: 'Get error reports',
    description: 'Retrieves error reports with optional filtering by severity, type, user, operation, and date.'
  })
  @ApiQuery({ 
    name: 'severity', 
    description: 'Filter by error severity (comma-separated)',
    required: false,
    type: 'string'
  })
  @ApiQuery({ 
    name: 'type', 
    description: 'Filter by error type (comma-separated)',
    required: false,
    type: 'string'
  })
  @ApiQuery({ 
    name: 'userId', 
    description: 'Filter by user ID',
    required: false,
    type: 'string'
  })
  @ApiQuery({ 
    name: 'operation', 
    description: 'Filter by operation name',
    required: false,
    type: 'string'
  })
  @ApiQuery({ 
    name: 'since', 
    description: 'Filter errors since date (ISO string)',
    required: false,
    type: 'string'
  })
  @ApiQuery({ 
    name: 'limit', 
    description: 'Maximum number of reports to return',
    required: false,
    type: 'number'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Error reports retrieved successfully',
    schema: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          type: { type: 'string' },
          message: { type: 'string' },
          severity: { type: 'string' },
          recoverable: { type: 'boolean' },
          context: { type: 'object' },
          retryCount: { type: 'number' }
        }
      }
    }
  })
  async getErrorReports(
    @Query('severity') severity?: string,
    @Query('type') type?: string,
    @Query('userId') userId?: string,
    @Query('operation') operation?: string,
    @Query('since') since?: string,
    @Query('limit') limit?: number
  ) {
    this.logger.log('Get error reports requested');

    try {
      const filter = {
        severity: severity ? severity.split(',') : undefined,
        type: type ? type.split(',') : undefined,
        userId,
        operation,
        since: since ? new Date(since) : undefined,
        limit,
      };

      const reports = this.errorHandlerService.getErrorReports(filter);
      
      this.logger.log(`Retrieved ${reports.length} error reports`);
      return reports;

    } catch (error) {
      this.logger.error('Failed to get error reports:', error);
      throw new HttpException(
        `Failed to get error reports: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Get('reports/:errorId')
  @ApiOperation({ 
    summary: 'Get error report details',
    description: 'Retrieves detailed information about a specific error report.'
  })
  @ApiParam({ 
    name: 'errorId', 
    description: 'Error report ID',
    type: 'string'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Error report details retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        id: { type: 'string' },
        type: { type: 'string' },
        message: { type: 'string' },
        stack: { type: 'string' },
        severity: { type: 'string' },
        recoverable: { type: 'boolean' },
        context: { type: 'object' },
        retryCount: { type: 'number' },
        resolution: { type: 'string' }
      }
    }
  })
  @ApiResponse({ 
    status: 404, 
    description: 'Error report not found' 
  })
  async getErrorReport(@Param('errorId') errorId: string) {
    this.logger.log(`Get error report requested: ${errorId}`);

    try {
      const report = this.errorHandlerService.getErrorReport(errorId);
      
      if (!report) {
        throw new HttpException('Error report not found', HttpStatus.NOT_FOUND);
      }

      return report;

    } catch (error) {
      this.logger.error(`Failed to get error report ${errorId}:`, error);
      
      if (error instanceof HttpException) {
        throw error;
      }
      
      throw new HttpException(
        `Failed to get error report: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Get('statistics')
  @ApiOperation({ 
    summary: 'Get error statistics',
    description: 'Retrieves comprehensive error statistics including counts by severity and type.'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Error statistics retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        total: { type: 'number' },
        bySeverity: { type: 'object' },
        byType: { type: 'object' },
        recentErrors: { type: 'number' },
        recoveryRate: { type: 'number' }
      }
    }
  })
  async getErrorStatistics() {
    this.logger.log('Error statistics requested');

    try {
      const statistics = this.errorHandlerService.getErrorStatistics();
      
      this.logger.log(`Error statistics: ${statistics.total} total errors`);
      return statistics;

    } catch (error) {
      this.logger.error('Failed to get error statistics:', error);
      throw new HttpException(
        `Failed to get error statistics: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Post('clear')
  @ApiOperation({ 
    summary: 'Clear old error reports',
    description: 'Removes error reports older than the specified date to free up memory.'
  })
  @ApiBody({ 
    type: ClearErrorsDto,
    description: 'Date threshold for clearing old errors'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Old errors cleared successfully',
    schema: {
      type: 'object',
      properties: {
        clearedCount: { type: 'number' },
        message: { type: 'string' }
      }
    }
  })
  async clearOldErrors(@Body() clearDto: ClearErrorsDto) {
    this.logger.log('Clear old errors requested');

    try {
      const olderThan = new Date(clearDto.olderThan);
      const clearedCount = this.errorHandlerService.clearOldErrors(olderThan);
      
      this.logger.log(`Cleared ${clearedCount} old error reports`);
      
      return {
        clearedCount,
        message: `Successfully cleared ${clearedCount} old error reports`,
      };

    } catch (error) {
      this.logger.error('Failed to clear old errors:', error);
      throw new HttpException(
        `Failed to clear old errors: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Post('test')
  @ApiOperation({ 
    summary: 'Test error handling',
    description: 'Creates a test error for testing error handling and recovery mechanisms.'
  })
  @ApiBody({ 
    type: TestErrorDto,
    description: 'Test error configuration'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Test error created successfully',
    schema: {
      type: 'object',
      properties: {
        errorId: { type: 'string' },
        message: { type: 'string' },
        severity: { type: 'string' }
      }
    }
  })
  async testError(@Body() testDto: TestErrorDto) {
    this.logger.log(`Test error requested: ${testDto.severity} - ${testDto.message}`);

    try {
      // Create a test error based on severity
      let testError: Error;
      
      switch (testDto.severity) {
        case 'critical':
          testError = new Error(`CRITICAL TEST ERROR: ${testDto.message}`);
          testError.name = 'FatalError';
          break;
        case 'high':
          testError = new HttpException(testDto.message, HttpStatus.INTERNAL_SERVER_ERROR);
          break;
        case 'medium':
          testError = new HttpException(testDto.message, HttpStatus.BAD_REQUEST);
          break;
        case 'low':
        default:
          testError = new Error(`Test error: ${testDto.message}`);
          break;
      }

      const errorReport = await this.errorHandlerService.handleError(testError, {
        operation: testDto.operation || 'test-error',
        userId: testDto.userId,
        metadata: { testError: true },
      });

      return {
        errorId: errorReport.id,
        message: `Test error created with severity: ${testDto.severity}`,
        severity: errorReport.severity,
      };

    } catch (error) {
      this.logger.error('Failed to create test error:', error);
      throw new HttpException(
        `Failed to create test error: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Get('health')
  @ApiOperation({ 
    summary: 'Error handler service health check',
    description: 'Checks if the error handling service is operational.'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Error handler service is healthy',
    schema: {
      type: 'object',
      properties: {
        status: { type: 'string' },
        timestamp: { type: 'string' },
        service: { type: 'string' },
        statistics: { type: 'object' }
      }
    }
  })
  async healthCheck() {
    try {
      const statistics = this.errorHandlerService.getErrorStatistics();
      
      return {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        service: 'ErrorHandlerService',
        statistics,
      };
    } catch (error) {
      throw new HttpException(
        'Error handler service is unhealthy',
        HttpStatus.SERVICE_UNAVAILABLE
      );
    }
  }
}
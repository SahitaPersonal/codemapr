import { Controller, Get, Post, Delete, Body, Param, Query, Logger, HttpException, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiQuery, ApiBody } from '@nestjs/swagger';
import { IsString, IsOptional, IsObject, IsArray, IsEnum, IsNumber, IsBoolean, IsDateString } from 'class-validator';
import { JobQueueService, AddJobRequest } from './job-queue.service';
import { JobType, JobPriority, JobStatus, JobData, JobOptions, JobFilter } from './types/job.types';

export class AddJobDto {
  @IsEnum(JobType)
  type: JobType;

  @IsObject()
  data: JobData;

  @IsOptional()
  @IsObject()
  options?: JobOptions;
}

export class JobFilterDto {
  @IsOptional()
  @IsArray()
  @IsEnum(JobStatus, { each: true })
  status?: JobStatus[];

  @IsOptional()
  @IsArray()
  @IsEnum(JobType, { each: true })
  type?: JobType[];

  @IsOptional()
  @IsString()
  userId?: string;

  @IsOptional()
  @IsString()
  projectId?: string;

  @IsOptional()
  @IsDateString()
  createdAfter?: string;

  @IsOptional()
  @IsDateString()
  createdBefore?: string;

  @IsOptional()
  @IsNumber()
  limit?: number;

  @IsOptional()
  @IsNumber()
  offset?: number;
}

export class CleanQueueDto {
  @IsOptional()
  @IsNumber()
  olderThan?: number;

  @IsOptional()
  @IsArray()
  @IsEnum(JobStatus, { each: true })
  status?: JobStatus[];

  @IsOptional()
  @IsNumber()
  limit?: number;
}

@ApiTags('Job Queue')
@Controller('api/queue')
export class JobQueueController {
  private readonly logger = new Logger(JobQueueController.name);

  constructor(private readonly jobQueueService: JobQueueService) {}

  @Post('jobs')
  @ApiOperation({ 
    summary: 'Add job to queue',
    description: 'Adds a new job to the analysis queue with specified type, data, and options.'
  })
  @ApiBody({ 
    type: AddJobDto,
    description: 'Job details including type, data, and processing options'
  })
  @ApiResponse({ 
    status: 201, 
    description: 'Job added successfully',
    schema: {
      type: 'object',
      properties: {
        jobId: { type: 'string' },
        message: { type: 'string' }
      }
    }
  })
  @ApiResponse({ 
    status: 400, 
    description: 'Invalid job data' 
  })
  async addJob(@Body() addJobDto: AddJobDto) {
    this.logger.log(`Add job requested: ${addJobDto.type}`);

    try {
      const request: AddJobRequest = {
        type: addJobDto.type,
        data: addJobDto.data,
        options: addJobDto.options,
      };

      const jobId = await this.jobQueueService.addJob(request);
      
      this.logger.log(`Job ${jobId} added to queue with type ${addJobDto.type}`);
      
      return {
        jobId,
        message: 'Job added successfully',
      };

    } catch (error) {
      this.logger.error(`Failed to add job:`, error);
      throw new HttpException(
        `Failed to add job: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Get('jobs/:jobId')
  @ApiOperation({ 
    summary: 'Get job details',
    description: 'Retrieves detailed information about a specific job including status, progress, and results.'
  })
  @ApiParam({ 
    name: 'jobId', 
    description: 'Job ID to retrieve details for',
    type: 'string'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Job details retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        id: { type: 'string' },
        type: { type: 'string' },
        status: { type: 'string' },
        priority: { type: 'number' },
        data: { type: 'object' },
        progress: { type: 'object' },
        result: { type: 'object' },
        createdAt: { type: 'string' },
        startedAt: { type: 'string' },
        completedAt: { type: 'string' },
        attempts: { type: 'number' },
        maxAttempts: { type: 'number' }
      }
    }
  })
  @ApiResponse({ 
    status: 404, 
    description: 'Job not found' 
  })
  async getJob(@Param('jobId') jobId: string) {
    this.logger.log(`Get job requested: ${jobId}`);

    try {
      const job = await this.jobQueueService.getJob(jobId);
      
      if (!job) {
        throw new HttpException('Job not found', HttpStatus.NOT_FOUND);
      }

      return job;

    } catch (error) {
      this.logger.error(`Failed to get job ${jobId}:`, error);
      
      if (error instanceof HttpException) {
        throw error;
      }
      
      throw new HttpException(
        `Failed to get job: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Get('jobs')
  @ApiOperation({ 
    summary: 'Get jobs with filters',
    description: 'Retrieves a list of jobs with optional filtering by status, type, user, project, and date range.'
  })
  @ApiQuery({ 
    name: 'status', 
    description: 'Filter by job status (comma-separated)',
    required: false,
    type: 'string'
  })
  @ApiQuery({ 
    name: 'type', 
    description: 'Filter by job type (comma-separated)',
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
    name: 'projectId', 
    description: 'Filter by project ID',
    required: false,
    type: 'string'
  })
  @ApiQuery({ 
    name: 'limit', 
    description: 'Maximum number of jobs to return',
    required: false,
    type: 'number'
  })
  @ApiQuery({ 
    name: 'offset', 
    description: 'Number of jobs to skip',
    required: false,
    type: 'number'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Jobs retrieved successfully',
    schema: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          type: { type: 'string' },
          status: { type: 'string' },
          priority: { type: 'number' },
          progress: { type: 'object' },
          createdAt: { type: 'string' },
          attempts: { type: 'number' }
        }
      }
    }
  })
  async getJobs(
    @Query('status') status?: string,
    @Query('type') type?: string,
    @Query('userId') userId?: string,
    @Query('projectId') projectId?: string,
    @Query('createdAfter') createdAfter?: string,
    @Query('createdBefore') createdBefore?: string,
    @Query('limit') limit?: number,
    @Query('offset') offset?: number
  ) {
    this.logger.log('Get jobs requested with filters');

    try {
      const filter: JobFilter = {
        status: status ? status.split(',') as JobStatus[] : undefined,
        type: type ? type.split(',') as JobType[] : undefined,
        userId,
        projectId,
        createdAfter: createdAfter ? new Date(createdAfter) : undefined,
        createdBefore: createdBefore ? new Date(createdBefore) : undefined,
        limit,
        offset,
      };

      const jobs = await this.jobQueueService.getJobs(filter);
      
      this.logger.log(`Retrieved ${jobs.length} jobs`);
      return jobs;

    } catch (error) {
      this.logger.error('Failed to get jobs:', error);
      throw new HttpException(
        `Failed to get jobs: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Delete('jobs/:jobId')
  @ApiOperation({ 
    summary: 'Cancel job',
    description: 'Cancels a pending or active job and removes it from the queue.'
  })
  @ApiParam({ 
    name: 'jobId', 
    description: 'Job ID to cancel',
    type: 'string'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Job cancelled successfully',
    schema: {
      type: 'object',
      properties: {
        cancelled: { type: 'boolean' },
        jobId: { type: 'string' },
        message: { type: 'string' }
      }
    }
  })
  @ApiResponse({ 
    status: 404, 
    description: 'Job not found' 
  })
  async cancelJob(@Param('jobId') jobId: string) {
    this.logger.log(`Cancel job requested: ${jobId}`);

    try {
      const cancelled = await this.jobQueueService.cancelJob(jobId);
      
      if (!cancelled) {
        throw new HttpException('Job not found', HttpStatus.NOT_FOUND);
      }

      return {
        cancelled: true,
        jobId,
        message: 'Job cancelled successfully',
      };

    } catch (error) {
      this.logger.error(`Failed to cancel job ${jobId}:`, error);
      
      if (error instanceof HttpException) {
        throw error;
      }
      
      throw new HttpException(
        `Failed to cancel job: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Post('jobs/:jobId/retry')
  @ApiOperation({ 
    summary: 'Retry failed job',
    description: 'Retries a failed job by adding it back to the queue.'
  })
  @ApiParam({ 
    name: 'jobId', 
    description: 'Job ID to retry',
    type: 'string'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Job retried successfully',
    schema: {
      type: 'object',
      properties: {
        retried: { type: 'boolean' },
        jobId: { type: 'string' },
        message: { type: 'string' }
      }
    }
  })
  @ApiResponse({ 
    status: 404, 
    description: 'Job not found' 
  })
  async retryJob(@Param('jobId') jobId: string) {
    this.logger.log(`Retry job requested: ${jobId}`);

    try {
      const retried = await this.jobQueueService.retryJob(jobId);
      
      if (!retried) {
        throw new HttpException('Job not found', HttpStatus.NOT_FOUND);
      }

      return {
        retried: true,
        jobId,
        message: 'Job retried successfully',
      };

    } catch (error) {
      this.logger.error(`Failed to retry job ${jobId}:`, error);
      
      if (error instanceof HttpException) {
        throw error;
      }
      
      throw new HttpException(
        `Failed to retry job: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Post('pause')
  @ApiOperation({ 
    summary: 'Pause queue',
    description: 'Pauses the job queue, preventing new jobs from being processed.'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Queue paused successfully',
    schema: {
      type: 'object',
      properties: {
        paused: { type: 'boolean' },
        message: { type: 'string' }
      }
    }
  })
  async pauseQueue() {
    this.logger.log('Pause queue requested');

    try {
      await this.jobQueueService.pauseQueue();
      
      return {
        paused: true,
        message: 'Queue paused successfully',
      };

    } catch (error) {
      this.logger.error('Failed to pause queue:', error);
      throw new HttpException(
        `Failed to pause queue: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Post('resume')
  @ApiOperation({ 
    summary: 'Resume queue',
    description: 'Resumes the job queue, allowing jobs to be processed again.'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Queue resumed successfully',
    schema: {
      type: 'object',
      properties: {
        resumed: { type: 'boolean' },
        message: { type: 'string' }
      }
    }
  })
  async resumeQueue() {
    this.logger.log('Resume queue requested');

    try {
      await this.jobQueueService.resumeQueue();
      
      return {
        resumed: true,
        message: 'Queue resumed successfully',
      };

    } catch (error) {
      this.logger.error('Failed to resume queue:', error);
      throw new HttpException(
        `Failed to resume queue: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Get('stats')
  @ApiOperation({ 
    summary: 'Get queue statistics',
    description: 'Retrieves comprehensive statistics about the job queue including job counts by status.'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Queue statistics retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        waiting: { type: 'number' },
        active: { type: 'number' },
        completed: { type: 'number' },
        failed: { type: 'number' },
        delayed: { type: 'number' },
        paused: { type: 'number' },
        total: { type: 'number' }
      }
    }
  })
  async getQueueStats() {
    this.logger.log('Queue statistics requested');

    try {
      const stats = await this.jobQueueService.getQueueStats();
      
      this.logger.log(`Queue stats: ${stats.total} total jobs`);
      return stats;

    } catch (error) {
      this.logger.error('Failed to get queue statistics:', error);
      throw new HttpException(
        `Failed to get queue statistics: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Post('clean')
  @ApiOperation({ 
    summary: 'Clean queue',
    description: 'Removes old completed and failed jobs from the queue to free up memory and storage.'
  })
  @ApiBody({ 
    type: CleanQueueDto,
    description: 'Cleanup options including age threshold and job status filters'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Queue cleaned successfully',
    schema: {
      type: 'object',
      properties: {
        cleanedCount: { type: 'number' },
        message: { type: 'string' }
      }
    }
  })
  async cleanQueue(@Body() cleanDto: CleanQueueDto) {
    this.logger.log('Clean queue requested');

    try {
      const cleanedCount = await this.jobQueueService.cleanQueue({
        olderThan: cleanDto.olderThan,
        status: cleanDto.status,
        limit: cleanDto.limit,
      });
      
      this.logger.log(`Cleaned ${cleanedCount} jobs from queue`);
      
      return {
        cleanedCount,
        message: `Successfully cleaned ${cleanedCount} jobs from queue`,
      };

    } catch (error) {
      this.logger.error('Failed to clean queue:', error);
      throw new HttpException(
        `Failed to clean queue: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Get('health')
  @ApiOperation({ 
    summary: 'Job queue service health check',
    description: 'Checks if the job queue service is operational and connected to Redis.'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Job queue service is healthy',
    schema: {
      type: 'object',
      properties: {
        status: { type: 'string' },
        timestamp: { type: 'string' },
        service: { type: 'string' },
        queueStats: { type: 'object' }
      }
    }
  })
  async healthCheck() {
    try {
      const stats = await this.jobQueueService.getQueueStats();
      
      return {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        service: 'JobQueueService',
        queueStats: stats,
      };
    } catch (error) {
      throw new HttpException(
        'Job queue service is unhealthy',
        HttpStatus.SERVICE_UNAVAILABLE
      );
    }
  }
}
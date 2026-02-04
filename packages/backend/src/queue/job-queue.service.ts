import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import { Queue, Job, JobOptions as BullJobOptions } from 'bull';
import { 
  JobType, 
  JobPriority, 
  JobStatus, 
  JobData, 
  JobProgress, 
  JobResult, 
  JobOptions, 
  JobInfo, 
  QueueStats 
} from './types/job.types';

export interface QueueJobResult {
  jobId: string;
  status: JobStatus;
  progress: JobProgress;
  result?: JobResult;
}

export interface AddJobRequest {
  type: JobType;
  data: JobData;
  options?: JobOptions;
}

export interface JobFilter {
  status?: JobStatus[];
  type?: JobType[];
  userId?: string;
  projectId?: string;
  createdAfter?: Date;
  createdBefore?: Date;
  limit?: number;
  offset?: number;
}

@Injectable()
export class JobQueueService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(JobQueueService.name);
  private readonly jobListeners = new Map<string, (job: Job) => void>();

  constructor(
    @InjectQueue('analysis') private readonly analysisQueue: Queue,
  ) {}

  async onModuleInit() {
    this.logger.log('Initializing Job Queue Service...');
    
    // Set up global queue event listeners
    this.setupQueueEventListeners();
    
    // Clean up old completed/failed jobs on startup
    await this.cleanupOldJobs();
    
    this.logger.log('Job Queue Service initialized');
  }

  async onModuleDestroy() {
    this.logger.log('Shutting down Job Queue Service...');
    
    // Gracefully close the queue
    await this.analysisQueue.close();
    
    this.logger.log('Job Queue Service shut down');
  }

  async addJob(request: AddJobRequest): Promise<string> {
    this.logger.debug(`Adding job of type ${request.type}`);

    try {
      const bullOptions: BullJobOptions = {
        priority: request.options?.priority || JobPriority.NORMAL,
        delay: request.options?.delay || 0,
        attempts: request.options?.attempts || 3,
        backoff: request.options?.backoff || { type: 'exponential', delay: 2000 },
        removeOnComplete: request.options?.removeOnComplete || 100,
        removeOnFail: request.options?.removeOnFail || 50,
        timeout: request.options?.timeout || 300000, // 5 minutes default
      };

      if (request.options?.repeat) {
        if (request.options.repeat.cron) {
          bullOptions.repeat = { cron: request.options.repeat.cron };
        } else if (request.options.repeat.every) {
          bullOptions.repeat = { every: request.options.repeat.every };
        }
      }

      const job = await this.analysisQueue.add(
        request.type,
        {
          ...request.data,
          jobType: request.type,
          createdAt: new Date(),
        },
        bullOptions
      );

      this.logger.debug(`Job ${job.id} added to queue with type ${request.type}`);
      return job.id.toString();

    } catch (error) {
      this.logger.error(`Failed to add job of type ${request.type}:`, error);
      throw new Error(`Failed to add job: ${error.message}`);
    }
  }

  async getJob(jobId: string): Promise<JobInfo | null> {
    this.logger.debug(`Getting job ${jobId}`);

    try {
      const job = await this.analysisQueue.getJob(jobId);
      
      if (!job) {
        return null;
      }

      return this.mapJobToJobInfo(job);

    } catch (error) {
      this.logger.error(`Failed to get job ${jobId}:`, error);
      throw new Error(`Failed to get job: ${error.message}`);
    }
  }

  async getJobs(filter: JobFilter = {}): Promise<JobInfo[]> {
    this.logger.debug('Getting jobs with filter:', filter);

    try {
      let jobs: Job[] = [];

      if (filter.status && filter.status.length > 0) {
        // Get jobs by specific statuses
        for (const status of filter.status) {
          const statusJobs = await this.getJobsByStatus(status);
          jobs.push(...statusJobs);
        }
      } else {
        // Get all jobs
        const [waiting, active, completed, failed, delayed] = await Promise.all([
          this.analysisQueue.getWaiting(),
          this.analysisQueue.getActive(),
          this.analysisQueue.getCompleted(),
          this.analysisQueue.getFailed(),
          this.analysisQueue.getDelayed(),
        ]);

        jobs = [...waiting, ...active, ...completed, ...failed, ...delayed];
      }

      // Apply filters
      let filteredJobs = jobs;

      if (filter.type && filter.type.length > 0) {
        filteredJobs = filteredJobs.filter(job => 
          filter.type!.includes(job.data.jobType)
        );
      }

      if (filter.userId) {
        filteredJobs = filteredJobs.filter(job => 
          job.data.userId === filter.userId
        );
      }

      if (filter.projectId) {
        filteredJobs = filteredJobs.filter(job => 
          job.data.projectId === filter.projectId
        );
      }

      if (filter.createdAfter) {
        filteredJobs = filteredJobs.filter(job => 
          new Date(job.data.createdAt) >= filter.createdAfter!
        );
      }

      if (filter.createdBefore) {
        filteredJobs = filteredJobs.filter(job => 
          new Date(job.data.createdAt) <= filter.createdBefore!
        );
      }

      // Sort by creation date (newest first)
      filteredJobs.sort((a, b) => 
        new Date(b.data.createdAt).getTime() - new Date(a.data.createdAt).getTime()
      );

      // Apply pagination
      const offset = filter.offset || 0;
      const limit = filter.limit || 100;
      const paginatedJobs = filteredJobs.slice(offset, offset + limit);

      return paginatedJobs.map(job => this.mapJobToJobInfo(job));

    } catch (error) {
      this.logger.error('Failed to get jobs:', error);
      throw new Error(`Failed to get jobs: ${error.message}`);
    }
  }

  async cancelJob(jobId: string): Promise<boolean> {
    this.logger.debug(`Cancelling job ${jobId}`);

    try {
      const job = await this.analysisQueue.getJob(jobId);
      
      if (!job) {
        this.logger.warn(`Job ${jobId} not found`);
        return false;
      }

      await job.remove();
      this.logger.debug(`Job ${jobId} cancelled`);
      return true;

    } catch (error) {
      this.logger.error(`Failed to cancel job ${jobId}:`, error);
      throw new Error(`Failed to cancel job: ${error.message}`);
    }
  }

  async retryJob(jobId: string): Promise<boolean> {
    this.logger.debug(`Retrying job ${jobId}`);

    try {
      const job = await this.analysisQueue.getJob(jobId);
      
      if (!job) {
        this.logger.warn(`Job ${jobId} not found`);
        return false;
      }

      await job.retry();
      this.logger.debug(`Job ${jobId} retried`);
      return true;

    } catch (error) {
      this.logger.error(`Failed to retry job ${jobId}:`, error);
      throw new Error(`Failed to retry job: ${error.message}`);
    }
  }

  async pauseQueue(): Promise<void> {
    this.logger.log('Pausing queue');
    await this.analysisQueue.pause();
  }

  async resumeQueue(): Promise<void> {
    this.logger.log('Resuming queue');
    await this.analysisQueue.resume();
  }

  async getQueueStats(): Promise<QueueStats> {
    this.logger.debug('Getting queue statistics');

    try {
      const [waiting, active, completed, failed, delayed] = await Promise.all([
        this.analysisQueue.getWaiting(),
        this.analysisQueue.getActive(),
        this.analysisQueue.getCompleted(),
        this.analysisQueue.getFailed(),
        this.analysisQueue.getDelayed(),
      ]);

      const stats: QueueStats = {
        waiting: waiting.length,
        active: active.length,
        completed: completed.length,
        failed: failed.length,
        delayed: delayed.length,
        paused: 0, // Bull doesn't have a direct way to get paused jobs count
        total: waiting.length + active.length + completed.length + failed.length + delayed.length,
      };

      return stats;

    } catch (error) {
      this.logger.error('Failed to get queue statistics:', error);
      throw new Error(`Failed to get queue statistics: ${error.message}`);
    }
  }

  async cleanQueue(options: {
    olderThan?: number;
    status?: JobStatus[];
    limit?: number;
  } = {}): Promise<number> {
    this.logger.log('Cleaning queue with options:', options);

    try {
      let cleanedCount = 0;
      const olderThan = options.olderThan || 24 * 60 * 60 * 1000; // 24 hours default
      const limit = options.limit || 1000;

      if (!options.status || options.status.includes(JobStatus.COMPLETED)) {
        const cleaned = await this.analysisQueue.clean(olderThan, 'completed', limit);
        cleanedCount += cleaned.length;
      }

      if (!options.status || options.status.includes(JobStatus.FAILED)) {
        const cleaned = await this.analysisQueue.clean(olderThan, 'failed', limit);
        cleanedCount += cleaned.length;
      }

      this.logger.log(`Cleaned ${cleanedCount} jobs from queue`);
      return cleanedCount;

    } catch (error) {
      this.logger.error('Failed to clean queue:', error);
      throw new Error(`Failed to clean queue: ${error.message}`);
    }
  }

  async updateJobProgress(jobId: string, progress: JobProgress): Promise<void> {
    this.logger.debug(`Updating progress for job ${jobId}:`, progress);

    try {
      const job = await this.analysisQueue.getJob(jobId);
      
      if (!job) {
        this.logger.warn(`Job ${jobId} not found for progress update`);
        return;
      }

      await job.progress(progress);

    } catch (error) {
      this.logger.error(`Failed to update progress for job ${jobId}:`, error);
      throw new Error(`Failed to update job progress: ${error.message}`);
    }
  }

  private async getJobsByStatus(status: JobStatus): Promise<Job[]> {
    switch (status) {
      case JobStatus.WAITING:
        return this.analysisQueue.getWaiting();
      case JobStatus.ACTIVE:
        return this.analysisQueue.getActive();
      case JobStatus.COMPLETED:
        return this.analysisQueue.getCompleted();
      case JobStatus.FAILED:
        return this.analysisQueue.getFailed();
      case JobStatus.DELAYED:
        return this.analysisQueue.getDelayed();
      case JobStatus.PAUSED:
        return []; // Bull doesn't have a direct way to get paused jobs
      default:
        return [];
    }
  }

  private mapJobToJobInfo(job: Job): JobInfo {
    const status = this.getJobStatus(job);
    
    return {
      id: job.id.toString(),
      type: job.data.jobType,
      status,
      priority: job.opts.priority || JobPriority.NORMAL,
      data: job.data,
      progress: job.progress() as JobProgress || { percentage: 0, message: 'Pending' },
      result: job.returnvalue as JobResult,
      createdAt: new Date(job.timestamp),
      startedAt: job.processedOn ? new Date(job.processedOn) : undefined,
      completedAt: job.finishedOn ? new Date(job.finishedOn) : undefined,
      failedAt: job.failedReason ? new Date(job.finishedOn || Date.now()) : undefined,
      attempts: job.attemptsMade,
      maxAttempts: job.opts.attempts || 3,
      delay: job.opts.delay,
      timeout: job.opts.timeout,
      error: job.failedReason,
    };
  }

  private getJobStatus(job: Job): JobStatus {
    if (job.finishedOn && !job.failedReason) {
      return JobStatus.COMPLETED;
    }
    if (job.failedReason) {
      return JobStatus.FAILED;
    }
    if (job.processedOn) {
      return JobStatus.ACTIVE;
    }
    if (job.opts.delay && job.opts.delay > Date.now()) {
      return JobStatus.DELAYED;
    }
    return JobStatus.WAITING;
  }

  private setupQueueEventListeners(): void {
    this.analysisQueue.on('completed', (job: Job, result: any) => {
      this.logger.debug(`Job ${job.id} completed with result:`, result);
    });

    this.analysisQueue.on('failed', (job: Job, err: Error) => {
      this.logger.error(`Job ${job.id} failed:`, err);
    });

    this.analysisQueue.on('progress', (job: Job, progress: any) => {
      this.logger.debug(`Job ${job.id} progress:`, progress);
    });

    this.analysisQueue.on('stalled', (job: Job) => {
      this.logger.warn(`Job ${job.id} stalled`);
    });

    this.analysisQueue.on('error', (error: Error) => {
      this.logger.error('Queue error:', error);
    });
  }

  private async cleanupOldJobs(): Promise<void> {
    try {
      const olderThan = 7 * 24 * 60 * 60 * 1000; // 7 days
      const cleanedCount = await this.cleanQueue({ olderThan, limit: 1000 });
      this.logger.log(`Cleaned up ${cleanedCount} old jobs on startup`);
    } catch (error) {
      this.logger.warn('Failed to cleanup old jobs on startup:', error);
    }
  }
}
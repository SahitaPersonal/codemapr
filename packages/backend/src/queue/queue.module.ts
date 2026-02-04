import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { JobQueueService } from './job-queue.service';
import { JobQueueController } from './job-queue.controller';
import { AnalysisJobProcessor } from './processors/analysis-job.processor';
import { AnalysisModule } from '../analysis/analysis.module';
import { FlowchartModule } from '../flowchart/flowchart.module';
import { CompressionModule } from '../compression/compression.module';

@Module({
  imports: [
    BullModule.registerQueue({
      name: 'analysis',
      defaultJobOptions: {
        removeOnComplete: 100,
        removeOnFail: 50,
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 2000,
        },
      },
    }),
    AnalysisModule,
    FlowchartModule,
    CompressionModule,
  ],
  controllers: [JobQueueController],
  providers: [JobQueueService, AnalysisJobProcessor],
  exports: [JobQueueService],
})
export class QueueModule {}
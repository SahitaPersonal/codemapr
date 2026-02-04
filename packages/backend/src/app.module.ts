import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bull';
import { AppController } from './app.controller';
import { AppService } from './app.service';
// import { HealthModule } from './health/health.module';
import { AnalysisModule } from './analysis/analysis.module';
import { FlowchartModule } from './flowchart/flowchart.module';
// import { AIModule } from './ai/ai.module';
import { CollaborationModule } from './collaboration/collaboration.module';
import { PreferencesModule } from './preferences/preferences.module';
import { CompressionModule } from './compression/compression.module';
import { QueueModule } from './queue/queue.module';
import { ErrorHandlingModule } from './common/errors/error-handling.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    // Enable TypeORM for collaboration features - using SQLite for development
    TypeOrmModule.forRoot({
      type: 'sqlite',
      database: process.env.NODE_ENV === 'production' ? 'codemapr.db' : ':memory:',
      autoLoadEntities: true,
      synchronize: true, // Auto-create tables in development
      logging: process.env.NODE_ENV === 'development',
    }),
    // Redis configuration for job queue (temporarily disabled for testing)
    // BullModule.forRoot({
    //   redis: {
    //     host: process.env.REDIS_HOST || 'localhost',
    //     port: parseInt(process.env.REDIS_PORT) || 6379,
    //     password: process.env.REDIS_PASSWORD,
    //   },
    // }),
    // HealthModule,
    AnalysisModule,
    FlowchartModule,
    // AIModule,
    CollaborationModule,
    PreferencesModule,
    CompressionModule,
    ErrorHandlingModule,
    // QueueModule, // Temporarily disabled until Redis is available
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
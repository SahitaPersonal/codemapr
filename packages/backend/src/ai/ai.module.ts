import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AIService } from './ai.service';
import { AIController } from './ai.controller';
import { AICacheService } from './ai-cache.service';

@Module({
  imports: [ConfigModule],
  controllers: [AIController],
  providers: [AIService, AICacheService],
  exports: [AIService],
})
export class AIModule {}
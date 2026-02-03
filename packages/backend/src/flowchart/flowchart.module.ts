import { Module } from '@nestjs/common';
import { FlowchartService } from './flowchart.service';
import { FlowchartController } from './flowchart.controller';

@Module({
  controllers: [FlowchartController],
  providers: [FlowchartService],
  exports: [FlowchartService],
})
export class FlowchartModule {}
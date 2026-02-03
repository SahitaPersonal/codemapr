import { Module } from '@nestjs/common';
import { AnalysisService } from './analysis.service';
import { AnalysisController } from './analysis.controller';
import { TypeScriptAnalyzer } from './analyzers/typescript.analyzer';
import { JavaScriptAnalyzer } from './analyzers/javascript.analyzer';
import { ReactAnalyzer } from './analyzers/react.analyzer';
import { ServiceAnalyzer } from './analyzers/service.analyzer';
import { DependencyTracer } from './tracers/dependency.tracer';
import { FlowTracer } from './tracers/flow.tracer';

@Module({
  controllers: [AnalysisController],
  providers: [
    AnalysisService,
    TypeScriptAnalyzer,
    JavaScriptAnalyzer,
    ReactAnalyzer,
    ServiceAnalyzer,
    DependencyTracer,
    FlowTracer,
  ],
  exports: [AnalysisService],
})
export class AnalysisModule {}
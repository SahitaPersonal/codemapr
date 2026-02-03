import { Module } from '@nestjs/common';
import { AnalysisService } from './analysis.service';
import { AnalysisController } from './analysis.controller';
import { TypeScriptAnalyzer } from './analyzers/typescript.analyzer';
import { JavaScriptAnalyzer } from './analyzers/javascript.analyzer';
import { ReactAnalyzer } from './analyzers/react.analyzer';
import { DependencyTracer } from './tracers/dependency.tracer';

@Module({
  controllers: [AnalysisController],
  providers: [
    AnalysisService,
    TypeScriptAnalyzer,
    JavaScriptAnalyzer,
    ReactAnalyzer,
    DependencyTracer,
  ],
  exports: [AnalysisService],
})
export class AnalysisModule {}
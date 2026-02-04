import { Module } from '@nestjs/common';
import { AnalysisService } from './analysis.service';
import { AnalysisController } from './analysis.controller';
import { ComplexityController } from './complexity.controller';
import { ComplexityService } from './complexity.service';
import { PerformanceMetricsController } from './performance-metrics.controller';
import { PerformanceMetricsService } from './performance-metrics.service';
import { TypeScriptAnalyzer } from './analyzers/typescript.analyzer';
import { JavaScriptAnalyzer } from './analyzers/javascript.analyzer';
import { ReactAnalyzer } from './analyzers/react.analyzer';
import { ServiceAnalyzer } from './analyzers/service.analyzer';
import { SecurityAnalyzer } from './analyzers/security.analyzer';
import { PerformanceAnalyzer } from './analyzers/performance.analyzer';
import { ComplexityAnalyzer } from './analyzers/complexity.analyzer';
import { DependencyTracer } from './tracers/dependency.tracer';
import { FlowTracer } from './tracers/flow.tracer';

@Module({
  controllers: [AnalysisController, ComplexityController, PerformanceMetricsController],
  providers: [
    AnalysisService,
    ComplexityService,
    PerformanceMetricsService,
    TypeScriptAnalyzer,
    JavaScriptAnalyzer,
    ReactAnalyzer,
    ServiceAnalyzer,
    SecurityAnalyzer,
    PerformanceAnalyzer,
    ComplexityAnalyzer,
    DependencyTracer,
    FlowTracer,
  ],
  exports: [
    AnalysisService,
    ComplexityService,
    PerformanceMetricsService,
    ComplexityAnalyzer,
  ],
})
export class AnalysisModule {}
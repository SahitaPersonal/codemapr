import { Module } from '@nestjs/common';
import { AnalysisService } from './analysis.service';
import { AnalysisController } from './analysis.controller';
import { ComplexityController } from './complexity.controller';
import { ComplexityService } from './complexity.service';
import { PerformanceMetricsController } from './performance-metrics.controller';
import { PerformanceMetricsService } from './performance-metrics.service';
import { SecurityVulnerabilityController } from './security-vulnerability.controller';
import { SecurityVulnerabilityService } from './security-vulnerability.service';
import { OptimizationRecommendationController } from './optimization-recommendation.controller';
import { OptimizationRecommendationService } from './optimization-recommendation.service';
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
  controllers: [
    AnalysisController, 
    ComplexityController, 
    PerformanceMetricsController, 
    SecurityVulnerabilityController,
    OptimizationRecommendationController
  ],
  providers: [
    AnalysisService,
    ComplexityService,
    PerformanceMetricsService,
    SecurityVulnerabilityService,
    OptimizationRecommendationService,
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
    SecurityVulnerabilityService,
    OptimizationRecommendationService,
    ComplexityAnalyzer,
  ],
})
export class AnalysisModule {}
import { Injectable, Logger } from '@nestjs/common';
import { ComplexityService } from './complexity.service';
import { PerformanceAnalyzer } from './analyzers/performance.analyzer';
import { SecurityAnalyzer } from './analyzers/security.analyzer';

export interface PerformanceAnalysisResult {
  filePath: string;
  performanceScore: number;
  executionTime?: number;
  memoryUsage?: number;
  cpuUsage?: number;
  bottlenecks: PerformanceBottleneck[];
  performanceIssues: any[]; // Using any for now, will be PerformanceIssue from shared types
  recommendations: string[];
  optimizationOpportunities: OptimizationOpportunity[];
  isBottleneck: boolean;
}

export interface PerformanceBottleneck {
  type: 'execution_time' | 'memory_usage' | 'cpu_usage' | 'algorithmic_complexity';
  location: {
    filePath: string;
    functionName?: string;
    line: number;
  };
  severity: 'critical' | 'high' | 'medium' | 'low';
  impact: string;
  recommendation: string;
  estimatedImprovement: string;
  value: number;
  threshold: number;
}

export interface OptimizationOpportunity {
  type: 'algorithm' | 'memory' | 'io' | 'caching' | 'async' | 'database';
  priority: 'high' | 'medium' | 'low';
  title: string;
  description: string;
  location: {
    filePath: string;
    functionName?: string;
    line?: number;
  };
  estimatedImpact: string;
  implementationEffort: string;
  codeExample?: string;
}

export interface ProjectPerformanceReport {
  projectPath: string;
  overallPerformanceScore: number;
  totalFiles: number;
  analyzedFiles: number;
  bottlenecks: PerformanceBottleneck[];
  optimizationOpportunities: OptimizationOpportunity[];
  performanceMetrics: {
    averageExecutionTime: number;
    totalMemoryUsage: number;
    averageCpuUsage: number;
    criticalBottlenecks: number;
    highPriorityOptimizations: number;
  };
  recommendations: ProjectPerformanceRecommendation[];
}

export interface ProjectPerformanceRecommendation {
  priority: 'critical' | 'high' | 'medium' | 'low';
  category: 'performance' | 'memory' | 'cpu' | 'io' | 'algorithm';
  title: string;
  description: string;
  affectedFiles: string[];
  estimatedImpact: string;
  implementationEffort: string;
}

export interface PerformanceMetricsSummary {
  projectPath: string;
  overallScore: number;
  totalBottlenecks: number;
  criticalIssues: number;
  averageExecutionTime: number;
  memoryEfficiency: number;
  cpuEfficiency: number;
  topBottlenecks: PerformanceBottleneck[];
  quickWins: OptimizationOpportunity[];
  trends: {
    performanceScore: 'improving' | 'stable' | 'declining';
    bottleneckCount: 'decreasing' | 'stable' | 'increasing';
  };
}

@Injectable()
export class PerformanceMetricsService {
  private readonly logger = new Logger(PerformanceMetricsService.name);

  constructor(
    private readonly complexityService: ComplexityService,
    private readonly performanceAnalyzer: PerformanceAnalyzer,
    private readonly securityAnalyzer: SecurityAnalyzer,
  ) {}

  /**
   * Analyze performance metrics for a single file
   */
  async analyzePerformance(
    filePath: string,
    sourceCode: string,
    runtimeMetrics?: {
      executionTime?: number;
      memoryUsage?: number;
      cpuUsage?: number;
    }
  ): Promise<PerformanceAnalysisResult> {
    try {
      this.logger.debug(`Analyzing performance for file: ${filePath}`);

      // Get complexity analysis first
      const complexityAnalysis = await this.complexityService.analyzeFile(filePath, sourceCode);
      
      // Get performance issues from static analysis
      let performanceIssues: any[] = [];
      
      if (filePath.endsWith('.ts') || filePath.endsWith('.tsx')) {
        // For TypeScript files, we need to parse the source first
        const sourceFile = require('typescript').createSourceFile(
          filePath,
          sourceCode,
          require('typescript').ScriptTarget.Latest,
          true
        );
        
        // Convert complexity metrics to the expected format
        const sharedComplexityMetrics = {
          cyclomatic: complexityAnalysis.metrics.cyclomaticComplexity,
          cognitive: complexityAnalysis.metrics.cognitiveComplexity,
          maintainability: complexityAnalysis.metrics.maintainabilityIndex,
          technicalDebt: complexityAnalysis.metrics.technicalDebtScore,
        };
        
        const analysisResult = await this.performanceAnalyzer.analyzeTypeScriptFile(
          filePath,
          sourceFile,
          sharedComplexityMetrics
        );
        performanceIssues = analysisResult.issues;
      } else if (filePath.endsWith('.js') || filePath.endsWith('.jsx')) {
        // For JavaScript files, we need to parse with Babel
        const { parse } = require('@babel/parser');
        const ast = parse(sourceCode, {
          sourceType: 'module',
          plugins: ['jsx', 'typescript', 'decorators-legacy', 'classProperties'],
          allowImportExportEverywhere: true,
          allowReturnOutsideFunction: true,
        });
        
        // Convert complexity metrics to the expected format
        const sharedComplexityMetrics = {
          cyclomatic: complexityAnalysis.metrics.cyclomaticComplexity,
          cognitive: complexityAnalysis.metrics.cognitiveComplexity,
          maintainability: complexityAnalysis.metrics.maintainabilityIndex,
          technicalDebt: complexityAnalysis.metrics.technicalDebtScore,
        };
        
        const analysisResult = await this.performanceAnalyzer.analyzeJavaScriptFile(
          filePath,
          ast,
          sharedComplexityMetrics
        );
        performanceIssues = analysisResult.issues;
      }
      
      // Calculate performance score based on complexity and issues
      const performanceScore = this.calculatePerformanceScore(
        complexityAnalysis,
        performanceIssues,
        runtimeMetrics
      );

      // Identify bottlenecks
      const bottlenecks = this.identifyFileBottlenecks(
        filePath,
        complexityAnalysis,
        performanceIssues,
        runtimeMetrics
      );

      // Generate optimization opportunities
      const optimizationOpportunities = this.generateOptimizationOpportunities(
        filePath,
        complexityAnalysis,
        performanceIssues
      );

      // Generate recommendations
      const recommendations = this.generatePerformanceRecommendations(
        complexityAnalysis,
        performanceIssues,
        bottlenecks
      );

      const isBottleneck = bottlenecks.some(b => b.severity === 'critical' || b.severity === 'high');

      return {
        filePath,
        performanceScore,
        executionTime: runtimeMetrics?.executionTime,
        memoryUsage: runtimeMetrics?.memoryUsage,
        cpuUsage: runtimeMetrics?.cpuUsage,
        bottlenecks,
        performanceIssues,
        recommendations,
        optimizationOpportunities,
        isBottleneck,
      };
    } catch (error) {
      this.logger.error(`Error analyzing performance for ${filePath}:`, error);
      throw error;
    }
  }

  /**
   * Analyze performance for an entire project
   */
  async analyzeProjectPerformance(
    projectPath: string,
    analysisId?: string
  ): Promise<ProjectPerformanceReport> {
    try {
      this.logger.log(`Starting project performance analysis: ${projectPath}`);

      // For now, return a placeholder report
      // In a real implementation, this would integrate with file system scanning
      const report: ProjectPerformanceReport = {
        projectPath,
        overallPerformanceScore: 75,
        totalFiles: 0,
        analyzedFiles: 0,
        bottlenecks: [],
        optimizationOpportunities: [],
        performanceMetrics: {
          averageExecutionTime: 0,
          totalMemoryUsage: 0,
          averageCpuUsage: 0,
          criticalBottlenecks: 0,
          highPriorityOptimizations: 0,
        },
        recommendations: [],
      };

      this.logger.log(`Project performance analysis completed for ${projectPath}`);
      return report;
    } catch (error) {
      this.logger.error(`Error analyzing project performance for ${projectPath}:`, error);
      throw error;
    }
  }

  /**
   * Identify performance bottlenecks
   */
  async identifyBottlenecks(
    projectPath: string,
    thresholdMs: number = 100
  ): Promise<PerformanceBottleneck[]> {
    try {
      this.logger.debug(`Identifying bottlenecks for project: ${projectPath}`);

      // Placeholder implementation
      const bottlenecks: PerformanceBottleneck[] = [];

      return bottlenecks;
    } catch (error) {
      this.logger.error(`Error identifying bottlenecks for ${projectPath}:`, error);
      throw error;
    }
  }

  /**
   * Get optimization recommendations
   */
  async getOptimizationRecommendations(
    projectPath: string,
    priority?: 'high' | 'medium' | 'low'
  ): Promise<OptimizationOpportunity[]> {
    try {
      this.logger.debug(`Getting optimization recommendations for project: ${projectPath}`);

      // Placeholder implementation
      const recommendations: OptimizationOpportunity[] = [];

      if (priority) {
        return recommendations.filter(r => r.priority === priority);
      }

      return recommendations;
    } catch (error) {
      this.logger.error(`Error getting optimization recommendations for ${projectPath}:`, error);
      throw error;
    }
  }

  /**
   * Get performance metrics summary
   */
  async getPerformanceMetricsSummary(projectPath: string): Promise<PerformanceMetricsSummary> {
    try {
      this.logger.debug(`Getting performance metrics summary for project: ${projectPath}`);

      // Placeholder implementation
      const summary: PerformanceMetricsSummary = {
        projectPath,
        overallScore: 75,
        totalBottlenecks: 0,
        criticalIssues: 0,
        averageExecutionTime: 0,
        memoryEfficiency: 85,
        cpuEfficiency: 80,
        topBottlenecks: [],
        quickWins: [],
        trends: {
          performanceScore: 'stable',
          bottleneckCount: 'stable',
        },
      };

      return summary;
    } catch (error) {
      this.logger.error(`Error getting performance metrics summary for ${projectPath}:`, error);
      throw error;
    }
  }

  private calculatePerformanceScore(
    complexityAnalysis: any,
    performanceIssues: any[],
    runtimeMetrics?: {
      executionTime?: number;
      memoryUsage?: number;
      cpuUsage?: number;
    }
  ): number {
    let score = 100;

    // Deduct points for complexity
    if (complexityAnalysis.metrics.cyclomaticComplexity > 10) {
      score -= Math.min(30, (complexityAnalysis.metrics.cyclomaticComplexity - 10) * 2);
    }

    // Deduct points for performance issues
    score -= Math.min(40, performanceIssues.length * 5);

    // Deduct points for runtime metrics
    if (runtimeMetrics?.executionTime && runtimeMetrics.executionTime > 100) {
      score -= Math.min(20, (runtimeMetrics.executionTime - 100) / 10);
    }

    if (runtimeMetrics?.cpuUsage && runtimeMetrics.cpuUsage > 80) {
      score -= Math.min(15, (runtimeMetrics.cpuUsage - 80) / 2);
    }

    return Math.max(0, Math.round(score));
  }

  private identifyFileBottlenecks(
    filePath: string,
    complexityAnalysis: any,
    performanceIssues: any[],
    runtimeMetrics?: {
      executionTime?: number;
      memoryUsage?: number;
      cpuUsage?: number;
    }
  ): PerformanceBottleneck[] {
    const bottlenecks: PerformanceBottleneck[] = [];

    // Check for high complexity functions
    complexityAnalysis.functions.forEach((func: any) => {
      if (func.cyclomaticComplexity > 15) {
        bottlenecks.push({
          type: 'algorithmic_complexity',
          location: {
            filePath,
            functionName: func.name,
            line: func.startLine,
          },
          severity: func.cyclomaticComplexity > 25 ? 'critical' : 'high',
          impact: `High algorithmic complexity (${func.cyclomaticComplexity}) may cause performance issues`,
          recommendation: 'Break down complex function into smaller, more focused functions',
          estimatedImprovement: '20-40% performance improvement',
          value: func.cyclomaticComplexity,
          threshold: 15,
        });
      }
    });

    // Check runtime metrics
    if (runtimeMetrics?.executionTime && runtimeMetrics.executionTime > 100) {
      bottlenecks.push({
        type: 'execution_time',
        location: { filePath, line: 1 },
        severity: runtimeMetrics.executionTime > 500 ? 'critical' : 'high',
        impact: `Slow execution time: ${runtimeMetrics.executionTime}ms`,
        recommendation: 'Optimize algorithms and reduce computational complexity',
        estimatedImprovement: '30-60% faster execution',
        value: runtimeMetrics.executionTime,
        threshold: 100,
      });
    }

    if (runtimeMetrics?.memoryUsage && runtimeMetrics.memoryUsage > 100) {
      bottlenecks.push({
        type: 'memory_usage',
        location: { filePath, line: 1 },
        severity: runtimeMetrics.memoryUsage > 500 ? 'critical' : 'medium',
        impact: `High memory usage: ${runtimeMetrics.memoryUsage}MB`,
        recommendation: 'Optimize data structures and implement memory pooling',
        estimatedImprovement: '40-70% memory reduction',
        value: runtimeMetrics.memoryUsage,
        threshold: 100,
      });
    }

    return bottlenecks;
  }

  private generateOptimizationOpportunities(
    filePath: string,
    complexityAnalysis: any,
    performanceIssues: any[]
  ): OptimizationOpportunity[] {
    const opportunities: OptimizationOpportunity[] = [];

    // Algorithm optimization opportunities
    complexityAnalysis.functions.forEach((func: any) => {
      if (func.cyclomaticComplexity > 10) {
        opportunities.push({
          type: 'algorithm',
          priority: func.cyclomaticComplexity > 20 ? 'high' : 'medium',
          title: `Optimize ${func.name} algorithm`,
          description: `Function has high complexity (${func.cyclomaticComplexity}). Consider algorithmic improvements.`,
          location: {
            filePath,
            functionName: func.name,
            line: func.startLine,
          },
          estimatedImpact: '20-40% performance improvement',
          implementationEffort: 'Medium',
          codeExample: 'Consider using more efficient algorithms or data structures',
        });
      }
    });

    // Memory optimization opportunities
    if (complexityAnalysis.metrics.linesOfCode > 500) {
      opportunities.push({
        type: 'memory',
        priority: 'medium',
        title: 'Optimize memory usage',
        description: 'Large file may benefit from memory optimization techniques',
        location: { filePath },
        estimatedImpact: '15-30% memory reduction',
        implementationEffort: 'Low',
        codeExample: 'Use object pooling, lazy loading, or data streaming',
      });
    }

    return opportunities;
  }

  private generatePerformanceRecommendations(
    complexityAnalysis: any,
    performanceIssues: any[],
    bottlenecks: PerformanceBottleneck[]
  ): string[] {
    const recommendations: string[] = [];

    if (bottlenecks.some(b => b.type === 'algorithmic_complexity')) {
      recommendations.push('Reduce algorithmic complexity by refactoring complex functions');
    }

    if (bottlenecks.some(b => b.type === 'execution_time')) {
      recommendations.push('Optimize execution time by profiling and optimizing hot paths');
    }

    if (bottlenecks.some(b => b.type === 'memory_usage')) {
      recommendations.push('Implement memory optimization techniques to reduce memory footprint');
    }

    if (complexityAnalysis.metrics.averageFunctionComplexity > 8) {
      recommendations.push('Break down complex functions into smaller, more manageable pieces');
    }

    if (performanceIssues.length > 0) {
      recommendations.push('Address identified performance issues to improve overall performance');
    }

    return recommendations;
  }
}
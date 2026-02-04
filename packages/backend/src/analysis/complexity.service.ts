import { Injectable, Logger } from '@nestjs/common';
import { ComplexityAnalyzer, FileComplexityAnalysis, ComplexityMetrics } from './analyzers/complexity.analyzer';
import { AnalysisService } from './analysis.service';

export interface ProjectComplexityReport {
  projectPath: string;
  totalFiles: number;
  analyzedFiles: number;
  overallMetrics: AggregatedComplexityMetrics;
  fileAnalyses: FileComplexityAnalysis[];
  hotspots: ComplexityHotspot[];
  recommendations: ProjectRecommendation[];
  technicalDebtSummary: TechnicalDebtSummary;
}

export interface AggregatedComplexityMetrics {
  totalCyclomaticComplexity: number;
  totalCognitiveComplexity: number;
  averageMaintainabilityIndex: number;
  totalLinesOfCode: number;
  totalLogicalLinesOfCode: number;
  totalCommentLines: number;
  overallCommentRatio: number;
  totalFunctions: number;
  totalClasses: number;
  averageFunctionComplexity: number;
  maxFunctionComplexity: number;
  totalTechnicalDebtScore: number;
  totalTechnicalDebtMinutes: number;
  totalCodeSmells: number;
  criticalIssues: number;
  highIssues: number;
  mediumIssues: number;
  lowIssues: number;
}

export interface ComplexityHotspot {
  filePath: string;
  type: 'file' | 'function' | 'class';
  name: string;
  metric: 'cyclomatic' | 'cognitive' | 'maintainability' | 'technical_debt' | 'lines_of_code';
  value: number;
  severity: 'critical' | 'high' | 'medium' | 'low';
  line?: number;
  recommendation: string;
}

export interface ProjectRecommendation {
  priority: 'critical' | 'high' | 'medium' | 'low';
  category: 'complexity' | 'maintainability' | 'technical_debt' | 'documentation' | 'structure';
  title: string;
  description: string;
  affectedFiles: string[];
  estimatedEffort: string;
  impact: string;
}

export interface TechnicalDebtSummary {
  totalDebtScore: number;
  totalDebtMinutes: number;
  totalDebtHours: number;
  totalDebtDays: number;
  debtByCategory: {
    complexity: number;
    maintainability: number;
    documentation: number;
    codeSmells: number;
  };
  debtTrend: 'increasing' | 'stable' | 'decreasing';
  paybackPriority: string[];
}

@Injectable()
export class ComplexityService {
  private readonly logger = new Logger(ComplexityService.name);

  constructor(
    private readonly complexityAnalyzer: ComplexityAnalyzer,
  ) {}

  /**
   * Analyze complexity for a single file
   */
  async analyzeFile(filePath: string, sourceCode: string): Promise<FileComplexityAnalysis> {
    try {
      this.logger.debug(`Analyzing complexity for file: ${filePath}`);

      if (filePath.endsWith('.ts') || filePath.endsWith('.tsx')) {
        return this.complexityAnalyzer.analyzeTypeScript(sourceCode, filePath);
      } else if (filePath.endsWith('.js') || filePath.endsWith('.jsx')) {
        return this.complexityAnalyzer.analyzeJavaScript(sourceCode, filePath);
      } else {
        this.logger.warn(`Unsupported file type for complexity analysis: ${filePath}`);
        return this.createEmptyAnalysis(filePath);
      }
    } catch (error) {
      this.logger.error(`Error analyzing complexity for ${filePath}:`, error);
      return this.createEmptyAnalysis(filePath);
    }
  }

  /**
   * Analyze complexity for an entire project
   */
  async analyzeProject(projectPath: string): Promise<ProjectComplexityReport> {
    try {
      this.logger.log(`Starting complexity analysis for project: ${projectPath}`);

      // For now, we'll create a simplified project analysis
      // In a real implementation, this would integrate with file system scanning
      const fileAnalyses: FileComplexityAnalysis[] = [];
      let analyzedFiles = 0;

      // This is a placeholder - in a real implementation, you would:
      // 1. Scan the project directory for supported files
      // 2. Read each file's content
      // 3. Analyze each file for complexity
      
      // For demonstration, let's create some sample data
      this.logger.warn('Project complexity analysis is using placeholder data. Integrate with file system scanning for production use.');

      // Aggregate metrics
      const overallMetrics = this.aggregateMetrics(fileAnalyses);
      
      // Identify hotspots
      const hotspots = this.identifyHotspots(fileAnalyses);
      
      // Generate project-level recommendations
      const recommendations = this.generateProjectRecommendations(overallMetrics, hotspots, fileAnalyses);
      
      // Calculate technical debt summary
      const technicalDebtSummary = this.calculateTechnicalDebtSummary(fileAnalyses);

      const report: ProjectComplexityReport = {
        projectPath,
        totalFiles: 0, // Would be actual file count
        analyzedFiles,
        overallMetrics,
        fileAnalyses,
        hotspots,
        recommendations,
        technicalDebtSummary,
      };

      this.logger.log(`Complexity analysis completed for ${projectPath}. Analyzed ${analyzedFiles} files.`);
      return report;

    } catch (error) {
      this.logger.error(`Error analyzing project complexity for ${projectPath}:`, error);
      throw error;
    }
  }

  /**
   * Get complexity trends over time (placeholder for future implementation)
   */
  async getComplexityTrends(projectPath: string, timeRange: string): Promise<any> {
    // This would integrate with a time-series database to track complexity over time
    this.logger.debug(`Getting complexity trends for ${projectPath} over ${timeRange}`);
    
    return {
      message: 'Complexity trends feature coming soon',
      projectPath,
      timeRange,
    };
  }

  private aggregateMetrics(fileAnalyses: FileComplexityAnalysis[]): AggregatedComplexityMetrics {
    const totalFiles = fileAnalyses.length;
    
    if (totalFiles === 0) {
      return this.createEmptyAggregatedMetrics();
    }

    const totals = fileAnalyses.reduce((acc, file) => {
      const metrics = file.metrics;
      return {
        cyclomaticComplexity: acc.cyclomaticComplexity + metrics.cyclomaticComplexity,
        cognitiveComplexity: acc.cognitiveComplexity + metrics.cognitiveComplexity,
        maintainabilityIndex: acc.maintainabilityIndex + metrics.maintainabilityIndex,
        linesOfCode: acc.linesOfCode + metrics.linesOfCode,
        logicalLinesOfCode: acc.logicalLinesOfCode + metrics.logicalLinesOfCode,
        commentLines: acc.commentLines + metrics.commentLines,
        functions: acc.functions + metrics.functionCount,
        classes: acc.classes + metrics.classCount,
        technicalDebtScore: acc.technicalDebtScore + metrics.technicalDebtScore,
        technicalDebtMinutes: acc.technicalDebtMinutes + metrics.technicalDebtMinutes,
        codeSmells: acc.codeSmells + metrics.codeSmells.length,
        maxFunctionComplexity: Math.max(acc.maxFunctionComplexity, metrics.maxFunctionComplexity),
      };
    }, {
      cyclomaticComplexity: 0,
      cognitiveComplexity: 0,
      maintainabilityIndex: 0,
      linesOfCode: 0,
      logicalLinesOfCode: 0,
      commentLines: 0,
      functions: 0,
      classes: 0,
      technicalDebtScore: 0,
      technicalDebtMinutes: 0,
      codeSmells: 0,
      maxFunctionComplexity: 0,
    });

    // Count issues by severity
    const issuesCounts = fileAnalyses.reduce((acc, file) => {
      file.issues.forEach(issue => {
        acc[issue.severity]++;
      });
      return acc;
    }, { critical: 0, high: 0, medium: 0, low: 0 });

    return {
      totalCyclomaticComplexity: totals.cyclomaticComplexity,
      totalCognitiveComplexity: totals.cognitiveComplexity,
      averageMaintainabilityIndex: totals.maintainabilityIndex / totalFiles,
      totalLinesOfCode: totals.linesOfCode,
      totalLogicalLinesOfCode: totals.logicalLinesOfCode,
      totalCommentLines: totals.commentLines,
      overallCommentRatio: totals.linesOfCode > 0 ? totals.commentLines / totals.linesOfCode : 0,
      totalFunctions: totals.functions,
      totalClasses: totals.classes,
      averageFunctionComplexity: totals.functions > 0 ? totals.cyclomaticComplexity / totals.functions : 0,
      maxFunctionComplexity: totals.maxFunctionComplexity,
      totalTechnicalDebtScore: totals.technicalDebtScore,
      totalTechnicalDebtMinutes: totals.technicalDebtMinutes,
      totalCodeSmells: totals.codeSmells,
      criticalIssues: issuesCounts.critical,
      highIssues: issuesCounts.high,
      mediumIssues: issuesCounts.medium,
      lowIssues: issuesCounts.low,
    };
  }

  private identifyHotspots(fileAnalyses: FileComplexityAnalysis[]): ComplexityHotspot[] {
    const hotspots: ComplexityHotspot[] = [];

    fileAnalyses.forEach(file => {
      // File-level hotspots
      if (file.metrics.maintainabilityIndex < 20) {
        hotspots.push({
          filePath: file.filePath,
          type: 'file',
          name: file.filePath,
          metric: 'maintainability',
          value: file.metrics.maintainabilityIndex,
          severity: 'critical',
          recommendation: 'This file has very low maintainability. Consider major refactoring.',
        });
      }

      if (file.metrics.technicalDebtScore > 100) {
        hotspots.push({
          filePath: file.filePath,
          type: 'file',
          name: file.filePath,
          metric: 'technical_debt',
          value: file.metrics.technicalDebtScore,
          severity: file.metrics.technicalDebtScore > 200 ? 'critical' : 'high',
          recommendation: 'High technical debt detected. Schedule refactoring time.',
        });
      }

      // Function-level hotspots
      file.functions.forEach(func => {
        if (func.cyclomaticComplexity > 15) {
          hotspots.push({
            filePath: file.filePath,
            type: 'function',
            name: func.name,
            metric: 'cyclomatic',
            value: func.cyclomaticComplexity,
            severity: func.cyclomaticComplexity > 25 ? 'critical' : 'high',
            line: func.startLine,
            recommendation: 'Break down this complex function into smaller methods.',
          });
        }

        if (func.linesOfCode > 100) {
          hotspots.push({
            filePath: file.filePath,
            type: 'function',
            name: func.name,
            metric: 'lines_of_code',
            value: func.linesOfCode,
            severity: func.linesOfCode > 200 ? 'critical' : 'high',
            line: func.startLine,
            recommendation: 'This function is too long. Consider splitting it into smaller functions.',
          });
        }
      });

      // Class-level hotspots
      file.classes.forEach(cls => {
        if (cls.methods.length > 25) {
          hotspots.push({
            filePath: file.filePath,
            type: 'class',
            name: cls.name,
            metric: 'lines_of_code',
            value: cls.methods.length,
            severity: cls.methods.length > 40 ? 'critical' : 'high',
            line: cls.startLine,
            recommendation: 'This class has too many methods. Consider using composition or inheritance.',
          });
        }
      });
    });

    // Sort by severity and value
    return hotspots.sort((a, b) => {
      const severityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
      const severityDiff = severityOrder[b.severity] - severityOrder[a.severity];
      if (severityDiff !== 0) return severityDiff;
      return b.value - a.value;
    }).slice(0, 20); // Top 20 hotspots
  }

  private generateProjectRecommendations(
    metrics: AggregatedComplexityMetrics,
    hotspots: ComplexityHotspot[],
    fileAnalyses: FileComplexityAnalysis[]
  ): ProjectRecommendation[] {
    const recommendations: ProjectRecommendation[] = [];

    // Critical complexity issues
    if (metrics.criticalIssues > 0) {
      recommendations.push({
        priority: 'critical',
        category: 'complexity',
        title: 'Address Critical Complexity Issues',
        description: `${metrics.criticalIssues} critical complexity issues found that require immediate attention.`,
        affectedFiles: hotspots.filter(h => h.severity === 'critical').map(h => h.filePath),
        estimatedEffort: `${Math.ceil(metrics.criticalIssues * 2)} hours`,
        impact: 'Reduces maintenance costs and prevents bugs',
      });
    }

    // Low maintainability
    if (metrics.averageMaintainabilityIndex < 50) {
      const lowMaintainabilityFiles = fileAnalyses
        .filter(f => f.metrics.maintainabilityIndex < 50)
        .map(f => f.filePath);

      recommendations.push({
        priority: 'high',
        category: 'maintainability',
        title: 'Improve Code Maintainability',
        description: 'Several files have low maintainability scores, making them difficult to modify and extend.',
        affectedFiles: lowMaintainabilityFiles,
        estimatedEffort: `${Math.ceil(lowMaintainabilityFiles.length * 1.5)} hours`,
        impact: 'Improves code readability and reduces future development time',
      });
    }

    // High technical debt
    if (metrics.totalTechnicalDebtMinutes > 480) { // 8 hours
      recommendations.push({
        priority: 'high',
        category: 'technical_debt',
        title: 'Reduce Technical Debt',
        description: `Project has ${Math.ceil(metrics.totalTechnicalDebtMinutes / 60)} hours of technical debt.`,
        affectedFiles: fileAnalyses
          .filter(f => f.metrics.technicalDebtMinutes > 30)
          .map(f => f.filePath),
        estimatedEffort: `${Math.ceil(metrics.totalTechnicalDebtMinutes / 60)} hours`,
        impact: 'Reduces long-term maintenance costs and improves development velocity',
      });
    }

    // Poor documentation
    if (metrics.overallCommentRatio < 0.1) {
      recommendations.push({
        priority: 'medium',
        category: 'documentation',
        title: 'Improve Code Documentation',
        description: 'Code has insufficient comments and documentation.',
        affectedFiles: fileAnalyses
          .filter(f => f.metrics.commentRatio < 0.1)
          .map(f => f.filePath),
        estimatedEffort: `${Math.ceil(metrics.totalFunctions * 0.1)} hours`,
        impact: 'Improves code understanding and onboarding of new developers',
      });
    }

    // Large functions/classes
    const largeStructures = hotspots.filter(h => 
      h.metric === 'lines_of_code' && h.value > 100
    );

    if (largeStructures.length > 0) {
      recommendations.push({
        priority: 'medium',
        category: 'structure',
        title: 'Refactor Large Functions and Classes',
        description: `${largeStructures.length} functions or classes are too large and should be broken down.`,
        affectedFiles: [...new Set(largeStructures.map(h => h.filePath))],
        estimatedEffort: `${Math.ceil(largeStructures.length * 1)} hours`,
        impact: 'Improves code modularity and testability',
      });
    }

    return recommendations.sort((a, b) => {
      const priorityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
      return priorityOrder[b.priority] - priorityOrder[a.priority];
    });
  }

  private calculateTechnicalDebtSummary(fileAnalyses: FileComplexityAnalysis[]): TechnicalDebtSummary {
    const totalDebtScore = fileAnalyses.reduce((sum, f) => sum + f.metrics.technicalDebtScore, 0);
    const totalDebtMinutes = fileAnalyses.reduce((sum, f) => sum + f.metrics.technicalDebtMinutes, 0);

    // Categorize debt
    const debtByCategory = {
      complexity: 0,
      maintainability: 0,
      documentation: 0,
      codeSmells: 0,
    };

    fileAnalyses.forEach(file => {
      // Complexity debt
      if (file.metrics.averageFunctionComplexity > 10) {
        debtByCategory.complexity += file.metrics.technicalDebtScore * 0.4;
      }
      
      // Maintainability debt
      if (file.metrics.maintainabilityIndex < 50) {
        debtByCategory.maintainability += file.metrics.technicalDebtScore * 0.3;
      }
      
      // Documentation debt
      if (file.metrics.commentRatio < 0.1) {
        debtByCategory.documentation += file.metrics.technicalDebtScore * 0.1;
      }
      
      // Code smells debt
      debtByCategory.codeSmells += file.metrics.codeSmells.length * 5;
    });

    // Priority files for payback
    const paybackPriority = fileAnalyses
      .filter(f => f.metrics.technicalDebtScore > 20)
      .sort((a, b) => b.metrics.technicalDebtScore - a.metrics.technicalDebtScore)
      .slice(0, 10)
      .map(f => f.filePath);

    return {
      totalDebtScore,
      totalDebtMinutes,
      totalDebtHours: Math.ceil(totalDebtMinutes / 60),
      totalDebtDays: Math.ceil(totalDebtMinutes / (60 * 8)), // 8-hour work days
      debtByCategory,
      debtTrend: 'stable', // Would be calculated from historical data
      paybackPriority,
    };
  }

  private createEmptyAnalysis(filePath: string): FileComplexityAnalysis {
    return {
      filePath,
      metrics: {
        cyclomaticComplexity: 0,
        cognitiveComplexity: 0,
        maintainabilityIndex: 100,
        linesOfCode: 0,
        logicalLinesOfCode: 0,
        commentLines: 0,
        commentRatio: 0,
        functionCount: 0,
        classCount: 0,
        averageFunctionComplexity: 0,
        maxFunctionComplexity: 0,
        technicalDebtScore: 0,
        technicalDebtMinutes: 0,
        codeSmells: [],
      },
      functions: [],
      classes: [],
      issues: [],
      recommendations: [],
    };
  }

  private createEmptyAggregatedMetrics(): AggregatedComplexityMetrics {
    return {
      totalCyclomaticComplexity: 0,
      totalCognitiveComplexity: 0,
      averageMaintainabilityIndex: 100,
      totalLinesOfCode: 0,
      totalLogicalLinesOfCode: 0,
      totalCommentLines: 0,
      overallCommentRatio: 0,
      totalFunctions: 0,
      totalClasses: 0,
      averageFunctionComplexity: 0,
      maxFunctionComplexity: 0,
      totalTechnicalDebtScore: 0,
      totalTechnicalDebtMinutes: 0,
      totalCodeSmells: 0,
      criticalIssues: 0,
      highIssues: 0,
      mediumIssues: 0,
      lowIssues: 0,
    };
  }
}
import { Injectable, Logger } from '@nestjs/common';
import * as ts from 'typescript';
import traverse from '@babel/traverse';
import * as t from '@babel/types';
import {
  FileAnalysis,
  AnalysisSourceLocation,
  ComplexityMetrics,
} from '@codemapr/shared';

export interface PerformanceIssue {
  id: string;
  type: PerformanceIssueType;
  severity: PerformanceSeverity;
  title: string;
  description: string;
  location: AnalysisSourceLocation;
  recommendation: string;
  estimatedImpact: string;
  confidence: number;
  metadata: Record<string, any>;
}

export interface PerformanceAnalysisResult {
  issues: PerformanceIssue[];
  summary: PerformanceSummary;
  performanceScore: number;
  optimizationOpportunities: OptimizationOpportunity[];
}

export interface PerformanceSummary {
  totalIssues: number;
  highImpactCount: number;
  mediumImpactCount: number;
  lowImpactCount: number;
  categories: Record<string, number>;
  complexityScore: number;
}

export interface OptimizationOpportunity {
  type: string;
  description: string;
  estimatedGain: string;
  effort: 'low' | 'medium' | 'high';
  priority: number;
}

export enum PerformanceIssueType {
  ALGORITHMIC_COMPLEXITY = 'algorithmic_complexity',
  MEMORY_LEAK = 'memory_leak',
  INEFFICIENT_LOOP = 'inefficient_loop',
  UNNECESSARY_COMPUTATION = 'unnecessary_computation',
  BLOCKING_OPERATION = 'blocking_operation',
  LARGE_OBJECT_CREATION = 'large_object_creation',
  FREQUENT_DOM_ACCESS = 'frequent_dom_access',
  INEFFICIENT_REGEX = 'inefficient_regex',
  SYNCHRONOUS_IO = 'synchronous_io',
  MEMORY_INTENSIVE = 'memory_intensive',
  CPU_INTENSIVE = 'cpu_intensive',
  CACHE_MISS = 'cache_miss',
  DATABASE_N_PLUS_ONE = 'database_n_plus_one',
}

export enum PerformanceSeverity {
  HIGH = 'high',
  MEDIUM = 'medium',
  LOW = 'low',
}

@Injectable()
export class PerformanceAnalyzer {
  private readonly logger = new Logger(PerformanceAnalyzer.name);

  // Performance anti-patterns
  private readonly inefficientPatterns = [
    /for\s*\([^)]*\)\s*{\s*for\s*\([^)]*\)/g, // Nested loops
    /while\s*\([^)]*\)\s*{\s*while\s*\([^)]*\)/g, // Nested while loops
    /\.length\s*;\s*\w+\s*<\s*\w+\.length/g, // Length in loop condition
    /document\.getElementById\s*\(/g, // Frequent DOM access
    /document\.querySelector\s*\(/g, // Frequent DOM queries
  ];

  // Blocking operations
  private readonly blockingOperations = [
    'readFileSync',
    'writeFileSync',
    'execSync',
    'spawnSync',
    'alert',
    'confirm',
    'prompt',
  ];

  // Memory-intensive operations
  private readonly memoryIntensivePatterns = [
    /new\s+Array\s*\(\s*\d{6,}\s*\)/g, // Large array creation
    /new\s+Buffer\s*\(\s*\d{6,}\s*\)/g, // Large buffer creation
    /\.repeat\s*\(\s*\d{4,}\s*\)/g, // String repeat with large count
  ];

  // Inefficient regex patterns
  private readonly inefficientRegexPatterns = [
    /\/.*\(\.\*\)\+.*\/g/g, // Catastrophic backtracking
    /\/.*\(\.\+\)\+.*\/g/g, // Nested quantifiers
    /\/.*\(\w\*\)\+.*\/g/g, // Nested quantifiers with word chars
  ];

  async analyzeTypeScriptFile(
    filePath: string,
    sourceFile: ts.SourceFile,
    complexity?: ComplexityMetrics
  ): Promise<PerformanceAnalysisResult> {
    this.logger.debug(`Analyzing TypeScript file for performance issues: ${filePath}`);

    const issues: PerformanceIssue[] = [];

    const visit = (node: ts.Node) => {
      // Check for nested loops
      const loopIssues = this.detectNestedLoopsTypeScript(node, sourceFile, filePath);
      issues.push(...loopIssues);

      // Check for inefficient DOM access
      const domIssues = this.detectDomAccessIssuesTypeScript(node, sourceFile, filePath);
      issues.push(...domIssues);

      // Check for blocking operations
      const blockingIssues = this.detectBlockingOperationsTypeScript(node, sourceFile, filePath);
      issues.push(...blockingIssues);

      // Check for memory issues
      const memoryIssues = this.detectMemoryIssuesTypeScript(node, sourceFile, filePath);
      issues.push(...memoryIssues);

      // Check for inefficient algorithms
      const algorithmIssues = this.detectAlgorithmicIssuesTypeScript(node, sourceFile, filePath);
      issues.push(...algorithmIssues);

      // Check for regex performance issues
      const regexIssues = this.detectRegexIssuesTypeScript(node, sourceFile, filePath);
      issues.push(...regexIssues);

      // Check for unnecessary computations
      const computationIssues = this.detectUnnecessaryComputationsTypeScript(node, sourceFile, filePath);
      issues.push(...computationIssues);

      ts.forEachChild(node, visit);
    };

    visit(sourceFile);

    return this.buildPerformanceAnalysisResult(issues, complexity);
  }

  async analyzeJavaScriptFile(
    filePath: string,
    ast: t.File,
    complexity?: ComplexityMetrics
  ): Promise<PerformanceAnalysisResult> {
    this.logger.debug(`Analyzing JavaScript file for performance issues: ${filePath}`);

    const issues: PerformanceIssue[] = [];

    traverse(ast, {
      ForStatement: (path) => {
        // Check for nested loops
        const nestedIssues = this.detectNestedLoopsJavaScript(path.node, filePath);
        issues.push(...nestedIssues);

        // Check for inefficient loop patterns
        const loopIssues = this.detectInefficientLoopsJavaScript(path.node, filePath);
        issues.push(...loopIssues);
      },
      WhileStatement: (path) => {
        const whileIssues = this.detectWhileLoopIssuesJavaScript(path.node, filePath);
        issues.push(...whileIssues);
      },
      CallExpression: (path) => {
        // Check for blocking operations
        const blockingIssues = this.detectBlockingOperationsJavaScript(path.node, filePath);
        issues.push(...blockingIssues);

        // Check for DOM access issues
        const domIssues = this.detectDomAccessIssuesJavaScript(path.node, filePath);
        issues.push(...domIssues);

        // Check for database N+1 issues
        const dbIssues = this.detectDatabaseIssuesJavaScript(path.node, filePath);
        issues.push(...dbIssues);
      },
      NewExpression: (path) => {
        // Check for memory-intensive object creation
        const memoryIssues = this.detectMemoryIssuesJavaScript(path.node, filePath);
        issues.push(...memoryIssues);
      },
      RegExpLiteral: (path) => {
        // Check for inefficient regex patterns
        const regexIssues = this.detectRegexIssuesJavaScript(path.node, filePath);
        issues.push(...regexIssues);
      },
    });

    return this.buildPerformanceAnalysisResult(issues, complexity);
  }

  private detectNestedLoopsTypeScript(
    node: ts.Node,
    sourceFile: ts.SourceFile,
    filePath: string
  ): PerformanceIssue[] {
    const issues: PerformanceIssue[] = [];

    if (ts.isForStatement(node) || ts.isForInStatement(node) || ts.isForOfStatement(node)) {
      // Check if this loop contains another loop
      const hasNestedLoop = this.containsNestedLoop(node);
      
      if (hasNestedLoop) {
        issues.push({
          id: `nested-loop-${node.getStart()}`,
          type: PerformanceIssueType.ALGORITHMIC_COMPLEXITY,
          severity: PerformanceSeverity.HIGH,
          title: 'Nested Loop Detected',
          description: 'Nested loops can lead to O(n²) or higher time complexity.',
          location: this.getSourceLocationTypeScript(node, sourceFile, filePath),
          recommendation: 'Consider using more efficient algorithms like hash maps, or optimize the inner loop.',
          estimatedImpact: 'High - O(n²) time complexity',
          confidence: 0.9,
          metadata: {
            loopType: node.kind === ts.SyntaxKind.ForStatement ? 'for' : 'for-in/of',
            nestingLevel: this.calculateNestingLevel(node),
          },
        });
      }
    }

    return issues;
  }

  private detectDomAccessIssuesTypeScript(
    node: ts.Node,
    sourceFile: ts.SourceFile,
    filePath: string
  ): PerformanceIssue[] {
    const issues: PerformanceIssue[] = [];

    if (ts.isCallExpression(node)) {
      const callText = node.expression.getText();
      
      if (callText.includes('document.getElementById') || 
          callText.includes('document.querySelector') ||
          callText.includes('document.getElementsBy')) {
        
        // Check if this DOM access is inside a loop
        if (this.isInsideLoop(node)) {
          issues.push({
            id: `dom-loop-${node.getStart()}`,
            type: PerformanceIssueType.FREQUENT_DOM_ACCESS,
            severity: PerformanceSeverity.MEDIUM,
            title: 'DOM Access in Loop',
            description: 'Frequent DOM queries inside loops can cause performance issues.',
            location: this.getSourceLocationTypeScript(node, sourceFile, filePath),
            recommendation: 'Cache DOM elements outside the loop or use more efficient selectors.',
            estimatedImpact: 'Medium - DOM reflow/repaint overhead',
            confidence: 0.8,
            metadata: {
              domMethod: callText,
              inLoop: true,
            },
          });
        }
      }
    }

    return issues;
  }

  private detectBlockingOperationsTypeScript(
    node: ts.Node,
    sourceFile: ts.SourceFile,
    filePath: string
  ): PerformanceIssue[] {
    const issues: PerformanceIssue[] = [];

    if (ts.isCallExpression(node)) {
      const callText = node.expression.getText();
      
      for (const blockingOp of this.blockingOperations) {
        if (callText.includes(blockingOp)) {
          issues.push({
            id: `blocking-op-${node.getStart()}`,
            type: PerformanceIssueType.BLOCKING_OPERATION,
            severity: PerformanceSeverity.HIGH,
            title: 'Blocking Operation Detected',
            description: `${blockingOp} is a synchronous operation that blocks the event loop.`,
            location: this.getSourceLocationTypeScript(node, sourceFile, filePath),
            recommendation: `Use asynchronous alternatives like ${blockingOp.replace('Sync', '')} with callbacks or promises.`,
            estimatedImpact: 'High - Blocks event loop',
            confidence: 0.9,
            metadata: {
              operation: blockingOp,
              alternative: blockingOp.replace('Sync', ''),
            },
          });
        }
      }
    }

    return issues;
  }

  private detectMemoryIssuesTypeScript(
    node: ts.Node,
    sourceFile: ts.SourceFile,
    filePath: string
  ): PerformanceIssue[] {
    const issues: PerformanceIssue[] = [];

    if (ts.isNewExpression(node)) {
      const text = node.getText();
      
      // Check for large array/buffer creation
      const largeArrayMatch = text.match(/new\s+Array\s*\(\s*(\d+)\s*\)/);
      if (largeArrayMatch && parseInt(largeArrayMatch[1]) > 100000) {
        issues.push({
          id: `large-array-${node.getStart()}`,
          type: PerformanceIssueType.LARGE_OBJECT_CREATION,
          severity: PerformanceSeverity.MEDIUM,
          title: 'Large Array Creation',
          description: `Creating array with ${largeArrayMatch[1]} elements may cause memory issues.`,
          location: this.getSourceLocationTypeScript(node, sourceFile, filePath),
          recommendation: 'Consider using streaming or chunked processing for large datasets.',
          estimatedImpact: `Medium - ${Math.round(parseInt(largeArrayMatch[1]) / 1000)}KB+ memory allocation`,
          confidence: 0.8,
          metadata: {
            size: parseInt(largeArrayMatch[1]),
            type: 'array',
          },
        });
      }
    }

    // Check for potential memory leaks
    if (ts.isVariableDeclaration(node)) {
      const text = node.getText();
      
      if (text.includes('setInterval') && !text.includes('clearInterval')) {
        issues.push({
          id: `memory-leak-${node.getStart()}`,
          type: PerformanceIssueType.MEMORY_LEAK,
          severity: PerformanceSeverity.MEDIUM,
          title: 'Potential Memory Leak',
          description: 'setInterval without corresponding clearInterval may cause memory leaks.',
          location: this.getSourceLocationTypeScript(node, sourceFile, filePath),
          recommendation: 'Always clear intervals with clearInterval() when no longer needed.',
          estimatedImpact: 'Medium - Gradual memory accumulation',
          confidence: 0.7,
          metadata: {
            leakType: 'interval',
          },
        });
      }
    }

    return issues;
  }

  private detectAlgorithmicIssuesTypeScript(
    node: ts.Node,
    sourceFile: ts.SourceFile,
    filePath: string
  ): PerformanceIssue[] {
    const issues: PerformanceIssue[] = [];

    // Check for inefficient array operations
    if (ts.isCallExpression(node)) {
      const callText = node.expression.getText();
      
      if (callText.includes('.indexOf') && this.isInsideLoop(node)) {
        issues.push({
          id: `inefficient-search-${node.getStart()}`,
          type: PerformanceIssueType.ALGORITHMIC_COMPLEXITY,
          severity: PerformanceSeverity.MEDIUM,
          title: 'Inefficient Array Search in Loop',
          description: 'Using indexOf() in a loop results in O(n²) complexity.',
          location: this.getSourceLocationTypeScript(node, sourceFile, filePath),
          recommendation: 'Use Set or Map for O(1) lookups, or sort the array and use binary search.',
          estimatedImpact: 'Medium - O(n²) search complexity',
          confidence: 0.8,
          metadata: {
            method: 'indexOf',
            inLoop: true,
          },
        });
      }

      if (callText.includes('.sort') && this.isInsideLoop(node)) {
        issues.push({
          id: `sort-in-loop-${node.getStart()}`,
          type: PerformanceIssueType.UNNECESSARY_COMPUTATION,
          severity: PerformanceSeverity.HIGH,
          title: 'Array Sorting in Loop',
          description: 'Sorting arrays inside loops is computationally expensive.',
          location: this.getSourceLocationTypeScript(node, sourceFile, filePath),
          recommendation: 'Move sorting outside the loop or use pre-sorted data structures.',
          estimatedImpact: 'High - O(n log n) per iteration',
          confidence: 0.9,
          metadata: {
            operation: 'sort',
            inLoop: true,
          },
        });
      }
    }

    return issues;
  }

  private detectRegexIssuesTypeScript(
    node: ts.Node,
    sourceFile: ts.SourceFile,
    filePath: string
  ): PerformanceIssue[] {
    const issues: PerformanceIssue[] = [];

    if (ts.isRegularExpressionLiteral(node)) {
      const regexText = node.text;
      
      // Check for catastrophic backtracking patterns
      if (regexText.includes('(.*)+') || regexText.includes('(.+)+') || regexText.includes('(\\w*)+')) {
        issues.push({
          id: `regex-backtrack-${node.getStart()}`,
          type: PerformanceIssueType.INEFFICIENT_REGEX,
          severity: PerformanceSeverity.HIGH,
          title: 'Catastrophic Backtracking in Regex',
          description: 'Regex pattern may cause exponential time complexity due to backtracking.',
          location: this.getSourceLocationTypeScript(node, sourceFile, filePath),
          recommendation: 'Rewrite regex to avoid nested quantifiers or use atomic groups.',
          estimatedImpact: 'High - Exponential time complexity',
          confidence: 0.9,
          metadata: {
            pattern: regexText,
            issue: 'catastrophic_backtracking',
          },
        });
      }
    }

    return issues;
  }

  private detectUnnecessaryComputationsTypeScript(
    node: ts.Node,
    sourceFile: ts.SourceFile,
    filePath: string
  ): PerformanceIssue[] {
    const issues: PerformanceIssue[] = [];

    // Check for computations that could be cached
    if (ts.isCallExpression(node) && this.isInsideLoop(node)) {
      const callText = node.expression.getText();
      
      if (callText.includes('Math.') || callText.includes('Date.') || callText.includes('JSON.parse')) {
        issues.push({
          id: `unnecessary-computation-${node.getStart()}`,
          type: PerformanceIssueType.UNNECESSARY_COMPUTATION,
          severity: PerformanceSeverity.MEDIUM,
          title: 'Repeated Computation in Loop',
          description: 'Expensive computation is repeated in every loop iteration.',
          location: this.getSourceLocationTypeScript(node, sourceFile, filePath),
          recommendation: 'Move the computation outside the loop or cache the result.',
          estimatedImpact: 'Medium - Redundant calculations',
          confidence: 0.7,
          metadata: {
            computation: callText,
            inLoop: true,
          },
        });
      }
    }

    return issues;
  }

  // JavaScript-specific detection methods
  private detectNestedLoopsJavaScript(node: t.ForStatement, filePath: string): PerformanceIssue[] {
    const issues: PerformanceIssue[] = [];

    // Check if the for loop body contains another loop
    if (this.containsNestedLoopJavaScript(node.body)) {
      issues.push({
        id: `nested-loop-js-${node.start || 0}`,
        type: PerformanceIssueType.ALGORITHMIC_COMPLEXITY,
        severity: PerformanceSeverity.HIGH,
        title: 'Nested Loop Performance Issue',
        description: 'Nested loops result in quadratic or higher time complexity.',
        location: this.getSourceLocationJavaScript(node, filePath),
        recommendation: 'Consider using hash maps, sets, or other data structures to reduce complexity.',
        estimatedImpact: 'High - O(n²) or worse time complexity',
        confidence: 0.9,
        metadata: {
          loopType: 'for',
          nested: true,
        },
      });
    }

    return issues;
  }

  private detectInefficientLoopsJavaScript(node: t.ForStatement, filePath: string): PerformanceIssue[] {
    const issues: PerformanceIssue[] = [];

    // Check for array.length in loop condition
    if (node.test && t.isBinaryExpression(node.test)) {
      const testText = this.getNodeText(node.test);
      
      if (testText.includes('.length') && !testText.includes('const') && !testText.includes('let')) {
        issues.push({
          id: `length-in-loop-${node.start || 0}`,
          type: PerformanceIssueType.INEFFICIENT_LOOP,
          severity: PerformanceSeverity.LOW,
          title: 'Array Length Accessed in Loop Condition',
          description: 'Accessing array.length in every iteration is inefficient.',
          location: this.getSourceLocationJavaScript(node, filePath),
          recommendation: 'Cache the array length in a variable before the loop.',
          estimatedImpact: 'Low - Minor performance overhead',
          confidence: 0.6,
          metadata: {
            issue: 'length_in_condition',
          },
        });
      }
    }

    return issues;
  }

  private detectWhileLoopIssuesJavaScript(node: t.WhileStatement, filePath: string): PerformanceIssue[] {
    const issues: PerformanceIssue[] = [];

    // Check for potential infinite loops (basic heuristic)
    if (t.isBooleanLiteral(node.test) && node.test.value === true) {
      issues.push({
        id: `infinite-loop-${node.start || 0}`,
        type: PerformanceIssueType.ALGORITHMIC_COMPLEXITY,
        severity: PerformanceSeverity.HIGH,
        title: 'Potential Infinite Loop',
        description: 'While loop with constant true condition may run indefinitely.',
        location: this.getSourceLocationJavaScript(node, filePath),
        recommendation: 'Ensure the loop has a proper exit condition.',
        estimatedImpact: 'High - May cause application freeze',
        confidence: 0.8,
        metadata: {
          condition: 'true',
          risk: 'infinite_loop',
        },
      });
    }

    return issues;
  }

  private detectBlockingOperationsJavaScript(node: t.CallExpression, filePath: string): PerformanceIssue[] {
    const issues: PerformanceIssue[] = [];

    if (t.isIdentifier(node.callee) || t.isMemberExpression(node.callee)) {
      const callText = this.getNodeText(node.callee);
      
      for (const blockingOp of this.blockingOperations) {
        if (callText.includes(blockingOp)) {
          issues.push({
            id: `blocking-js-${node.start || 0}`,
            type: PerformanceIssueType.BLOCKING_OPERATION,
            severity: PerformanceSeverity.HIGH,
            title: 'Synchronous Blocking Operation',
            description: `${blockingOp} blocks the JavaScript event loop.`,
            location: this.getSourceLocationJavaScript(node, filePath),
            recommendation: `Use asynchronous version: ${blockingOp.replace('Sync', '')}`,
            estimatedImpact: 'High - Blocks event loop execution',
            confidence: 0.9,
            metadata: {
              operation: blockingOp,
            },
          });
        }
      }
    }

    return issues;
  }

  private detectDomAccessIssuesJavaScript(node: t.CallExpression, filePath: string): PerformanceIssue[] {
    const issues: PerformanceIssue[] = [];

    if (t.isMemberExpression(node.callee)) {
      const callText = this.getNodeText(node.callee);
      
      if (callText.includes('document.getElementById') || 
          callText.includes('document.querySelector')) {
        issues.push({
          id: `dom-access-js-${node.start || 0}`,
          type: PerformanceIssueType.FREQUENT_DOM_ACCESS,
          severity: PerformanceSeverity.MEDIUM,
          title: 'Frequent DOM Access',
          description: 'Repeated DOM queries can impact performance.',
          location: this.getSourceLocationJavaScript(node, filePath),
          recommendation: 'Cache DOM elements in variables when accessed multiple times.',
          estimatedImpact: 'Medium - DOM query overhead',
          confidence: 0.7,
          metadata: {
            method: callText,
          },
        });
      }
    }

    return issues;
  }

  private detectDatabaseIssuesJavaScript(node: t.CallExpression, filePath: string): PerformanceIssue[] {
    const issues: PerformanceIssue[] = [];

    // Check for potential N+1 query problems
    if (t.isMemberExpression(node.callee)) {
      const callText = this.getNodeText(node.callee);
      
      if ((callText.includes('.find') || callText.includes('.findOne')) && 
          this.isInsideLoopJavaScript(node)) {
        issues.push({
          id: `n-plus-one-${node.start || 0}`,
          type: PerformanceIssueType.DATABASE_N_PLUS_ONE,
          severity: PerformanceSeverity.HIGH,
          title: 'Potential N+1 Query Problem',
          description: 'Database query inside loop may cause N+1 query performance issue.',
          location: this.getSourceLocationJavaScript(node, filePath),
          recommendation: 'Use batch queries, joins, or eager loading to reduce database calls.',
          estimatedImpact: 'High - Multiple database round trips',
          confidence: 0.8,
          metadata: {
            queryMethod: callText,
            inLoop: true,
          },
        });
      }
    }

    return issues;
  }

  private detectMemoryIssuesJavaScript(node: t.NewExpression, filePath: string): PerformanceIssue[] {
    const issues: PerformanceIssue[] = [];

    if (t.isIdentifier(node.callee)) {
      const constructorName = node.callee.name;
      
      if (constructorName === 'Array' && node.arguments.length > 0) {
        const firstArg = node.arguments[0];
        
        if (t.isNumericLiteral(firstArg) && firstArg.value > 100000) {
          issues.push({
            id: `large-array-js-${node.start || 0}`,
            type: PerformanceIssueType.LARGE_OBJECT_CREATION,
            severity: PerformanceSeverity.MEDIUM,
            title: 'Large Array Allocation',
            description: `Creating array with ${firstArg.value} elements uses significant memory.`,
            location: this.getSourceLocationJavaScript(node, filePath),
            recommendation: 'Consider streaming or chunked processing for large datasets.',
            estimatedImpact: `Medium - ~${Math.round(firstArg.value / 1000)}KB memory`,
            confidence: 0.8,
            metadata: {
              size: firstArg.value,
              type: 'array',
            },
          });
        }
      }
    }

    return issues;
  }

  private detectRegexIssuesJavaScript(node: t.RegExpLiteral, filePath: string): PerformanceIssue[] {
    const issues: PerformanceIssue[] = [];

    const pattern = node.pattern;
    
    if (pattern.includes('(.*)+') || pattern.includes('(.+)+')) {
      issues.push({
        id: `regex-js-${node.start || 0}`,
        type: PerformanceIssueType.INEFFICIENT_REGEX,
        severity: PerformanceSeverity.HIGH,
        title: 'Inefficient Regex Pattern',
        description: 'Regex pattern may cause catastrophic backtracking.',
        location: this.getSourceLocationJavaScript(node, filePath),
        recommendation: 'Rewrite regex to avoid nested quantifiers.',
        estimatedImpact: 'High - Exponential time complexity',
        confidence: 0.9,
        metadata: {
          pattern,
        },
      });
    }

    return issues;
  }

  // Helper methods
  private containsNestedLoop(node: ts.Node): boolean {
    let hasNestedLoop = false;
    
    const visit = (child: ts.Node) => {
      if (child !== node && (ts.isForStatement(child) || ts.isForInStatement(child) || 
          ts.isForOfStatement(child) || ts.isWhileStatement(child))) {
        hasNestedLoop = true;
        return;
      }
      ts.forEachChild(child, visit);
    };

    if (ts.isBlock(node) || ts.isStatement(node)) {
      ts.forEachChild(node, visit);
    }

    return hasNestedLoop;
  }

  private containsNestedLoopJavaScript(body: t.Statement): boolean {
    let hasNestedLoop = false;

    traverse(t.file(t.program([body])), {
      ForStatement: () => { hasNestedLoop = true; },
      WhileStatement: () => { hasNestedLoop = true; },
      DoWhileStatement: () => { hasNestedLoop = true; },
    });

    return hasNestedLoop;
  }

  private isInsideLoop(node: ts.Node): boolean {
    let current = node.parent;
    
    while (current) {
      if (ts.isForStatement(current) || ts.isForInStatement(current) || 
          ts.isForOfStatement(current) || ts.isWhileStatement(current) || 
          ts.isDoStatement(current)) {
        return true;
      }
      current = current.parent;
    }
    
    return false;
  }

  private isInsideLoopJavaScript(node: t.Node): boolean {
    // This would need proper parent tracking in a real implementation
    // For now, return false as a placeholder
    return false;
  }

  private calculateNestingLevel(node: ts.Node): number {
    let level = 0;
    let current = node.parent;
    
    while (current) {
      if (ts.isForStatement(current) || ts.isForInStatement(current) || 
          ts.isForOfStatement(current) || ts.isWhileStatement(current)) {
        level++;
      }
      current = current.parent;
    }
    
    return level;
  }

  private getNodeText(node: t.Node): string {
    // Simplified text extraction - in a real implementation, 
    // this would properly reconstruct the source text
    if (t.isIdentifier(node)) {
      return node.name;
    }
    if (t.isMemberExpression(node)) {
      return `${this.getNodeText(node.object)}.${this.getNodeText(node.property)}`;
    }
    return '';
  }

  private buildPerformanceAnalysisResult(
    issues: PerformanceIssue[],
    complexity?: ComplexityMetrics
  ): PerformanceAnalysisResult {
    const summary: PerformanceSummary = {
      totalIssues: issues.length,
      highImpactCount: issues.filter(i => i.severity === PerformanceSeverity.HIGH).length,
      mediumImpactCount: issues.filter(i => i.severity === PerformanceSeverity.MEDIUM).length,
      lowImpactCount: issues.filter(i => i.severity === PerformanceSeverity.LOW).length,
      categories: {},
      complexityScore: complexity?.cyclomatic || 0,
    };

    // Count by category
    issues.forEach(issue => {
      const category = issue.type;
      summary.categories[category] = (summary.categories[category] || 0) + 1;
    });

    // Calculate performance score (0-100, higher is better)
    const performanceScore = Math.max(0, 100 - (
      summary.highImpactCount * 20 + 
      summary.mediumImpactCount * 10 + 
      summary.lowImpactCount * 5 +
      Math.max(0, (complexity?.cyclomatic || 0) - 10) * 2
    ));

    // Generate optimization opportunities
    const optimizationOpportunities = this.generateOptimizationOpportunities(issues);

    return {
      issues,
      summary,
      performanceScore,
      optimizationOpportunities,
    };
  }

  private generateOptimizationOpportunities(issues: PerformanceIssue[]): OptimizationOpportunity[] {
    const opportunities: OptimizationOpportunity[] = [];

    // Group issues by type and suggest optimizations
    const issuesByType = issues.reduce((acc, issue) => {
      acc[issue.type] = (acc[issue.type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    for (const [type, count] of Object.entries(issuesByType)) {
      switch (type) {
        case PerformanceIssueType.ALGORITHMIC_COMPLEXITY:
          opportunities.push({
            type: 'Algorithm Optimization',
            description: `${count} algorithmic complexity issues found. Consider using more efficient data structures.`,
            estimatedGain: '50-90% performance improvement',
            effort: 'medium',
            priority: 9,
          });
          break;
        case PerformanceIssueType.BLOCKING_OPERATION:
          opportunities.push({
            type: 'Async Operations',
            description: `${count} blocking operations found. Convert to asynchronous operations.`,
            estimatedGain: '70-95% responsiveness improvement',
            effort: 'low',
            priority: 10,
          });
          break;
        case PerformanceIssueType.FREQUENT_DOM_ACCESS:
          opportunities.push({
            type: 'DOM Optimization',
            description: `${count} DOM access issues found. Cache DOM elements and batch operations.`,
            estimatedGain: '30-60% DOM performance improvement',
            effort: 'low',
            priority: 7,
          });
          break;
        case PerformanceIssueType.DATABASE_N_PLUS_ONE:
          opportunities.push({
            type: 'Database Optimization',
            description: `${count} potential N+1 query issues found. Use batch queries or eager loading.`,
            estimatedGain: '80-95% database performance improvement',
            effort: 'medium',
            priority: 9,
          });
          break;
      }
    }

    return opportunities.sort((a, b) => b.priority - a.priority);
  }

  private getSourceLocationTypeScript(
    node: ts.Node,
    sourceFile: ts.SourceFile,
    filePath: string
  ): AnalysisSourceLocation {
    const start = sourceFile.getLineAndCharacterOfPosition(node.getStart());
    const end = sourceFile.getLineAndCharacterOfPosition(node.getEnd());

    return {
      start: { line: start.line + 1, column: start.character + 1 },
      end: { line: end.line + 1, column: end.character + 1 },
      filePath,
    };
  }

  private getSourceLocationJavaScript(node: t.Node, filePath: string): AnalysisSourceLocation {
    return {
      start: {
        line: node.loc?.start.line || 1,
        column: node.loc?.start.column || 1,
      },
      end: {
        line: node.loc?.end.line || 1,
        column: node.loc?.end.column || 1,
      },
      filePath,
    };
  }
}
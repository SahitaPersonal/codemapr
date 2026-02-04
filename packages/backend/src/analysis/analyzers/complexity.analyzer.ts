import { Injectable, Logger } from '@nestjs/common';
import * as ts from 'typescript';
import { parse } from '@babel/parser';
import traverse from '@babel/traverse';
import * as t from '@babel/types';

export interface ComplexityMetrics {
  cyclomaticComplexity: number;
  cognitiveComplexity: number;
  maintainabilityIndex: number;
  linesOfCode: number;
  logicalLinesOfCode: number;
  commentLines: number;
  commentRatio: number;
  functionCount: number;
  classCount: number;
  averageFunctionComplexity: number;
  maxFunctionComplexity: number;
  technicalDebtScore: number;
  technicalDebtMinutes: number;
  codeSmells: CodeSmell[];
}

export interface FunctionComplexity {
  name: string;
  cyclomaticComplexity: number;
  cognitiveComplexity: number;
  linesOfCode: number;
  parameters: number;
  nestingDepth: number;
  startLine: number;
  endLine: number;
}

export interface ClassComplexity {
  name: string;
  methods: FunctionComplexity[];
  properties: number;
  linesOfCode: number;
  cohesion: number;
  coupling: number;
  startLine: number;
  endLine: number;
}

export interface CodeSmell {
  type: 'long_method' | 'large_class' | 'long_parameter_list' | 'duplicate_code' | 'complex_method' | 'dead_code' | 'god_class';
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  line: number;
  column?: number;
  functionName?: string;
  className?: string;
  suggestion: string;
}

export interface FileComplexityAnalysis {
  filePath: string;
  metrics: ComplexityMetrics;
  functions: FunctionComplexity[];
  classes: ClassComplexity[];
  issues: CodeSmell[];
  recommendations: string[];
}

@Injectable()
export class ComplexityAnalyzer {
  private readonly logger = new Logger(ComplexityAnalyzer.name);

  /**
   * Analyze complexity for TypeScript files
   */
  analyzeTypeScript(sourceCode: string, filePath: string): FileComplexityAnalysis {
    try {
      const sourceFile = ts.createSourceFile(
        filePath,
        sourceCode,
        ts.ScriptTarget.Latest,
        true
      );

      const functions: FunctionComplexity[] = [];
      const classes: ClassComplexity[] = [];
      const codeSmells: CodeSmell[] = [];

      this.visitTypeScriptNode(sourceFile, functions, classes, codeSmells);

      const metrics = this.calculateFileMetrics(sourceCode, functions, classes, codeSmells);
      const recommendations = this.generateRecommendations(metrics, functions, classes, codeSmells);

      return {
        filePath,
        metrics,
        functions,
        classes,
        issues: codeSmells,
        recommendations,
      };
    } catch (error) {
      this.logger.error(`Error analyzing TypeScript complexity for ${filePath}:`, error);
      return this.createEmptyAnalysis(filePath);
    }
  }

  /**
   * Analyze complexity for JavaScript files
   */
  analyzeJavaScript(sourceCode: string, filePath: string): FileComplexityAnalysis {
    try {
      const ast = parse(sourceCode, {
        sourceType: 'module',
        plugins: ['jsx', 'typescript', 'decorators-legacy', 'classProperties'],
        allowImportExportEverywhere: true,
        allowReturnOutsideFunction: true,
      });

      const functions: FunctionComplexity[] = [];
      const classes: ClassComplexity[] = [];
      const codeSmells: CodeSmell[] = [];

      traverse(ast, {
        Function: (path) => {
          const complexity = this.analyzeBabelFunction(path, sourceCode);
          functions.push(complexity);
          
          // Check for code smells
          this.checkFunctionSmells(complexity, codeSmells);
        },
        ClassDeclaration: (path) => {
          const classComplexity = this.analyzeBabelClass(path, sourceCode);
          classes.push(classComplexity);
          
          // Check for class-related code smells
          this.checkClassSmells(classComplexity, codeSmells);
        },
      });

      const metrics = this.calculateFileMetrics(sourceCode, functions, classes, codeSmells);
      const recommendations = this.generateRecommendations(metrics, functions, classes, codeSmells);

      return {
        filePath,
        metrics,
        functions,
        classes,
        issues: codeSmells,
        recommendations,
      };
    } catch (error) {
      this.logger.error(`Error analyzing JavaScript complexity for ${filePath}:`, error);
      return this.createEmptyAnalysis(filePath);
    }
  }

  private visitTypeScriptNode(
    node: ts.Node,
    functions: FunctionComplexity[],
    classes: ClassComplexity[],
    codeSmells: CodeSmell[]
  ): void {
    if (ts.isFunctionDeclaration(node) || ts.isMethodDeclaration(node) || ts.isArrowFunction(node)) {
      const complexity = this.analyzeTypeScriptFunction(node);
      functions.push(complexity);
      this.checkFunctionSmells(complexity, codeSmells);
    }

    if (ts.isClassDeclaration(node)) {
      const classComplexity = this.analyzeTypeScriptClass(node);
      classes.push(classComplexity);
      this.checkClassSmells(classComplexity, codeSmells);
    }

    ts.forEachChild(node, (child) => {
      this.visitTypeScriptNode(child, functions, classes, codeSmells);
    });
  }

  private analyzeTypeScriptFunction(node: ts.FunctionLikeDeclaration): FunctionComplexity {
    const sourceFile = node.getSourceFile();
    const start = sourceFile.getLineAndCharacterOfPosition(node.getStart());
    const end = sourceFile.getLineAndCharacterOfPosition(node.getEnd());

    const name = this.getFunctionName(node);
    const cyclomaticComplexity = this.calculateCyclomaticComplexity(node);
    const cognitiveComplexity = this.calculateCognitiveComplexity(node);
    const linesOfCode = end.line - start.line + 1;
    const parameters = node.parameters?.length || 0;
    const nestingDepth = this.calculateNestingDepth(node);

    return {
      name,
      cyclomaticComplexity,
      cognitiveComplexity,
      linesOfCode,
      parameters,
      nestingDepth,
      startLine: start.line + 1,
      endLine: end.line + 1,
    };
  }

  private analyzeTypeScriptClass(node: ts.ClassDeclaration): ClassComplexity {
    const sourceFile = node.getSourceFile();
    const start = sourceFile.getLineAndCharacterOfPosition(node.getStart());
    const end = sourceFile.getLineAndCharacterOfPosition(node.getEnd());

    const name = node.name?.text || 'Anonymous';
    const methods: FunctionComplexity[] = [];
    let properties = 0;

    node.members.forEach((member) => {
      if (ts.isMethodDeclaration(member) || ts.isConstructorDeclaration(member)) {
        methods.push(this.analyzeTypeScriptFunction(member));
      } else if (ts.isPropertyDeclaration(member)) {
        properties++;
      }
    });

    const linesOfCode = end.line - start.line + 1;
    const cohesion = this.calculateCohesion(methods);
    const coupling = this.calculateCoupling(node);

    return {
      name,
      methods,
      properties,
      linesOfCode,
      cohesion,
      coupling,
      startLine: start.line + 1,
      endLine: end.line + 1,
    };
  }

  private analyzeBabelFunction(path: any, sourceCode: string): FunctionComplexity {
    const node = path.node;
    const loc = node.loc;
    
    const name = this.getBabelFunctionName(node);
    const cyclomaticComplexity = this.calculateBabelCyclomaticComplexity(path);
    const cognitiveComplexity = this.calculateBabelCognitiveComplexity(path);
    const linesOfCode = loc ? loc.end.line - loc.start.line + 1 : 0;
    const parameters = node.params?.length || 0;
    const nestingDepth = this.calculateBabelNestingDepth(path);

    return {
      name,
      cyclomaticComplexity,
      cognitiveComplexity,
      linesOfCode,
      parameters,
      nestingDepth,
      startLine: loc?.start.line || 0,
      endLine: loc?.end.line || 0,
    };
  }

  private analyzeBabelClass(path: any, sourceCode: string): ClassComplexity {
    const node = path.node;
    const loc = node.loc;
    
    const name = node.id?.name || 'Anonymous';
    const methods: FunctionComplexity[] = [];
    let properties = 0;

    // Analyze class methods
    path.traverse({
      ClassMethod: (methodPath: any) => {
        if (methodPath.parent === node) {
          methods.push(this.analyzeBabelFunction(methodPath, sourceCode));
        }
      },
      ClassProperty: (propPath: any) => {
        if (propPath.parent === node) {
          properties++;
        }
      },
    });

    const linesOfCode = loc ? loc.end.line - loc.start.line + 1 : 0;
    const cohesion = this.calculateCohesion(methods);
    const coupling = 0; // Simplified for Babel analysis

    return {
      name,
      methods,
      properties,
      linesOfCode,
      cohesion,
      coupling,
      startLine: loc?.start.line || 0,
      endLine: loc?.end.line || 0,
    };
  }

  private calculateCyclomaticComplexity(node: ts.Node): number {
    let complexity = 1; // Base complexity

    const visit = (n: ts.Node) => {
      // Decision points that increase complexity
      if (
        ts.isIfStatement(n) ||
        ts.isConditionalExpression(n) ||
        ts.isWhileStatement(n) ||
        ts.isDoStatement(n) ||
        ts.isForStatement(n) ||
        ts.isForInStatement(n) ||
        ts.isForOfStatement(n) ||
        ts.isSwitchStatement(n) ||
        ts.isCatchClause(n) ||
        (ts.isBinaryExpression(n) && (n.operatorToken.kind === ts.SyntaxKind.AmpersandAmpersandToken || n.operatorToken.kind === ts.SyntaxKind.BarBarToken))
      ) {
        complexity++;
      }

      // Case statements in switch
      if (ts.isCaseClause(n)) {
        complexity++;
      }

      ts.forEachChild(n, visit);
    };

    if (node) {
      ts.forEachChild(node, visit);
    }

    return complexity;
  }

  private calculateBabelCyclomaticComplexity(path: any): number {
    let complexity = 1;

    path.traverse({
      IfStatement: () => { complexity++; },
      ConditionalExpression: () => { complexity++; },
      WhileStatement: () => { complexity++; },
      DoWhileStatement: () => { complexity++; },
      ForStatement: () => { complexity++; },
      ForInStatement: () => { complexity++; },
      ForOfStatement: () => { complexity++; },
      SwitchCase: () => { complexity++; },
      CatchClause: () => { complexity++; },
      LogicalExpression: (logicalPath: any) => {
        if (logicalPath.node.operator === '&&' || logicalPath.node.operator === '||') {
          complexity++;
        }
      },
    });

    return complexity;
  }

  private calculateCognitiveComplexity(node: ts.Node): number {
    let complexity = 0;
    let nestingLevel = 0;

    const visit = (n: ts.Node, nesting: number) => {
      // Increment for control flow structures
      if (ts.isIfStatement(n) || ts.isConditionalExpression(n)) {
        complexity += 1 + nesting;
      } else if (ts.isWhileStatement(n) || ts.isDoStatement(n) || ts.isForStatement(n) || ts.isForInStatement(n) || ts.isForOfStatement(n)) {
        complexity += 1 + nesting;
        nesting++;
      } else if (ts.isSwitchStatement(n)) {
        complexity += 1 + nesting;
        nesting++;
      } else if (ts.isCatchClause(n)) {
        complexity += 1 + nesting;
        nesting++;
      }

      ts.forEachChild(n, (child) => visit(child, nesting));
    };

    if (node) {
      ts.forEachChild(node, (child) => visit(child, nestingLevel));
    }

    return complexity;
  }

  private calculateBabelCognitiveComplexity(path: any): number {
    let complexity = 0;

    path.traverse({
      IfStatement: (ifPath: any) => {
        complexity += 1 + this.getBabelNestingLevel(ifPath);
      },
      ConditionalExpression: (condPath: any) => {
        complexity += 1 + this.getBabelNestingLevel(condPath);
      },
      WhileStatement: (whilePath: any) => {
        complexity += 1 + this.getBabelNestingLevel(whilePath);
      },
      DoWhileStatement: (doPath: any) => {
        complexity += 1 + this.getBabelNestingLevel(doPath);
      },
      ForStatement: (forPath: any) => {
        complexity += 1 + this.getBabelNestingLevel(forPath);
      },
      SwitchStatement: (switchPath: any) => {
        complexity += 1 + this.getBabelNestingLevel(switchPath);
      },
    });

    return complexity;
  }

  private calculateNestingDepth(node: ts.Node): number {
    let maxDepth = 0;

    const visit = (n: ts.Node, depth: number) => {
      maxDepth = Math.max(maxDepth, depth);

      if (
        ts.isBlock(n) ||
        ts.isIfStatement(n) ||
        ts.isWhileStatement(n) ||
        ts.isDoStatement(n) ||
        ts.isForStatement(n) ||
        ts.isForInStatement(n) ||
        ts.isForOfStatement(n) ||
        ts.isSwitchStatement(n)
      ) {
        depth++;
      }

      ts.forEachChild(n, (child) => visit(child, depth));
    };

    if (node) {
      ts.forEachChild(node, (child) => visit(child, 0));
    }

    return maxDepth;
  }

  private calculateBabelNestingDepth(path: any): number {
    let maxDepth = 0;
    let currentDepth = 0;

    path.traverse({
      enter: (innerPath: any) => {
        if (
          innerPath.isBlockStatement() ||
          innerPath.isIfStatement() ||
          innerPath.isWhileStatement() ||
          innerPath.isDoWhileStatement() ||
          innerPath.isForStatement() ||
          innerPath.isSwitchStatement()
        ) {
          currentDepth++;
          maxDepth = Math.max(maxDepth, currentDepth);
        }
      },
      exit: (innerPath: any) => {
        if (
          innerPath.isBlockStatement() ||
          innerPath.isIfStatement() ||
          innerPath.isWhileStatement() ||
          innerPath.isDoWhileStatement() ||
          innerPath.isForStatement() ||
          innerPath.isSwitchStatement()
        ) {
          currentDepth--;
        }
      },
    });

    return maxDepth;
  }

  private getBabelNestingLevel(path: any): number {
    let level = 0;
    let parent = path.parent;

    while (parent) {
      if (
        t.isIfStatement(parent) ||
        t.isWhileStatement(parent) ||
        t.isDoWhileStatement(parent) ||
        t.isForStatement(parent) ||
        t.isSwitchStatement(parent)
      ) {
        level++;
      }
      parent = path.parentPath?.parent;
      path = path.parentPath;
    }

    return level;
  }

  private calculateFileMetrics(
    sourceCode: string,
    functions: FunctionComplexity[],
    classes: ClassComplexity[],
    codeSmells: CodeSmell[]
  ): ComplexityMetrics {
    const lines = sourceCode.split('\n');
    const linesOfCode = lines.length;
    const logicalLinesOfCode = lines.filter(line => line.trim() && !line.trim().startsWith('//')).length;
    const commentLines = lines.filter(line => line.trim().startsWith('//') || line.trim().startsWith('/*')).length;
    const commentRatio = linesOfCode > 0 ? commentLines / linesOfCode : 0;

    const totalCyclomaticComplexity = functions.reduce((sum, fn) => sum + fn.cyclomaticComplexity, 0);
    const totalCognitiveComplexity = functions.reduce((sum, fn) => sum + fn.cognitiveComplexity, 0);
    const averageFunctionComplexity = functions.length > 0 ? totalCyclomaticComplexity / functions.length : 0;
    const maxFunctionComplexity = functions.length > 0 ? Math.max(...functions.map(fn => fn.cyclomaticComplexity)) : 0;

    // Maintainability Index calculation (simplified version)
    const maintainabilityIndex = Math.max(0, 
      171 - 5.2 * Math.log(logicalLinesOfCode) - 0.23 * totalCyclomaticComplexity - 16.2 * Math.log(logicalLinesOfCode)
    );

    // Technical debt calculation
    const technicalDebtScore = this.calculateTechnicalDebtScore(functions, classes, codeSmells);
    const technicalDebtMinutes = this.calculateTechnicalDebtMinutes(technicalDebtScore, linesOfCode);

    return {
      cyclomaticComplexity: totalCyclomaticComplexity,
      cognitiveComplexity: totalCognitiveComplexity,
      maintainabilityIndex,
      linesOfCode,
      logicalLinesOfCode,
      commentLines,
      commentRatio,
      functionCount: functions.length,
      classCount: classes.length,
      averageFunctionComplexity,
      maxFunctionComplexity,
      technicalDebtScore,
      technicalDebtMinutes,
      codeSmells,
    };
  }

  private calculateTechnicalDebtScore(
    functions: FunctionComplexity[],
    classes: ClassComplexity[],
    codeSmells: CodeSmell[]
  ): number {
    let score = 0;

    // Function complexity penalties
    functions.forEach(fn => {
      if (fn.cyclomaticComplexity > 10) score += (fn.cyclomaticComplexity - 10) * 2;
      if (fn.linesOfCode > 50) score += (fn.linesOfCode - 50) * 0.5;
      if (fn.parameters > 5) score += (fn.parameters - 5) * 3;
      if (fn.nestingDepth > 4) score += (fn.nestingDepth - 4) * 5;
    });

    // Class complexity penalties
    classes.forEach(cls => {
      if (cls.methods.length > 20) score += (cls.methods.length - 20) * 2;
      if (cls.linesOfCode > 500) score += (cls.linesOfCode - 500) * 0.1;
      if (cls.properties > 15) score += (cls.properties - 15) * 1;
    });

    // Code smell penalties
    codeSmells.forEach(smell => {
      switch (smell.severity) {
        case 'critical': score += 20; break;
        case 'high': score += 10; break;
        case 'medium': score += 5; break;
        case 'low': score += 2; break;
      }
    });

    return Math.round(score);
  }

  private calculateTechnicalDebtMinutes(score: number, linesOfCode: number): number {
    // Rough estimation: 1 point = 5 minutes of refactoring time
    const baseMinutes = score * 5;
    
    // Adjust based on code size
    const sizeMultiplier = Math.log10(linesOfCode + 1) / 2;
    
    return Math.round(baseMinutes * sizeMultiplier);
  }

  private checkFunctionSmells(func: FunctionComplexity, codeSmells: CodeSmell[]): void {
    // Long method
    if (func.linesOfCode > 50) {
      codeSmells.push({
        type: 'long_method',
        severity: func.linesOfCode > 100 ? 'high' : 'medium',
        message: `Method '${func.name}' is too long (${func.linesOfCode} lines)`,
        line: func.startLine,
        functionName: func.name,
        suggestion: 'Consider breaking this method into smaller, more focused methods',
      });
    }

    // Complex method
    if (func.cyclomaticComplexity > 10) {
      codeSmells.push({
        type: 'complex_method',
        severity: func.cyclomaticComplexity > 20 ? 'critical' : 'high',
        message: `Method '${func.name}' has high cyclomatic complexity (${func.cyclomaticComplexity})`,
        line: func.startLine,
        functionName: func.name,
        suggestion: 'Reduce complexity by extracting conditions into separate methods or using polymorphism',
      });
    }

    // Long parameter list
    if (func.parameters > 5) {
      codeSmells.push({
        type: 'long_parameter_list',
        severity: func.parameters > 8 ? 'high' : 'medium',
        message: `Method '${func.name}' has too many parameters (${func.parameters})`,
        line: func.startLine,
        functionName: func.name,
        suggestion: 'Consider using parameter objects or builder pattern to reduce parameter count',
      });
    }
  }

  private checkClassSmells(cls: ClassComplexity, codeSmells: CodeSmell[]): void {
    // Large class
    if (cls.linesOfCode > 500) {
      codeSmells.push({
        type: 'large_class',
        severity: cls.linesOfCode > 1000 ? 'critical' : 'high',
        message: `Class '${cls.name}' is too large (${cls.linesOfCode} lines)`,
        line: cls.startLine,
        className: cls.name,
        suggestion: 'Consider splitting this class into smaller, more cohesive classes',
      });
    }

    // God class (too many methods)
    if (cls.methods.length > 20) {
      codeSmells.push({
        type: 'god_class',
        severity: cls.methods.length > 30 ? 'critical' : 'high',
        message: `Class '${cls.name}' has too many methods (${cls.methods.length})`,
        line: cls.startLine,
        className: cls.name,
        suggestion: 'Consider using composition or extracting functionality into separate classes',
      });
    }
  }

  private calculateCohesion(methods: FunctionComplexity[]): number {
    // Simplified cohesion calculation
    if (methods.length === 0) return 1;
    
    const avgComplexity = methods.reduce((sum, m) => sum + m.cyclomaticComplexity, 0) / methods.length;
    const variance = methods.reduce((sum, m) => sum + Math.pow(m.cyclomaticComplexity - avgComplexity, 2), 0) / methods.length;
    
    // Lower variance indicates higher cohesion
    return Math.max(0, 1 - (variance / 100));
  }

  private calculateCoupling(node: ts.ClassDeclaration): number {
    // Simplified coupling calculation based on imports and dependencies
    let coupling = 0;
    
    const visit = (n: ts.Node) => {
      if (ts.isCallExpression(n) || ts.isNewExpression(n)) {
        coupling++;
      }
      ts.forEachChild(n, visit);
    };

    ts.forEachChild(node, visit);
    return Math.min(coupling / 10, 1); // Normalize to 0-1 range
  }

  private generateRecommendations(
    metrics: ComplexityMetrics,
    functions: FunctionComplexity[],
    classes: ClassComplexity[],
    codeSmells: CodeSmell[]
  ): string[] {
    const recommendations: string[] = [];

    if (metrics.maintainabilityIndex < 20) {
      recommendations.push('Critical: Maintainability index is very low. Consider major refactoring.');
    } else if (metrics.maintainabilityIndex < 50) {
      recommendations.push('Warning: Maintainability index is low. Refactoring recommended.');
    }

    if (metrics.averageFunctionComplexity > 10) {
      recommendations.push('Reduce average function complexity by breaking down complex methods.');
    }

    if (metrics.commentRatio < 0.1) {
      recommendations.push('Add more comments to improve code documentation.');
    }

    if (codeSmells.filter(s => s.severity === 'critical').length > 0) {
      recommendations.push('Address critical code smells immediately to prevent technical debt accumulation.');
    }

    if (metrics.technicalDebtMinutes > 480) { // 8 hours
      recommendations.push('High technical debt detected. Schedule dedicated refactoring time.');
    }

    return recommendations;
  }

  private getFunctionName(node: ts.FunctionLikeDeclaration): string {
    if (ts.isFunctionDeclaration(node) && node.name) {
      return node.name.text;
    }
    if (ts.isMethodDeclaration(node) && node.name) {
      return ts.isIdentifier(node.name) ? node.name.text : 'method';
    }
    if (ts.isConstructorDeclaration(node)) {
      return 'constructor';
    }
    return 'anonymous';
  }

  private getBabelFunctionName(node: any): string {
    if (node.id && node.id.name) {
      return node.id.name;
    }
    if (node.key && node.key.name) {
      return node.key.name;
    }
    if (t.isArrowFunctionExpression(node)) {
      return 'arrow function';
    }
    return 'anonymous';
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
}
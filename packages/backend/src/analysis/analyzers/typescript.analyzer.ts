import { Injectable, Logger } from '@nestjs/common';
import * as ts from 'typescript';
import {
  FileAnalysis,
  SupportedLanguage,
  Symbol,
  SymbolType,
  ImportDeclaration,
  ExportDeclaration,
  FunctionDeclaration,
  ClassDeclaration,
  PropertyDeclaration,
  Parameter,
  ImportSpecifier,
  AnalysisSourceLocation,
  AnalysisPosition,
  ComplexityMetrics,
} from '@codemapr/shared';
import { ServiceAnalyzer } from './service.analyzer';

@Injectable()
export class TypeScriptAnalyzer {
  private readonly logger = new Logger(TypeScriptAnalyzer.name);

  constructor(private readonly serviceAnalyzer: ServiceAnalyzer) {}

  async analyzeFile(filePath: string, content: string): Promise<FileAnalysis> {
    this.logger.debug(`Analyzing TypeScript file: ${filePath}`);

    try {
      // Create TypeScript source file
      const sourceFile = ts.createSourceFile(
        filePath,
        content,
        ts.ScriptTarget.Latest,
        true
      );

      // Extract all symbols, imports, exports, functions, and classes
      const symbols: Symbol[] = [];
      const imports: ImportDeclaration[] = [];
      const exports: ExportDeclaration[] = [];
      const functions: FunctionDeclaration[] = [];
      const classes: ClassDeclaration[] = [];

      // Walk the AST and extract information
      const visit = (node: ts.Node) => {
        switch (node.kind) {
          case ts.SyntaxKind.ImportDeclaration:
            imports.push(this.extractImportDeclaration(node as ts.ImportDeclaration, sourceFile));
            break;
          case ts.SyntaxKind.ExportDeclaration:
          case ts.SyntaxKind.ExportAssignment:
            exports.push(this.extractExportDeclaration(node, sourceFile));
            break;
          case ts.SyntaxKind.FunctionDeclaration:
            functions.push(this.extractFunctionDeclaration(node as ts.FunctionDeclaration, sourceFile));
            break;
          case ts.SyntaxKind.ClassDeclaration:
            classes.push(this.extractClassDeclaration(node as ts.ClassDeclaration, sourceFile));
            break;
          case ts.SyntaxKind.VariableDeclaration:
          case ts.SyntaxKind.PropertyDeclaration:
          case ts.SyntaxKind.MethodDeclaration:
            symbols.push(this.extractSymbol(node, sourceFile));
            break;
        }
        ts.forEachChild(node, visit);
      };

      visit(sourceFile);

      // Calculate complexity metrics
      const complexity = this.calculateComplexity(sourceFile);

      // Analyze service calls
      const serviceDetection = await this.serviceAnalyzer.analyzeTypeScriptFile(filePath, sourceFile);

      return {
        filePath,
        language: this.getLanguageFromPath(filePath),
        ast: sourceFile,
        symbols,
        imports,
        exports,
        functions,
        classes,
        complexity,
        serviceCalls: serviceDetection.serviceCalls,
        externalServices: serviceDetection.externalServices,
        databaseOperations: serviceDetection.databaseOperations,
      };
    } catch (error) {
      this.logger.error(`Failed to analyze TypeScript file ${filePath}:`, error);
      throw error;
    }
  }

  private extractImportDeclaration(node: ts.ImportDeclaration, sourceFile: ts.SourceFile): ImportDeclaration {
    const moduleSpecifier = node.moduleSpecifier as ts.StringLiteral;
    const specifiers: ImportSpecifier[] = [];

    if (node.importClause) {
      // Default import
      if (node.importClause.name) {
        specifiers.push({
          imported: 'default',
          local: node.importClause.name.text,
        });
      }

      // Named imports
      if (node.importClause.namedBindings) {
        if (ts.isNamedImports(node.importClause.namedBindings)) {
          node.importClause.namedBindings.elements.forEach((element) => {
            specifiers.push({
              imported: element.propertyName?.text || element.name.text,
              local: element.name.text,
            });
          });
        } else if (ts.isNamespaceImport(node.importClause.namedBindings)) {
          specifiers.push({
            imported: '*',
            local: node.importClause.namedBindings.name.text,
          });
        }
      }
    }

    return {
      source: moduleSpecifier.text,
      specifiers,
      isDynamic: false,
      location: this.getSourceLocation(node, sourceFile),
    };
  }

  private extractExportDeclaration(node: ts.Node, sourceFile: ts.SourceFile): ExportDeclaration {
    let name = 'unknown';
    let type: 'default' | 'named' = 'named';

    if (ts.isExportDeclaration(node)) {
      if (node.exportClause && ts.isNamedExports(node.exportClause)) {
        name = node.exportClause.elements.map(e => e.name.text).join(', ');
      }
    } else if (ts.isExportAssignment(node)) {
      type = 'default';
      name = 'default';
    }

    return {
      name,
      type,
      location: this.getSourceLocation(node, sourceFile),
    };
  }

  private extractFunctionDeclaration(node: ts.FunctionDeclaration, sourceFile: ts.SourceFile): FunctionDeclaration {
    const parameters: Parameter[] = node.parameters.map((param) => ({
      name: param.name.getText(),
      type: param.type?.getText(),
      optional: !!param.questionToken,
      defaultValue: param.initializer?.getText(),
    }));

    return {
      name: node.name?.text || 'anonymous',
      parameters,
      returnType: node.type?.getText(),
      isAsync: !!node.modifiers?.some(m => m.kind === ts.SyntaxKind.AsyncKeyword),
      location: this.getSourceLocation(node, sourceFile),
      complexity: this.calculateFunctionComplexity(node),
    };
  }

  private extractClassDeclaration(node: ts.ClassDeclaration, sourceFile: ts.SourceFile): ClassDeclaration {
    const methods: FunctionDeclaration[] = [];
    const properties: PropertyDeclaration[] = [];

    node.members.forEach((member) => {
      if (ts.isMethodDeclaration(member)) {
        methods.push(this.extractMethodDeclaration(member, sourceFile));
      } else if (ts.isPropertyDeclaration(member)) {
        properties.push(this.extractPropertyDeclaration(member, sourceFile));
      }
    });

    return {
      name: node.name?.text || 'anonymous',
      extends: node.heritageClauses?.find(h => h.token === ts.SyntaxKind.ExtendsKeyword)?.types[0]?.getText(),
      implements: node.heritageClauses?.find(h => h.token === ts.SyntaxKind.ImplementsKeyword)?.types.map(t => t.getText()),
      methods,
      properties,
      location: this.getSourceLocation(node, sourceFile),
    };
  }

  private extractMethodDeclaration(node: ts.MethodDeclaration, sourceFile: ts.SourceFile): FunctionDeclaration {
    const parameters: Parameter[] = node.parameters.map((param) => ({
      name: param.name.getText(),
      type: param.type?.getText(),
      optional: !!param.questionToken,
      defaultValue: param.initializer?.getText(),
    }));

    return {
      name: node.name.getText(),
      parameters,
      returnType: node.type?.getText(),
      isAsync: !!node.modifiers?.some(m => m.kind === ts.SyntaxKind.AsyncKeyword),
      location: this.getSourceLocation(node, sourceFile),
      complexity: this.calculateFunctionComplexity(node),
    };
  }

  private extractPropertyDeclaration(node: ts.PropertyDeclaration, sourceFile: ts.SourceFile): PropertyDeclaration {
    return {
      name: node.name.getText(),
      type: node.type?.getText(),
      isStatic: !!node.modifiers?.some(m => m.kind === ts.SyntaxKind.StaticKeyword),
      visibility: this.getVisibility(node),
      location: this.getSourceLocation(node, sourceFile),
    };
  }

  private extractSymbol(node: ts.Node, sourceFile: ts.SourceFile): Symbol {
    let name = 'unknown';
    let type = SymbolType.VARIABLE;

    if (ts.isVariableDeclaration(node)) {
      name = node.name.getText();
      type = SymbolType.VARIABLE;
    } else if (ts.isPropertyDeclaration(node)) {
      name = node.name.getText();
      type = SymbolType.VARIABLE;
    } else if (ts.isMethodDeclaration(node)) {
      name = node.name.getText();
      type = SymbolType.FUNCTION;
    }

    return {
      id: `${sourceFile.fileName}:${name}`,
      name,
      type,
      location: this.getSourceLocation(node, sourceFile),
      references: [], // Would be populated by cross-file analysis
    };
  }

  private getSourceLocation(node: ts.Node, sourceFile: ts.SourceFile): AnalysisSourceLocation {
    const start = sourceFile.getLineAndCharacterOfPosition(node.getStart());
    const end = sourceFile.getLineAndCharacterOfPosition(node.getEnd());

    return {
      start: { line: start.line + 1, column: start.character + 1 },
      end: { line: end.line + 1, column: end.character + 1 },
      filePath: sourceFile.fileName,
    };
  }

  private getVisibility(node: ts.PropertyDeclaration): 'public' | 'private' | 'protected' {
    if (node.modifiers?.some(m => m.kind === ts.SyntaxKind.PrivateKeyword)) return 'private';
    if (node.modifiers?.some(m => m.kind === ts.SyntaxKind.ProtectedKeyword)) return 'protected';
    return 'public';
  }

  private getLanguageFromPath(filePath: string): SupportedLanguage {
    if (filePath.endsWith('.tsx')) return SupportedLanguage.TSX;
    if (filePath.endsWith('.ts')) return SupportedLanguage.TYPESCRIPT;
    if (filePath.endsWith('.jsx')) return SupportedLanguage.JSX;
    return SupportedLanguage.JAVASCRIPT;
  }

  private calculateComplexity(sourceFile: ts.SourceFile): ComplexityMetrics {
    let cyclomatic = 1; // Base complexity
    let cognitive = 0;

    const visit = (node: ts.Node) => {
      // Cyclomatic complexity
      switch (node.kind) {
        case ts.SyntaxKind.IfStatement:
        case ts.SyntaxKind.WhileStatement:
        case ts.SyntaxKind.ForStatement:
        case ts.SyntaxKind.ForInStatement:
        case ts.SyntaxKind.ForOfStatement:
        case ts.SyntaxKind.DoStatement:
        case ts.SyntaxKind.SwitchStatement:
        case ts.SyntaxKind.CatchClause:
        case ts.SyntaxKind.ConditionalExpression:
          cyclomatic++;
          cognitive++;
          break;
        case ts.SyntaxKind.CaseClause:
          cyclomatic++;
          break;
      }

      ts.forEachChild(node, visit);
    };

    visit(sourceFile);

    return {
      cyclomatic,
      cognitive,
      maintainability: Math.max(0, 171 - 5.2 * Math.log(cyclomatic) - 0.23 * cognitive),
      technicalDebt: cyclomatic > 10 ? cyclomatic - 10 : 0,
    };
  }

  private calculateFunctionComplexity(node: ts.FunctionDeclaration | ts.MethodDeclaration): number {
    let complexity = 1;

    const visit = (n: ts.Node) => {
      switch (n.kind) {
        case ts.SyntaxKind.IfStatement:
        case ts.SyntaxKind.WhileStatement:
        case ts.SyntaxKind.ForStatement:
        case ts.SyntaxKind.ForInStatement:
        case ts.SyntaxKind.ForOfStatement:
        case ts.SyntaxKind.DoStatement:
        case ts.SyntaxKind.SwitchStatement:
        case ts.SyntaxKind.CatchClause:
        case ts.SyntaxKind.ConditionalExpression:
        case ts.SyntaxKind.CaseClause:
          complexity++;
          break;
      }
      ts.forEachChild(n, visit);
    };

    if (node.body) {
      visit(node.body);
    }

    return complexity;
  }
}
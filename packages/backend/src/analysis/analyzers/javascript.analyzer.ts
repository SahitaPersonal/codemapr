import { Injectable, Logger } from '@nestjs/common';
import { parse } from '@babel/parser';
import traverse from '@babel/traverse';
import * as t from '@babel/types';
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
  ComplexityMetrics,
} from '@codemapr/shared';

@Injectable()
export class JavaScriptAnalyzer {
  private readonly logger = new Logger(JavaScriptAnalyzer.name);

  async analyzeFile(filePath: string, content: string): Promise<FileAnalysis> {
    this.logger.debug(`Analyzing JavaScript file: ${filePath}`);

    try {
      // Parse JavaScript/JSX with Babel
      const ast = parse(content, {
        sourceType: 'module',
        allowImportExportEverywhere: true,
        allowReturnOutsideFunction: true,
        plugins: [
          'jsx',
          'typescript',
          'decorators-legacy',
          'classProperties',
          'objectRestSpread',
          'functionBind',
          'exportDefaultFrom',
          'exportNamespaceFrom',
          'dynamicImport',
          'nullishCoalescingOperator',
          'optionalChaining',
        ],
      });

      const symbols: Symbol[] = [];
      const imports: ImportDeclaration[] = [];
      const exports: ExportDeclaration[] = [];
      const functions: FunctionDeclaration[] = [];
      const classes: ClassDeclaration[] = [];

      // Traverse AST and extract information
      traverse(ast, {
        ImportDeclaration: (path) => {
          imports.push(this.extractImportDeclaration(path.node, filePath));
        },
        ExportNamedDeclaration: (path) => {
          exports.push(this.extractExportDeclaration(path.node, filePath, 'named'));
        },
        ExportDefaultDeclaration: (path) => {
          exports.push(this.extractExportDeclaration(path.node, filePath, 'default'));
        },
        FunctionDeclaration: (path) => {
          functions.push(this.extractFunctionDeclaration(path.node, filePath));
        },
        ArrowFunctionExpression: (path) => {
          if (t.isVariableDeclarator(path.parent) && t.isIdentifier(path.parent.id)) {
            functions.push(this.extractArrowFunction(path.node, path.parent.id.name, filePath));
          }
        },
        ClassDeclaration: (path) => {
          classes.push(this.extractClassDeclaration(path.node, filePath));
        },
        VariableDeclarator: (path) => {
          if (t.isIdentifier(path.node.id)) {
            symbols.push(this.extractVariableSymbol(path.node, filePath));
          }
        },
      });

      // Calculate complexity metrics
      const complexity = this.calculateComplexity(ast);

      return {
        filePath,
        language: this.getLanguageFromPath(filePath),
        ast,
        symbols,
        imports,
        exports,
        functions,
        classes,
        complexity,
      };
    } catch (error) {
      this.logger.error(`Failed to analyze JavaScript file ${filePath}:`, error);
      throw error;
    }
  }

  private extractImportDeclaration(node: t.ImportDeclaration, filePath: string): ImportDeclaration {
    const specifiers: ImportSpecifier[] = [];

    node.specifiers.forEach((spec) => {
      if (t.isImportDefaultSpecifier(spec)) {
        specifiers.push({
          imported: 'default',
          local: spec.local.name,
        });
      } else if (t.isImportSpecifier(spec)) {
        specifiers.push({
          imported: t.isIdentifier(spec.imported) ? spec.imported.name : spec.imported.value,
          local: spec.local.name,
        });
      } else if (t.isImportNamespaceSpecifier(spec)) {
        specifiers.push({
          imported: '*',
          local: spec.local.name,
        });
      }
    });

    return {
      source: node.source.value,
      specifiers,
      isDynamic: false,
      location: this.getSourceLocation(node, filePath),
    };
  }

  private extractExportDeclaration(
    node: t.ExportNamedDeclaration | t.ExportDefaultDeclaration,
    filePath: string,
    type: 'named' | 'default'
  ): ExportDeclaration {
    let name = 'unknown';

    if (t.isExportDefaultDeclaration(node)) {
      name = 'default';
    } else if (t.isExportNamedDeclaration(node)) {
      if (node.specifiers.length > 0) {
        name = node.specifiers
          .map((spec) => (t.isExportSpecifier(spec) ? 
            (t.isIdentifier(spec.exported) ? spec.exported.name : spec.exported.value) : 'unknown'))
          .join(', ');
      } else if (node.declaration) {
        if (t.isFunctionDeclaration(node.declaration) && node.declaration.id) {
          name = node.declaration.id.name;
        } else if (t.isClassDeclaration(node.declaration) && node.declaration.id) {
          name = node.declaration.id.name;
        }
      }
    }

    return {
      name,
      type,
      location: this.getSourceLocation(node, filePath),
    };
  }

  private extractFunctionDeclaration(node: t.FunctionDeclaration, filePath: string): FunctionDeclaration {
    const parameters: Parameter[] = node.params.map((param) => {
      if (t.isIdentifier(param)) {
        return {
          name: param.name,
          optional: false,
        };
      } else if (t.isAssignmentPattern(param) && t.isIdentifier(param.left)) {
        return {
          name: param.left.name,
          optional: true,
          defaultValue: this.getNodeText(param.right),
        };
      }
      return {
        name: 'unknown',
        optional: false,
      };
    });

    return {
      name: node.id?.name || 'anonymous',
      parameters,
      isAsync: node.async,
      location: this.getSourceLocation(node, filePath),
      complexity: this.calculateFunctionComplexity(node.body),
    };
  }

  private extractArrowFunction(node: t.ArrowFunctionExpression, name: string, filePath: string): FunctionDeclaration {
    const parameters: Parameter[] = node.params.map((param) => {
      if (t.isIdentifier(param)) {
        return {
          name: param.name,
          optional: false,
        };
      }
      return {
        name: 'unknown',
        optional: false,
      };
    });

    return {
      name,
      parameters,
      isAsync: node.async,
      location: this.getSourceLocation(node, filePath),
      complexity: t.isBlockStatement(node.body) ? this.calculateFunctionComplexity(node.body) : 1,
    };
  }

  private extractClassDeclaration(node: t.ClassDeclaration, filePath: string): ClassDeclaration {
    const methods: FunctionDeclaration[] = [];
    const properties: PropertyDeclaration[] = [];

    node.body.body.forEach((member) => {
      if (t.isClassMethod(member) && t.isIdentifier(member.key)) {
        methods.push({
          name: member.key.name,
          parameters: member.params.map((param) => ({
            name: t.isIdentifier(param) ? param.name : 'unknown',
            optional: false,
          })),
          isAsync: member.async,
          location: this.getSourceLocation(member, filePath),
          complexity: this.calculateFunctionComplexity(member.body),
        });
      } else if (t.isClassProperty(member) && t.isIdentifier(member.key)) {
        properties.push({
          name: member.key.name,
          isStatic: member.static,
          visibility: 'public', // JavaScript doesn't have visibility modifiers
          location: this.getSourceLocation(member, filePath),
        });
      }
    });

    return {
      name: node.id?.name || 'anonymous',
      extends: node.superClass && t.isIdentifier(node.superClass) ? node.superClass.name : undefined,
      methods,
      properties,
      location: this.getSourceLocation(node, filePath),
    };
  }

  private extractVariableSymbol(node: t.VariableDeclarator, filePath: string): Symbol {
    const name = t.isIdentifier(node.id) ? node.id.name : 'unknown';
    
    return {
      id: `${filePath}:${name}`,
      name,
      type: SymbolType.VARIABLE,
      location: this.getSourceLocation(node, filePath),
      references: [],
    };
  }

  private getSourceLocation(node: t.Node, filePath: string): AnalysisSourceLocation {
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

  private getLanguageFromPath(filePath: string): SupportedLanguage {
    if (filePath.endsWith('.jsx')) return SupportedLanguage.JSX;
    return SupportedLanguage.JAVASCRIPT;
  }

  private getNodeText(node: t.Node): string {
    // Simple text extraction - in a real implementation, you'd use a proper code generator
    if (t.isStringLiteral(node)) return `"${node.value}"`;
    if (t.isNumericLiteral(node)) return node.value.toString();
    if (t.isBooleanLiteral(node)) return node.value.toString();
    if (t.isIdentifier(node)) return node.name;
    return 'unknown';
  }

  private calculateComplexity(ast: t.File): ComplexityMetrics {
    let cyclomatic = 1;
    let cognitive = 0;

    traverse(ast, {
      IfStatement: () => {
        cyclomatic++;
        cognitive++;
      },
      WhileStatement: () => {
        cyclomatic++;
        cognitive++;
      },
      ForStatement: () => {
        cyclomatic++;
        cognitive++;
      },
      ForInStatement: () => {
        cyclomatic++;
        cognitive++;
      },
      ForOfStatement: () => {
        cyclomatic++;
        cognitive++;
      },
      DoWhileStatement: () => {
        cyclomatic++;
        cognitive++;
      },
      SwitchStatement: () => {
        cyclomatic++;
        cognitive++;
      },
      SwitchCase: (path) => {
        if (path.node.test) { // Not default case
          cyclomatic++;
        }
      },
      CatchClause: () => {
        cyclomatic++;
        cognitive++;
      },
      ConditionalExpression: () => {
        cyclomatic++;
        cognitive++;
      },
    });

    return {
      cyclomatic,
      cognitive,
      maintainability: Math.max(0, 171 - 5.2 * Math.log(cyclomatic) - 0.23 * cognitive),
      technicalDebt: cyclomatic > 10 ? cyclomatic - 10 : 0,
    };
  }

  private calculateFunctionComplexity(body: t.BlockStatement): number {
    let complexity = 1;

    traverse(t.file(t.program([body])), {
      IfStatement: () => complexity++,
      WhileStatement: () => complexity++,
      ForStatement: () => complexity++,
      ForInStatement: () => complexity++,
      ForOfStatement: () => complexity++,
      DoWhileStatement: () => complexity++,
      SwitchStatement: () => complexity++,
      SwitchCase: (path) => {
        if (path.node.test) complexity++;
      },
      CatchClause: () => complexity++,
      ConditionalExpression: () => complexity++,
    });

    return complexity;
  }
}
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

interface ReactComponent {
  name: string;
  type: 'functional' | 'class';
  props: string[];
  hooks: string[];
  location: AnalysisSourceLocation;
}

@Injectable()
export class ReactAnalyzer {
  private readonly logger = new Logger(ReactAnalyzer.name);

  async analyzeFile(filePath: string, content: string): Promise<FileAnalysis> {
    this.logger.debug(`Analyzing React file: ${filePath}`);

    try {
      // Parse JSX/TSX with Babel
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
      const reactComponents: ReactComponent[] = [];

      // Traverse AST and extract React-specific information
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
          const func = this.extractFunctionDeclaration(path.node, filePath);
          functions.push(func);
          
          // Check if it's a React component
          if (this.isReactComponent(path.node)) {
            reactComponents.push(this.extractReactComponent(path.node, filePath));
          }
        },
        ArrowFunctionExpression: (path) => {
          if (t.isVariableDeclarator(path.parent) && t.isIdentifier(path.parent.id)) {
            const func = this.extractArrowFunction(path.node, path.parent.id.name, filePath);
            functions.push(func);
            
            // Check if it's a React component
            if (this.isReactArrowComponent(path.node)) {
              reactComponents.push(this.extractReactArrowComponent(path.node, path.parent.id.name, filePath));
            }
          }
        },
        ClassDeclaration: (path) => {
          const cls = this.extractClassDeclaration(path.node, filePath);
          classes.push(cls);
          
          // Check if it's a React component
          if (this.isReactClassComponent(path.node)) {
            reactComponents.push(this.extractReactClassComponent(path.node, filePath));
          }
        },
        VariableDeclarator: (path) => {
          if (t.isIdentifier(path.node.id)) {
            symbols.push(this.extractVariableSymbol(path.node, filePath));
          }
        },
      });

      // Add React components as symbols
      reactComponents.forEach((component) => {
        symbols.push({
          id: `${filePath}:${component.name}`,
          name: component.name,
          type: SymbolType.CLASS, // Treat components as classes
          location: component.location,
          references: [],
        });
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
      this.logger.error(`Failed to analyze React file ${filePath}:`, error);
      throw error;
    }
  }

  private isReactComponent(node: t.FunctionDeclaration): boolean {
    if (!node.id) return false;
    
    // Check if function name starts with uppercase (React convention)
    const name = node.id.name;
    if (!/^[A-Z]/.test(name)) return false;
    
    // Check if function returns JSX
    return this.returnsJSX(node.body);
  }

  private isReactArrowComponent(node: t.ArrowFunctionExpression): boolean {
    // Check if arrow function returns JSX
    if (t.isJSXElement(node.body) || t.isJSXFragment(node.body)) {
      return true;
    }
    
    if (t.isBlockStatement(node.body)) {
      return this.returnsJSX(node.body);
    }
    
    return false;
  }

  private isReactClassComponent(node: t.ClassDeclaration): boolean {
    // Check if class extends React.Component or Component
    if (!node.superClass) return false;
    
    if (t.isIdentifier(node.superClass)) {
      return node.superClass.name === 'Component' || node.superClass.name === 'PureComponent';
    }
    
    if (t.isMemberExpression(node.superClass)) {
      return (
        t.isIdentifier(node.superClass.object) &&
        node.superClass.object.name === 'React' &&
        t.isIdentifier(node.superClass.property) &&
        (node.superClass.property.name === 'Component' || node.superClass.property.name === 'PureComponent')
      );
    }
    
    return false;
  }

  private returnsJSX(body: t.BlockStatement): boolean {
    let hasJSXReturn = false;
    
    traverse(t.file(t.program([body])), {
      ReturnStatement: (path) => {
        if (path.node.argument) {
          if (t.isJSXElement(path.node.argument) || t.isJSXFragment(path.node.argument)) {
            hasJSXReturn = true;
          }
        }
      },
    });
    
    return hasJSXReturn;
  }

  private extractReactComponent(node: t.FunctionDeclaration, filePath: string): ReactComponent {
    const name = node.id?.name || 'anonymous';
    const props = this.extractProps(node.params);
    const hooks = this.extractHooks(node.body);
    
    return {
      name,
      type: 'functional',
      props,
      hooks,
      location: this.getSourceLocation(node, filePath),
    };
  }

  private extractReactArrowComponent(node: t.ArrowFunctionExpression, name: string, filePath: string): ReactComponent {
    const props = this.extractProps(node.params);
    const hooks = t.isBlockStatement(node.body) ? this.extractHooks(node.body) : [];
    
    return {
      name,
      type: 'functional',
      props,
      hooks,
      location: this.getSourceLocation(node, filePath),
    };
  }

  private extractReactClassComponent(node: t.ClassDeclaration, filePath: string): ReactComponent {
    const name = node.id?.name || 'anonymous';
    
    return {
      name,
      type: 'class',
      props: [], // Class components get props via this.props
      hooks: [], // Class components don't use hooks
      location: this.getSourceLocation(node, filePath),
    };
  }

  private extractProps(params: t.Node[]): string[] {
    const props: string[] = [];
    
    if (params.length > 0) {
      const firstParam = params[0];
      
      if (t.isObjectPattern(firstParam)) {
        firstParam.properties.forEach((prop) => {
          if (t.isObjectProperty(prop) && t.isIdentifier(prop.key)) {
            props.push(prop.key.name);
          }
        });
      } else if (t.isIdentifier(firstParam)) {
        props.push(firstParam.name);
      }
    }
    
    return props;
  }

  private extractHooks(body: t.BlockStatement): string[] {
    const hooks: string[] = [];
    
    traverse(t.file(t.program([body])), {
      CallExpression: (path) => {
        if (t.isIdentifier(path.node.callee)) {
          const name = path.node.callee.name;
          if (name.startsWith('use') && name.length > 3 && /^[A-Z]/.test(name[3])) {
            hooks.push(name);
          }
        }
      },
    });
    
    return [...new Set(hooks)]; // Remove duplicates
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
          visibility: 'public',
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
    if (filePath.endsWith('.tsx')) return SupportedLanguage.TSX;
    return SupportedLanguage.JSX;
  }

  private getNodeText(node: t.Node): string {
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
        if (path.node.test) {
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
      JSXElement: () => {
        cognitive += 0.5; // JSX adds some cognitive complexity
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
      JSXElement: () => complexity += 0.5,
    });

    return complexity;
  }
}
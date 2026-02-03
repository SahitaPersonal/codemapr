import { Injectable, Logger } from '@nestjs/common';
import * as ts from 'typescript';
import traverse from '@babel/traverse';
import * as t from '@babel/types';
import {
  ServiceCall,
  ServiceCallType,
  HttpMethod,
  AnalysisSourceLocation,
} from '@codemapr/shared';

export interface ServiceDetectionResult {
  serviceCalls: ServiceCall[];
  externalServices: string[];
  databaseOperations: ServiceCall[];
}

@Injectable()
export class ServiceAnalyzer {
  private readonly logger = new Logger(ServiceAnalyzer.name);

  // HTTP client patterns to detect
  private readonly httpClientPatterns = [
    'fetch',
    'axios',
    'request',
    'superagent',
    'got',
    'node-fetch',
    'isomorphic-fetch',
    'unfetch',
  ];

  // Database ORM patterns to detect
  private readonly databasePatterns = [
    'prisma',
    'typeorm',
    'sequelize',
    'mongoose',
    'knex',
    'objection',
    'bookshelf',
    'waterline',
    'mikro-orm',
    'drizzle',
  ];

  // SQL query patterns
  private readonly sqlPatterns = [
    /SELECT\s+.*\s+FROM/i,
    /INSERT\s+INTO/i,
    /UPDATE\s+.*\s+SET/i,
    /DELETE\s+FROM/i,
    /CREATE\s+TABLE/i,
    /ALTER\s+TABLE/i,
    /DROP\s+TABLE/i,
  ];

  // Database operation keywords
  private readonly dbOperations = [
    'find', 'findOne', 'findMany', 'findFirst', 'findUnique',
    'create', 'createMany', 'insert', 'insertOne', 'insertMany',
    'update', 'updateOne', 'updateMany', 'upsert',
    'delete', 'deleteOne', 'deleteMany', 'remove', 'removeOne', 'removeMany',
    'save', 'persist', 'flush', 'refresh',
    'count', 'aggregate', 'group', 'distinct',
    'where', 'select', 'include', 'orderBy', 'skip', 'take', 'limit',
    'join', 'leftJoin', 'rightJoin', 'innerJoin',
    'transaction', 'commit', 'rollback',
  ];

  // Common API endpoint patterns
  private readonly apiPatterns = [
    /\/api\//,
    /\/v\d+\//,
    /https?:\/\//,
    /\.json$/,
    /\.xml$/,
  ];

  async analyzeTypeScriptFile(filePath: string, sourceFile: ts.SourceFile): Promise<ServiceDetectionResult> {
    this.logger.debug(`Analyzing TypeScript file for service calls: ${filePath}`);

    const serviceCalls: ServiceCall[] = [];
    const externalServices = new Set<string>();
    const databaseOperations: ServiceCall[] = [];

    const visit = (node: ts.Node) => {
      // Detect HTTP requests
      if (ts.isCallExpression(node)) {
        const httpCall = this.detectHttpCallTypeScript(node, sourceFile, filePath);
        if (httpCall) {
          serviceCalls.push(httpCall);
          if (httpCall.isExternal) {
            externalServices.add(httpCall.endpoint || httpCall.service);
          }
        }

        // Detect database operations
        const dbCall = this.detectDatabaseCallTypeScript(node, sourceFile, filePath);
        if (dbCall) {
          databaseOperations.push(dbCall);
        }
      }

      // Detect property access patterns (e.g., axios.get, prisma.user.findMany)
      if (ts.isPropertyAccessExpression(node)) {
        const serviceCall = this.detectPropertyAccessServiceCall(node, sourceFile, filePath);
        if (serviceCall) {
          if (serviceCall.type === ServiceCallType.HTTP_REQUEST) {
            serviceCalls.push(serviceCall);
            if (serviceCall.isExternal) {
              externalServices.add(serviceCall.endpoint || serviceCall.service);
            }
          } else if (serviceCall.type === ServiceCallType.DATABASE_QUERY) {
            databaseOperations.push(serviceCall);
          }
        }
      }

      ts.forEachChild(node, visit);
    };

    visit(sourceFile);

    return {
      serviceCalls,
      externalServices: Array.from(externalServices),
      databaseOperations,
    };
  }

  async analyzeJavaScriptFile(filePath: string, ast: t.File): Promise<ServiceDetectionResult> {
    this.logger.debug(`Analyzing JavaScript file for service calls: ${filePath}`);

    const serviceCalls: ServiceCall[] = [];
    const externalServices = new Set<string>();
    const databaseOperations: ServiceCall[] = [];

    traverse(ast, {
      CallExpression: (path) => {
        // Detect HTTP requests
        const httpCall = this.detectHttpCallJavaScript(path.node, filePath);
        if (httpCall) {
          serviceCalls.push(httpCall);
          if (httpCall.isExternal) {
            externalServices.add(httpCall.endpoint || httpCall.service);
          }
        }

        // Detect database operations
        const dbCall = this.detectDatabaseCallJavaScript(path.node, filePath);
        if (dbCall) {
          databaseOperations.push(dbCall);
        }
      },
      MemberExpression: (path) => {
        // Detect method chaining patterns
        const serviceCall = this.detectMemberExpressionServiceCall(path.node, filePath);
        if (serviceCall) {
          if (serviceCall.type === ServiceCallType.HTTP_REQUEST) {
            serviceCalls.push(serviceCall);
            if (serviceCall.isExternal) {
              externalServices.add(serviceCall.endpoint || serviceCall.service);
            }
          } else if (serviceCall.type === ServiceCallType.DATABASE_QUERY) {
            databaseOperations.push(serviceCall);
          }
        }
      },
    });

    return {
      serviceCalls,
      externalServices: Array.from(externalServices),
      databaseOperations,
    };
  }

  private detectHttpCallTypeScript(
    node: ts.CallExpression,
    sourceFile: ts.SourceFile,
    filePath: string
  ): ServiceCall | null {
    const callText = node.expression.getText();

    // Direct fetch calls
    if (callText === 'fetch' && node.arguments.length > 0) {
      return this.createHttpServiceCall(
        node,
        sourceFile,
        filePath,
        'fetch',
        this.extractUrlFromArgument(node.arguments[0]),
        this.extractHttpMethodFromFetchOptions(node.arguments[1])
      );
    }

    // Axios calls
    if (callText.includes('axios')) {
      return this.createHttpServiceCall(
        node,
        sourceFile,
        filePath,
        'axios',
        this.extractUrlFromArgument(node.arguments[0]),
        this.extractHttpMethodFromAxiosCall(callText)
      );
    }

    // Other HTTP client patterns
    for (const pattern of this.httpClientPatterns) {
      if (callText.includes(pattern)) {
        return this.createHttpServiceCall(
          node,
          sourceFile,
          filePath,
          pattern,
          this.extractUrlFromArgument(node.arguments[0]),
          HttpMethod.GET // Default to GET
        );
      }
    }

    return null;
  }

  private detectDatabaseCallTypeScript(
    node: ts.CallExpression,
    sourceFile: ts.SourceFile,
    filePath: string
  ): ServiceCall | null {
    const callText = node.expression.getText();

    // Check for database patterns
    for (const pattern of this.databasePatterns) {
      if (callText.includes(pattern)) {
        const operation = this.extractDatabaseOperation(callText);
        const tableName = this.extractTableName(callText);
        
        return {
          id: `${filePath}:${node.getStart()}`,
          type: ServiceCallType.DATABASE_QUERY,
          service: pattern,
          operation,
          location: this.getSourceLocationTypeScript(node, sourceFile, filePath),
          isExternal: false,
          metadata: {
            orm: pattern,
            query: callText,
            table: tableName,
            operationType: this.categorizeOperation(operation),
          },
        };
      }
    }

    // Check for raw SQL queries
    if (node.arguments.length > 0) {
      const firstArg = node.arguments[0];
      if (ts.isStringLiteral(firstArg) || ts.isTemplateExpression(firstArg)) {
        const queryText = ts.isStringLiteral(firstArg) ? firstArg.text : firstArg.head.text;
        
        for (const sqlPattern of this.sqlPatterns) {
          if (sqlPattern.test(queryText)) {
            return {
              id: `${filePath}:${node.getStart()}`,
              type: ServiceCallType.DATABASE_QUERY,
              service: 'raw-sql',
              operation: this.extractSqlOperation(queryText),
              location: this.getSourceLocationTypeScript(node, sourceFile, filePath),
              isExternal: false,
              metadata: {
                queryType: 'raw-sql',
                query: queryText,
                sqlPattern: sqlPattern.source,
              },
            };
          }
        }
      }
    }

    return null;
  }

  private detectPropertyAccessServiceCall(
    node: ts.PropertyAccessExpression,
    sourceFile: ts.SourceFile,
    filePath: string
  ): ServiceCall | null {
    const fullText = node.getText();

    // Axios method calls (axios.get, axios.post, etc.)
    if (fullText.startsWith('axios.')) {
      const method = node.name.text.toUpperCase() as HttpMethod;
      if (Object.values(HttpMethod).includes(method)) {
        return {
          id: `${filePath}:${node.getStart()}`,
          type: ServiceCallType.HTTP_REQUEST,
          service: 'axios',
          method,
          location: this.getSourceLocationTypeScript(node, sourceFile, filePath),
          isExternal: true,
          metadata: {
            client: 'axios',
            methodCall: fullText,
          },
        };
      }
    }

    // Database ORM method calls
    for (const pattern of this.databasePatterns) {
      if (fullText.includes(pattern)) {
        return {
          id: `${filePath}:${node.getStart()}`,
          type: ServiceCallType.DATABASE_QUERY,
          service: pattern,
          operation: this.extractDatabaseOperation(fullText),
          location: this.getSourceLocationTypeScript(node, sourceFile, filePath),
          isExternal: false,
          metadata: {
            orm: pattern,
            methodCall: fullText,
          },
        };
      }
    }

    return null;
  }

  private detectHttpCallJavaScript(node: t.CallExpression, filePath: string): ServiceCall | null {
    let callText = '';

    if (t.isIdentifier(node.callee)) {
      callText = node.callee.name;
    } else if (t.isMemberExpression(node.callee)) {
      callText = this.getMemberExpressionText(node.callee);
    }

    // Direct fetch calls
    if (callText === 'fetch' && node.arguments.length > 0) {
      const firstArg = node.arguments[0];
      return this.createHttpServiceCallJavaScript(
        node,
        filePath,
        'fetch',
        this.extractUrlFromArgumentJavaScript(firstArg),
        HttpMethod.GET // Default, would need to parse options for actual method
      );
    }

    // Axios calls
    if (callText.includes('axios')) {
      const firstArg = node.arguments[0];
      return this.createHttpServiceCallJavaScript(
        node,
        filePath,
        'axios',
        this.extractUrlFromArgumentJavaScript(firstArg),
        this.extractHttpMethodFromAxiosCallJavaScript(callText)
      );
    }

    return null;
  }

  private detectDatabaseCallJavaScript(node: t.CallExpression, filePath: string): ServiceCall | null {
    let callText = '';

    if (t.isMemberExpression(node.callee)) {
      callText = this.getMemberExpressionText(node.callee);
    }

    for (const pattern of this.databasePatterns) {
      if (callText.includes(pattern)) {
        const operation = this.extractDatabaseOperation(callText);
        const tableName = this.extractTableName(callText);
        
        return {
          id: `${filePath}:${node.start || 0}`,
          type: ServiceCallType.DATABASE_QUERY,
          service: pattern,
          operation,
          location: this.getSourceLocationJavaScript(node, filePath),
          isExternal: false,
          metadata: {
            orm: pattern,
            query: callText,
            table: tableName,
            operationType: this.categorizeOperation(operation),
          },
        };
      }
    }

    // Check for raw SQL queries
    if (node.arguments.length > 0) {
      const firstArg = node.arguments[0];
      if (t.isStringLiteral(firstArg) || t.isTemplateLiteral(firstArg)) {
        const queryText = t.isStringLiteral(firstArg) ? firstArg.value : 
                         (firstArg.quasis[0]?.value.raw || '');
        
        for (const sqlPattern of this.sqlPatterns) {
          if (sqlPattern.test(queryText)) {
            return {
              id: `${filePath}:${node.start || 0}`,
              type: ServiceCallType.DATABASE_QUERY,
              service: 'raw-sql',
              operation: this.extractSqlOperation(queryText),
              location: this.getSourceLocationJavaScript(node, filePath),
              isExternal: false,
              metadata: {
                queryType: 'raw-sql',
                query: queryText,
                sqlPattern: sqlPattern.source,
              },
            };
          }
        }
      }
    }

    return null;
  }

  private detectMemberExpressionServiceCall(node: t.MemberExpression, filePath: string): ServiceCall | null {
    const fullText = this.getMemberExpressionText(node);

    // Axios method calls
    if (fullText.startsWith('axios.') && t.isIdentifier(node.property)) {
      const method = node.property.name.toUpperCase() as HttpMethod;
      if (Object.values(HttpMethod).includes(method)) {
        return {
          id: `${filePath}:${node.start || 0}`,
          type: ServiceCallType.HTTP_REQUEST,
          service: 'axios',
          method,
          location: this.getSourceLocationJavaScript(node, filePath),
          isExternal: true,
          metadata: {
            client: 'axios',
            methodCall: fullText,
          },
        };
      }
    }

    return null;
  }

  private createHttpServiceCall(
    node: ts.CallExpression,
    sourceFile: ts.SourceFile,
    filePath: string,
    service: string,
    endpoint?: string,
    method: HttpMethod = HttpMethod.GET
  ): ServiceCall {
    return {
      id: `${filePath}:${node.getStart()}`,
      type: ServiceCallType.HTTP_REQUEST,
      service,
      method,
      endpoint,
      location: this.getSourceLocationTypeScript(node, sourceFile, filePath),
      isExternal: this.isExternalEndpoint(endpoint),
      metadata: {
        client: service,
      },
    };
  }

  private createHttpServiceCallJavaScript(
    node: t.CallExpression,
    filePath: string,
    service: string,
    endpoint?: string,
    method: HttpMethod = HttpMethod.GET
  ): ServiceCall {
    return {
      id: `${filePath}:${node.start || 0}`,
      type: ServiceCallType.HTTP_REQUEST,
      service,
      method,
      endpoint,
      location: this.getSourceLocationJavaScript(node, filePath),
      isExternal: this.isExternalEndpoint(endpoint),
      metadata: {
        client: service,
      },
    };
  }

  private extractUrlFromArgument(arg: ts.Expression): string | undefined {
    if (ts.isStringLiteral(arg)) {
      return arg.text;
    }
    if (ts.isTemplateExpression(arg)) {
      // Handle template literals - extract static parts
      return arg.head.text + '...';
    }
    return undefined;
  }

  private extractUrlFromArgumentJavaScript(arg: t.Expression | t.SpreadElement | t.ArgumentPlaceholder): string | undefined {
    if (t.isExpression(arg)) {
      if (t.isStringLiteral(arg)) {
        return arg.value;
      }
      if (t.isTemplateLiteral(arg)) {
        // Handle template literals
        return arg.quasis[0]?.value.raw + '...';
      }
    }
    return undefined;
  }

  private extractHttpMethodFromFetchOptions(options?: ts.Expression): HttpMethod {
    if (!options || !ts.isObjectLiteralExpression(options)) {
      return HttpMethod.GET;
    }

    for (const prop of options.properties) {
      if (ts.isPropertyAssignment(prop) && 
          ts.isIdentifier(prop.name) && 
          prop.name.text === 'method' &&
          ts.isStringLiteral(prop.initializer)) {
        return prop.initializer.text.toUpperCase() as HttpMethod;
      }
    }

    return HttpMethod.GET;
  }

  private extractHttpMethodFromAxiosCall(callText: string): HttpMethod {
    if (callText.includes('.get')) return HttpMethod.GET;
    if (callText.includes('.post')) return HttpMethod.POST;
    if (callText.includes('.put')) return HttpMethod.PUT;
    if (callText.includes('.delete')) return HttpMethod.DELETE;
    if (callText.includes('.patch')) return HttpMethod.PATCH;
    return HttpMethod.GET;
  }

  private extractHttpMethodFromAxiosCallJavaScript(callText: string): HttpMethod {
    return this.extractHttpMethodFromAxiosCall(callText);
  }

  private extractDatabaseOperation(callText: string): string {
    // Extract common database operations
    const lowerCallText = callText.toLowerCase();
    
    for (const op of this.dbOperations) {
      if (lowerCallText.includes(op.toLowerCase())) {
        return op;
      }
    }

    return 'query';
  }

  private extractTableName(callText: string): string | undefined {
    // Try to extract table/model name from ORM calls
    // Examples: prisma.user.findMany -> 'user', User.findOne -> 'User'
    
    const patterns = [
      /\.(\w+)\.(find|create|update|delete|save|remove)/i,
      /(\w+)\.(find|create|update|delete|save|remove)/i,
    ];

    for (const pattern of patterns) {
      const match = callText.match(pattern);
      if (match && match[1]) {
        return match[1];
      }
    }

    return undefined;
  }

  private extractSqlOperation(queryText: string): string {
    const upperQuery = queryText.toUpperCase().trim();
    
    if (upperQuery.startsWith('SELECT')) return 'SELECT';
    if (upperQuery.startsWith('INSERT')) return 'INSERT';
    if (upperQuery.startsWith('UPDATE')) return 'UPDATE';
    if (upperQuery.startsWith('DELETE')) return 'DELETE';
    if (upperQuery.startsWith('CREATE')) return 'CREATE';
    if (upperQuery.startsWith('ALTER')) return 'ALTER';
    if (upperQuery.startsWith('DROP')) return 'DROP';
    
    return 'QUERY';
  }

  private categorizeOperation(operation: string): 'read' | 'write' | 'delete' | 'schema' {
    const lowerOp = operation.toLowerCase();
    
    if (['find', 'findone', 'findmany', 'findfirst', 'findunique', 'count', 'select', 'aggregate'].includes(lowerOp)) {
      return 'read';
    }
    
    if (['create', 'createmany', 'insert', 'insertone', 'insertmany', 'update', 'updateone', 'updatemany', 'upsert', 'save'].includes(lowerOp)) {
      return 'write';
    }
    
    if (['delete', 'deleteone', 'deletemany', 'remove', 'removeone', 'removemany'].includes(lowerOp)) {
      return 'delete';
    }
    
    if (['create table', 'alter table', 'drop table', 'create', 'alter', 'drop'].includes(lowerOp)) {
      return 'schema';
    }
    
    return 'read'; // Default to read
  }

  private isExternalEndpoint(endpoint?: string): boolean {
    if (!endpoint) return false;
    
    // Check if it's an external URL
    if (endpoint.startsWith('http://') || endpoint.startsWith('https://')) {
      return true;
    }

    // Check for API patterns that suggest external calls
    return this.apiPatterns.some(pattern => pattern.test(endpoint));
  }

  private getMemberExpressionText(node: t.MemberExpression): string {
    let text = '';
    
    if (t.isIdentifier(node.object)) {
      text = node.object.name;
    } else if (t.isMemberExpression(node.object)) {
      text = this.getMemberExpressionText(node.object);
    }

    if (t.isIdentifier(node.property)) {
      text += '.' + node.property.name;
    }

    return text;
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
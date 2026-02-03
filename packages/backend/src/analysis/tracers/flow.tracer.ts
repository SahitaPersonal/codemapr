import { Injectable, Logger } from '@nestjs/common';
import {
  FileAnalysis,
  ServiceCall,
  ServiceCallType,
  HttpMethod,
  FunctionDeclaration,
  DependencyGraph,
  DependencyEdge,
} from '@codemapr/shared';

export interface EndToEndFlow {
  id: string;
  name: string;
  type: FlowType;
  steps: FlowStep[];
  entryPoint: FlowStep;
  exitPoints: FlowStep[];
  metadata: FlowMetadata;
}

export interface FlowStep {
  id: string;
  type: StepType;
  name: string;
  filePath: string;
  location: {
    startLine: number;
    endLine: number;
    startColumn: number;
    endColumn: number;
  };
  serviceCall?: ServiceCall;
  functionCall?: FunctionDeclaration;
  nextSteps: string[];
  previousSteps: string[];
  metadata: Record<string, any>;
}

export interface FlowMetadata {
  totalSteps: number;
  maxDepth: number;
  hasExternalCalls: boolean;
  hasDatabaseOperations: boolean;
  estimatedExecutionTime?: number;
  complexity: number;
}

export enum FlowType {
  HTTP_TO_DATABASE = 'http_to_database',
  FRONTEND_TO_BACKEND = 'frontend_to_backend',
  SERVICE_TO_SERVICE = 'service_to_service',
  FUNCTION_CHAIN = 'function_chain',
  DATA_FLOW = 'data_flow',
}

export enum StepType {
  HTTP_ENDPOINT = 'http_endpoint',
  FUNCTION_CALL = 'function_call',
  SERVICE_CALL = 'service_call',
  DATABASE_OPERATION = 'database_operation',
  EXTERNAL_API_CALL = 'external_api_call',
  MIDDLEWARE = 'middleware',
  HANDLER = 'handler',
}

@Injectable()
export class FlowTracer {
  private readonly logger = new Logger(FlowTracer.name);

  async traceEndToEndFlows(
    fileAnalyses: FileAnalysis[],
    dependencyGraph: DependencyGraph,
  ): Promise<EndToEndFlow[]> {
    this.logger.debug(`Tracing end-to-end flows for ${fileAnalyses.length} files`);

    const flows: EndToEndFlow[] = [];

    // Find HTTP endpoints and trace their flows
    const httpEndpoints = this.findHttpEndpoints(fileAnalyses);
    for (const endpoint of httpEndpoints) {
      const flow = await this.traceHttpEndpointFlow(endpoint, fileAnalyses, dependencyGraph);
      if (flow) {
        flows.push(flow);
      }
    }

    // Find service-to-service flows
    const serviceFlows = await this.traceServiceToServiceFlows(fileAnalyses, dependencyGraph);
    flows.push(...serviceFlows);

    // Find database operation flows
    const databaseFlows = await this.traceDatabaseOperationFlows(fileAnalyses, dependencyGraph);
    flows.push(...databaseFlows);

    this.logger.debug(`Found ${flows.length} end-to-end flows`);
    return flows;
  }

  private findHttpEndpoints(fileAnalyses: FileAnalysis[]): FlowStep[] {
    const endpoints: FlowStep[] = [];

    fileAnalyses.forEach((file) => {
      // Look for Express.js route handlers
      file.functions.forEach((func) => {
        if (this.isExpressRouteHandler(func, file)) {
          endpoints.push({
            id: `${file.filePath}:${func.name}:${func.location.start.line}`,
            type: StepType.HTTP_ENDPOINT,
            name: func.name,
            filePath: file.filePath,
            location: {
              startLine: func.location.start.line,
              endLine: func.location.end.line,
              startColumn: func.location.start.column,
              endColumn: func.location.end.column,
            },
            functionCall: func,
            nextSteps: [],
            previousSteps: [],
            metadata: {
              method: this.extractHttpMethod(func, file),
              route: this.extractRoute(func, file),
              framework: 'express',
            },
          });
        }
      });

      // Look for NestJS controllers
      file.classes.forEach((cls) => {
        if (this.isNestJSController(cls, file)) {
          cls.methods.forEach((method) => {
            if (this.isNestJSRouteHandler(method, file)) {
              endpoints.push({
                id: `${file.filePath}:${cls.name}:${method.name}:${method.location.start.line}`,
                type: StepType.HTTP_ENDPOINT,
                name: `${cls.name}.${method.name}`,
                filePath: file.filePath,
                location: {
                  startLine: method.location.start.line,
                  endLine: method.location.end.line,
                  startColumn: method.location.start.column,
                  endColumn: method.location.end.column,
                },
                functionCall: method,
                nextSteps: [],
                previousSteps: [],
                metadata: {
                  method: this.extractNestJSHttpMethod(method, file),
                  route: this.extractNestJSRoute(method, cls, file),
                  framework: 'nestjs',
                  controller: cls.name,
                },
              });
            }
          });
        }
      });
    });

    return endpoints;
  }

  private async traceHttpEndpointFlow(
    endpoint: FlowStep,
    fileAnalyses: FileAnalysis[],
    dependencyGraph: DependencyGraph,
  ): Promise<EndToEndFlow | null> {
    const steps: FlowStep[] = [endpoint];
    const visitedFunctions = new Set<string>();

    // Trace the flow starting from the endpoint
    await this.traceFlowFromStep(endpoint, fileAnalyses, dependencyGraph, steps, visitedFunctions);

    if (steps.length <= 1) {
      return null; // No meaningful flow found
    }

    // Identify entry and exit points
    const entryPoint = steps[0];
    const exitPoints = steps.filter((step) => step.nextSteps.length === 0);

    // Calculate metadata
    const metadata = this.calculateFlowMetadata(steps);

    return {
      id: `flow:${endpoint.id}`,
      name: `${endpoint.metadata.method} ${endpoint.metadata.route || endpoint.name}`,
      type: this.determineFlowType(steps),
      steps,
      entryPoint,
      exitPoints,
      metadata,
    };
  }

  private async traceFlowFromStep(
    currentStep: FlowStep,
    fileAnalyses: FileAnalysis[],
    dependencyGraph: DependencyGraph,
    steps: FlowStep[],
    visitedFunctions: Set<string>,
    depth = 0,
  ): Promise<void> {
    if (depth > 10 || visitedFunctions.has(currentStep.id)) {
      return; // Prevent infinite recursion
    }

    visitedFunctions.add(currentStep.id);

    // Find the file containing this step
    const file = fileAnalyses.find((f) => f.filePath === currentStep.filePath);
    if (!file) return;

    // Look for service calls in this function
    const serviceCalls = this.findServiceCallsInFunction(currentStep, file);
    for (const serviceCall of serviceCalls) {
      const serviceStep = this.createServiceCallStep(serviceCall, file);
      steps.push(serviceStep);
      currentStep.nextSteps.push(serviceStep.id);
      serviceStep.previousSteps.push(currentStep.id);

      // If it's a database operation, this might be an exit point
      if (serviceCall.type === ServiceCallType.DATABASE_QUERY) {
        // Database operations are typically exit points
        continue;
      }

      // If it's an HTTP request, try to find the corresponding handler
      if (serviceCall.type === ServiceCallType.HTTP_REQUEST && !serviceCall.isExternal) {
        const handler = this.findHttpHandler(serviceCall, fileAnalyses);
        if (handler) {
          steps.push(handler);
          serviceStep.nextSteps.push(handler.id);
          handler.previousSteps.push(serviceStep.id);
          
          // Continue tracing from the handler
          await this.traceFlowFromStep(handler, fileAnalyses, dependencyGraph, steps, visitedFunctions, depth + 1);
        }
      }
    }

    // Look for function calls within this function
    const functionCalls = this.findFunctionCallsInFunction(currentStep, file, dependencyGraph);
    for (const funcCall of functionCalls) {
      const funcStep = this.createFunctionCallStep(funcCall, file);
      steps.push(funcStep);
      currentStep.nextSteps.push(funcStep.id);
      funcStep.previousSteps.push(currentStep.id);

      // Continue tracing from the function call
      await this.traceFlowFromStep(funcStep, fileAnalyses, dependencyGraph, steps, visitedFunctions, depth + 1);
    }
  }

  private findServiceCallsInFunction(step: FlowStep, file: FileAnalysis): ServiceCall[] {
    if (!file.serviceCalls) return [];

    // Find service calls that are within the function's location
    return file.serviceCalls.filter((serviceCall) => {
      return (
        serviceCall.location.start.line >= step.location.startLine &&
        serviceCall.location.end.line <= step.location.endLine
      );
    });
  }

  private findFunctionCallsInFunction(
    step: FlowStep,
    file: FileAnalysis,
    dependencyGraph: DependencyGraph,
  ): FunctionDeclaration[] {
    const functionCalls: FunctionDeclaration[] = [];

    // Find dependency edges that originate from this function
    const functionId = step.id;
    const outgoingEdges = dependencyGraph.edges.filter(
      (edge) => edge.from === functionId && edge.type === 'call'
    );

    for (const edge of outgoingEdges) {
      // Find the target function
      const targetNode = dependencyGraph.nodes.find((node) => node.id === edge.to);
      if (targetNode && targetNode.type === 'function') {
        // Find the function declaration in the files
        const targetFile = file.filePath === targetNode.filePath ? file : 
          this.findFileByPath(targetNode.filePath, [file]); // In real implementation, pass all files
        
        if (targetFile) {
          const targetFunction = targetFile.functions.find((f) => f.name === targetNode.name);
          if (targetFunction) {
            functionCalls.push(targetFunction);
          }
        }
      }
    }

    return functionCalls;
  }

  private createServiceCallStep(serviceCall: ServiceCall, file: FileAnalysis): FlowStep {
    return {
      id: serviceCall.id,
      type: this.mapServiceCallTypeToStepType(serviceCall.type),
      name: this.getServiceCallName(serviceCall),
      filePath: file.filePath,
      location: {
        startLine: serviceCall.location.start.line,
        endLine: serviceCall.location.end.line,
        startColumn: serviceCall.location.start.column,
        endColumn: serviceCall.location.end.column,
      },
      serviceCall,
      nextSteps: [],
      previousSteps: [],
      metadata: {
        service: serviceCall.service,
        method: serviceCall.method,
        endpoint: serviceCall.endpoint,
        operation: serviceCall.operation,
        isExternal: serviceCall.isExternal,
        ...serviceCall.metadata,
      },
    };
  }

  private createFunctionCallStep(func: FunctionDeclaration, file: FileAnalysis): FlowStep {
    return {
      id: `${file.filePath}:${func.name}:${func.location.start.line}`,
      type: StepType.FUNCTION_CALL,
      name: func.name,
      filePath: file.filePath,
      location: {
        startLine: func.location.start.line,
        endLine: func.location.end.line,
        startColumn: func.location.start.column,
        endColumn: func.location.end.column,
      },
      functionCall: func,
      nextSteps: [],
      previousSteps: [],
      metadata: {
        isAsync: func.isAsync,
        parameters: func.parameters.map((p) => p.name),
        returnType: func.returnType,
        complexity: func.complexity,
      },
    };
  }

  private findHttpHandler(serviceCall: ServiceCall, fileAnalyses: FileAnalysis[]): FlowStep | null {
    if (!serviceCall.endpoint) return null;

    // Try to match the endpoint to a route handler
    for (const file of fileAnalyses) {
      // Check Express.js handlers
      for (const func of file.functions) {
        if (this.isExpressRouteHandler(func, file)) {
          const route = this.extractRoute(func, file);
          const method = this.extractHttpMethod(func, file);
          
          if (this.matchesRoute(serviceCall.endpoint, route) && 
              serviceCall.method === method) {
            return {
              id: `${file.filePath}:${func.name}:${func.location.start.line}`,
              type: StepType.HANDLER,
              name: func.name,
              filePath: file.filePath,
              location: {
                startLine: func.location.start.line,
                endLine: func.location.end.line,
                startColumn: func.location.start.column,
                endColumn: func.location.end.column,
              },
              functionCall: func,
              nextSteps: [],
              previousSteps: [],
              metadata: {
                method,
                route,
                framework: 'express',
              },
            };
          }
        }
      }

      // Check NestJS controllers
      for (const cls of file.classes) {
        if (this.isNestJSController(cls, file)) {
          for (const method of cls.methods) {
            if (this.isNestJSRouteHandler(method, file)) {
              const route = this.extractNestJSRoute(method, cls, file);
              const httpMethod = this.extractNestJSHttpMethod(method, file);
              
              if (this.matchesRoute(serviceCall.endpoint, route) && 
                  serviceCall.method === httpMethod) {
                return {
                  id: `${file.filePath}:${cls.name}:${method.name}:${method.location.start.line}`,
                  type: StepType.HANDLER,
                  name: `${cls.name}.${method.name}`,
                  filePath: file.filePath,
                  location: {
                    startLine: method.location.start.line,
                    endLine: method.location.end.line,
                    startColumn: method.location.start.column,
                    endColumn: method.location.end.column,
                  },
                  functionCall: method,
                  nextSteps: [],
                  previousSteps: [],
                  metadata: {
                    method: httpMethod,
                    route,
                    framework: 'nestjs',
                    controller: cls.name,
                  },
                };
              }
            }
          }
        }
      }
    }

    return null;
  }

  private async traceServiceToServiceFlows(
    fileAnalyses: FileAnalysis[],
    dependencyGraph: DependencyGraph,
  ): Promise<EndToEndFlow[]> {
    const flows: EndToEndFlow[] = [];

    // Find service calls that might be part of service-to-service communication
    for (const file of fileAnalyses) {
      if (!file.serviceCalls) continue;

      for (const serviceCall of file.serviceCalls) {
        if (serviceCall.type === ServiceCallType.HTTP_REQUEST && !serviceCall.isExternal) {
          // This might be a service-to-service call
          const handler = this.findHttpHandler(serviceCall, fileAnalyses);
          if (handler) {
            const flow = await this.createServiceToServiceFlow(serviceCall, handler, file, fileAnalyses, dependencyGraph);
            if (flow) {
              flows.push(flow);
            }
          }
        }
      }
    }

    return flows;
  }

  private async traceDatabaseOperationFlows(
    fileAnalyses: FileAnalysis[],
    dependencyGraph: DependencyGraph,
  ): Promise<EndToEndFlow[]> {
    const flows: EndToEndFlow[] = [];

    // Find functions that contain database operations
    for (const file of fileAnalyses) {
      if (!file.databaseOperations) continue;

      for (const dbOperation of file.databaseOperations) {
        // Find the function that contains this database operation
        const containingFunction = file.functions.find((func) =>
          dbOperation.location.start.line >= func.location.start.line &&
          dbOperation.location.end.line <= func.location.end.line
        );

        if (containingFunction) {
          const flow = await this.createDatabaseOperationFlow(dbOperation, containingFunction, file, fileAnalyses, dependencyGraph);
          if (flow) {
            flows.push(flow);
          }
        }
      }
    }

    return flows;
  }

  private async createServiceToServiceFlow(
    serviceCall: ServiceCall,
    handler: FlowStep,
    sourceFile: FileAnalysis,
    fileAnalyses: FileAnalysis[],
    dependencyGraph: DependencyGraph,
  ): Promise<EndToEndFlow | null> {
    const steps: FlowStep[] = [];
    const visitedFunctions = new Set<string>();

    // Create the service call step
    const serviceCallStep = this.createServiceCallStep(serviceCall, sourceFile);
    steps.push(serviceCallStep);
    steps.push(handler);

    serviceCallStep.nextSteps.push(handler.id);
    handler.previousSteps.push(serviceCallStep.id);

    // Continue tracing from the handler
    await this.traceFlowFromStep(handler, fileAnalyses, dependencyGraph, steps, visitedFunctions);

    const metadata = this.calculateFlowMetadata(steps);

    return {
      id: `service-flow:${serviceCall.id}`,
      name: `Service call to ${serviceCall.endpoint || serviceCall.service}`,
      type: FlowType.SERVICE_TO_SERVICE,
      steps,
      entryPoint: serviceCallStep,
      exitPoints: steps.filter((step) => step.nextSteps.length === 0),
      metadata,
    };
  }

  private async createDatabaseOperationFlow(
    dbOperation: ServiceCall,
    containingFunction: FunctionDeclaration,
    file: FileAnalysis,
    fileAnalyses: FileAnalysis[],
    dependencyGraph: DependencyGraph,
  ): Promise<EndToEndFlow | null> {
    const steps: FlowStep[] = [];
    const visitedFunctions = new Set<string>();

    // Create the function step
    const functionStep = this.createFunctionCallStep(containingFunction, file);
    steps.push(functionStep);

    // Create the database operation step
    const dbStep = this.createServiceCallStep(dbOperation, file);
    steps.push(dbStep);

    functionStep.nextSteps.push(dbStep.id);
    dbStep.previousSteps.push(functionStep.id);

    // Try to find what calls this function (reverse tracing)
    const callers = this.findFunctionCallers(containingFunction, file, dependencyGraph, fileAnalyses);
    for (const caller of callers) {
      const callerStep = this.createFunctionCallStep(caller, file);
      steps.unshift(callerStep);
      callerStep.nextSteps.push(functionStep.id);
      functionStep.previousSteps.push(callerStep.id);
    }

    const metadata = this.calculateFlowMetadata(steps);

    return {
      id: `db-flow:${dbOperation.id}`,
      name: `Database ${dbOperation.operation} operation`,
      type: FlowType.HTTP_TO_DATABASE,
      steps,
      entryPoint: steps[0],
      exitPoints: [dbStep],
      metadata,
    };
  }

  private findFunctionCallers(
    targetFunction: FunctionDeclaration,
    file: FileAnalysis,
    dependencyGraph: DependencyGraph,
    fileAnalyses: FileAnalysis[],
  ): FunctionDeclaration[] {
    const callers: FunctionDeclaration[] = [];
    const targetId = `${file.filePath}:${targetFunction.name}`;

    // Find incoming edges to this function
    const incomingEdges = dependencyGraph.edges.filter(
      (edge) => edge.to === targetId && edge.type === 'call'
    );

    for (const edge of incomingEdges) {
      const callerNode = dependencyGraph.nodes.find((node) => node.id === edge.from);
      if (callerNode && callerNode.type === 'function') {
        const callerFile = fileAnalyses.find((f) => f.filePath === callerNode.filePath);
        if (callerFile) {
          const callerFunction = callerFile.functions.find((f) => f.name === callerNode.name);
          if (callerFunction) {
            callers.push(callerFunction);
          }
        }
      }
    }

    return callers;
  }

  // Helper methods for framework detection
  private isExpressRouteHandler(func: FunctionDeclaration, file: FileAnalysis): boolean {
    // Check if function parameters suggest Express route handler (req, res, next)
    const params = func.parameters.map((p) => p.name.toLowerCase());
    return (
      params.includes('req') || params.includes('request') ||
      params.includes('res') || params.includes('response')
    );
  }

  private isNestJSController(cls: any, file: FileAnalysis): boolean {
    // Check for @Controller decorator or similar patterns
    // This would need to parse decorators from the AST
    return cls.name.toLowerCase().includes('controller');
  }

  private isNestJSRouteHandler(method: FunctionDeclaration, file: FileAnalysis): boolean {
    // Check for HTTP method decorators (@Get, @Post, etc.)
    // This would need to parse decorators from the AST
    const methodName = method.name.toLowerCase();
    return ['get', 'post', 'put', 'delete', 'patch'].some((httpMethod) =>
      methodName.includes(httpMethod)
    );
  }

  private extractHttpMethod(func: FunctionDeclaration, file: FileAnalysis): HttpMethod {
    // Extract HTTP method from function name or decorators
    const name = func.name.toLowerCase();
    if (name.includes('post')) return HttpMethod.POST;
    if (name.includes('put')) return HttpMethod.PUT;
    if (name.includes('delete')) return HttpMethod.DELETE;
    if (name.includes('patch')) return HttpMethod.PATCH;
    return HttpMethod.GET;
  }

  private extractRoute(func: FunctionDeclaration, file: FileAnalysis): string {
    // Extract route from function name or nearby code
    // This is a simplified implementation
    return `/${func.name.replace(/Handler$/, '').toLowerCase()}`;
  }

  private extractNestJSHttpMethod(method: FunctionDeclaration, file: FileAnalysis): HttpMethod {
    return this.extractHttpMethod(method, file);
  }

  private extractNestJSRoute(method: FunctionDeclaration, cls: any, file: FileAnalysis): string {
    // Extract route from decorators
    const controllerRoute = cls.name.replace('Controller', '').toLowerCase();
    const methodRoute = method.name.toLowerCase();
    return `/${controllerRoute}/${methodRoute}`;
  }

  private matchesRoute(endpoint: string, route: string): boolean {
    // Simple route matching - in real implementation, this would be more sophisticated
    return endpoint.includes(route) || route.includes(endpoint);
  }

  private mapServiceCallTypeToStepType(serviceCallType: ServiceCallType): StepType {
    switch (serviceCallType) {
      case ServiceCallType.HTTP_REQUEST:
        return StepType.SERVICE_CALL;
      case ServiceCallType.DATABASE_QUERY:
        return StepType.DATABASE_OPERATION;
      case ServiceCallType.EXTERNAL_API:
        return StepType.EXTERNAL_API_CALL;
      default:
        return StepType.SERVICE_CALL;
    }
  }

  private getServiceCallName(serviceCall: ServiceCall): string {
    if (serviceCall.endpoint) {
      return `${serviceCall.method || 'REQUEST'} ${serviceCall.endpoint}`;
    }
    if (serviceCall.operation) {
      return `${serviceCall.service}.${serviceCall.operation}`;
    }
    return serviceCall.service;
  }

  private determineFlowType(steps: FlowStep[]): FlowType {
    const hasHttpEndpoint = steps.some((step) => step.type === StepType.HTTP_ENDPOINT);
    const hasDatabaseOperation = steps.some((step) => step.type === StepType.DATABASE_OPERATION);
    const hasServiceCall = steps.some((step) => step.type === StepType.SERVICE_CALL);

    if (hasHttpEndpoint && hasDatabaseOperation) {
      return FlowType.HTTP_TO_DATABASE;
    }
    if (hasServiceCall) {
      return FlowType.SERVICE_TO_SERVICE;
    }
    if (hasHttpEndpoint) {
      return FlowType.FRONTEND_TO_BACKEND;
    }
    return FlowType.FUNCTION_CHAIN;
  }

  private calculateFlowMetadata(steps: FlowStep[]): FlowMetadata {
    const hasExternalCalls = steps.some((step) => 
      step.serviceCall?.isExternal || step.type === StepType.EXTERNAL_API_CALL
    );
    const hasDatabaseOperations = steps.some((step) => 
      step.type === StepType.DATABASE_OPERATION
    );

    // Calculate complexity based on number of steps and branching
    const complexity = steps.length + steps.reduce((sum, step) => sum + step.nextSteps.length, 0);

    // Calculate max depth
    const maxDepth = this.calculateMaxDepth(steps);

    return {
      totalSteps: steps.length,
      maxDepth,
      hasExternalCalls,
      hasDatabaseOperations,
      complexity,
    };
  }

  private calculateMaxDepth(steps: FlowStep[]): number {
    // Simple depth calculation - in real implementation, this would be more sophisticated
    return Math.max(1, Math.ceil(steps.length / 2));
  }

  private findFileByPath(filePath: string, fileAnalyses: FileAnalysis[]): FileAnalysis | null {
    return fileAnalyses.find((file) => file.filePath === filePath) || null;
  }
}
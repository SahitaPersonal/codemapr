import { Injectable, Logger } from '@nestjs/common';
import { randomUUID } from 'crypto';
import {
  ProjectAnalysis,
  FileAnalysis,
  AnalysisSourceLocation,
  EndToEndFlow,
  FlowStep,
  StepType,
} from '@codemapr/shared';
import {
  FlowchartData,
  FlowNode,
  FlowEdge,
  NodeType,
  EdgeType,
  FlowchartType,
  LayoutAlgorithm,
  LayoutDirection,
  LayoutAlignment,
  CallType,
  FlowchartPosition,
  NodeData,
  NodeStyle,
  EdgeStyle,
  LayoutConfiguration,
  FlowchartSourceLocation,
} from '@codemapr/shared';

interface GraphNode {
  id: string;
  type: NodeType;
  data: NodeData;
  children: string[];
  parents: string[];
  level: number;
  position?: FlowchartPosition;
}

interface LayoutResult {
  nodes: FlowNode[];
  edges: FlowEdge[];
  bounds: { width: number; height: number };
}

@Injectable()
export class FlowchartService {
  private readonly logger = new Logger(FlowchartService.name);

  private convertSourceLocation(analysisLocation: AnalysisSourceLocation): FlowchartSourceLocation {
    return {
      filePath: analysisLocation.filePath,
      startLine: analysisLocation.start.line,
      endLine: analysisLocation.end.line,
      startColumn: analysisLocation.start.column,
      endColumn: analysisLocation.end.column,
    };
  }

  async generateProjectFlowchart(analysis: ProjectAnalysis): Promise<FlowchartData> {
    this.logger.debug(`Generating project flowchart for ${analysis.files.length} files`);

    const graphNodes = this.buildGraphFromAnalysis(analysis);
    const layoutResult = this.applyHierarchicalLayout(graphNodes, {
      algorithm: LayoutAlgorithm.HIERARCHICAL,
      direction: LayoutDirection.TOP_BOTTOM,
      spacing: {
        nodeSpacing: 100,
        rankSpacing: 150,
        edgeSpacing: 20,
      },
      alignment: LayoutAlignment.CENTER,
    });

    return {
      id: randomUUID(),
      projectId: analysis.projectId,
      name: `${analysis.metadata.name} - Project Overview`,
      type: FlowchartType.PROJECT_OVERVIEW,
      nodes: layoutResult.nodes,
      edges: layoutResult.edges,
      layout: {
        algorithm: LayoutAlgorithm.HIERARCHICAL,
        direction: LayoutDirection.TOP_BOTTOM,
        spacing: {
          nodeSpacing: 100,
          rankSpacing: 150,
          edgeSpacing: 20,
        },
        alignment: LayoutAlignment.CENTER,
      },
      metadata: {
        totalNodes: layoutResult.nodes.length,
        totalEdges: layoutResult.edges.length,
        maxDepth: this.calculateMaxDepth(graphNodes),
        analysisVersion: '1.0.0',
        generatedAt: new Date(),
        filters: [],
      },
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  }

  async generateFileFlowchart(fileAnalysis: FileAnalysis): Promise<FlowchartData> {
    this.logger.debug(`Generating file flowchart for ${fileAnalysis.filePath}`);

    const graphNodes = this.buildGraphFromFile(fileAnalysis);
    const layoutResult = this.applyHierarchicalLayout(graphNodes, {
      algorithm: LayoutAlgorithm.HIERARCHICAL,
      direction: LayoutDirection.TOP_BOTTOM,
      spacing: {
        nodeSpacing: 80,
        rankSpacing: 120,
        edgeSpacing: 15,
      },
      alignment: LayoutAlignment.CENTER,
    });

    return {
      id: randomUUID(),
      projectId: 'single-file',
      name: `${this.getFileName(fileAnalysis.filePath)} - File Structure`,
      type: FlowchartType.FILE_SPECIFIC,
      nodes: layoutResult.nodes,
      edges: layoutResult.edges,
      layout: {
        algorithm: LayoutAlgorithm.HIERARCHICAL,
        direction: LayoutDirection.TOP_BOTTOM,
        spacing: {
          nodeSpacing: 80,
          rankSpacing: 120,
          edgeSpacing: 15,
        },
        alignment: LayoutAlignment.CENTER,
      },
      metadata: {
        totalNodes: layoutResult.nodes.length,
        totalEdges: layoutResult.edges.length,
        maxDepth: this.calculateMaxDepth(graphNodes),
        analysisVersion: '1.0.0',
        generatedAt: new Date(),
        filters: [],
      },
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  }

  async generateDependencyGraph(analysis: ProjectAnalysis): Promise<FlowchartData> {
    this.logger.debug(`Generating dependency graph for ${analysis.dependencies.nodes.length} nodes`);

    const nodes: FlowNode[] = analysis.dependencies.nodes.map((depNode) => ({
      id: depNode.id,
      type: this.mapDependencyNodeType(depNode.type),
      position: { x: 0, y: 0 }, // Will be set by layout
      data: {
        label: depNode.name,
        description: `${depNode.type}: ${depNode.name}`,
        sourceLocation: {
          filePath: depNode.filePath,
          startLine: 1,
          endLine: 1,
          startColumn: 1,
          endColumn: 1,
        },
        metadata: {
          nodeType: depNode.type,
          filePath: depNode.filePath,
        },
      },
      style: this.getNodeStyle(this.mapDependencyNodeType(depNode.type)),
      draggable: true,
      selectable: true,
    }));

    const edges: FlowEdge[] = analysis.dependencies.edges.map((depEdge) => ({
      id: `${depEdge.from}-${depEdge.to}`,
      source: depEdge.from,
      target: depEdge.to,
      type: this.mapDependencyEdgeType(depEdge.type),
      data: {
        callType: depEdge.dynamic ? CallType.ASYNCHRONOUS : CallType.SYNCHRONOUS,
        isAsync: depEdge.dynamic,
        metadata: {
          edgeType: depEdge.type,
          dynamic: depEdge.dynamic,
        },
      },
      style: this.getEdgeStyle(this.mapDependencyEdgeType(depEdge.type)),
      animated: depEdge.dynamic,
    }));

    // Apply force-directed layout for dependency graphs
    const layoutResult = this.applyForceDirectedLayout(nodes, edges);

    return {
      id: randomUUID(),
      projectId: analysis.projectId,
      name: `${analysis.metadata.name} - Dependencies`,
      type: FlowchartType.DEPENDENCY_GRAPH,
      nodes: layoutResult.nodes,
      edges: layoutResult.edges,
      layout: {
        algorithm: LayoutAlgorithm.FORCE_DIRECTED,
        direction: LayoutDirection.TOP_BOTTOM,
        spacing: {
          nodeSpacing: 150,
          rankSpacing: 200,
          edgeSpacing: 30,
        },
        alignment: LayoutAlignment.CENTER,
      },
      metadata: {
        totalNodes: layoutResult.nodes.length,
        totalEdges: layoutResult.edges.length,
        maxDepth: 0, // Force-directed doesn't have levels
        analysisVersion: '1.0.0',
        generatedAt: new Date(),
        filters: [],
      },
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  }

  async generateServiceFlowchart(analysis: ProjectAnalysis): Promise<FlowchartData> {
    this.logger.debug(`Generating service flow flowchart for ${analysis.endToEndFlows?.length || 0} flows`);

    if (!analysis.endToEndFlows || analysis.endToEndFlows.length === 0) {
      // Return empty flowchart if no flows
      return {
        id: randomUUID(),
        projectId: analysis.projectId,
        name: `${analysis.metadata.name} - Service Flows`,
        type: FlowchartType.SERVICE_FLOW,
        nodes: [],
        edges: [],
        layout: {
          algorithm: LayoutAlgorithm.HIERARCHICAL,
          direction: LayoutDirection.LEFT_RIGHT,
          spacing: {
            nodeSpacing: 120,
            rankSpacing: 200,
            edgeSpacing: 30,
          },
          alignment: LayoutAlignment.CENTER,
        },
        metadata: {
          totalNodes: 0,
          totalEdges: 0,
          maxDepth: 0,
          analysisVersion: '1.0.0',
          generatedAt: new Date(),
          filters: [],
        },
        createdAt: new Date(),
        updatedAt: new Date(),
      };
    }

    const allNodes = new Map<string, FlowNode>();
    const allEdges: FlowEdge[] = [];

    // Process each end-to-end flow
    analysis.endToEndFlows.forEach((flow, flowIndex) => {
      flow.steps.forEach((step, stepIndex) => {
        // Create node for this step
        const nodeId = step.id;
        if (!allNodes.has(nodeId)) {
          const flowNode: FlowNode = {
            id: nodeId,
            type: this.mapStepTypeToNodeType(step.type),
            position: { x: 0, y: 0 }, // Will be set by layout
            data: {
              label: step.name,
              description: this.getStepDescription(step),
              sourceLocation: {
                filePath: step.filePath,
                startLine: step.location.startLine,
                endLine: step.location.endLine,
                startColumn: step.location.startColumn,
                endColumn: step.location.endColumn,
              },
              isServiceCall: !!step.serviceCall,
              serviceType: step.serviceCall ? this.mapServiceCallToServiceType(step.serviceCall) : undefined,
              serviceCallType: step.serviceCall?.type,
              isExternal: step.serviceCall?.isExternal,
              metadata: {
                stepType: step.type,
                flowId: flow.id,
                flowName: flow.name,
                ...step.metadata,
              },
            },
            style: this.getServiceNodeStyle(step.type, step.serviceCall),
            draggable: true,
            selectable: true,
          };

          allNodes.set(nodeId, flowNode);
        }

        // Create edges for next steps
        step.nextSteps.forEach((nextStepId) => {
          const edgeId = `${nodeId}-${nextStepId}`;
          const nextStep = flow.steps.find((s) => s.id === nextStepId);
          
          if (nextStep) {
            const edge: FlowEdge = {
              id: edgeId,
              source: nodeId,
              target: nextStepId,
              type: this.mapStepConnectionToEdgeType(step, nextStep),
              data: {
                label: this.getEdgeLabel(step, nextStep),
                callType: step.serviceCall?.isExternal ? CallType.ASYNCHRONOUS : CallType.SYNCHRONOUS,
                isAsync: step.functionCall?.isAsync || step.serviceCall?.isExternal || false,
                metadata: {
                  flowId: flow.id,
                  sourceStep: step.type,
                  targetStep: nextStep.type,
                },
              },
              style: this.getServiceEdgeStyle(step, nextStep),
              animated: step.serviceCall?.isExternal || step.functionCall?.isAsync || false,
            };

            allEdges.push(edge);
          }
        });
      });
    });

    const nodes = Array.from(allNodes.values());
    
    // Apply hierarchical layout for service flows
    const layoutResult = this.applyServiceFlowLayout(nodes, allEdges);

    return {
      id: randomUUID(),
      projectId: analysis.projectId,
      name: `${analysis.metadata.name} - Service Flows`,
      type: FlowchartType.SERVICE_FLOW,
      nodes: layoutResult.nodes,
      edges: layoutResult.edges,
      layout: {
        algorithm: LayoutAlgorithm.HIERARCHICAL,
        direction: LayoutDirection.LEFT_RIGHT,
        spacing: {
          nodeSpacing: 120,
          rankSpacing: 200,
          edgeSpacing: 30,
        },
        alignment: LayoutAlignment.CENTER,
      },
      metadata: {
        totalNodes: layoutResult.nodes.length,
        totalEdges: layoutResult.edges.length,
        maxDepth: analysis.endToEndFlows.reduce((max, flow) => Math.max(max, flow.metadata.maxDepth), 0),
        analysisVersion: '1.0.0',
        generatedAt: new Date(),
        filters: [],
      },
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  }

  private buildGraphFromAnalysis(analysis: ProjectAnalysis): GraphNode[] {
    const nodes: GraphNode[] = [];
    const nodeMap = new Map<string, GraphNode>();

    // Create nodes for files
    analysis.files.forEach((file) => {
      const fileNode: GraphNode = {
        id: file.filePath,
        type: NodeType.FILE,
        data: {
          label: this.getFileName(file.filePath),
          description: `File: ${file.filePath}`,
          sourceLocation: {
            filePath: file.filePath,
            startLine: 1,
            endLine: 1,
            startColumn: 1,
            endColumn: 1,
          },
          complexity: file.complexity.cyclomatic,
          metadata: {
            language: file.language,
            totalFunctions: file.functions.length,
            totalClasses: file.classes.length,
          },
        },
        children: [],
        parents: [],
        level: 0,
      };

      nodes.push(fileNode);
      nodeMap.set(fileNode.id, fileNode);

      // Create nodes for functions
      file.functions.forEach((func) => {
        const funcNode: GraphNode = {
          id: `${file.filePath}:${func.name}`,
          type: NodeType.FUNCTION,
          data: {
            label: func.name,
            description: `Function: ${func.name}`,
            sourceLocation: this.convertSourceLocation(func.location),
            complexity: func.complexity,
            metadata: {
              isAsync: func.isAsync,
              parameters: func.parameters.length,
            },
          },
          children: [],
          parents: [fileNode.id],
          level: 1,
        };

        nodes.push(funcNode);
        nodeMap.set(funcNode.id, funcNode);
        fileNode.children.push(funcNode.id);
      });

      // Create nodes for classes
      file.classes.forEach((cls) => {
        const classNode: GraphNode = {
          id: `${file.filePath}:${cls.name}`,
          type: NodeType.CLASS,
          data: {
            label: cls.name,
            description: `Class: ${cls.name}`,
            sourceLocation: this.convertSourceLocation(cls.location),
            metadata: {
              methods: cls.methods.length,
              properties: cls.properties.length,
              extends: cls.extends,
            },
          },
          children: [],
          parents: [fileNode.id],
          level: 1,
        };

        nodes.push(classNode);
        nodeMap.set(classNode.id, classNode);
        fileNode.children.push(classNode.id);
      });
    });

    // Add dependency relationships
    analysis.dependencies.edges.forEach((edge) => {
      const sourceNode = nodeMap.get(edge.from);
      const targetNode = nodeMap.get(edge.to);

      if (sourceNode && targetNode) {
        if (!sourceNode.children.includes(edge.to)) {
          sourceNode.children.push(edge.to);
        }
        if (!targetNode.parents.includes(edge.from)) {
          targetNode.parents.push(edge.from);
        }
      }
    });

    return nodes;
  }

  private buildGraphFromFile(fileAnalysis: FileAnalysis): GraphNode[] {
    const nodes: GraphNode[] = [];

    // File root node
    const fileNode: GraphNode = {
      id: fileAnalysis.filePath,
      type: NodeType.FILE,
      data: {
        label: this.getFileName(fileAnalysis.filePath),
        description: `File: ${fileAnalysis.filePath}`,
        sourceLocation: {
          filePath: fileAnalysis.filePath,
          startLine: 1,
          endLine: 1,
          startColumn: 1,
          endColumn: 1,
        },
        complexity: fileAnalysis.complexity.cyclomatic,
        metadata: {
          language: fileAnalysis.language,
        },
      },
      children: [],
      parents: [],
      level: 0,
    };

    nodes.push(fileNode);

    // Function nodes
    fileAnalysis.functions.forEach((func) => {
      const funcNode: GraphNode = {
        id: `${fileAnalysis.filePath}:${func.name}`,
        type: NodeType.FUNCTION,
        data: {
          label: func.name,
          description: `Function: ${func.name}`,
          sourceLocation: this.convertSourceLocation(func.location),
          complexity: func.complexity,
          metadata: {
            isAsync: func.isAsync,
            parameters: func.parameters.length,
          },
        },
        children: [],
        parents: [fileNode.id],
        level: 1,
      };

      nodes.push(funcNode);
      fileNode.children.push(funcNode.id);
    });

    // Class nodes
    fileAnalysis.classes.forEach((cls) => {
      const classNode: GraphNode = {
        id: `${fileAnalysis.filePath}:${cls.name}`,
        type: NodeType.CLASS,
        data: {
          label: cls.name,
          description: `Class: ${cls.name}`,
          sourceLocation: this.convertSourceLocation(cls.location),
          metadata: {
            methods: cls.methods.length,
            properties: cls.properties.length,
          },
        },
        children: [],
        parents: [fileNode.id],
        level: 1,
      };

      nodes.push(classNode);
      fileNode.children.push(classNode.id);

      // Method nodes
      cls.methods.forEach((method) => {
        const methodNode: GraphNode = {
          id: `${fileAnalysis.filePath}:${cls.name}.${method.name}`,
          type: NodeType.FUNCTION,
          data: {
            label: method.name,
            description: `Method: ${cls.name}.${method.name}`,
            sourceLocation: this.convertSourceLocation(method.location),
            complexity: method.complexity,
            metadata: {
              isAsync: method.isAsync,
              parameters: method.parameters.length,
              parentClass: cls.name,
            },
          },
          children: [],
          parents: [classNode.id],
          level: 2,
        };

        nodes.push(methodNode);
        classNode.children.push(methodNode.id);
      });
    });

    return nodes;
  }

  private applyHierarchicalLayout(graphNodes: GraphNode[], config: LayoutConfiguration): LayoutResult {
    const nodes: FlowNode[] = [];
    const edges: FlowEdge[] = [];
    const levelGroups = new Map<number, GraphNode[]>();

    // Group nodes by level
    graphNodes.forEach((node) => {
      if (!levelGroups.has(node.level)) {
        levelGroups.set(node.level, []);
      }
      levelGroups.get(node.level)!.push(node);
    });

    // Calculate positions
    let maxWidth = 0;
    let currentY = 50;

    Array.from(levelGroups.keys()).sort().forEach((level) => {
      const levelNodes = levelGroups.get(level)!;
      const levelWidth = levelNodes.length * (200 + config.spacing.nodeSpacing);
      maxWidth = Math.max(maxWidth, levelWidth);

      let currentX = (levelWidth - (levelNodes.length - 1) * (200 + config.spacing.nodeSpacing)) / 2;

      levelNodes.forEach((graphNode) => {
        const flowNode: FlowNode = {
          id: graphNode.id,
          type: graphNode.type,
          position: { x: currentX, y: currentY },
          data: graphNode.data,
          style: this.getNodeStyle(graphNode.type),
          draggable: true,
          selectable: true,
        };

        nodes.push(flowNode);
        currentX += 200 + config.spacing.nodeSpacing;
      });

      currentY += 100 + config.spacing.rankSpacing;
    });

    // Create edges
    graphNodes.forEach((node) => {
      node.children.forEach((childId) => {
        const edge: FlowEdge = {
          id: `${node.id}-${childId}`,
          source: node.id,
          target: childId,
          type: EdgeType.FUNCTION_CALL,
          data: {
            callType: CallType.SYNCHRONOUS,
            isAsync: false,
            metadata: {},
          },
          style: this.getEdgeStyle(EdgeType.FUNCTION_CALL),
          animated: false,
        };

        edges.push(edge);
      });
    });

    return {
      nodes,
      edges,
      bounds: { width: maxWidth, height: currentY },
    };
  }

  private applyForceDirectedLayout(nodes: FlowNode[], edges: FlowEdge[]): LayoutResult {
    // Simple force-directed layout simulation
    const positions = new Map<string, FlowchartPosition>();
    const forces = new Map<string, { x: number; y: number }>();

    // Initialize random positions
    nodes.forEach((node) => {
      positions.set(node.id, {
        x: Math.random() * 800 + 100,
        y: Math.random() * 600 + 100,
      });
      forces.set(node.id, { x: 0, y: 0 });
    });

    // Run simulation iterations
    for (let i = 0; i < 100; i++) {
      // Reset forces
      forces.forEach((force) => {
        force.x = 0;
        force.y = 0;
      });

      // Repulsion between all nodes
      nodes.forEach((nodeA) => {
        nodes.forEach((nodeB) => {
          if (nodeA.id !== nodeB.id) {
            const posA = positions.get(nodeA.id)!;
            const posB = positions.get(nodeB.id)!;
            const dx = posA.x - posB.x;
            const dy = posA.y - posB.y;
            const distance = Math.sqrt(dx * dx + dy * dy) || 1;
            const force = 1000 / (distance * distance);

            const forceA = forces.get(nodeA.id)!;
            forceA.x += (dx / distance) * force;
            forceA.y += (dy / distance) * force;
          }
        });
      });

      // Attraction along edges
      edges.forEach((edge) => {
        const posSource = positions.get(edge.source)!;
        const posTarget = positions.get(edge.target)!;
        const dx = posTarget.x - posSource.x;
        const dy = posTarget.y - posSource.y;
        const distance = Math.sqrt(dx * dx + dy * dy) || 1;
        const force = distance * 0.01;

        const forceSource = forces.get(edge.source)!;
        const forceTarget = forces.get(edge.target)!;

        forceSource.x += (dx / distance) * force;
        forceSource.y += (dy / distance) * force;
        forceTarget.x -= (dx / distance) * force;
        forceTarget.y -= (dy / distance) * force;
      });

      // Apply forces
      positions.forEach((pos, nodeId) => {
        const force = forces.get(nodeId)!;
        pos.x += force.x * 0.1;
        pos.y += force.y * 0.1;

        // Keep within bounds
        pos.x = Math.max(50, Math.min(950, pos.x));
        pos.y = Math.max(50, Math.min(650, pos.y));
      });
    }

    // Update node positions
    const layoutNodes = nodes.map((node) => ({
      ...node,
      position: positions.get(node.id)!,
    }));

    return {
      nodes: layoutNodes,
      edges,
      bounds: { width: 1000, height: 700 },
    };
  }

  private getNodeStyle(nodeType: NodeType): NodeStyle {
    const baseStyle: NodeStyle = {
      backgroundColor: '#ffffff',
      borderColor: '#d1d5db',
      borderWidth: 2,
      color: '#374151',
      fontSize: 14,
      fontWeight: '500',
      borderRadius: 8,
      width: 200,
      height: 80,
    };

    switch (nodeType) {
      case NodeType.FILE:
        return {
          ...baseStyle,
          backgroundColor: '#f3f4f6',
          borderColor: '#6b7280',
          color: '#1f2937',
        };
      case NodeType.FUNCTION:
        return {
          ...baseStyle,
          backgroundColor: '#dbeafe',
          borderColor: '#3b82f6',
          color: '#1e40af',
        };
      case NodeType.CLASS:
        return {
          ...baseStyle,
          backgroundColor: '#dcfce7',
          borderColor: '#16a34a',
          color: '#15803d',
        };
      case NodeType.COMPONENT:
        return {
          ...baseStyle,
          backgroundColor: '#fef3c7',
          borderColor: '#f59e0b',
          color: '#d97706',
        };
      case NodeType.SERVICE_CALL:
        return {
          ...baseStyle,
          backgroundColor: '#fce7f3',
          borderColor: '#ec4899',
          color: '#be185d',
        };
      default:
        return baseStyle;
    }
  }

  private getEdgeStyle(edgeType: EdgeType): EdgeStyle {
    const baseStyle: EdgeStyle = {
      stroke: '#6b7280',
      strokeWidth: 2,
    };

    switch (edgeType) {
      case EdgeType.FUNCTION_CALL:
        return {
          ...baseStyle,
          stroke: '#3b82f6',
        };
      case EdgeType.IMPORT:
        return {
          ...baseStyle,
          stroke: '#16a34a',
          strokeDasharray: '5,5',
        };
      case EdgeType.EXTENDS:
        return {
          ...baseStyle,
          stroke: '#f59e0b',
          strokeWidth: 3,
        };
      case EdgeType.IMPLEMENTS:
        return {
          ...baseStyle,
          stroke: '#8b5cf6',
          strokeDasharray: '10,5',
        };
      default:
        return baseStyle;
    }
  }

  private mapDependencyNodeType(depType: string): NodeType {
    switch (depType) {
      case 'file':
        return NodeType.FILE;
      case 'function':
        return NodeType.FUNCTION;
      case 'class':
        return NodeType.CLASS;
      case 'variable':
        return NodeType.MODULE;
      default:
        return NodeType.MODULE;
    }
  }

  private mapDependencyEdgeType(depType: string): EdgeType {
    switch (depType) {
      case 'import':
        return EdgeType.IMPORT;
      case 'call':
        return EdgeType.FUNCTION_CALL;
      case 'extends':
        return EdgeType.EXTENDS;
      case 'implements':
        return EdgeType.IMPLEMENTS;
      default:
        return EdgeType.FUNCTION_CALL;
    }
  }

  private calculateMaxDepth(nodes: GraphNode[]): number {
    return Math.max(...nodes.map((node) => node.level), 0);
  }

  private getFileName(filePath: string): string {
    return filePath.split('/').pop() || filePath;
  }

  // Service flow mapping methods
  private mapStepTypeToNodeType(stepType: any): NodeType {
    switch (stepType) {
      case 'http_endpoint':
        return NodeType.API_ENDPOINT;
      case 'function_call':
        return NodeType.FUNCTION;
      case 'service_call':
        return NodeType.SERVICE_CALL;
      case 'database_operation':
        return NodeType.DATABASE;
      case 'external_api_call':
        return NodeType.SERVICE_CALL;
      case 'handler':
        return NodeType.FUNCTION;
      default:
        return NodeType.FUNCTION;
    }
  }

  private mapServiceCallToServiceType(serviceCall: any): any {
    if (serviceCall.type === 'http_request') {
      return 'HTTP_CLIENT';
    }
    if (serviceCall.type === 'database_query') {
      return 'DATABASE';
    }
    if (serviceCall.type === 'external_api') {
      return 'EXTERNAL_API';
    }
    return 'HTTP_CLIENT';
  }

  private getStepDescription(step: any): string {
    if (step.serviceCall) {
      if (step.serviceCall.endpoint) {
        return `${step.serviceCall.method || 'REQUEST'} ${step.serviceCall.endpoint}`;
      }
      if (step.serviceCall.operation) {
        return `${step.serviceCall.service}.${step.serviceCall.operation}`;
      }
      return step.serviceCall.service;
    }
    if (step.functionCall) {
      return `Function: ${step.name}`;
    }
    return step.name;
  }

  private mapStepConnectionToEdgeType(fromStep: any, toStep: any): EdgeType {
    if (fromStep.serviceCall?.type === 'http_request') {
      return EdgeType.HTTP_REQUEST;
    }
    if (fromStep.serviceCall?.type === 'database_query') {
      return EdgeType.DATABASE_QUERY;
    }
    return EdgeType.FUNCTION_CALL;
  }

  private getEdgeLabel(fromStep: any, toStep: any): string {
    if (fromStep.serviceCall) {
      if (fromStep.serviceCall.method) {
        return fromStep.serviceCall.method;
      }
      if (fromStep.serviceCall.operation) {
        return fromStep.serviceCall.operation;
      }
    }
    return '';
  }

  private getServiceNodeStyle(stepType: any, serviceCall?: any): NodeStyle {
    const baseStyle: NodeStyle = {
      backgroundColor: '#ffffff',
      borderColor: '#d1d5db',
      borderWidth: 2,
      color: '#374151',
      fontSize: 14,
      fontWeight: '500',
      borderRadius: 8,
      width: 200,
      height: 80,
    };

    switch (stepType) {
      case 'http_endpoint':
        return {
          ...baseStyle,
          backgroundColor: '#dbeafe',
          borderColor: '#3b82f6',
          color: '#1e40af',
        };
      case 'service_call':
        return {
          ...baseStyle,
          backgroundColor: '#fce7f3',
          borderColor: '#ec4899',
          color: '#be185d',
        };
      case 'database_operation':
        return {
          ...baseStyle,
          backgroundColor: '#f3e8ff',
          borderColor: '#8b5cf6',
          color: '#7c3aed',
        };
      case 'external_api_call':
        return {
          ...baseStyle,
          backgroundColor: '#fef3c7',
          borderColor: '#f59e0b',
          color: '#d97706',
        };
      case 'function_call':
      case 'handler':
        return {
          ...baseStyle,
          backgroundColor: '#dcfce7',
          borderColor: '#16a34a',
          color: '#15803d',
        };
      default:
        return baseStyle;
    }
  }

  private getServiceEdgeStyle(fromStep: any, toStep: any): EdgeStyle {
    const baseStyle: EdgeStyle = {
      stroke: '#6b7280',
      strokeWidth: 2,
    };

    if (fromStep.serviceCall?.type === 'http_request') {
      return {
        ...baseStyle,
        stroke: '#ec4899',
        strokeWidth: 3,
      };
    }
    if (fromStep.serviceCall?.type === 'database_query') {
      return {
        ...baseStyle,
        stroke: '#8b5cf6',
        strokeWidth: 3,
      };
    }
    return {
      ...baseStyle,
      stroke: '#16a34a',
    };
  }

  private applyServiceFlowLayout(nodes: FlowNode[], edges: FlowEdge[]): LayoutResult {
    // Create a simple left-to-right layout for service flows
    const nodeMap = new Map<string, FlowNode>();
    nodes.forEach((node) => nodeMap.set(node.id, node));

    // Find entry points (nodes with no incoming edges)
    const incomingEdges = new Set(edges.map((e) => e.target));
    const entryPoints = nodes.filter((node) => !incomingEdges.has(node.id));

    // Assign levels using BFS
    const levels = new Map<string, number>();
    const queue = entryPoints.map((node) => ({ id: node.id, level: 0 }));
    const visited = new Set<string>();

    while (queue.length > 0) {
      const { id, level } = queue.shift()!;
      if (visited.has(id)) continue;
      
      visited.add(id);
      levels.set(id, level);

      // Add children to queue
      edges
        .filter((edge) => edge.source === id)
        .forEach((edge) => {
          if (!visited.has(edge.target)) {
            queue.push({ id: edge.target, level: level + 1 });
          }
        });
    }

    // Group nodes by level
    const levelGroups = new Map<number, FlowNode[]>();
    nodes.forEach((node) => {
      const level = levels.get(node.id) || 0;
      if (!levelGroups.has(level)) {
        levelGroups.set(level, []);
      }
      levelGroups.get(level)!.push(node);
    });

    // Position nodes
    let maxHeight = 0;
    let currentX = 100;

    Array.from(levelGroups.keys()).sort().forEach((level) => {
      const levelNodes = levelGroups.get(level)!;
      const levelHeight = levelNodes.length * 120;
      maxHeight = Math.max(maxHeight, levelHeight);

      let currentY = (levelHeight - (levelNodes.length - 1) * 120) / 2 + 100;

      levelNodes.forEach((node) => {
        node.position = { x: currentX, y: currentY };
        currentY += 120;
      });

      currentX += 250;
    });

    return {
      nodes,
      edges,
      bounds: { width: currentX + 100, height: maxHeight + 200 },
    };
  }
}
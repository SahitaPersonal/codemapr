export interface FlowchartData {
  id: string;
  projectId: string;
  name: string;
  type: FlowchartType;
  nodes: FlowNode[];
  edges: FlowEdge[];
  layout: LayoutConfiguration;
  metadata: FlowchartMetadata;
  createdAt: Date;
  updatedAt: Date;
}

export interface FlowNode {
  id: string;
  type: NodeType;
  position: Position;
  data: NodeData;
  style: NodeStyle;
  draggable: boolean;
  selectable: boolean;
}

export interface FlowEdge {
  id: string;
  source: string;
  target: string;
  type: EdgeType;
  data: EdgeData;
  style: EdgeStyle;
  animated: boolean;
}

export interface NodeData {
  label: string;
  description?: string;
  sourceLocation: SourceLocation;
  complexity?: number;
  executionTime?: number;
  isServiceCall?: boolean;
  serviceType?: ServiceType;
  serviceCallType?: import('./analysis').ServiceCallType;
  isExternal?: boolean;
  metadata: Record<string, any>;
}

export interface EdgeData {
  label?: string;
  callType: CallType;
  isAsync: boolean;
  parameters?: string[];
  metadata: Record<string, any>;
}

export interface NodeStyle {
  backgroundColor: string;
  borderColor: string;
  borderWidth: number;
  color: string;
  fontSize: number;
  fontWeight: string;
  borderRadius: number;
  width?: number;
  height?: number;
}

export interface EdgeStyle {
  stroke: string;
  strokeWidth: number;
  strokeDasharray?: string;
}

export interface Position {
  x: number;
  y: number;
}

export interface SourceLocation {
  filePath: string;
  startLine: number;
  endLine: number;
  startColumn: number;
  endColumn: number;
}

export interface LayoutConfiguration {
  algorithm: LayoutAlgorithm;
  direction: LayoutDirection;
  spacing: LayoutSpacing;
  alignment: LayoutAlignment;
}

export interface LayoutSpacing {
  nodeSpacing: number;
  rankSpacing: number;
  edgeSpacing: number;
}

export interface FlowchartMetadata {
  totalNodes: number;
  totalEdges: number;
  maxDepth: number;
  analysisVersion: string;
  generatedAt: Date;
  filters: FlowchartFilter[];
}

export interface FlowchartFilter {
  type: FilterType;
  value: string | number | boolean;
  enabled: boolean;
}

export enum FlowchartType {
  PROJECT_OVERVIEW = 'project_overview',
  FILE_SPECIFIC = 'file_specific',
  FUNCTION_FLOW = 'function_flow',
  DEPENDENCY_GRAPH = 'dependency_graph',
  SERVICE_FLOW = 'service_flow'
}

export enum NodeType {
  FUNCTION = 'function',
  CLASS = 'class',
  COMPONENT = 'component',
  SERVICE_CALL = 'service_call',
  DATABASE = 'database',
  API_ENDPOINT = 'api_endpoint',
  FILE = 'file',
  MODULE = 'module'
}

export enum EdgeType {
  FUNCTION_CALL = 'function_call',
  IMPORT = 'import',
  EXTENDS = 'extends',
  IMPLEMENTS = 'implements',
  HTTP_REQUEST = 'http_request',
  DATABASE_QUERY = 'database_query'
}

export enum ServiceType {
  HTTP_CLIENT = 'http_client',
  DATABASE = 'database',
  EXTERNAL_API = 'external_api',
  MESSAGE_QUEUE = 'message_queue',
  CACHE = 'cache',
  FILE_SYSTEM = 'file_system'
}

export enum CallType {
  SYNCHRONOUS = 'sync',
  ASYNCHRONOUS = 'async',
  PROMISE = 'promise',
  CALLBACK = 'callback'
}

export enum LayoutAlgorithm {
  HIERARCHICAL = 'hierarchical',
  FORCE_DIRECTED = 'force_directed',
  CIRCULAR = 'circular',
  TREE = 'tree'
}

export enum LayoutDirection {
  TOP_BOTTOM = 'TB',
  BOTTOM_TOP = 'BT',
  LEFT_RIGHT = 'LR',
  RIGHT_LEFT = 'RL'
}

export enum LayoutAlignment {
  START = 'start',
  CENTER = 'center',
  END = 'end'
}

export enum FilterType {
  COMPLEXITY = 'complexity',
  FILE_TYPE = 'file_type',
  SERVICE_TYPE = 'service_type',
  EXECUTION_TIME = 'execution_time',
  NODE_TYPE = 'node_type'
}
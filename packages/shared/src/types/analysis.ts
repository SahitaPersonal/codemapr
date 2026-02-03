export interface ProjectAnalysis {
  id: string;
  projectId: string;
  files: FileAnalysis[];
  dependencies: DependencyGraph;
  entryPoints: string[];
  metadata: ProjectMetadata;
  endToEndFlows?: EndToEndFlow[];
  createdAt: Date;
  updatedAt: Date;
}

export interface FileAnalysis {
  filePath: string;
  language: SupportedLanguage;
  ast: any; // TypeScript.SourceFile or Babel AST
  symbols: Symbol[];
  imports: ImportDeclaration[];
  exports: ExportDeclaration[];
  functions: FunctionDeclaration[];
  classes: ClassDeclaration[];
  complexity: ComplexityMetrics;
  serviceCalls?: ServiceCall[];
  externalServices?: string[];
  databaseOperations?: ServiceCall[];
}

export interface DependencyGraph {
  nodes: DependencyNode[];
  edges: DependencyEdge[];
  cycles: string[][];
}

export interface DependencyNode {
  id: string;
  filePath: string;
  type: 'file' | 'function' | 'class' | 'variable';
  name: string;
}

export interface DependencyEdge {
  from: string;
  to: string;
  type: 'import' | 'call' | 'extends' | 'implements';
  dynamic: boolean;
}

export interface Symbol {
  id: string;
  name: string;
  type: SymbolType;
  location: SourceLocation;
  references: SourceLocation[];
}

export interface ImportDeclaration {
  source: string;
  specifiers: ImportSpecifier[];
  isDynamic: boolean;
  location: SourceLocation;
}

export interface ExportDeclaration {
  name: string;
  type: 'default' | 'named';
  location: SourceLocation;
}

export interface FunctionDeclaration {
  name: string;
  parameters: Parameter[];
  returnType?: string;
  isAsync: boolean;
  location: SourceLocation;
  complexity: number;
}

export interface ClassDeclaration {
  name: string;
  extends?: string;
  implements?: string[];
  methods: FunctionDeclaration[];
  properties: PropertyDeclaration[];
  location: SourceLocation;
}

export interface PropertyDeclaration {
  name: string;
  type?: string;
  isStatic: boolean;
  visibility: 'public' | 'private' | 'protected';
  location: SourceLocation;
}

export interface Parameter {
  name: string;
  type?: string;
  optional: boolean;
  defaultValue?: string;
}

export interface ImportSpecifier {
  imported: string;
  local: string;
}

export interface SourceLocation {
  start: Position;
  end: Position;
  filePath: string;
}

export interface Position {
  line: number;
  column: number;
}

export interface ProjectMetadata {
  name: string;
  version: string;
  language: SupportedLanguage;
  framework?: string;
  packageManager: 'npm' | 'yarn' | 'pnpm';
  totalFiles: number;
  totalLines: number;
}

export interface ComplexityMetrics {
  cyclomatic: number;
  cognitive: number;
  maintainability: number;
  technicalDebt: number;
}

export enum SupportedLanguage {
  JAVASCRIPT = 'javascript',
  TYPESCRIPT = 'typescript',
  JSX = 'jsx',
  TSX = 'tsx'
}

export enum SymbolType {
  FUNCTION = 'function',
  CLASS = 'class',
  VARIABLE = 'variable',
  INTERFACE = 'interface',
  TYPE = 'type',
  ENUM = 'enum'
}

export enum AnalysisStatus {
  PENDING = 'pending',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  FAILED = 'failed'
}

export interface ServiceCall {
  id: string;
  type: ServiceCallType;
  service: string;
  method?: HttpMethod;
  endpoint?: string;
  operation?: string;
  location: AnalysisSourceLocation;
  isExternal: boolean;
  metadata?: Record<string, any>;
}

export enum ServiceCallType {
  HTTP_REQUEST = 'http_request',
  DATABASE_QUERY = 'database_query',
  EXTERNAL_API = 'external_api',
  INTERNAL_SERVICE = 'internal_service'
}

export enum HttpMethod {
  GET = 'GET',
  POST = 'POST',
  PUT = 'PUT',
  DELETE = 'DELETE',
  PATCH = 'PATCH',
  HEAD = 'HEAD',
  OPTIONS = 'OPTIONS'
}

// Alias for consistency with existing code
export type AnalysisSourceLocation = SourceLocation;

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
export interface ProjectAnalysis {
  id: string;
  projectId: string;
  files: FileAnalysis[];
  dependencies: DependencyGraph;
  entryPoints: string[];
  metadata: ProjectMetadata;
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
// Export all types from individual modules
// Note: Some types may have naming conflicts, import specifically when needed

// Analysis types
export type {
  ProjectAnalysis,
  FileAnalysis,
  DependencyGraph,
  DependencyNode,
  DependencyEdge,
  Symbol,
  ImportDeclaration,
  ExportDeclaration,
  FunctionDeclaration,
  ClassDeclaration,
  PropertyDeclaration,
  Parameter,
  ImportSpecifier,
  SourceLocation as AnalysisSourceLocation,
  Position as AnalysisPosition,
  ProjectMetadata,
  ComplexityMetrics,
  ServiceCall,
  EndToEndFlow,
  FlowStep,
  FlowMetadata,
  SecurityVulnerability,
  PerformanceIssue,
} from './types/analysis';

export {
  SupportedLanguage,
  SymbolType,
  AnalysisStatus,
  ServiceCallType,
  HttpMethod,
  FlowType,
  StepType,
  SecurityVulnerabilityType,
  SecuritySeverity,
  PerformanceIssueType,
  PerformanceSeverity,
} from './types/analysis';

// Flowchart types
export type {
  FlowchartData,
  FlowNode,
  FlowEdge,
  NodeData,
  EdgeData,
  NodeStyle,
  EdgeStyle,
  Position as FlowchartPosition,
  SourceLocation as FlowchartSourceLocation,
  LayoutConfiguration,
  LayoutSpacing,
  FlowchartMetadata,
  FlowchartFilter,
} from './types/flowchart';

export {
  FlowchartType,
  NodeType,
  EdgeType,
  ServiceType,
  CallType,
  LayoutAlgorithm,
  LayoutDirection,
  LayoutAlignment,
  FilterType,
} from './types/flowchart';

// Collaboration types
export * from './types/collaboration';

// AI types
export * from './types/ai';

// Preferences types
export * from './types/preferences';

// Project types
export type {
  Project,
  ProjectSettings,
  AnalysisResult,
  AnalysisError,
  AnalysisMetrics,
  User,
  UserPreferences,
  NotificationSettings,
  FlowchartPreferences,
} from './types/project';

export {
  ProjectStatus,
  AnalysisDepth,
  ErrorType,
  ErrorSeverity,
  UserRole,
  ColorScheme,
} from './types/project';

// Utilities
export * from './utils/constants';
export * from './utils/validation';
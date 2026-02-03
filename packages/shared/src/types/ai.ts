export interface AIExplanation {
  id: string;
  codeSection: string;
  filePath: string;
  startLine: number;
  endLine: number;
  explanation: ExplanationContent;
  suggestions: Suggestion[];
  securityIssues: SecurityIssue[];
  performanceIssues: PerformanceIssue[];
  createdAt: Date;
  cached: boolean;
  cacheExpiresAt?: Date;
}

export interface ExplanationContent {
  summary: string;
  details: string;
  complexity: ComplexityAnalysis;
  relatedConcepts: string[];
  codePatterns: CodePattern[];
}

export interface Suggestion {
  id: string;
  type: SuggestionType;
  severity: SuggestionSeverity;
  title: string;
  description: string;
  codeExample?: string;
  beforeCode?: string;
  afterCode?: string;
  estimatedImpact: ImpactLevel;
  tags: string[];
}

export interface SecurityIssue {
  id: string;
  type: SecurityIssueType;
  severity: SecuritySeverity;
  title: string;
  description: string;
  location: CodeLocation;
  recommendation: string;
  cweId?: string;
  references: string[];
}

export interface PerformanceIssue {
  id: string;
  type: PerformanceIssueType;
  severity: PerformanceSeverity;
  title: string;
  description: string;
  location: CodeLocation;
  estimatedImpact: string;
  recommendation: string;
  metrics?: PerformanceMetrics;
}

export interface ComplexityAnalysis {
  cyclomatic: number;
  cognitive: number;
  maintainability: number;
  readability: number;
  testability: number;
  score: ComplexityScore;
}

export interface CodePattern {
  name: string;
  description: string;
  category: PatternCategory;
  confidence: number;
  examples: string[];
}

export interface CodeLocation {
  filePath: string;
  startLine: number;
  endLine: number;
  startColumn: number;
  endColumn: number;
}

export interface PerformanceMetrics {
  executionTime?: number;
  memoryUsage?: number;
  cpuUsage?: number;
  networkCalls?: number;
  databaseQueries?: number;
}

export interface AIAnalysisRequest {
  codeSection: string;
  filePath: string;
  context: AnalysisContext;
  options: AnalysisOptions;
}

export interface AnalysisContext {
  projectType: string;
  framework?: string;
  dependencies: string[];
  relatedFiles: string[];
  userPreferences: AIPreferences;
}

export interface AnalysisOptions {
  includeExplanation: boolean;
  includeSuggestions: boolean;
  includeSecurityAnalysis: boolean;
  includePerformanceAnalysis: boolean;
  maxSuggestions: number;
  complexityThreshold: number;
}

export interface AIPreferences {
  explanationLevel: ExplanationLevel;
  suggestionTypes: SuggestionType[];
  securityFocus: SecurityFocus[];
  performanceFocus: PerformanceFocus[];
}

export enum SuggestionType {
  REFACTORING = 'refactoring',
  OPTIMIZATION = 'optimization',
  BEST_PRACTICE = 'best_practice',
  CODE_STYLE = 'code_style',
  ERROR_HANDLING = 'error_handling',
  TESTING = 'testing',
  DOCUMENTATION = 'documentation',
  ACCESSIBILITY = 'accessibility'
}

export enum SuggestionSeverity {
  INFO = 'info',
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

export enum SecurityIssueType {
  INJECTION = 'injection',
  XSS = 'xss',
  AUTHENTICATION = 'authentication',
  AUTHORIZATION = 'authorization',
  DATA_EXPOSURE = 'data_exposure',
  CRYPTOGRAPHY = 'cryptography',
  INPUT_VALIDATION = 'input_validation',
  SESSION_MANAGEMENT = 'session_management'
}

export enum SecuritySeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

export enum PerformanceIssueType {
  MEMORY_LEAK = 'memory_leak',
  CPU_INTENSIVE = 'cpu_intensive',
  BLOCKING_OPERATION = 'blocking_operation',
  INEFFICIENT_ALGORITHM = 'inefficient_algorithm',
  DATABASE_N_PLUS_ONE = 'database_n_plus_one',
  LARGE_BUNDLE = 'large_bundle',
  UNNECESSARY_RENDERS = 'unnecessary_renders'
}

export enum PerformanceSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

export enum ImpactLevel {
  MINIMAL = 'minimal',
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  SIGNIFICANT = 'significant'
}

export enum ComplexityScore {
  VERY_LOW = 'very_low',
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  VERY_HIGH = 'very_high'
}

export enum PatternCategory {
  DESIGN_PATTERN = 'design_pattern',
  ANTI_PATTERN = 'anti_pattern',
  ARCHITECTURAL_PATTERN = 'architectural_pattern',
  CODING_PATTERN = 'coding_pattern'
}

export enum ExplanationLevel {
  BEGINNER = 'beginner',
  INTERMEDIATE = 'intermediate',
  ADVANCED = 'advanced',
  EXPERT = 'expert'
}

export enum SecurityFocus {
  WEB_SECURITY = 'web_security',
  API_SECURITY = 'api_security',
  DATA_PROTECTION = 'data_protection',
  AUTHENTICATION = 'authentication',
  AUTHORIZATION = 'authorization'
}

export enum PerformanceFocus {
  RUNTIME_PERFORMANCE = 'runtime_performance',
  MEMORY_OPTIMIZATION = 'memory_optimization',
  BUNDLE_SIZE = 'bundle_size',
  DATABASE_PERFORMANCE = 'database_performance',
  NETWORK_OPTIMIZATION = 'network_optimization'
}
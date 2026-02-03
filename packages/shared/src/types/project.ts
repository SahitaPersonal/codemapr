export interface Project {
  id: string;
  name: string;
  description: string;
  language: SupportedLanguage;
  repositoryUrl?: string;
  createdAt: Date;
  updatedAt: Date;
  ownerId: string;
  settings: ProjectSettings;
  status: ProjectStatus;
  analysisResults?: AnalysisResult[];
}

export interface ProjectSettings {
  analysisDepth: AnalysisDepth;
  excludePatterns: string[];
  includeTestFiles: boolean;
  enableAIExplanations: boolean;
  collaborationEnabled: boolean;
  maxFileSize: number;
  timeoutMinutes: number;
}

export interface AnalysisResult {
  id: string;
  projectId: string;
  version: string;
  status: AnalysisStatus;
  startedAt: Date;
  completedAt?: Date;
  fileCount: number;
  errorCount: number;
  warningCount: number;
  analysisData?: any; // ProjectAnalysis from analysis.ts
  errors: AnalysisError[];
  metrics: AnalysisMetrics;
}

export interface AnalysisError {
  id: string;
  type: ErrorType;
  severity: ErrorSeverity;
  message: string;
  filePath?: string;
  line?: number;
  column?: number;
  stack?: string;
  timestamp: Date;
}

export interface AnalysisMetrics {
  totalFiles: number;
  totalLines: number;
  totalFunctions: number;
  totalClasses: number;
  averageComplexity: number;
  processingTimeMs: number;
  memoryUsageMB: number;
}

export interface User {
  id: string;
  email: string;
  name: string;
  avatar?: string;
  role: UserRole;
  preferences: UserPreferences;
  createdAt: Date;
  lastActiveAt: Date;
}

export interface UserPreferences {
  theme: 'light' | 'dark' | 'system';
  language: string;
  notifications: NotificationSettings;
  flowchartSettings: FlowchartPreferences;
}

export interface NotificationSettings {
  email: boolean;
  browser: boolean;
  analysisComplete: boolean;
  collaborationInvites: boolean;
  securityAlerts: boolean;
}

export interface FlowchartPreferences {
  defaultLayout: LayoutAlgorithm;
  showComplexity: boolean;
  showExecutionTime: boolean;
  colorScheme: ColorScheme;
  nodeSpacing: number;
  edgeStyle: EdgeStyle;
}

export enum SupportedLanguage {
  JAVASCRIPT = 'javascript',
  TYPESCRIPT = 'typescript',
  JSX = 'jsx',
  TSX = 'tsx'
}

export enum ProjectStatus {
  CREATED = 'created',
  ANALYZING = 'analyzing',
  COMPLETED = 'completed',
  FAILED = 'failed',
  ARCHIVED = 'archived'
}

export enum AnalysisDepth {
  SHALLOW = 'shallow',
  MEDIUM = 'medium',
  DEEP = 'deep'
}

export enum AnalysisStatus {
  PENDING = 'pending',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled'
}

export enum ErrorType {
  SYNTAX_ERROR = 'syntax_error',
  DEPENDENCY_ERROR = 'dependency_error',
  TIMEOUT_ERROR = 'timeout_error',
  MEMORY_ERROR = 'memory_error',
  NETWORK_ERROR = 'network_error',
  VALIDATION_ERROR = 'validation_error',
  UNKNOWN_ERROR = 'unknown_error'
}

export enum ErrorSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

export enum UserRole {
  USER = 'user',
  ADMIN = 'admin',
  MODERATOR = 'moderator'
}

export enum LayoutAlgorithm {
  HIERARCHICAL = 'hierarchical',
  FORCE_DIRECTED = 'force_directed',
  CIRCULAR = 'circular',
  TREE = 'tree'
}

export enum ColorScheme {
  DEFAULT = 'default',
  DARK = 'dark',
  HIGH_CONTRAST = 'high_contrast',
  COLORBLIND_FRIENDLY = 'colorblind_friendly'
}

export enum EdgeStyle {
  STRAIGHT = 'straight',
  CURVED = 'curved',
  STEP = 'step'
}
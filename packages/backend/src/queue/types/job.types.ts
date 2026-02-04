export enum JobType {
  PROJECT_ANALYSIS = 'project_analysis',
  FILE_ANALYSIS = 'file_analysis',
  INCREMENTAL_ANALYSIS = 'incremental_analysis',
  SECURITY_SCAN = 'security_scan',
  PERFORMANCE_ANALYSIS = 'performance_analysis',
  OPTIMIZATION_ANALYSIS = 'optimization_analysis',
  FLOWCHART_GENERATION = 'flowchart_generation',
  AI_EXPLANATION = 'ai_explanation',
  DATA_COMPRESSION = 'data_compression',
  CLEANUP_TASK = 'cleanup_task',
}

export enum JobPriority {
  LOW = 1,
  NORMAL = 5,
  HIGH = 10,
  CRITICAL = 20,
}

export enum JobStatus {
  WAITING = 'waiting',
  ACTIVE = 'active',
  COMPLETED = 'completed',
  FAILED = 'failed',
  DELAYED = 'delayed',
  PAUSED = 'paused',
  STUCK = 'stuck',
}

export interface BaseJobData {
  userId?: string;
  projectId?: string;
  requestId?: string;
  metadata?: Record<string, any>;
  createdAt: Date;
}

export interface ProjectAnalysisJobData extends BaseJobData {
  projectPath: string;
  analysisOptions: {
    includePatterns?: string[];
    excludePatterns?: string[];
    enableIncrementalAnalysis?: boolean;
    enableAIExplanations?: boolean;
    enableSecurityScan?: boolean;
    enablePerformanceAnalysis?: boolean;
  };
}

export interface FileAnalysisJobData extends BaseJobData {
  filePath: string;
  content: string;
  language: string;
  analysisOptions: {
    enableComplexityAnalysis?: boolean;
    enableSecurityScan?: boolean;
    enablePerformanceAnalysis?: boolean;
  };
}

export interface IncrementalAnalysisJobData extends BaseJobData {
  projectPath: string;
  changedFiles: string[];
  analysisOptions: {
    forceFullAnalysis?: boolean;
    enableCaching?: boolean;
  };
}

export interface SecurityScanJobData extends BaseJobData {
  projectPath?: string;
  filePaths?: string[];
  scanOptions: {
    securityLevel: 'low' | 'medium' | 'high' | 'strict';
    enableVulnerabilityAlerts?: boolean;
    trustedDomains?: string[];
  };
}

export interface PerformanceAnalysisJobData extends BaseJobData {
  projectPath?: string;
  filePaths?: string[];
  analysisOptions: {
    enableBottleneckDetection?: boolean;
    performanceThresholds?: {
      complexity: number;
      maintainability: number;
      techDebt: number;
    };
  };
}

export interface OptimizationAnalysisJobData extends BaseJobData {
  projectPath?: string;
  filePaths?: string[];
  optimizationOptions: {
    categories?: string[];
    priorityLevel?: 'low' | 'medium' | 'high';
    includeQuickWins?: boolean;
  };
}

export interface FlowchartGenerationJobData extends BaseJobData {
  analysisId: string;
  flowchartType: 'project' | 'file' | 'function' | 'dependency';
  layoutOptions: {
    algorithm: 'hierarchical' | 'force-directed' | 'circular';
    spacing: number;
    direction: 'TB' | 'BT' | 'LR' | 'RL';
  };
}

export interface AIExplanationJobData extends BaseJobData {
  codeSnippet: string;
  context: string;
  explanationType: 'function' | 'class' | 'file' | 'security' | 'performance';
  aiOptions: {
    provider: 'openai' | 'anthropic' | 'local';
    model?: string;
    maxTokens?: number;
  };
}

export interface DataCompressionJobData extends BaseJobData {
  dataKey: string;
  data: any;
  compressionOptions: {
    algorithm: 'gzip' | 'deflate' | 'brotli';
    level?: number;
    threshold?: number;
  };
}

export interface CleanupTaskJobData extends BaseJobData {
  cleanupType: 'cache' | 'storage' | 'logs' | 'temp_files';
  cleanupOptions: {
    olderThan?: Date;
    removeExpired?: boolean;
    dryRun?: boolean;
  };
}

export type JobData = 
  | ProjectAnalysisJobData
  | FileAnalysisJobData
  | IncrementalAnalysisJobData
  | SecurityScanJobData
  | PerformanceAnalysisJobData
  | OptimizationAnalysisJobData
  | FlowchartGenerationJobData
  | AIExplanationJobData
  | DataCompressionJobData
  | CleanupTaskJobData;

export interface JobProgress {
  percentage: number;
  message: string;
  currentStep?: string;
  totalSteps?: number;
  completedSteps?: number;
  estimatedTimeRemaining?: number;
  details?: Record<string, any>;
}

export interface JobResult {
  success: boolean;
  data?: any;
  error?: string;
  warnings?: string[];
  metrics?: {
    executionTime: number;
    memoryUsage?: number;
    cpuUsage?: number;
    itemsProcessed?: number;
  };
  artifacts?: {
    files?: string[];
    reports?: string[];
    logs?: string[];
  };
}

export interface JobOptions {
  priority?: JobPriority;
  delay?: number;
  attempts?: number;
  backoff?: {
    type: 'fixed' | 'exponential';
    delay: number;
  };
  removeOnComplete?: number;
  removeOnFail?: number;
  timeout?: number;
  repeat?: {
    cron?: string;
    every?: number;
    limit?: number;
  };
}

export interface QueueStats {
  waiting: number;
  active: number;
  completed: number;
  failed: number;
  delayed: number;
  paused: number;
  total: number;
}

export interface JobFilter {
  status?: JobStatus[];
  type?: JobType[];
  userId?: string;
  projectId?: string;
  createdAfter?: Date;
  createdBefore?: Date;
  limit?: number;
  offset?: number;
}

export interface JobInfo {
  id: string;
  type: JobType;
  status: JobStatus;
  priority: JobPriority;
  data: JobData;
  progress: JobProgress;
  result?: JobResult;
  createdAt: Date;
  startedAt?: Date;
  completedAt?: Date;
  failedAt?: Date;
  attempts: number;
  maxAttempts: number;
  delay?: number;
  timeout?: number;
  error?: string;
}
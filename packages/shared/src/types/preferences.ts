export interface ThemePreferences {
  theme: 'light' | 'dark' | 'ocean' | 'auto';
  colorScheme: string;
  fontSize: number;
  fontFamily: string;
}

export interface FlowchartPreferences {
  defaultLayout: 'hierarchical' | 'force-directed' | 'circular';
  showComplexity: boolean;
  showPerformanceMetrics: boolean;
  showSecurityIssues: boolean;
  nodeSpacing: number;
  edgeStyle: 'straight' | 'curved' | 'step';
  animationsEnabled: boolean;
  autoLayout: boolean;
}

export interface AnalysisPreferences {
  enableIncrementalAnalysis: boolean;
  cacheEnabled: boolean;
  maxCacheSize: number; // in MB
  analysisTimeout: number; // in seconds
  excludePatterns: string[];
  includePatterns: string[];
  enableAIExplanations: boolean;
  aiProvider: 'openai' | 'anthropic' | 'local';
}

export interface CollaborationPreferences {
  enableRealTimeSync: boolean;
  showUserCursors: boolean;
  enableNotifications: boolean;
  notificationTypes: string[];
  autoSaveInterval: number; // in seconds
  maxCollaborators: number;
}

export interface SecurityPreferences {
  enableSecurityScanning: boolean;
  securityLevel: 'low' | 'medium' | 'high' | 'strict';
  enableVulnerabilityAlerts: boolean;
  trustedDomains: string[];
  allowExternalConnections: boolean;
}

export interface PerformancePreferences {
  enablePerformanceMonitoring: boolean;
  performanceThresholds: {
    complexity: number;
    maintainability: number;
    techDebt: number;
  };
  enableOptimizationSuggestions: boolean;
  autoOptimization: boolean;
}

export interface GeneralPreferences {
  language: string;
  timezone: string;
  dateFormat: string;
  enableTelemetry: boolean;
  enableBetaFeatures: boolean;
}

export interface UserPreferences {
  theme: ThemePreferences;
  flowchart: FlowchartPreferences;
  analysis: AnalysisPreferences;
  collaboration: CollaborationPreferences;
  security: SecurityPreferences;
  performance: PerformancePreferences;
  general: GeneralPreferences;
}

export interface PreferenceUpdateRequest {
  userId: string;
  preferences: Partial<UserPreferences>;
  platform?: string;
  userAgent?: string;
}

export interface PreferenceSyncRequest {
  userId: string;
  platform: string;
  preferences: UserPreferences;
  lastSyncedAt: Date;
}

export interface PreferenceExportData {
  preferences: UserPreferences;
  version: string;
  exportedAt: Date;
  userId: string;
}

export interface PreferenceSyncResult {
  preferences: UserPreferences;
  conflictResolution: 'local' | 'remote' | 'merged';
  lastSyncedAt: Date;
}

export interface PreferenceStatistics {
  totalUsers: number;
  activeUsers: number;
  mostCommonTheme: string;
  mostCommonLayout: string;
  averagePreferenceAge: number;
}
import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';

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

export interface UserPreferences {
  theme: ThemePreferences;
  flowchart: FlowchartPreferences;
  analysis: AnalysisPreferences;
  collaboration: CollaborationPreferences;
  security: SecurityPreferences;
  performance: PerformancePreferences;
  general: {
    language: string;
    timezone: string;
    dateFormat: string;
    enableTelemetry: boolean;
    enableBetaFeatures: boolean;
  };
}

@Entity('user_preferences')
export class UserPreferenceEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 255 })
  @Index('IDX_user_preferences_userId', { unique: true })
  userId: string;

  @Column({ type: 'json' })
  preferences: UserPreferences;

  @Column({ type: 'varchar', length: 50, default: '1.0.0' })
  version: string;

  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  @Column({ type: 'json', nullable: true })
  metadata: {
    platform: string;
    userAgent: string;
    lastSyncedAt: Date;
    syncedFrom: string;
  };

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
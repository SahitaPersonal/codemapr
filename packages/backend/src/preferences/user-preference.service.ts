import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserPreferenceEntity, UserPreferences, ThemePreferences, FlowchartPreferences, AnalysisPreferences, CollaborationPreferences, SecurityPreferences, PerformancePreferences } from './entities/user-preference.entity';

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

@Injectable()
export class UserPreferenceService {
  private readonly logger = new Logger(UserPreferenceService.name);

  constructor(
    @InjectRepository(UserPreferenceEntity)
    private readonly userPreferenceRepository: Repository<UserPreferenceEntity>,
  ) {}

  async getUserPreferences(userId: string): Promise<UserPreferences> {
    this.logger.log(`Getting preferences for user: ${userId}`);

    const userPreference = await this.userPreferenceRepository.findOne({
      where: { userId, isActive: true },
    });

    if (!userPreference) {
      this.logger.log(`No preferences found for user ${userId}, creating defaults`);
      return await this.createDefaultPreferences(userId);
    }

    return userPreference.preferences;
  }

  async updateUserPreferences(request: PreferenceUpdateRequest): Promise<UserPreferences> {
    this.logger.log(`Updating preferences for user: ${request.userId}`);

    let userPreference = await this.userPreferenceRepository.findOne({
      where: { userId: request.userId, isActive: true },
    });

    if (!userPreference) {
      // Create new preference record
      const defaultPreferences = this.getDefaultPreferences();
      userPreference = this.userPreferenceRepository.create({
        userId: request.userId,
        preferences: { ...defaultPreferences, ...request.preferences },
        metadata: {
          platform: request.platform || 'web',
          userAgent: request.userAgent || 'unknown',
          lastSyncedAt: new Date(),
          syncedFrom: request.platform || 'web',
        },
      });
    } else {
      // Update existing preferences
      userPreference.preferences = {
        ...userPreference.preferences,
        ...request.preferences,
      };
      userPreference.metadata = {
        ...userPreference.metadata,
        platform: request.platform || userPreference.metadata?.platform || 'web',
        userAgent: request.userAgent || userPreference.metadata?.userAgent || 'unknown',
        lastSyncedAt: new Date(),
        syncedFrom: request.platform || 'web',
      };
    }

    const savedPreference = await this.userPreferenceRepository.save(userPreference);
    this.logger.log(`Preferences updated for user ${request.userId}`);

    return savedPreference.preferences;
  }

  async syncPreferences(request: PreferenceSyncRequest): Promise<{
    preferences: UserPreferences;
    conflictResolution: 'local' | 'remote' | 'merged';
    lastSyncedAt: Date;
  }> {
    this.logger.log(`Syncing preferences for user: ${request.userId} from platform: ${request.platform}`);

    const existingPreference = await this.userPreferenceRepository.findOne({
      where: { userId: request.userId, isActive: true },
    });

    if (!existingPreference) {
      // No existing preferences, use the provided ones
      const newPreference = this.userPreferenceRepository.create({
        userId: request.userId,
        preferences: request.preferences,
        metadata: {
          platform: request.platform,
          userAgent: 'sync',
          lastSyncedAt: request.lastSyncedAt,
          syncedFrom: request.platform,
        },
      });

      const saved = await this.userPreferenceRepository.save(newPreference);
      return {
        preferences: saved.preferences,
        conflictResolution: 'remote',
        lastSyncedAt: saved.updatedAt,
      };
    }

    // Check for conflicts
    const existingLastSync = existingPreference.metadata?.lastSyncedAt || existingPreference.updatedAt;
    const isRemoteNewer = request.lastSyncedAt > existingLastSync;

    let finalPreferences: UserPreferences;
    let conflictResolution: 'local' | 'remote' | 'merged';

    if (isRemoteNewer) {
      // Remote is newer, use remote preferences
      finalPreferences = request.preferences;
      conflictResolution = 'remote';
    } else if (request.lastSyncedAt < existingLastSync) {
      // Local is newer, keep local preferences
      finalPreferences = existingPreference.preferences;
      conflictResolution = 'local';
    } else {
      // Same timestamp, merge preferences intelligently
      finalPreferences = this.mergePreferences(existingPreference.preferences, request.preferences);
      conflictResolution = 'merged';
    }

    // Update the preference record
    existingPreference.preferences = finalPreferences;
    existingPreference.metadata = {
      ...existingPreference.metadata,
      lastSyncedAt: new Date(),
      syncedFrom: request.platform,
    };

    const saved = await this.userPreferenceRepository.save(existingPreference);
    
    this.logger.log(`Preferences synced for user ${request.userId} with resolution: ${conflictResolution}`);

    return {
      preferences: saved.preferences,
      conflictResolution,
      lastSyncedAt: saved.updatedAt,
    };
  }

  async resetUserPreferences(userId: string): Promise<UserPreferences> {
    this.logger.log(`Resetting preferences for user: ${userId}`);

    const userPreference = await this.userPreferenceRepository.findOne({
      where: { userId, isActive: true },
    });

    if (!userPreference) {
      return await this.createDefaultPreferences(userId);
    }

    userPreference.preferences = this.getDefaultPreferences();
    userPreference.metadata = {
      ...userPreference.metadata,
      lastSyncedAt: new Date(),
      syncedFrom: 'reset',
    };

    const saved = await this.userPreferenceRepository.save(userPreference);
    this.logger.log(`Preferences reset for user ${userId}`);

    return saved.preferences;
  }

  async exportUserPreferences(userId: string): Promise<PreferenceExportData> {
    this.logger.log(`Exporting preferences for user: ${userId}`);

    const userPreference = await this.userPreferenceRepository.findOne({
      where: { userId, isActive: true },
    });

    if (!userPreference) {
      throw new NotFoundException(`No preferences found for user ${userId}`);
    }

    return {
      preferences: userPreference.preferences,
      version: userPreference.version,
      exportedAt: new Date(),
      userId,
    };
  }

  async importUserPreferences(userId: string, exportData: PreferenceExportData): Promise<UserPreferences> {
    this.logger.log(`Importing preferences for user: ${userId}`);

    if (exportData.userId !== userId) {
      throw new BadRequestException('Export data user ID does not match target user ID');
    }

    // Validate the preferences structure
    this.validatePreferences(exportData.preferences);

    const updateRequest: PreferenceUpdateRequest = {
      userId,
      preferences: exportData.preferences,
      platform: 'import',
      userAgent: 'import-tool',
    };

    return await this.updateUserPreferences(updateRequest);
  }

  async deleteUserPreferences(userId: string): Promise<void> {
    this.logger.log(`Deleting preferences for user: ${userId}`);

    // Actually delete the record instead of soft delete to avoid unique constraint issues
    const result = await this.userPreferenceRepository.delete({
      userId,
    });

    if (result.affected === 0) {
      throw new NotFoundException(`No preferences found for user ${userId}`);
    }

    this.logger.log(`Preferences deleted for user ${userId}`);
  }

  async getPreferenceStatistics(): Promise<{
    totalUsers: number;
    activeUsers: number;
    mostCommonTheme: string;
    mostCommonLayout: string;
    averagePreferenceAge: number;
  }> {
    const totalUsers = await this.userPreferenceRepository.count();
    const activeUsers = await this.userPreferenceRepository.count({ where: { isActive: true } });

    // Get all active preferences for analysis
    const allPreferences = await this.userPreferenceRepository.find({
      where: { isActive: true },
      select: ['preferences', 'createdAt'],
    });

    // Analyze themes
    const themeCount = new Map<string, number>();
    const layoutCount = new Map<string, number>();
    let totalAge = 0;

    for (const pref of allPreferences) {
      const theme = pref.preferences.theme?.theme || 'light';
      const layout = pref.preferences.flowchart?.defaultLayout || 'hierarchical';
      
      themeCount.set(theme, (themeCount.get(theme) || 0) + 1);
      layoutCount.set(layout, (layoutCount.get(layout) || 0) + 1);
      
      totalAge += Date.now() - pref.createdAt.getTime();
    }

    const mostCommonTheme = Array.from(themeCount.entries())
      .sort(([,a], [,b]) => b - a)[0]?.[0] || 'light';
    
    const mostCommonLayout = Array.from(layoutCount.entries())
      .sort(([,a], [,b]) => b - a)[0]?.[0] || 'hierarchical';

    const averagePreferenceAge = allPreferences.length > 0 
      ? totalAge / allPreferences.length / (1000 * 60 * 60 * 24) // Convert to days
      : 0;

    return {
      totalUsers,
      activeUsers,
      mostCommonTheme,
      mostCommonLayout,
      averagePreferenceAge,
    };
  }

  private async createDefaultPreferences(userId: string): Promise<UserPreferences> {
    const defaultPreferences = this.getDefaultPreferences();
    
    const userPreference = this.userPreferenceRepository.create({
      userId,
      preferences: defaultPreferences,
      metadata: {
        platform: 'web',
        userAgent: 'default',
        lastSyncedAt: new Date(),
        syncedFrom: 'default',
      },
    });

    const saved = await this.userPreferenceRepository.save(userPreference);
    return saved.preferences;
  }

  private getDefaultPreferences(): UserPreferences {
    return {
      theme: {
        theme: 'light',
        colorScheme: 'default',
        fontSize: 14,
        fontFamily: 'Inter, system-ui, sans-serif',
      },
      flowchart: {
        defaultLayout: 'hierarchical',
        showComplexity: true,
        showPerformanceMetrics: true,
        showSecurityIssues: true,
        nodeSpacing: 100,
        edgeStyle: 'curved',
        animationsEnabled: true,
        autoLayout: true,
      },
      analysis: {
        enableIncrementalAnalysis: true,
        cacheEnabled: true,
        maxCacheSize: 500, // 500MB
        analysisTimeout: 300, // 5 minutes
        excludePatterns: ['node_modules/**', '.git/**', 'dist/**', 'build/**'],
        includePatterns: ['**/*.ts', '**/*.tsx', '**/*.js', '**/*.jsx'],
        enableAIExplanations: true,
        aiProvider: 'openai',
      },
      collaboration: {
        enableRealTimeSync: true,
        showUserCursors: true,
        enableNotifications: true,
        notificationTypes: ['comments', 'mentions', 'changes'],
        autoSaveInterval: 30, // 30 seconds
        maxCollaborators: 10,
      },
      security: {
        enableSecurityScanning: true,
        securityLevel: 'medium',
        enableVulnerabilityAlerts: true,
        trustedDomains: [],
        allowExternalConnections: true,
      },
      performance: {
        enablePerformanceMonitoring: true,
        performanceThresholds: {
          complexity: 10,
          maintainability: 70,
          techDebt: 30,
        },
        enableOptimizationSuggestions: true,
        autoOptimization: false,
      },
      general: {
        language: 'en',
        timezone: 'UTC',
        dateFormat: 'YYYY-MM-DD',
        enableTelemetry: true,
        enableBetaFeatures: false,
      },
    };
  }

  private mergePreferences(local: UserPreferences, remote: UserPreferences): UserPreferences {
    // Intelligent merge strategy - prefer non-default values and more recent changes
    return {
      theme: { ...local.theme, ...remote.theme },
      flowchart: { ...local.flowchart, ...remote.flowchart },
      analysis: { ...local.analysis, ...remote.analysis },
      collaboration: { ...local.collaboration, ...remote.collaboration },
      security: { ...local.security, ...remote.security },
      performance: { ...local.performance, ...remote.performance },
      general: { ...local.general, ...remote.general },
    };
  }

  private validatePreferences(preferences: UserPreferences): void {
    // Basic validation of preference structure
    if (!preferences.theme || !preferences.flowchart || !preferences.analysis) {
      throw new BadRequestException('Invalid preference structure');
    }

    // Validate theme
    if (!['light', 'dark', 'ocean', 'auto'].includes(preferences.theme.theme)) {
      throw new BadRequestException('Invalid theme value');
    }

    // Validate layout
    if (!['hierarchical', 'force-directed', 'circular'].includes(preferences.flowchart.defaultLayout)) {
      throw new BadRequestException('Invalid layout value');
    }

    // Validate security level
    if (!['low', 'medium', 'high', 'strict'].includes(preferences.security.securityLevel)) {
      throw new BadRequestException('Invalid security level');
    }
  }
}
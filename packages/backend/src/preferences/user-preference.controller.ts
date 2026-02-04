import { Controller, Get, Post, Put, Delete, Body, Param, Query, Logger, HttpException, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiQuery, ApiBody } from '@nestjs/swagger';
import { IsString, IsOptional, IsObject, IsBoolean, IsNumber, IsEnum, IsArray } from 'class-validator';
import { UserPreferenceService, PreferenceUpdateRequest, PreferenceSyncRequest, PreferenceExportData } from './user-preference.service';
import { UserPreferences } from './entities/user-preference.entity';

export class GetUserPreferencesDto {
  @IsString()
  userId: string;
}

export class UpdateUserPreferencesDto {
  @IsString()
  userId: string;

  @IsObject()
  preferences: Partial<UserPreferences>;

  @IsOptional()
  @IsString()
  platform?: string;

  @IsOptional()
  @IsString()
  userAgent?: string;
}

export class SyncPreferencesDto {
  @IsString()
  userId: string;

  @IsString()
  platform: string;

  @IsObject()
  preferences: UserPreferences;

  @IsString()
  lastSyncedAt: string; // ISO date string
}

export class ImportPreferencesDto {
  @IsString()
  userId: string;

  @IsObject()
  exportData: PreferenceExportData;
}

export class ResetPreferencesDto {
  @IsString()
  userId: string;
}

@ApiTags('User Preferences')
@Controller('api/preferences')
export class UserPreferenceController {
  private readonly logger = new Logger(UserPreferenceController.name);

  constructor(private readonly userPreferenceService: UserPreferenceService) {}

  @Get(':userId')
  @ApiOperation({ 
    summary: 'Get user preferences',
    description: 'Retrieves all preferences for a specific user. Creates default preferences if none exist.'
  })
  @ApiParam({ 
    name: 'userId', 
    description: 'User ID to get preferences for',
    type: 'string'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'User preferences retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        theme: { type: 'object' },
        flowchart: { type: 'object' },
        analysis: { type: 'object' },
        collaboration: { type: 'object' },
        security: { type: 'object' },
        performance: { type: 'object' },
        general: { type: 'object' }
      }
    }
  })
  @ApiResponse({ 
    status: 400, 
    description: 'Invalid user ID' 
  })
  async getUserPreferences(@Param('userId') userId: string): Promise<UserPreferences> {
    this.logger.log(`Get preferences requested for user: ${userId}`);

    try {
      if (!userId) {
        throw new HttpException('User ID is required', HttpStatus.BAD_REQUEST);
      }

      const preferences = await this.userPreferenceService.getUserPreferences(userId);
      
      this.logger.log(`Preferences retrieved for user ${userId}`);
      return preferences;

    } catch (error) {
      this.logger.error(`Failed to get preferences for user ${userId}:`, error);
      
      if (error instanceof HttpException) {
        throw error;
      }
      
      throw new HttpException(
        `Failed to get user preferences: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Put(':userId')
  @ApiOperation({ 
    summary: 'Update user preferences',
    description: 'Updates specific preference settings for a user. Merges with existing preferences.'
  })
  @ApiParam({ 
    name: 'userId', 
    description: 'User ID to update preferences for',
    type: 'string'
  })
  @ApiBody({ 
    type: UpdateUserPreferencesDto,
    description: 'Preference updates and metadata'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'User preferences updated successfully',
    schema: {
      type: 'object',
      properties: {
        theme: { type: 'object' },
        flowchart: { type: 'object' },
        analysis: { type: 'object' },
        collaboration: { type: 'object' },
        security: { type: 'object' },
        performance: { type: 'object' },
        general: { type: 'object' }
      }
    }
  })
  @ApiResponse({ 
    status: 400, 
    description: 'Invalid preference data' 
  })
  async updateUserPreferences(
    @Param('userId') userId: string,
    @Body() updateDto: Omit<UpdateUserPreferencesDto, 'userId'>
  ): Promise<UserPreferences> {
    this.logger.log(`Update preferences requested for user: ${userId}`);

    try {
      if (!userId) {
        throw new HttpException('User ID is required', HttpStatus.BAD_REQUEST);
      }

      if (!updateDto.preferences) {
        throw new HttpException('Preferences data is required', HttpStatus.BAD_REQUEST);
      }

      const request: PreferenceUpdateRequest = {
        userId,
        preferences: updateDto.preferences,
        platform: updateDto.platform,
        userAgent: updateDto.userAgent,
      };

      const updatedPreferences = await this.userPreferenceService.updateUserPreferences(request);
      
      this.logger.log(`Preferences updated for user ${userId}`);
      return updatedPreferences;

    } catch (error) {
      this.logger.error(`Failed to update preferences for user ${userId}:`, error);
      
      if (error instanceof HttpException) {
        throw error;
      }
      
      throw new HttpException(
        `Failed to update user preferences: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Post(':userId/sync')
  @ApiOperation({ 
    summary: 'Sync user preferences across platforms',
    description: 'Synchronizes preferences between different platforms (web, VSCode, mobile) with conflict resolution.'
  })
  @ApiParam({ 
    name: 'userId', 
    description: 'User ID to sync preferences for',
    type: 'string'
  })
  @ApiBody({ 
    type: SyncPreferencesDto,
    description: 'Preferences to sync with platform and timestamp information'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Preferences synchronized successfully',
    schema: {
      type: 'object',
      properties: {
        preferences: { type: 'object' },
        conflictResolution: { type: 'string', enum: ['local', 'remote', 'merged'] },
        lastSyncedAt: { type: 'string' }
      }
    }
  })
  @ApiResponse({ 
    status: 400, 
    description: 'Invalid sync data' 
  })
  async syncPreferences(
    @Param('userId') userId: string,
    @Body() syncDto: Omit<SyncPreferencesDto, 'userId'>
  ) {
    this.logger.log(`Sync preferences requested for user: ${userId} from platform: ${syncDto.platform}`);

    try {
      if (!userId) {
        throw new HttpException('User ID is required', HttpStatus.BAD_REQUEST);
      }

      if (!syncDto.platform || !syncDto.preferences || !syncDto.lastSyncedAt) {
        throw new HttpException('Platform, preferences, and lastSyncedAt are required', HttpStatus.BAD_REQUEST);
      }

      const request: PreferenceSyncRequest = {
        userId,
        platform: syncDto.platform,
        preferences: syncDto.preferences,
        lastSyncedAt: new Date(syncDto.lastSyncedAt),
      };

      const result = await this.userPreferenceService.syncPreferences(request);
      
      this.logger.log(`Preferences synced for user ${userId} with resolution: ${result.conflictResolution}`);
      return result;

    } catch (error) {
      this.logger.error(`Failed to sync preferences for user ${userId}:`, error);
      
      if (error instanceof HttpException) {
        throw error;
      }
      
      throw new HttpException(
        `Failed to sync user preferences: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Post(':userId/reset')
  @ApiOperation({ 
    summary: 'Reset user preferences to defaults',
    description: 'Resets all user preferences to their default values.'
  })
  @ApiParam({ 
    name: 'userId', 
    description: 'User ID to reset preferences for',
    type: 'string'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'User preferences reset successfully',
    schema: {
      type: 'object',
      properties: {
        theme: { type: 'object' },
        flowchart: { type: 'object' },
        analysis: { type: 'object' },
        collaboration: { type: 'object' },
        security: { type: 'object' },
        performance: { type: 'object' },
        general: { type: 'object' }
      }
    }
  })
  @ApiResponse({ 
    status: 400, 
    description: 'Invalid user ID' 
  })
  async resetUserPreferences(@Param('userId') userId: string): Promise<UserPreferences> {
    this.logger.log(`Reset preferences requested for user: ${userId}`);

    try {
      if (!userId) {
        throw new HttpException('User ID is required', HttpStatus.BAD_REQUEST);
      }

      const resetPreferences = await this.userPreferenceService.resetUserPreferences(userId);
      
      this.logger.log(`Preferences reset for user ${userId}`);
      return resetPreferences;

    } catch (error) {
      this.logger.error(`Failed to reset preferences for user ${userId}:`, error);
      
      if (error instanceof HttpException) {
        throw error;
      }
      
      throw new HttpException(
        `Failed to reset user preferences: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Get(':userId/export')
  @ApiOperation({ 
    summary: 'Export user preferences',
    description: 'Exports user preferences in a portable format for backup or migration.'
  })
  @ApiParam({ 
    name: 'userId', 
    description: 'User ID to export preferences for',
    type: 'string'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'User preferences exported successfully',
    schema: {
      type: 'object',
      properties: {
        preferences: { type: 'object' },
        version: { type: 'string' },
        exportedAt: { type: 'string' },
        userId: { type: 'string' }
      }
    }
  })
  @ApiResponse({ 
    status: 404, 
    description: 'User preferences not found' 
  })
  async exportUserPreferences(@Param('userId') userId: string): Promise<PreferenceExportData> {
    this.logger.log(`Export preferences requested for user: ${userId}`);

    try {
      if (!userId) {
        throw new HttpException('User ID is required', HttpStatus.BAD_REQUEST);
      }

      const exportData = await this.userPreferenceService.exportUserPreferences(userId);
      
      this.logger.log(`Preferences exported for user ${userId}`);
      return exportData;

    } catch (error) {
      this.logger.error(`Failed to export preferences for user ${userId}:`, error);
      
      if (error instanceof HttpException) {
        throw error;
      }
      
      throw new HttpException(
        `Failed to export user preferences: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Post(':userId/import')
  @ApiOperation({ 
    summary: 'Import user preferences',
    description: 'Imports user preferences from an exported backup file.'
  })
  @ApiParam({ 
    name: 'userId', 
    description: 'User ID to import preferences for',
    type: 'string'
  })
  @ApiBody({ 
    type: ImportPreferencesDto,
    description: 'Exported preference data to import'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'User preferences imported successfully',
    schema: {
      type: 'object',
      properties: {
        theme: { type: 'object' },
        flowchart: { type: 'object' },
        analysis: { type: 'object' },
        collaboration: { type: 'object' },
        security: { type: 'object' },
        performance: { type: 'object' },
        general: { type: 'object' }
      }
    }
  })
  @ApiResponse({ 
    status: 400, 
    description: 'Invalid import data' 
  })
  async importUserPreferences(
    @Param('userId') userId: string,
    @Body() importDto: Omit<ImportPreferencesDto, 'userId'>
  ): Promise<UserPreferences> {
    this.logger.log(`Import preferences requested for user: ${userId}`);

    try {
      if (!userId) {
        throw new HttpException('User ID is required', HttpStatus.BAD_REQUEST);
      }

      if (!importDto.exportData) {
        throw new HttpException('Export data is required', HttpStatus.BAD_REQUEST);
      }

      const importedPreferences = await this.userPreferenceService.importUserPreferences(
        userId,
        importDto.exportData
      );
      
      this.logger.log(`Preferences imported for user ${userId}`);
      return importedPreferences;

    } catch (error) {
      this.logger.error(`Failed to import preferences for user ${userId}:`, error);
      
      if (error instanceof HttpException) {
        throw error;
      }
      
      throw new HttpException(
        `Failed to import user preferences: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Delete(':userId')
  @ApiOperation({ 
    summary: 'Delete user preferences',
    description: 'Soft deletes user preferences by marking them as inactive.'
  })
  @ApiParam({ 
    name: 'userId', 
    description: 'User ID to delete preferences for',
    type: 'string'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'User preferences deleted successfully',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string' },
        userId: { type: 'string' }
      }
    }
  })
  @ApiResponse({ 
    status: 404, 
    description: 'User preferences not found' 
  })
  async deleteUserPreferences(@Param('userId') userId: string) {
    this.logger.log(`Delete preferences requested for user: ${userId}`);

    try {
      if (!userId) {
        throw new HttpException('User ID is required', HttpStatus.BAD_REQUEST);
      }

      await this.userPreferenceService.deleteUserPreferences(userId);
      
      this.logger.log(`Preferences deleted for user ${userId}`);
      return {
        message: 'User preferences deleted successfully',
        userId,
      };

    } catch (error) {
      this.logger.error(`Failed to delete preferences for user ${userId}:`, error);
      
      if (error instanceof HttpException) {
        throw error;
      }
      
      throw new HttpException(
        `Failed to delete user preferences: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Get('statistics/overview')
  @ApiOperation({ 
    summary: 'Get preference statistics',
    description: 'Retrieves aggregate statistics about user preferences across the platform.'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Preference statistics retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        totalUsers: { type: 'number' },
        activeUsers: { type: 'number' },
        mostCommonTheme: { type: 'string' },
        mostCommonLayout: { type: 'string' },
        averagePreferenceAge: { type: 'number' }
      }
    }
  })
  async getPreferenceStatistics() {
    this.logger.log('Preference statistics requested');

    try {
      const statistics = await this.userPreferenceService.getPreferenceStatistics();
      
      this.logger.log('Preference statistics retrieved');
      return statistics;

    } catch (error) {
      this.logger.error('Failed to get preference statistics:', error);
      
      throw new HttpException(
        `Failed to get preference statistics: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Get('health')
  @ApiOperation({ 
    summary: 'User preference service health check',
    description: 'Checks if the user preference service is operational.'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'User preference service is healthy',
    schema: {
      type: 'object',
      properties: {
        status: { type: 'string' },
        timestamp: { type: 'string' },
        service: { type: 'string' }
      }
    }
  })
  async healthCheck() {
    return {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      service: 'UserPreferenceService',
    };
  }
}
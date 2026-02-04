import { Controller, Get, Post, Put, Delete, Body, Param, Query, Logger, HttpException, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiQuery, ApiBody } from '@nestjs/swagger';
import { IsString, IsOptional, IsArray, IsEnum, IsNumber, IsObject, IsBoolean, IsDateString } from 'class-validator';
import { 
  NotificationService, 
  NotificationChannel, 
  NotificationPriority, 
  NotificationStatus,
  NotificationPreferences 
} from './notification.service';

export class SendNotificationDto {
  @IsString()
  userId: string;

  @IsString()
  title: string;

  @IsString()
  message: string;

  @IsString()
  category: string;

  @IsOptional()
  @IsEnum(NotificationPriority)
  priority?: NotificationPriority;

  @IsOptional()
  @IsArray()
  @IsEnum(NotificationChannel, { each: true })
  channels?: NotificationChannel[];

  @IsOptional()
  @IsObject()
  data?: Record<string, any>;

  @IsOptional()
  @IsString()
  templateId?: string;

  @IsOptional()
  @IsObject()
  templateVariables?: Record<string, any>;

  @IsOptional()
  @IsDateString()
  expiresAt?: string;
}

export class SendBulkNotificationDto {
  @IsArray()
  @IsString({ each: true })
  userIds: string[];

  @IsString()
  title: string;

  @IsString()
  message: string;

  @IsString()
  category: string;

  @IsOptional()
  @IsEnum(NotificationPriority)
  priority?: NotificationPriority;

  @IsOptional()
  @IsArray()
  @IsEnum(NotificationChannel, { each: true })
  channels?: NotificationChannel[];

  @IsOptional()
  @IsObject()
  data?: Record<string, any>;

  @IsOptional()
  @IsString()
  templateId?: string;

  @IsOptional()
  @IsObject()
  templateVariables?: Record<string, any>;
}

export class UpdatePreferencesDto {
  @IsOptional()
  @IsObject()
  channels?: NotificationPreferences['channels'];

  @IsOptional()
  @IsObject()
  categories?: NotificationPreferences['categories'];

  @IsOptional()
  @IsObject()
  quietHours?: NotificationPreferences['quietHours'];
}

export class MarkAsReadDto {
  @IsArray()
  @IsString({ each: true })
  notificationIds: string[];
}

export class CleanupNotificationsDto {
  @IsDateString()
  olderThan: string;
}

export class CreateTemplateDto {
  @IsString()
  name: string;

  @IsString()
  subject: string;

  @IsString()
  body: string;

  @IsArray()
  @IsEnum(NotificationChannel, { each: true })
  channels: NotificationChannel[];

  @IsArray()
  @IsString({ each: true })
  variables: string[];
}

@ApiTags('Notifications')
@Controller('api/notifications')
export class NotificationController {
  private readonly logger = new Logger(NotificationController.name);

  constructor(private readonly notificationService: NotificationService) {}

  @Post('send')
  @ApiOperation({ 
    summary: 'Send notification',
    description: 'Sends a notification to a specific user through configured channels.'
  })
  @ApiBody({ 
    type: SendNotificationDto,
    description: 'Notification details including recipient, content, and delivery options'
  })
  @ApiResponse({ 
    status: 201, 
    description: 'Notification sent successfully',
    schema: {
      type: 'object',
      properties: {
        notificationId: { type: 'string' },
        message: { type: 'string' }
      }
    }
  })
  async sendNotification(@Body() sendDto: SendNotificationDto) {
    this.logger.log(`Send notification requested for user: ${sendDto.userId}`);

    try {
      const notificationId = await this.notificationService.sendNotification(
        sendDto.userId,
        {
          title: sendDto.title,
          message: sendDto.message,
          category: sendDto.category,
          priority: sendDto.priority,
          channels: sendDto.channels,
          data: sendDto.data,
          templateId: sendDto.templateId,
          templateVariables: sendDto.templateVariables,
          expiresAt: sendDto.expiresAt ? new Date(sendDto.expiresAt) : undefined,
        }
      );

      this.logger.log(`Notification sent: ${notificationId}`);
      
      return {
        notificationId,
        message: 'Notification sent successfully',
      };

    } catch (error) {
      this.logger.error('Failed to send notification:', error);
      throw new HttpException(
        `Failed to send notification: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Post('send-bulk')
  @ApiOperation({ 
    summary: 'Send bulk notifications',
    description: 'Sends the same notification to multiple users.'
  })
  @ApiBody({ 
    type: SendBulkNotificationDto,
    description: 'Bulk notification details including recipients and content'
  })
  @ApiResponse({ 
    status: 201, 
    description: 'Bulk notifications sent successfully',
    schema: {
      type: 'object',
      properties: {
        notificationIds: { type: 'array', items: { type: 'string' } },
        successCount: { type: 'number' },
        totalCount: { type: 'number' },
        message: { type: 'string' }
      }
    }
  })
  async sendBulkNotifications(@Body() bulkDto: SendBulkNotificationDto) {
    this.logger.log(`Send bulk notifications requested for ${bulkDto.userIds.length} users`);

    try {
      const notificationIds = await this.notificationService.sendBulkNotifications(
        bulkDto.userIds,
        {
          title: bulkDto.title,
          message: bulkDto.message,
          category: bulkDto.category,
          priority: bulkDto.priority,
          channels: bulkDto.channels,
          data: bulkDto.data,
          templateId: bulkDto.templateId,
          templateVariables: bulkDto.templateVariables,
        }
      );

      this.logger.log(`Bulk notifications sent: ${notificationIds.length}/${bulkDto.userIds.length}`);
      
      return {
        notificationIds,
        successCount: notificationIds.length,
        totalCount: bulkDto.userIds.length,
        message: `Successfully sent ${notificationIds.length} notifications`,
      };

    } catch (error) {
      this.logger.error('Failed to send bulk notifications:', error);
      throw new HttpException(
        `Failed to send bulk notifications: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Get('user/:userId')
  @ApiOperation({ 
    summary: 'Get user notifications',
    description: 'Retrieves notifications for a specific user with optional filtering.'
  })
  @ApiParam({ 
    name: 'userId', 
    description: 'User ID to get notifications for',
    type: 'string'
  })
  @ApiQuery({ 
    name: 'status', 
    description: 'Filter by notification status (comma-separated)',
    required: false,
    type: 'string'
  })
  @ApiQuery({ 
    name: 'category', 
    description: 'Filter by notification category (comma-separated)',
    required: false,
    type: 'string'
  })
  @ApiQuery({ 
    name: 'priority', 
    description: 'Filter by notification priority (comma-separated)',
    required: false,
    type: 'string'
  })
  @ApiQuery({ 
    name: 'since', 
    description: 'Filter notifications since date (ISO string)',
    required: false,
    type: 'string'
  })
  @ApiQuery({ 
    name: 'limit', 
    description: 'Maximum number of notifications to return',
    required: false,
    type: 'number'
  })
  @ApiQuery({ 
    name: 'offset', 
    description: 'Number of notifications to skip',
    required: false,
    type: 'number'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'User notifications retrieved successfully',
    schema: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          title: { type: 'string' },
          message: { type: 'string' },
          category: { type: 'string' },
          priority: { type: 'string' },
          status: { type: 'string' },
          channels: { type: 'array' },
          createdAt: { type: 'string' },
          readAt: { type: 'string' }
        }
      }
    }
  })
  async getUserNotifications(
    @Param('userId') userId: string,
    @Query('status') status?: string,
    @Query('category') category?: string,
    @Query('priority') priority?: string,
    @Query('since') since?: string,
    @Query('limit') limit?: number,
    @Query('offset') offset?: number
  ) {
    this.logger.log(`Get notifications requested for user: ${userId}`);

    try {
      const filter = {
        status: status ? status.split(',') as NotificationStatus[] : undefined,
        category: category ? category.split(',') : undefined,
        priority: priority ? priority.split(',') as NotificationPriority[] : undefined,
        since: since ? new Date(since) : undefined,
        limit,
        offset,
      };

      const notifications = this.notificationService.getUserNotifications(userId, filter);
      
      this.logger.log(`Retrieved ${notifications.length} notifications for user ${userId}`);
      return notifications;

    } catch (error) {
      this.logger.error(`Failed to get notifications for user ${userId}:`, error);
      throw new HttpException(
        `Failed to get notifications: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Get('health')
  @ApiOperation({ 
    summary: 'Notification service health check',
    description: 'Checks if the notification service is operational.'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Notification service is healthy',
    schema: {
      type: 'object',
      properties: {
        status: { type: 'string' },
        timestamp: { type: 'string' },
        service: { type: 'string' },
        statistics: { type: 'object' }
      }
    }
  })
  async healthCheck() {
    try {
      const statistics = this.notificationService.getNotificationStats();
      
      return {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        service: 'NotificationService',
        statistics,
      };
    } catch (error) {
      throw new HttpException(
        'Notification service is unhealthy',
        HttpStatus.SERVICE_UNAVAILABLE
      );
    }
  }

  @Get('statistics')
  @ApiOperation({ 
    summary: 'Get notification statistics',
    description: 'Retrieves comprehensive notification statistics.'
  })
  @ApiQuery({ 
    name: 'userId', 
    description: 'Get statistics for specific user (optional)',
    required: false,
    type: 'string'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Notification statistics retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        total: { type: 'number' },
        byStatus: { type: 'object' },
        byChannel: { type: 'object' },
        byPriority: { type: 'object' },
        deliveryRate: { type: 'number' },
        averageDeliveryTime: { type: 'number' },
        recentNotifications: { type: 'number' }
      }
    }
  })
  async getStatistics(@Query('userId') userId?: string) {
    this.logger.log('Get notification statistics requested');

    try {
      const statistics = this.notificationService.getNotificationStats(userId);
      
      this.logger.log(`Notification statistics: ${statistics.total} total notifications`);
      return statistics;

    } catch (error) {
      this.logger.error('Failed to get notification statistics:', error);
      throw new HttpException(
        `Failed to get statistics: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Get('templates')
  @ApiOperation({ 
    summary: 'Get notification templates',
    description: 'Retrieves all available notification templates.'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Notification templates retrieved successfully',
    schema: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          name: { type: 'string' },
          subject: { type: 'string' },
          body: { type: 'string' },
          channels: { type: 'array' },
          variables: { type: 'array' }
        }
      }
    }
  })
  async getTemplates() {
    this.logger.log('Get templates requested');

    try {
      const templates = this.notificationService.getTemplates();
      
      this.logger.log(`Retrieved ${templates.length} notification templates`);
      return templates;

    } catch (error) {
      this.logger.error('Failed to get templates:', error);
      throw new HttpException(
        `Failed to get templates: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Get(':notificationId')
  @ApiOperation({ 
    summary: 'Get notification details',
    description: 'Retrieves detailed information about a specific notification.'
  })
  @ApiParam({ 
    name: 'notificationId', 
    description: 'Notification ID',
    type: 'string'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Notification details retrieved successfully'
  })
  @ApiResponse({ 
    status: 404, 
    description: 'Notification not found' 
  })
  async getNotification(@Param('notificationId') notificationId: string) {
    this.logger.log(`Get notification requested: ${notificationId}`);

    try {
      const notification = this.notificationService.getNotification(notificationId);
      
      if (!notification) {
        throw new HttpException('Notification not found', HttpStatus.NOT_FOUND);
      }

      return notification;

    } catch (error) {
      this.logger.error(`Failed to get notification ${notificationId}:`, error);
      
      if (error instanceof HttpException) {
        throw error;
      }
      
      throw new HttpException(
        `Failed to get notification: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Put(':notificationId/read')
  @ApiOperation({ 
    summary: 'Mark notification as read',
    description: 'Marks a specific notification as read.'
  })
  @ApiParam({ 
    name: 'notificationId', 
    description: 'Notification ID to mark as read',
    type: 'string'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Notification marked as read successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        message: { type: 'string' }
      }
    }
  })
  @ApiResponse({ 
    status: 404, 
    description: 'Notification not found' 
  })
  async markAsRead(@Param('notificationId') notificationId: string) {
    this.logger.log(`Mark as read requested: ${notificationId}`);

    try {
      const success = this.notificationService.markAsRead(notificationId);
      
      if (!success) {
        throw new HttpException('Notification not found', HttpStatus.NOT_FOUND);
      }

      return {
        success: true,
        message: 'Notification marked as read',
      };

    } catch (error) {
      this.logger.error(`Failed to mark notification as read ${notificationId}:`, error);
      
      if (error instanceof HttpException) {
        throw error;
      }
      
      throw new HttpException(
        `Failed to mark notification as read: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Put('read-multiple')
  @ApiOperation({ 
    summary: 'Mark multiple notifications as read',
    description: 'Marks multiple notifications as read in a single request.'
  })
  @ApiBody({ 
    type: MarkAsReadDto,
    description: 'List of notification IDs to mark as read'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Notifications marked as read successfully',
    schema: {
      type: 'object',
      properties: {
        markedCount: { type: 'number' },
        totalCount: { type: 'number' },
        message: { type: 'string' }
      }
    }
  })
  async markMultipleAsRead(@Body() markDto: MarkAsReadDto) {
    this.logger.log(`Mark multiple as read requested: ${markDto.notificationIds.length} notifications`);

    try {
      const markedCount = this.notificationService.markMultipleAsRead(markDto.notificationIds);
      
      return {
        markedCount,
        totalCount: markDto.notificationIds.length,
        message: `Marked ${markedCount} notifications as read`,
      };

    } catch (error) {
      this.logger.error('Failed to mark multiple notifications as read:', error);
      throw new HttpException(
        `Failed to mark notifications as read: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Delete(':notificationId')
  @ApiOperation({ 
    summary: 'Delete notification',
    description: 'Deletes a specific notification.'
  })
  @ApiParam({ 
    name: 'notificationId', 
    description: 'Notification ID to delete',
    type: 'string'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Notification deleted successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        message: { type: 'string' }
      }
    }
  })
  @ApiResponse({ 
    status: 404, 
    description: 'Notification not found' 
  })
  async deleteNotification(@Param('notificationId') notificationId: string) {
    this.logger.log(`Delete notification requested: ${notificationId}`);

    try {
      const success = this.notificationService.deleteNotification(notificationId);
      
      if (!success) {
        throw new HttpException('Notification not found', HttpStatus.NOT_FOUND);
      }

      return {
        success: true,
        message: 'Notification deleted successfully',
      };

    } catch (error) {
      this.logger.error(`Failed to delete notification ${notificationId}:`, error);
      
      if (error instanceof HttpException) {
        throw error;
      }
      
      throw new HttpException(
        `Failed to delete notification: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Get('user/:userId/preferences')
  @ApiOperation({ 
    summary: 'Get user notification preferences',
    description: 'Retrieves notification preferences for a specific user.'
  })
  @ApiParam({ 
    name: 'userId', 
    description: 'User ID to get preferences for',
    type: 'string'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'User preferences retrieved successfully'
  })
  async getUserPreferences(@Param('userId') userId: string) {
    this.logger.log(`Get preferences requested for user: ${userId}`);

    try {
      const preferences = this.notificationService.getUserPreferences(userId);
      return preferences;

    } catch (error) {
      this.logger.error(`Failed to get preferences for user ${userId}:`, error);
      throw new HttpException(
        `Failed to get preferences: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Put('user/:userId/preferences')
  @ApiOperation({ 
    summary: 'Update user notification preferences',
    description: 'Updates notification preferences for a specific user.'
  })
  @ApiParam({ 
    name: 'userId', 
    description: 'User ID to update preferences for',
    type: 'string'
  })
  @ApiBody({ 
    type: UpdatePreferencesDto,
    description: 'Updated notification preferences'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'User preferences updated successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        message: { type: 'string' }
      }
    }
  })
  async updateUserPreferences(
    @Param('userId') userId: string,
    @Body() preferencesDto: UpdatePreferencesDto
  ) {
    this.logger.log(`Update preferences requested for user: ${userId}`);

    try {
      this.notificationService.updateUserPreferences(userId, preferencesDto);
      
      return {
        success: true,
        message: 'Notification preferences updated successfully',
      };

    } catch (error) {
      this.logger.error(`Failed to update preferences for user ${userId}:`, error);
      throw new HttpException(
        `Failed to update preferences: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Post('templates')
  @ApiOperation({ 
    summary: 'Create notification template',
    description: 'Creates a new notification template.'
  })
  @ApiBody({ 
    type: CreateTemplateDto,
    description: 'Template details including content and variables'
  })
  @ApiResponse({ 
    status: 201, 
    description: 'Template created successfully',
    schema: {
      type: 'object',
      properties: {
        templateId: { type: 'string' },
        message: { type: 'string' }
      }
    }
  })
  async createTemplate(@Body() templateDto: CreateTemplateDto) {
    this.logger.log(`Create template requested: ${templateDto.name}`);

    try {
      const templateId = this.notificationService.createTemplate(templateDto);
      
      this.logger.log(`Template created: ${templateId}`);
      
      return {
        templateId,
        message: 'Template created successfully',
      };

    } catch (error) {
      this.logger.error('Failed to create template:', error);
      throw new HttpException(
        `Failed to create template: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Post('cleanup')
  @ApiOperation({ 
    summary: 'Cleanup old notifications',
    description: 'Removes old read notifications to free up storage.'
  })
  @ApiBody({ 
    type: CleanupNotificationsDto,
    description: 'Cleanup options including age threshold'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Old notifications cleaned up successfully',
    schema: {
      type: 'object',
      properties: {
        cleanedCount: { type: 'number' },
        message: { type: 'string' }
      }
    }
  })
  async cleanupNotifications(@Body() cleanupDto: CleanupNotificationsDto) {
    this.logger.log('Cleanup notifications requested');

    try {
      const olderThan = new Date(cleanupDto.olderThan);
      const cleanedCount = this.notificationService.cleanupOldNotifications(olderThan);
      
      this.logger.log(`Cleaned up ${cleanedCount} old notifications`);
      
      return {
        cleanedCount,
        message: `Successfully cleaned up ${cleanedCount} old notifications`,
      };

    } catch (error) {
      this.logger.error('Failed to cleanup notifications:', error);
      throw new HttpException(
        `Failed to cleanup notifications: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }
}
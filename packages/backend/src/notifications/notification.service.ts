import { Injectable, Logger } from '@nestjs/common';
import { randomUUID } from 'crypto';

export enum NotificationChannel {
  WEB = 'web',
  EMAIL = 'email',
  SMS = 'sms',
  SLACK = 'slack',
  WEBHOOK = 'webhook',
}

export enum NotificationPriority {
  LOW = 'low',
  NORMAL = 'normal',
  HIGH = 'high',
  URGENT = 'urgent',
}

export enum NotificationStatus {
  PENDING = 'pending',
  SENT = 'sent',
  DELIVERED = 'delivered',
  FAILED = 'failed',
  READ = 'read',
}

export interface NotificationTemplate {
  id: string;
  name: string;
  subject: string;
  body: string;
  channels: NotificationChannel[];
  variables: string[];
}

export interface NotificationPreferences {
  userId: string;
  channels: {
    [key in NotificationChannel]?: {
      enabled: boolean;
      address?: string; // email address, phone number, webhook URL, etc.
      priority?: NotificationPriority;
    };
  };
  categories: {
    [category: string]: {
      enabled: boolean;
      channels: NotificationChannel[];
      priority: NotificationPriority;
    };
  };
  quietHours?: {
    enabled: boolean;
    start: string; // HH:MM format
    end: string; // HH:MM format
    timezone: string;
  };
}

export interface Notification {
  id: string;
  userId: string;
  title: string;
  message: string;
  category: string;
  priority: NotificationPriority;
  channels: NotificationChannel[];
  status: NotificationStatus;
  data?: Record<string, any>;
  templateId?: string;
  templateVariables?: Record<string, any>;
  createdAt: Date;
  sentAt?: Date;
  deliveredAt?: Date;
  readAt?: Date;
  expiresAt?: Date;
  retryCount: number;
  maxRetries: number;
  error?: string;
}

export interface NotificationDeliveryResult {
  channel: NotificationChannel;
  success: boolean;
  messageId?: string;
  error?: string;
  deliveredAt: Date;
}

export interface NotificationStats {
  total: number;
  byStatus: Record<NotificationStatus, number>;
  byChannel: Record<NotificationChannel, number>;
  byPriority: Record<NotificationPriority, number>;
  deliveryRate: number;
  averageDeliveryTime: number;
  recentNotifications: number;
}

@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);
  private readonly notifications = new Map<string, Notification>();
  private readonly userPreferences = new Map<string, NotificationPreferences>();
  private readonly templates = new Map<string, NotificationTemplate>();
  private readonly deliveryResults = new Map<string, NotificationDeliveryResult[]>();

  constructor() {
    this.initializeDefaultTemplates();
  }

  /**
   * Send notification to user
   */
  async sendNotification(
    userId: string,
    notification: {
      title: string;
      message: string;
      category: string;
      priority?: NotificationPriority;
      channels?: NotificationChannel[];
      data?: Record<string, any>;
      templateId?: string;
      templateVariables?: Record<string, any>;
      expiresAt?: Date;
    }
  ): Promise<string> {
    const notificationId = randomUUID();
    
    // Get user preferences
    const preferences = this.getUserPreferences(userId);
    
    // Determine channels to use
    const channels = this.determineChannels(notification, preferences);
    
    // Create notification record
    const notificationRecord: Notification = {
      id: notificationId,
      userId,
      title: notification.title,
      message: notification.message,
      category: notification.category,
      priority: notification.priority || NotificationPriority.NORMAL,
      channels,
      status: NotificationStatus.PENDING,
      data: notification.data,
      templateId: notification.templateId,
      templateVariables: notification.templateVariables,
      createdAt: new Date(),
      expiresAt: notification.expiresAt,
      retryCount: 0,
      maxRetries: 3,
    };

    this.notifications.set(notificationId, notificationRecord);

    // Check quiet hours
    if (this.isQuietHours(preferences)) {
      this.logger.log(`Notification ${notificationId} delayed due to quiet hours`);
      // In a real implementation, this would be scheduled for later
      return notificationId;
    }

    // Send notification
    await this.deliverNotification(notificationRecord);

    return notificationId;
  }

  /**
   * Send bulk notifications
   */
  async sendBulkNotifications(
    userIds: string[],
    notification: {
      title: string;
      message: string;
      category: string;
      priority?: NotificationPriority;
      channels?: NotificationChannel[];
      data?: Record<string, any>;
      templateId?: string;
      templateVariables?: Record<string, any>;
    }
  ): Promise<string[]> {
    const notificationIds: string[] = [];

    for (const userId of userIds) {
      try {
        const notificationId = await this.sendNotification(userId, notification);
        notificationIds.push(notificationId);
      } catch (error) {
        this.logger.error(`Failed to send notification to user ${userId}:`, error);
      }
    }

    this.logger.log(`Sent bulk notifications to ${notificationIds.length}/${userIds.length} users`);
    return notificationIds;
  }

  /**
   * Get notification by ID
   */
  getNotification(notificationId: string): Notification | null {
    return this.notifications.get(notificationId) || null;
  }

  /**
   * Get notifications for user
   */
  getUserNotifications(
    userId: string,
    filter: {
      status?: NotificationStatus[];
      category?: string[];
      priority?: NotificationPriority[];
      since?: Date;
      limit?: number;
      offset?: number;
    } = {}
  ): Notification[] {
    let notifications = Array.from(this.notifications.values())
      .filter(n => n.userId === userId);

    // Apply filters
    if (filter.status) {
      notifications = notifications.filter(n => filter.status!.includes(n.status));
    }

    if (filter.category) {
      notifications = notifications.filter(n => filter.category!.includes(n.category));
    }

    if (filter.priority) {
      notifications = notifications.filter(n => filter.priority!.includes(n.priority));
    }

    if (filter.since) {
      notifications = notifications.filter(n => n.createdAt >= filter.since!);
    }

    // Sort by creation date (newest first)
    notifications.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    // Apply pagination
    const offset = filter.offset || 0;
    const limit = filter.limit || 50;
    
    return notifications.slice(offset, offset + limit);
  }

  /**
   * Mark notification as read
   */
  markAsRead(notificationId: string): boolean {
    const notification = this.notifications.get(notificationId);
    
    if (!notification) {
      return false;
    }

    notification.status = NotificationStatus.READ;
    notification.readAt = new Date();

    this.logger.debug(`Notification ${notificationId} marked as read`);
    return true;
  }

  /**
   * Mark multiple notifications as read
   */
  markMultipleAsRead(notificationIds: string[]): number {
    let markedCount = 0;

    for (const notificationId of notificationIds) {
      if (this.markAsRead(notificationId)) {
        markedCount++;
      }
    }

    this.logger.log(`Marked ${markedCount} notifications as read`);
    return markedCount;
  }

  /**
   * Delete notification
   */
  deleteNotification(notificationId: string): boolean {
    const deleted = this.notifications.delete(notificationId);
    
    if (deleted) {
      this.deliveryResults.delete(notificationId);
      this.logger.debug(`Notification ${notificationId} deleted`);
    }

    return deleted;
  }

  /**
   * Get user notification preferences
   */
  getUserPreferences(userId: string): NotificationPreferences {
    return this.userPreferences.get(userId) || this.getDefaultPreferences(userId);
  }

  /**
   * Update user notification preferences
   */
  updateUserPreferences(userId: string, preferences: Partial<NotificationPreferences>): void {
    const currentPreferences = this.getUserPreferences(userId);
    const updatedPreferences = { ...currentPreferences, ...preferences };
    
    this.userPreferences.set(userId, updatedPreferences);
    this.logger.log(`Updated notification preferences for user ${userId}`);
  }

  /**
   * Get notification templates
   */
  getTemplates(): NotificationTemplate[] {
    return Array.from(this.templates.values());
  }

  /**
   * Get template by ID
   */
  getTemplate(templateId: string): NotificationTemplate | null {
    return this.templates.get(templateId) || null;
  }

  /**
   * Create notification template
   */
  createTemplate(template: Omit<NotificationTemplate, 'id'>): string {
    const templateId = randomUUID();
    const fullTemplate: NotificationTemplate = {
      id: templateId,
      ...template,
    };

    this.templates.set(templateId, fullTemplate);
    this.logger.log(`Created notification template: ${template.name}`);
    
    return templateId;
  }

  /**
   * Get notification statistics
   */
  getNotificationStats(userId?: string): NotificationStats {
    let notifications = Array.from(this.notifications.values());
    
    if (userId) {
      notifications = notifications.filter(n => n.userId === userId);
    }

    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);

    const byStatus = notifications.reduce((acc, n) => {
      acc[n.status] = (acc[n.status] || 0) + 1;
      return acc;
    }, {} as Record<NotificationStatus, number>);

    const byChannel = notifications.reduce((acc, n) => {
      n.channels.forEach(channel => {
        acc[channel] = (acc[channel] || 0) + 1;
      });
      return acc;
    }, {} as Record<NotificationChannel, number>);

    const byPriority = notifications.reduce((acc, n) => {
      acc[n.priority] = (acc[n.priority] || 0) + 1;
      return acc;
    }, {} as Record<NotificationPriority, number>);

    const deliveredNotifications = notifications.filter(n => n.status === NotificationStatus.DELIVERED);
    const deliveryRate = notifications.length > 0 ? (deliveredNotifications.length / notifications.length) * 100 : 0;

    const deliveryTimes = deliveredNotifications
      .filter(n => n.sentAt && n.deliveredAt)
      .map(n => n.deliveredAt!.getTime() - n.sentAt!.getTime());
    
    const averageDeliveryTime = deliveryTimes.length > 0 
      ? deliveryTimes.reduce((sum, time) => sum + time, 0) / deliveryTimes.length 
      : 0;

    const recentNotifications = notifications.filter(n => n.createdAt >= oneHourAgo).length;

    return {
      total: notifications.length,
      byStatus,
      byChannel,
      byPriority,
      deliveryRate: Math.round(deliveryRate * 100) / 100,
      averageDeliveryTime: Math.round(averageDeliveryTime),
      recentNotifications,
    };
  }

  /**
   * Cleanup old notifications
   */
  cleanupOldNotifications(olderThan: Date): number {
    const notifications = Array.from(this.notifications.entries());
    let cleanedCount = 0;

    for (const [id, notification] of notifications) {
      if (notification.createdAt < olderThan && notification.status === NotificationStatus.READ) {
        this.notifications.delete(id);
        this.deliveryResults.delete(id);
        cleanedCount++;
      }
    }

    this.logger.log(`Cleaned up ${cleanedCount} old notifications`);
    return cleanedCount;
  }

  private async deliverNotification(notification: Notification): Promise<void> {
    const results: NotificationDeliveryResult[] = [];

    for (const channel of notification.channels) {
      try {
        const result = await this.deliverToChannel(notification, channel);
        results.push(result);
      } catch (error) {
        this.logger.error(`Failed to deliver notification ${notification.id} via ${channel}:`, error);
        results.push({
          channel,
          success: false,
          error: error.message,
          deliveredAt: new Date(),
        });
      }
    }

    this.deliveryResults.set(notification.id, results);

    // Update notification status
    const hasSuccess = results.some(r => r.success);
    const allFailed = results.every(r => !r.success);

    if (hasSuccess) {
      notification.status = NotificationStatus.DELIVERED;
      notification.deliveredAt = new Date();
    } else if (allFailed) {
      notification.status = NotificationStatus.FAILED;
      notification.error = results.map(r => r.error).filter(Boolean).join('; ');
    }

    notification.sentAt = new Date();
  }

  private async deliverToChannel(
    notification: Notification,
    channel: NotificationChannel
  ): Promise<NotificationDeliveryResult> {
    const startTime = Date.now();

    // Simulate delivery based on channel
    switch (channel) {
      case NotificationChannel.WEB:
        return this.deliverWebNotification(notification);
      
      case NotificationChannel.EMAIL:
        return this.deliverEmailNotification(notification);
      
      case NotificationChannel.SMS:
        return this.deliverSMSNotification(notification);
      
      case NotificationChannel.SLACK:
        return this.deliverSlackNotification(notification);
      
      case NotificationChannel.WEBHOOK:
        return this.deliverWebhookNotification(notification);
      
      default:
        throw new Error(`Unsupported notification channel: ${channel}`);
    }
  }

  private async deliverWebNotification(notification: Notification): Promise<NotificationDeliveryResult> {
    // In a real implementation, this would push to WebSocket or SSE
    this.logger.debug(`Delivering web notification: ${notification.title}`);
    
    // Simulate delivery delay
    await new Promise(resolve => setTimeout(resolve, 100));
    
    return {
      channel: NotificationChannel.WEB,
      success: true,
      messageId: `web-${randomUUID()}`,
      deliveredAt: new Date(),
    };
  }

  private async deliverEmailNotification(notification: Notification): Promise<NotificationDeliveryResult> {
    // In a real implementation, this would use an email service like SendGrid, SES, etc.
    this.logger.debug(`Delivering email notification: ${notification.title}`);
    
    // Simulate delivery delay
    await new Promise(resolve => setTimeout(resolve, 500));
    
    return {
      channel: NotificationChannel.EMAIL,
      success: true,
      messageId: `email-${randomUUID()}`,
      deliveredAt: new Date(),
    };
  }

  private async deliverSMSNotification(notification: Notification): Promise<NotificationDeliveryResult> {
    // In a real implementation, this would use an SMS service like Twilio
    this.logger.debug(`Delivering SMS notification: ${notification.title}`);
    
    // Simulate delivery delay
    await new Promise(resolve => setTimeout(resolve, 300));
    
    return {
      channel: NotificationChannel.SMS,
      success: true,
      messageId: `sms-${randomUUID()}`,
      deliveredAt: new Date(),
    };
  }

  private async deliverSlackNotification(notification: Notification): Promise<NotificationDeliveryResult> {
    // In a real implementation, this would use Slack API
    this.logger.debug(`Delivering Slack notification: ${notification.title}`);
    
    // Simulate delivery delay
    await new Promise(resolve => setTimeout(resolve, 200));
    
    return {
      channel: NotificationChannel.SLACK,
      success: true,
      messageId: `slack-${randomUUID()}`,
      deliveredAt: new Date(),
    };
  }

  private async deliverWebhookNotification(notification: Notification): Promise<NotificationDeliveryResult> {
    // In a real implementation, this would make HTTP POST to webhook URL
    this.logger.debug(`Delivering webhook notification: ${notification.title}`);
    
    // Simulate delivery delay
    await new Promise(resolve => setTimeout(resolve, 400));
    
    return {
      channel: NotificationChannel.WEBHOOK,
      success: true,
      messageId: `webhook-${randomUUID()}`,
      deliveredAt: new Date(),
    };
  }

  private determineChannels(
    notification: {
      channels?: NotificationChannel[];
      category: string;
      priority?: NotificationPriority;
    },
    preferences: NotificationPreferences
  ): NotificationChannel[] {
    // If channels are explicitly specified, use those
    if (notification.channels && notification.channels.length > 0) {
      return notification.channels.filter(channel => 
        preferences.channels[channel]?.enabled !== false
      );
    }

    // Use category preferences if they exist
    const categoryPrefs = preferences.categories?.[notification.category];
    if (categoryPrefs && categoryPrefs.enabled) {
      return categoryPrefs.channels.filter(channel => 
        preferences.channels[channel]?.enabled !== false
      );
    }

    // For unknown categories, use default channels based on priority
    const priority = notification.priority || NotificationPriority.NORMAL;
    switch (priority) {
      case NotificationPriority.URGENT:
        return [NotificationChannel.WEB, NotificationChannel.EMAIL, NotificationChannel.SMS];
      case NotificationPriority.HIGH:
        return [NotificationChannel.WEB, NotificationChannel.EMAIL];
      case NotificationPriority.NORMAL:
      case NotificationPriority.LOW:
      default:
        return [NotificationChannel.WEB];
    }
  }

  private isQuietHours(preferences: NotificationPreferences): boolean {
    if (!preferences.quietHours?.enabled) {
      return false;
    }

    // In a real implementation, this would check the user's timezone
    const now = new Date();
    const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
    
    const { start, end } = preferences.quietHours;
    
    // Simple time comparison (doesn't handle cross-midnight ranges)
    return currentTime >= start && currentTime <= end;
  }

  private getDefaultPreferences(userId: string): NotificationPreferences {
    return {
      userId,
      channels: {
        [NotificationChannel.WEB]: { enabled: true, priority: NotificationPriority.NORMAL },
        [NotificationChannel.EMAIL]: { enabled: false, priority: NotificationPriority.HIGH },
        [NotificationChannel.SMS]: { enabled: false, priority: NotificationPriority.URGENT },
        [NotificationChannel.SLACK]: { enabled: false, priority: NotificationPriority.NORMAL },
        [NotificationChannel.WEBHOOK]: { enabled: false, priority: NotificationPriority.NORMAL },
      },
      categories: {
        'analysis-complete': {
          enabled: true,
          channels: [NotificationChannel.WEB],
          priority: NotificationPriority.NORMAL,
        },
        'security-alert': {
          enabled: true,
          channels: [NotificationChannel.WEB, NotificationChannel.EMAIL],
          priority: NotificationPriority.HIGH,
        },
        'system-maintenance': {
          enabled: true,
          channels: [NotificationChannel.WEB],
          priority: NotificationPriority.LOW,
        },
        'collaboration-invite': {
          enabled: true,
          channels: [NotificationChannel.WEB, NotificationChannel.EMAIL],
          priority: NotificationPriority.NORMAL,
        },
      },
      quietHours: {
        enabled: false,
        start: '22:00',
        end: '08:00',
        timezone: 'UTC',
      },
    };
  }

  private initializeDefaultTemplates(): void {
    const templates: Omit<NotificationTemplate, 'id'>[] = [
      {
        name: 'Analysis Complete',
        subject: 'Code Analysis Complete - {{projectName}}',
        body: 'Your code analysis for {{projectName}} has been completed. {{issuesFound}} issues were found.',
        channels: [NotificationChannel.WEB, NotificationChannel.EMAIL],
        variables: ['projectName', 'issuesFound'],
      },
      {
        name: 'Security Alert',
        subject: 'Security Alert - {{severity}} Issue Detected',
        body: 'A {{severity}} security issue has been detected in {{fileName}}: {{description}}',
        channels: [NotificationChannel.WEB, NotificationChannel.EMAIL, NotificationChannel.SLACK],
        variables: ['severity', 'fileName', 'description'],
      },
      {
        name: 'Collaboration Invite',
        subject: 'Collaboration Invitation - {{projectName}}',
        body: '{{inviterName}} has invited you to collaborate on {{projectName}}.',
        channels: [NotificationChannel.WEB, NotificationChannel.EMAIL],
        variables: ['inviterName', 'projectName'],
      },
    ];

    for (const template of templates) {
      this.createTemplate(template);
    }
  }
}
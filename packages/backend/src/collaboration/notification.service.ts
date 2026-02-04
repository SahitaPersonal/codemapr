import { Injectable, Logger } from '@nestjs/common';
import { CollaborationGateway } from './collaboration.gateway';
import { CollaborationPersistentService } from './collaboration-persistent.service';
import { NotificationType } from './entities';

export interface NotificationData {
  userId: string;
  sessionId?: string;
  type: NotificationType;
  title: string;
  message: string;
  data?: Record<string, any>;
}

@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);

  constructor(
    private readonly collaborationGateway: CollaborationGateway,
    private readonly persistentService: CollaborationPersistentService,
  ) {}

  /**
   * Send a real-time notification to a specific user
   */
  async sendNotificationToUser(notification: NotificationData): Promise<void> {
    try {
      // Store notification in database
      const savedNotification = await this.persistentService.createNotification(
        notification.userId,
        notification.sessionId || null,
        notification.type,
        notification.title,
        notification.message,
        notification.data || {},
      );

      // Send real-time notification via WebSocket
      this.collaborationGateway.sendToUser(notification.userId, 'notification', {
        id: savedNotification.id,
        type: notification.type,
        title: notification.title,
        message: notification.message,
        data: notification.data,
        createdAt: savedNotification.createdAt,
      });

      this.logger.debug(`Sent notification to user ${notification.userId}: ${notification.title}`);
    } catch (error) {
      this.logger.error(`Failed to send notification to user ${notification.userId}:`, error);
    }
  }

  /**
   * Send a notification to all users in a session except the sender
   */
  async sendNotificationToSession(
    sessionId: string,
    excludeUserId: string,
    type: NotificationType,
    title: string,
    message: string,
    data: Record<string, any> = {},
  ): Promise<void> {
    try {
      // Store notifications in database for all session participants
      await this.persistentService.createNotificationForSessionParticipants(
        sessionId,
        excludeUserId,
        type,
        title,
        message,
        data,
      );

      // Send real-time notification to all users in session
      this.collaborationGateway.sendToSession(sessionId, 'notification', {
        type,
        title,
        message,
        data,
        sessionId,
        excludeUserId,
        timestamp: new Date(),
      });

      this.logger.debug(`Sent notification to session ${sessionId}: ${title}`);
    } catch (error) {
      this.logger.error(`Failed to send notification to session ${sessionId}:`, error);
    }
  }

  /**
   * Send notification when user joins a session
   */
  async notifyUserJoined(sessionId: string, userId: string, username: string): Promise<void> {
    await this.sendNotificationToSession(
      sessionId,
      userId,
      'user_joined',
      'User Joined',
      `${username} joined the collaboration session`,
      { userId, username },
    );
  }

  /**
   * Send notification when user leaves a session
   */
  async notifyUserLeft(sessionId: string, userId: string, username: string): Promise<void> {
    await this.sendNotificationToSession(
      sessionId,
      userId,
      'user_left',
      'User Left',
      `${username} left the collaboration session`,
      { userId, username },
    );
  }

  /**
   * Send notification when annotation is added
   */
  async notifyAnnotationAdded(
    sessionId: string,
    userId: string,
    username: string,
    annotationId: string,
    type: string,
    file: string,
  ): Promise<void> {
    await this.sendNotificationToSession(
      sessionId,
      userId,
      'annotation_added',
      'New Annotation',
      `${username} added a ${type} in ${file}`,
      { annotationId, type, file, userId, username },
    );
  }

  /**
   * Send notification when annotation reply is added
   */
  async notifyAnnotationReply(
    annotationOwnerId: string,
    sessionId: string,
    replyUserId: string,
    replyUsername: string,
    annotationId: string,
    replyId: string,
  ): Promise<void> {
    if (annotationOwnerId !== replyUserId) {
      await this.sendNotificationToUser({
        userId: annotationOwnerId,
        sessionId,
        type: 'annotation_reply',
        title: 'New Reply',
        message: `${replyUsername} replied to your annotation`,
        data: { annotationId, replyId, replyUserId, replyUsername },
      });
    }
  }

  /**
   * Send notification when session is updated
   */
  async notifySessionUpdated(
    sessionId: string,
    updatedBy: string,
    updatedByUsername: string,
    changes: Record<string, any>,
  ): Promise<void> {
    await this.sendNotificationToSession(
      sessionId,
      updatedBy,
      'session_updated',
      'Session Updated',
      `${updatedByUsername} updated the session settings`,
      { changes, updatedBy, updatedByUsername },
    );
  }

  /**
   * Send session invitation notification
   */
  async sendSessionInvitation(
    invitedUserId: string,
    sessionId: string,
    sessionName: string,
    invitedBy: string,
    invitedByUsername: string,
  ): Promise<void> {
    await this.sendNotificationToUser({
      userId: invitedUserId,
      sessionId,
      type: 'session_invite',
      title: 'Session Invitation',
      message: `${invitedByUsername} invited you to join "${sessionName}"`,
      data: { sessionId, sessionName, invitedBy, invitedByUsername },
    });
  }

  /**
   * Get user's unread notification count
   */
  async getUnreadNotificationCount(userId: string): Promise<number> {
    const notifications = await this.persistentService.getUserNotifications(userId, 1000);
    return notifications.filter(n => n.status === 'unread').length;
  }

  /**
   * Mark notification as read
   */
  async markAsRead(notificationId: string, userId: string): Promise<void> {
    await this.persistentService.markNotificationAsRead(notificationId, userId);
    
    // Send real-time update
    this.collaborationGateway.sendToUser(userId, 'notification-read', {
      notificationId,
      timestamp: new Date(),
    });
  }

  /**
   * Mark all notifications as read for a user
   */
  async markAllAsRead(userId: string): Promise<void> {
    await this.persistentService.markAllNotificationsAsRead(userId);
    
    // Send real-time update
    this.collaborationGateway.sendToUser(userId, 'notifications-all-read', {
      timestamp: new Date(),
    });
  }
}
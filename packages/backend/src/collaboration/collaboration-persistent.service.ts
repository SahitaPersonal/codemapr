import { Injectable, Logger, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, FindOptionsWhere, In } from 'typeorm';
import {
  CollaborationSession,
  SessionParticipant,
  Annotation,
  AnnotationReply,
  ActivityLog,
  Notification,
  ParticipantRole,
  AnnotationType,
  AnnotationStatus,
  NotificationType,
} from './entities';
import { UserPresence } from './collaboration.gateway';

export interface CreateSessionData {
  name: string;
  projectId: string;
  createdBy: string;
  settings?: Partial<{
    allowAnonymous: boolean;
    maxParticipants: number;
    autoSave: boolean;
    conflictResolution: 'last-write-wins' | 'operational-transform';
  }>;
}

export interface UpdateSessionData {
  name?: string;
  settings?: Partial<{
    allowAnonymous: boolean;
    maxParticipants: number;
    autoSave: boolean;
    conflictResolution: 'last-write-wins' | 'operational-transform';
  }>;
}

export interface CreateAnnotationData {
  sessionId: string;
  userId: string;
  file: string;
  line: number;
  column: number;
  content: string;
  type: AnnotationType;
}

@Injectable()
export class CollaborationPersistentService {
  private readonly logger = new Logger(CollaborationPersistentService.name);

  constructor(
    @InjectRepository(CollaborationSession)
    private readonly sessionRepository: Repository<CollaborationSession>,
    @InjectRepository(SessionParticipant)
    private readonly participantRepository: Repository<SessionParticipant>,
    @InjectRepository(Annotation)
    private readonly annotationRepository: Repository<Annotation>,
    @InjectRepository(AnnotationReply)
    private readonly replyRepository: Repository<AnnotationReply>,
    @InjectRepository(ActivityLog)
    private readonly activityRepository: Repository<ActivityLog>,
    @InjectRepository(Notification)
    private readonly notificationRepository: Repository<Notification>,
  ) {
    this.logger.log('Collaboration Persistent Service initialized');
  }

  // Session Management
  async createSession(data: CreateSessionData): Promise<CollaborationSession> {
    const session = this.sessionRepository.create({
      name: data.name,
      projectId: data.projectId,
      createdBy: data.createdBy,
      settings: {
        allowAnonymous: false,
        maxParticipants: 10,
        autoSave: true,
        conflictResolution: 'operational-transform',
        ...data.settings,
      },
    });

    const savedSession = await this.sessionRepository.save(session);

    // Add creator as owner participant
    await this.addParticipant(savedSession.id, {
      userId: data.createdBy,
      username: 'Session Creator', // This should come from user service
      role: 'owner',
    });

    await this.logActivity(savedSession.id, data.createdBy, 'session_created', {
      sessionName: data.name,
      projectId: data.projectId,
    });

    this.logger.log(`Created collaboration session: ${savedSession.id}`);
    return savedSession;
  }

  async getSession(sessionId: string, includeRelations = false): Promise<CollaborationSession> {
    const relations = includeRelations ? ['participants', 'annotations', 'activityLogs'] : [];
    
    const session = await this.sessionRepository.findOne({
      where: { id: sessionId },
      relations,
    });

    if (!session) {
      throw new NotFoundException(`Session ${sessionId} not found`);
    }

    return session;
  }

  async updateSession(
    sessionId: string,
    updates: UpdateSessionData,
    userId: string,
  ): Promise<CollaborationSession> {
    const session = await this.getSession(sessionId);
    
    // Check permissions
    if (session.createdBy !== userId) {
      const participant = await this.getParticipant(sessionId, userId);
      if (!participant || participant.role === 'viewer') {
        throw new ForbiddenException('Insufficient permissions to update session');
      }
    }

    // Update session
    if (updates.name) {
      session.name = updates.name;
    }

    if (updates.settings) {
      session.settings = { ...session.settings, ...updates.settings };
    }

    const updatedSession = await this.sessionRepository.save(session);

    await this.logActivity(sessionId, userId, 'session_updated', { updates });

    return updatedSession;
  }

  async deleteSession(sessionId: string, userId: string): Promise<void> {
    const session = await this.getSession(sessionId);
    
    if (session.createdBy !== userId) {
      throw new ForbiddenException('Only session owner can delete session');
    }

    session.isActive = false;
    await this.sessionRepository.save(session);

    await this.logActivity(sessionId, userId, 'session_deleted', {});

    this.logger.log(`Deleted collaboration session: ${sessionId}`);
  }

  async getUserSessions(userId: string): Promise<CollaborationSession[]> {
    const participants = await this.participantRepository.find({
      where: { userId },
      relations: ['session'],
    });

    return participants
      .map(p => p.session)
      .filter(s => s.isActive);
  }

  // Participant Management
  async addParticipant(
    sessionId: string,
    data: {
      userId: string;
      username: string;
      role?: ParticipantRole;
    },
  ): Promise<SessionParticipant> {
    const session = await this.getSession(sessionId);
    
    // Check if participant already exists
    const existing = await this.participantRepository.findOne({
      where: { sessionId, userId: data.userId },
    });

    if (existing) {
      // Update existing participant
      existing.username = data.username;
      existing.lastActivity = new Date();
      if (data.role) {
        existing.role = data.role;
        existing.permissions = this.getDefaultPermissions(data.role);
      }
      return await this.participantRepository.save(existing);
    }

    // Create new participant
    const participant = this.participantRepository.create({
      sessionId,
      userId: data.userId,
      username: data.username,
      role: data.role || 'editor',
      permissions: this.getDefaultPermissions(data.role || 'editor'),
    });

    const savedParticipant = await this.participantRepository.save(participant);

    await this.logActivity(sessionId, data.userId, 'user_joined', {
      username: data.username,
      role: data.role || 'editor',
    });

    return savedParticipant;
  }

  async getParticipant(sessionId: string, userId: string): Promise<SessionParticipant | null> {
    return await this.participantRepository.findOne({
      where: { sessionId, userId },
    });
  }

  async updateParticipantActivity(sessionId: string, userId: string): Promise<void> {
    await this.participantRepository.update(
      { sessionId, userId },
      { lastActivity: new Date() },
    );
  }

  async removeParticipant(sessionId: string, userId: string, removedBy: string): Promise<void> {
    const participant = await this.getParticipant(sessionId, userId);
    if (!participant) return;

    await this.participantRepository.remove(participant);

    await this.logActivity(sessionId, removedBy, 'user_removed', {
      removedUserId: userId,
      removedUsername: participant.username,
    });
  }

  // Annotation Management
  async createAnnotation(data: CreateAnnotationData): Promise<Annotation> {
    const session = await this.getSession(data.sessionId);
    const participant = await this.getParticipant(data.sessionId, data.userId);
    
    if (!participant) {
      throw new ForbiddenException('User not part of session');
    }

    const annotation = this.annotationRepository.create({
      sessionId: data.sessionId,
      userId: data.userId,
      username: participant.username,
      file: data.file,
      line: data.line,
      column: data.column,
      content: data.content,
      type: data.type,
    });

    const savedAnnotation = await this.annotationRepository.save(annotation);

    await this.logActivity(data.sessionId, data.userId, 'annotation_created', {
      annotationId: savedAnnotation.id,
      type: data.type,
      file: data.file,
    });

    // Create notifications for other participants
    await this.createNotificationForSessionParticipants(
      data.sessionId,
      data.userId,
      'annotation_added',
      `New ${data.type} added`,
      `${participant.username} added a ${data.type} in ${data.file}`,
      { annotationId: savedAnnotation.id, file: data.file },
    );

    this.logger.debug(`Created annotation ${savedAnnotation.id} in session ${data.sessionId}`);

    return savedAnnotation;
  }

  async updateAnnotation(
    annotationId: string,
    content: string,
    userId: string,
  ): Promise<Annotation> {
    const annotation = await this.annotationRepository.findOne({
      where: { id: annotationId },
    });

    if (!annotation) {
      throw new NotFoundException(`Annotation ${annotationId} not found`);
    }

    if (annotation.userId !== userId) {
      throw new ForbiddenException('Can only update own annotations');
    }

    annotation.content = content;
    const updatedAnnotation = await this.annotationRepository.save(annotation);

    await this.logActivity(annotation.sessionId, userId, 'annotation_updated', {
      annotationId,
    });

    return updatedAnnotation;
  }

  async deleteAnnotation(annotationId: string, userId: string): Promise<void> {
    const annotation = await this.annotationRepository.findOne({
      where: { id: annotationId },
    });

    if (!annotation) {
      throw new NotFoundException(`Annotation ${annotationId} not found`);
    }

    if (annotation.userId !== userId) {
      throw new ForbiddenException('Can only delete own annotations');
    }

    annotation.status = 'deleted';
    await this.annotationRepository.save(annotation);

    await this.logActivity(annotation.sessionId, userId, 'annotation_deleted', {
      annotationId,
    });
  }

  async getSessionAnnotations(sessionId: string): Promise<Annotation[]> {
    return await this.annotationRepository.find({
      where: { sessionId, status: 'active' },
      relations: ['replies'],
      order: { createdAt: 'ASC' },
    });
  }

  async addAnnotationReply(
    annotationId: string,
    userId: string,
    content: string,
  ): Promise<AnnotationReply> {
    const annotation = await this.annotationRepository.findOne({
      where: { id: annotationId },
    });

    if (!annotation) {
      throw new NotFoundException(`Annotation ${annotationId} not found`);
    }

    const participant = await this.getParticipant(annotation.sessionId, userId);
    if (!participant) {
      throw new ForbiddenException('User not part of session');
    }

    const reply = this.replyRepository.create({
      annotationId,
      userId,
      username: participant.username,
      content,
    });

    const savedReply = await this.replyRepository.save(reply);

    await this.logActivity(annotation.sessionId, userId, 'annotation_reply_added', {
      annotationId,
      replyId: savedReply.id,
    });

    // Notify annotation author if different user
    if (annotation.userId !== userId) {
      await this.createNotification(
        annotation.userId,
        annotation.sessionId,
        'annotation_reply',
        'New reply to your annotation',
        `${participant.username} replied to your annotation`,
        { annotationId, replyId: savedReply.id },
      );
    }

    return savedReply;
  }

  // Activity Log Management
  async logActivity(
    sessionId: string,
    userId: string,
    action: string,
    details: Record<string, any>,
  ): Promise<ActivityLog> {
    const participant = await this.getParticipant(sessionId, userId);
    const username = participant?.username || 'Unknown';

    const log = this.activityRepository.create({
      sessionId,
      userId,
      username,
      action,
      details,
    });

    return await this.activityRepository.save(log);
  }

  async getActivityLog(sessionId: string, limit = 50): Promise<ActivityLog[]> {
    return await this.activityRepository.find({
      where: { sessionId },
      order: { timestamp: 'DESC' },
      take: limit,
    });
  }

  // Notification Management
  async createNotification(
    userId: string,
    sessionId: string,
    type: NotificationType,
    title: string,
    message: string,
    data: Record<string, any> = {},
  ): Promise<Notification> {
    const notification = this.notificationRepository.create({
      userId,
      sessionId,
      type,
      title,
      message,
      data,
    });

    return await this.notificationRepository.save(notification);
  }

  async createNotificationForSessionParticipants(
    sessionId: string,
    excludeUserId: string,
    type: NotificationType,
    title: string,
    message: string,
    data: Record<string, any> = {},
  ): Promise<void> {
    const participants = await this.participantRepository.find({
      where: { sessionId },
    });

    const notifications = participants
      .filter(p => p.userId !== excludeUserId)
      .map(p => this.notificationRepository.create({
        userId: p.userId,
        sessionId,
        type,
        title,
        message,
        data,
      }));

    if (notifications.length > 0) {
      await this.notificationRepository.save(notifications);
    }
  }

  async getUserNotifications(userId: string, limit = 50): Promise<Notification[]> {
    return await this.notificationRepository.find({
      where: { userId },
      order: { createdAt: 'DESC' },
      take: limit,
    });
  }

  async markNotificationAsRead(notificationId: string, userId: string): Promise<void> {
    await this.notificationRepository.update(
      { id: notificationId, userId },
      { status: 'read', readAt: new Date() },
    );
  }

  async markAllNotificationsAsRead(userId: string): Promise<void> {
    await this.notificationRepository.update(
      { userId, status: 'unread' },
      { status: 'read', readAt: new Date() },
    );
  }

  // Statistics
  async getSessionStats(sessionId: string): Promise<{
    totalParticipants: number;
    activeParticipants: number;
    totalAnnotations: number;
    totalActivity: number;
  }> {
    const [participantCount, annotationCount, activityCount] = await Promise.all([
      this.participantRepository.count({ where: { sessionId } }),
      this.annotationRepository.count({ where: { sessionId, status: 'active' } }),
      this.activityRepository.count({ where: { sessionId } }),
    ]);

    // Calculate active participants (active in last 5 minutes)
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    const activeParticipantCount = await this.participantRepository
      .createQueryBuilder('participant')
      .where('participant.sessionId = :sessionId', { sessionId })
      .andWhere('participant.lastActivity >= :fiveMinutesAgo', { fiveMinutesAgo })
      .getCount();

    return {
      totalParticipants: participantCount,
      activeParticipants: activeParticipantCount,
      totalAnnotations: annotationCount,
      totalActivity: activityCount,
    };
  }

  // User Connection Handling
  async handleUserConnect(
    userId: string,
    sessionId: string,
    userPresence: UserPresence,
  ): Promise<void> {
    await this.addParticipant(sessionId, {
      userId,
      username: userPresence.username,
    });

    await this.updateParticipantActivity(sessionId, userId);
  }

  async handleUserDisconnect(userId: string, sessionId: string): Promise<void> {
    await this.updateParticipantActivity(sessionId, userId);
  }

  // Cleanup Methods
  async cleanupInactiveSessions(): Promise<void> {
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    
    await this.sessionRepository
      .createQueryBuilder()
      .update(CollaborationSession)
      .set({ isActive: false })
      .where('updatedAt < :oneDayAgo', { oneDayAgo })
      .andWhere('isActive = :isActive', { isActive: true })
      .execute();

    this.logger.debug('Cleaned up inactive sessions');
  }

  async cleanupOldAnnotations(): Promise<void> {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    
    await this.annotationRepository
      .createQueryBuilder()
      .delete()
      .from(Annotation)
      .where('status = :status', { status: 'deleted' })
      .andWhere('updatedAt < :thirtyDaysAgo', { thirtyDaysAgo })
      .execute();

    this.logger.debug('Cleaned up old deleted annotations');
  }

  async cleanupOldNotifications(): Promise<void> {
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    
    await this.notificationRepository
      .createQueryBuilder()
      .delete()
      .from(Notification)
      .where('status IN (:...statuses)', { statuses: ['read', 'dismissed'] })
      .andWhere('updatedAt < :sevenDaysAgo', { sevenDaysAgo })
      .execute();

    this.logger.debug('Cleaned up old notifications');
  }

  // Helper Methods
  private getDefaultPermissions(role: ParticipantRole): string[] {
    switch (role) {
      case 'owner':
        return ['read', 'write', 'delete', 'manage_users', 'manage_session'];
      case 'editor':
        return ['read', 'write', 'comment'];
      case 'viewer':
        return ['read', 'comment'];
      default:
        return ['read'];
    }
  }
}
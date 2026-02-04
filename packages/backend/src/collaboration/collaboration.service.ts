import { Injectable, Logger, NotFoundException, ForbiddenException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { UserPresence } from './collaboration.gateway';

export interface CollaborationSession {
  id: string;
  name: string;
  projectId: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
  isActive: boolean;
  participants: SessionParticipant[];
  settings: SessionSettings;
}

export interface SessionParticipant {
  userId: string;
  username: string;
  role: 'owner' | 'editor' | 'viewer';
  joinedAt: Date;
  lastActivity: Date;
  permissions: string[];
}

export interface SessionSettings {
  allowAnonymous: boolean;
  maxParticipants: number;
  autoSave: boolean;
  conflictResolution: 'last-write-wins' | 'operational-transform';
}

export interface Annotation {
  id: string;
  sessionId: string;
  userId: string;
  username: string;
  file: string;
  line: number;
  column: number;
  content: string;
  type: 'comment' | 'suggestion' | 'issue';
  status: 'active' | 'resolved' | 'deleted';
  createdAt: Date;
  updatedAt: Date;
  replies: AnnotationReply[];
}

export interface AnnotationReply {
  id: string;
  annotationId: string;
  userId: string;
  username: string;
  content: string;
  createdAt: Date;
}

export interface ActivityLog {
  id: string;
  sessionId: string;
  userId: string;
  username: string;
  action: string;
  details: Record<string, any>;
  timestamp: Date;
}

@Injectable()
export class CollaborationService {
  private readonly logger = new Logger(CollaborationService.name);
  
  // In-memory storage for demo - in production, use Redis or database
  private readonly sessions = new Map<string, CollaborationSession>();
  private readonly annotations = new Map<string, Annotation>();
  private readonly activityLogs = new Map<string, ActivityLog[]>();
  private readonly userSessions = new Map<string, Set<string>>();

  constructor() {
    this.logger.log('Collaboration Service initialized');
  }

  async createSession(data: {
    name: string;
    projectId: string;
    createdBy: string;
    settings?: Partial<SessionSettings>;
  }): Promise<CollaborationSession> {
    const sessionId = randomUUID();
    
    const session: CollaborationSession = {
      id: sessionId,
      name: data.name,
      projectId: data.projectId,
      createdBy: data.createdBy,
      createdAt: new Date(),
      updatedAt: new Date(),
      isActive: true,
      participants: [],
      settings: {
        allowAnonymous: false,
        maxParticipants: 10,
        autoSave: true,
        conflictResolution: 'last-write-wins',
        ...data.settings,
      },
    };

    this.sessions.set(sessionId, session);
    this.activityLogs.set(sessionId, []);

    this.logger.log(`Created collaboration session: ${sessionId}`);
    
    return session;
  }

  async getSession(sessionId: string): Promise<CollaborationSession> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new NotFoundException(`Session ${sessionId} not found`);
    }
    return session;
  }

  async updateSession(
    sessionId: string,
    updates: Partial<Pick<CollaborationSession, 'name'>> & {
      settings?: Partial<SessionSettings>;
    },
    userId: string,
  ): Promise<CollaborationSession> {
    const session = await this.getSession(sessionId);
    
    // Check permissions
    if (session.createdBy !== userId) {
      const participant = session.participants.find(p => p.userId === userId);
      if (!participant || participant.role === 'viewer') {
        throw new ForbiddenException('Insufficient permissions to update session');
      }
    }

    // Merge settings if provided
    if (updates.settings) {
      Object.assign(session.settings, updates.settings);
    }
    
    // Update other fields
    if (updates.name) {
      session.name = updates.name;
    }
    
    session.updatedAt = new Date();
    this.sessions.set(sessionId, session);

    await this.logActivity(sessionId, userId, 'session_updated', { updates });

    return session;
  }

  async deleteSession(sessionId: string, userId: string): Promise<void> {
    const session = await this.getSession(sessionId);
    
    if (session.createdBy !== userId) {
      throw new ForbiddenException('Only session owner can delete session');
    }

    session.isActive = false;
    this.sessions.set(sessionId, session);

    await this.logActivity(sessionId, userId, 'session_deleted', {});

    this.logger.log(`Deleted collaboration session: ${sessionId}`);
  }

  async handleUserConnect(
    userId: string,
    sessionId: string,
    userPresence: UserPresence,
  ): Promise<void> {
    const session = await this.getSession(sessionId);
    
    // Add or update participant
    let participant = session.participants.find(p => p.userId === userId);
    if (!participant) {
      participant = {
        userId,
        username: userPresence.username,
        role: session.createdBy === userId ? 'owner' : 'editor',
        joinedAt: new Date(),
        lastActivity: new Date(),
        permissions: this.getDefaultPermissions('editor'),
      };
      session.participants.push(participant);
    } else {
      participant.lastActivity = new Date();
    }

    // Track user sessions
    if (!this.userSessions.has(userId)) {
      this.userSessions.set(userId, new Set());
    }
    this.userSessions.get(userId)!.add(sessionId);

    await this.logActivity(sessionId, userId, 'user_connected', {
      username: userPresence.username,
    });

    this.logger.debug(`User ${userId} connected to session ${sessionId}`);
  }

  async handleUserDisconnect(userId: string, sessionId: string): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (!session) return;

    // Update participant last activity
    const participant = session.participants.find(p => p.userId === userId);
    if (participant) {
      participant.lastActivity = new Date();
    }

    // Remove from user sessions tracking
    const userSessionSet = this.userSessions.get(userId);
    if (userSessionSet) {
      userSessionSet.delete(sessionId);
      if (userSessionSet.size === 0) {
        this.userSessions.delete(userId);
      }
    }

    await this.logActivity(sessionId, userId, 'user_disconnected', {});

    this.logger.debug(`User ${userId} disconnected from session ${sessionId}`);
  }

  async createAnnotation(data: {
    sessionId: string;
    userId: string;
    file: string;
    line: number;
    column: number;
    content: string;
    type: 'comment' | 'suggestion' | 'issue';
  }): Promise<Annotation> {
    const session = await this.getSession(data.sessionId);
    const participant = session.participants.find(p => p.userId === data.userId);
    
    if (!participant) {
      throw new ForbiddenException('User not part of session');
    }

    const annotationId = randomUUID();
    const annotation: Annotation = {
      id: annotationId,
      sessionId: data.sessionId,
      userId: data.userId,
      username: participant.username,
      file: data.file,
      line: data.line,
      column: data.column,
      content: data.content,
      type: data.type,
      status: 'active',
      createdAt: new Date(),
      updatedAt: new Date(),
      replies: [],
    };

    this.annotations.set(annotationId, annotation);

    await this.logActivity(data.sessionId, data.userId, 'annotation_created', {
      annotationId,
      type: data.type,
      file: data.file,
    });

    this.logger.debug(`Created annotation ${annotationId} in session ${data.sessionId}`);

    return annotation;
  }

  async updateAnnotation(
    annotationId: string,
    content: string,
    userId: string,
  ): Promise<Annotation> {
    const annotation = this.annotations.get(annotationId);
    if (!annotation) {
      throw new NotFoundException(`Annotation ${annotationId} not found`);
    }

    if (annotation.userId !== userId) {
      throw new ForbiddenException('Can only update own annotations');
    }

    annotation.content = content;
    annotation.updatedAt = new Date();
    this.annotations.set(annotationId, annotation);

    await this.logActivity(annotation.sessionId, userId, 'annotation_updated', {
      annotationId,
    });

    return annotation;
  }

  async deleteAnnotation(annotationId: string, userId: string): Promise<void> {
    const annotation = this.annotations.get(annotationId);
    if (!annotation) {
      throw new NotFoundException(`Annotation ${annotationId} not found`);
    }

    if (annotation.userId !== userId) {
      throw new ForbiddenException('Can only delete own annotations');
    }

    annotation.status = 'deleted';
    annotation.updatedAt = new Date();
    this.annotations.set(annotationId, annotation);

    await this.logActivity(annotation.sessionId, userId, 'annotation_deleted', {
      annotationId,
    });
  }

  async getSessionAnnotations(sessionId: string): Promise<Annotation[]> {
    const annotations: Annotation[] = [];
    
    for (const annotation of this.annotations.values()) {
      if (annotation.sessionId === sessionId && annotation.status === 'active') {
        annotations.push(annotation);
      }
    }

    return annotations.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
  }

  async addAnnotationReply(
    annotationId: string,
    userId: string,
    content: string,
  ): Promise<AnnotationReply> {
    const annotation = this.annotations.get(annotationId);
    if (!annotation) {
      throw new NotFoundException(`Annotation ${annotationId} not found`);
    }

    const session = await this.getSession(annotation.sessionId);
    const participant = session.participants.find(p => p.userId === userId);
    
    if (!participant) {
      throw new ForbiddenException('User not part of session');
    }

    const reply: AnnotationReply = {
      id: randomUUID(),
      annotationId,
      userId,
      username: participant.username,
      content,
      createdAt: new Date(),
    };

    annotation.replies.push(reply);
    annotation.updatedAt = new Date();
    this.annotations.set(annotationId, annotation);

    await this.logActivity(annotation.sessionId, userId, 'annotation_reply_added', {
      annotationId,
      replyId: reply.id,
    });

    return reply;
  }

  async getActivityLog(sessionId: string, limit = 50): Promise<ActivityLog[]> {
    const logs = this.activityLogs.get(sessionId) || [];
    return logs
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, limit);
  }

  async getUserSessions(userId: string): Promise<CollaborationSession[]> {
    const userSessionIds = this.userSessions.get(userId) || new Set();
    const sessions: CollaborationSession[] = [];

    for (const sessionId of userSessionIds) {
      const session = this.sessions.get(sessionId);
      if (session && session.isActive) {
        sessions.push(session);
      }
    }

    return sessions;
  }

  async getSessionStats(sessionId: string): Promise<{
    totalParticipants: number;
    activeParticipants: number;
    totalAnnotations: number;
    totalActivity: number;
  }> {
    const session = await this.getSession(sessionId);
    const annotations = await this.getSessionAnnotations(sessionId);
    const activityLogs = this.activityLogs.get(sessionId) || [];

    const now = new Date();
    const activeThreshold = 5 * 60 * 1000; // 5 minutes

    const activeParticipants = session.participants.filter(
      p => now.getTime() - p.lastActivity.getTime() < activeThreshold
    ).length;

    return {
      totalParticipants: session.participants.length,
      activeParticipants,
      totalAnnotations: annotations.length,
      totalActivity: activityLogs.length,
    };
  }

  private async logActivity(
    sessionId: string,
    userId: string,
    action: string,
    details: Record<string, any>,
  ): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (!session) return;

    const participant = session.participants.find(p => p.userId === userId);
    const username = participant?.username || 'Unknown';

    const log: ActivityLog = {
      id: randomUUID(),
      sessionId,
      userId,
      username,
      action,
      details,
      timestamp: new Date(),
    };

    const logs = this.activityLogs.get(sessionId) || [];
    logs.push(log);
    
    // Keep only last 1000 logs per session
    if (logs.length > 1000) {
      logs.splice(0, logs.length - 1000);
    }
    
    this.activityLogs.set(sessionId, logs);
  }

  private getDefaultPermissions(role: string): string[] {
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

  // Cleanup methods for production
  async cleanupInactiveSessions(): Promise<void> {
    const now = new Date();
    const inactiveThreshold = 24 * 60 * 60 * 1000; // 24 hours

    for (const [sessionId, session] of this.sessions.entries()) {
      const timeSinceUpdate = now.getTime() - session.updatedAt.getTime();
      
      if (timeSinceUpdate > inactiveThreshold && session.participants.length === 0) {
        session.isActive = false;
        this.sessions.set(sessionId, session);
        this.logger.debug(`Marked session ${sessionId} as inactive`);
      }
    }
  }

  async cleanupOldAnnotations(): Promise<void> {
    const now = new Date();
    const oldThreshold = 30 * 24 * 60 * 60 * 1000; // 30 days

    for (const [annotationId, annotation] of this.annotations.entries()) {
      const timeSinceUpdate = now.getTime() - annotation.updatedAt.getTime();
      
      if (timeSinceUpdate > oldThreshold && annotation.status === 'deleted') {
        this.annotations.delete(annotationId);
        this.logger.debug(`Cleaned up old annotation ${annotationId}`);
      }
    }
  }
}
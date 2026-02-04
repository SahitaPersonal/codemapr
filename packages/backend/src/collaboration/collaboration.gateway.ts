import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Logger, UseGuards } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { CollaborationService } from './collaboration.service';
import { OperationalTransformService, Operation } from './operational-transform.service';
import { AuthGuard } from './guards/auth.guard';

export interface UserPresence {
  userId: string;
  username: string;
  avatar?: string;
  cursor?: {
    x: number;
    y: number;
    file?: string;
  };
  selection?: {
    start: { line: number; column: number };
    end: { line: number; column: number };
    file: string;
  };
  status: 'active' | 'idle' | 'away';
  lastActivity: Date;
}

export interface CollaborationMessage {
  type: 'cursor' | 'selection' | 'annotation' | 'comment' | 'presence';
  userId: string;
  sessionId: string;
  data: any;
  timestamp: Date;
}

@WebSocketGateway({
  cors: {
    origin: ['http://localhost:3000', 'http://localhost:3001', 'http://localhost:3002', 'http://localhost:3003'],
    credentials: true,
  },
  namespace: '/collaboration',
})
@UseGuards(AuthGuard)
export class CollaborationGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(CollaborationGateway.name);
  private readonly connectedUsers = new Map<string, UserPresence>();
  private readonly userSockets = new Map<string, Socket>();
  private readonly sessionUsers = new Map<string, Set<string>>();

  constructor(
    private readonly collaborationService: CollaborationService,
    private readonly operationalTransformService: OperationalTransformService,
  ) {}

  afterInit(server: Server) {
    this.logger.log('WebSocket Gateway initialized');
    
    // Set up heartbeat to detect disconnected clients
    setInterval(() => {
      this.checkHeartbeat();
    }, 30000); // Check every 30 seconds
  }

  async handleConnection(client: Socket) {
    try {
      const userId = client.handshake.auth?.userId;
      const sessionId = client.handshake.auth?.sessionId;
      const username = client.handshake.auth?.username;

      if (!userId || !sessionId || !username) {
        this.logger.warn('Client connection rejected: missing auth data');
        client.disconnect();
        return;
      }

      this.logger.log(`User ${username} (${userId}) connected to session ${sessionId}`);

      // Store user connection
      this.userSockets.set(userId, client);
      
      // Add user to session
      if (!this.sessionUsers.has(sessionId)) {
        this.sessionUsers.set(sessionId, new Set());
      }
      this.sessionUsers.get(sessionId)!.add(userId);

      // Create user presence
      const userPresence: UserPresence = {
        userId,
        username,
        avatar: client.handshake.auth?.avatar,
        status: 'active',
        lastActivity: new Date(),
      };

      this.connectedUsers.set(userId, userPresence);

      // Join session room
      client.join(sessionId);

      // Notify other users in session about new user
      client.to(sessionId).emit('user-joined', {
        user: userPresence,
        timestamp: new Date(),
      });

      // Send current session state to new user
      const sessionUsers = this.getSessionUsers(sessionId);
      client.emit('session-state', {
        users: sessionUsers,
        timestamp: new Date(),
      });

      // Store connection in collaboration service
      await this.collaborationService.handleUserConnect(userId, sessionId, userPresence);

    } catch (error) {
      this.logger.error('Error handling connection:', error);
      client.disconnect();
    }
  }

  async handleDisconnect(client: Socket) {
    try {
      const userId = client.handshake.auth?.userId;
      const sessionId = client.handshake.auth?.sessionId;

      if (!userId || !sessionId) return;

      this.logger.log(`User ${userId} disconnected from session ${sessionId}`);

      // Remove user from maps
      this.connectedUsers.delete(userId);
      this.userSockets.delete(userId);

      // Remove from session
      const sessionUserSet = this.sessionUsers.get(sessionId);
      if (sessionUserSet) {
        sessionUserSet.delete(userId);
        if (sessionUserSet.size === 0) {
          this.sessionUsers.delete(sessionId);
        }
      }

      // Notify other users in session
      client.to(sessionId).emit('user-left', {
        userId,
        timestamp: new Date(),
      });

      // Store disconnection in collaboration service
      await this.collaborationService.handleUserDisconnect(userId, sessionId);

    } catch (error) {
      this.logger.error('Error handling disconnect:', error);
    }
  }

  @SubscribeMessage('cursor-move')
  handleCursorMove(
    @MessageBody() data: { x: number; y: number; file?: string },
    @ConnectedSocket() client: Socket,
  ) {
    const userId = client.handshake.auth?.userId;
    const sessionId = client.handshake.auth?.sessionId;

    if (!userId || !sessionId) return;

    // Update user presence
    const userPresence = this.connectedUsers.get(userId);
    if (userPresence) {
      userPresence.cursor = data;
      userPresence.lastActivity = new Date();
      userPresence.status = 'active';
    }

    // Broadcast to other users in session
    client.to(sessionId).emit('cursor-update', {
      userId,
      cursor: data,
      timestamp: new Date(),
    });
  }

  @SubscribeMessage('selection-change')
  handleSelectionChange(
    @MessageBody() data: {
      start: { line: number; column: number };
      end: { line: number; column: number };
      file: string;
    },
    @ConnectedSocket() client: Socket,
  ) {
    const userId = client.handshake.auth?.userId;
    const sessionId = client.handshake.auth?.sessionId;

    if (!userId || !sessionId) return;

    // Update user presence
    const userPresence = this.connectedUsers.get(userId);
    if (userPresence) {
      userPresence.selection = data;
      userPresence.lastActivity = new Date();
      userPresence.status = 'active';
    }

    // Broadcast to other users in session
    client.to(sessionId).emit('selection-update', {
      userId,
      selection: data,
      timestamp: new Date(),
    });
  }

  @SubscribeMessage('add-annotation')
  async handleAddAnnotation(
    @MessageBody() data: {
      file: string;
      line: number;
      column: number;
      content: string;
      type: 'comment' | 'suggestion' | 'issue';
    },
    @ConnectedSocket() client: Socket,
  ) {
    const userId = client.handshake.auth?.userId;
    const sessionId = client.handshake.auth?.sessionId;

    if (!userId || !sessionId) return;

    try {
      // Store annotation in database
      const annotation = await this.collaborationService.createAnnotation({
        ...data,
        userId,
        sessionId,
      });

      // Broadcast to all users in session
      this.server.to(sessionId).emit('annotation-added', {
        annotation,
        timestamp: new Date(),
      });

      return { success: true, annotation };
    } catch (error) {
      this.logger.error('Error adding annotation:', error);
      return { success: false, error: error.message };
    }
  }

  @SubscribeMessage('update-annotation')
  async handleUpdateAnnotation(
    @MessageBody() data: {
      annotationId: string;
      content: string;
    },
    @ConnectedSocket() client: Socket,
  ) {
    const userId = client.handshake.auth?.userId;
    const sessionId = client.handshake.auth?.sessionId;

    if (!userId || !sessionId) return;

    try {
      const annotation = await this.collaborationService.updateAnnotation(
        data.annotationId,
        data.content,
        userId,
      );

      // Broadcast to all users in session
      this.server.to(sessionId).emit('annotation-updated', {
        annotation,
        timestamp: new Date(),
      });

      return { success: true, annotation };
    } catch (error) {
      this.logger.error('Error updating annotation:', error);
      return { success: false, error: error.message };
    }
  }

  @SubscribeMessage('delete-annotation')
  async handleDeleteAnnotation(
    @MessageBody() data: { annotationId: string },
    @ConnectedSocket() client: Socket,
  ) {
    const userId = client.handshake.auth?.userId;
    const sessionId = client.handshake.auth?.sessionId;

    if (!userId || !sessionId) return;

    try {
      await this.collaborationService.deleteAnnotation(data.annotationId, userId);

      // Broadcast to all users in session
      this.server.to(sessionId).emit('annotation-deleted', {
        annotationId: data.annotationId,
        timestamp: new Date(),
      });

      return { success: true };
    } catch (error) {
      this.logger.error('Error deleting annotation:', error);
      return { success: false, error: error.message };
    }
  }

  @SubscribeMessage('heartbeat')
  handleHeartbeat(@ConnectedSocket() client: Socket) {
    const userId = client.handshake.auth?.userId;
    
    if (userId) {
      const userPresence = this.connectedUsers.get(userId);
      if (userPresence) {
        userPresence.lastActivity = new Date();
        if (userPresence.status === 'away') {
          userPresence.status = 'active';
          
          // Notify session about status change
          const sessionId = client.handshake.auth?.sessionId;
          if (sessionId) {
            client.to(sessionId).emit('user-status-change', {
              userId,
              status: 'active',
              timestamp: new Date(),
            });
          }
        }
      }
    }

    return { timestamp: new Date() };
  }

  @SubscribeMessage('get-session-users')
  handleGetSessionUsers(@ConnectedSocket() client: Socket) {
    const sessionId = client.handshake.auth?.sessionId;
    
    if (!sessionId) return { users: [] };

    const sessionUsers = this.getSessionUsers(sessionId);
    return { users: sessionUsers };
  }

  @SubscribeMessage('document-operation')
  async handleDocumentOperation(
    @MessageBody() data: {
      operation: Omit<Operation, 'id' | 'userId' | 'timestamp' | 'sessionId'>;
      documentId: string;
    },
    @ConnectedSocket() client: Socket,
  ) {
    const userId = client.handshake.auth?.userId;
    const sessionId = client.handshake.auth?.sessionId;

    if (!userId || !sessionId) return { success: false, error: 'Not authenticated' };

    try {
      // Create full operation object
      const operation: Operation = {
        ...data.operation,
        id: this.generateOperationId(),
        userId,
        sessionId,
        timestamp: new Date(),
      };

      // Apply operational transformation
      const documentState = this.operationalTransformService.applyOperation(sessionId, operation);

      // Broadcast transformed operation to all other users in session
      client.to(sessionId).emit('document-operation-applied', {
        operation,
        documentState: {
          content: documentState.content,
          version: documentState.version,
        },
        documentId: data.documentId,
        timestamp: new Date(),
      });

      // Send confirmation to sender
      return {
        success: true,
        documentState: {
          content: documentState.content,
          version: documentState.version,
        },
        operation,
      };
    } catch (error) {
      this.logger.error('Error handling document operation:', error);
      return { success: false, error: error.message };
    }
  }

  @SubscribeMessage('document-sync-request')
  async handleDocumentSyncRequest(
    @MessageBody() data: { documentId: string; clientVersion?: number },
    @ConnectedSocket() client: Socket,
  ) {
    const sessionId = client.handshake.auth?.sessionId;

    if (!sessionId) return { success: false, error: 'Not authenticated' };

    try {
      const documentState = this.operationalTransformService.getDocumentState(sessionId);
      
      if (!documentState) {
        // Initialize document if it doesn't exist
        const newDocState = this.operationalTransformService.initializeDocument(sessionId);
        return {
          success: true,
          documentState: {
            content: newDocState.content,
            version: newDocState.version,
          },
          documentId: data.documentId,
        };
      }

      // If client version is provided, send only operations since that version
      const clientVersion = data.clientVersion || 0;
      const missedOperations = documentState.operations.slice(clientVersion);

      return {
        success: true,
        documentState: {
          content: documentState.content,
          version: documentState.version,
        },
        missedOperations,
        documentId: data.documentId,
      };
    } catch (error) {
      this.logger.error('Error handling document sync request:', error);
      return { success: false, error: error.message };
    }
  }

  @SubscribeMessage('batch-operations')
  async handleBatchOperations(
    @MessageBody() data: {
      operations: Omit<Operation, 'id' | 'userId' | 'timestamp' | 'sessionId'>[];
      documentId: string;
    },
    @ConnectedSocket() client: Socket,
  ) {
    const userId = client.handshake.auth?.userId;
    const sessionId = client.handshake.auth?.sessionId;

    if (!userId || !sessionId) return { success: false, error: 'Not authenticated' };

    try {
      // Create full operation objects
      const operations: Operation[] = data.operations.map(op => ({
        ...op,
        id: this.generateOperationId(),
        userId,
        sessionId,
        timestamp: new Date(),
      }));

      // Transform batch of operations
      const transformedOps = this.operationalTransformService.transformBatch(operations);

      // Apply each transformed operation
      let finalDocumentState;
      for (const op of transformedOps) {
        finalDocumentState = this.operationalTransformService.applyOperation(sessionId, op);
      }

      // Broadcast all operations to other users
      client.to(sessionId).emit('batch-operations-applied', {
        operations: transformedOps,
        documentState: finalDocumentState ? {
          content: finalDocumentState.content,
          version: finalDocumentState.version,
        } : null,
        documentId: data.documentId,
        timestamp: new Date(),
      });

      return {
        success: true,
        documentState: finalDocumentState ? {
          content: finalDocumentState.content,
          version: finalDocumentState.version,
        } : null,
        operations: transformedOps,
      };
    } catch (error) {
      this.logger.error('Error handling batch operations:', error);
      return { success: false, error: error.message };
    }
  }

  @SubscribeMessage('live-cursor-update')
  handleLiveCursorUpdate(
    @MessageBody() data: {
      documentId: string;
      cursor: {
        position: number;
        selection?: { start: number; end: number };
        color?: string;
      };
    },
    @ConnectedSocket() client: Socket,
  ) {
    const userId = client.handshake.auth?.userId;
    const sessionId = client.handshake.auth?.sessionId;
    const username = client.handshake.auth?.username;

    if (!userId || !sessionId) return;

    // Update user presence with cursor info
    const userPresence = this.connectedUsers.get(userId);
    if (userPresence) {
      userPresence.lastActivity = new Date();
      userPresence.status = 'active';
    }

    // Broadcast cursor update to other users in session
    client.to(sessionId).emit('live-cursor-updated', {
      userId,
      username,
      documentId: data.documentId,
      cursor: data.cursor,
      timestamp: new Date(),
    });
  }

  @SubscribeMessage('live-selection-update')
  handleLiveSelectionUpdate(
    @MessageBody() data: {
      documentId: string;
      selection: { start: number; end: number };
      color?: string;
    },
    @ConnectedSocket() client: Socket,
  ) {
    const userId = client.handshake.auth?.userId;
    const sessionId = client.handshake.auth?.sessionId;
    const username = client.handshake.auth?.username;

    if (!userId || !sessionId) return;

    // Update user presence
    const userPresence = this.connectedUsers.get(userId);
    if (userPresence) {
      userPresence.lastActivity = new Date();
      userPresence.status = 'active';
    }

    // Broadcast selection update to other users in session
    client.to(sessionId).emit('live-selection-updated', {
      userId,
      username,
      documentId: data.documentId,
      selection: data.selection,
      timestamp: new Date(),
    });
  }

  private getSessionUsers(sessionId: string): UserPresence[] {
    const userIds = this.sessionUsers.get(sessionId) || new Set();
    const users: UserPresence[] = [];

    for (const userId of userIds) {
      const userPresence = this.connectedUsers.get(userId);
      if (userPresence) {
        users.push(userPresence);
      }
    }

    return users;
  }

  private checkHeartbeat() {
    const now = new Date();
    const idleThreshold = 5 * 60 * 1000; // 5 minutes
    const awayThreshold = 15 * 60 * 1000; // 15 minutes

    for (const [userId, userPresence] of this.connectedUsers.entries()) {
      const timeSinceActivity = now.getTime() - userPresence.lastActivity.getTime();
      
      let newStatus = userPresence.status;
      if (timeSinceActivity > awayThreshold) {
        newStatus = 'away';
      } else if (timeSinceActivity > idleThreshold) {
        newStatus = 'idle';
      }

      if (newStatus !== userPresence.status) {
        userPresence.status = newStatus;
        
        // Find user's session and notify
        for (const [sessionId, userIds] of this.sessionUsers.entries()) {
          if (userIds.has(userId)) {
            this.server.to(sessionId).emit('user-status-change', {
              userId,
              status: newStatus,
              timestamp: now,
            });
            break;
          }
        }
      }
    }
  }

  // Method to send message to specific user
  sendToUser(userId: string, event: string, data: any) {
    const socket = this.userSockets.get(userId);
    if (socket) {
      socket.emit(event, data);
    }
  }

  // Method to send message to all users in session
  sendToSession(sessionId: string, event: string, data: any) {
    this.server.to(sessionId).emit(event, data);
  }

  // Get connected users count
  getConnectedUsersCount(): number {
    return this.connectedUsers.size;
  }

  // Get session users count
  getSessionUsersCount(sessionId: string): number {
    return this.sessionUsers.get(sessionId)?.size || 0;
  }

  // Generate unique operation ID
  private generateOperationId(): string {
    return `op_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}
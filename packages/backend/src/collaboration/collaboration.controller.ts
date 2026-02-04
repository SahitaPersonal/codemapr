import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
  ApiBody,
} from '@nestjs/swagger';
import { IsString, IsOptional, IsBoolean, IsNumber } from 'class-validator';
import { CollaborationService, CollaborationSession, Annotation } from './collaboration.service';
import { OperationalTransformService } from './operational-transform.service';

export class CreateSessionDto {
  @IsString()
  name!: string;
  
  @IsString()
  projectId!: string;
  
  @IsString()
  createdBy!: string;
  
  @IsOptional()
  settings?: Partial<{
    allowAnonymous: boolean;
    maxParticipants: number;
    autoSave: boolean;
    conflictResolution: 'last-write-wins' | 'operational-transform';
  }>;
}

export class UpdateSessionDto {
  @IsOptional()
  @IsString()
  name?: string;
  
  @IsOptional()
  settings?: Partial<{
    allowAnonymous: boolean;
    maxParticipants: number;
    autoSave: boolean;
    conflictResolution: 'last-write-wins' | 'operational-transform';
  }>;
}

export class CreateAnnotationDto {
  @IsString()
  file!: string;
  
  @IsNumber()
  line!: number;
  
  @IsNumber()
  column!: number;
  
  @IsString()
  content!: string;
  
  @IsString()
  type!: 'comment' | 'suggestion' | 'issue';
}

@ApiTags('Collaboration')
@Controller('collaboration')
export class CollaborationController {
  private readonly logger = new Logger(CollaborationController.name);

  constructor(
    private readonly collaborationService: CollaborationService,
    private readonly operationalTransformService: OperationalTransformService,
  ) {}

  @Post('sessions')
  @ApiOperation({
    summary: 'Create a new collaboration session',
    description: 'Creates a new collaboration session for real-time code collaboration',
  })
  @ApiBody({ type: CreateSessionDto })
  @ApiResponse({
    status: 201,
    description: 'Collaboration session created successfully',
    schema: {
      type: 'object',
      properties: {
        id: { type: 'string' },
        name: { type: 'string' },
        projectId: { type: 'string' },
        createdBy: { type: 'string' },
        createdAt: { type: 'string' },
        isActive: { type: 'boolean' },
        participants: { type: 'array' },
        settings: { type: 'object' },
      },
    },
  })
  async createSession(@Body() dto: CreateSessionDto): Promise<CollaborationSession> {
    try {
      this.logger.log(`Creating collaboration session: ${dto.name}`);
      return await this.collaborationService.createSession(dto);
    } catch (error) {
      this.logger.error(`Failed to create session: ${error.message}`);
      throw new HttpException(
        'Failed to create collaboration session',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('sessions/:sessionId')
  @ApiOperation({
    summary: 'Get collaboration session details',
    description: 'Retrieves details of a specific collaboration session',
  })
  @ApiParam({ name: 'sessionId', description: 'Session ID' })
  @ApiResponse({
    status: 200,
    description: 'Session details retrieved successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Session not found',
  })
  async getSession(@Param('sessionId') sessionId: string): Promise<CollaborationSession> {
    try {
      return await this.collaborationService.getSession(sessionId);
    } catch (error) {
      if (error.message.includes('not found')) {
        throw new HttpException('Session not found', HttpStatus.NOT_FOUND);
      }
      throw new HttpException(
        'Failed to retrieve session',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Put('sessions/:sessionId')
  @ApiOperation({
    summary: 'Update collaboration session',
    description: 'Updates settings and details of a collaboration session',
  })
  @ApiParam({ name: 'sessionId', description: 'Session ID' })
  @ApiBody({ type: UpdateSessionDto })
  @ApiResponse({
    status: 200,
    description: 'Session updated successfully',
  })
  async updateSession(
    @Param('sessionId') sessionId: string,
    @Body() dto: UpdateSessionDto,
    @Query('userId') userId: string,
  ): Promise<CollaborationSession> {
    try {
      if (!userId) {
        throw new HttpException('User ID is required', HttpStatus.BAD_REQUEST);
      }

      return await this.collaborationService.updateSession(sessionId, dto, userId);
    } catch (error) {
      if (error.message.includes('not found')) {
        throw new HttpException('Session not found', HttpStatus.NOT_FOUND);
      }
      if (error.message.includes('Insufficient permissions')) {
        throw new HttpException('Insufficient permissions', HttpStatus.FORBIDDEN);
      }
      throw new HttpException(
        'Failed to update session',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Delete('sessions/:sessionId')
  @ApiOperation({
    summary: 'Delete collaboration session',
    description: 'Deletes a collaboration session (only by owner)',
  })
  @ApiParam({ name: 'sessionId', description: 'Session ID' })
  @ApiQuery({ name: 'userId', description: 'User ID of the requester' })
  @ApiResponse({
    status: 200,
    description: 'Session deleted successfully',
  })
  async deleteSession(
    @Param('sessionId') sessionId: string,
    @Query('userId') userId: string,
  ): Promise<{ message: string }> {
    try {
      if (!userId) {
        throw new HttpException('User ID is required', HttpStatus.BAD_REQUEST);
      }

      await this.collaborationService.deleteSession(sessionId, userId);
      return { message: 'Session deleted successfully' };
    } catch (error) {
      if (error.message.includes('not found')) {
        throw new HttpException('Session not found', HttpStatus.NOT_FOUND);
      }
      if (error.message.includes('Only session owner')) {
        throw new HttpException('Only session owner can delete', HttpStatus.FORBIDDEN);
      }
      throw new HttpException(
        'Failed to delete session',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
  @Get('sessions/:sessionId/annotations')
  @ApiOperation({
    summary: 'Get session annotations',
    description: 'Retrieves all annotations for a collaboration session',
  })
  @ApiParam({ name: 'sessionId', description: 'Session ID' })
  @ApiResponse({
    status: 200,
    description: 'Annotations retrieved successfully',
    schema: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          userId: { type: 'string' },
          username: { type: 'string' },
          file: { type: 'string' },
          line: { type: 'number' },
          column: { type: 'number' },
          content: { type: 'string' },
          type: { type: 'string' },
          createdAt: { type: 'string' },
          replies: { type: 'array' },
        },
      },
    },
  })
  async getSessionAnnotations(@Param('sessionId') sessionId: string): Promise<Annotation[]> {
    try {
      return await this.collaborationService.getSessionAnnotations(sessionId);
    } catch (error) {
      this.logger.error(`Failed to get annotations: ${error.message}`);
      throw new HttpException(
        'Failed to retrieve annotations',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post('sessions/:sessionId/annotations/:annotationId/replies')
  @ApiOperation({
    summary: 'Add reply to annotation',
    description: 'Adds a reply to an existing annotation',
  })
  @ApiParam({ name: 'sessionId', description: 'Session ID' })
  @ApiParam({ name: 'annotationId', description: 'Annotation ID' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        userId: { type: 'string' },
        content: { type: 'string' },
      },
      required: ['userId', 'content'],
    },
  })
  @ApiResponse({
    status: 201,
    description: 'Reply added successfully',
  })
  async addAnnotationReply(
    @Param('sessionId') sessionId: string,
    @Param('annotationId') annotationId: string,
    @Body() body: { userId: string; content: string },
  ) {
    try {
      const reply = await this.collaborationService.addAnnotationReply(
        annotationId,
        body.userId,
        body.content,
      );

      return { success: true, reply };
    } catch (error) {
      if (error.message.includes('not found')) {
        throw new HttpException('Annotation not found', HttpStatus.NOT_FOUND);
      }
      if (error.message.includes('not part of session')) {
        throw new HttpException('User not part of session', HttpStatus.FORBIDDEN);
      }
      throw new HttpException(
        'Failed to add reply',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('sessions/:sessionId/activity')
  @ApiOperation({
    summary: 'Get session activity log',
    description: 'Retrieves activity log for a collaboration session',
  })
  @ApiParam({ name: 'sessionId', description: 'Session ID' })
  @ApiQuery({ name: 'limit', required: false, description: 'Number of activities to return' })
  @ApiResponse({
    status: 200,
    description: 'Activity log retrieved successfully',
  })
  async getActivityLog(
    @Param('sessionId') sessionId: string,
    @Query('limit') limit?: string,
  ) {
    try {
      const limitNum = limit ? parseInt(limit, 10) : 50;
      const activities = await this.collaborationService.getActivityLog(sessionId, limitNum);
      
      return { activities };
    } catch (error) {
      this.logger.error(`Failed to get activity log: ${error.message}`);
      throw new HttpException(
        'Failed to retrieve activity log',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('users/:userId/sessions')
  @ApiOperation({
    summary: 'Get user sessions',
    description: 'Retrieves all collaboration sessions for a user',
  })
  @ApiParam({ name: 'userId', description: 'User ID' })
  @ApiResponse({
    status: 200,
    description: 'User sessions retrieved successfully',
  })
  async getUserSessions(@Param('userId') userId: string): Promise<CollaborationSession[]> {
    try {
      return await this.collaborationService.getUserSessions(userId);
    } catch (error) {
      this.logger.error(`Failed to get user sessions: ${error.message}`);
      throw new HttpException(
        'Failed to retrieve user sessions',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('sessions/:sessionId/stats')
  @ApiOperation({
    summary: 'Get session statistics',
    description: 'Retrieves statistics for a collaboration session',
  })
  @ApiParam({ name: 'sessionId', description: 'Session ID' })
  @ApiResponse({
    status: 200,
    description: 'Session statistics retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        totalParticipants: { type: 'number' },
        activeParticipants: { type: 'number' },
        totalAnnotations: { type: 'number' },
        totalActivity: { type: 'number' },
      },
    },
  })
  async getSessionStats(@Param('sessionId') sessionId: string) {
    try {
      const stats = await this.collaborationService.getSessionStats(sessionId);
      return stats;
    } catch (error) {
      if (error.message.includes('not found')) {
        throw new HttpException('Session not found', HttpStatus.NOT_FOUND);
      }
      throw new HttpException(
        'Failed to retrieve session statistics',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post('cleanup')
  @ApiOperation({
    summary: 'Cleanup inactive sessions and old data',
    description: 'Performs cleanup of inactive sessions and old annotations',
  })
  @ApiResponse({
    status: 200,
    description: 'Cleanup completed successfully',
  })
  async performCleanup(): Promise<{ message: string }> {
    try {
      await this.collaborationService.cleanupInactiveSessions();
      await this.collaborationService.cleanupOldAnnotations();
      this.operationalTransformService.cleanup();
      
      return { message: 'Cleanup completed successfully' };
    } catch (error) {
      this.logger.error(`Cleanup failed: ${error.message}`);
      throw new HttpException(
        'Cleanup operation failed',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('sessions/:sessionId/document/:documentId')
  @ApiOperation({
    summary: 'Get document state',
    description: 'Retrieves the current state of a document in a collaboration session',
  })
  @ApiParam({ name: 'sessionId', description: 'Session ID' })
  @ApiParam({ name: 'documentId', description: 'Document ID' })
  @ApiResponse({
    status: 200,
    description: 'Document state retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        content: { type: 'string' },
        version: { type: 'number' },
        lastModified: { type: 'string' },
      },
    },
  })
  async getDocumentState(
    @Param('sessionId') sessionId: string,
    @Param('documentId') documentId: string,
  ) {
    try {
      const documentState = this.operationalTransformService.getDocumentState(sessionId);
      
      if (!documentState) {
        // Initialize document if it doesn't exist
        const newDocState = this.operationalTransformService.initializeDocument(sessionId);
        return {
          content: newDocState.content,
          version: newDocState.version,
          lastModified: new Date().toISOString(),
        };
      }

      const lastOperation = documentState.operations[documentState.operations.length - 1];
      
      return {
        content: documentState.content,
        version: documentState.version,
        lastModified: lastOperation?.timestamp.toISOString() || new Date().toISOString(),
      };
    } catch (error) {
      this.logger.error(`Failed to get document state: ${error.message}`);
      throw new HttpException(
        'Failed to retrieve document state',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post('sessions/:sessionId/document/:documentId/initialize')
  @ApiOperation({
    summary: 'Initialize document',
    description: 'Initializes a new document in a collaboration session',
  })
  @ApiParam({ name: 'sessionId', description: 'Session ID' })
  @ApiParam({ name: 'documentId', description: 'Document ID' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        content: { type: 'string', description: 'Initial document content' },
      },
    },
  })
  @ApiResponse({
    status: 201,
    description: 'Document initialized successfully',
  })
  async initializeDocument(
    @Param('sessionId') sessionId: string,
    @Param('documentId') documentId: string,
    @Body() body: { content?: string },
  ) {
    try {
      const documentState = this.operationalTransformService.initializeDocument(
        sessionId,
        body.content || '',
      );

      return {
        success: true,
        documentState: {
          content: documentState.content,
          version: documentState.version,
        },
        message: 'Document initialized successfully',
      };
    } catch (error) {
      this.logger.error(`Failed to initialize document: ${error.message}`);
      throw new HttpException(
        'Failed to initialize document',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('operational-transform/stats')
  @ApiOperation({
    summary: 'Get operational transform statistics',
    description: 'Retrieves statistics about operational transform usage',
  })
  @ApiResponse({
    status: 200,
    description: 'Statistics retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        totalSessions: { type: 'number' },
        totalOperations: { type: 'number' },
        averageOperationsPerSession: { type: 'number' },
      },
    },
  })
  async getOperationalTransformStats() {
    try {
      const stats = this.operationalTransformService.getStats();
      return stats;
    } catch (error) {
      this.logger.error(`Failed to get OT stats: ${error.message}`);
      throw new HttpException(
        'Failed to retrieve statistics',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
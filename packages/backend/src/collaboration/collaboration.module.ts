import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CollaborationGateway } from './collaboration.gateway';
import { CollaborationService } from './collaboration.service';
import { CollaborationPersistentService } from './collaboration-persistent.service';
import { NotificationService } from './notification.service';
import { CollaborationController } from './collaboration.controller';
import { OperationalTransformService } from './operational-transform.service';
import { AuthGuard, SessionPermissionGuard, RateLimitGuard } from './guards/auth.guard';
import {
  CollaborationSession,
  SessionParticipant,
  Annotation,
  AnnotationReply,
  ActivityLog,
  Notification,
} from './entities';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      CollaborationSession,
      SessionParticipant,
      Annotation,
      AnnotationReply,
      ActivityLog,
      Notification,
    ]),
  ],
  controllers: [CollaborationController],
  providers: [
    CollaborationGateway,
    CollaborationService,
    CollaborationPersistentService,
    NotificationService,
    OperationalTransformService,
    AuthGuard,
    SessionPermissionGuard,
    RateLimitGuard,
  ],
  exports: [
    CollaborationService,
    CollaborationPersistentService,
    NotificationService,
    CollaborationGateway,
    OperationalTransformService,
  ],
})
export class CollaborationModule {}
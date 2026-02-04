import { Module } from '@nestjs/common';
import { CollaborationGateway } from './collaboration.gateway';
import { CollaborationService } from './collaboration.service';
import { CollaborationController } from './collaboration.controller';
import { OperationalTransformService } from './operational-transform.service';
import { AuthGuard, SessionPermissionGuard, RateLimitGuard } from './guards/auth.guard';

@Module({
  controllers: [CollaborationController],
  providers: [
    CollaborationGateway,
    CollaborationService,
    OperationalTransformService,
    AuthGuard,
    SessionPermissionGuard,
    RateLimitGuard,
  ],
  exports: [CollaborationService, CollaborationGateway, OperationalTransformService],
})
export class CollaborationModule {}
import { Module, Global } from '@nestjs/common';
import { ErrorHandlerService } from './error-handler.service';
import { ErrorHandlerController } from './error-handler.controller';
import { CircuitBreakerService } from './circuit-breaker.service';
import { GracefulDegradationService } from './graceful-degradation.service';

@Global()
@Module({
  controllers: [ErrorHandlerController],
  providers: [
    ErrorHandlerService,
    CircuitBreakerService,
    GracefulDegradationService,
  ],
  exports: [
    ErrorHandlerService,
    CircuitBreakerService,
    GracefulDegradationService,
  ],
})
export class ErrorHandlingModule {}
import { Injectable, CanActivate, ExecutionContext, Logger } from '@nestjs/common';
import { Socket } from 'socket.io';

@Injectable()
export class AuthGuard implements CanActivate {
  private readonly logger = new Logger(AuthGuard.name);

  canActivate(context: ExecutionContext): boolean {
    const client: Socket = context.switchToWs().getClient();
    
    try {
      // Extract auth data from handshake
      const { userId, sessionId, username, token } = client.handshake.auth || {};

      // Basic validation
      if (!userId || !sessionId || !username) {
        this.logger.warn('WebSocket connection rejected: missing required auth fields');
        return false;
      }

      // In a real application, you would:
      // 1. Validate the JWT token
      // 2. Check user permissions for the session
      // 3. Verify session exists and is active
      // 4. Check rate limiting

      // For demo purposes, we'll do basic validation
      if (typeof userId !== 'string' || userId.length < 1) {
        this.logger.warn('WebSocket connection rejected: invalid userId');
        return false;
      }

      if (typeof sessionId !== 'string' || sessionId.length < 1) {
        this.logger.warn('WebSocket connection rejected: invalid sessionId');
        return false;
      }

      if (typeof username !== 'string' || username.length < 1) {
        this.logger.warn('WebSocket connection rejected: invalid username');
        return false;
      }

      // Optional token validation (in production, validate JWT)
      if (token && typeof token !== 'string') {
        this.logger.warn('WebSocket connection rejected: invalid token format');
        return false;
      }

      // Store validated auth data for use in handlers
      client.data = {
        userId,
        sessionId,
        username,
        token,
        authenticatedAt: new Date(),
      };

      this.logger.debug(`WebSocket connection authenticated for user ${username} (${userId})`);
      return true;

    } catch (error) {
      this.logger.error('WebSocket authentication error:', error);
      return false;
    }
  }
}

// Additional guard for specific operations
@Injectable()
export class SessionPermissionGuard implements CanActivate {
  private readonly logger = new Logger(SessionPermissionGuard.name);

  canActivate(context: ExecutionContext): boolean {
    const client: Socket = context.switchToWs().getClient();
    
    try {
      const { userId, sessionId } = client.data || {};
      
      if (!userId || !sessionId) {
        this.logger.warn('Session permission check failed: missing auth data');
        return false;
      }

      // In a real application, check user permissions for the session
      // For now, allow all authenticated users
      return true;

    } catch (error) {
      this.logger.error('Session permission check error:', error);
      return false;
    }
  }
}

// Rate limiting guard for WebSocket events
@Injectable()
export class RateLimitGuard implements CanActivate {
  private readonly logger = new Logger(RateLimitGuard.name);
  private readonly userRateLimits = new Map<string, { count: number; resetTime: number }>();
  private readonly maxRequestsPerMinute = 100;

  canActivate(context: ExecutionContext): boolean {
    const client: Socket = context.switchToWs().getClient();
    
    try {
      const { userId } = client.data || {};
      
      if (!userId) {
        return false;
      }

      const now = Date.now();
      const windowStart = now - 60000; // 1 minute window

      // Get or create rate limit entry
      let rateLimitEntry = this.userRateLimits.get(userId);
      
      if (!rateLimitEntry || rateLimitEntry.resetTime < now) {
        // Reset or create new rate limit window
        rateLimitEntry = {
          count: 0,
          resetTime: now + 60000,
        };
      }

      // Check if user has exceeded rate limit
      if (rateLimitEntry.count >= this.maxRequestsPerMinute) {
        this.logger.warn(`Rate limit exceeded for user ${userId}`);
        client.emit('rate-limit-exceeded', {
          message: 'Too many requests. Please slow down.',
          resetTime: rateLimitEntry.resetTime,
        });
        return false;
      }

      // Increment counter
      rateLimitEntry.count++;
      this.userRateLimits.set(userId, rateLimitEntry);

      // Cleanup old entries periodically
      if (Math.random() < 0.01) { // 1% chance
        this.cleanupOldEntries();
      }

      return true;

    } catch (error) {
      this.logger.error('Rate limit check error:', error);
      return false;
    }
  }

  private cleanupOldEntries(): void {
    const now = Date.now();
    
    for (const [userId, entry] of this.userRateLimits.entries()) {
      if (entry.resetTime < now) {
        this.userRateLimits.delete(userId);
      }
    }
  }
}
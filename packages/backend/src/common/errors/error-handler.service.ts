import { Injectable, Logger, HttpException, HttpStatus } from '@nestjs/common';
import { randomUUID } from 'crypto';

export interface ErrorContext {
  userId?: string;
  requestId?: string;
  operation?: string;
  metadata?: Record<string, any>;
  timestamp: Date;
}

export interface ErrorReport {
  id: string;
  type: string;
  message: string;
  stack?: string;
  context: ErrorContext;
  severity: 'low' | 'medium' | 'high' | 'critical';
  recoverable: boolean;
  retryCount?: number;
  resolution?: string;
}

export interface RetryConfig {
  maxAttempts: number;
  baseDelay: number;
  maxDelay: number;
  backoffMultiplier: number;
  retryableErrors: string[];
}

@Injectable()
export class ErrorHandlerService {
  private readonly logger = new Logger(ErrorHandlerService.name);
  private readonly errorReports = new Map<string, ErrorReport>();
  private readonly retryAttempts = new Map<string, number>();

  private readonly defaultRetryConfig: RetryConfig = {
    maxAttempts: 3,
    baseDelay: 1000,
    maxDelay: 30000,
    backoffMultiplier: 2,
    retryableErrors: [
      'ECONNRESET',
      'ETIMEDOUT',
      'ENOTFOUND',
      'ECONNREFUSED',
      'NETWORK_ERROR',
      'TIMEOUT_ERROR',
      'RATE_LIMIT_ERROR',
      'TEMPORARY_FAILURE',
    ],
  };

  /**
   * Handle and log errors with context
   */
  async handleError(
    error: Error,
    context: Partial<ErrorContext> = {},
    retryConfig?: Partial<RetryConfig>
  ): Promise<ErrorReport> {
    const errorId = randomUUID();
    const fullContext: ErrorContext = {
      ...context,
      timestamp: new Date(),
      requestId: context.requestId || randomUUID(),
    };

    const severity = this.determineSeverity(error);
    const recoverable = this.isRecoverable(error, retryConfig);

    const errorReport: ErrorReport = {
      id: errorId,
      type: error.constructor.name,
      message: error.message,
      stack: error.stack,
      context: fullContext,
      severity,
      recoverable,
      retryCount: this.getRetryCount(fullContext.requestId!),
    };

    // Store error report
    this.errorReports.set(errorId, errorReport);

    // Log error based on severity
    this.logError(errorReport);

    // Send alerts for critical errors
    if (severity === 'critical') {
      await this.sendCriticalAlert(errorReport);
    }

    return errorReport;
  }

  /**
   * Execute operation with retry logic
   */
  async executeWithRetry<T>(
    operation: () => Promise<T>,
    context: Partial<ErrorContext> = {},
    retryConfig?: Partial<RetryConfig>
  ): Promise<T> {
    const config = { ...this.defaultRetryConfig, ...retryConfig };
    const requestId = context.requestId || randomUUID();
    let lastError: Error;

    for (let attempt = 1; attempt <= config.maxAttempts; attempt++) {
      try {
        this.setRetryCount(requestId, attempt - 1);
        
        if (attempt > 1) {
          const delay = this.calculateDelay(attempt - 1, config);
          this.logger.debug(`Retrying operation after ${delay}ms (attempt ${attempt}/${config.maxAttempts})`);
          await this.sleep(delay);
        }

        const result = await operation();
        
        // Clear retry count on success
        this.retryAttempts.delete(requestId);
        
        return result;

      } catch (error) {
        lastError = error as Error;
        
        const errorReport = await this.handleError(lastError, {
          ...context,
          requestId,
          operation: context.operation || 'unknown',
        }, config);

        // Check if error is retryable
        if (!this.isRetryableError(lastError, config) || attempt === config.maxAttempts) {
          this.logger.error(`Operation failed after ${attempt} attempts: ${lastError.message}`);
          throw lastError;
        }

        this.logger.warn(`Operation failed (attempt ${attempt}/${config.maxAttempts}): ${lastError.message}`);
      }
    }

    throw lastError!;
  }

  /**
   * Get error report by ID
   */
  getErrorReport(errorId: string): ErrorReport | null {
    return this.errorReports.get(errorId) || null;
  }

  /**
   * Get error reports with filtering
   */
  getErrorReports(filter: {
    severity?: string[];
    type?: string[];
    userId?: string;
    operation?: string;
    since?: Date;
    limit?: number;
  } = {}): ErrorReport[] {
    let reports = Array.from(this.errorReports.values());

    if (filter.severity) {
      reports = reports.filter(r => filter.severity!.includes(r.severity));
    }

    if (filter.type) {
      reports = reports.filter(r => filter.type!.includes(r.type));
    }

    if (filter.userId) {
      reports = reports.filter(r => r.context.userId === filter.userId);
    }

    if (filter.operation) {
      reports = reports.filter(r => r.context.operation === filter.operation);
    }

    if (filter.since) {
      reports = reports.filter(r => r.context.timestamp >= filter.since!);
    }

    // Sort by timestamp (newest first)
    reports.sort((a, b) => b.context.timestamp.getTime() - a.context.timestamp.getTime());

    if (filter.limit) {
      reports = reports.slice(0, filter.limit);
    }

    return reports;
  }

  /**
   * Get error statistics
   */
  getErrorStatistics(): {
    total: number;
    bySeverity: Record<string, number>;
    byType: Record<string, number>;
    recentErrors: number;
    recoveryRate: number;
  } {
    const reports = Array.from(this.errorReports.values());
    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);

    const bySeverity = reports.reduce((acc, report) => {
      acc[report.severity] = (acc[report.severity] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const byType = reports.reduce((acc, report) => {
      acc[report.type] = (acc[report.type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const recentErrors = reports.filter(r => r.context.timestamp >= oneHourAgo).length;
    const recoverableErrors = reports.filter(r => r.recoverable).length;
    const recoveryRate = reports.length > 0 ? (recoverableErrors / reports.length) * 100 : 0;

    return {
      total: reports.length,
      bySeverity,
      byType,
      recentErrors,
      recoveryRate: Math.round(recoveryRate * 100) / 100,
    };
  }

  /**
   * Clear old error reports
   */
  clearOldErrors(olderThan: Date): number {
    const reports = Array.from(this.errorReports.entries());
    let clearedCount = 0;

    for (const [id, report] of reports) {
      if (report.context.timestamp < olderThan) {
        this.errorReports.delete(id);
        clearedCount++;
      }
    }

    this.logger.log(`Cleared ${clearedCount} old error reports`);
    return clearedCount;
  }

  /**
   * Create graceful degradation response
   */
  createDegradedResponse<T>(
    fallbackData: T,
    error: Error,
    context: Partial<ErrorContext> = {}
  ): {
    data: T;
    degraded: true;
    error: string;
    errorId: string;
  } {
    const errorId = randomUUID();
    const fullContext: ErrorContext = {
      ...context,
      timestamp: new Date(),
      requestId: context.requestId || randomUUID(),
    };

    const severity = this.determineSeverity(error);
    const recoverable = this.isRecoverable(error);

    const errorReport: ErrorReport = {
      id: errorId,
      type: error.constructor.name,
      message: error.message,
      stack: error.stack,
      context: fullContext,
      severity,
      recoverable,
      retryCount: this.getRetryCount(fullContext.requestId!),
    };

    // Store error report
    this.errorReports.set(errorId, errorReport);

    // Log error
    this.logError(errorReport);
    
    this.logger.warn(`Returning degraded response due to error: ${error.message}`);
    
    return {
      data: fallbackData,
      degraded: true,
      error: error.message,
      errorId: errorReport.id,
    };
  }

  private determineSeverity(error: Error): 'low' | 'medium' | 'high' | 'critical' {
    const message = error.message.toLowerCase();
    const stack = error.stack?.toLowerCase() || '';

    // Critical errors
    if (
      message.includes('database') && message.includes('connection') ||
      message.includes('redis') && message.includes('connection') ||
      message.includes('out of memory') ||
      message.includes('segmentation fault') ||
      error instanceof Error && error.name === 'FatalError'
    ) {
      return 'critical';
    }

    // High severity errors
    if (
      message.includes('timeout') ||
      message.includes('rate limit') ||
      message.includes('authentication') ||
      message.includes('authorization') ||
      message.includes('permission denied') ||
      error instanceof HttpException && error.getStatus() >= 500
    ) {
      return 'high';
    }

    // Medium severity errors
    if (
      message.includes('validation') ||
      message.includes('not found') ||
      message.includes('bad request') ||
      error instanceof HttpException && error.getStatus() >= 400
    ) {
      return 'medium';
    }

    return 'low';
  }

  private isRecoverable(error: Error, retryConfig?: Partial<RetryConfig>): boolean {
    const config = { ...this.defaultRetryConfig, ...retryConfig };
    return this.isRetryableError(error, config);
  }

  private isRetryableError(error: Error, config: RetryConfig): boolean {
    const message = error.message.toLowerCase();
    
    return config.retryableErrors.some(retryableError => 
      message.includes(retryableError.toLowerCase()) ||
      error.name === retryableError
    );
  }

  private calculateDelay(attempt: number, config: RetryConfig): number {
    const delay = config.baseDelay * Math.pow(config.backoffMultiplier, attempt);
    return Math.min(delay, config.maxDelay);
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private getRetryCount(requestId: string): number {
    return this.retryAttempts.get(requestId) || 0;
  }

  private setRetryCount(requestId: string, count: number): void {
    this.retryAttempts.set(requestId, count);
  }

  private logError(errorReport: ErrorReport): void {
    const logMessage = `[${errorReport.severity.toUpperCase()}] ${errorReport.type}: ${errorReport.message}`;
    const logContext = {
      errorId: errorReport.id,
      requestId: errorReport.context.requestId,
      userId: errorReport.context.userId,
      operation: errorReport.context.operation,
      retryCount: errorReport.retryCount,
    };

    switch (errorReport.severity) {
      case 'critical':
        this.logger.error(logMessage, errorReport.stack, logContext);
        break;
      case 'high':
        this.logger.error(logMessage, logContext);
        break;
      case 'medium':
        this.logger.warn(logMessage, logContext);
        break;
      case 'low':
        this.logger.debug(logMessage, logContext);
        break;
    }
  }

  private async sendCriticalAlert(errorReport: ErrorReport): Promise<void> {
    // In a real implementation, this would send alerts via email, Slack, etc.
    this.logger.error(`🚨 CRITICAL ALERT: ${errorReport.message}`, {
      errorId: errorReport.id,
      context: errorReport.context,
    });
    
    // TODO: Implement actual alerting mechanism
    // - Send email to administrators
    // - Send Slack notification
    // - Create incident in monitoring system
    // - Trigger pager duty alert
  }
}
'use client';

import type { LogLevel, LogContext, PerformanceMetric } from './types';

const isDevelopment = process.env.NODE_ENV === 'development';
const CLIENT_LOG_ENDPOINT = '/api/debug/client-log';

// Sanitize sensitive data
function sanitizeData(data: Record<string, unknown>): Record<string, unknown> {
  const sensitiveFields = ['password', 'token', 'secret', 'apiKey', 'authorization', 'cookie'];
  const sanitized = { ...data };

  for (const field of sensitiveFields) {
    if (sanitized[field]) {
      sanitized[field] = '***REDACTED***';
    }
  }

  return sanitized;
}

// Send log to server
async function sendLogToServer(
  level: LogLevel,
  message: string,
  context?: string,
  data?: Record<string, unknown> | string | null,
  meta?: LogContext,
  error?: Error,
): Promise<void> {
  try {
    const logData = {
      level,
      message,
      context,
      data: data && typeof data === 'object' ? sanitizeData(data) : data,
      meta: meta ? sanitizeData(meta as Record<string, unknown>) as LogContext : undefined,
      stack: error?.stack,
      timestamp: new Date().toISOString(),
      source: 'client' as const,
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : undefined,
      url: typeof window !== 'undefined' ? window.location.href : undefined,
    };

    await fetch(CLIENT_LOG_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(logData),
    });
  } catch (err) {
    // Silently fail - don't break the app if logging fails
    if (isDevelopment) {
      console.warn('[ClientLogger] Failed to send log to server:', err);
    }
  }
}

class ClientLogger {
  private correlationId?: string;
  private sessionId?: string;

  setCorrelationId(id: string): void {
    this.correlationId = id;
  }

  getCorrelationId(): string | undefined {
    return this.correlationId;
  }

  setSessionId(id: string): void {
    this.sessionId = id;
  }

  getSessionId(): string | undefined {
    return this.sessionId;
  }

  private async log(
    level: LogLevel,
    message: string,
    context?: string,
    data?: Record<string, unknown> | string | null,
    meta?: LogContext,
    error?: Error,
  ): Promise<void> {
    // Always log to console in development
    if (isDevelopment) {
      const logMethod = level === 'error' ? console.error :
                       level === 'warn' ? console.warn :
                       level === 'debug' ? console.debug : console.log;
      logMethod(`[${level.toUpperCase()}] ${context || ''} ${message}`, data || meta);
      if (error) {
        console.error(error);
      }
    }

    // Send to server
    await sendLogToServer(
      level,
      message,
      context,
      data,
      { ...meta, correlationId: this.correlationId || meta?.correlationId, sessionId: this.sessionId },
      error,
    );
  }

  async debug(message: string, context?: string, data?: Record<string, unknown> | string | null, meta?: LogContext): Promise<void> {
    if (isDevelopment) {
      await this.log('debug', message, context, data, meta);
    }
  }

  async info(message: string, context?: string, data?: Record<string, unknown> | string | null, meta?: LogContext): Promise<void> {
    await this.log('info', message, context, data, meta);
  }

  async warn(message: string, context?: string, data?: Record<string, unknown> | string | null, meta?: LogContext): Promise<void> {
    await this.log('warn', message, context, data, meta);
  }

  async error(
    message: string,
    context?: string,
    data?: Record<string, unknown> | string | null,
    error?: Error,
    meta?: LogContext,
  ): Promise<void> {
    await this.log('error', message, context, data, meta, error);
  }

  async logUserAction(
    action: string,
    details?: Record<string, unknown>,
    meta?: LogContext,
  ): Promise<void> {
    await this.info(
      `User Action: ${action}`,
      'UserAction',
      details,
      meta,
    );
  }

  async logPerformance(metric: PerformanceMetric, context?: string, meta?: LogContext): Promise<void> {
    await this.info(
      `Performance: ${metric.operation}`,
      context || 'Performance',
      {
        operation: metric.operation,
        duration: metric.duration,
        unit: metric.unit,
        ...metric.metadata,
      },
      meta,
    );
  }

  async logApiRequest(
    method: string,
    url: string,
    statusCode?: number,
    responseTime?: number,
    error?: Error,
    meta?: LogContext,
  ): Promise<void> {
    if (error) {
      await this.error(
        `API Request Failed: ${method} ${url}`,
        'ApiRequest',
        {
          method,
          url,
          statusCode,
          responseTime,
        },
        error,
        meta,
      );
    } else {
      await this.info(
        `API Request: ${method} ${url}`,
        'ApiRequest',
        {
          method,
          url,
          statusCode,
          responseTime,
          unit: 'ms',
        },
        meta,
      );
    }
  }

  // Performance measurement helper
  async measurePerformance<T>(
    operation: string,
    fn: () => Promise<T> | T,
    context?: string,
    meta?: LogContext,
  ): Promise<T> {
    const startTime = performance.now();
    try {
      const result = await fn();
      const duration = performance.now() - startTime;
      await this.logPerformance(
        { operation, duration, unit: 'ms' },
        context,
        meta,
      );
      return result;
    } catch (err) {
      const duration = performance.now() - startTime;
      await this.error(
        `Performance measurement failed: ${operation}`,
        context || 'Performance',
        { operation, duration, unit: 'ms' },
        err instanceof Error ? err : new Error(String(err)),
        meta,
      );
      throw err;
    }
  }
}

// Export singleton instance
export const clientLogger = new ClientLogger();

// Export convenience functions (only public methods)
export const debug = clientLogger.debug.bind(clientLogger);
export const info = clientLogger.info.bind(clientLogger);
export const warn = clientLogger.warn.bind(clientLogger);
export const error = clientLogger.error.bind(clientLogger);
export const logUserAction = clientLogger.logUserAction.bind(clientLogger);
export const logPerformance = clientLogger.logPerformance.bind(clientLogger);
export const logApiRequest = clientLogger.logApiRequest.bind(clientLogger);
export const measurePerformance = clientLogger.measurePerformance.bind(clientLogger);

export { ClientLogger };


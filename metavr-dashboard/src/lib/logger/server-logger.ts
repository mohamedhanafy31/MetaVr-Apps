import { promises as fs } from 'fs';
import path from 'path';
import type { LogEntry, LogLevel, LogContext, PerformanceMetric } from './types';

const LOG_DIR = path.join(process.cwd(), 'logs');
const isProduction = process.env.NODE_ENV === 'production';
const isServerless = process.env.NETLIFY === 'true' || process.env.VERCEL === '1';

// Ensure log directory exists
async function ensureLogDir(): Promise<void> {
  if (isServerless) return;
  try {
    await fs.mkdir(LOG_DIR, { recursive: true });
  } catch (err) {
    console.error('[Logger] Failed to create log directory:', err);
  }
}

// Get log file path based on level and date
function getLogFilePath(level: LogLevel): string {
  const date = new Date().toISOString().split('T')[0];
  const filename = `${level}-${date}.log`;
  return path.join(LOG_DIR, filename);
}

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

// Write log entry to file
async function writeLogEntry(entry: LogEntry): Promise<void> {
  if (isServerless) {
    // In serverless environments, just use console
    const logMethod = entry.level === 'error' ? console.error : 
                     entry.level === 'warn' ? console.warn :
                     entry.level === 'debug' ? console.debug : console.log;
    logMethod(`[${entry.level.toUpperCase()}] ${entry.context || ''} ${entry.message}`, entry.data);
    return;
  }

  try {
    await ensureLogDir();
    const logFile = getLogFilePath(entry.level);
    const line = JSON.stringify(entry) + '\n';
    await fs.appendFile(logFile, line, 'utf8');
  } catch (err) {
    console.error('[Logger] Failed to write log:', err);
  }
}

// Create log entry
function createLogEntry(
  level: LogLevel,
  message: string,
  context?: string,
  data?: Record<string, unknown> | string | null,
  meta?: LogContext,
  error?: Error,
): LogEntry {
  return {
    timestamp: new Date().toISOString(),
    level,
    message,
    context,
    data: data && typeof data === 'object' ? sanitizeData(data) : data,
    meta: meta ? sanitizeData(meta as Record<string, unknown>) as LogContext : undefined,
    stack: error?.stack,
    source: 'server',
    environment: process.env.NODE_ENV || 'development',
  };
}

class ServerLogger {
  private correlationId?: string;

  setCorrelationId(id: string): void {
    this.correlationId = id;
  }

  getCorrelationId(): string | undefined {
    return this.correlationId;
  }

  async log(
    level: LogLevel,
    message: string,
    context?: string,
    data?: Record<string, unknown> | string | null,
    meta?: LogContext,
    error?: Error,
  ): Promise<void> {
    const entry = createLogEntry(
      level,
      message,
      context,
      data,
      { ...meta, correlationId: this.correlationId || meta?.correlationId },
      error,
    );
    await writeLogEntry(entry);
  }

  async debug(message: string, context?: string, data?: Record<string, unknown> | string | null, meta?: LogContext): Promise<void> {
    if (!isProduction) {
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

  async logRequest(
    method: string,
    url: string,
    statusCode: number,
    responseTime: number,
    meta?: LogContext,
  ): Promise<void> {
    await this.info(
      'HTTP Request',
      'HttpRequest',
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

  async logSecurity(event: string, meta?: LogContext): Promise<void> {
    await this.warn(`Security Event: ${event}`, 'Security', undefined, meta);
  }

  async logDatabase(
    operation: string,
    collection: string,
    duration: number,
    meta?: LogContext,
  ): Promise<void> {
    await this.debug(
      'Database Operation',
      'Database',
      {
        operation,
        collection,
        duration,
        unit: 'ms',
      },
      meta,
    );
  }
}

// Export singleton instance
export const serverLogger = new ServerLogger();

// Export convenience functions
export const log = serverLogger.log.bind(serverLogger);
export const debug = serverLogger.debug.bind(serverLogger);
export const info = serverLogger.info.bind(serverLogger);
export const warn = serverLogger.warn.bind(serverLogger);
export const error = serverLogger.error.bind(serverLogger);
export const logRequest = serverLogger.logRequest.bind(serverLogger);
export const logPerformance = serverLogger.logPerformance.bind(serverLogger);
export const logSecurity = serverLogger.logSecurity.bind(serverLogger);
export const logDatabase = serverLogger.logDatabase.bind(serverLogger);

export { ServerLogger };
export const LOG_DIR_PATH = LOG_DIR;


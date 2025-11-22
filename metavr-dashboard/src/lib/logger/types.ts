export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface LogContext {
  userId?: string;
  sessionId?: string;
  correlationId?: string;
  userAgent?: string;
  ip?: string;
  [key: string]: unknown;
}

export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  context?: string;
  data?: Record<string, unknown> | string | null;
  meta?: LogContext;
  stack?: string;
  source: 'server' | 'client';
  environment?: string;
}

export interface PerformanceMetric {
  operation: string;
  duration: number;
  unit: 'ms' | 's';
  metadata?: Record<string, unknown>;
}


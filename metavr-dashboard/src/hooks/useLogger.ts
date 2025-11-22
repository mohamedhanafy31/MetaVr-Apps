'use client';

import { useCallback } from 'react';
import { clientLogger } from '@/lib/logger/client-logger';
import type { LogContext, PerformanceMetric } from '@/lib/logger/types';

/**
 * React hook for client-side logging
 * Provides convenient logging methods for React components
 */
export function useLogger(context?: string) {
  const log = useCallback(
    (level: 'debug' | 'info' | 'warn' | 'error', message: string, data?: Record<string, unknown> | string | null, error?: Error, meta?: LogContext) => {
      switch (level) {
        case 'debug':
          return clientLogger.debug(message, context, data, meta);
        case 'info':
          return clientLogger.info(message, context, data, meta);
        case 'warn':
          return clientLogger.warn(message, context, data, meta);
        case 'error':
          return clientLogger.error(message, context, data, error, meta);
      }
    },
    [context],
  );

  const debug = useCallback(
    (message: string, data?: Record<string, unknown> | string | null, meta?: LogContext) => {
      return clientLogger.debug(message, context, data, meta);
    },
    [context],
  );

  const info = useCallback(
    (message: string, data?: Record<string, unknown> | string | null, meta?: LogContext) => {
      return clientLogger.info(message, context, data, meta);
    },
    [context],
  );

  const warn = useCallback(
    (message: string, data?: Record<string, unknown> | string | null, meta?: LogContext) => {
      return clientLogger.warn(message, context, data, meta);
    },
    [context],
  );

  const error = useCallback(
    (message: string, data?: Record<string, unknown> | string | null, err?: Error, meta?: LogContext) => {
      return clientLogger.error(message, context, data, err, meta);
    },
    [context],
  );

  const logUserAction = useCallback(
    (action: string, details?: Record<string, unknown>, meta?: LogContext) => {
      return clientLogger.logUserAction(action, details, meta);
    },
    [],
  );

  const logPerformance = useCallback(
    (metric: PerformanceMetric, meta?: LogContext) => {
      return clientLogger.logPerformance(metric, context, meta);
    },
    [context],
  );

  const logApiRequest = useCallback(
    (method: string, url: string, statusCode?: number, responseTime?: number, err?: Error, meta?: LogContext) => {
      return clientLogger.logApiRequest(method, url, statusCode, responseTime, err, meta);
    },
    [],
  );

  const measurePerformance = useCallback(
    <T,>(operation: string, fn: () => Promise<T> | T, meta?: LogContext): Promise<T> => {
      return clientLogger.measurePerformance(operation, fn, context, meta);
    },
    [context],
  );

  return {
    log,
    debug,
    info,
    warn,
    error,
    logUserAction,
    logPerformance,
    logApiRequest,
    measurePerformance,
  };
}


/**
 * @deprecated This file is deprecated. Use `@/lib/logger/server-logger` instead.
 * This file is kept for backward compatibility and will be removed in a future version.
 */
import { serverLogger } from '../logger/server-logger';

export type LogEvent = {
  ts: string;
  level: 'info' | 'warn' | 'error' | 'debug';
  tag: string;
  data?: Record<string, unknown> | string | null;
};

/**
 * @deprecated Use `serverLogger` methods instead
 */
export function writeLog(event: LogEvent) {
  const { level, tag, data } = event;
  switch (level) {
    case 'error':
      serverLogger.error(event.ts, tag, data);
      break;
    case 'warn':
      serverLogger.warn(event.ts, tag, data);
      break;
    case 'debug':
      serverLogger.debug(event.ts, tag, data);
      break;
    default:
      serverLogger.info(event.ts, tag, data);
  }
}

/**
 * @deprecated Use `serverLogger.info()` instead
 */
export function info(tag: string, data?: Record<string, unknown> | string | null) {
  serverLogger.info(tag, 'LegacyLogger', data);
}

/**
 * @deprecated Use `serverLogger.warn()` instead
 */
export function warn(tag: string, data?: Record<string, unknown> | string | null) {
  serverLogger.warn(tag, 'LegacyLogger', data);
}

/**
 * @deprecated Use `serverLogger.error()` instead
 */
export function error(tag: string, data?: Record<string, unknown> | string | null) {
  serverLogger.error(tag, 'LegacyLogger', data);
}

/**
 * @deprecated Use `serverLogger.debug()` instead
 */
export function debug(tag: string, data?: Record<string, unknown> | string | null) {
  serverLogger.debug(tag, 'LegacyLogger', data);
}

/**
 * @deprecated This file is deprecated. Use `@/lib/logger/server-logger` instead.
 * This file is kept for backward compatibility and will be removed in a future version.
 */
import { serverLogger } from './logger/server-logger';
import { LOG_DIR_PATH } from './logger/server-logger';

const LOG_DIR = LOG_DIR_PATH;
const LOG_FILE = `${LOG_DIR}/app.log`;

/**
 * @deprecated Use `serverLogger.info()` instead
 */
export async function writeLog(event: string, details: Record<string, unknown> = {}): Promise<void> {
  await serverLogger.info(event, 'LegacyLogger', details);
}

export const LOGGER_PATHS = { LOG_DIR, LOG_FILE };

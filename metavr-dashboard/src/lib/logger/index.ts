// Server-side logger (for API routes, server components)
export { serverLogger } from './server-logger';
export * from './types';

// Client-side logger (for client components)
export { clientLogger, debug, info, warn, error } from './client-logger';

// Re-export types
export type { LogLevel, LogContext, LogEntry, PerformanceMetric } from './types';


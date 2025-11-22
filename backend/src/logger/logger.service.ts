import { Injectable, LoggerService as NestLoggerService, Inject } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { WinstonLogger } from 'nest-winston';

@Injectable()
export class AppLoggerService implements NestLoggerService {
  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: WinstonLogger
  ) {}

  log(message: string, context?: string, meta?: Record<string, unknown>) {
    if (meta) {
      // Use winston logger directly with metadata
      (this.logger as any).winstonLogger?.log('info', message, { context, ...meta });
    } else {
      this.logger.log(message, context);
    }
  }

  error(message: string, trace?: string, context?: string, meta?: Record<string, unknown>) {
    if (meta || trace) {
      // Use winston logger directly with metadata
      (this.logger as any).winstonLogger?.error(message, { trace, context, ...meta });
    } else if (context) {
      this.logger.error(message, context);
    } else {
      this.logger.error(message);
    }
  }

  warn(message: string, context?: string, meta?: Record<string, unknown>) {
    if (meta) {
      // Use winston logger directly with metadata
      (this.logger as any).winstonLogger?.warn(message, { context, ...meta });
    } else {
      this.logger.warn(message, context);
    }
  }

  debug(message: string, context?: string, meta?: Record<string, unknown>) {
    if (this.logger.debug) {
      if (meta) {
        // Use winston logger directly with metadata
        (this.logger as any).winstonLogger?.debug(message, { context, ...meta });
      } else {
        this.logger.debug(message, context);
      }
    }
  }

  verbose(message: string, context?: string, meta?: Record<string, unknown>) {
    if (this.logger.verbose) {
      if (meta) {
        // Use winston logger directly with metadata
        (this.logger as any).winstonLogger?.verbose(message, { context, ...meta });
      } else {
        this.logger.verbose(message, context);
      }
    }
  }

  // Custom methods for structured logging
  logRequest(
    method: string,
    url: string,
    statusCode: number,
    responseTime: number,
    correlationId: string,
    meta?: Record<string, unknown>,
  ) {
    const winstonLogger = (this.logger as any).winstonLogger;
    if (winstonLogger) {
      winstonLogger.log('info', 'HTTP Request', {
        context: 'HttpRequest',
        method,
        url,
        statusCode,
        responseTime,
        correlationId,
        ...meta,
      });
    } else {
      this.logger.log('HTTP Request', 'HttpRequest');
    }
  }

  logError(
    error: Error | string,
    context?: string,
    meta?: Record<string, unknown>,
  ) {
    const errorMessage = error instanceof Error ? error.message : error;
    const stack = error instanceof Error ? error.stack : undefined;
    const winstonLogger = (this.logger as any).winstonLogger;
    if (winstonLogger) {
      winstonLogger.error(errorMessage, {
        trace: stack,
        context: context || 'Error',
        ...meta,
      });
    } else {
      this.logger.error(errorMessage, stack, context);
    }
  }

  logPerformance(
    operation: string,
    duration: number,
    context?: string,
    meta?: Record<string, unknown>,
  ) {
    const winstonLogger = (this.logger as any).winstonLogger;
    if (winstonLogger) {
      winstonLogger.log('info', 'Performance Metric', {
        context: context || 'Performance',
        operation,
        duration,
        unit: 'ms',
        ...meta,
      });
    } else {
      this.logger.log('Performance Metric', context || 'Performance');
    }
  }

  logSecurity(
    event: string,
    meta?: Record<string, unknown>,
  ) {
    const winstonLogger = (this.logger as any).winstonLogger;
    if (winstonLogger) {
      winstonLogger.warn(`Security Event: ${event}`, {
        context: 'Security',
        ...meta,
      });
    } else {
      this.logger.warn(`Security Event: ${event}`, 'Security');
    }
  }

  logDatabase(
    operation: string,
    collection: string,
    duration: number,
    meta?: Record<string, unknown>,
  ) {
    const winstonLogger = (this.logger as any).winstonLogger;
    if (winstonLogger && winstonLogger.debug) {
      winstonLogger.debug('Database Operation', {
        context: 'Database',
        operation,
        collection,
        duration,
        unit: 'ms',
        ...meta,
      });
    } else if (this.logger.debug) {
      this.logger.debug('Database Operation', 'Database');
    }
  }
}


import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { AppLoggerService } from './logger.service';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  constructor(private readonly logger: AppLoggerService) {}

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();
    const correlationId = request['correlationId'] || 'unknown';

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    const message =
      exception instanceof HttpException
        ? exception.getResponse()
        : exception instanceof Error
        ? exception.message
        : 'Internal server error';

    const errorResponse = {
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.url,
      method: request.method,
      correlationId,
      message: typeof message === 'string' ? message : (message as any).message || message,
    };

    // Log error with full context
    const errorMeta = {
      correlationId,
      statusCode: status,
      method: request.method,
      url: request.url,
      ip: request.ip || request.socket.remoteAddress,
      userAgent: request.get('user-agent'),
      userId: request['user']?.userId || request['user']?.email,
      body: request.body,
      query: request.query,
      stack: exception instanceof Error ? exception.stack : undefined,
    };

    if (status >= 500) {
      this.logger.logError(
        exception instanceof Error ? exception : new Error(String(exception)),
        'HttpException',
        errorMeta,
      );
    } else {
      this.logger.warn('HTTP Exception', 'HttpException', errorMeta as Record<string, unknown>);
    }

    response.status(status).json(errorResponse);
  }
}


import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { AppLoggerService } from './logger.service';

@Injectable()
export class HttpLoggingMiddleware implements NestMiddleware {
  constructor(private readonly logger: AppLoggerService) {}

  use(req: Request, res: Response, next: NextFunction) {
    const startTime = Date.now();
    const correlationId = req.headers['x-correlation-id'] as string || uuidv4();
    
    // Add correlation ID to request for tracking
    req['correlationId'] = correlationId;
    res.setHeader('X-Correlation-ID', correlationId);

    // Capture request details
    const requestMeta = {
      correlationId,
      method: req.method,
      url: req.originalUrl || req.url,
      ip: req.ip || req.socket.remoteAddress,
      userAgent: req.get('user-agent'),
      contentType: req.get('content-type'),
      contentLength: req.get('content-length'),
      query: Object.keys(req.query).length > 0 ? req.query : undefined,
      body: this.sanitizeBody(req.body),
      userId: req['user']?.userId || req['user']?.email,
    };

    // Log request
    this.logger.log('Incoming Request', 'HttpRequest', requestMeta);

    // Capture response
    const originalSend = res.send;
    const logger = this.logger;
    res.send = function (body) {
      const responseTime = Date.now() - startTime;
      
      // Log response
      logger.logRequest(
        req.method,
        req.originalUrl || req.url,
        res.statusCode,
        responseTime,
        correlationId,
        {
          ip: req.ip || req.socket.remoteAddress,
          userAgent: req.get('user-agent'),
          userId: req['user']?.userId || req['user']?.email,
        },
      );

      return originalSend.call(this, body);
    };

    next();
  }

  private sanitizeBody(body: any): any {
    if (!body || typeof body !== 'object') {
      return body;
    }

    const sensitiveFields = ['password', 'token', 'secret', 'apiKey', 'authorization'];
    const sanitized = { ...body };

    for (const field of sensitiveFields) {
      if (sanitized[field]) {
        sanitized[field] = '***REDACTED***';
      }
    }

    return sanitized;
  }
}


import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';
import { throwError } from 'rxjs';
import { AppLoggerService } from './logger.service';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  constructor(private readonly logger: AppLoggerService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const { method, url } = request;
    const correlationId = request['correlationId'] || 'unknown';
    const controller = context.getClass().name;
    const handler = context.getHandler().name;
    const startTime = Date.now();

    this.logger.debug(
      `Executing ${controller}.${handler}`,
      'Interceptor',
      {
        correlationId,
        method,
        url,
        controller,
        handler,
      },
    );

    return next.handle().pipe(
      tap(() => {
        const duration = Date.now() - startTime;
        this.logger.logPerformance(
          `${controller}.${handler}`,
          duration,
          'Interceptor',
          {
            correlationId,
            method,
            url,
          },
        );
      }),
      catchError((error) => {
        const duration = Date.now() - startTime;
        this.logger.logError(
          error,
          'Interceptor',
          {
            correlationId,
            method,
            url,
            controller,
            handler,
            duration,
          },
        );
        return throwError(() => error);
      }),
    );
  }
}


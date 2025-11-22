import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';
import { AppLoggerService } from '../../logger/logger.service';

@Injectable()
export class CsrfOriginGuard implements CanActivate {
  constructor(
    private readonly configService: ConfigService,
    private readonly logger: AppLoggerService,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    if (!request) {
      return true;
    }

    const method = request.method?.toUpperCase() || 'GET';
    if (['GET', 'HEAD', 'OPTIONS'].includes(method)) {
      return true;
    }

    const allowedOrigins = this.getAllowedOrigins();
    if (allowedOrigins.length === 0) {
      return true;
    }

    const originHeader = request.headers.origin || request.headers.referer;
    if (!originHeader) {
      this.logger.logSecurity('CSRF rejected: missing origin header', {
        path: request.originalUrl,
        method,
      });
      throw new ForbiddenException('Origin header required');
    }

    const origin = this.extractOrigin(originHeader as string);
    if (!allowedOrigins.includes(origin)) {
      this.logger.logSecurity('CSRF rejected: origin mismatch', {
        path: request.originalUrl,
        method,
        origin,
        allowedOrigins,
      });
      throw new ForbiddenException('Origin not allowed');
    }

    return true;
  }

  private getAllowedOrigins(): string[] {
    const configured = this.configService.get<string>('DASHBOARD_ORIGIN', '');
    return configured
      .split(',')
      .map((origin) => origin.trim())
      .filter(Boolean);
  }

  private extractOrigin(headerValue: string): string {
    try {
      return new URL(headerValue).origin;
    } catch {
      return headerValue;
    }
  }
}


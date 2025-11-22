import { NextRequest, NextResponse } from 'next/server';
import { serverLogger } from '@/lib/logger/server-logger';
import type { LogEntry } from '@/lib/logger/types';

// Default origins for development
const DEFAULT_DEV_ORIGINS = [
  'http://localhost:3000',
  'http://localhost:3001',
  'http://localhost:3002',
];

function getAllowedOrigins() {
  const envValue = process.env.ALLOWED_CLIENT_APP_ORIGINS;
  if (envValue) {
    return envValue
      .split(',')
      .map((origin) => origin.trim())
      .filter(Boolean);
  }
  
  // In production, if no env var is set, use empty array (no CORS allowed)
  // In development, use default localhost origins
  const isProduction = process.env.NODE_ENV === 'production';
  return isProduction ? [] : DEFAULT_DEV_ORIGINS;
}

function applyCorsHeaders(response: NextResponse, origin: string | null) {
  const allowedOrigins = getAllowedOrigins();
  if (origin && allowedOrigins.includes(origin)) {
    response.headers.set('Access-Control-Allow-Origin', origin);
    response.headers.set('Vary', 'Origin');
    response.headers.set(
      'Access-Control-Allow-Headers',
      'Content-Type, Authorization, X-Correlation-ID',
    );
    response.headers.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
    response.headers.set('Access-Control-Allow-Credentials', 'true');
  }
  return response;
}

export async function OPTIONS(request: NextRequest) {
  const origin = request.headers.get('origin');
  const response = NextResponse.json({ ok: true });
  return applyCorsHeaders(response, origin);
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({})) as Partial<LogEntry>;
    const {
      level = 'info',
      message = 'client.log',
      context,
      data,
      meta,
      stack,
    } = body;

    // Generate UUID v4
    function generateUUID(): string {
      return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
        const r = (Math.random() * 16) | 0;
        const v = c === 'x' ? r : (r & 0x3) | 0x8;
        return v.toString(16);
      });
    }

    // Extract correlation ID from request headers
    const correlationId = request.headers.get('x-correlation-id') || 
                         request.headers.get('X-Correlation-ID') ||
                         generateUUID();

    // Log with appropriate level
    const logMeta = {
      ...meta,
      correlationId,
      ip: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown',
      userAgent: request.headers.get('user-agent') || undefined,
    };

    switch (level) {
      case 'error':
        await serverLogger.error(
          message,
          context || 'Client',
          data,
          stack ? new Error(stack) : undefined,
          logMeta,
        );
        break;
      case 'warn':
        await serverLogger.warn(message, context || 'Client', data, logMeta);
        break;
      case 'debug':
        await serverLogger.debug(message, context || 'Client', data, logMeta);
        break;
      default:
        await serverLogger.info(message, context || 'Client', data, logMeta);
    }

    const response = NextResponse.json({ ok: true, correlationId });
    return applyCorsHeaders(response, request.headers.get('origin'));
  } catch (err: unknown) {
    await serverLogger.error(
      'Failed to process client log',
      'ClientLog',
      { error: String(err) },
      err instanceof Error ? err : new Error(String(err)),
    );
    const response = NextResponse.json({ ok: false }, { status: 500 });
    return applyCorsHeaders(response, request.headers.get('origin'));
  }
}

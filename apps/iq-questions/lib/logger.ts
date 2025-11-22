'use client';

import { useCallback, useMemo, useRef } from 'react';
import { APP_KEY } from './access';
import { useAccessContext } from '../components/AccessCodeGate';

const DASHBOARD_URL = process.env.NEXT_PUBLIC_DASHBOARD_URL || 'http://localhost:3000';
const CLIENT_LOG_ENDPOINT = `${DASHBOARD_URL.replace(/\/$/, '')}/api/debug/client-log`;

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogOptions {
  data?: Record<string, unknown>;
  meta?: Record<string, unknown>;
  error?: unknown;
}

function generateCorrelationId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `app-log-${Date.now()}-${Math.round(Math.random() * 100000)}`;
}

async function postClientLog(body: Record<string, unknown>) {
  try {
    const payload = JSON.stringify(body);

    if (typeof navigator !== 'undefined' && typeof navigator.sendBeacon === 'function') {
      const blob = new Blob([payload], { type: 'application/json' });
      if (navigator.sendBeacon(CLIENT_LOG_ENDPOINT, blob)) {
        return;
      }
    }

    await fetch(CLIENT_LOG_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: payload,
      credentials: 'include',
      mode: 'cors',
    });
  } catch (error) {
    console.warn('[iq-questions] Failed to emit client log', error);
  }
}

export function useAppLogger(scope = 'IQQuestionsApp') {
  const accessContext = useAccessContext();
  const correlationIdRef = useRef(generateCorrelationId());

  const emit = useCallback(
    (level: LogLevel, message: string, options: LogOptions = {}) => {
      const { data, meta, error } = options;
      const stack =
        error instanceof Error
          ? error.stack || error.message
          : typeof error === 'string'
            ? error
            : undefined;

      const payload = {
        level,
        message,
        context: scope,
        data: {
          appKey: APP_KEY,
          appName: accessContext.appName || 'IQ Questions',
          ...data,
        },
        meta: {
          correlationId: correlationIdRef.current,
          appId: accessContext.appId || APP_KEY,
          supervisorId: accessContext.supervisorId,
          userId: accessContext.userId,
          userEmail: accessContext.userEmail,
          role: accessContext.role,
          ...meta,
        },
        stack,
      };

      postClientLog(payload);
    },
    [accessContext, scope],
  );

  return useMemo(() => {
    const log = (level: LogLevel, message: string, options?: LogOptions) => emit(level, message, options);
    return {
      log,
      debug: (message: string, options?: LogOptions) => log('debug', message, options),
      info: (message: string, options?: LogOptions) => log('info', message, options),
      warn: (message: string, options?: LogOptions) => log('warn', message, options),
      error: (message: string, error?: unknown, options?: Omit<LogOptions, 'error'>) =>
        log('error', message, { ...options, error }),
      event: (name: string, data?: Record<string, unknown>, meta?: Record<string, unknown>) =>
        log('info', `event:${name}`, { data, meta }),
    };
  }, [emit]);
}



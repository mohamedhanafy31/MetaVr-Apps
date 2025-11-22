'use client';

import { useCallback, useEffect, useMemo, useRef } from 'react';

type PageType = 'dashboard' | 'config' | 'other';

export interface PageTimingOptions {
  pageId: string;
  pageName?: string;
  pageType?: PageType;
  metadata?: Record<string, unknown>;
  enabled?: boolean;
}

type ActivityEndReason = 'before-unload' | 'visibility-hidden' | 'route-change' | 'manual';

const PAGE_ACTIVITY_ENDPOINT = '/api/page-activity';

function generateSessionId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }

  return `page-session-${Date.now()}-${Math.round(Math.random() * 100000)}`;
}

async function postTimingEvent(body: Record<string, unknown>) {
  try {
    const payload = JSON.stringify(body);
    if (typeof navigator !== 'undefined' && typeof navigator.sendBeacon === 'function') {
      const blob = new Blob([payload], { type: 'application/json' });
      if (navigator.sendBeacon(PAGE_ACTIVITY_ENDPOINT, blob)) {
        return;
      }
    }

    await fetch(PAGE_ACTIVITY_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: payload,
      credentials: 'include',
    });
  } catch (error) {
    console.warn('[page-timing] Failed to record page activity', error);
  }
}

export function usePageTiming(options: PageTimingOptions) {
  const { pageId, pageName, metadata, enabled = true } = options;
  const pageType: PageType = options.pageType ?? 'other';

  const startTimeRef = useRef<number | null>(null);
  const enteredAtRef = useRef<string | null>(null);
  const activeRef = useRef(false);
  const sessionIdRef = useRef(generateSessionId());

  const memoizedMetadata = useMemo(() => metadata || {}, [metadata]);

  const finishSession = useCallback(
    (reason: ActivityEndReason) => {
      if (!activeRef.current || startTimeRef.current === null || enteredAtRef.current === null) {
        return;
      }

      const exitTs = Date.now();
      const payload = {
        pageId,
        pageName,
        pageType,
        sessionId: sessionIdRef.current,
        enteredAt: enteredAtRef.current,
        exitedAt: new Date(exitTs).toISOString(),
        metadata: {
          ...memoizedMetadata,
          reason,
        },
      };

      activeRef.current = false;
      startTimeRef.current = null;
      enteredAtRef.current = null;

      postTimingEvent(payload);
    },
    [memoizedMetadata, pageId, pageName, pageType],
  );

  const startSession = useCallback(() => {
    if (!enabled || typeof window === 'undefined' || !pageId) {
      return;
    }

    activeRef.current = true;
    startTimeRef.current = Date.now();
    enteredAtRef.current = new Date().toISOString();
    if (!sessionIdRef.current) {
      sessionIdRef.current = generateSessionId();
    }
  }, [enabled, pageId]);

  useEffect(() => {
    if (!enabled || typeof window === 'undefined') {
      return;
    }

    startSession();

    return () => {
      finishSession('route-change');
      sessionIdRef.current = generateSessionId();
    };
  }, [enabled, finishSession, pageId, startSession]);

  useEffect(() => {
    if (typeof document === 'undefined' || !enabled) {
      return;
    }

    const handleVisibilityChange = () => {
      if (document.hidden) {
        finishSession('visibility-hidden');
      } else {
        startSession();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [enabled, finishSession, startSession]);

  useEffect(() => {
    if (typeof window === 'undefined' || !enabled) {
      return;
    }

    const handleBeforeUnload = () => {
      finishSession('before-unload');
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [enabled, finishSession]);
}



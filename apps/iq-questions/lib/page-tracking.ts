'use client';

import { useCallback, useEffect, useRef } from 'react';

const DASHBOARD_URL = process.env.NEXT_PUBLIC_DASHBOARD_URL || 'http://localhost:3000';

type PageType = 'dashboard' | 'config' | 'app' | 'other';

export interface PageTrackingOptions {
  pageId: string;
  pageName?: string;
  pageType?: PageType;
  appId?: string;
  supervisorId?: string;
  userId?: string;
  userEmail?: string;
  userRole?: 'user' | 'supervisor';
  metadata?: Record<string, unknown>;
  enabled?: boolean;
}

function generateSessionId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `page-session-${Date.now()}-${Math.round(Math.random() * 100000)}`;
}

async function postTrackingEvent(body: Record<string, unknown>) {
  try {
    const payload = JSON.stringify(body);
    
    // Use sendBeacon for better reliability on page unload
    if (typeof navigator !== 'undefined' && typeof navigator.sendBeacon === 'function') {
      const blob = new Blob([payload], { type: 'application/json' });
      if (navigator.sendBeacon(`${DASHBOARD_URL}/api/page-activity`, blob)) {
        return;
      }
    }

    // Fallback to fetch
    await fetch(`${DASHBOARD_URL}/api/page-activity`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: payload,
      credentials: 'include',
      mode: 'cors',
    });
  } catch (error) {
    console.warn('[page-tracking] Failed to record page activity', error);
  }
}

export function usePageTracking(options: PageTrackingOptions) {
  const {
    pageId,
    pageName,
    pageType = 'other',
    appId,
    supervisorId,
    userId,
    userEmail,
    userRole,
    metadata,
    enabled = true,
  } = options;

  const startTimeRef = useRef<number | null>(null);
  const enteredAtRef = useRef<string | null>(null);
  const activeRef = useRef(false);
  const sessionIdRef = useRef(generateSessionId());

  const finishSession = useCallback(
    (reason: string) => {
      if (!activeRef.current || startTimeRef.current === null || enteredAtRef.current === null) {
        return;
      }

      if (!supervisorId || !appId) {
        return; // Only track if we have supervisor and app IDs
      }

      const exitTs = Date.now();
      const payload = {
        pageId,
        pageName,
        pageType,
        action: 'session',
        appId,
        supervisorId, // Include supervisorId for app tracking
        userId,
        userEmail,
        userRole,
        sessionId: sessionIdRef.current,
        enteredAt: enteredAtRef.current,
        exitedAt: new Date(exitTs).toISOString(),
        metadata: {
          ...(metadata || {}),
          reason,
        },
      };

      activeRef.current = false;
      startTimeRef.current = null;
      enteredAtRef.current = null;

      postTrackingEvent(payload);
    },
    [metadata, pageId, pageName, pageType, appId, supervisorId],
  );

  const startSession = useCallback(() => {
    if (!enabled || typeof window === 'undefined' || !pageId || !supervisorId || !appId) {
      return;
    }

    activeRef.current = true;
    startTimeRef.current = Date.now();
    enteredAtRef.current = new Date().toISOString();
    if (!sessionIdRef.current) {
      sessionIdRef.current = generateSessionId();
    }
  }, [enabled, pageId, supervisorId, appId]);

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


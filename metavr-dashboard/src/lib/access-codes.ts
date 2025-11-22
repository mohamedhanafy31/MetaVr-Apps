import { NextRequest } from 'next/server';
import { db } from '@/lib/firebase/admin';
import { getBackendEndpoint } from './backend-url';

export interface AssignmentPayload {
  appId: string;
  appKey: string;
  appName?: string;
  appPath?: string | null;
}

function sanitizeAppKey(value: string): string {
  return value
    .toString()
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

async function buildAssignments(appIds: string[]): Promise<AssignmentPayload[]> {
  if (!appIds || appIds.length === 0) {
    return [];
  }

  const uniqueIds = Array.from(new Set(appIds.filter(Boolean)));

  const docs = await Promise.all(uniqueIds.map((id) => db.collection('applications').doc(id).get()));

  return docs.map((doc, index) => {
    const fallbackId = uniqueIds[index];

    if (!doc.exists) {
      const fallbackKey = sanitizeAppKey(fallbackId);
      return {
        appId: fallbackId,
        appKey: fallbackKey || fallbackId,
        appName: fallbackId,
      };
    }

    const data = doc.data() || {};
    const path = typeof data.path === 'string' ? data.path : undefined;
    const slugFromPath = path?.split('/').filter(Boolean).pop();
    const normalizedKey = sanitizeAppKey(slugFromPath || doc.id);

    return {
      appId: doc.id,
      appKey: normalizedKey || doc.id,
      appName: (data.name as string) || doc.id,
      appPath: path || null,
    };
  });
}

function buildCookieHeader(request: NextRequest): string | null {
  const sessionCookie = request.cookies.get('session')?.value;
  if (!sessionCookie) {
    return null;
  }

  return `session=${sessionCookie}`;
}

async function callBackend<T>(path: string, request: NextRequest, payload: T) {
  const cookieHeader = buildCookieHeader(request);
  if (!cookieHeader) {
    throw new Error('Missing session cookie for backend request');
  }

  const backendEndpoint = getBackendEndpoint(request, path);
  const response = await fetch(backendEndpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Cookie: cookieHeader,
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({}));
    const message = errorBody?.message || `Backend request failed (${response.status})`;
    throw new Error(message);
  }

  return response.json().catch(() => ({}));
}

export async function syncAccessCodesWithBackend(
  request: NextRequest,
  supervisorId: string,
  assignedApplications: string[] = [],
) {
  const assignments = await buildAssignments(assignedApplications);
  return callBackend('/auth/access-codes/sync', request, {
    supervisorId,
    assignments,
  });
}

export async function regenerateAccessCodeWithBackend(
  request: NextRequest,
  supervisorId: string,
  appKey: string,
) {
  return callBackend('/auth/access-codes/regenerate', request, {
    supervisorId,
    appKey,
  });
}

export async function fetchSupervisorAccessCodes(userId: string) {
  const doc = await db.collection('users').doc(userId).get();
  if (!doc.exists) {
    return {};
  }

  return (doc.data()?.accessCodes as Record<string, AssignmentPayload & { code: string }> | undefined) || {};
}



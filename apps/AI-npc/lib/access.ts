export const APP_KEY = 'AI-npc';

// Use basePath-aware API paths
const BASE_PATH = '/AI-npc';
const ACCESS_CODE_API = {
  verify: `${BASE_PATH}/api/access-codes/verify/`,
  resend: `${BASE_PATH}/api/access-codes/resend/`,
} as const;

const extractMessage = (payload: unknown): string | null => {
  if (payload && typeof payload === 'object' && 'message' in payload) {
    const message = (payload as { message?: unknown }).message;
    return typeof message === 'string' ? message : null;
  }
  return null;
};

interface VerifyResponse {
  success?: boolean;
  valid?: boolean;
  supervisorEmail?: string;
  supervisorId?: string;
  userEmail?: string;
  userId?: string;
  role?: 'user' | 'supervisor';
  appId?: string;
  appName?: string;
}

async function postJson<T>(url: string, payload: Record<string, unknown>): Promise<T> {
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
    cache: 'no-store',
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(extractMessage(data) || 'Unexpected error while contacting the server');
  }

  return data as T;
}

export async function verifyAccessCode(code: string): Promise<VerifyResponse> {
  const trimmedCode = code.trim();
  if (!trimmedCode) {
    throw new Error('Access code is required');
  }

  return postJson<VerifyResponse>(ACCESS_CODE_API.verify, {
    code: trimmedCode,
    appKey: APP_KEY,
  });
}

export async function resendAccessCode(email: string): Promise<{ success: boolean; message: string }> {
  if (!email || !email.includes('@')) {
    throw new Error('Valid email address is required');
  }

  return postJson<{ success: boolean; message: string }>(ACCESS_CODE_API.resend, {
    email: email.trim(),
    appKey: APP_KEY,
  });
}


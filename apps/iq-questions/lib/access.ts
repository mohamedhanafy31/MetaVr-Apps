const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:4000';
export const APP_KEY = 'iq-questions';

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

export async function verifyAccessCode(code: string): Promise<VerifyResponse> {
  const trimmedCode = code.trim();
  if (!trimmedCode) {
    throw new Error('Access code is required');
  }

  // Use local API proxy to avoid CORS issues
  const proxyUrl = '/iq-questions/api/auth/access-codes/check';
  
  const response = await fetch(proxyUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      code: trimmedCode,
      appKey: APP_KEY,
    }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || 'Failed to verify access code');
  }

  return response.json();
}

export async function resendAccessCode(email: string): Promise<{ success: boolean; message: string }> {
  if (!BACKEND_URL) {
    throw new Error('Backend URL is not configured');
  }

  if (!email || !email.includes('@')) {
    throw new Error('Valid email address is required');
  }

  const response = await fetch(`${BACKEND_URL}/user-access/resend-code`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      email: email.trim(),
      appKey: APP_KEY,
    }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || 'Failed to resend access code');
  }

  return response.json();
}



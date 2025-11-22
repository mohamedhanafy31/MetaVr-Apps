/**
 * Client-side session utilities
 * Note: These functions work on the client side and cannot access httpOnly cookies directly.
 * They rely on API endpoints to check session validity.
 */

export interface SessionCheckResult {
  valid: boolean;
  expired: boolean;
  role?: 'admin' | 'supervisor';
}

/**
 * Check if the current session is valid by calling an API endpoint
 */
export async function checkSessionValidity(): Promise<SessionCheckResult> {
  try {
    const response = await fetch('/api/auth/session', {
      method: 'GET',
      credentials: 'include',
    });

    if (response.status === 401 || response.status === 403) {
      return { valid: false, expired: true };
    }

    if (!response.ok) {
      return { valid: false, expired: false };
    }

    const data = await response.json();
    if (data.success && data.session) {
      return {
        valid: true,
        expired: false,
        role: data.session.role,
      };
    }

    return { valid: false, expired: true };
  } catch (error) {
    console.error('[auth] Session check failed:', error);
    return { valid: false, expired: false };
  }
}

/**
 * Logout the current user by calling the backend logout endpoint
 */
export async function logoutUser(role: 'admin' | 'supervisor'): Promise<void> {
  const backendBaseUrl = process.env.NEXT_PUBLIC_BACKEND_URL;
  
  if (backendBaseUrl) {
    try {
      await fetch(`${backendBaseUrl}/auth/logout`, {
        method: 'POST',
        credentials: 'include',
      });
    } catch (error) {
      console.error('[auth] Logout request failed:', error);
    }
  }

  // Redirect to appropriate login page
  const loginPath = role === 'admin' ? '/admin/login' : '/supervisor/login';
  window.location.href = loginPath;
}


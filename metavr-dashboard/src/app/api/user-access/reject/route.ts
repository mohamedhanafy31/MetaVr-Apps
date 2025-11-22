import { NextRequest, NextResponse } from 'next/server';
import { getSessionFromRequest } from '@/lib/auth/session';
import { getBackendUrl, getBackendEndpoint } from '@/lib/backend-url';

function buildCookieHeader(request: NextRequest): string | null {
  const sessionCookie = request.cookies.get('session')?.value;
  if (!sessionCookie) {
    return null;
  }
  return `session=${sessionCookie}`;
}

export async function POST(request: NextRequest) {
  try {
    const session = getSessionFromRequest(request);

    if (!session || session.role !== 'supervisor') {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      );
    }

    const cookieHeader = buildCookieHeader(request);
    if (!cookieHeader) {
      return NextResponse.json(
        { success: false, message: 'Session cookie required' },
        { status: 401 }
      );
    }

    const body = await request.json();

    // Forward Origin header from the original request
    const origin = request.headers.get('origin') || request.headers.get('referer');
    
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      'Cookie': cookieHeader,
    };
    
    if (origin) {
      headers['Origin'] = origin;
    }

    const backendUrl = getBackendUrl(request);
    const backendEndpoint = getBackendEndpoint(request, '/user-access/reject');
    
    const response = await fetch(backendEndpoint, {
      method: 'POST',
      headers,
      credentials: 'include',
      body: JSON.stringify(body),
    });

    // Check if response is JSON
    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      const text = await response.text();
      console.error('[UserAccessReject] Backend returned non-JSON response:', text.substring(0, 200));
      return NextResponse.json(
        { success: false, message: 'Backend returned invalid response' },
        { status: 500 }
      );
    }

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json(
        { success: false, message: data.message || 'Failed to reject access request' },
        { status: response.status }
      );
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Reject access request error:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to reject access request' },
      { status: 500 }
    );
  }
}


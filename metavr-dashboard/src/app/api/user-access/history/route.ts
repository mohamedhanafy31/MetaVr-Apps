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

export async function GET(request: NextRequest) {
  try {
    const session = getSessionFromRequest(request);

    if (!session || session.role !== 'supervisor') {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 },
      );
    }

    const cookieHeader = buildCookieHeader(request);
    if (!cookieHeader) {
      return NextResponse.json(
        { success: false, message: 'Session cookie required' },
        { status: 401 },
      );
    }

    const origin = request.headers.get('origin') || request.headers.get('referer');
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      Cookie: cookieHeader,
    };

    if (origin) {
      headers['Origin'] = origin;
    }

    const backendUrl = getBackendUrl(request);
    const backendBase = getBackendEndpoint(request, '/user-access/requests/history');
    const url = new URL(backendBase);
    const searchParams = new URL(request.url).searchParams;
    const limit = searchParams.get('limit');
    if (limit) {
      url.searchParams.set('limit', limit);
    }

    const response = await fetch(url.toString(), {
      method: 'GET',
      headers,
      credentials: 'include',
    });

    // Check if response is JSON
    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      const text = await response.text();
      console.error('[UserAccessHistory] Backend returned non-JSON response:', text.substring(0, 200));
      return NextResponse.json(
        { success: false, message: 'Backend returned invalid response' },
        { status: 500 }
      );
    }

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json(
        { success: false, message: data.message || 'Failed to fetch request history' },
        { status: response.status },
      );
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Fetch request history error:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to fetch request history' },
      { status: 500 },
    );
  }
}



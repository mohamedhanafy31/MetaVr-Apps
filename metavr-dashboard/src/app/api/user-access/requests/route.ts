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
  const requestId = Date.now().toString();
  console.log(`[UserAccessRequests-${requestId}] ===== Request received =====`);
  
  try {
    const session = getSessionFromRequest(request);
    console.log(`[UserAccessRequests-${requestId}] Session check:`, session ? { role: session.role, userId: session.userId } : 'No session');

    if (!session || session.role !== 'supervisor') {
      console.log(`[UserAccessRequests-${requestId}] Unauthorized - no session or wrong role`);
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      );
    }

    const cookieHeader = buildCookieHeader(request);
    if (!cookieHeader) {
      console.log(`[UserAccessRequests-${requestId}] No session cookie found`);
      return NextResponse.json(
        { success: false, message: 'Session cookie required' },
        { status: 401 }
      );
    }

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
    const backendEndpoint = getBackendEndpoint(request, '/user-access/requests');
    console.log(`[UserAccessRequests-${requestId}] Domain-based URL: ${backendUrl}/user-access/requests`);
    console.log(`[UserAccessRequests-${requestId}] Backend endpoint (actual): ${backendEndpoint}`);
    
    const fetchStartTime = Date.now();
    const response = await fetch(backendEndpoint, {
      method: 'GET',
      headers,
      credentials: 'include',
    });
    const fetchDuration = Date.now() - fetchStartTime;
    
    console.log(`[UserAccessRequests-${requestId}] Fetch completed in ${fetchDuration}ms`);
    console.log(`[UserAccessRequests-${requestId}] Response status: ${response.status} ${response.statusText}`);
    console.log(`[UserAccessRequests-${requestId}] Response headers:`, Object.fromEntries(response.headers.entries()));

    // Get response text first to check content type
    const responseText = await response.text();
    console.log(`[UserAccessRequests-${requestId}] Response text length: ${responseText.length}`);
    console.log(`[UserAccessRequests-${requestId}] Response text preview:`, responseText.substring(0, 500));
    
    // Check if response is JSON
    const contentType = response.headers.get('content-type');
    console.log(`[UserAccessRequests-${requestId}] Content-Type: ${contentType}`);
    
    if (!contentType || !contentType.includes('application/json')) {
      console.error(`[UserAccessRequests-${requestId}] ERROR: Backend returned non-JSON response`);
      console.error(`[UserAccessRequests-${requestId}] Full response:`, responseText);
      return NextResponse.json(
        { success: false, message: 'Backend returned invalid response' },
        { status: 500 }
      );
    }

    // Parse JSON from the text we already read
    let data;
    try {
      data = JSON.parse(responseText);
      console.log(`[UserAccessRequests-${requestId}] Parsed JSON successfully`);
    } catch (parseError) {
      console.error(`[UserAccessRequests-${requestId}] ERROR: Failed to parse JSON response`);
      console.error(`[UserAccessRequests-${requestId}] Parse error:`, parseError);
      console.error(`[UserAccessRequests-${requestId}] Response text:`, responseText);
      return NextResponse.json(
        { success: false, message: 'Invalid JSON response from backend' },
        { status: 500 }
      );
    }

    if (!response.ok) {
      console.log(`[UserAccessRequests-${requestId}] Response not OK, returning error`);
      return NextResponse.json(
        { success: false, message: data.message || 'Failed to fetch access requests' },
        { status: response.status }
      );
    }

    console.log(`[UserAccessRequests-${requestId}] ===== Request successful =====`);
    return NextResponse.json(data);
  } catch (error) {
    console.error(`[UserAccessRequests-${requestId}] ===== ERROR =====`);
    console.error(`[UserAccessRequests-${requestId}] Error type:`, error instanceof Error ? error.constructor.name : typeof error);
    console.error(`[UserAccessRequests-${requestId}] Error message:`, error instanceof Error ? error.message : String(error));
    console.error(`[UserAccessRequests-${requestId}] Error stack:`, error instanceof Error ? error.stack : 'No stack trace');
    return NextResponse.json(
      { success: false, message: error instanceof Error ? error.message : 'Failed to fetch access requests' },
      { status: 500 }
    );
  }
}


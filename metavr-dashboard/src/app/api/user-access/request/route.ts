import { NextRequest, NextResponse } from 'next/server';
import { getBackendUrl, getBackendEndpoint } from '@/lib/backend-url';

export async function POST(request: NextRequest) {
  const requestId = Date.now().toString();
  console.log(`[UserAccess-${requestId}] ===== Request received =====`);
  
  try {
    // Parse request body
    console.log(`[UserAccess-${requestId}] Parsing request body...`);
    const body = await request.json();
    console.log(`[UserAccess-${requestId}] Request body:`, JSON.stringify(body, null, 2));
    
    // Get backend URL
    const backendUrl = getBackendUrl(request);
    console.log(`[UserAccess-${requestId}] Backend URL (domain-based): ${backendUrl}`);
    
    // Construct backend endpoint - use localhost for actual connection
    const backendEndpoint = getBackendEndpoint(request, '/user-access/request');
    console.log(`[UserAccess-${requestId}] Backend endpoint (actual): ${backendEndpoint}`);
    console.log(`[UserAccess-${requestId}] Domain-based URL (for reference): ${backendUrl}/user-access/request`);

    // Make request to backend
    console.log(`[UserAccess-${requestId}] Making fetch request to backend...`);
    const fetchStartTime = Date.now();
    
    const response = await fetch(backendEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });
    
    const fetchDuration = Date.now() - fetchStartTime;
    console.log(`[UserAccess-${requestId}] Fetch completed in ${fetchDuration}ms`);
    console.log(`[UserAccess-${requestId}] Response status: ${response.status} ${response.statusText}`);
    console.log(`[UserAccess-${requestId}] Response headers:`, Object.fromEntries(response.headers.entries()));

    // Get response text first to check content type
    console.log(`[UserAccess-${requestId}] Reading response text...`);
    const responseText = await response.text();
    console.log(`[UserAccess-${requestId}] Response text length: ${responseText.length}`);
    console.log(`[UserAccess-${requestId}] Response text preview (first 500 chars):`, responseText.substring(0, 500));
    
    // Check if response is JSON
    const contentType = response.headers.get('content-type');
    console.log(`[UserAccess-${requestId}] Content-Type: ${contentType}`);
    
    if (!contentType || !contentType.includes('application/json')) {
      console.error(`[UserAccess-${requestId}] ERROR: Backend returned non-JSON response`);
      console.error(`[UserAccess-${requestId}] Content-Type: ${contentType}`);
      console.error(`[UserAccess-${requestId}] Status: ${response.status}`);
      console.error(`[UserAccess-${requestId}] Full response text:`, responseText);
      return NextResponse.json(
        { success: false, message: 'Backend returned invalid response' },
        { status: 500 }
      );
    }

    // Parse JSON from the text we already read
    console.log(`[UserAccess-${requestId}] Parsing JSON response...`);
    let data;
    try {
      data = JSON.parse(responseText);
      console.log(`[UserAccess-${requestId}] Parsed JSON successfully:`, JSON.stringify(data, null, 2));
    } catch (parseError) {
      console.error(`[UserAccess-${requestId}] ERROR: Failed to parse JSON response`);
      console.error(`[UserAccess-${requestId}] Parse error:`, parseError);
      console.error(`[UserAccess-${requestId}] Response text:`, responseText);
      return NextResponse.json(
        { success: false, message: 'Invalid JSON response from backend' },
        { status: 500 }
      );
    }

    if (!response.ok) {
      console.log(`[UserAccess-${requestId}] Response not OK, returning error response`);
      return NextResponse.json(
        { success: false, message: data.message || 'Failed to submit access request' },
        { status: response.status }
      );
    }

    console.log(`[UserAccess-${requestId}] ===== Request successful =====`);
    return NextResponse.json(data);
  } catch (error) {
    console.error(`[UserAccess-${requestId}] ===== ERROR =====`);
    console.error(`[UserAccess-${requestId}] Error type:`, error instanceof Error ? error.constructor.name : typeof error);
    console.error(`[UserAccess-${requestId}] Error message:`, error instanceof Error ? error.message : String(error));
    console.error(`[UserAccess-${requestId}] Error stack:`, error instanceof Error ? error.stack : 'No stack trace');
    return NextResponse.json(
      { success: false, message: error instanceof Error ? error.message : 'Failed to submit access request' },
      { status: 500 }
    );
  }
}


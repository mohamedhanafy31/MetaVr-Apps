import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Generate UUID v4
function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export function middleware(request: NextRequest) {
  // Skip middleware for API routes, Next.js internal files, and static assets
  const pathname = request.nextUrl.pathname;
  if (
    pathname.startsWith('/api/') ||
    pathname.startsWith('/_next/') ||
    pathname === '/favicon.ico' ||
    /\.(png|jpg|jpeg|gif|svg|ico|webp|woff|woff2|ttf|eot)$/.test(pathname)
  ) {
    return NextResponse.next();
  }

  const correlationId = request.headers.get('x-correlation-id') || 
                       request.headers.get('X-Correlation-ID') ||
                       generateUUID();

  // Add correlation ID to request headers
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-correlation-id', correlationId);

  // Note: Logging removed from middleware as it uses Node.js modules
  // which are not supported in Edge runtime. Logging should be done
  // in API routes or server components instead.

  const response = NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });

  // Add correlation ID to response headers
  response.headers.set('x-correlation-id', correlationId);

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next (Next.js internal files)
     * - favicon.ico (favicon file)
     * - Static assets (images, fonts, etc.)
     */
    {
      source: '/:path*',
      missing: [
        { type: 'header', key: 'next-router-prefetch' },
        { type: 'header', key: 'purpose', value: 'prefetch' },
      ],
    },
  ],
};

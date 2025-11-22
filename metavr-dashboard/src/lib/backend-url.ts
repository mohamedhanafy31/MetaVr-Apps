import { NextRequest } from 'next/server';

/**
 * Get domain-based backend URL from request headers
 * This constructs the domain URL for proper cookie handling and CORS
 */
export function getBackendUrl(request: NextRequest): string {
  // Get the host from the request headers
  const host = request.headers.get('host') || request.headers.get('x-forwarded-host');
  const protocol = request.headers.get('x-forwarded-proto') || 'https';
  
  if (host) {
    // Use the domain (e.g., https://metavrai.shop)
    return `${protocol}://${host}`;
  }
  
  // Fallback to environment variable or localhost
  return process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:4000';
}

/**
 * Get the actual backend endpoint URL for server-side requests
 * For server-to-server calls, always use localhost:4000 directly
 * Domain-based URLs are only used for client-side requests or logging
 */
export function getBackendEndpoint(request: NextRequest, path: string): string {
  // Ensure path starts with /
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  
  // For server-side API routes, always use localhost:4000 directly
  // This avoids nginx routing issues and ensures proper server-to-server communication
  return `http://localhost:4000${normalizedPath}`;
}



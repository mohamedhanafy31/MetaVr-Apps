/**
 * Helper functions to test cookie parsing logic
 * These replicate the getCookie method logic for testing
 */

/**
 * Replicates the getCookie method logic for testing
 */
export function parseCookieFromRequest(
  cookies: any,
  cookieHeader: string | undefined,
  cookieName: string
): string | undefined {
  // Step 1: Check req.cookies first
  // Note: Empty string is falsy, so cookies[cookieName] check will fail for empty strings
  if (cookies && cookies[cookieName]) {
    return cookies[cookieName];
  }

  // Step 2: Fall back to header parsing
  if (!cookieHeader) {
    return undefined;
  }

  // Step 3: Parse header
  const match = cookieHeader
    .split(';')
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${cookieName}=`));

  if (!match) {
    return undefined;
  }

  // Step 4: Extract and decode value
  const value = match.substring(cookieName.length + 1);
  if (value === '') {
    return undefined; // Treat empty value as missing cookie
  }

  try {
    return decodeURIComponent(value);
  } catch (error) {
    // Handle invalid percent encoding gracefully
    return undefined;
  }
}

/**
 * Test helper to create cookie header strings
 */
export function createCookieHeader(cookies: Record<string, string>): string {
  return Object.entries(cookies)
    .map(([name, value]) => `${name}=${value}`)
    .join('; ');
}


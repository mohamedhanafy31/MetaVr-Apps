export function getBackendBaseUrl(): string {
  const baseUrl = (process.env.BACKEND_URL || process.env.NEXT_PUBLIC_BACKEND_URL || '').trim();
  if (!baseUrl) {
    throw new Error('BACKEND_URL is not configured');
  }

  return baseUrl.replace(/\/$/, '');
}

export function buildBackendUrl(pathname: string): string {
  const sanitizedPath = pathname.startsWith('/') ? pathname : `/${pathname}`;
  return `${getBackendBaseUrl()}${sanitizedPath}`;
}



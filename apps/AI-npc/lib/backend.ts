export function buildBackendUrl(pathname: string): string {
  const baseUrl = (process.env.BACKEND_URL || process.env.NEXT_PUBLIC_BACKEND_URL || '').trim();
  
  if (!baseUrl) {
    throw new Error('BACKEND_URL or NEXT_PUBLIC_BACKEND_URL must be set');
  }

  const cleanBase = baseUrl.replace(/\/+$/, '');
  const cleanPath = pathname.startsWith('/') ? pathname : `/${pathname}`;
  
  return `${cleanBase}${cleanPath}`;
}


# Domain-Based URL Implementation

## Overview

The domain-based URL system ensures that backend API calls use the correct URL format based on the environment (production vs development), enabling proper cookie handling, CORS, and request routing.

## Implementation

### File: `src/lib/backend-url.ts`

#### `getBackendUrl(request: NextRequest): string`
- **Purpose**: Constructs the domain-based base URL from request headers
- **Returns**: Domain URL (e.g., `https://metavrai.shop`) or fallback to environment variable/localhost
- **Usage**: For logging, reference, and constructing full URLs

#### `getBackendEndpoint(request: NextRequest, path: string): string`
- **Purpose**: Gets the actual backend endpoint URL for server-side requests
- **Production Behavior**: 
  - Uses domain-based URL with `/api/` prefix
  - Example: `https://metavrai.shop/api/user-access/request`
  - Nginx routes `/api/*` to the backend
- **Development Behavior**:
  - Uses `http://localhost:4000` directly
  - Example: `http://localhost:4000/user-access/request`
  - No nginx proxy in development

## How It Works

### Production Flow
1. Request comes to `https://metavrai.shop/api/user-access/request`
2. Nginx routes `/api/user-access/` to dashboard (Next.js API route)
3. Dashboard API route calls `getBackendEndpoint(request, '/user-access/request')`
4. Function returns `https://metavrai.shop/api/user-access/request`
5. Request goes through nginx again, which routes `/api/` to backend
6. Backend receives request at `/user-access/request` (nginx strips `/api/` prefix)

### Development Flow
1. Request comes to `http://localhost:3000/api/user-access/request`
2. Next.js API route calls `getBackendEndpoint(request, '/user-access/request')`
3. Function detects development mode and returns `http://localhost:4000/user-access/request`
4. Direct connection to backend (no nginx proxy)

## Production Detection

The system detects production mode by checking:
- Domain contains `metavrai.shop`
- URL starts with `https://` (and not localhost)
- URL is not `http://localhost:4000` or contains `127.0.0.1`

## Benefits

1. **Proper Cookie Handling**: Domain-based URLs ensure cookies are set correctly
2. **CORS Compatibility**: Works with CORS policies that require domain-based origins
3. **Environment Flexibility**: Automatically adapts to production vs development
4. **Nginx Integration**: Properly routes through nginx in production

## Usage Example

```typescript
import { getBackendEndpoint } from '@/lib/backend-url';

export async function GET(request: NextRequest) {
  // Get the backend endpoint URL
  const backendEndpoint = getBackendEndpoint(request, '/user-access/requests');
  
  // Make request to backend
  const response = await fetch(backendEndpoint, {
    method: 'GET',
    headers: {
      'Cookie': cookieHeader,
    },
    credentials: 'include',
  });
  
  return NextResponse.json(await response.json());
}
```

## Files Using Domain-Based URLs

- `src/app/api/user-access/request/route.ts`
- `src/app/api/user-access/requests/route.ts`
- `src/app/api/user-access/approve/route.ts`
- `src/app/api/user-access/reject/route.ts`
- `src/app/api/user-access/toggle-access/route.ts`
- `src/app/api/user-access/regenerate-code/route.ts`
- `src/app/api/user-access/users/route.ts`
- `src/app/api/user-access/history/route.ts`
- `src/app/api/supervisors/route.ts`
- `src/lib/access-codes.ts`

## Status

✅ **Implemented and Active**
- Build: Successful
- Dashboard: Restarted with new implementation
- Production: Uses domain-based URLs (`https://metavrai.shop/api/...`)
- Development: Uses localhost URLs (`http://localhost:4000/...`)

---

**Last Updated**: 2025-11-22
**File**: `metavr-dashboard/src/lib/backend-url.ts`


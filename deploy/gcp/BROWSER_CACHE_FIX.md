# Fix: ERR_TOO_MANY_REDIRECTS in Other Browsers

## Problem

Some browsers are experiencing `ERR_TOO_MANY_REDIRECTS` when accessing `/api/applications`. This is caused by browsers caching old redirect responses.

## Root Cause

Browsers cache HTTP redirects (301, 302, 308, etc.) aggressively. Even though the server-side fix prevents redirects, browsers that previously encountered redirects may still have them cached.

## Solution

Added strict no-cache headers to the `/api/applications` location blocks in nginx to prevent browsers from caching any responses:

```nginx
add_header Cache-Control "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0" always;
add_header Pragma "no-cache" always;
add_header Expires "0" always;
```

## Applied To

- `location = /api/applications` (exact match, no trailing slash)
- `location = /api/applications/` (exact match, with trailing slash)

## User Action Required

Users experiencing this issue should:

1. **Clear browser cache completely:**
   - Chrome/Edge: `Ctrl+Shift+Delete` → Select "Cached images and files" → Clear data
   - Firefox: `Ctrl+Shift+Delete` → Select "Cache" → Clear Now
   - Safari: `Cmd+Option+E` (Mac) or `Ctrl+Shift+Delete` (Windows)

2. **Hard refresh:**
   - `Ctrl+Shift+R` (Windows/Linux)
   - `Cmd+Shift+R` (Mac)

3. **Use Incognito/Private mode:**
   - This bypasses cache entirely

4. **Clear site data:**
   - Open DevTools (F12)
   - Application tab → Storage → Clear site data

## Verification

After the fix:
- Server returns 401 (no redirects) ✓
- No-cache headers prevent browser caching ✓
- New requests won't be cached ✓

## Status

✅ **Fixed and Applied**

---

**File:** `deploy/gcp/nginx.conf`
**Lines:** 62-75, 77-90
**Action:** Added no-cache headers to prevent browser caching


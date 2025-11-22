<!-- f6da8d02-a0ff-4e4c-a212-4a7704dca298 889a0bea-72cb-4e30-892f-5bc7eecc62e4 -->
# Hybrid App Config Page Tracking Plan

## Overview

Track supervisor time spent on each app's config pages using a two-part approach:

1. **Supervisor Portal Tracking**: Record "config opened" events when supervisors click "Configure" (works for all URLs)
2. **App Config Page Tracking**: Track actual time spent on config pages (works for same-origin routes only)

## 1. Supervisor Portal: Track Config Opens

**File**: `metavr-dashboard/src/app/supervisor/applications/page.tsx`

- Modify `openAppConfigPage()` to send tracking event BEFORE opening config page
- Get supervisor ID from session (need to fetch session or pass via context)
- Include app metadata: `appId`, `appName`, `appPath`, `configRoute`
- Append tracking params to URL: `?supervisorId=...&appId=...&source=supervisor-portal&openedAt=...`
- Handle all three cases: external URLs, localhost ports, same-origin routes

**Key changes**:

- Add async tracking call before `window.open()`
- Build URL with tracking query parameters
- Store "config opened" event with `action: 'opened'`, `timeSpentMs: 0`

## 2. Enhanced API: Handle Both Event Types

**File**: `metavr-dashboard/src/app/api/page-activity/route.ts`

- Extend POST handler to accept `action` field: `'opened'` | `'session'` | null
- Add `appId` field to payload (required for config pages)
- For `action === 'opened'`: Store with `enteredAt === exitedAt`, `timeSpentMs: 0`
- For `action === 'session'` or null: Normal time tracking with calculated `timeSpentMs`
- Store `appId` in document for filtering/aggregation

**Data structure**:

```typescript
{
  supervisorId: string,
  pageId: string, // e.g., "app-config-{appId}"
  pageType: 'config',
  action: 'opened' | 'session' | null,
  appId: string, // NEW
  enteredAt: Date,
  exitedAt: Date,
  timeSpentMs: number,
  metadata: { source, appName, ... }
}
```

## 3. App Config Pages: Track Actual Time

**Files**:

- `apps/iq-questions/app/config/page.tsx`
- `apps/card_matching/src/app/config/page.tsx`
- Any future app config pages

**Approach Options**:

### Option A: Shared Tracking Hook (Recommended)

- Create shared package/library with `usePageTiming` hook
- Apps import and use it in their config pages
- Read `supervisorId`, `appId` from URL params
- Only track if params present (opened from supervisor portal)

### Option B: Dashboard API Endpoint

- Apps call dashboard API directly: `POST /api/page-activity`
- Requires CORS configuration if apps are on different origins
- Apps need to know dashboard URL

### Option C: Supervisor Portal Only (Simpler, Less Accurate)

- Only track "opened" events from supervisor portal
- No time tracking on app pages
- Simpler but can't measure actual time spent

**Implementation** (Option A):

- Extract `usePageTiming` to shared location or npm package
- In each app's config page, add:
  ```typescript
  const searchParams = useSearchParams();
  const supervisorId = searchParams.get('supervisorId');
  const appId = searchParams.get('appId');
  
  usePageTiming({
    pageId: `app-config-${appId}`,
    pageType: 'config',
    enabled: !!supervisorId && !!appId,
    metadata: { appId, supervisorId, source: 'app-config-page' }
  });
  ```


## 4. Aggregation: Combine Opens + Sessions

**File**: `metavr-dashboard/src/lib/analytics/page-activity.ts`

- Add `getSupervisorAppConfigUsage(supervisorId, appId?, dateRange?)` function
- Query both event types:
  - Opens: `where('action', '==', 'opened')`
  - Sessions: `where('action', 'in', ['session', null])`
- Aggregate:
  - Total opens per app
  - Total time from sessions per app
  - Average time per session
  - Coverage: sessions/opens ratio

**Return structure**:

```typescript
{
  appId: string,
  appName: string,
  opens: number,
  sessions: number,
  totalTimeMs: number,
  avgTimeMs: number,
  coverage: number // sessions/opens
}
```

## 5. Admin UI: Show Per-App Config Usage

**File**: `metavr-dashboard/src/app/admin/supervisors/page.tsx`

- Update `SupervisorUsageDialog` to show per-app breakdown
- Add filter: "All Pages" | "Dashboard Only" | "Config Pages Only"
- Group config pages by app:
  - Show app name as section header
  - List config pages under each app
  - Show opens count + time spent + coverage
- Update table columns: App, Page, Opens, Sessions, Time Spent, Avg Time, Coverage

**UI Structure**:

```
Supervisor: John Doe
Filter: [All] [Dashboard] [Config Pages]

Config Pages by App:
  ┌─ Card Matching ─────────────────────┐
  │ Config Page                          │
  │ Opens: 15 | Sessions: 12 | 2h 30m   │
  │ Coverage: 80% (3 external URLs)     │
  └──────────────────────────────────────┘
  
  ┌─ IQ Questions ──────────────────────┐
  │ Config Page                          │
  │ Opens: 8 | Sessions: 8 | 45m        │
  │ Coverage: 100%                       │
  └──────────────────────────────────────┘
```

## 6. Firestore Indexes

**Required indexes**:

- `page_activity_logs`: `supervisorId` ASC, `appId` ASC, `enteredAt` DESC
- `page_activity_logs`: `supervisorId` ASC, `action` ASC, `enteredAt` DESC
- `page_activity_logs`: `appId` ASC, `enteredAt` DESC (for cross-supervisor app analytics)

## Implementation Order

1. **Phase 1**: Supervisor portal tracking (immediate coverage)

   - Modify `openAppConfigPage()` to track opens
   - Update API to handle `action: 'opened'` events
   - Test with external URLs, localhost ports, same-origin routes

2. **Phase 2**: App config page tracking (accurate time)

   - Extract/create shared tracking hook
   - Add tracking to existing app config pages
   - Update API to handle `action: 'session'` events
   - Test time tracking on same-origin routes

3. **Phase 3**: Aggregation & Reporting

   - Add `getSupervisorAppConfigUsage()` function
   - Update admin UI to show per-app breakdown
   - Add Firestore indexes
   - Test end-to-end flow

## Considerations

- **Session Management**: Need to get supervisor ID in supervisor portal (may need session context/hook)
- **URL Params**: External URLs may strip query params; handle gracefully
- **CORS**: If apps are on different origins, configure CORS for API calls
- **Shared Code**: Decide on approach for sharing tracking hook between dashboard and apps
- **Backward Compatibility**: Existing page activity logs won't have `appId`; handle nulls in queries

### To-dos

- [ ] Instrument FE to emit enter/exit events
- [ ] Add API + storage for page activity logs
- [ ] Plan analytics queries/visuals
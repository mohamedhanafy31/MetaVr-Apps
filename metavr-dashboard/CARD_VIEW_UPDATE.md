# Card View Update for Tablet & Mobile

## ✅ Changes Applied

Updated the access-requests page to show **cards instead of tables** on tablet and mobile devices.

### Before:
- **Desktop (≥ 1024px)**: Table view ✅
- **Tablet (768px - 1023px)**: Table view ❌
- **Mobile (< 768px)**: Card view ✅

### After:
- **Desktop/Laptop (≥ 1024px)**: Table view ✅
- **Tablet (768px - 1023px)**: Card view ✅
- **Mobile (< 768px)**: Card view ✅

## Changes Made

**File:** `src/app/supervisor/access-requests/page.tsx`

1. **Removed** the tablet table view (lines 445-555)
2. **Changed** mobile card view breakpoint from `md:hidden` to `lg:hidden`
   - Now shows cards on both tablet and mobile
   - Only desktop/laptop (≥ 1024px) shows table

## Breakpoints

- **`lg:block`** (≥ 1024px): Desktop table view
- **`lg:hidden`** (< 1024px): Tablet & mobile card view

## Card View Features

The card view includes:
- ✅ User information (Email, Name, Phone) with icons
- ✅ Status badge
- ✅ Current Access badges
- ✅ Requested date/time
- ✅ Action buttons (Approve/Reject/Regenerate)
- ✅ Full-width buttons for easy tapping
- ✅ Proper text wrapping for long content

## Testing

Test on different screen sizes:
- **Desktop (1920px)**: Should show table
- **Tablet (768px)**: Should show cards ✅
- **Mobile (375px)**: Should show cards ✅

## Deployment

After building and deploying, the changes will be live:
```bash
cd metavr-dashboard
npm run build
# Deploy to production
```

---

**Status:** ✅ Complete
**Impact:** Better UX on tablet and mobile devices


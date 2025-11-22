# AI-npc Environment Configuration

## Summary

AI-npc app has been added to the system. To ensure it works properly with domain-based URLs, the following environment variables need to be configured:

## Required Environment Variables

### 1. AI-npc App (`apps/AI-npc/.env`)

Create or update `apps/AI-npc/.env` with:

```bash
NEXT_PUBLIC_DASHBOARD_URL=https://your-domain.com
NEXT_PUBLIC_BACKEND_URL=http://your-backend-host:4000
```

**Note:** Currently, AI-npc doesn't use these variables, but they're set up for future integration with tracking/auth features (similar to card_matching and iq-questions).

### 2. Backend (`backend/.env`)

Update `DASHBOARD_ORIGIN` to include AI-npc port (3003):

```bash
DASHBOARD_ORIGIN=https://your-domain.com,http://your-ip:3001,http://your-ip:3002,http://your-ip:3003
```

This allows CORS requests from the AI-npc app to the backend.

### 3. Dashboard (`metavr-dashboard/.env` or `.env.local`)

No changes needed - dashboard already has the required variables.

## Automated Setup

The `update-env-to-domain.sh` script has been updated to automatically configure AI-npc:

```bash
./update-env-to-domain.sh your-domain.com [backend-host]
```

This will:
- Update `apps/AI-npc/.env` with dashboard and backend URLs
- Update `backend/.env` DASHBOARD_ORIGIN to include port 3003
- Update other apps' .env files

## Manual Setup

If you prefer to set up manually:

1. **Create `apps/AI-npc/.env`:**
   ```bash
   cd apps/AI-npc
   cat > .env << EOF
   NEXT_PUBLIC_DASHBOARD_URL=https://your-domain.com
   NEXT_PUBLIC_BACKEND_URL=http://your-backend-host:4000
   EOF
   ```

2. **Update `backend/.env`:**
   ```bash
   # Add port 3003 to DASHBOARD_ORIGIN
   DASHBOARD_ORIGIN=https://your-domain.com,http://your-ip:3001,http://your-ip:3002,http://your-ip:3003
   ```

## Verification

After setting up:

1. Restart the backend to apply CORS changes
2. Restart AI-npc app if it's running
3. Verify the app can communicate with backend (when auth/tracking is implemented)

## Current Status

- ✅ AI-npc added to `apps-map.json`
- ✅ `update-env-to-domain.sh` updated to include AI-npc
- ✅ Backend will discover AI-npc on restart
- ⚠️  Manual .env files need to be created/updated
- ⚠️  Backend DASHBOARD_ORIGIN needs to include port 3003


# MetaVR Management System - Setup Guide

Complete setup and configuration guide for the MetaVR platform.

## 📋 Table of Contents

1. [Prerequisites](#prerequisites)
2. [Initial Setup](#initial-setup)
3. [Environment Configuration](#environment-configuration)
4. [Firebase Setup](#firebase-setup)
5. [Database Initialization](#database-initialization)
6. [Running the System](#running-the-system)
7. [Production Deployment](#production-deployment)
8. [Troubleshooting](#troubleshooting)

---

## Prerequisites

### Required Software

- **Node.js** 18+ ([Download](https://nodejs.org/))
- **npm** (comes with Node.js)
- **Git** ([Download](https://git-scm.com/))
- **Firebase Account** ([Sign up](https://firebase.google.com/))

### Optional (for production)

- **Docker** (for containerization)
- **Nginx** (for reverse proxy)
- **Domain name** (for production deployment)

---

## Initial Setup

### 1. Clone the Repository

```bash
git clone <repository-url>
cd managment_test
```

### 2. Install Dependencies

Install dependencies for all projects:

```bash
# Root dependencies (if any)
npm install

# Backend
cd backend
npm install
cd ..

# Dashboard
cd metavr-dashboard
npm install
cd ..

# IQ Questions App
cd apps/iq-questions
npm install
cd ../..

# Card Matching App
cd apps/card_matching
npm install
cd ../..

# AI NPC App
cd apps/AI-npc
npm install
cd ../..
```

---

## Environment Configuration

### 1. Backend Configuration

Create `backend/.env`:

```bash
cd backend
cat > .env << EOF
# Node Environment
NODE_ENV=development

# Server Configuration
PORT=4000

# CORS Origins (comma-separated)
DASHBOARD_ORIGIN=http://localhost:3000,http://localhost:3001,http://localhost:3002,http://localhost:3003

# Session Configuration
SESSION_SECRET=your-secure-session-secret-here
SESSION_TOKEN_ISSUER=metavr-backend
SESSION_TOKEN_AUDIENCE=metavr-dashboard

# Optional: RS256 Keypair (for enhanced security)
# SESSION_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----"
# SESSION_PUBLIC_KEY="-----BEGIN PUBLIC KEY-----\n...\n-----END PUBLIC KEY-----"

# Firebase Configuration
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_SERVICE_ACCOUNT_JSON={"type":"service_account",...}

# Email Configuration (if using email service)
EMAIL_FROM=noreply@metavr.com
EMAIL_SMTP_HOST=smtp.example.com
EMAIL_SMTP_PORT=587
EMAIL_SMTP_USER=your-email@example.com
EMAIL_SMTP_PASS=your-email-password
EOF
cd ..
```

**Generate Secure Secrets:**

```bash
# Generate SESSION_SECRET (32 bytes)
openssl rand -base64 32

# Generate ADMIN_SETUP_TOKEN (32 bytes)
openssl rand -base64 32
```

### 2. Dashboard Configuration

Create `metavr-dashboard/.env.local`:

```bash
cd metavr-dashboard
cat > .env.local << EOF
# Node Environment
NODE_ENV=development

# Session Configuration (must match backend)
SESSION_SECRET=your-secure-session-secret-here
NEXT_PUBLIC_SESSION_ISSUER=metavr-backend
NEXT_PUBLIC_SESSION_AUDIENCE=metavr-dashboard

# Optional: RS256 Public Key (if using RS256)
# SESSION_PUBLIC_KEY="-----BEGIN PUBLIC KEY-----\n...\n-----END PUBLIC KEY-----"

# Admin Setup Token
ADMIN_SETUP_TOKEN=your-admin-setup-token-here

# Application URLs
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_BACKEND_URL=http://localhost:4000

# Firebase Configuration
FIREBASE_SERVICE_ACCOUNT_JSON={"type":"service_account",...}
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your-sender-id
NEXT_PUBLIC_FIREBASE_APP_ID=your-app-id
EOF
cd ..
```

### 3. App Configuration

Each app needs minimal configuration. Create `.env` files if needed:

**IQ Questions** (`apps/iq-questions/.env`):
```bash
NEXT_PUBLIC_DASHBOARD_URL=http://localhost:3000
NEXT_PUBLIC_BACKEND_URL=http://localhost:4000
```

**Card Matching** (`apps/card_matching/.env`):
```bash
NEXT_PUBLIC_DASHBOARD_URL=http://localhost:3000
NEXT_PUBLIC_BACKEND_URL=http://localhost:4000
```

**AI NPC** (`apps/AI-npc/.env`):
```bash
NEXT_PUBLIC_DASHBOARD_URL=http://localhost:3000
NEXT_PUBLIC_BACKEND_URL=http://localhost:4000
```

### 4. Validate Configuration

Run the validation script to ensure all required environment variables are set:

```bash
./scripts/validate-env.sh
```

---

## Firebase Setup

### 1. Create Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click "Add project"
3. Enter project name (e.g., "metavr-apps")
4. Follow the setup wizard

### 2. Enable Firestore Database

1. In Firebase Console, go to **Firestore Database**
2. Click "Create database"
3. Start in **production mode** (you can add security rules later)
4. Choose a location for your database

### 3. Get Service Account Key

1. Go to **Project Settings** → **Service Accounts**
2. Click "Generate new private key"
3. Download the JSON file
4. Copy the entire JSON content to `FIREBASE_SERVICE_ACCOUNT_JSON` in your `.env` files

### 4. Get Client Configuration

1. Go to **Project Settings** → **General**
2. Scroll to "Your apps" section
3. Click the web icon (`</>`) to add a web app
4. Copy the configuration values:
   - `apiKey`
   - `authDomain`
   - `projectId`
   - `storageBucket`
   - `messagingSenderId`
   - `appId`

### 5. Set Up Security Rules (Optional)

In Firestore, go to **Rules** and add:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Add your security rules here
    match /{document=**} {
      allow read, write: if request.auth != null;
    }
  }
}
```

**Note:** Adjust rules based on your security requirements.

---

## Database Initialization

### 1. Create Admin User

The backend provides a script to create the initial admin user:

```bash
cd backend
npm run create-admin
```

Or use the API endpoint:

```bash
curl -X POST http://localhost:4000/auth/create-admin \
  -H "Content-Type: application/json" \
  -H "X-Admin-Setup-Token: your-admin-setup-token" \
  -d '{
    "email": "admin@metavr.com",
    "password": "Admin123!",
    "name": "Admin User"
  }'
```

**Default Admin Credentials:**
- Email: `admin@metavr.com`
- Password: `Admin123!`

⚠️ **Change these credentials in production!**

### 2. Initialize Dashboard Database

```bash
cd metavr-dashboard
npm run init-db
```

This creates initial collections and sample data.

---

## Running the System

### Development Mode

#### Option 1: Run All Services (Recommended)

```bash
./run_all.sh
```

This script:
- Builds all services
- Starts them in production mode
- Logs output to `logs/run-all/`

#### Option 2: Run Services Individually

**Terminal 1 - Backend:**
```bash
cd backend
npm run start:dev
```

**Terminal 2 - Dashboard:**
```bash
cd metavr-dashboard
npm run dev
```

**Terminal 3 - IQ Questions:**
```bash
cd apps/iq-questions
npm run dev
```

**Terminal 4 - Card Matching:**
```bash
cd apps/card_matching
npm run dev
```

**Terminal 5 - AI NPC:**
```bash
cd apps/AI-npc
npm run dev
```

### Verify Services

Check that all services are running:

```bash
# Backend
curl http://localhost:4000/health

# Dashboard
curl http://localhost:3000

# Apps
curl http://localhost:3001
curl http://localhost:3002
curl http://localhost:3003
```

---

## Production Deployment

### 1. Update Environment Variables

Update all `.env` files with production values:

```bash
# Use the domain update script
./update-env-to-domain.sh metavrai.shop
```

Or manually update:
- `NEXT_PUBLIC_APP_URL=https://metavrai.shop`
- `NEXT_PUBLIC_BACKEND_URL=https://metavrai.shop/api`
- `DASHBOARD_ORIGIN=https://metavrai.shop`

### 2. Build All Services

```bash
# Backend
cd backend && npm run build && cd ..

# Dashboard
cd metavr-dashboard && npm run build && cd ..

# Apps
cd apps/iq-questions && npm run build && cd ../..
cd apps/card_matching && npm run build && cd ../..
cd apps/AI-npc && npm run build && cd ../..
```

### 3. Configure Nginx

See `deploy/gcp/nginx.conf` for nginx configuration example.

Key routes:
- `/` → Dashboard (port 3000)
- `/iq-questions/` → IQ Questions (port 3001)
- `/card-matching/` → Card Matching (port 3002)
- `/AI-npc/` → AI NPC (port 3003)
- `/api/*` → Backend API (port 4000)

### 4. Start Services

```bash
# Using the run script
./run_all.sh

# Or manually
cd backend && PORT=4000 npm run start:prod &
cd metavr-dashboard && PORT=3000 npm run start &
cd apps/iq-questions && PORT=3001 npm run start &
cd apps/card_matching && PORT=3002 npm run start &
cd apps/AI-npc && PORT=3003 npm run start &
```

### 5. Docker Deployment (Optional)

```bash
docker-compose up -d
```

---

## Troubleshooting

### Common Issues

#### 1. Port Already in Use

```bash
# Find process using port
lsof -i :3000
lsof -i :4000

# Kill process
kill -9 <PID>
```

Or use the kill script:
```bash
./kill-ports.sh
```

#### 2. Environment Variables Not Loading

- Ensure `.env` files are in the correct directories
- Check file names (`.env.local` for dashboard)
- Restart the service after changing `.env` files

#### 3. Firebase Connection Errors

- Verify `FIREBASE_SERVICE_ACCOUNT_JSON` is valid JSON
- Check Firebase project ID matches
- Ensure Firestore is enabled in Firebase Console

#### 4. Session/Authentication Issues

- Verify `SESSION_SECRET` matches between backend and dashboard
- Check `SESSION_TOKEN_ISSUER` and `SESSION_TOKEN_AUDIENCE` match
- Clear browser cookies and try again

#### 5. CORS Errors

- Update `DASHBOARD_ORIGIN` in backend `.env` to include all origins
- Check nginx configuration allows CORS headers

#### 6. Build Errors

```bash
# Clean and rebuild
rm -rf node_modules .next dist
npm install
npm run build
```

### Getting Help

1. Check logs in `logs/` directory
2. Review error messages in browser console
3. Check service health endpoints
4. Review [PROJECTS_OVERVIEW.md](./PROJECTS_OVERVIEW.md) for architecture details

---

## Next Steps

After setup:

1. ✅ Access dashboard at `http://localhost:3000`
2. ✅ Login with admin credentials
3. ✅ Create users and assign access codes
4. ✅ Test app access with access codes
5. ✅ Configure apps via supervisor pages
6. ✅ Review analytics in dashboard

---

## Additional Resources

- [README.md](./README.md) - Project overview
- [PROJECTS_OVERVIEW.md](./PROJECTS_OVERVIEW.md) - Detailed architecture
- [Backend README](./backend/README.md) - Backend-specific docs
- [Dashboard README](./metavr-dashboard/README.md) - Dashboard-specific docs

---

**Need help?** Open an issue on the repository or check the troubleshooting section above.


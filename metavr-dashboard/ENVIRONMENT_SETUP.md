# Environment Variables Setup Guide

This guide explains how to properly configure environment variables for the MetaVR Dashboard project.

## 📋 Table of Contents

1. [Quick Start](#quick-start)
2. [Required Environment Variables](#required-environment-variables)
3. [Firebase Configuration](#firebase-configuration)
4. [Security Secrets](#security-secrets)
5. [Development Setup](#development-setup)
6. [Production Setup](#production-setup)
7. [Troubleshooting](#troubleshooting)

## 🚀 Quick Start

### Step 1: Copy the Example File
```bash
cp env.example .env.local
```

### Step 2: Generate Security Secrets
```bash
npm run generate-secrets
```

### Step 3: Update .env.local
Copy the generated secrets to your `.env.local` file and add your Firebase credentials.

### Step 4: Validate Secrets
From the repository root run:
```bash
./scripts/validate-env.sh
```
This ensures both the backend and dashboard have the required `SESSION_SECRET` (and optional RSA keypair) before you start the app.

---

## 🔧 Required Environment Variables

### Core Application Settings
```bash
# Node Environment
NODE_ENV=development

# Session Management (Required for authentication)
SESSION_SECRET=your-secure-session-secret-here
# Optional: enable RS256 verification using the backend public key
# SESSION_PUBLIC_KEY="-----BEGIN PUBLIC KEY-----\n...\n-----END PUBLIC KEY-----"
NEXT_PUBLIC_SESSION_ISSUER=metavr-backend
NEXT_PUBLIC_SESSION_AUDIENCE=metavr-dashboard

# Admin Setup Token (Required for initial admin user creation API)
ADMIN_SETUP_TOKEN=your-secure-admin-setup-token-here
```

### Firebase Configuration
```bash
# Firebase Service Account (JSON format - RECOMMENDED)
FIREBASE_SERVICE_ACCOUNT_JSON={"type":"service_account",...}

# Firebase Client Configuration (Publicly accessible)
NEXT_PUBLIC_FIREBASE_API_KEY=your-firebase-api-key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your-messaging-sender-id
NEXT_PUBLIC_FIREBASE_APP_ID=your-firebase-app-id
```

### Application Settings
```bash
NEXT_PUBLIC_APP_NAME=MetaVR Dashboard
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

---

## 🔥 Firebase Configuration

### Option 1: JSON Environment Variable (Recommended)

1. **Get Firebase Service Account Key**:
   - Go to [Firebase Console](https://console.firebase.google.com/)
   - Select your project
   - Go to Project Settings → Service Accounts
   - Click "Generate new private key"
   - Download the JSON file

2. **Convert to Single Line**:
   ```bash
   # Method 1: Using jq (if installed)
   cat firebase-service-account.json | jq -c . > firebase-compact.json
   
   # Method 2: Manual conversion
   # Remove all line breaks and spaces, keep as single line JSON
   ```

3. **Add to .env.local**:
   ```bash
   FIREBASE_SERVICE_ACCOUNT_JSON={"type":"service_account","project_id":"your-project",...}
   ```

### Option 2: Base64 Encoded (Alternative)

1. **Encode the JSON file**:
   ```bash
   base64 -i firebase-service-account.json -o firebase-base64.txt
   ```

2. **Add to .env.local**:
   ```bash
   FIREBASE_SERVICE_ACCOUNT_KEY=eyJ0eXBlIjoic2VydmljZV9hY2NvdW50Ii...
   ```

### Firebase Client Configuration

1. **Get Client Configuration**:
   - Go to Firebase Console → Project Settings → General
   - Scroll to "Your apps" section
   - If no web app exists, click "Add app" → Web
   - Copy the configuration values

2. **Add to .env.local**:
   ```bash
   NEXT_PUBLIC_FIREBASE_API_KEY=AIzaSyYourRealApiKeyHere
   NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
   NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
   NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
   NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789012
   NEXT_PUBLIC_FIREBASE_APP_ID=1:123456789012:web:abcdef123456
   ```

---

## 🔐 Security Secrets

### Generate Secure Secrets

Use the built-in script to generate cryptographically secure secrets:

```bash
npm run generate-secrets
```

This will output:
```
🔐 MetaVR Dashboard - Secret Generator
=====================================

Generated secure secrets:
========================

SESSION_SECRET=IpY1cA52JhfUYwQTolKTmGHsHF6OQ8MV9ll/In+HtrA=
ADMIN_SETUP_TOKEN=qUdFkD+M04jnahgdp/UIGx5IOXglQ26salTG5f4kVDI=
```

### Manual Generation (Alternative)

If you prefer to generate secrets manually:

```bash
# Generate SESSION_SECRET (32 bytes = 256 bits)
openssl rand -base64 32

# Generate ADMIN_SETUP_TOKEN (32 bytes = 256 bits)
openssl rand -base64 32
```

### Security Notes

- **SESSION_SECRET**: Required for startup validation (32 bytes = 256 bits). Always rotate via your secrets manager.
- **SESSION_PUBLIC_KEY**: Optional PEM that lets the dashboard verify RS256 tokens while the backend keeps the private key secret.
- **ADMIN_SETUP_TOKEN**: Used for admin user creation API protection.
- **Never commit these secrets** to version control.
- **Use different secrets** for development, staging, and production.
- **Regenerate secrets** if compromised.

---

## 🛠️ Development Setup

### Step-by-Step Setup

1. **Clone and Install**:
   ```bash
   git clone https://github.com/mohamedhanafy31/MetaVrApps.git
   cd MetaVrApps
   npm install
   ```

2. **Create Environment File**:
   ```bash
   cp env.example .env.local
   ```

3. **Generate Secrets**:
   ```bash
   npm run generate-secrets
   ```

4. **Update .env.local**:
   - Copy the generated secrets
   - Add your Firebase credentials
   - Update Firebase client configuration

5. **Initialize Database**:
   ```bash
   npm run init-db
   ```

6. **Start Development Server**:
   ```bash
   npm run dev
   ```

### Example .env.local for Development

```bash
# Core Application Settings
NODE_ENV=development
SESSION_SECRET=IpY1cA52JhfUYwQTolKTmGHsHF6OQ8MV9ll/In+HtrA=
ADMIN_SETUP_TOKEN=qUdFkD+M04jnahgdp/UIGx5IOXglQ26salTG5f4kVDI=

# Firebase Service Account
FIREBASE_SERVICE_ACCOUNT_JSON={"type":"service_account","project_id":"metavrapps",...}

# Firebase Client Configuration
NEXT_PUBLIC_FIREBASE_API_KEY=AIzaSyYourRealApiKeyHere
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=metavrapps.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=metavrapps
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=metavrapps.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789012
NEXT_PUBLIC_FIREBASE_APP_ID=1:123456789012:web:abcdef123456

# Application Settings
NEXT_PUBLIC_APP_NAME=MetaVR Dashboard
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

---

## 🚀 Production Setup

### Environment Variables for Production

1. **Use Production Secrets**:
   - Generate new secrets for production
   - Never reuse development secrets

2. **Production Firebase Project**:
   - Use a separate Firebase project for production
   - Ensure proper security rules are configured

3. **Environment-Specific Values**:
   ```bash
   NODE_ENV=production
   NEXT_PUBLIC_APP_URL=https://your-domain.com
   ```

### Deployment Platforms

#### Netlify
1. Go to Site Settings → Environment Variables
2. Add all required environment variables
3. Ensure `NEXT_PUBLIC_` variables are set correctly

#### Vercel
1. Go to Project Settings → Environment Variables
2. Add all required environment variables
3. Set environment scope (Production, Preview, Development)

#### Docker
```dockerfile
# Dockerfile example
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build
EXPOSE 3000
CMD ["npm", "start"]
```

```bash
# docker-compose.yml example
version: '3.8'
services:
  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - SESSION_SECRET=${SESSION_SECRET}
      - ADMIN_SETUP_TOKEN=${ADMIN_SETUP_TOKEN}
      - FIREBASE_SERVICE_ACCOUNT_JSON=${FIREBASE_SERVICE_ACCOUNT_JSON}
    env_file:
      - .env.production
```

---

## 🔍 Troubleshooting

### Common Issues

#### 1. "Firebase credentials not found"
**Error**: `Firebase credentials not found. Set FIREBASE_SERVICE_ACCOUNT_JSON or FIREBASE_SERVICE_ACCOUNT_KEY environment variable.`

**Solution**:
- Check if `.env.local` exists
- Verify `FIREBASE_SERVICE_ACCOUNT_JSON` is set
- Ensure the JSON is properly formatted (single line)
- Check for typos in variable names

#### 2. "SESSION_SECRET environment variable must be set"
**Error**: `SESSION_SECRET environment variable must be set`

**Solution**:
- Run `npm run generate-secrets`
- Copy the generated `SESSION_SECRET` to `.env.local`
- Restart the development server

#### 3. Firebase Admin SDK initialization failed
**Error**: `Firebase Admin SDK initialization failed`

**Solution**:
- Verify Firebase service account JSON is valid
- Check if the service account has proper permissions
- Ensure the project ID matches your Firebase project

#### 4. Client-side Firebase errors
**Error**: Firebase client SDK errors

**Solution**:
- Verify all `NEXT_PUBLIC_FIREBASE_*` variables are set
- Check Firebase project configuration
- Ensure Firebase project has proper security rules

### Debugging Commands

```bash
# Check if environment variables are loaded
npm run dev
# Look for console logs showing Firebase initialization

# Test Firebase connection
npm run init-db
# Should show "✅ Firebase Admin SDK initialized successfully"

# Verify secrets are generated
npm run generate-secrets
# Should show generated secrets
```

### Environment Variable Validation

Create a simple validation script to check all required variables:

```bash
#!/bin/bash
# validate-env.sh

echo "🔍 Validating environment variables..."

# Check if .env.local exists
if [ ! -f .env.local ]; then
    echo "❌ .env.local file not found"
    exit 1
fi

# Check required variables
source .env.local

if [ -z "$SESSION_SECRET" ]; then
    echo "❌ SESSION_SECRET not set"
    exit 1
fi

if [ -z "$ADMIN_SETUP_TOKEN" ]; then
    echo "❌ ADMIN_SETUP_TOKEN not set"
    exit 1
fi

if [ -z "$FIREBASE_SERVICE_ACCOUNT_JSON" ]; then
    echo "❌ FIREBASE_SERVICE_ACCOUNT_JSON not set"
    exit 1
fi

echo "✅ All required environment variables are set"
```

---

## 📚 Additional Resources

- [Next.js Environment Variables](https://nextjs.org/docs/basic-features/environment-variables)
- [Firebase Admin SDK Setup](https://firebase.google.com/docs/admin/setup)
- [Firebase Client SDK Setup](https://firebase.google.com/docs/web/setup)
- [Security Best Practices](https://firebase.google.com/docs/rules)

---

## 🆘 Support

If you encounter issues:

1. Check the [Troubleshooting](#troubleshooting) section
2. Verify all environment variables are set correctly
3. Check Firebase project configuration
4. Review the console logs for specific error messages

For additional help, please refer to the project documentation or create an issue in the repository.

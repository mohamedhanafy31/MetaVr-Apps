# GitHub & Netlify Environment Variables Setup

This guide explains how to configure environment variables for deployment on GitHub and Netlify.

## 📋 Table of Contents

1. [GitHub Repository Setup](#github-repository-setup)
2. [Netlify Deployment](#netlify-deployment)
3. [Environment Variables Configuration](#environment-variables-configuration)
4. [Security Best Practices](#security-best-practices)
5. [Troubleshooting](#troubleshooting)

---

## 🐙 GitHub Repository Setup

### Step 1: Repository Configuration

1. **Go to your GitHub repository**: `https://github.com/mohamedhanafy31/MetaVrApps`

2. **Enable GitHub Actions** (if using CI/CD):
   - Go to repository → Actions tab
   - Enable GitHub Actions if not already enabled

3. **Configure Branch Protection** (recommended):
   - Go to Settings → Branches
   - Add rule for `main` branch
   - Enable "Require pull request reviews"
   - Enable "Require status checks to pass"

### Step 2: Repository Secrets (for CI/CD)

If you're using GitHub Actions for deployment:

1. **Go to Repository Settings**:
   - Navigate to your repository
   - Click "Settings" tab
   - Click "Secrets and variables" → "Actions"

2. **Add Repository Secrets**:
   ```
   FIREBASE_SERVICE_ACCOUNT_JSON
   SESSION_SECRET
   ADMIN_SETUP_TOKEN
   NEXT_PUBLIC_FIREBASE_API_KEY
   NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN
   NEXT_PUBLIC_FIREBASE_PROJECT_ID
   NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET
   NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID
   NEXT_PUBLIC_FIREBASE_APP_ID
   NEXT_PUBLIC_APP_NAME
   NEXT_PUBLIC_APP_URL
   ```

3. **Add Each Secret**:
   - Click "New repository secret"
   - Name: `FIREBASE_SERVICE_ACCOUNT_JSON`
   - Value: Your complete Firebase service account JSON (single line)
   - Click "Add secret"
   - Repeat for all other variables

### Step 3: GitHub Actions Workflow (Optional)

Create `.github/workflows/deploy.yml`:

```yaml
name: Deploy to Netlify

on:
  push:
    branches: [ main ]
  pull_request:
    branches: [ main ]

jobs:
  deploy:
    runs-on: ubuntu-latest
    
    steps:
    - uses: actions/checkout@v3
    
    - name: Setup Node.js
      uses: actions/setup-node@v3
      with:
        node-version: '18'
        cache: 'npm'
    
    - name: Install dependencies
      run: npm ci
    
    - name: Build application
      run: npm run build
      env:
        FIREBASE_SERVICE_ACCOUNT_JSON: ${{ secrets.FIREBASE_SERVICE_ACCOUNT_JSON }}
        SESSION_SECRET: ${{ secrets.SESSION_SECRET }}
        ADMIN_SETUP_TOKEN: ${{ secrets.ADMIN_SETUP_TOKEN }}
        NEXT_PUBLIC_FIREBASE_API_KEY: ${{ secrets.NEXT_PUBLIC_FIREBASE_API_KEY }}
        NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: ${{ secrets.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN }}
        NEXT_PUBLIC_FIREBASE_PROJECT_ID: ${{ secrets.NEXT_PUBLIC_FIREBASE_PROJECT_ID }}
        NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET: ${{ secrets.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET }}
        NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID: ${{ secrets.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID }}
        NEXT_PUBLIC_FIREBASE_APP_ID: ${{ secrets.NEXT_PUBLIC_FIREBASE_APP_ID }}
        NEXT_PUBLIC_APP_NAME: ${{ secrets.NEXT_PUBLIC_APP_NAME }}
        NEXT_PUBLIC_APP_URL: ${{ secrets.NEXT_PUBLIC_APP_URL }}
    
    - name: Deploy to Netlify
      uses: nwtgck/actions-netlify@v2.0
      with:
        publish-dir: './out'
        production-branch: main
        github-token: ${{ secrets.GITHUB_TOKEN }}
        deploy-message: "Deploy from GitHub Actions"
        enable-pull-request-comment: false
        enable-commit-comment: true
        overwrites-pull-request-comment: true
      env:
        NETLIFY_AUTH_TOKEN: ${{ secrets.NETLIFY_AUTH_TOKEN }}
        NETLIFY_SITE_ID: ${{ secrets.NETLIFY_SITE_ID }}
```

---

## 🚀 Netlify Deployment

### Step 1: Connect Repository to Netlify

1. **Go to Netlify Dashboard**: https://app.netlify.com/

2. **Create New Site**:
   - Click "New site from Git"
   - Choose "GitHub" as provider
   - Select your repository: `mohamedhanafy31/MetaVrApps`
   - Choose branch: `main`

3. **Configure Build Settings**:
   ```
   Build command: npm run build
   Publish directory: .next
   ```

4. **Advanced Build Settings**:
   - Go to Site settings → Build & deploy → Environment variables
   - Add all required environment variables

### Step 2: Netlify Environment Variables

1. **Go to Site Settings**:
   - Navigate to your site in Netlify dashboard
   - Go to "Site settings"
   - Click "Environment variables"

2. **Add Environment Variables**:

   **Required Variables**:
   ```
   FIREBASE_SERVICE_ACCOUNT_JSON = {"type":"service_account",...}
   SESSION_SECRET = your-generated-session-secret
   ADMIN_SETUP_TOKEN = your-generated-admin-token
   NODE_ENV = production
   ```

   **Firebase Client Variables**:
   ```
   NEXT_PUBLIC_FIREBASE_API_KEY = AIzaSyYourRealApiKeyHere
   NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN = metavrapps.firebaseapp.com
   NEXT_PUBLIC_FIREBASE_PROJECT_ID = metavrapps
   NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET = metavrapps.appspot.com
   NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID = 123456789012
   NEXT_PUBLIC_FIREBASE_APP_ID = 1:123456789012:web:abcdef123456
   ```

   **Application Settings**:
   ```
   NEXT_PUBLIC_APP_NAME = MetaVR Dashboard
   NEXT_PUBLIC_APP_URL = https://your-site-name.netlify.app
   ```

3. **Add Each Variable**:
   - Click "Add variable"
   - Key: `FIREBASE_SERVICE_ACCOUNT_JSON`
   - Value: Your complete Firebase service account JSON
   - Click "Save"
   - Repeat for all variables

### Step 3: Netlify Configuration File

Create `netlify.toml` in your repository root:

```toml
[build]
  command = "npm run build"
  publish = ".next"

[build.environment]
  NODE_VERSION = "18"

[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200

[[headers]]
  for = "/*"
  [headers.values]
    X-Frame-Options = "DENY"
    X-XSS-Protection = "1; mode=block"
    X-Content-Type-Options = "nosniff"
    Referrer-Policy = "strict-origin-when-cross-origin"

[[headers]]
  for = "/api/*"
  [headers.values]
    Access-Control-Allow-Origin = "*"
    Access-Control-Allow-Headers = "Content-Type, Authorization"
    Access-Control-Allow-Methods = "GET, POST, PUT, DELETE, OPTIONS"
```

### Step 4: Domain Configuration

1. **Custom Domain** (Optional):
   - Go to Site settings → Domain management
   - Add your custom domain
   - Configure DNS settings

2. **Update Environment Variables**:
   - Update `NEXT_PUBLIC_APP_URL` to your custom domain
   - Redeploy the site

---

## 🔐 Security Best Practices

### GitHub Security

1. **Repository Secrets**:
   - Never commit secrets to the repository
   - Use GitHub Secrets for sensitive data
   - Rotate secrets regularly

2. **Branch Protection**:
   - Require pull request reviews
   - Require status checks
   - Restrict pushes to main branch

3. **Security Scanning**:
   - Enable Dependabot alerts
   - Enable secret scanning
   - Enable code scanning

### Netlify Security

1. **Environment Variables**:
   - Use Netlify's environment variables feature
   - Never expose secrets in build logs
   - Use different secrets for different environments

2. **Access Control**:
   - Limit team member access
   - Use role-based permissions
   - Enable two-factor authentication

3. **Build Settings**:
   - Use secure build commands
   - Enable build logs only for debugging
   - Disable debug mode in production

---

## 🛠️ Step-by-Step Deployment Process

### Complete Deployment Workflow

1. **Prepare Environment Variables**:
   ```bash
   # Generate secrets locally
   npm run generate-secrets
   
   # Copy the output for use in GitHub/Netlify
   ```

2. **GitHub Setup**:
   - Add all secrets to GitHub repository secrets
   - Configure branch protection rules
   - Set up GitHub Actions workflow (optional)

3. **Netlify Setup**:
   - Connect repository to Netlify
   - Add all environment variables
   - Configure build settings
   - Deploy the site

4. **Verify Deployment**:
   - Check build logs for errors
   - Test the deployed application
   - Verify all features work correctly

### Environment Variables Checklist

**GitHub Secrets** (for CI/CD):
- [ ] `FIREBASE_SERVICE_ACCOUNT_JSON`
- [ ] `SESSION_SECRET`
- [ ] `ADMIN_SETUP_TOKEN`
- [ ] `NEXT_PUBLIC_FIREBASE_API_KEY`
- [ ] `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`
- [ ] `NEXT_PUBLIC_FIREBASE_PROJECT_ID`
- [ ] `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`
- [ ] `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`
- [ ] `NEXT_PUBLIC_FIREBASE_APP_ID`
- [ ] `NEXT_PUBLIC_APP_NAME`
- [ ] `NEXT_PUBLIC_APP_URL`

**Netlify Environment Variables**:
- [ ] All the same variables as GitHub Secrets
- [ ] `NODE_ENV = production`

---

## 🔍 Troubleshooting

### Common GitHub Issues

1. **Secrets not available in Actions**:
   - Check if secrets are added to the correct repository
   - Verify secret names match exactly
   - Ensure the workflow has access to secrets

2. **Build failures**:
   - Check GitHub Actions logs
   - Verify all required secrets are set
   - Check for typos in secret names

### Common Netlify Issues

1. **Build failures**:
   - Check Netlify build logs
   - Verify all environment variables are set
   - Check for missing dependencies

2. **Runtime errors**:
   - Verify Firebase credentials are correct
   - Check if all `NEXT_PUBLIC_` variables are set
   - Ensure Firebase project is properly configured

3. **Environment variables not loading**:
   - Check variable names (case-sensitive)
   - Verify variables are set in correct environment
   - Redeploy after adding new variables

### Debugging Commands

```bash
# Check if environment variables are loaded
echo $FIREBASE_SERVICE_ACCOUNT_JSON

# Test Firebase connection
npm run init-db

# Validate environment setup
./scripts/validate-env.sh
```

### Support Resources

- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [Netlify Environment Variables](https://docs.netlify.com/environment-variables/overview/)
- [Next.js Deployment](https://nextjs.org/docs/deployment)
- [Firebase Hosting](https://firebase.google.com/docs/hosting)

---

## 📞 Getting Help

If you encounter issues:

1. **Check the logs**: GitHub Actions logs or Netlify build logs
2. **Verify environment variables**: Ensure all required variables are set
3. **Test locally**: Make sure the application works locally first
4. **Check documentation**: Refer to the official documentation
5. **Create an issue**: If the problem persists, create an issue in the repository

Remember: Environment variables are case-sensitive and must match exactly between your local setup and deployment platforms!

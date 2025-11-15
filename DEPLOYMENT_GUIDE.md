# 🚀 Google Cloud Deployment Guide

## Prerequisites Checklist

Before deploying, ensure you have:

- [x] ✅ Google Cloud project set up (`meta-478212`)
- [x] ✅ Service account key created
- [ ] ⚠️ **GitHub Secret added** (CRITICAL - Do this first!)
- [ ] ⚠️ Required APIs enabled
- [ ] ⚠️ Cloud Build permissions configured

## Step-by-Step Deployment Process

### Step 1: Add GitHub Secret (REQUIRED FIRST!)

**This is the most important step!** Without this, GitHub Actions will fail.

1. **Get your repository URL**:
   ```bash
   # Find your GitHub username and repo name
   git remote -v
   ```

2. **Go to GitHub Secrets**:
   - Navigate to: `https://github.com/YOUR_USERNAME/YOUR_REPO/settings/secrets/actions`
   - Or: Repository → Settings → Secrets and variables → Actions

3. **Add the secret**:
   - Click **"New repository secret"**
   - **Name**: `GCP_SA_KEY` (must be exact)
   - **Value**: Copy entire content from `github-actions-key.json`
   - Click **"Add secret"**

4. **Verify**:
   - You should see `GCP_SA_KEY` in your secrets list

### Step 2: Enable Required Google Cloud APIs

Run these commands to enable the necessary APIs:

```bash
# Set your project
gcloud config set project meta-478212

# Enable required APIs
gcloud services enable cloudresourcemanager.googleapis.com
gcloud services enable cloudbuild.googleapis.com
gcloud services enable run.googleapis.com
gcloud services enable containerregistry.googleapis.com
gcloud services enable artifactregistry.googleapis.com
```

### Step 3: Grant Cloud Build Permissions

Cloud Build needs permission to deploy to Cloud Run:

```bash
# Get your project number
PROJECT_NUMBER=$(gcloud projects describe meta-478212 --format='value(projectNumber)')

# Grant Cloud Build service account the Run Admin role
gcloud projects add-iam-policy-binding meta-478212 \
  --member="serviceAccount:${PROJECT_NUMBER}@cloudbuild.gserviceaccount.com" \
  --role="roles/run.admin"

# Grant Cloud Build service account the Service Account User role
gcloud projects add-iam-policy-binding meta-478212 \
  --member="serviceAccount:${PROJECT_NUMBER}@cloudbuild.gserviceaccount.com" \
  --role="roles/iam.serviceAccountUser"
```

### Step 4: Verify GitHub Actions Workflow

The workflow file is already configured at `.github/workflows/deploy-gcp.yml`:

- **Project ID**: `meta-478212`
- **Service Name**: `metavr-frontend`
- **Region**: `us-central1`
- **Triggers**: 
  - Automatic on push to `main` or `master`
  - Manual via GitHub Actions UI

### Step 5: Deploy via GitHub Actions

#### Option A: Automatic Deployment (Recommended)

1. **Commit and push your code**:
   ```bash
   git add .
   git commit -m "Ready for deployment"
   git push origin main
   ```

2. **Monitor deployment**:
   - Go to: `https://github.com/YOUR_USERNAME/YOUR_REPO/actions`
   - Click on the running workflow
   - Watch the deployment progress

#### Option B: Manual Deployment

1. **Go to GitHub Actions**:
   - Navigate to: `https://github.com/YOUR_USERNAME/YOUR_REPO/actions`

2. **Select workflow**:
   - Click on "Deploy to Google Cloud Run"

3. **Run workflow**:
   - Click "Run workflow"
   - Select branch: `main`
   - Environment: `production`
   - Click "Run workflow"

### Step 6: Get Your Service URL

After deployment completes, get your service URL:

```bash
gcloud run services describe metavr-frontend \
  --platform managed \
  --region us-central1 \
  --format 'value(status.url)'
```

Or check the GitHub Actions output - it will display the URL.

## Deployment Configuration

### Current Settings

- **Service Name**: `metavr-frontend`
- **Region**: `us-central1`
- **Memory**: 512Mi
- **CPU**: 1
- **Min Instances**: 0 (scales to zero)
- **Max Instances**: 10
- **Timeout**: 300 seconds
- **Port**: 80

### Custom Domain (Optional)

To use a custom domain:

```bash
# Map a custom domain
gcloud run domain-mappings create \
  --service metavr-frontend \
  --domain yourdomain.com \
  --region us-central1
```

## Troubleshooting

### Issue: "GCP_SA_KEY secret is not set"

**Solution**: Add the secret to GitHub (Step 1 above)

### Issue: "Permission denied" errors

**Solution**: Run Step 3 to grant Cloud Build permissions

### Issue: "API not enabled"

**Solution**: Run Step 2 to enable required APIs

### Issue: Build fails

**Check logs**:
```bash
# List recent builds
gcloud builds list --limit=5

# View build logs
gcloud builds log [BUILD_ID]
```

### Issue: Service deployment fails

**Check Cloud Run logs**:
```bash
gcloud run services logs read metavr-frontend \
  --region us-central1 \
  --limit=50
```

## Manual Deployment (Alternative)

If you want to deploy manually without GitHub Actions:

```bash
# Build and submit to Cloud Build
gcloud builds submit --config cloudbuild.yaml

# Or build and deploy directly
gcloud run deploy metavr-frontend \
  --source . \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --port 80 \
  --memory 512Mi \
  --cpu 1
```

## Monitoring

### View Service Status

```bash
gcloud run services describe metavr-frontend \
  --platform managed \
  --region us-central1
```

### View Logs

```bash
gcloud run services logs read metavr-frontend \
  --region us-central1 \
  --limit=100
```

### View Metrics

Visit: https://console.cloud.google.com/run/detail/us-central1/metavr-frontend/metrics

## Next Steps After Deployment

1. ✅ Test your deployed application
2. ✅ Set up monitoring and alerts
3. ✅ Configure custom domain (if needed)
4. ✅ Set up CI/CD for automatic deployments
5. ✅ Configure environment variables (if needed)

## Cost Estimation

Cloud Run pricing (approximate):
- **Free tier**: 2 million requests/month, 360,000 GB-seconds, 180,000 vCPU-seconds
- **After free tier**: Pay per use
- **Estimated cost**: Very low for small to medium traffic

## Security Checklist

- [x] Service account key in GitHub Secrets (not in code)
- [ ] Review Cloud Run IAM permissions
- [ ] Enable Cloud Armor (if needed)
- [ ] Set up VPC connector (if needed)
- [ ] Configure CORS properly
- [ ] Review and restrict allowed origins

---

**Ready to deploy?** Start with Step 1 (Add GitHub Secret)!


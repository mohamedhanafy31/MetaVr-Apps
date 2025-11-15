# GitHub Actions Workflows

## Deploy to Google Cloud Run

This workflow automatically:
1. **Downloads Unity files** from Google Drive
2. **Creates/updates GCS bucket** for Unity Build files
3. **Uploads Unity files** to GCS with correct metadata
4. **Builds and deploys** the application to Cloud Run
5. **Configures Cloud Run** to use GCS for Unity files

The workflow runs automatically when code is pushed to the `main` or `master` branch.

### Setup Instructions

1. **Create a Service Account in Google Cloud:**
   ```bash
   gcloud iam service-accounts create github-actions \
     --project=meta-478212 \
     --display-name="GitHub Actions Service Account"
   ```

2. **Grant necessary permissions:**
   ```bash
   SA_EMAIL="github-actions@meta-478212.iam.gserviceaccount.com"
   
   # Cloud Run deployment
   gcloud projects add-iam-policy-binding meta-478212 \
     --member="serviceAccount:${SA_EMAIL}" \
     --role="roles/run.admin"

   # Cloud Storage (for GCS bucket and Unity file uploads)
   gcloud projects add-iam-policy-binding meta-478212 \
     --member="serviceAccount:${SA_EMAIL}" \
     --role="roles/storage.admin"

   # Service account user (for Cloud Run deployment)
   gcloud projects add-iam-policy-binding meta-478212 \
     --member="serviceAccount:${SA_EMAIL}" \
     --role="roles/iam.serviceAccountUser"

   # Cloud Build (to submit builds)
   gcloud projects add-iam-policy-binding meta-478212 \
     --member="serviceAccount:${SA_EMAIL}" \
     --role="roles/cloudbuild.builds.editor"

   # Compute Engine (required for Cloud CDN - optional)
   # Only needed if you enable Cloud CDN via ENABLE_CLOUD_CDN secret
   gcloud projects add-iam-policy-binding meta-478212 \
     --member="serviceAccount:${SA_EMAIL}" \
     --role="roles/compute.admin"
   ```

3. **Create and download the service account key:**
   ```bash
   gcloud iam service-accounts keys create github-actions-key.json \
     --iam-account=github-actions@meta-478212.iam.gserviceaccount.com \
     --project=meta-478212
   ```

4. **Add the key as a GitHub Secret:**
   - Go to your GitHub repository
   - Navigate to **Settings** → **Secrets and variables** → **Actions**
   - Click **New repository secret**
   - Name: `GCP_SA_KEY`
   - Value: Paste the entire contents of `github-actions-key.json`
   - Click **Add secret**

5. **Push to trigger deployment:**
   ```bash
   git push origin main
   ```

### Manual Deployment

You can also trigger the workflow manually:
1. Go to the **Actions** tab in GitHub
2. Select **Deploy to Google Cloud Run**
3. Click **Run workflow**
4. Choose the branch and environment
5. Click **Run workflow**

### Workflow Steps

1. **Checkout code** - Gets the latest code from the repository
2. **Authenticate to Google Cloud** - Uses the service account key
3. **Set up Cloud SDK** - Installs and configures gcloud CLI
4. **Configure Docker** - Sets up Docker authentication
5. **Submit to Cloud Build** - Builds and deploys using Cloud Build
6. **Get Service URL** - Retrieves the deployed service URL
7. **Output Service URL** - Displays the deployment URL

### Environment Variables

- `PROJECT_ID`: meta-478212
- `SERVICE_NAME`: metavr-frontend
- `REGION`: us-central1
- `GCS_BUCKET_NAME`: metavr-assets (or set via `UNITY_GCS_BUCKET_NAME` secret)
- `ENABLE_CDN`: false (or set to 'true' via `ENABLE_CLOUD_CDN` secret)

### GitHub Secrets

1. **`GCP_SA_KEY`** (Required)
   - Google Cloud service account key JSON
   - Must have permissions for Storage, Cloud Build, Cloud Run, and optionally Compute (for CDN)

2. **`UNITY_GCS_BUCKET_NAME`** (Optional)
   - Custom GCS bucket name
   - Default: `metavr-assets`

3. **`ENABLE_CLOUD_CDN`** (Optional)
   - Set to `true` to automatically enable Cloud CDN
   - Default: `false`
   - **Note**: Cloud CDN requires Load Balancer (~$18/month)

### Cloud CDN Setup

The workflow can automatically set up Cloud CDN if enabled:

1. Go to **Settings** → **Secrets and variables** → **Actions**
2. Add secret: `ENABLE_CLOUD_CDN` = `true`
3. The workflow will automatically:
   - Create backend bucket
   - Enable Cloud CDN
   - Create URL map, proxy, and forwarding rule
   - Reserve static IP

**Note**: Cloud CDN setup requires `roles/compute.admin` permission for the service account.

These can be modified in the workflow file if needed.


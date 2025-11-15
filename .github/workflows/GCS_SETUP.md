# GitHub Actions GCS Automation

This workflow automatically sets up Google Cloud Storage (GCS) for Unity Build files and deploys your application.

## How It Works

The `deploy-gcp.yml` workflow now includes two jobs:

### 1. `setup-gcs-and-upload` Job
- Downloads Unity files from Google Drive
- Extracts the RAR archive
- Creates/verifies GCS bucket
- Configures CORS
- Uploads Unity files with correct metadata
- Makes bucket publicly readable

### 2. `deploy` Job
- Builds Docker image
- Deploys to Cloud Run
- Passes GCS bucket name to Cloud Build
- Cloud Run service uses GCS for Unity files

## Configuration

### Required GitHub Secrets

1. **`GCP_SA_KEY`** (Required)
   - Google Cloud service account key JSON
   - Must have permissions for:
     - Cloud Storage (create buckets, upload files)
     - Cloud Build (submit builds)
     - Cloud Run (deploy services)

2. **`UNITY_GCS_BUCKET_NAME`** (Optional)
   - Custom GCS bucket name
   - Default: `metavr-unity-build-production`
   - If not set, uses the default name

### Setting Up Secrets

1. Go to your GitHub repository
2. Navigate to **Settings** → **Secrets and variables** → **Actions**
3. Add secrets:
   - `GCP_SA_KEY`: Your service account key JSON
   - `UNITY_GCS_BUCKET_NAME`: (Optional) Your bucket name

## Service Account Permissions

Your service account needs these roles:

```bash
# Storage permissions (for GCS bucket and file uploads)
roles/storage.admin

# Cloud Build permissions
roles/cloudbuild.builds.editor

# Cloud Run permissions
roles/run.admin

# Service account user (for Cloud Run deployment)
roles/iam.serviceAccountUser
```

## Workflow Triggers

The workflow runs on:
- **Push to `main` or `master` branch**
- **Manual trigger** (workflow_dispatch)

## What Gets Uploaded

The workflow uploads these Unity files to GCS:

| Local File | GCS Object | Content-Type | Content-Encoding |
|------------|------------|--------------|------------------|
| `yes.data.gz` | `yes.data` | `application/octet-stream` | `gzip` |
| `yes.wasm.gz` | `yes.wasm` | `application/wasm` | `gzip` |
| `yes.framework.js.gz` | `yes.framework.js` | `application/javascript` | `gzip` |
| `yes.loader.js` | `yes.loader.js` | `application/javascript` | (none) |
| `TemplateData/` | `TemplateData/` | (varies) | (varies) |

## GCS Bucket Location

- **Region**: `us-central1` (matches Cloud Run region)
- **Storage Class**: `STANDARD`
- **CORS**: Configured for all origins
- **Access**: Public read access

## Troubleshooting

### Bucket Creation Fails

**Error**: `Bucket name already exists`

**Solution**: The workflow will use the existing bucket. If you want a new bucket, set `UNITY_GCS_BUCKET_NAME` secret to a different name.

### Upload Fails

**Error**: `Permission denied`

**Solution**: Ensure your service account has `roles/storage.admin` role.

### Files Not Loading in App

**Check**:
1. Verify bucket name is passed to Cloud Build
2. Check Cloud Run environment variable: `VITE_UNITY_GCS_BUCKET`
3. Verify files exist in GCS: `gsutil ls gs://YOUR_BUCKET/unity/npc/Build/`
4. Check CORS configuration: `gsutil cors get gs://YOUR_BUCKET`

### Manual Verification

You can manually verify the setup:

```bash
# List files in bucket
gsutil ls -lh gs://metavr-unity-build-production/unity/npc/Build/

# Check file metadata
gsutil stat gs://metavr-unity-build-production/unity/npc/Build/yes.data

# Test file access
curl -I https://storage.googleapis.com/metavr-unity-build-production/unity/npc/Build/yes.data
```

## Cost Considerations

- **Storage**: ~$0.020 per GB/month (Unity files ~60MB = ~$0.0012/month)
- **Egress**: First 1GB/month free, then $0.12 per GB
- **Operations**: Negligible cost for read operations

## Updating Unity Files

When Unity Build files change:

1. Update the files in Google Drive (same file ID)
2. Push to `main` branch
3. Workflow will automatically:
   - Download new files
   - Upload to GCS (overwrites existing files)
   - Deploy updated app

## Disabling GCS (Use Local Files)

To use local files instead of GCS:

1. Remove or comment out the `setup-gcs-and-upload` job
2. Remove `_UNITY_GCS_BUCKET` from Cloud Build substitutions
3. Unity files will be served by nginx (downloaded during Docker build)

## Monitoring

Check workflow runs:
- GitHub Actions tab → `Deploy to Google Cloud Run`
- View logs for each step
- Check GCS bucket: Google Cloud Console → Storage


# Google Cloud Storage (GCS) Setup for Unity Build Files

This guide explains how to set up Google Cloud Storage to serve Unity Build files, which solves Cloud Run timeout issues with large files (35MB+ `yes.data.gz`).

## Why Use GCS?

- **Avoids Cloud Run timeouts**: Large files (35MB+) can timeout on Cloud Run (default 300s limit)
- **Better performance**: GCS is optimized for serving static files
- **CDN-ready**: Can easily enable Cloud CDN for global distribution
- **Cost-effective**: GCS storage and egress costs are lower than Cloud Run for large files
- **Scalability**: No container resource limits

## Prerequisites

1. Google Cloud SDK (`gcloud` and `gsutil`) installed and configured
2. Access to project `meta-478212` (or update `GCP_PROJECT` in scripts)
3. Unity Build files extracted to `vite-project/public/unity/npc/Build/`

## Quick Start

### Step 1: Create GCS Bucket

```bash
# Set your bucket name (optional, defaults to metavr-unity-build-<timestamp>)
export GCS_BUCKET_NAME=metavr-unity-build-production

# Run the setup script
./setup-gcs-bucket.sh
```

This will:
- Create a GCS bucket in `us-central1`
- Configure CORS for your Cloud Run domains
- Make the bucket publicly readable

**Save the bucket name** - you'll need it for the next steps!

### Step 2: Upload Unity Files

```bash
# Set the bucket name from Step 1
export GCS_BUCKET_NAME=metavr-unity-build-production

# Upload files (requires Unity files to be extracted first)
./upload-unity-files-to-gcs.sh
```

This will:
- Upload all Unity Build files with correct metadata
- Set `Content-Encoding: gzip` for compressed files
- Set correct `Content-Type` headers
- Upload files **without** `.gz` extension (e.g., `yes.data.gz` → `yes.data`)

### Step 3: Configure Your Application

#### Option A: Environment Variable (Recommended)

Create or update `.env` file:

```bash
VITE_UNITY_GCS_BUCKET=metavr-unity-build-production
```

#### Option B: Cloud Run Environment Variable

When deploying to Cloud Run, set the environment variable:

```bash
gcloud run services update metavr-frontend \
  --region us-central1 \
  --set-env-vars VITE_UNITY_GCS_BUCKET=metavr-unity-build-production
```

Or add to `cloudbuild.yaml`:

```yaml
env:
  - 'VITE_UNITY_GCS_BUCKET=metavr-unity-build-production'
```

### Step 4: Rebuild and Deploy

```bash
cd vite-project
npm run build
# Deploy as usual
```

## How It Works

### File Naming Convention

Unity files are uploaded to GCS **without** the `.gz` extension but with `Content-Encoding: gzip`:

| Local File | GCS Object | Content-Type | Content-Encoding |
|------------|------------|--------------|------------------|
| `yes.data.gz` | `yes.data` | `application/octet-stream` | `gzip` |
| `yes.wasm.gz` | `yes.wasm` | `application/wasm` | `gzip` |
| `yes.framework.js.gz` | `yes.framework.js` | `application/javascript` | `gzip` |
| `yes.loader.js` | `yes.loader.js` | `application/javascript` | (none) |

This allows the Unity loader to request `yes.data` and receive gzip-compressed content automatically.

### URL Resolution

The `NPCDemo.jsx` component uses `getUnityFileUrl()` which:

1. **If `VITE_UNITY_GCS_BUCKET` is set**: Returns GCS URLs
   - Example: `https://storage.googleapis.com/metavr-unity-build-production/unity/npc/Build/yes.data`

2. **If not set**: Returns local paths (fallback)
   - Example: `/unity/npc/Build/yes.data.gz`

### CORS Configuration

The bucket is configured with CORS to allow requests from:
- Cloud Run service URLs
- `localhost:5173` (Vite dev server)
- `localhost:3000` (alternative dev port)

## Verification

### Test GCS URLs Directly

```bash
# Test loader
curl -I https://storage.googleapis.com/YOUR_BUCKET/unity/npc/Build/yes.loader.js

# Test data file (should show Content-Encoding: gzip)
curl -I https://storage.googleapis.com/YOUR_BUCKET/unity/npc/Build/yes.data

# Test WASM file
curl -I https://storage.googleapis.com/YOUR_BUCKET/unity/npc/Build/yes.wasm
```

Check that headers include:
- `Content-Type: application/octet-stream` (for .data)
- `Content-Encoding: gzip` (for compressed files)
- `Access-Control-Allow-Origin: *` (or your domain)

### Verify in Browser

1. Open your app
2. Open DevTools → Network tab
3. Look for requests to `storage.googleapis.com`
4. Check that files load with `200 OK` status
5. Verify `Content-Encoding: gzip` header is present

## Troubleshooting

### Files Not Loading

1. **Check bucket name**: Ensure `VITE_UNITY_GCS_BUCKET` matches your bucket name
2. **Check CORS**: Verify CORS allows your domain
3. **Check file permissions**: Ensure bucket/objects are publicly readable
4. **Check file names**: Ensure files are uploaded without `.gz` extension

### CORS Errors

If you see CORS errors in browser console:

```bash
# Update CORS configuration
gsutil cors set cors.json gs://YOUR_BUCKET_NAME
```

Make sure `cors.json` includes your domain in the `origin` array.

### Wrong Content-Type

If files aren't loading correctly:

```bash
# Update metadata for a specific file
gsutil setmeta -h "Content-Type:application/octet-stream" \
               -h "Content-Encoding:gzip" \
               gs://YOUR_BUCKET/unity/npc/Build/yes.data
```

### Re-upload Files

To re-upload files:

```bash
export GCS_BUCKET_NAME=your-bucket-name
./upload-unity-files-to-gcs.sh
```

## Cost Considerations

### Storage Costs
- Standard storage: ~$0.020 per GB/month
- Unity Build files: ~60MB total = ~$0.0012/month

### Egress Costs
- First 1GB/month: Free
- Next 9TB: $0.12 per GB
- Typical usage: Very low cost

### Comparison with Cloud Run
- Cloud Run: Charges for CPU/memory during file transfer
- GCS: Only charges for storage and egress
- **GCS is significantly cheaper for large static files**

## Advanced: Enable Cloud CDN

For even better performance globally:

```bash
# Create a backend bucket
gcloud compute backend-buckets create unity-build-cdn \
  --gcs-bucket-name=YOUR_BUCKET_NAME

# Create a URL map and load balancer (see GCP docs)
```

## Maintenance

### Updating Unity Files

When Unity Build files change:

1. Extract new files to `vite-project/public/unity/npc/Build/`
2. Run `./upload-unity-files-to-gcs.sh` again
3. Files will be overwritten in GCS

### Versioning

For production, consider using versioned buckets:

```bash
# Enable versioning
gsutil versioning set on gs://YOUR_BUCKET_NAME
```

This allows rollback if needed.

## Scripts Reference

### `setup-gcs-bucket.sh`

Creates and configures the GCS bucket.

**Environment Variables:**
- `GCP_PROJECT`: GCP project ID (default: `meta-478212`)
- `GCS_BUCKET_NAME`: Bucket name (default: `metavr-unity-build-<timestamp>`)
- `GCS_REGION`: Bucket region (default: `us-central1`)

### `upload-unity-files-to-gcs.sh`

Uploads Unity Build files to GCS.

**Environment Variables:**
- `GCS_BUCKET_NAME`: **Required** - Bucket name from Step 1
- `UNITY_BUILD_DIR`: Build directory path (default: `vite-project/public/unity/npc/Build`)

## Support

For issues or questions:
1. Check Cloud Run logs: `gcloud run services logs read metavr-frontend --region us-central1`
2. Check GCS access logs (if enabled)
3. Verify bucket permissions: `gsutil iam get gs://YOUR_BUCKET_NAME`


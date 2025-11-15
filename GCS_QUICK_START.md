# GCS Quick Start Guide

## 🚀 Quick Setup (3 Steps)

### 1. Create GCS Bucket

```bash
export GCS_BUCKET_NAME=metavr-unity-build-production
./setup-gcs-bucket.sh
```

**Save the bucket name!** You'll need it for the next steps.

### 2. Upload Unity Files

```bash
# Make sure Unity files are extracted first
export GCS_BUCKET_NAME=metavr-unity-build-production
./upload-unity-files-to-gcs.sh
```

### 3. Deploy with GCS

#### Option A: Cloud Build (Recommended)

Set the substitution variable in your Cloud Build trigger:

```bash
gcloud builds triggers update YOUR_TRIGGER_NAME \
  --substitutions _UNITY_GCS_BUCKET=metavr-unity-build-production
```

Or manually trigger with:

```bash
gcloud builds submit --config cloudbuild.yaml \
  --substitutions _UNITY_GCS_BUCKET=metavr-unity-build-production
```

#### Option B: Manual Cloud Run Update

```bash
gcloud run services update metavr-frontend \
  --region us-central1 \
  --set-env-vars VITE_UNITY_GCS_BUCKET=metavr-unity-build-production
```

#### Option C: Local Development

Create `vite-project/.env`:

```bash
VITE_UNITY_GCS_BUCKET=metavr-unity-build-production
```

Then rebuild:

```bash
cd vite-project
npm run dev
```

## ✅ Verification

1. **Check GCS files are accessible:**
   ```bash
   curl -I https://storage.googleapis.com/YOUR_BUCKET/unity/npc/Build/yes.data
   ```
   Should return `200 OK` with `Content-Encoding: gzip`

2. **Check in browser:**
   - Open your app
   - Open DevTools → Network tab
   - Look for requests to `storage.googleapis.com`
   - Files should load with `200 OK`

## 🔄 Switching Back to Local Files

To use local files (nginx) instead of GCS:

1. **Remove environment variable:**
   ```bash
   gcloud run services update metavr-frontend \
     --region us-central1 \
     --clear-env-vars VITE_UNITY_GCS_BUCKET
   ```

2. **Or set empty in Cloud Build:**
   ```bash
   gcloud builds submit --config cloudbuild.yaml \
     --substitutions _UNITY_GCS_BUCKET=
   ```

## 📝 Files Created

- `setup-gcs-bucket.sh` - Creates and configures GCS bucket
- `upload-unity-files-to-gcs.sh` - Uploads Unity files to GCS
- `GCS_SETUP.md` - Detailed documentation
- `cors.json` - CORS configuration (created by setup script)

## 🆘 Troubleshooting

**Files not loading?**
- Check bucket name matches in all places
- Verify CORS is configured: `gsutil cors get gs://YOUR_BUCKET`
- Check files are public: `gsutil iam get gs://YOUR_BUCKET`

**CORS errors?**
- Update `cors.json` with your domain
- Run: `gsutil cors set cors.json gs://YOUR_BUCKET`

**Wrong content type?**
- Re-upload files: `./upload-unity-files-to-gcs.sh`

For more details, see `GCS_SETUP.md`.


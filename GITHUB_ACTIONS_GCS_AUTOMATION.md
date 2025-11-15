# ✅ GitHub Actions GCS Automation - Complete!

## 🎉 What's Been Automated

The GitHub Actions workflow now **fully automates** the GCS setup and Unity file upload process:

### Automatic Steps (No Manual Work Required!)

1. ✅ **Downloads Unity files** from Google Drive
2. ✅ **Extracts RAR archive** automatically
3. ✅ **Creates GCS bucket** (if it doesn't exist)
4. ✅ **Configures CORS** for browser access
5. ✅ **Uploads Unity files** with correct metadata
6. ✅ **Makes bucket publicly readable**
7. ✅ **Deploys to Cloud Run** with GCS bucket configured
8. ✅ **Sets environment variable** for app to use GCS

## 📋 What You Need to Do

### 1. Ensure Service Account Has Storage Permissions

Your service account needs `roles/storage.admin`:

```bash
SA_EMAIL="github-actions@meta-478212.iam.gserviceaccount.com"

gcloud projects add-iam-policy-binding meta-478212 \
  --member="serviceAccount:${SA_EMAIL}" \
  --role="roles/storage.admin"
```

### 2. (Optional) Set Custom Bucket Name

If you want a custom bucket name, add it as a GitHub secret:

1. Go to: **Settings** → **Secrets and variables** → **Actions**
2. Click **New repository secret**
3. Name: `UNITY_GCS_BUCKET_NAME`
4. Value: Your bucket name (e.g., `metavr-unity-build-production`)
5. Click **Add secret**

**Note**: If not set, it defaults to `metavr-unity-build-production`

### 3. Push to Main Branch

That's it! Just push your code:

```bash
git add .
git commit -m "Enable automatic GCS setup"
git push origin main
```

The workflow will automatically:
- Set up GCS
- Upload Unity files
- Deploy your app

## 🔄 How It Works

### Workflow Structure

```
┌─────────────────────────────────────┐
│  setup-gcs-and-upload (Job 1)      │
│  ────────────────────────────────   │
│  1. Download Unity files            │
│  2. Extract RAR                     │
│  3. Create/verify GCS bucket        │
│  4. Upload files to GCS             │
└──────────────┬──────────────────────┘
               │
               ▼
┌─────────────────────────────────────┐
│  deploy (Job 2)                     │
│  ────────────────────────────────   │
│  1. Build Docker image              │
│  2. Deploy to Cloud Run             │
│  3. Set VITE_UNITY_GCS_BUCKET env   │
└─────────────────────────────────────┘
```

### File Upload Details

Files are uploaded with correct metadata:

| Source File | GCS Object | Content-Type | Encoding |
|-------------|------------|--------------|----------|
| `yes.data.gz` | `yes.data` | `application/octet-stream` | `gzip` |
| `yes.wasm.gz` | `yes.wasm` | `application/wasm` | `gzip` |
| `yes.framework.js.gz` | `yes.framework.js` | `application/javascript` | `gzip` |
| `yes.loader.js` | `yes.loader.js` | `application/javascript` | (none) |

## 📊 Monitoring

### View Workflow Runs

1. Go to GitHub → **Actions** tab
2. Click on **Deploy to Google Cloud Run**
3. View logs for each step

### Check GCS Bucket

```bash
# List files
gsutil ls -lh gs://metavr-unity-build-production/unity/npc/Build/

# Check metadata
gsutil stat gs://metavr-unity-build-production/unity/npc/Build/yes.data
```

### Verify Cloud Run Configuration

```bash
# Check environment variables
gcloud run services describe metavr-frontend \
  --region us-central1 \
  --format="value(spec.template.spec.containers[0].env)"
```

Should show: `VITE_UNITY_GCS_BUCKET=metavr-unity-build-production`

## 🐛 Troubleshooting

### Workflow Fails at "Download Unity files"

**Error**: `Failed to download from Google Drive`

**Solution**: 
- Check Google Drive file ID is correct: `1zQ5DCoamu-hAzzB3-p45-QNKxx_EdDks`
- Verify file is accessible (not restricted)
- Check `gdown` installation in workflow

### Workflow Fails at "Create or verify GCS bucket"

**Error**: `Permission denied`

**Solution**: Ensure service account has `roles/storage.admin`:
```bash
gcloud projects add-iam-policy-binding meta-478212 \
  --member="serviceAccount:github-actions@meta-478212.iam.gserviceaccount.com" \
  --role="roles/storage.admin"
```

### Files Not Loading in App

**Check**:
1. Verify bucket name in Cloud Run env vars
2. Check files exist: `gsutil ls gs://YOUR_BUCKET/unity/npc/Build/`
3. Verify CORS: `gsutil cors get gs://YOUR_BUCKET`
4. Test file access: `curl -I https://storage.googleapis.com/YOUR_BUCKET/unity/npc/Build/yes.data`

## 🔄 Updating Unity Files

When Unity Build files change:

1. **Update Google Drive file** (same file ID)
2. **Push to main branch**
3. **Workflow automatically**:
   - Downloads new files
   - Uploads to GCS (overwrites existing)
   - Deploys updated app

No manual steps required!

## 📝 Files Modified

- ✅ `.github/workflows/deploy-gcp.yml` - Added GCS automation
- ✅ `.github/workflows/README.md` - Updated documentation
- ✅ `.github/workflows/GCS_SETUP.md` - Detailed GCS setup guide

## 🎯 Benefits

- ✅ **Fully automated** - No manual GCS setup needed
- ✅ **Consistent** - Same process every deployment
- ✅ **Reliable** - Handles errors gracefully
- ✅ **Fast** - Parallel job execution
- ✅ **Maintainable** - All configuration in one place

## 🚀 Next Steps

1. **Push your code** to trigger the workflow
2. **Monitor the workflow** in GitHub Actions
3. **Verify deployment** - Check your app loads Unity files from GCS
4. **Enjoy** - No more manual GCS setup! 🎉

---

**Need help?** Check `.github/workflows/GCS_SETUP.md` for detailed documentation.


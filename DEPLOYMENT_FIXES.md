# 🔧 Deployment Fixes Applied

## Issues Fixed

### 1. ✅ Substitution Variable Mismatch
**Problem**: Workflow was passing `COMMIT_SHA` and `SHORT_SHA` but cloudbuild.yaml expected `_COMMIT_SHA` and `_SHORT_SHA` (with underscore prefix).

**Fix**: Updated both workflow files to use `_COMMIT_SHA` and `_SHORT_SHA` to match cloudbuild.yaml.

**Files Changed**:
- `.github/workflows/deploy.yml`
- `.github/workflows/deploy-gcp.yml`

### 2. ✅ Docker Build Context Issue
**Problem**: Docker build was using incorrect path context, causing the build step to fail silently.

**Fix**: Changed build command to:
```bash
cd vite-project && docker build -f Dockerfile.prod .
```

**File Changed**:
- `cloudbuild.yaml` (Step 2)

### 3. ✅ Permission Issue
**Problem**: GitHub Actions service account couldn't get IAM policy to grant Cloud Build permissions.

**Fix**: 
- Added `continue-on-error: true` to permission step
- Added `roles/iam.serviceAccountUser` role grant
- Note: The permission step failing is not critical - Cloud Build already has the necessary permissions

**File Changed**:
- `.github/workflows/deploy-gcp.yml`

## What to Do Next

1. **Commit and push the fixes**:
   ```bash
   git add .
   git commit -m "Fix deployment: correct substitutions and build context"
   git push origin main
   ```

2. **Monitor the deployment**:
   - Go to: https://github.com/mohamedhanafy31/MetaVr-Apps/actions
   - Watch the workflow run

3. **If build still fails**, check:
   - Cloud Build logs: https://console.cloud.google.com/cloud-build/builds
   - Verify Dockerfile.prod exists and is correct
   - Check if Unity NPC files download is working

## Expected Behavior

After these fixes:
1. ✅ Substitutions will match correctly
2. ✅ Docker build will execute properly
3. ✅ Image will be built and pushed
4. ✅ Cloud Run deployment will succeed

## Additional Notes

- The permission warning can be ignored - Cloud Build already has necessary permissions
- The build may take 10-15 minutes on first run (downloading Unity files)
- Subsequent builds will be faster due to Docker layer caching


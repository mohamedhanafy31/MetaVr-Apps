# 🚀 Quick Start: Deploy to Google Cloud

## ✅ Current Status

**All prerequisites are configured!**
- ✅ Google Cloud APIs enabled
- ✅ Cloud Build permissions set
- ✅ GitHub Actions service account configured
- ✅ Cloud Run service exists

## 🎯 Next Steps (3 Simple Steps)

### Step 1: Add GitHub Secret (5 minutes) ⚠️ REQUIRED

**This is the ONLY manual step you need to do!**

1. **Get your repository URL**:
   ```bash
   git remote -v
   ```
   Note your GitHub username and repository name.

2. **Go to GitHub Secrets**:
   - Open: `https://github.com/YOUR_USERNAME/YOUR_REPO/settings/secrets/actions`
   - Replace `YOUR_USERNAME` and `YOUR_REPO` with your actual values

3. **Add the secret**:
   - Click **"New repository secret"** button
   - **Name**: `GCP_SA_KEY` (must be exact, case-sensitive)
   - **Value**: Copy the entire JSON content from `github-actions-key.json`
     ```bash
     cat github-actions-key.json
     ```
   - Click **"Add secret"**

4. **Verify**:
   - You should see `GCP_SA_KEY` in your secrets list

### Step 2: Deploy (Choose One Method)

#### Option A: Automatic Deployment (Recommended)

Just push to main branch:

```bash
git add .
git commit -m "Ready for deployment"
git push origin main
```

GitHub Actions will automatically:
- Build your Docker image
- Push to Container Registry
- Deploy to Cloud Run
- Show you the service URL

#### Option B: Manual Deployment via GitHub UI

1. Go to: `https://github.com/YOUR_USERNAME/YOUR_REPO/actions`
2. Click on **"Deploy to Google Cloud Run"** workflow
3. Click **"Run workflow"** button
4. Select branch: `main`
5. Click **"Run workflow"** again

### Step 3: Get Your Service URL

After deployment completes (usually 5-10 minutes):

**From GitHub Actions:**
- Check the workflow output - it will show the service URL

**From Command Line:**
```bash
gcloud run services describe metavr-frontend \
  --region us-central1 \
  --format 'value(status.url)'
```

**From Google Cloud Console:**
- Go to: https://console.cloud.google.com/run
- Click on `metavr-frontend`
- Copy the URL

## 📊 Monitor Deployment

### Watch GitHub Actions Progress

1. Go to: `https://github.com/YOUR_USERNAME/YOUR_REPO/actions`
2. Click on the running workflow
3. Watch each step complete:
   - ✅ Checkout code
   - ✅ Authenticate to Google Cloud
   - ✅ Submit to Cloud Build
   - ✅ Deploy to Cloud Run
   - ✅ Output Service URL

### Check Build Logs

```bash
# List recent builds
gcloud builds list --limit=5

# View specific build logs
gcloud builds log [BUILD_ID]
```

## 🎉 After Deployment

Your application will be live at:
```
https://metavr-frontend-[hash]-uc.a.run.app
```

### Test Your Deployment

```bash
# Get the URL
URL=$(gcloud run services describe metavr-frontend \
  --region us-central1 \
  --format 'value(status.url)')

# Test it
curl $URL
```

## 🔄 Future Deployments

After the first deployment, every push to `main` will automatically deploy!

Just:
```bash
git push origin main
```

## ⚠️ Troubleshooting

### "GCP_SA_KEY secret is not set"
→ Go back to Step 1 and add the secret

### "Permission denied"
→ Run: `./setup-deployment.sh` to verify permissions

### Build fails
→ Check logs: `gcloud builds list --limit=1`

### Service not accessible
→ Check Cloud Run logs:
```bash
gcloud run services logs read metavr-frontend \
  --region us-central1 \
  --limit=50
```

## 📝 Summary

1. ✅ **Add GitHub Secret** (`GCP_SA_KEY`) - 5 minutes
2. ✅ **Push to main** or **Run workflow manually** - Automatic
3. ✅ **Get URL** from GitHub Actions output or command line

**That's it!** Your app will be live in ~5-10 minutes.

---

**Need help?** Check `DEPLOYMENT_GUIDE.md` for detailed information.


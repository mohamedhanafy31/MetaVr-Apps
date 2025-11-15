# 🚨 CRITICAL SECURITY FIX - Google Cloud Credentials

## Issue
The file `github-actions-key.json` containing Google Cloud service account credentials has been committed to the repository. This is a **CRITICAL SECURITY VULNERABILITY**.

## Immediate Actions Required

### Step 1: Revoke the Exposed Key in Google Cloud

```bash
# List all keys for the service account
gcloud iam service-accounts keys list \
  --iam-account=github-actions@meta-478212.iam.gserviceaccount.com \
  --project=meta-478212

# Delete the exposed key (use the KEY_ID from the list above)
# The key ID from the exposed file is: 7a661d3dc28ba64af23ef335d2c9e91433a74326
gcloud iam service-accounts keys delete 7a661d3dc28ba64af23ef335d2c9e91433a74326 \
  --iam-account=github-actions@meta-478212.iam.gserviceaccount.com \
  --project=meta-478212
```

### Step 2: Remove File from Git History

```bash
# Remove the file from git tracking (but keep local copy for now)
git rm --cached github-actions-key.json

# Remove from git history (this rewrites history - coordinate with team!)
git filter-branch --force --index-filter \
  "git rm --cached --ignore-unmatch github-actions-key.json" \
  --prune-empty --tag-name-filter cat -- --all

# Force push to remote (WARNING: This rewrites history)
# git push origin --force --all
# git push origin --force --tags
```

**Alternative (safer) - BFG Repo-Cleaner:**
```bash
# Install BFG (if not installed)
# brew install bfg  # macOS
# or download from: https://rtyley.github.io/bfg-repo-cleaner/

# Remove the file
bfg --delete-files github-actions-key.json

# Clean up
git reflog expire --expire=now --all
git gc --prune=now --aggressive

# Force push
git push origin --force --all
```

### Step 3: Create a New Service Account Key

```bash
# Create a new key
gcloud iam service-accounts keys create github-actions-key.json \
  --iam-account=github-actions@meta-478212.iam.gserviceaccount.com \
  --project=meta-478212

# Verify the file is in .gitignore (it should be)
cat .gitignore | grep github-actions-key.json
```

### Step 4: Add New Key to GitHub Secrets

1. Go to: https://github.com/YOUR_USERNAME/YOUR_REPO/settings/secrets/actions
2. Click "New repository secret"
3. Name: `GCP_SA_KEY`
4. Value: Copy the entire contents of `github-actions-key.json`
5. Click "Add secret"

### Step 5: Verify .gitignore

The file should already be in `.gitignore`:
```
github-actions-key.json
*-key.json
*service-account*.json
```

### Step 6: Commit the Fix

```bash
# Add .gitignore changes if any
git add .gitignore

# Commit the removal
git commit -m "SECURITY: Remove exposed service account key from repository"

# Push (after removing from history)
git push origin main
```

## Prevention

1. ✅ **Never commit credential files** - Always check before committing
2. ✅ **Use pre-commit hooks** - Add a hook to prevent committing keys
3. ✅ **Use GitHub Secrets** - Store credentials in GitHub Secrets, not in code
4. ✅ **Use Workload Identity** - Consider using Workload Identity Federation instead of keys
5. ✅ **Rotate keys regularly** - Change service account keys every 90 days

## Additional Security Recommendations

1. **Audit Service Account Permissions**: Review what permissions the service account has
2. **Enable Audit Logging**: Monitor service account usage
3. **Use Least Privilege**: Only grant necessary permissions
4. **Consider Workload Identity**: More secure than service account keys

## Check for Other Exposed Credentials

```bash
# Search for other potential credential files
find . -name "*.json" -type f | grep -E "(key|credential|secret|token)" | grep -v node_modules
find . -name "*.env" -type f
find . -name "*secret*" -type f
```

## Verification

After completing the steps:

1. ✅ Old key deleted from Google Cloud
2. ✅ File removed from git history
3. ✅ New key created and added to GitHub Secrets
4. ✅ File is in .gitignore
5. ✅ Repository no longer contains the key
6. ✅ GitHub Actions can still deploy (using the secret)


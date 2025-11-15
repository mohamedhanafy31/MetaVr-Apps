# Setting Up CI/CD with GitHub Actions

This guide explains how to set up automatic deployments to Google Cloud Run using GitHub Actions.

## Prerequisites

1. GitHub repository with your code
2. Google Cloud project set up (see `setup-gcp.sh`)
3. gcloud CLI installed

## Step 1: Create Service Account

Create a service account for GitHub Actions:

```bash
# Set variables
PROJECT_ID="metavr-apps"
SA_NAME="github-actions"
SA_EMAIL="${SA_NAME}@${PROJECT_ID}.iam.gserviceaccount.com"

# Create service account
gcloud iam service-accounts create ${SA_NAME} \
  --project=${PROJECT_ID} \
  --display-name="GitHub Actions Service Account"

# Grant necessary permissions
gcloud projects add-iam-policy-binding ${PROJECT_ID} \
  --member="serviceAccount:${SA_EMAIL}" \
  --role="roles/run.admin"

gcloud projects add-iam-policy-binding ${PROJECT_ID} \
  --member="serviceAccount:${SA_EMAIL}" \
  --role="roles/storage.admin"

gcloud projects add-iam-policy-binding ${PROJECT_ID} \
  --member="serviceAccount:${SA_EMAIL}" \
  --role="roles/iam.serviceAccountUser"

gcloud projects add-iam-policy-binding ${PROJECT_ID} \
  --member="serviceAccount:${SA_EMAIL}" \
  --role="roles/cloudbuild.builds.editor"
```

## Step 2: Create and Download Key

```bash
# Create key
gcloud iam service-accounts keys create github-actions-key.json \
  --iam-account=${SA_EMAIL} \
  --project=${PROJECT_ID}

# Display the key (you'll need to copy this)
cat github-actions-key.json
```

## Step 3: Add Secret to GitHub

1. Go to your GitHub repository
2. Navigate to **Settings** → **Secrets and variables** → **Actions**
3. Click **New repository secret**
4. Name: `GCP_SA_KEY`
5. Value: Paste the entire contents of `github-actions-key.json`
6. Click **Add secret**

## Step 4: Verify Workflow File

The workflow file is already created at `.github/workflows/deploy-gcp.yml`. It will:
- Trigger on pushes to `main` or `master` branch
- Build and deploy using Cloud Build
- Output the service URL

## Step 5: Test the Deployment

1. Push your code to the `main` branch:
   ```bash
   git add .
   git commit -m "Setup CI/CD"
   git push origin main
   ```

2. Check the Actions tab in GitHub to see the deployment progress

3. Once complete, get your service URL:
   ```bash
   gcloud run services describe metavr-frontend \
     --region us-central1 \
     --format 'value(status.url)'
   ```

## Manual Trigger

You can also trigger the workflow manually:
1. Go to **Actions** tab in GitHub
2. Select **Deploy to Google Cloud Run**
3. Click **Run workflow**

## Troubleshooting

### "Permission denied" errors

Make sure the service account has all required roles:
```bash
gcloud projects get-iam-policy metavr-apps \
  --flatten="bindings[].members" \
  --filter="bindings.members:serviceAccount:github-actions@metavr-apps.iam.gserviceaccount.com"
```

### Build fails

Check the Cloud Build logs:
```bash
gcloud builds list --limit=5
gcloud builds log [BUILD_ID]
```

### Secret not found

Verify the secret name matches exactly: `GCP_SA_KEY`

## Security Best Practices

1. **Never commit the service account key** to your repository
2. **Use least privilege**: Only grant necessary roles
3. **Rotate keys periodically**: Create new keys every 90 days
4. **Use Workload Identity** (advanced): For better security, consider using Workload Identity Federation instead of service account keys

## Using Workload Identity (Advanced)

For better security, you can use Workload Identity Federation:

```bash
# Create workload identity pool
gcloud iam workload-identity-pools create github-pool \
  --project=${PROJECT_ID} \
  --location="global"

# Create provider
gcloud iam workload-identity-pools providers create-oidc github-provider \
  --project=${PROJECT_ID} \
  --location="global" \
  --workload-identity-pool="github-pool" \
  --issuer-uri="https://token.actions.githubusercontent.com" \
  --attribute-mapping="google.subject=assertion.sub,attribute.repository=assertion.repository"

# Grant access
gcloud iam service-accounts add-iam-policy-binding ${SA_EMAIL} \
  --project=${PROJECT_ID} \
  --role="roles/iam.workloadIdentityUser" \
  --member="principalSet://iam.googleapis.com/projects/PROJECT_NUMBER/locations/global/workloadIdentityPools/github-pool/attribute.repository/YOUR_GITHUB_USERNAME/YOUR_REPO_NAME"
```

Then update the workflow to use Workload Identity instead of the service account key.

## Next Steps

- Set up branch protection rules
- Add deployment notifications (Slack, email, etc.)
- Configure custom domains
- Set up monitoring and alerts


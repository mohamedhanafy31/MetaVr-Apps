#!/bin/bash
# Script to set up Google Cloud deployment prerequisites

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
PROJECT_ID="meta-478212"
PROJECT_NUMBER="452474241422"
SERVICE_NAME="metavr-frontend"
REGION="us-central1"

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}  Google Cloud Deployment Setup${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# Set the project
echo -e "${YELLOW}Setting GCP project to: ${PROJECT_ID}${NC}"
gcloud config set project ${PROJECT_ID}

# Step 1: Enable required APIs
echo ""
echo -e "${YELLOW}Step 1: Enabling required APIs...${NC}"
APIS=(
  "cloudresourcemanager.googleapis.com"
  "cloudbuild.googleapis.com"
  "run.googleapis.com"
  "containerregistry.googleapis.com"
  "artifactregistry.googleapis.com"
)

for API in "${APIS[@]}"; do
  if gcloud services list --enabled --filter="name:${API}" --format="value(name)" | grep -q "${API}"; then
    echo -e "  ${GREEN}✓${NC} ${API} (already enabled)"
  else
    echo -e "  ${YELLOW}→${NC} Enabling ${API}..."
    gcloud services enable ${API} --quiet
    echo -e "  ${GREEN}✓${NC} ${API} enabled"
  fi
done

# Step 2: Grant Cloud Build permissions
echo ""
echo -e "${YELLOW}Step 2: Granting Cloud Build permissions...${NC}"
CLOUD_BUILD_SA="${PROJECT_NUMBER}@cloudbuild.gserviceaccount.com"

# Check if permissions already exist
if gcloud projects get-iam-policy ${PROJECT_ID} \
  --flatten="bindings[].members" \
  --filter="bindings.members:serviceAccount:${CLOUD_BUILD_SA} AND bindings.role:roles/run.admin" \
  --format="value(bindings.role)" | grep -q "roles/run.admin"; then
  echo -e "  ${GREEN}✓${NC} Cloud Build already has Run Admin role"
else
  echo -e "  ${YELLOW}→${NC} Granting Run Admin role..."
  gcloud projects add-iam-policy-binding ${PROJECT_ID} \
    --member="serviceAccount:${CLOUD_BUILD_SA}" \
    --role="roles/run.admin" \
    --condition=None 2>/dev/null || echo "  (May already be set)"
  echo -e "  ${GREEN}✓${NC} Run Admin role granted"
fi

if gcloud projects get-iam-policy ${PROJECT_ID} \
  --flatten="bindings[].members" \
  --filter="bindings.members:serviceAccount:${CLOUD_BUILD_SA} AND bindings.role:roles/iam.serviceAccountUser" \
  --format="value(bindings.role)" | grep -q "roles/iam.serviceAccountUser"; then
  echo -e "  ${GREEN}✓${NC} Cloud Build already has Service Account User role"
else
  echo -e "  ${YELLOW}→${NC} Granting Service Account User role..."
  gcloud projects add-iam-policy-binding ${PROJECT_ID} \
    --member="serviceAccount:${CLOUD_BUILD_SA}" \
    --role="roles/iam.serviceAccountUser" \
    --condition=None 2>/dev/null || echo "  (May already be set)"
  echo -e "  ${GREEN}✓${NC} Service Account User role granted"
fi

# Step 3: Verify GitHub Actions service account
echo ""
echo -e "${YELLOW}Step 3: Verifying GitHub Actions service account...${NC}"
GITHUB_SA="github-actions@${PROJECT_ID}.iam.gserviceaccount.com"

if gcloud iam service-accounts describe ${GITHUB_SA} &> /dev/null; then
  echo -e "  ${GREEN}✓${NC} Service account exists: ${GITHUB_SA}"
  
  # Check permissions
  ROLES=("roles/run.admin" "roles/storage.admin" "roles/iam.serviceAccountUser" "roles/cloudbuild.builds.editor")
  for ROLE in "${ROLES[@]}"; do
    if gcloud projects get-iam-policy ${PROJECT_ID} \
      --flatten="bindings[].members" \
      --filter="bindings.members:serviceAccount:${GITHUB_SA} AND bindings.role:${ROLE}" \
      --format="value(bindings.role)" | grep -q "${ROLE}"; then
      echo -e "    ${GREEN}✓${NC} Has ${ROLE}"
    else
      echo -e "    ${YELLOW}⚠${NC} Missing ${ROLE}"
    fi
  done
else
  echo -e "  ${RED}✗${NC} Service account not found: ${GITHUB_SA}"
  echo -e "  ${YELLOW}→${NC} Run setup-github-actions.sh first"
fi

# Step 4: Check if service exists
echo ""
echo -e "${YELLOW}Step 4: Checking Cloud Run service...${NC}"
if gcloud run services describe ${SERVICE_NAME} --region=${REGION} &> /dev/null; then
  SERVICE_URL=$(gcloud run services describe ${SERVICE_NAME} \
    --region=${REGION} \
    --format='value(status.url)')
  echo -e "  ${GREEN}✓${NC} Service exists: ${SERVICE_NAME}"
  echo -e "  ${BLUE}  URL: ${SERVICE_URL}${NC}"
else
  echo -e "  ${YELLOW}→${NC} Service will be created on first deployment"
fi

# Summary
echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}  Setup Complete!${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo -e "${YELLOW}Next Steps:${NC}"
echo ""
echo "1. ${BLUE}Add GitHub Secret${NC} (CRITICAL):"
echo "   - Go to: https://github.com/YOUR_USERNAME/YOUR_REPO/settings/secrets/actions"
echo "   - Add secret: GCP_SA_KEY"
echo "   - Value: Content from github-actions-key.json"
echo ""
echo "2. ${BLUE}Deploy via GitHub Actions${NC}:"
echo "   - Push to main branch, OR"
echo "   - Go to Actions tab → Run workflow manually"
echo ""
echo "3. ${BLUE}Get your service URL${NC}:"
echo "   gcloud run services describe ${SERVICE_NAME} \\"
echo "     --region ${REGION} \\"
echo "     --format 'value(status.url)'"
echo ""


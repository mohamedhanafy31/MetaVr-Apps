#!/bin/bash
# Script to set up GitHub Actions for Google Cloud deployment

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
PROJECT_ID="meta-478212"
SA_NAME="github-actions"
SA_EMAIL="${SA_NAME}@${PROJECT_ID}.iam.gserviceaccount.com"

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}  GitHub Actions Setup for GCP${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# Check if gcloud is installed
if ! command -v gcloud &> /dev/null; then
    echo -e "${RED}Error: gcloud CLI is not installed${NC}"
    exit 1
fi

# Set the project
echo -e "${YELLOW}Setting GCP project to: ${PROJECT_ID}${NC}"
gcloud config set project ${PROJECT_ID}

# Create service account
echo -e "${YELLOW}Creating service account...${NC}"
if gcloud iam service-accounts describe ${SA_EMAIL} &> /dev/null; then
    echo -e "${GREEN}Service account already exists.${NC}"
else
    gcloud iam service-accounts create ${SA_NAME} \
      --project=${PROJECT_ID} \
      --display-name="GitHub Actions Service Account"
    echo -e "${GREEN}Service account created successfully!${NC}"
fi

# Grant necessary permissions
echo -e "${YELLOW}Granting permissions...${NC}"
gcloud projects add-iam-policy-binding ${PROJECT_ID} \
  --member="serviceAccount:${SA_EMAIL}" \
  --role="roles/run.admin" \
  --condition=None 2>/dev/null || echo "Role already granted"

gcloud projects add-iam-policy-binding ${PROJECT_ID} \
  --member="serviceAccount:${SA_EMAIL}" \
  --role="roles/storage.admin" \
  --condition=None 2>/dev/null || echo "Role already granted"

gcloud projects add-iam-policy-binding ${PROJECT_ID} \
  --member="serviceAccount:${SA_EMAIL}" \
  --role="roles/iam.serviceAccountUser" \
  --condition=None 2>/dev/null || echo "Role already granted"

gcloud projects add-iam-policy-binding ${PROJECT_ID} \
  --member="serviceAccount:${SA_EMAIL}" \
  --role="roles/cloudbuild.builds.editor" \
  --condition=None 2>/dev/null || echo "Role already granted"

echo -e "${GREEN}Permissions granted!${NC}"

# Create and download key
echo -e "${YELLOW}Creating service account key...${NC}"
KEY_FILE="github-actions-key.json"
gcloud iam service-accounts keys create ${KEY_FILE} \
  --iam-account=${SA_EMAIL} \
  --project=${PROJECT_ID}

echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}  Setup Complete!${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo -e "${YELLOW}Next steps:${NC}"
echo ""
echo "1. Add the service account key to GitHub Secrets:"
echo "   - Go to: https://github.com/mohamedhanafy31/MetaVr-Apps/settings/secrets/actions"
echo "   - Click 'New repository secret'"
echo "   - Name: GCP_SA_KEY"
echo "   - Value: Copy the contents of ${KEY_FILE}"
echo ""
echo "2. The key file has been saved as: ${KEY_FILE}"
echo "   ${RED}⚠️  Keep this file secure and do not commit it to git!${NC}"
echo ""
echo "3. Push your code to trigger the deployment:"
echo "   git push origin main"
echo ""


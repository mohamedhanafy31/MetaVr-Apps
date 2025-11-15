#!/bin/bash
# Deployment script using Cloud Build

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
PROJECT_ID="metavr-apps"
REGION="us-central1"

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}  MetaVR Apps - GCP Cloud Build Deployment${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# Check if gcloud is installed
if ! command -v gcloud &> /dev/null; then
    echo -e "${RED}Error: gcloud CLI is not installed${NC}"
    echo "Please install it from: https://cloud.google.com/sdk/docs/install"
    exit 1
fi

# Check if user is authenticated
if ! gcloud auth list --filter=status:ACTIVE --format="value(account)" | grep -q .; then
    echo -e "${YELLOW}Not authenticated. Please login...${NC}"
    gcloud auth login
fi

# Set the project
echo -e "${YELLOW}Setting GCP project to: ${PROJECT_ID}${NC}"
gcloud config set project ${PROJECT_ID}

# Check if project exists
if ! gcloud projects describe ${PROJECT_ID} &> /dev/null; then
    echo -e "${RED}Error: Project '${PROJECT_ID}' not found${NC}"
    echo "Please create the project first:"
    echo "  gcloud projects create ${PROJECT_ID} --name='MetaVr Apps'"
    exit 1
fi

# Enable required APIs
echo -e "${YELLOW}Enabling required APIs...${NC}"
gcloud services enable cloudbuild.googleapis.com
gcloud services enable run.googleapis.com
gcloud services enable containerregistry.googleapis.com

# Submit build to Cloud Build
echo -e "${YELLOW}Submitting build to Cloud Build...${NC}"
gcloud builds submit --config cloudbuild.yaml

# Get the service URL
SERVICE_URL=$(gcloud run services describe metavr-frontend --platform managed --region ${REGION} --format 'value(status.url)')

echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}  Deployment Successful!${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo -e "Service URL: ${GREEN}${SERVICE_URL}${NC}"
echo ""
echo -e "${YELLOW}To view logs:${NC}"
echo "  gcloud run services logs read metavr-frontend --region ${REGION}"
echo ""
echo -e "${YELLOW}To view build history:${NC}"
echo "  gcloud builds list"
echo ""


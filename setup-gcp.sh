#!/bin/bash
# Initial setup script for Google Cloud Platform

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
PROJECT_ID="metavr-apps"
PROJECT_NAME="MetaVr Apps"
REGION="us-central1"

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}  MetaVR Apps - GCP Initial Setup${NC}"
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

# Create project if it doesn't exist
echo -e "${YELLOW}Checking if project exists...${NC}"
if ! gcloud projects describe ${PROJECT_ID} &> /dev/null; then
    echo -e "${YELLOW}Creating new project: ${PROJECT_ID}${NC}"
    gcloud projects create ${PROJECT_ID} --name="${PROJECT_NAME}"
    echo -e "${GREEN}Project created successfully!${NC}"
else
    echo -e "${GREEN}Project already exists.${NC}"
fi

# Set the project
echo -e "${YELLOW}Setting active project to: ${PROJECT_ID}${NC}"
gcloud config set project ${PROJECT_ID}

# Link billing account (user will need to do this manually)
echo -e "${YELLOW}Checking billing account...${NC}"
BILLING_ACCOUNT=$(gcloud beta billing accounts list --format="value(name)" --limit=1 2>/dev/null || echo "")

if [ -z "$BILLING_ACCOUNT" ]; then
    echo -e "${RED}No billing account found.${NC}"
    echo -e "${YELLOW}Please link a billing account:${NC}"
    echo "  1. Go to: https://console.cloud.google.com/billing"
    echo "  2. Create or select a billing account"
    echo "  3. Link it to project: ${PROJECT_ID}"
    echo ""
    read -p "Press Enter after linking the billing account..."
else
    echo -e "${GREEN}Billing account found: ${BILLING_ACCOUNT}${NC}"
    gcloud beta billing projects link ${PROJECT_ID} --billing-account=${BILLING_ACCOUNT} 2>/dev/null || echo "Billing already linked"
fi

# Enable required APIs
echo -e "${YELLOW}Enabling required APIs...${NC}"
gcloud services enable cloudbuild.googleapis.com
gcloud services enable run.googleapis.com
gcloud services enable containerregistry.googleapis.com
gcloud services enable artifactregistry.googleapis.com

# Configure Docker authentication
echo -e "${YELLOW}Configuring Docker authentication...${NC}"
gcloud auth configure-docker

# Set default region
echo -e "${YELLOW}Setting default region to: ${REGION}${NC}"
gcloud config set run/region ${REGION}

echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}  Setup Complete!${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo -e "${YELLOW}Next steps:${NC}"
echo "  1. Deploy using Cloud Build:"
echo "     ./deploy-gcp-cloudbuild.sh"
echo ""
echo "  2. Or deploy directly:"
echo "     ./deploy-gcp.sh"
echo ""
echo -e "${YELLOW}To view your project:${NC}"
echo "  https://console.cloud.google.com/home/dashboard?project=${PROJECT_ID}"
echo ""


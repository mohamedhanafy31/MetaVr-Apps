#!/bin/bash

# Quick Start Script for MetaVR GCP Deployment
# This script sets up and deploys to GCP with pre-configured settings for Egypt

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${GREEN}"
echo "╔══════════════════════════════════════════════════════════╗"
echo "║     MetaVR GCP VPS Quick Start (Egypt Region)            ║"
echo "╚══════════════════════════════════════════════════════════╝"
echo -e "${NC}"
echo ""

# Get script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Load configuration
if [ -f "$SCRIPT_DIR/config.sh" ]; then
    source "$SCRIPT_DIR/config.sh"
else
    echo -e "${RED}Error: config.sh not found${NC}"
    exit 1
fi

echo -e "${BLUE}Configuration:${NC}"
echo "  Project ID: $GCP_PROJECT_ID"
echo "  Zone: $GCP_ZONE (nearest to Egypt)"
echo "  Instance Name: $VM_INSTANCE_NAME"
echo "  Machine Type: $VM_MACHINE_TYPE"
echo ""

# Check if gcloud is installed
if ! command -v gcloud &> /dev/null; then
    echo -e "${RED}Error: gcloud CLI is not installed.${NC}"
    echo "Please install it from: https://cloud.google.com/sdk/docs/install"
    exit 1
fi

# Check authentication
if ! gcloud auth list --filter=status:ACTIVE --format="value(account)" | grep -q .; then
    echo -e "${YELLOW}No active gcloud authentication found.${NC}"
    echo "Please run: gcloud auth login"
    exit 1
fi

# Set the project
echo -e "${GREEN}Setting GCP project to: $GCP_PROJECT_ID${NC}"
gcloud config set project "$GCP_PROJECT_ID"

# Verify project access
if ! gcloud projects describe "$GCP_PROJECT_ID" &> /dev/null; then
    echo -e "${RED}Error: Cannot access project '$GCP_PROJECT_ID'${NC}"
    echo "Please verify:"
    echo "  1. The project ID is correct"
    echo "  2. You have access to this project"
    echo "  3. Billing is enabled for this project"
    exit 1
fi

echo ""
echo -e "${GREEN}Project verified successfully!${NC}"
echo ""

# Step 1: Create VM
echo -e "${YELLOW}Step 1: Create VM Instance${NC}"
read -p "Do you want to create the VM instance? (Y/n): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Nn]$ ]]; then
    "$SCRIPT_DIR/create-vm.sh"
    echo ""
fi

# Step 2: Deploy files
echo -e "${YELLOW}Step 2: Deploy Files to VPS${NC}"
read -p "Do you want to deploy files to the VPS? (Y/n): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Nn]$ ]]; then
    "$SCRIPT_DIR/deploy-to-vps.sh"
    echo ""
fi

# Get external IP
EXTERNAL_IP=$(gcloud compute instances describe "$VM_INSTANCE_NAME" --zone="$GCP_ZONE" --format='get(networkInterfaces[0].accessConfigs[0].natIP)' 2>/dev/null || echo "")

echo ""
echo -e "${GREEN}=== Local Deployment Steps Complete! ===${NC}"
echo ""
echo -e "${BLUE}Next Steps:${NC}"
echo ""
echo "1. SSH into your VPS:"
echo -e "   ${GREEN}gcloud compute ssh $VM_INSTANCE_NAME --zone=$GCP_ZONE${NC}"
echo ""
echo "2. Once on the VPS, run these commands:"
echo -e "   ${GREEN}cd $REMOTE_PATH${NC}"
echo -e "   ${GREEN}sudo ./deploy/gcp/setup-server.sh${NC}"
echo -e "   ${GREEN}./deploy/gcp/install-dependencies.sh${NC}"
echo -e "   ${GREEN}sudo ./deploy/gcp/configure-env.sh${NC}"
echo -e "   ${GREEN}# Edit .env files with your Firebase credentials${NC}"
echo -e "   ${GREEN}./deploy/gcp/build-apps.sh${NC}"
echo -e "   ${GREEN}sudo ./deploy/gcp/start-services.sh${NC}"
echo ""
if [ -n "$EXTERNAL_IP" ]; then
    echo -e "${BLUE}Your VPS External IP: $EXTERNAL_IP${NC}"
    echo ""
    echo "After setup, access your applications at:"
    echo "  Dashboard: http://$EXTERNAL_IP"
    echo "  Backend API: http://$EXTERNAL_IP/api"
    echo "  IQ Questions: http://$EXTERNAL_IP/iq-questions"
    echo "  Card Matching: http://$EXTERNAL_IP/card-matching"
fi
echo ""


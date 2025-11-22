#!/bin/bash

# Google Cloud VPS Creation Script
# This script creates a Compute Engine VM instance for deploying MetaVR applications

set -e

# Load configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
if [ -f "$SCRIPT_DIR/config.sh" ]; then
    source "$SCRIPT_DIR/config.sh"
fi

# Configuration (with defaults from config.sh or environment)
PROJECT_ID="${GCP_PROJECT_ID:-meta-478212}"
ZONE="${GCP_ZONE:-europe-west1-b}"
INSTANCE_NAME="${VM_INSTANCE_NAME:-metavr-vps}"
MACHINE_TYPE="${VM_MACHINE_TYPE:-e2-standard-4}"  # 4 vCPUs, 16GB RAM
DISK_SIZE="${VM_DISK_SIZE:-50GB}"
IMAGE_FAMILY="${VM_IMAGE_FAMILY:-ubuntu-2204-lts}"
IMAGE_PROJECT="${VM_IMAGE_PROJECT:-ubuntu-os-cloud}"
BOOT_DISK_TYPE="${VM_BOOT_DISK_TYPE:-pd-ssd}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}=== Google Cloud VPS Creation Script ===${NC}"
echo ""

# Check if gcloud is installed
if ! command -v gcloud &> /dev/null; then
    echo -e "${RED}Error: gcloud CLI is not installed.${NC}"
    echo "Please install it from: https://cloud.google.com/sdk/docs/install"
    exit 1
fi

# Check if user is authenticated
if ! gcloud auth list --filter=status:ACTIVE --format="value(account)" | grep -q .; then
    echo -e "${YELLOW}Warning: No active gcloud authentication found.${NC}"
    echo "Running: gcloud auth login"
    gcloud auth login
fi

# Set the project
echo -e "${GREEN}Setting GCP project to: ${PROJECT_ID}${NC}"
gcloud config set project "$PROJECT_ID"

# Check if instance already exists
if gcloud compute instances describe "$INSTANCE_NAME" --zone="$ZONE" &> /dev/null; then
    echo -e "${YELLOW}Instance '$INSTANCE_NAME' already exists in zone '$ZONE'.${NC}"
    read -p "Do you want to delete and recreate it? (y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        echo -e "${YELLOW}Deleting existing instance...${NC}"
        gcloud compute instances delete "$INSTANCE_NAME" --zone="$ZONE" --quiet
    else
        echo -e "${GREEN}Using existing instance.${NC}"
        exit 0
    fi
fi

# Create firewall rules if they don't exist
echo -e "${GREEN}Setting up firewall rules...${NC}"

# Allow HTTP
if ! gcloud compute firewall-rules describe allow-http --project="$PROJECT_ID" &> /dev/null; then
    gcloud compute firewall-rules create allow-http \
        --allow tcp:80 \
        --source-ranges 0.0.0.0/0 \
        --description "Allow HTTP traffic" \
        --project="$PROJECT_ID"
fi

# Allow HTTPS
if ! gcloud compute firewall-rules describe allow-https --project="$PROJECT_ID" &> /dev/null; then
    gcloud compute firewall-rules create allow-https \
        --allow tcp:443 \
        --source-ranges 0.0.0.0/0 \
        --description "Allow HTTPS traffic" \
        --project="$PROJECT_ID"
fi

# Allow custom ports for apps
if ! gcloud compute firewall-rules describe allow-metavr-apps --project="$PROJECT_ID" &> /dev/null; then
    gcloud compute firewall-rules create allow-metavr-apps \
        --allow tcp:3000,tcp:3001,tcp:3002,tcp:4000 \
        --source-ranges 0.0.0.0/0 \
        --description "Allow MetaVR application ports" \
        --project="$PROJECT_ID"
fi

# Create the VM instance
echo -e "${GREEN}Creating VM instance: ${INSTANCE_NAME}${NC}"
echo "  Zone: $ZONE"
echo "  Machine Type: $MACHINE_TYPE"
echo "  Disk Size: $DISK_SIZE"
echo "  Image: $IMAGE_FAMILY"

# Get the default compute service account
# Format: PROJECT_NUMBER-compute@developer.gserviceaccount.com
PROJECT_NUMBER=$(gcloud projects describe "$PROJECT_ID" --format='value(projectNumber)')
DEFAULT_SERVICE_ACCOUNT="${PROJECT_NUMBER}-compute@developer.gserviceaccount.com"

echo "  Service Account: $DEFAULT_SERVICE_ACCOUNT"

gcloud compute instances create "$INSTANCE_NAME" \
    --zone="$ZONE" \
    --machine-type="$MACHINE_TYPE" \
    --network-interface=network-tier=PREMIUM,stack-type=IPV4_ONLY,subnet=default \
    --maintenance-policy=MIGRATE \
    --provisioning-model=STANDARD \
    --service-account="$DEFAULT_SERVICE_ACCOUNT" \
    --scopes=https://www.googleapis.com/auth/cloud-platform \
    --create-disk=auto-delete=yes,boot=yes,device-name="$INSTANCE_NAME",image=projects/$IMAGE_PROJECT/global/images/family/$IMAGE_FAMILY,mode=rw,size="$DISK_SIZE",type=projects/$PROJECT_ID/zones/$ZONE/diskTypes/$BOOT_DISK_TYPE \
    --no-shielded-secure-boot \
    --shielded-vtpm \
    --shielded-integrity-monitoring \
    --labels=app=metavr,environment=production \
    --reservation-affinity=any

# Wait for instance to be ready
echo -e "${GREEN}Waiting for instance to be ready...${NC}"
sleep 10

# Get the external IP
EXTERNAL_IP=$(gcloud compute instances describe "$INSTANCE_NAME" --zone="$ZONE" --format='get(networkInterfaces[0].accessConfigs[0].natIP)')

echo ""
echo -e "${GREEN}=== VM Instance Created Successfully! ===${NC}"
echo "Instance Name: $INSTANCE_NAME"
echo "Zone: $ZONE"
echo "External IP: $EXTERNAL_IP"
echo ""
echo "Next steps:"
echo "1. SSH into the instance: gcloud compute ssh $INSTANCE_NAME --zone=$ZONE"
echo "2. Or use the deployment script: ./deploy/gcp/deploy-to-vps.sh"
echo ""
echo "To set the external IP as a static IP, run:"
echo "  gcloud compute addresses create metavr-ip --region=$(echo $ZONE | cut -d'-' -f1-2)"
echo "  gcloud compute instances delete-access-config $INSTANCE_NAME --zone=$ZONE --access-config-name='External NAT'"
echo "  gcloud compute instances add-access-config $INSTANCE_NAME --zone=$ZONE --access-config-name='External NAT' --address=metavr-ip"


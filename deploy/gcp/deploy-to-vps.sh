#!/bin/bash

# Deployment Script - Transfer project to GCP VPS
# This script transfers the entire project structure to the VPS maintaining the same directories

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
REMOTE_USER="${REMOTE_USER:-$USER}"
REMOTE_PATH="${REMOTE_PATH:-/home/$REMOTE_USER/MetaVR/managment_test}"
LOCAL_PATH="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${GREEN}=== MetaVR Deployment to GCP VPS ===${NC}"
echo ""

# Check if gcloud is installed
if ! command -v gcloud &> /dev/null; then
    echo -e "${RED}Error: gcloud CLI is not installed.${NC}"
    exit 1
fi

# Get the external IP
EXTERNAL_IP=$(gcloud compute instances describe "$INSTANCE_NAME" --zone="$ZONE" --format='get(networkInterfaces[0].accessConfigs[0].natIP)' 2>/dev/null || echo "")

if [ -z "$EXTERNAL_IP" ]; then
    echo -e "${RED}Error: Could not find instance '$INSTANCE_NAME' in zone '$ZONE'.${NC}"
    echo "Please create the VM first using: ./deploy/gcp/create-vm.sh"
    exit 1
fi

echo "Instance: $INSTANCE_NAME"
echo "Zone: $ZONE"
echo "External IP: $EXTERNAL_IP"
echo "Local Path: $LOCAL_PATH"
echo "Remote Path: $REMOTE_PATH"
echo ""

# Create .gcloudignore to exclude unnecessary files
cat > "$LOCAL_PATH/.gcloudignore" << 'EOF'
node_modules/
.next/
dist/
*.log
.git/
.env.local
.env.production
*.tsbuildinfo
.DS_Store
*.swp
*.swo
*~
.vscode/
.idea/
coverage/
.nyc_output/
downloads/
logs/
*.pid
EOF

# Create deployment archive (excluding node_modules and build artifacts)
echo -e "${GREEN}Creating deployment archive...${NC}"
TEMP_DIR=$(mktemp -d)
ARCHIVE_NAME="metavr-deployment-$(date +%Y%m%d-%H%M%S).tar.gz"

cd "$LOCAL_PATH"

# Create tar archive excluding unnecessary files
tar --exclude='node_modules' \
    --exclude='.next' \
    --exclude='dist' \
    --exclude='*.log' \
    --exclude='.git' \
    --exclude='.env.local' \
    --exclude='.env.production' \
    --exclude='*.tsbuildinfo' \
    --exclude='.DS_Store' \
    --exclude='coverage' \
    --exclude='downloads' \
    --exclude='logs' \
    --exclude='.gcloudignore' \
    -czf "$TEMP_DIR/$ARCHIVE_NAME" .

echo -e "${GREEN}Transferring files to VPS...${NC}"

# Create remote directory structure
gcloud compute ssh "$INSTANCE_NAME" --zone="$ZONE" --command="
    mkdir -p $(dirname $REMOTE_PATH)
    rm -rf $REMOTE_PATH
    mkdir -p $REMOTE_PATH
"

# Transfer the archive
gcloud compute scp --zone="$ZONE" "$TEMP_DIR/$ARCHIVE_NAME" "$INSTANCE_NAME:$REMOTE_PATH/"

# Extract on remote server
echo -e "${GREEN}Extracting files on remote server...${NC}"
gcloud compute ssh "$INSTANCE_NAME" --zone="$ZONE" --command="
    cd $REMOTE_PATH
    tar -xzf $ARCHIVE_NAME
    rm $ARCHIVE_NAME
    chmod +x deploy/gcp/*.sh 2>/dev/null || true
"

# Clean up local archive
rm -f "$TEMP_DIR/$ARCHIVE_NAME"
rmdir "$TEMP_DIR" 2>/dev/null || true
rm -f "$LOCAL_PATH/.gcloudignore"

echo ""
echo -e "${GREEN}=== Files Transferred Successfully! ===${NC}"
echo ""
echo "Next steps:"
echo "1. SSH into the instance: gcloud compute ssh $INSTANCE_NAME --zone=$ZONE"
echo "2. Run the setup script: cd $REMOTE_PATH && sudo ./deploy/gcp/setup-server.sh"
echo "3. Configure environment variables: sudo ./deploy/gcp/configure-env.sh"
echo "4. Start services: sudo ./deploy/gcp/start-services.sh"


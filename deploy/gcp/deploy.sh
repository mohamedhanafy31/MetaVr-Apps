#!/bin/bash

# Main Deployment Script
# Orchestrates the entire deployment process

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${GREEN}"
echo "╔══════════════════════════════════════════════════════════╗"
echo "║         MetaVR GCP VPS Deployment Script                 ║"
echo "╚══════════════════════════════════════════════════════════╝"
echo -e "${NC}"
echo ""

# Load configuration
if [ -f "$SCRIPT_DIR/config.sh" ]; then
    source "$SCRIPT_DIR/config.sh"
fi

# Configuration (with defaults from config.sh or environment)
PROJECT_ID="${GCP_PROJECT_ID:-meta-478212}"
ZONE="${GCP_ZONE:-europe-west1-b}"
INSTANCE_NAME="${VM_INSTANCE_NAME:-metavr-vps}"

# Get script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"

# Check if running locally or on remote server
if [ -f "/etc/os-release" ] && grep -q "Ubuntu" /etc/os-release; then
    # Running on remote server
    echo -e "${BLUE}Detected: Running on remote server${NC}"
    REMOTE_MODE=true
else
    # Running locally
    echo -e "${BLUE}Detected: Running locally${NC}"
    REMOTE_MODE=false
fi

if [ "$REMOTE_MODE" = false ]; then
    # Local deployment mode
    echo ""
    echo -e "${YELLOW}Step 1: Create VM Instance${NC}"
    read -p "Do you want to create a new VM instance? (y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        "$SCRIPT_DIR/create-vm.sh"
    fi

    echo ""
    echo -e "${YELLOW}Step 2: Transfer Files to VPS${NC}"
    read -p "Do you want to transfer files to the VPS? (y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        "$SCRIPT_DIR/deploy-to-vps.sh"
    fi

    echo ""
    echo -e "${GREEN}=== Local Steps Complete ===${NC}"
    echo ""
    echo "Next, SSH into your VPS and run:"
    echo "  cd /home/\$USER/MetaVR/managment_test"
    echo "  sudo ./deploy/gcp/setup-server.sh"
    echo "  ./deploy/gcp/install-dependencies.sh"
    echo "  sudo ./deploy/gcp/configure-env.sh"
    echo "  ./deploy/gcp/build-apps.sh"
    echo "  sudo ./deploy/gcp/start-services.sh"
    echo ""
    echo "Or run this script on the VPS to continue automatically."

else
    # Remote server mode
    echo ""
    echo -e "${YELLOW}Step 1: Server Setup${NC}"
    read -p "Do you want to run server setup? (y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        sudo "$SCRIPT_DIR/setup-server.sh"
    fi

    echo ""
    echo -e "${YELLOW}Step 2: Install Dependencies${NC}"
    read -p "Do you want to install dependencies? (y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        "$SCRIPT_DIR/install-dependencies.sh"
    fi

    echo ""
    echo -e "${YELLOW}Step 3: Configure Environment${NC}"
    read -p "Do you want to configure environment variables? (y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        sudo "$SCRIPT_DIR/configure-env.sh"
        echo ""
        echo -e "${YELLOW}⚠ Please edit the .env files with your Firebase credentials and other secrets${NC}"
        read -p "Press Enter when you're done editing the .env files..."
    fi

    echo ""
    echo -e "${YELLOW}Step 4: Build Applications${NC}"
    read -p "Do you want to build all applications? (y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        "$SCRIPT_DIR/build-apps.sh"
    fi

    echo ""
    echo -e "${YELLOW}Step 5: Start Services${NC}"
    read -p "Do you want to start all services? (y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        sudo "$SCRIPT_DIR/start-services.sh"
    fi

    echo ""
    echo -e "${GREEN}=== Deployment Complete! ===${NC}"
    echo ""
    echo "Your applications should now be running. Check status with:"
    echo "  pm2 status"
    echo ""
    echo "View logs with:"
    echo "  pm2 logs"
    echo ""
    echo "Access your applications:"
    EXTERNAL_IP=$(curl -s ifconfig.me || hostname -I | awk '{print $1}')
    echo "  Dashboard: http://$EXTERNAL_IP"
    echo "  Backend API: http://$EXTERNAL_IP/api"
    echo "  IQ Questions: http://$EXTERNAL_IP/iq-questions"
    echo "  Card Matching: http://$EXTERNAL_IP/card-matching"
fi


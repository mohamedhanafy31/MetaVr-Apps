#!/bin/bash

# Script to help add Firebase credentials to the VPS

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${GREEN}"
echo "╔══════════════════════════════════════════════════════════╗"
echo "║     Add Firebase Credentials to VPS                      ║"
echo "╚══════════════════════════════════════════════════════════╝"
echo -e "${NC}"
echo ""

# Load configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
if [ -f "$SCRIPT_DIR/config.sh" ]; then
    source "$SCRIPT_DIR/config.sh"
else
    echo -e "${RED}Error: config.sh not found${NC}"
    exit 1
fi

INSTANCE_NAME="${VM_INSTANCE_NAME:-metavr-vps}"
ZONE="${GCP_ZONE:-europe-west1-b}"
REMOTE_PATH="${REMOTE_PATH:-/home/$USER/MetaVR/managment_test}"

echo -e "${BLUE}This script will help you add Firebase credentials to your VPS.${NC}"
echo ""
echo -e "${YELLOW}You'll need:${NC}"
echo "  1. Firebase Service Account JSON file"
echo "  2. Firebase Client Configuration (API Key, Auth Domain, etc.)"
echo ""

read -p "Do you have the Firebase Service Account JSON file path? (y/N): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    read -p "Enter the path to your firebase-service-account.json file: " FIREBASE_JSON_PATH
    
    if [ -f "$FIREBASE_JSON_PATH" ]; then
        echo -e "${GREEN}Uploading Firebase service account file...${NC}"
        
        # Upload the file to VPS
        gcloud compute scp --zone="$ZONE" "$FIREBASE_JSON_PATH" "$INSTANCE_NAME:/tmp/firebase-service-account.json"
        
        # Add to backend .env
        echo -e "${GREEN}Adding to backend/.env...${NC}"
        gcloud compute ssh "$INSTANCE_NAME" --zone="$ZONE" --command="
            cd $REMOTE_PATH
            FIREBASE_JSON=\$(cat /tmp/firebase-service-account.json | jq -c .)
            sed -i 's|# FIREBASE_SERVICE_ACCOUNT_JSON=.*|FIREBASE_SERVICE_ACCOUNT_JSON='\"'\$FIREBASE_JSON'\"'|' backend/.env
            rm /tmp/firebase-service-account.json
            echo 'Firebase service account added to backend/.env'
        "
        
        # Add to dashboard .env.local
        echo -e "${GREEN}Adding to metavr-dashboard/.env.local...${NC}"
        gcloud compute ssh "$INSTANCE_NAME" --zone="$ZONE" --command="
            cd $REMOTE_PATH
            FIREBASE_JSON=\$(cat /tmp/firebase-service-account.json | jq -c .)
            sed -i 's|# FIREBASE_SERVICE_ACCOUNT_JSON=.*|FIREBASE_SERVICE_ACCOUNT_JSON='\"'\$FIREBASE_JSON'\"'|' metavr-dashboard/.env.local
            rm /tmp/firebase-service-account.json
            echo 'Firebase service account added to metavr-dashboard/.env.local'
        "
        
        echo -e "${GREEN}✓ Firebase service account added${NC}"
    else
        echo -e "${RED}Error: File not found: $FIREBASE_JSON_PATH${NC}"
        exit 1
    fi
else
    echo -e "${YELLOW}You can manually add Firebase credentials by:${NC}"
    echo "  1. SSH into VPS: gcloud compute ssh $INSTANCE_NAME --zone=$ZONE"
    echo "  2. Edit files:"
    echo "     - nano $REMOTE_PATH/backend/.env"
    echo "     - nano $REMOTE_PATH/metavr-dashboard/.env.local"
    echo "  3. Add your Firebase credentials"
    exit 0
fi

echo ""
echo -e "${YELLOW}Now you need to add Firebase Client Configuration:${NC}"
echo ""
read -p "Do you want to add Firebase client config now? (y/N): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    read -p "Firebase API Key: " FIREBASE_API_KEY
    read -p "Firebase Auth Domain: " FIREBASE_AUTH_DOMAIN
    read -p "Firebase Project ID: " FIREBASE_PROJECT_ID
    read -p "Firebase Storage Bucket: " FIREBASE_STORAGE_BUCKET
    read -p "Firebase Messaging Sender ID: " FIREBASE_MESSAGING_SENDER_ID
    read -p "Firebase App ID: " FIREBASE_APP_ID
    
    echo -e "${GREEN}Adding Firebase client config to dashboard...${NC}"
    gcloud compute ssh "$INSTANCE_NAME" --zone="$ZONE" --command="
        cd $REMOTE_PATH
        sed -i 's|# NEXT_PUBLIC_FIREBASE_API_KEY=.*|NEXT_PUBLIC_FIREBASE_API_KEY=$FIREBASE_API_KEY|' metavr-dashboard/.env.local
        sed -i 's|# NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=.*|NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=$FIREBASE_AUTH_DOMAIN|' metavr-dashboard/.env.local
        sed -i 's|# NEXT_PUBLIC_FIREBASE_PROJECT_ID=.*|NEXT_PUBLIC_FIREBASE_PROJECT_ID=$FIREBASE_PROJECT_ID|' metavr-dashboard/.env.local
        sed -i 's|# NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=.*|NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=$FIREBASE_STORAGE_BUCKET|' metavr-dashboard/.env.local
        sed -i 's|# NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=.*|NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=$FIREBASE_MESSAGING_SENDER_ID|' metavr-dashboard/.env.local
        sed -i 's|# NEXT_PUBLIC_FIREBASE_APP_ID=.*|NEXT_PUBLIC_FIREBASE_APP_ID=$FIREBASE_APP_ID|' metavr-dashboard/.env.local
        echo 'Firebase client config added'
    "
    
    echo -e "${GREEN}✓ Firebase client configuration added${NC}"
fi

echo ""
echo -e "${GREEN}══════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}Firebase credentials added!${NC}"
echo -e "${GREEN}══════════════════════════════════════════════════════════${NC}"
echo ""
echo -e "${YELLOW}Next steps:${NC}"
echo "  1. Rebuild applications:"
echo "     gcloud compute ssh $INSTANCE_NAME --zone=$ZONE"
echo "     cd $REMOTE_PATH"
echo "     ./deploy/gcp/build-apps.sh"
echo ""
echo "  2. Restart services:"
echo "     sudo ./deploy/gcp/start-services.sh"
echo ""
echo "Or run this automated script:"
echo "  ./deploy/gcp/rebuild-and-restart.sh"
echo ""


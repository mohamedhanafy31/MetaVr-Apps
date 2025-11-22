#!/bin/bash

# HTTPS Setup Script
# Sets up SSL certificates using Let's Encrypt

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${GREEN}"
echo "╔══════════════════════════════════════════════════════════╗"
echo "║     HTTPS/SSL Setup with Let's Encrypt                  ║"
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

# Get external IP
EXTERNAL_IP=$(gcloud compute instances describe "$INSTANCE_NAME" --zone="$ZONE" --format='get(networkInterfaces[0].accessConfigs[0].natIP)' 2>/dev/null || echo "")

if [ -z "$EXTERNAL_IP" ]; then
    echo -e "${RED}Error: Could not find instance '$INSTANCE_NAME'${NC}"
    exit 1
fi

echo -e "${YELLOW}Note: Let's Encrypt requires a domain name (not just an IP address).${NC}"
echo -e "${YELLOW}Your current IP: $EXTERNAL_IP${NC}"
echo ""
read -p "Do you have a domain name pointing to this IP? (y/N): " -n 1 -r
echo

if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo -e "${YELLOW}To enable HTTPS, you need:${NC}"
    echo "  1. A domain name (e.g., example.com)"
    echo "  2. DNS A record pointing to: $EXTERNAL_IP"
    echo ""
    echo "Once you have a domain configured, run this script again."
    exit 0
fi

read -p "Enter your domain name (e.g., example.com): " DOMAIN_NAME

if [ -z "$DOMAIN_NAME" ]; then
    echo -e "${RED}Error: Domain name is required${NC}"
    exit 1
fi

read -p "Enter your email address for Let's Encrypt notifications: " EMAIL_ADDRESS

if [ -z "$EMAIL_ADDRESS" ]; then
    EMAIL_ADDRESS="admin@$DOMAIN_NAME"
    echo -e "${YELLOW}Using default email: $EMAIL_ADDRESS${NC}"
fi

# Verify domain points to IP
echo -e "${YELLOW}Verifying domain points to this server...${NC}"
DOMAIN_IP=$(dig +short $DOMAIN_NAME | tail -1)

if [ "$DOMAIN_IP" != "$EXTERNAL_IP" ]; then
    echo -e "${RED}Warning: Domain $DOMAIN_NAME resolves to $DOMAIN_IP, but server IP is $EXTERNAL_IP${NC}"
    read -p "Continue anyway? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

echo -e "${GREEN}Setting up SSL certificate for $DOMAIN_NAME...${NC}"

# Setup SSL certificate
gcloud compute ssh "$INSTANCE_NAME" --zone="$ZONE" --command="
    cd $REMOTE_PATH
    
    DOMAIN_NAME='$DOMAIN_NAME'
    EMAIL_ADDRESS='$EMAIL_ADDRESS'
    EXTERNAL_IP='$EXTERNAL_IP'
    
    # Update nginx config with domain name
    sudo sed -i \"s|server_name _;|server_name \$DOMAIN_NAME;|\" /etc/nginx/sites-available/metavr
    
    # Obtain SSL certificate
    echo 'Obtaining SSL certificate from Let'\''s Encrypt...'
    sudo certbot --nginx -d \$DOMAIN_NAME --non-interactive --agree-tos --email \$EMAIL_ADDRESS --redirect
    
    if [ \$? -eq 0 ]; then
        echo 'SSL certificate obtained successfully'
        
        # Update environment files to use HTTPS
        sed -i \"s|http://\$EXTERNAL_IP|https://\$DOMAIN_NAME|g\" .env
        sed -i \"s|http://\$EXTERNAL_IP|https://\$DOMAIN_NAME|g\" backend/.env
        sed -i \"s|http://\$EXTERNAL_IP|https://\$DOMAIN_NAME|g\" metavr-dashboard/.env.local
        
        # Update BASE_URL and other URLs
        sed -i 's|BASE_URL=http://|BASE_URL=https://|g' .env
        sed -i 's|DASHBOARD_ORIGIN=http://|DASHBOARD_ORIGIN=https://|g' backend/.env
        sed -i 's|NEXT_PUBLIC_APP_URL=http://|NEXT_PUBLIC_APP_URL=https://|g' metavr-dashboard/.env.local
        sed -i 's|NEXT_PUBLIC_BACKEND_URL=http://|NEXT_PUBLIC_BACKEND_URL=https://|g' metavr-dashboard/.env.local
        
        # Replace IP with domain
        sed -i \"s|\$EXTERNAL_IP|\$DOMAIN_NAME|g\" .env
        sed -i \"s|\$EXTERNAL_IP|\$DOMAIN_NAME|g\" backend/.env
        sed -i \"s|\$EXTERNAL_IP|\$DOMAIN_NAME|g\" metavr-dashboard/.env.local
        
        echo 'Environment files updated to use HTTPS'
    else
        echo 'Error obtaining SSL certificate'
        exit 1
    fi
" 2>&1 | grep -v "Warning:" || true

echo ""
echo -e "${GREEN}══════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}✓ HTTPS Setup Complete!${NC}"
echo -e "${GREEN}══════════════════════════════════════════════════════════${NC}"
echo ""
echo -e "${BLUE}Your applications are now available via HTTPS:${NC}"
echo "  Dashboard:      https://$DOMAIN_NAME"
echo "  Backend API:    https://$DOMAIN_NAME/api"
echo "  IQ Questions:   https://$DOMAIN_NAME/iq-questions"
echo "  Card Matching:  https://$DOMAIN_NAME/card-matching"
echo ""
echo -e "${YELLOW}Note:${NC}"
echo "  - SSL certificate will auto-renew via certbot"
echo "  - HTTP traffic is automatically redirected to HTTPS"
echo "  - You may need to rebuild and restart services for the new URLs to take effect"
echo ""
echo "To rebuild and restart:"
echo "  ./deploy/gcp/rebuild-and-restart.sh"
echo ""


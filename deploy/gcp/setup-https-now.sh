#!/bin/bash

# Quick HTTPS setup for metavrai.shop

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

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
DOMAIN_NAME="metavrai.shop"
EXTERNAL_IP="34.79.218.67"

# Get email from user
read -p "Enter your email address for Let's Encrypt notifications: " EMAIL_ADDRESS

if [ -z "$EMAIL_ADDRESS" ]; then
    EMAIL_ADDRESS="admin@$DOMAIN_NAME"
    echo -e "${YELLOW}Using default email: $EMAIL_ADDRESS${NC}"
fi

echo ""
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
echo -e "${YELLOW}Next step: Rebuild and restart services${NC}"
echo "  ./deploy/gcp/rebuild-and-restart.sh"
echo ""


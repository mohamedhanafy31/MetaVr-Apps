#!/bin/bash

# Environment Configuration Script
# Helps configure environment variables for all applications

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${GREEN}=== Environment Configuration ===${NC}"
echo ""

# Get the project directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"

# Get external IP
EXTERNAL_IP=$(curl -s ifconfig.me || hostname -I | awk '{print $1}')

# Prompt for domain name (optional)
echo -e "${BLUE}Enter your domain name (or press Enter to use IP: $EXTERNAL_IP):${NC}"
read -r DOMAIN_NAME

if [ -z "$DOMAIN_NAME" ]; then
    DOMAIN_NAME="$EXTERNAL_IP"
    BASE_URL="http://$EXTERNAL_IP"
else
    BASE_URL="https://$DOMAIN_NAME"
fi

# Create .env file for root (used by docker-compose)
ENV_FILE="$PROJECT_DIR/.env"
echo -e "${GREEN}Creating root .env file...${NC}"

cat > "$ENV_FILE" << EOF
# MetaVR Production Environment Variables
# Generated on $(date)

# Server Configuration
NODE_ENV=production
DOMAIN=$DOMAIN_NAME
BASE_URL=$BASE_URL

# Ports
BACKEND_PORT=4000
DASHBOARD_PORT=3000
IQ_QUESTIONS_PORT=3001
CARD_MATCHING_PORT=3002

# Backend Configuration
DASHBOARD_ORIGIN=$BASE_URL
NEXT_PUBLIC_BACKEND_URL=$BASE_URL:4000

# Dashboard Configuration
NEXT_PUBLIC_APP_URL=$BASE_URL
NEXT_PUBLIC_BACKEND_URL=$BASE_URL:4000

# Session Secret (generate if not set)
SESSION_SECRET=\${SESSION_SECRET:-$(openssl rand -base64 32)}

# Admin Setup Token (generate if not set)
ADMIN_SETUP_TOKEN=\${ADMIN_SETUP_TOKEN:-$(openssl rand -base64 32)}
EOF

echo -e "${GREEN}✓ Root .env file created${NC}"

# Create backend .env
echo -e "${GREEN}Creating backend .env file...${NC}"
BACKEND_ENV="$PROJECT_DIR/backend/.env"

cat > "$BACKEND_ENV" << EOF
# Backend Environment Variables
NODE_ENV=production
PORT=4000
DASHBOARD_ORIGIN=$BASE_URL

# Session Configuration
SESSION_SECRET=\${SESSION_SECRET}

# Firebase (add your Firebase service account JSON here)
# FIREBASE_SERVICE_ACCOUNT_JSON={"type":"service_account",...}

# Email Configuration (optional)
# SMTP_HOST=smtp.gmail.com
# SMTP_PORT=587
# SMTP_USER=your-email@gmail.com
# SMTP_PASS=your-app-password
EOF

echo -e "${GREEN}✓ Backend .env file created${NC}"

# Create dashboard .env.local
echo -e "${GREEN}Creating dashboard .env.local file...${NC}"
DASHBOARD_ENV="$PROJECT_DIR/metavr-dashboard/.env.local"

cat > "$DASHBOARD_ENV" << EOF
# Dashboard Environment Variables
NODE_ENV=production

# Application URLs
NEXT_PUBLIC_APP_URL=$BASE_URL
NEXT_PUBLIC_BACKEND_URL=$BASE_URL:4000

# Session Configuration
SESSION_SECRET=\${SESSION_SECRET}
NEXT_PUBLIC_SESSION_ISSUER=metavr-backend
NEXT_PUBLIC_SESSION_AUDIENCE=metavr-dashboard

# Admin Setup
ADMIN_SETUP_TOKEN=\${ADMIN_SETUP_TOKEN}

# Firebase Configuration (add your Firebase credentials here)
# FIREBASE_SERVICE_ACCOUNT_JSON={"type":"service_account",...}
# NEXT_PUBLIC_FIREBASE_API_KEY=your-api-key
# NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=$DOMAIN_NAME
# NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
# NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-bucket.appspot.com
# NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your-sender-id
# NEXT_PUBLIC_FIREBASE_APP_ID=your-app-id
EOF

echo -e "${GREEN}✓ Dashboard .env.local file created${NC}"

echo ""
echo -e "${YELLOW}⚠ IMPORTANT: You need to manually add the following:${NC}"
echo "  1. Firebase Service Account JSON"
echo "  2. Firebase Client Configuration"
echo "  3. Any other required secrets"
echo ""
echo "Edit these files:"
echo "  - $BACKEND_ENV"
echo "  - $DASHBOARD_ENV"
echo ""
echo -e "${GREEN}=== Environment Configuration Complete! ===${NC}"


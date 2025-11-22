#!/bin/bash

# Complete Automated Deployment Script
# This script automates the entire deployment process from VM creation to service startup

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${GREEN}"
echo "╔══════════════════════════════════════════════════════════╗"
echo "║     MetaVR Complete Automated Deployment                 ║"
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

PROJECT_ID="${GCP_PROJECT_ID:-meta-478212}"
ZONE="${GCP_ZONE:-europe-west1-b}"
INSTANCE_NAME="${VM_INSTANCE_NAME:-metavr-vps}"
REMOTE_PATH="${REMOTE_PATH:-/home/$USER/MetaVR/managment_test}"

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
echo -e "${GREEN}Setting GCP project to: $PROJECT_ID${NC}"
gcloud config set project "$PROJECT_ID" > /dev/null 2>&1

# Step 1: Create VM (if it doesn't exist)
echo ""
echo -e "${BLUE}══════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}Step 1: Checking/Creating VM Instance${NC}"
echo -e "${BLUE}══════════════════════════════════════════════════════════${NC}"

if gcloud compute instances describe "$INSTANCE_NAME" --zone="$ZONE" &> /dev/null; then
    echo -e "${GREEN}✓ VM instance '$INSTANCE_NAME' already exists${NC}"
    EXTERNAL_IP=$(gcloud compute instances describe "$INSTANCE_NAME" --zone="$ZONE" --format='get(networkInterfaces[0].accessConfigs[0].natIP)')
    echo -e "${GREEN}  External IP: $EXTERNAL_IP${NC}"
else
    echo -e "${YELLOW}Creating VM instance...${NC}"
    "$SCRIPT_DIR/create-vm.sh" > /dev/null 2>&1
    EXTERNAL_IP=$(gcloud compute instances describe "$INSTANCE_NAME" --zone="$ZONE" --format='get(networkInterfaces[0].accessConfigs[0].natIP)')
    echo -e "${GREEN}✓ VM instance created${NC}"
    echo -e "${GREEN}  External IP: $EXTERNAL_IP${NC}"
    
    # Wait for VM to be ready
    echo -e "${YELLOW}Waiting for VM to be ready (30 seconds)...${NC}"
    sleep 30
fi

# Step 2: Deploy files
echo ""
echo -e "${BLUE}══════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}Step 2: Deploying Files to VPS${NC}"
echo -e "${BLUE}══════════════════════════════════════════════════════════${NC}"

# Wait for SSH to be available
echo -e "${YELLOW}Waiting for SSH to be available...${NC}"
for i in {1..30}; do
    if gcloud compute ssh "$INSTANCE_NAME" --zone="$ZONE" --command="echo 'SSH ready'" 2>/dev/null; then
        break
    fi
    if [ $i -eq 30 ]; then
        echo -e "${RED}Error: SSH not available after 30 attempts${NC}"
        exit 1
    fi
    sleep 2
done

echo -e "${YELLOW}Deploying files...${NC}"
"$SCRIPT_DIR/deploy-to-vps.sh" > /dev/null 2>&1
echo -e "${GREEN}✓ Files deployed successfully${NC}"

# Step 3: Setup server (via SSH)
echo ""
echo -e "${BLUE}══════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}Step 3: Setting Up Server${NC}"
echo -e "${BLUE}══════════════════════════════════════════════════════════${NC}"

echo -e "${YELLOW}Installing system dependencies (this may take 5-10 minutes)...${NC}"
gcloud compute ssh "$INSTANCE_NAME" --zone="$ZONE" --command="
    cd $REMOTE_PATH
    chmod +x deploy/gcp/setup-server.sh
    sudo ./deploy/gcp/setup-server.sh
"

echo -e "${GREEN}✓ Server setup complete${NC}"

# Step 4: Install dependencies
echo ""
echo -e "${BLUE}══════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}Step 4: Installing Dependencies${NC}"
echo -e "${BLUE}══════════════════════════════════════════════════════════${NC}"

echo -e "${YELLOW}Installing npm dependencies (this may take 5-10 minutes)...${NC}"
gcloud compute ssh "$INSTANCE_NAME" --zone="$ZONE" --command="
    cd $REMOTE_PATH
    
    # Backend
    if [ -f backend/package.json ]; then
        echo 'Installing backend dependencies...'
        cd backend && npm ci --production=false --silent && cd ..
    fi
    
    # Dashboard
    if [ -f metavr-dashboard/package.json ]; then
        echo 'Installing dashboard dependencies...'
        cd metavr-dashboard && npm ci --production=false --silent && cd ..
    fi
    
    # Card Matching
    if [ -f apps/card_matching/package.json ]; then
        echo 'Installing card_matching dependencies...'
        cd apps/card_matching && npm ci --production=false --silent && cd ../..
    fi
    
    # IQ Questions
    if [ -f apps/iq-questions/package.json ]; then
        echo 'Installing iq-questions dependencies...'
        cd apps/iq-questions && npm ci --production=false --silent && cd ../..
    fi
" 2>&1 | grep -v "Warning:" || true

echo -e "${GREEN}✓ Dependencies installed${NC}"

# Step 5: Configure environment
echo ""
echo -e "${BLUE}══════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}Step 5: Configuring Environment${NC}"
echo -e "${BLUE}══════════════════════════════════════════════════════════${NC}"

echo -e "${YELLOW}Creating environment files...${NC}"
gcloud compute ssh "$INSTANCE_NAME" --zone="$ZONE" --command="
    cd $REMOTE_PATH
    
    # Generate secrets
    SESSION_SECRET=\$(openssl rand -base64 32)
    ADMIN_SETUP_TOKEN=\$(openssl rand -base64 32)
    
    # Create root .env
    cat > .env << EOF
# MetaVR Production Environment Variables
NODE_ENV=production
DOMAIN=$EXTERNAL_IP
BASE_URL=http://$EXTERNAL_IP
BACKEND_PORT=4000
DASHBOARD_PORT=3000
IQ_QUESTIONS_PORT=3001
CARD_MATCHING_PORT=3002
DASHBOARD_ORIGIN=http://$EXTERNAL_IP
NEXT_PUBLIC_BACKEND_URL=http://$EXTERNAL_IP:4000
NEXT_PUBLIC_APP_URL=http://$EXTERNAL_IP
SESSION_SECRET=\$SESSION_SECRET
ADMIN_SETUP_TOKEN=\$ADMIN_SETUP_TOKEN
EOF
    
    # Create backend .env
    cat > backend/.env << EOF
NODE_ENV=production
PORT=4000
DASHBOARD_ORIGIN=http://$EXTERNAL_IP
SESSION_SECRET=\$SESSION_SECRET
# FIREBASE_SERVICE_ACCOUNT_JSON={\"type\":\"service_account\",...}
EOF
    
    # Create dashboard .env.local
    cat > metavr-dashboard/.env.local << EOF
NODE_ENV=production
NEXT_PUBLIC_APP_URL=http://$EXTERNAL_IP
NEXT_PUBLIC_BACKEND_URL=http://$EXTERNAL_IP:4000
SESSION_SECRET=\$SESSION_SECRET
NEXT_PUBLIC_SESSION_ISSUER=metavr-backend
NEXT_PUBLIC_SESSION_AUDIENCE=metavr-dashboard
ADMIN_SETUP_TOKEN=\$ADMIN_SETUP_TOKEN
# FIREBASE_SERVICE_ACCOUNT_JSON={\"type\":\"service_account\",...}
# NEXT_PUBLIC_FIREBASE_API_KEY=your-api-key
# NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=$EXTERNAL_IP
# NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
# NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-bucket.appspot.com
# NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your-sender-id
# NEXT_PUBLIC_FIREBASE_APP_ID=your-app-id
EOF
    
    echo 'Environment files created'
" 2>&1 | grep -v "Warning:" || true

echo -e "${GREEN}✓ Environment configured${NC}"
echo -e "${YELLOW}⚠ Note: You'll need to add Firebase credentials to the .env files${NC}"

# Step 6: Build applications
echo ""
echo -e "${BLUE}══════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}Step 6: Building Applications${NC}"
echo -e "${BLUE}══════════════════════════════════════════════════════════${NC}"

echo -e "${YELLOW}Building applications (this may take 5-10 minutes)...${NC}"
gcloud compute ssh "$INSTANCE_NAME" --zone="$ZONE" --command="
    cd $REMOTE_PATH
    export NODE_ENV=production
    
    # Build backend
    if [ -f backend/package.json ]; then
        echo 'Building backend...'
        cd backend && npm run build > /dev/null 2>&1 && cd ..
    fi
    
    # Build dashboard
    if [ -f metavr-dashboard/package.json ]; then
        echo 'Building dashboard...'
        cd metavr-dashboard && npm run build > /dev/null 2>&1 && \
            mkdir -p .next/standalone/.next && \
            rm -rf .next/standalone/.next/static && \
            cp -R .next/static .next/standalone/.next/static && \
            cd ..
    fi
    
    # Build card_matching
    if [ -f apps/card_matching/package.json ]; then
        echo 'Building card_matching...'
        cd apps/card_matching && npm run build > /dev/null 2>&1 && \
            mkdir -p .next/standalone/.next && \
            rm -rf .next/standalone/.next/static && \
            cp -R .next/static .next/standalone/.next/static && \
            cd ../..
    fi
    
    # Build iq-questions
    if [ -f apps/iq-questions/package.json ]; then
        echo 'Building iq-questions...'
        cd apps/iq-questions && npm run build > /dev/null 2>&1 && \
            mkdir -p .next/standalone/.next && \
            rm -rf .next/standalone/.next/static && \
            cp -R .next/static .next/standalone/.next/static && \
            cd ../..
    fi
    
    echo 'Build complete'
" 2>&1 | grep -v "Warning:" || true

echo -e "${GREEN}✓ Applications built${NC}"

# Step 7: Setup Nginx
echo ""
echo -e "${BLUE}══════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}Step 7: Configuring Nginx${NC}"
echo -e "${BLUE}══════════════════════════════════════════════════════════${NC}"

echo -e "${YELLOW}Setting up Nginx reverse proxy...${NC}"
gcloud compute ssh "$INSTANCE_NAME" --zone="$ZONE" --command="
    cd $REMOTE_PATH
    if [ -f deploy/gcp/nginx.conf ]; then
        sudo cp deploy/gcp/nginx.conf /etc/nginx/sites-available/metavr
        sudo ln -sf /etc/nginx/sites-available/metavr /etc/nginx/sites-enabled/
        sudo rm -f /etc/nginx/sites-enabled/default
        sudo nginx -t > /dev/null 2>&1 && sudo systemctl reload nginx
        echo 'Nginx configured'
    fi
" 2>&1 | grep -v "Warning:" || true

echo -e "${GREEN}✓ Nginx configured${NC}"

# Step 7.5: Setup HTTPS (optional)
echo ""
echo -e "${BLUE}══════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}Step 7.5: HTTPS/SSL Setup (Optional)${NC}"
echo -e "${BLUE}══════════════════════════════════════════════════════════${NC}"

echo -e "${YELLOW}Do you want to set up HTTPS with Let's Encrypt?${NC}"
echo -e "${YELLOW}Note: This requires a domain name pointing to $EXTERNAL_IP${NC}"
read -p "Set up HTTPS now? (y/N): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    "$SCRIPT_DIR/setup-https.sh"
else
    echo -e "${YELLOW}You can set up HTTPS later by running:${NC}"
    echo "  ./deploy/gcp/setup-https.sh"
fi

# Step 8: Start services
echo ""
echo -e "${BLUE}══════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}Step 8: Starting Services${NC}"
echo -e "${BLUE}══════════════════════════════════════════════════════════${NC}"

echo -e "${YELLOW}Starting all services with PM2...${NC}"
gcloud compute ssh "$INSTANCE_NAME" --zone="$ZONE" --command="
    cd $REMOTE_PATH
    
    # Stop existing services
    pm2 stop all 2>/dev/null || true
    pm2 delete all 2>/dev/null || true
    
    # Start backend
    if [ -f backend/dist/src/main.js ]; then
        pm2 start backend/dist/src/main.js --name metavr-backend --log /var/log/metavr/backend.log --error /var/log/metavr/backend-error.log --merge-logs --time --silent
    elif [ -f backend/package.json ]; then
        cd backend && pm2 start npm --name metavr-backend -- start --log /var/log/metavr/backend.log --error /var/log/metavr/backend-error.log --merge-logs --time --silent && cd ..
    fi
    
    # Start dashboard
    if [ -f metavr-dashboard/.next/standalone/server.js ]; then
        pm2 start metavr-dashboard/.next/standalone/server.js --name metavr-dashboard --log /var/log/metavr/dashboard.log --error /var/log/metavr/dashboard-error.log --merge-logs --time --env PORT=3000 --silent
    elif [ -f metavr-dashboard/package.json ]; then
        cd metavr-dashboard && pm2 start npm --name metavr-dashboard -- start --log /var/log/metavr/dashboard.log --error /var/log/metavr/dashboard-error.log --merge-logs --time --silent && cd ..
    fi
    
    # Start IQ Questions
    if [ -f apps/iq-questions/.next/standalone/server.js ]; then
        pm2 start apps/iq-questions/.next/standalone/server.js --name metavr-iq-questions --log /var/log/metavr/iq-questions.log --error /var/log/metavr/iq-questions-error.log --merge-logs --time --env PORT=3001 --silent
    elif [ -f apps/iq-questions/package.json ]; then
        cd apps/iq-questions && pm2 start npm --name metavr-iq-questions -- start --log /var/log/metavr/iq-questions.log --error /var/log/metavr/iq-questions-error.log --merge-logs --time --silent && cd ../..
    fi
    
    # Start Card Matching
    if [ -f apps/card_matching/.next/standalone/server.js ]; then
        pm2 start apps/card_matching/.next/standalone/server.js --name metavr-card-matching --log /var/log/metavr/card-matching.log --error /var/log/metavr/card-matching-error.log --merge-logs --time --env PORT=3002 --silent
    elif [ -f apps/card_matching/package.json ]; then
        cd apps/card_matching && pm2 start npm --name metavr-card-matching -- start -p 3002 --log /var/log/metavr/card-matching.log --error /var/log/metavr/card-matching-error.log --merge-logs --time --silent && cd ../..
    fi
    
    # Save PM2 configuration
    pm2 save --force --silent
    
    # Show status
    pm2 status
" 2>&1 | grep -v "Warning:" || true

echo -e "${GREEN}✓ Services started${NC}"

# Final summary
echo ""
echo -e "${GREEN}══════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}=== Deployment Complete! ===${NC}"
echo -e "${GREEN}══════════════════════════════════════════════════════════${NC}"
echo ""
echo -e "${BLUE}Your applications are now running at:${NC}"
echo "  Dashboard:      http://$EXTERNAL_IP"
echo "  Backend API:    http://$EXTERNAL_IP/api"
echo "  IQ Questions:   http://$EXTERNAL_IP/iq-questions"
echo "  Card Matching:  http://$EXTERNAL_IP/card-matching"
echo ""
echo -e "${YELLOW}⚠ Important:${NC}"
echo "  1. Add your Firebase credentials to:"
echo "     - backend/.env"
echo "     - metavr-dashboard/.env.local"
echo ""
echo "  2. After adding Firebase credentials, rebuild and restart:"
echo "     gcloud compute ssh $INSTANCE_NAME --zone=$ZONE"
echo "     cd $REMOTE_PATH"
echo "     ./deploy/gcp/build-apps.sh"
echo "     sudo ./deploy/gcp/start-services.sh"
echo ""
echo -e "${BLUE}Useful commands:${NC}"
echo "  SSH into VPS:   gcloud compute ssh $INSTANCE_NAME --zone=$ZONE"
echo "  View logs:      pm2 logs"
echo "  View status:    pm2 status"
echo "  Restart all:    pm2 restart all"
echo ""


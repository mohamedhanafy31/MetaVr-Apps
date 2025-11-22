#!/bin/bash

# Rebuild and Restart Script
# Rebuilds applications and restarts services after Firebase credentials are added

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${GREEN}"
echo "╔══════════════════════════════════════════════════════════╗"
echo "║     Rebuild and Restart Services                         ║"
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

echo -e "${BLUE}Rebuilding applications and restarting services...${NC}"
echo ""

# Rebuild applications
echo -e "${YELLOW}Step 1: Rebuilding applications...${NC}"
gcloud compute ssh "$INSTANCE_NAME" --zone="$ZONE" --command="
    cd $REMOTE_PATH
    export NODE_ENV=production
    
    # Build backend
    if [ -f backend/package.json ]; then
        echo 'Building backend...'
        cd backend && npm run build && cd ..
    fi
    
    # Build dashboard
    if [ -f metavr-dashboard/package.json ]; then
        echo 'Building dashboard...'
        cd metavr-dashboard
        npm run build
        if [ -d ".next/standalone" ] && [ -d ".next/static" ]; then
            echo 'Copying Next.js static assets for dashboard...'
            mkdir -p .next/standalone/.next
            rm -rf .next/standalone/.next/static
            cp -R .next/static .next/standalone/.next/static
        fi
        cd ..
    fi
    
    # Build card_matching
    if [ -f apps/card_matching/package.json ]; then
        echo 'Building card_matching...'
        cd apps/card_matching
        npm run build
        if [ -d ".next/standalone" ] && [ -d ".next/static" ]; then
            echo 'Copying Next.js static assets for card_matching...'
            mkdir -p .next/standalone/.next
            rm -rf .next/standalone/.next/static
            cp -R .next/static .next/standalone/.next/static
        fi
        cd ../..
    fi
    
    # Build iq-questions
    if [ -f apps/iq-questions/package.json ]; then
        echo 'Building iq-questions...'
        cd apps/iq-questions
        npm run build
        if [ -d ".next/standalone" ] && [ -d ".next/static" ]; then
            echo 'Copying Next.js static assets for iq-questions...'
            mkdir -p .next/standalone/.next
            rm -rf .next/standalone/.next/static
            cp -R .next/static .next/standalone/.next/static
        fi
        cd ../..
    fi
    
    echo 'Build complete'
" 2>&1 | grep -v "Warning:" || true

echo -e "${GREEN}✓ Applications rebuilt${NC}"

# Restart services
echo ""
echo -e "${YELLOW}Step 2: Restarting services...${NC}"
gcloud compute ssh "$INSTANCE_NAME" --zone="$ZONE" --command="
    cd $REMOTE_PATH
    
    # Stop all services
    pm2 stop all
    
    # Delete all services
    pm2 delete all
    
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
    
    # Wait a moment for services to start
    sleep 3
    
    # Show status
    pm2 status
" 2>&1 | grep -v "Warning:" || true

echo ""
echo -e "${GREEN}══════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}✓ Services rebuilt and restarted!${NC}"
echo -e "${GREEN}══════════════════════════════════════════════════════════${NC}"
echo ""
echo -e "${BLUE}Your applications are now running with updated configuration.${NC}"
echo ""
echo "Check status:"
echo "  gcloud compute ssh $INSTANCE_NAME --zone=$ZONE"
echo "  pm2 status"
echo "  pm2 logs"
echo ""


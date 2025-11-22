#!/bin/bash

# Start Services Script
# Starts all MetaVR applications using PM2

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${GREEN}=== Starting MetaVR Services ===${NC}"
echo ""

# Get the project directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"
USE_STANDALONE=${USE_STANDALONE:-1}

# Check if PM2 is installed
if ! command -v pm2 &> /dev/null; then
    echo -e "${RED}Error: PM2 is not installed.${NC}"
    echo "Please run: sudo ./deploy/gcp/setup-server.sh"
    exit 1
fi

# Stop existing services
echo -e "${GREEN}Stopping existing services...${NC}"
pm2 stop all 2>/dev/null || true
pm2 delete all 2>/dev/null || true

# Start backend
echo -e "${GREEN}Starting backend...${NC}"
cd "$PROJECT_DIR/backend"
if [ -f "dist/src/main.js" ]; then
    pm2 start dist/src/main.js \
        --name "metavr-backend" \
        --log /var/log/metavr/backend.log \
        --error /var/log/metavr/backend-error.log \
        --merge-logs \
        --time
    echo -e "${GREEN}✓ Backend started${NC}"
else
    echo -e "${YELLOW}⚠ Backend not built. Run: ./deploy/gcp/build-apps.sh${NC}"
fi

# Start dashboard
echo -e "${GREEN}Starting dashboard...${NC}"
cd "$PROJECT_DIR/metavr-dashboard"
if [ "$USE_STANDALONE" = "1" ] && [ -f ".next/standalone/server.js" ]; then
    pm2 start .next/standalone/server.js \
        --name "metavr-dashboard" \
        --log /var/log/metavr/dashboard.log \
        --error /var/log/metavr/dashboard-error.log \
        --merge-logs \
        --time \
        --env PORT=3000
    echo -e "${GREEN}✓ Dashboard (standalone) started${NC}"
elif [ -f "package.json" ]; then
    pm2 start npm --name "metavr-dashboard" -- start \
        -- \
        -p 3000 \
        --hostname 0.0.0.0 \
        --log /var/log/metavr/dashboard.log \
        --error /var/log/metavr/dashboard-error.log \
        --merge-logs \
        --time
    echo -e "${GREEN}✓ Dashboard started${NC}"
else
    echo -e "${YELLOW}⚠ Dashboard not found${NC}"
fi

# Start IQ Questions
echo -e "${GREEN}Starting IQ Questions app...${NC}"
cd "$PROJECT_DIR/apps/iq-questions"
if [ "$USE_STANDALONE" = "1" ] && [ -f ".next/standalone/server.js" ]; then
    pm2 start .next/standalone/server.js \
        --name "metavr-iq-questions" \
        --log /var/log/metavr/iq-questions.log \
        --error /var/log/metavr/iq-questions-error.log \
        --merge-logs \
        --time \
        --env PORT=3001
    echo -e "${GREEN}✓ IQ Questions (standalone) started${NC}"
elif [ -f "package.json" ]; then
    pm2 start npm --name "metavr-iq-questions" -- start \
        -- \
        -p 3001 \
        --hostname 0.0.0.0 \
        --log /var/log/metavr/iq-questions.log \
        --error /var/log/metavr/iq-questions-error.log \
        --merge-logs \
        --time
    echo -e "${GREEN}✓ IQ Questions started${NC}"
else
    echo -e "${YELLOW}⚠ IQ Questions not found${NC}"
fi

# Start Card Matching
echo -e "${GREEN}Starting Card Matching app...${NC}"
cd "$PROJECT_DIR/apps/card_matching"
if [ "$USE_STANDALONE" = "1" ] && [ -f ".next/standalone/server.js" ]; then
    pm2 start .next/standalone/server.js \
        --name "metavr-card-matching" \
        --log /var/log/metavr/card-matching.log \
        --error /var/log/metavr/card-matching-error.log \
        --merge-logs \
        --time \
        --env PORT=3002
    echo -e "${GREEN}✓ Card Matching (standalone) started${NC}"
elif [ -f "package.json" ]; then
    pm2 start npm --name "metavr-card-matching" -- start \
        -- \
        -p 3002 \
        --hostname 0.0.0.0 \
        --log /var/log/metavr/card-matching.log \
        --error /var/log/metavr/card-matching-error.log \
        --merge-logs \
        --time
    echo -e "${GREEN}✓ Card Matching started${NC}"
else
    echo -e "${YELLOW}⚠ Card Matching not found${NC}"
fi

# Save PM2 configuration
pm2 save

# Reload Nginx (without overwriting existing config)
echo -e "${GREEN}Reloading Nginx configuration...${NC}"
if nginx -t >/dev/null 2>&1; then
    systemctl reload nginx
    echo -e "${GREEN}✓ Nginx reloaded${NC}"
else
    echo -e "${YELLOW}⚠ Nginx configuration check failed. Please run nginx -t manually.${NC}"
fi

# Show status
echo ""
echo -e "${GREEN}=== Services Status ===${NC}"
pm2 status

echo ""
echo -e "${GREEN}=== Services Started Successfully! ===${NC}"
echo ""
echo "Useful commands:"
echo "  pm2 status          - View service status"
echo "  pm2 logs            - View all logs"
echo "  pm2 logs <name>     - View specific service logs"
echo "  pm2 restart all     - Restart all services"
echo "  pm2 stop all        - Stop all services"
echo "  pm2 monit           - Monitor services"


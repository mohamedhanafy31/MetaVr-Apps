#!/bin/bash

# Install Dependencies Script
# Installs npm dependencies for all applications

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${GREEN}=== Installing Dependencies ===${NC}"
echo ""

# Get the project directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"

cd "$PROJECT_DIR"

# Install backend dependencies
echo -e "${GREEN}Installing backend dependencies...${NC}"
cd backend
if [ -f "package.json" ]; then
    npm ci --production=false
    echo -e "${GREEN}✓ Backend dependencies installed${NC}"
else
    echo -e "${YELLOW}⚠ Backend package.json not found${NC}"
fi
cd ..

# Install dashboard dependencies
echo -e "${GREEN}Installing dashboard dependencies...${NC}"
cd metavr-dashboard
if [ -f "package.json" ]; then
    npm ci --production=false
    echo -e "${GREEN}✓ Dashboard dependencies installed${NC}"
else
    echo -e "${YELLOW}⚠ Dashboard package.json not found${NC}"
fi
cd ..

# Install card_matching dependencies
echo -e "${GREEN}Installing card_matching dependencies...${NC}"
cd apps/card_matching
if [ -f "package.json" ]; then
    npm ci --production=false
    echo -e "${GREEN}✓ Card Matching dependencies installed${NC}"
else
    echo -e "${YELLOW}⚠ Card Matching package.json not found${NC}"
fi
cd ../..

# Install iq-questions dependencies
echo -e "${GREEN}Installing iq-questions dependencies...${NC}"
cd apps/iq-questions
if [ -f "package.json" ]; then
    npm ci --production=false
    echo -e "${GREEN}✓ IQ Questions dependencies installed${NC}"
else
    echo -e "${YELLOW}⚠ IQ Questions package.json not found${NC}"
fi
cd ../..

echo ""
echo -e "${GREEN}=== All Dependencies Installed! ===${NC}"


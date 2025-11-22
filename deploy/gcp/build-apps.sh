#!/bin/bash

# Build Applications Script
# Builds all applications for production

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${GREEN}=== Building Applications ===${NC}"
echo ""

# Get the project directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"

cd "$PROJECT_DIR"

# Build backend
echo -e "${GREEN}Building backend...${NC}"
cd backend
if [ -f "package.json" ]; then
    npm run build
    echo -e "${GREEN}✓ Backend built successfully${NC}"
else
    echo -e "${YELLOW}⚠ Backend package.json not found${NC}"
fi
cd ..

# Build dashboard
echo -e "${GREEN}Building dashboard...${NC}"
cd metavr-dashboard
if [ -f "package.json" ]; then
    # Set production environment
    export NODE_ENV=production
    npm run build
    if [ -d ".next/standalone" ] && [ -d ".next/static" ]; then
        echo "Copying Next.js static assets for dashboard..."
        mkdir -p .next/standalone/.next
        rm -rf .next/standalone/.next/static
        cp -R .next/static .next/standalone/.next/static
    fi
    echo -e "${GREEN}✓ Dashboard built successfully${NC}"
else
    echo -e "${YELLOW}⚠ Dashboard package.json not found${NC}"
fi
cd ..

# Build card_matching
echo -e "${GREEN}Building card_matching...${NC}"
cd apps/card_matching
if [ -f "package.json" ]; then
    export NODE_ENV=production
    npm run build
    if [ -d ".next/standalone" ] && [ -d ".next/static" ]; then
        echo "Copying Next.js static assets for card_matching..."
        mkdir -p .next/standalone/.next
        rm -rf .next/standalone/.next/static
        cp -R .next/static .next/standalone/.next/static
    fi
    echo -e "${GREEN}✓ Card Matching built successfully${NC}"
else
    echo -e "${YELLOW}⚠ Card Matching package.json not found${NC}"
fi
cd ../..

# Build iq-questions
echo -e "${GREEN}Building iq-questions...${NC}"
cd apps/iq-questions
if [ -f "package.json" ]; then
    export NODE_ENV=production
    npm run build
    if [ -d ".next/standalone" ] && [ -d ".next/static" ]; then
        echo "Copying Next.js static assets for iq-questions..."
        mkdir -p .next/standalone/.next
        rm -rf .next/standalone/.next/static
        cp -R .next/static .next/standalone/.next/static
        # Copy data files needed by API routes
        echo "Copying data files for iq-questions..."
        if [ -f "questions.json" ]; then
            cp questions.json .next/standalone/questions.json
        fi
        if [ -f "config.json" ]; then
            cp config.json .next/standalone/config.json
        fi
    fi
    echo -e "${GREEN}✓ IQ Questions built successfully${NC}"
else
    echo -e "${YELLOW}⚠ IQ Questions package.json not found${NC}"
fi
cd ../..

echo ""
echo -e "${GREEN}=== All Applications Built! ===${NC}"


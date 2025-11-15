#!/bin/bash
# Helper script to start Docker services

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}  Unity Showcase - Docker Setup${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo -e "${RED}Error: Docker is not installed${NC}"
    exit 1
fi

# Check if Docker Compose is installed
if ! command -v docker-compose &> /dev/null && ! docker compose version &> /dev/null; then
    echo -e "${RED}Error: Docker Compose is not installed${NC}"
    exit 1
fi

# Determine which compose command to use
if docker compose version &> /dev/null; then
    COMPOSE_CMD="docker compose"
else
    COMPOSE_CMD="docker-compose"
fi

# Parse command line arguments
MODE=${1:-dev}

if [ "$MODE" = "prod" ]; then
    echo -e "${YELLOW}Starting services in PRODUCTION mode...${NC}"
    $COMPOSE_CMD -f docker-compose.prod.yml up -d --build
    echo ""
    echo -e "${GREEN}Services started!${NC}"
    echo -e "Frontend: ${GREEN}http://localhost:80${NC}"
elif [ "$MODE" = "dev" ]; then
    echo -e "${YELLOW}Starting services in DEVELOPMENT mode...${NC}"
    $COMPOSE_CMD up -d --build
    echo ""
    echo -e "${GREEN}Services started!${NC}"
    echo -e "Frontend: ${GREEN}http://localhost:5173${NC}"
else
    echo -e "${RED}Error: Invalid mode. Use 'dev' or 'prod'${NC}"
    echo "Usage: ./docker-start.sh [dev|prod]"
    exit 1
fi

echo ""
echo -e "${YELLOW}To view logs:${NC} $COMPOSE_CMD logs -f"
echo -e "${YELLOW}To stop services:${NC} $COMPOSE_CMD down"
echo ""

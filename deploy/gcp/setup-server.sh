#!/bin/bash

# Server Setup Script
# This script installs all required dependencies and sets up the server environment

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${GREEN}=== MetaVR Server Setup ===${NC}"
echo ""

# Check if running as root
if [ "$EUID" -ne 0 ]; then 
    echo -e "${RED}Please run as root (use sudo)${NC}"
    exit 1
fi

# Update system
echo -e "${GREEN}Updating system packages...${NC}"
export DEBIAN_FRONTEND=noninteractive
export UCF_FORCE_CONFOLD=1
export UCF_FORCE=1
apt-get update

# Install essential packages
echo -e "${GREEN}Installing essential packages...${NC}"
apt-get install -y \
    curl \
    wget \
    git \
    build-essential \
    ca-certificates \
    gnupg \
    lsb-release \
    ufw \
    nginx \
    certbot \
    python3-certbot-nginx \
    redis-server \
    supervisor

# Install Node.js 20.x
echo -e "${GREEN}Installing Node.js 20.x...${NC}"
if ! command -v node &> /dev/null || [ "$(node -v | cut -d'v' -f2 | cut -d'.' -f1)" -lt 20 ]; then
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
    apt-get install -y nodejs
fi

# Verify Node.js installation
NODE_VERSION=$(node -v)
NPM_VERSION=$(npm -v)
echo -e "${GREEN}Node.js version: $NODE_VERSION${NC}"
echo -e "${GREEN}npm version: $NPM_VERSION${NC}"

# Install Docker
echo -e "${GREEN}Installing Docker...${NC}"
if ! command -v docker &> /dev/null; then
    curl -fsSL https://get.docker.com -o get-docker.sh
    sh get-docker.sh
    rm get-docker.sh
    usermod -aG docker $SUDO_USER
fi

# Install Docker Compose
echo -e "${GREEN}Installing Docker Compose...${NC}"
if ! command -v docker-compose &> /dev/null; then
    curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
    chmod +x /usr/local/bin/docker-compose
fi

# Install PM2 for process management
echo -e "${GREEN}Installing PM2...${NC}"
if ! command -v pm2 &> /dev/null; then
    npm install -g pm2
    pm2 startup systemd -u $SUDO_USER --hp /home/$SUDO_USER
fi

# Configure Redis
echo -e "${GREEN}Configuring Redis...${NC}"
systemctl enable redis-server
systemctl start redis-server

# Configure firewall
echo -e "${GREEN}Configuring firewall...${NC}"
ufw --force enable
ufw allow 22/tcp   # SSH
ufw allow 80/tcp   # HTTP
ufw allow 443/tcp  # HTTPS
ufw allow 3000/tcp # Dashboard
ufw allow 3001/tcp # IQ Questions
ufw allow 3002/tcp # Card Matching
ufw allow 4000/tcp # Backend API

# Get the project directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"

# Create necessary directories
echo -e "${GREEN}Creating necessary directories...${NC}"
mkdir -p /var/log/metavr
mkdir -p /etc/metavr
chown -R $SUDO_USER:$SUDO_USER /var/log/metavr
chown -R $SUDO_USER:$SUDO_USER /etc/metavr

# Set up log rotation
cat > /etc/logrotate.d/metavr << 'EOF'
/var/log/metavr/*.log {
    daily
    missingok
    rotate 14
    compress
    delaycompress
    notifempty
    create 0640 root root
    sharedscripts
}
EOF

echo ""
echo -e "${GREEN}=== Server Setup Complete! ===${NC}"
echo ""
echo "Installed components:"
echo "  - Node.js $(node -v)"
echo "  - npm $(npm -v)"
echo "  - Docker $(docker --version)"
echo "  - Docker Compose $(docker-compose --version)"
echo "  - PM2 $(pm2 --version)"
echo "  - Nginx $(nginx -v 2>&1 | cut -d'/' -f2)"
echo "  - Redis $(redis-server --version | cut -d' ' -f3)"
echo ""
echo "Next steps:"
echo "1. Configure environment variables: ./deploy/gcp/configure-env.sh"
echo "2. Install project dependencies: cd $PROJECT_DIR && ./deploy/gcp/install-dependencies.sh"
echo "3. Build applications: ./deploy/gcp/build-apps.sh"
echo "4. Start services: ./deploy/gcp/start-services.sh"


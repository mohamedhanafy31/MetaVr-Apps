# MetaVR GCP VPS Deployment Guide

This guide will help you deploy all MetaVR applications to a Google Cloud Platform VPS (Compute Engine VM) while maintaining the same directory structure.

## Prerequisites

1. **Google Cloud Account**: You need a GCP account with billing enabled
2. **gcloud CLI**: Install the [Google Cloud SDK](https://cloud.google.com/sdk/docs/install)
3. **Authentication**: Run `gcloud auth login` to authenticate
4. **Project Setup**: Create or select a GCP project

## Quick Start

### Option 1: Quick Start (Recommended)

The configuration is already set for project `meta-478212` and zone `europe-west1-b` (nearest to Egypt):

```bash
cd deploy/gcp
chmod +x *.sh
./quick-start.sh
```

This will guide you through the entire deployment process.

### Option 2: Manual Steps

### 1. Configuration

The default configuration is set in `config.sh`:
- **Project ID**: `meta-478212`
- **Zone**: `europe-west1-b` (nearest to Egypt)
- **Instance Name**: `metavr-vps`

You can modify `config.sh` if needed, or override with environment variables:

```bash
export GCP_PROJECT_ID="meta-478212"
export GCP_ZONE="europe-west1-b"  # Nearest to Egypt
export VM_INSTANCE_NAME="metavr-vps"
export VM_MACHINE_TYPE="e2-standard-4"  # 4 vCPUs, 16GB RAM
```

### 2. Create VM Instance

```bash
cd deploy/gcp
chmod +x *.sh
./create-vm.sh
```

This will:
- Create a Compute Engine VM instance
- Set up firewall rules for HTTP, HTTPS, and application ports
- Configure the instance with appropriate resources

### 3. Deploy Files to VPS

```bash
./deploy-to-vps.sh
```

This will:
- Create a deployment archive (excluding node_modules, build artifacts)
- Transfer the entire project structure to the VPS
- Maintain the same directory structure

### 4. SSH into VPS and Complete Setup

```bash
gcloud compute ssh metavr-vps --zone=europe-west1-b
```

Once on the VPS:

```bash
cd /home/$USER/MetaVR/managment_test

# Run server setup (installs Node.js, Docker, PM2, Nginx, etc.)
sudo ./deploy/gcp/setup-server.sh

# Install dependencies for all apps
./deploy/gcp/install-dependencies.sh

# Configure environment variables
sudo ./deploy/gcp/configure-env.sh

# Edit .env files with your Firebase credentials
nano backend/.env
nano metavr-dashboard/.env.local

# Build all applications
./deploy/gcp/build-apps.sh

# Start all services
sudo ./deploy/gcp/start-services.sh
```

## Automated Deployment

You can also use the main deployment script which orchestrates everything:

**Locally:**
```bash
./deploy/gcp/deploy.sh
```

**On the VPS:**
```bash
./deploy/gcp/deploy.sh
```

## Directory Structure on VPS

The deployment maintains the same directory structure:

```
/home/$USER/MetaVR/managment_test/
├── backend/
├── metavr-dashboard/
├── apps/
│   ├── card_matching/
│   └── iq-questions/
├── deploy/
│   └── gcp/
└── docker-compose.yml
```

## Services

All applications run as PM2 processes:

- **metavr-backend**: Backend API (port 4000)
- **metavr-dashboard**: Main dashboard (port 3000)
- **metavr-iq-questions**: IQ Questions app (port 3001)
- **metavr-card-matching**: Card Matching app (port 3002)

## Nginx Configuration

Nginx acts as a reverse proxy:

- `/` → Dashboard (port 3000)
- `/api/` → Backend API (port 4000)
- `/iq-questions/` → IQ Questions app (port 3001)
- `/card-matching/` → Card Matching app (port 3002)

## SSL/HTTPS Setup

After deployment, set up SSL certificates:

```bash
sudo certbot --nginx -d your-domain.com
```

Then uncomment the HTTPS server block in `/etc/nginx/sites-available/metavr`.

## Management Commands

### PM2 Commands

```bash
pm2 status              # View all services
pm2 logs                # View all logs
pm2 logs metavr-backend # View specific service logs
pm2 restart all         # Restart all services
pm2 stop all            # Stop all services
pm2 monit               # Monitor services
```

### Service Management

```bash
# Restart Nginx
sudo systemctl restart nginx

# Check Nginx status
sudo systemctl status nginx

# View Nginx logs
sudo tail -f /var/log/nginx/metavr-access.log
sudo tail -f /var/log/nginx/metavr-error.log
```

## Environment Variables

### Required Variables

1. **Backend** (`backend/.env`):
   - `SESSION_SECRET`
   - `FIREBASE_SERVICE_ACCOUNT_JSON`
   - `DASHBOARD_ORIGIN`

2. **Dashboard** (`metavr-dashboard/.env.local`):
   - `SESSION_SECRET`
   - `ADMIN_SETUP_TOKEN`
   - `FIREBASE_SERVICE_ACCOUNT_JSON`
   - `NEXT_PUBLIC_FIREBASE_*` variables

### Generating Secrets

```bash
# Generate session secret
openssl rand -base64 32

# Generate admin setup token
openssl rand -base64 32
```

## Firewall Rules

The setup script creates these firewall rules:

- `allow-http`: Port 80 (HTTP)
- `allow-https`: Port 443 (HTTPS)
- `allow-metavr-apps`: Ports 3000, 3001, 3002, 4000

## Static IP Address

To get a static IP address:

```bash
# Create static IP
gcloud compute addresses create metavr-ip --region=europe-west1

# Get the IP address
gcloud compute addresses describe metavr-ip --region=europe-west1

# Assign to instance
gcloud compute instances delete-access-config metavr-vps \
    --zone=europe-west1-b \
    --access-config-name="External NAT"

gcloud compute instances add-access-config metavr-vps \
    --zone=europe-west1-b \
    --access-config-name="External NAT" \
    --address=YOUR_STATIC_IP
```

## Troubleshooting

### Services not starting

1. Check PM2 logs: `pm2 logs`
2. Check application logs: `/var/log/metavr/`
3. Verify environment variables are set correctly
4. Check if ports are available: `sudo netstat -tulpn | grep LISTEN`

### Nginx errors

1. Test configuration: `sudo nginx -t`
2. Check error logs: `sudo tail -f /var/log/nginx/error.log`
3. Verify upstream servers are running: `pm2 status`

### Build failures

1. Check Node.js version: `node -v` (should be 20.x)
2. Clear node_modules and reinstall: `rm -rf node_modules && npm ci`
3. Check disk space: `df -h`

## Updating Applications

To update applications:

```bash
# Pull latest changes (if using git)
git pull

# Reinstall dependencies
./deploy/gcp/install-dependencies.sh

# Rebuild applications
./deploy/gcp/build-apps.sh

# Restart services
pm2 restart all
```

## Backup

Important files to backup:

- Environment files (`.env`, `.env.local`)
- Firebase service account JSON
- Database (if using local database)
- Logs: `/var/log/metavr/`

## Cost Estimation

Approximate monthly costs for `e2-standard-4` (4 vCPUs, 16GB RAM):

- Compute Engine: ~$100-150/month
- Disk storage: ~$10-20/month
- Network egress: Variable (first 1GB free)

Consider using preemptible instances or smaller machine types for development.

## Support

For issues or questions:
1. Check the logs: `pm2 logs` and `/var/log/metavr/`
2. Verify all environment variables are set
3. Ensure firewall rules are configured correctly
4. Check GCP console for instance status


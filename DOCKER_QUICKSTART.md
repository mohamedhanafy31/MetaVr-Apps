# Docker Quick Start Guide

## 🚀 Quick Commands

### Start Everything (Development)
```bash
docker-compose up -d
```

### Start Everything (Production)
```bash
docker-compose -f docker-compose.prod.yml up -d
```

### View Logs
```bash
docker-compose logs -f
```

### Stop Everything
```bash
docker-compose down
```

### Rebuild After Changes
```bash
docker-compose up -d --build
```

## 📋 Using the Helper Script

```bash
# Development mode
./docker-start.sh dev

# Production mode
./docker-start.sh prod
```

## 🔧 Using Makefile

```bash
# Build all images
make build

# Start services
make up

# View logs
make logs

# Stop services
make down

# View frontend logs
make logs-frontend
```

## 🌐 Service URLs

### Development Mode
- Frontend: http://localhost:5173

### Production Mode
- Frontend: http://localhost:80

## 📁 Project Structure

```
unity_showcase/
├── docker-compose.yml          # Development compose file
├── docker-compose.prod.yml     # Production compose file
├── docker-start.sh             # Helper script
├── Makefile                    # Make commands
├── .dockerignore              # Root dockerignore
└── vite-project/
    ├── Dockerfile             # Frontend dev Dockerfile
    ├── Dockerfile.prod        # Frontend prod Dockerfile
    └── nginx.conf             # Nginx config for production
```

## ⚠️ Important Notes

1. **Frontend Only**: This Docker setup only includes the frontend service. Backend services should be run separately or configured externally.

2. **API Configuration**: If your frontend needs to connect to backend APIs, configure the `VITE_API_URL` environment variable in `docker-compose.yml` or set it in your frontend configuration.

## 🐛 Troubleshooting

### Service won't start
```bash
# Check logs
docker-compose logs frontend

# Rebuild
docker-compose build frontend
docker-compose up -d frontend
```

### Port already in use
```bash
# Check what's using the port
sudo lsof -i :5173  # Development
sudo lsof -i :80    # Production

# Stop the conflicting service or change ports in docker-compose.yml
```

### Clean everything and start fresh
```bash
docker-compose down -v
docker-compose build --no-cache
docker-compose up -d
```

## 📚 More Information

See `README.Docker.md` for detailed documentation.

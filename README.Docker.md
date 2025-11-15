# Docker Setup for Unity Showcase

This document explains how to use Docker and Docker Compose to run the Unity Showcase project.

## Prerequisites

- Docker Engine 20.10 or later
- Docker Compose 2.0 or later

## Quick Start

### Development Mode

To start all services in development mode:

```bash
docker-compose up
```

To run in detached mode (background):

```bash
docker-compose up -d
```

To view logs:

```bash
docker-compose logs -f
```

To stop all services:

```bash
docker-compose down
```

### Production Mode

To start all services in production mode:

```bash
docker-compose -f docker-compose.prod.yml up -d
```

## Services

The Docker Compose setup includes the following services:

1. **Gateway API** (Port 8000)
   - Main API gateway that routes requests to backend services
   - Health check: `http://localhost:8000/health`

2. **RAG Backend** (Port 8001)
   - E-commerce Arabic RAG service
   - Health check: `http://localhost:8001/health`

3. **TTS API** (Port 8002)
   - Text-to-Speech API service
   - Health check: `http://localhost:8002/health`

4. **Frontend** (Port 5173 - Dev, Port 80 - Prod)
   - Vite React application
   - Development: `http://localhost:5173`
   - Production: `http://localhost:80`

## Building Images

To build all images:

```bash
docker-compose build
```

To build a specific service:

```bash
docker-compose build gateway-api
docker-compose build rag-backend
docker-compose build tts-api
docker-compose build frontend
```

## Environment Variables

### Gateway API
- `RAG_API_URL`: URL of the RAG backend service (default: `http://rag-backend:8001`)
- `TTS_API_URL`: URL of the TTS API service (default: `http://tts-api:8002`)

### RAG Backend
- `PORT`: Port to run the service on (default: `8001`)

### TTS API
- `PORT`: Port to run the service on (default: `8002`)

### Frontend
- `VITE_API_URL`: API URL for the frontend (default: `http://localhost:8000`)

You can override these by creating a `.env` file or setting them in `docker-compose.yml`.

## Volumes

The following volumes are used:

- `rag-data`: Persistent storage for RAG backend data
- `rag-temp`: Temporary files for RAG backend
- `tts-data`: Persistent storage for TTS API audio files

## Networking

All services are connected via a Docker bridge network named `unity-network`. Services can communicate with each other using their service names as hostnames.

## Health Checks

All services include health checks that run every 30 seconds. You can check the health status:

```bash
docker-compose ps
```

## Troubleshooting

### View logs for a specific service:

```bash
docker-compose logs gateway-api
docker-compose logs rag-backend
docker-compose logs tts-api
docker-compose logs frontend
```

### Restart a specific service:

```bash
docker-compose restart gateway-api
```

### Rebuild and restart:

```bash
docker-compose up -d --build
```

### Clean up everything:

```bash
docker-compose down -v
```

This will remove containers, networks, and volumes.

## Development vs Production

### Development (`docker-compose.yml`)
- Frontend runs Vite dev server with hot reload
- Source code is mounted as volumes for live updates
- More verbose logging

### Production (`docker-compose.prod.yml`)
- Frontend is built and served via Nginx
- No source code volumes (images are self-contained)
- Optimized for performance
- Frontend served on port 80

## Notes

- Make sure the `ai-backend` directory exists with all required Python files
- Ensure `requirements.txt` files exist in each Python service directory
- The TTS API requires `tts-key.json` file (should be provided separately for security)
- For production, consider using environment variables or secrets management for sensitive data


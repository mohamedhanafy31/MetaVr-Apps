# 🚀 Unity WebGL Deployment on Google Cloud - Complete Guide

## 📋 Overview

This document provides a comprehensive guide on deploying Unity WebGL projects to Google Cloud Platform (GCP), covering architecture, best practices, optimization strategies, and troubleshooting.

## 🏗️ Architecture Overview

### Current Implementation

```
┌─────────────────────────────────────────────────────────────┐
│                    GitHub Actions CI/CD                      │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  1. Setup GCS & Upload Unity Files                   │   │
│  │     - Download from Google Drive                     │   │
│  │     - Extract RAR files                              │   │
│  │     - Upload to GCS bucket                           │   │
│  │     - Setup Cloud CDN                                │   │
│  └──────────────────────────────────────────────────────┘   │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  2. Build & Deploy                                   │   │
│  │     - Build Docker image                             │   │
│  │     - Push to Container Registry                     │   │
│  │     - Deploy to Cloud Run                            │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                    Google Cloud Run                          │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  Nginx Container (Port 8080)                         │   │
│  │  - Serves React App (SPA)                            │   │
│  │  - Proxies Unity files to GCS/CDN                    │   │
│  │  - Handles gzip compression                          │   │
│  │  - CORS headers                                      │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│              Google Cloud Storage (GCS)                      │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  Unity WebGL Files                                   │   │
│  │  - Build/ directory (wasm.gz, data.gz, js.gz)       │   │
│  │  - TemplateData/ directory                           │   │
│  │  - index.html                                        │   │
│  │  - Public read access                                │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                    Cloud CDN (Optional)                      │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  Edge Caching                                        │   │
│  │  - Global distribution                               │   │
│  │  - Reduced latency                                   │   │
│  │  - Better performance                                │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

## 🎯 Why This Architecture?

### 1. **Separation of Concerns**
- **Cloud Run**: Serves React SPA (small, fast)
- **GCS**: Hosts Unity WebGL files (large, static)
- **CDN**: Caches Unity files globally (performance)

### 2. **Cost Optimization**
- Cloud Run: Pay per request (cheap for SPA)
- GCS: $0.020 per GB/month (cheap storage)
- CDN: $0.08 per GB egress (cheaper than Cloud Run egress)

### 3. **Performance Benefits**
- **CDN Edge Caching**: Files served from nearest location
- **No Redirect Latency**: `proxy_pass` instead of `redirect`
- **Proper Compression**: Gzip/Brotli support
- **Cache Headers**: Long-term caching for immutable files

## 📦 Components Breakdown

### 1. Dockerfile (Multi-Stage Build)

```dockerfile
# Stage 1: Builder
FROM node:20-slim AS builder
- Downloads Unity files from Google Drive
- Extracts RAR files
- Builds React application
- Output: /app/dist/

# Stage 2: Nginx Server
FROM nginx:alpine
- Copies built React app
- Configures nginx with template
- Entrypoint script for env substitution
- Serves on port 8080 (Cloud Run requirement)
```

**Key Features:**
- Multi-stage build reduces final image size
- Downloads Unity files at build time (not runtime)
- Uses nginx:alpine for smaller image size
- Template-based configuration for flexibility

### 2. Nginx Configuration

```nginx
# Key Features:
1. proxy_pass to GCS/CDN (no redirect latency)
2. Proper Content-Encoding headers for .gz files
3. CORS headers for Unity WebGL
4. Cache headers for performance
5. SPA routing support
```

**Critical Headers for Unity WebGL:**
```nginx
Content-Encoding: gzip          # Required for .gz files
Content-Type: application/wasm  # Required for WASM files
Cross-Origin-Embedder-Policy: require-corp
Cross-Origin-Opener-Policy: same-origin
Cross-Origin-Resource-Policy: cross-origin
```

### 3. Google Cloud Storage Setup

**Bucket Structure:**
```
gs://metavr-assets/
└── unity/
    └── npc/
        ├── Build/
        │   ├── yes.wasm.gz
        │   ├── yes.data.gz
        │   ├── yes.framework.js.gz
        │   └── yes.loader.js
        ├── TemplateData/
        │   └── style.css
        └── index.html
```

**File Metadata:**
- `.wasm.gz`: `Content-Type: application/wasm`, `Content-Encoding: gzip`
- `.data.gz`: `Content-Type: application/octet-stream`, `Content-Encoding: gzip`
- `.js.gz`: `Content-Type: application/javascript`, `Content-Encoding: gzip`
- `Cache-Control: public, max-age=31536000, immutable`

### 4. Cloud CDN Configuration

**Components:**
1. **Backend Bucket**: Points to GCS bucket
2. **URL Map**: Routes requests to backend
3. **HTTP Proxy**: Handles HTTP requests
4. **Forwarding Rule**: Routes traffic to proxy
5. **Static IP**: Public IP for CDN

**Benefits:**
- Global edge caching
- Reduced latency (50-150ms vs 200-400ms)
- Lower egress costs
- Better user experience

## 🔧 Deployment Process

### Step 1: GitHub Actions Workflow

**Job 1: Setup GCS & Upload Unity Files**
```yaml
1. Authenticate to GCP
2. Enable required APIs (Storage, Compute)
3. Download Unity files from Google Drive
4. Extract RAR files
5. Create/verify GCS bucket
6. Configure CORS
7. Upload Unity files with correct metadata
8. Setup Cloud CDN (if enabled)
9. Output CDN IP for deployment
```

**Job 2: Build & Deploy**
```yaml
1. Build Docker image
2. Push to Container Registry
3. Deploy to Cloud Run
4. Set environment variables (CDN_IP, GCS_BUCKET)
5. Health check
```

### Step 2: Cloud Build Pipeline

**Steps:**
1. Prepare build configuration (SHORT_SHA)
2. Build Docker image
3. Push tagged image
4. Push latest image
5. Deploy to Cloud Run

**Substitutions:**
- `_SHORT_SHA`: Git commit short SHA
- `_COMMIT_SHA`: Full git commit SHA
- `_UNITY_GCS_BUCKET`: GCS bucket name
- `_CDN_IP`: CDN static IP address

### Step 3: Cloud Run Deployment

**Configuration:**
- **Port**: 8080 (Cloud Run requirement)
- **Memory**: 512Mi
- **CPU**: 1
- **Min Instances**: 0 (scale to zero)
- **Max Instances**: 10
- **Timeout**: 300s

**Environment Variables:**
- `PORT=8080` (set by Cloud Run)
- `CDN_IP` (optional, for CDN proxy)
- `VITE_UNITY_GCS_BUCKET` (optional, for React app)

## 🚀 Performance Optimizations

### 1. **proxy_pass Instead of redirect**

**Before (redirect):**
```
Browser → Cloud Run (302 redirect) → Browser (new request) → GCS
Latency: ~500-800ms per file
```

**After (proxy_pass):**
```
Browser → Cloud Run (proxy) → GCS
Latency: ~200-400ms per file
```

**With CDN:**
```
Browser → Cloud Run (proxy) → CDN Edge → GCS
Latency: ~50-150ms per file
```

### 2. **Proper Compression**

**Unity WebGL Files:**
- Pre-compressed with Gzip (`.gz` extension)
- Nginx serves with `Content-Encoding: gzip`
- Browser automatically decompresses

**Future Enhancement:**
- Brotli compression (15-20% better than Gzip)
- Automatic `.br` file generation
- Fallback to `.gz` if `.br` not available

### 3. **Cache Headers**

**Immutable Files:**
```
Cache-Control: public, max-age=31536000, immutable
Expires: 1 year
```

**HTML Files:**
```
Cache-Control: public, max-age=3600
Expires: 1 hour
```

### 4. **CDN Edge Caching**

**Benefits:**
- Files cached at edge locations globally
- Reduced latency for users worldwide
- Lower bandwidth costs
- Better scalability

## 📊 Cost Analysis

### Monthly Costs (Estimated)

**Cloud Run:**
- Requests: ~$0.40 per million requests
- CPU/Memory: ~$0.10 per million requests
- **Total**: ~$5-10/month (for moderate traffic)

**GCS:**
- Storage: $0.020 per GB/month
- Operations: $0.05 per 10,000 operations
- **Total**: ~$1-2/month (for 50GB Unity files)

**Cloud CDN:**
- Egress: $0.08 per GB (first 10TB)
- Load Balancer: ~$18/month (fixed)
- **Total**: ~$20-30/month (with CDN)

**Total Estimated Cost:**
- **Without CDN**: ~$6-12/month
- **With CDN**: ~$26-42/month

## 🔍 Troubleshooting

### Common Issues

#### 1. **Container Fails to Start**

**Symptoms:**
- `The user-provided container failed to start and listen on port 8080`

**Solutions:**
- Check nginx configuration syntax
- Verify PORT environment variable is set
- Check entrypoint script execution
- Review Cloud Run logs

#### 2. **Unity Files Not Loading**

**Symptoms:**
- 404 errors for Unity files
- CORS errors in browser console

**Solutions:**
- Verify GCS bucket is publicly accessible
- Check CORS configuration
- Verify file paths in GCS
- Check nginx proxy_pass configuration

#### 3. **Gzip Files Not Working**

**Symptoms:**
- `Unable to parse Build/yes.framework.js.gz!`
- Unity loader errors

**Solutions:**
- Verify `Content-Encoding: gzip` header
- Check `Content-Type` headers
- Ensure nginx doesn't double-compress
- Verify file extensions (.gz)

#### 4. **CDN Not Working**

**Symptoms:**
- Still using GCS directly
- No performance improvement

**Solutions:**
- Verify CDN IP is set in Cloud Run
- Check nginx proxy_pass configuration
- Verify CDN backend bucket is configured
- Check forwarding rule is active

## 📚 Best Practices

### 1. **File Organization**

```
✅ Good:
- Separate React app from Unity files
- Use GCS for large static files
- Keep React app in Cloud Run (small, fast)

❌ Bad:
- Including Unity files in Docker image (large, slow)
- Serving Unity files from Cloud Run (expensive)
```

### 2. **Compression Strategy**

```
✅ Good:
- Pre-compress Unity files at build time
- Use Gzip for compatibility
- Consider Brotli for better compression

❌ Bad:
- Compressing at runtime (slow)
- Double compression (nginx + Unity)
```

### 3. **Caching Strategy**

```
✅ Good:
- Long cache for immutable files (1 year)
- Short cache for HTML (1 hour)
- Use CDN for global caching

❌ Bad:
- No cache headers
- Short cache for immutable files
- Cache everything forever
```

### 4. **Security**

```
✅ Good:
- Public read for static assets
- CORS properly configured
- HTTPS everywhere
- No sensitive data in client

❌ Bad:
- Public write access
- Missing CORS headers
- HTTP only
- Exposing API keys
```

## 🔄 Alternative Deployment Options

### 1. **Firebase Hosting**

**Pros:**
- Simple deployment
- Built-in CDN
- Free tier available
- Easy custom domain

**Cons:**
- Less control over server configuration
- Limited for complex setups
- Not suitable for large files

### 2. **Google App Engine**

**Pros:**
- Automatic scaling
- Free tier available
- Simple deployment

**Cons:**
- Less flexible than Cloud Run
- Limited for large files
- More expensive at scale

### 3. **Google Kubernetes Engine (GKE)**

**Pros:**
- Full control
- High scalability
- Complex architectures

**Cons:**
- More complex setup
- Higher costs
- Overkill for simple apps

## 📖 References

### Official Documentation
- [Cloud Run Documentation](https://cloud.google.com/run/docs)
- [Cloud Storage Documentation](https://cloud.google.com/storage/docs)
- [Cloud CDN Documentation](https://cloud.google.com/cdn/docs)
- [Unity WebGL Optimization](https://docs.unity3d.com/Manual/webgl-performance.html)

### Related Files in This Project
- `vite-project/Dockerfile.prod`: Docker build configuration
- `vite-project/nginx.conf`: Nginx server configuration
- `cloudbuild.yaml`: Cloud Build pipeline
- `.github/workflows/deploy-gcp.yml`: GitHub Actions workflow
- `PERFORMANCE_OPTIMIZATIONS.md`: Performance optimization details
- `GCS_CDN_SETUP.md`: GCS and CDN setup guide

## 🎓 Key Takeaways

1. **Separate Concerns**: React app in Cloud Run, Unity files in GCS
2. **Use CDN**: Significantly improves performance globally
3. **Proper Headers**: Critical for Unity WebGL to work correctly
4. **Optimize Costs**: Use appropriate services for each component
5. **Monitor Performance**: Track metrics and optimize continuously

## 🔮 Future Enhancements

1. **Brotli Compression**: Better compression than Gzip
2. **Split WebGL Build**: Load only required chunks
3. **Lazy Loading**: Load Unity assets on demand
4. **Service Worker**: Offline support and caching
5. **Analytics**: Track loading times and errors

---

**Last Updated**: 2025-11-15
**Version**: 1.0


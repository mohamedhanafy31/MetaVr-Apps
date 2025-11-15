#!/bin/bash
# Setup GCS bucket for Unity Build files
# This script creates a bucket, configures CORS, and makes it ready for file uploads

set -e

# Configuration
PROJECT="${GCP_PROJECT:-meta-478212}"
BUCKET_NAME="${GCS_BUCKET_NAME:-metavr-unity-build-$(date +%s)}"
REGION="${GCS_REGION:-us-central1}"
CORS_FILE="cors.json"

# Cloud Run service URLs (update these if your URLs change)
CLOUD_RUN_URL1="https://metavr-frontend-dbgj63mjca-uc.a.run.app"
CLOUD_RUN_URL2="https://metavr-frontend-452474241422.us-central1.run.app"

echo "=========================================="
echo "🚀 Setting up GCS bucket for Unity Build"
echo "=========================================="
echo "Project: $PROJECT"
echo "Bucket: $BUCKET_NAME"
echo "Region: $REGION"
echo ""

# Step 1: Create bucket
echo "📦 Step 1: Creating GCS bucket..."
gsutil mb -p "$PROJECT" -c STANDARD -l "$REGION" "gs://$BUCKET_NAME/" || {
    echo "⚠️  Bucket might already exist, continuing..."
}

# Verify bucket exists
echo ""
echo "✅ Verifying bucket exists..."
gsutil ls -b "gs://$BUCKET_NAME" || {
    echo "❌ Failed to create or verify bucket"
    exit 1
}

# Step 2: Create CORS configuration
echo ""
echo "🌐 Step 2: Creating CORS configuration..."
cat > "$CORS_FILE" << EOF
[
  {
    "origin": ["$CLOUD_RUN_URL1", "$CLOUD_RUN_URL2", "http://localhost:5173", "http://localhost:3000"],
    "method": ["GET", "HEAD", "OPTIONS"],
    "responseHeader": [
      "Content-Type",
      "Content-Encoding",
      "Cache-Control",
      "Cross-Origin-Embedder-Policy",
      "Cross-Origin-Opener-Policy",
      "Cross-Origin-Resource-Policy"
    ],
    "maxAgeSeconds": 3600
  }
]
EOF

echo "CORS configuration created:"
cat "$CORS_FILE"
echo ""

# Apply CORS
echo "📤 Applying CORS configuration..."
gsutil cors set "$CORS_FILE" "gs://$BUCKET_NAME"

# Verify CORS
echo ""
echo "✅ Verifying CORS configuration..."
gsutil cors get "gs://$BUCKET_NAME"

# Step 3: Make bucket public (for public read access)
echo ""
echo "🔓 Step 3: Making bucket publicly readable..."
gsutil iam ch allUsers:objectViewer "gs://$BUCKET_NAME" || {
    echo "⚠️  Failed to make bucket public. You may need to set individual file permissions."
}

echo ""
echo "=========================================="
echo "✅ GCS bucket setup complete!"
echo "=========================================="
echo ""
echo "Bucket name: $BUCKET_NAME"
echo "Bucket URL: https://storage.googleapis.com/$BUCKET_NAME"
echo ""
echo "Next steps:"
echo "1. Run ./upload-unity-files-to-gcs.sh to upload Unity files"
echo "2. Set environment variable: VITE_UNITY_GCS_BUCKET=$BUCKET_NAME"
echo "3. Update your Cloud Run service with the environment variable"
echo ""
echo "To use this bucket, set in your .env file:"
echo "VITE_UNITY_GCS_BUCKET=$BUCKET_NAME"
echo ""


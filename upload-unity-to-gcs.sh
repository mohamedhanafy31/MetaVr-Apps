#!/bin/bash
# Upload Unity WebGL files to Google Cloud Storage
# This script uploads Unity files to GCS for CDN delivery

set -e

# Configuration
BUCKET_NAME="${GCS_BUCKET_NAME:-metavr-assets}"
UNITY_BUILD_DIR="${UNITY_BUILD_DIR:-vite-project/public/unity/npc/Build}"
PROJECT_ID="${GCP_PROJECT:-meta-478212}"

echo "=========================================="
echo "📤 Uploading Unity WebGL files to GCS"
echo "=========================================="
echo "Bucket: gs://$BUCKET_NAME"
echo "Source: $UNITY_BUILD_DIR"
echo "Project: $PROJECT_ID"
echo ""

# Check if build directory exists
if [ ! -d "$UNITY_BUILD_DIR" ]; then
    echo "❌ Error: Build directory not found: $UNITY_BUILD_DIR"
    echo ""
    echo "Please ensure Unity files are extracted to: $UNITY_BUILD_DIR"
    echo "Or set UNITY_BUILD_DIR environment variable to the correct path"
    exit 1
fi

# Check if gsutil is available
if ! command -v gsutil &> /dev/null; then
    echo "❌ Error: gsutil is not installed or not in PATH"
    echo "Please install Google Cloud SDK: https://cloud.google.com/sdk/docs/install"
    exit 1
fi

# Set project
echo "🔧 Setting GCP project..."
gcloud config set project "$PROJECT_ID" || {
    echo "⚠️  Warning: Could not set project. Continuing..."
}

# Create bucket if it doesn't exist
echo ""
echo "📦 Checking/Creating GCS bucket..."
if ! gsutil ls -b "gs://$BUCKET_NAME" >/dev/null 2>&1; then
    echo "Creating bucket: gs://$BUCKET_NAME"
    gsutil mb -p "$PROJECT_ID" -c STANDARD -l us-central1 "gs://$BUCKET_NAME/" || {
        echo "⚠️  Warning: Could not create bucket. It might already exist or you may not have permissions."
    }
else
    echo "✅ Bucket already exists: gs://$BUCKET_NAME"
fi

# Configure CORS for browser access
echo ""
echo "🌐 Configuring CORS..."
cat > /tmp/cors.json << 'EOF'
[
  {
    "origin": ["*"],
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
gsutil cors set /tmp/cors.json "gs://$BUCKET_NAME"
rm -f /tmp/cors.json
echo "✅ CORS configured"

# Make bucket publicly readable
echo ""
echo "🔓 Making bucket publicly readable..."
gsutil iam ch allUsers:objectViewer "gs://$BUCKET_NAME" || {
    echo "⚠️  Warning: Could not set public access. You may need to set it manually."
}

# Upload Unity files with correct metadata
echo ""
echo "📤 Uploading Unity WebGL files..."
echo ""

# Upload .wasm.gz files
echo "1. Uploading .wasm.gz files..."
find "$UNITY_BUILD_DIR" -name "*.wasm.gz" -type f | while read -r file; do
    filename=$(basename "$file")
    echo "   Uploading $filename..."
    gsutil -h "Content-Type:application/wasm" \
           -h "Content-Encoding:gzip" \
           cp "$file" "gs://$BUCKET_NAME/unity/npc/Build/$filename"
done

# Upload .data.gz files
echo "2. Uploading .data.gz files..."
find "$UNITY_BUILD_DIR" -name "*.data.gz" -type f | while read -r file; do
    filename=$(basename "$file")
    echo "   Uploading $filename..."
    gsutil -h "Content-Type:application/octet-stream" \
           -h "Content-Encoding:gzip" \
           cp "$file" "gs://$BUCKET_NAME/unity/npc/Build/$filename"
done

# Upload .js.gz files
echo "3. Uploading .js.gz files..."
find "$UNITY_BUILD_DIR" -name "*.js.gz" -type f | while read -r file; do
    filename=$(basename "$file")
    echo "   Uploading $filename..."
    gsutil -h "Content-Type:application/javascript" \
           -h "Content-Encoding:gzip" \
           cp "$file" "gs://$BUCKET_NAME/unity/npc/Build/$filename"
done

# Upload .js files (non-gzipped like loader.js)
echo "4. Uploading .js files (non-gzipped)..."
find "$UNITY_BUILD_DIR" -name "*.js" -type f ! -name "*.gz" | while read -r file; do
    filename=$(basename "$file")
    echo "   Uploading $filename..."
    gsutil -h "Content-Type:application/javascript" \
           cp "$file" "gs://$BUCKET_NAME/unity/npc/Build/$filename"
done

# Upload TemplateData directory (usually in parent directory, not Build/)
echo "5. Uploading TemplateData directory..."
NPC_PARENT_DIR="$(dirname "$UNITY_BUILD_DIR")"
if [ -d "$NPC_PARENT_DIR/TemplateData" ]; then
    echo "   Found TemplateData in parent directory..."
    gsutil -m cp -r "$NPC_PARENT_DIR/TemplateData" "gs://$BUCKET_NAME/unity/npc/"
elif [ -d "$UNITY_BUILD_DIR/TemplateData" ]; then
    echo "   Found TemplateData in Build directory..."
    gsutil -m cp -r "$UNITY_BUILD_DIR/TemplateData" "gs://$BUCKET_NAME/unity/npc/Build/"
else
    echo "   ⚠️ TemplateData directory not found (may cause 404 errors)"
fi

# Upload index.html if it exists in parent directory
echo "6. Uploading index.html..."
if [ -f "$NPC_PARENT_DIR/index.html" ]; then
    echo "   Found index.html in parent directory..."
    gsutil -h "Content-Type:text/html" \
           cp "$NPC_PARENT_DIR/index.html" "gs://$BUCKET_NAME/unity/npc/index.html"
else
    echo "   ⚠️ index.html not found (may cause 404 errors)"
fi

# Upload logo files (logo1.png, logo2.png, etc.)
echo "7. Uploading logo and image files..."
find "$NPC_PARENT_DIR" -maxdepth 1 -type f \( -name "logo*.png" -o -name "logo*.jpg" -o -name "favicon.ico" -o -name "*.css" \) 2>/dev/null | while read -r file; do
    filename=$(basename "$file")
    ext="${filename##*.}"
    case "$ext" in
      png) content_type="image/png" ;;
      jpg|jpeg) content_type="image/jpeg" ;;
      ico) content_type="image/x-icon" ;;
      css) content_type="text/css" ;;
      *) content_type="application/octet-stream" ;;
    esac
    echo "   Uploading $filename ($content_type)..."
    gsutil -h "Content-Type:$content_type" \
           cp "$file" "gs://$BUCKET_NAME/unity/npc/$filename"
done || echo "   No logo/image files found"

# Upload all other files from npc directory (style.css, etc.)
echo "8. Uploading other files from npc directory..."
if [ -d "$NPC_PARENT_DIR" ]; then
    find "$NPC_PARENT_DIR" -maxdepth 1 -type f ! -name "*.rar" ! -name "*.zip" 2>/dev/null | while read -r file; do
        filename=$(basename "$file")
        # Skip if already uploaded
        if [[ "$filename" != "index.html" ]] && [[ ! "$filename" =~ ^logo ]] && [[ "$filename" != "favicon.ico" ]]; then
            ext="${filename##*.}"
            case "$ext" in
              css) content_type="text/css" ;;
              json) content_type="application/json" ;;
              *) content_type="application/octet-stream" ;;
            esac
            echo "   Uploading $filename ($content_type)..."
            gsutil -h "Content-Type:$content_type" \
                   cp "$file" "gs://$BUCKET_NAME/unity/npc/$filename"
        fi
    done || echo "   No additional files found"
fi

# Upload index.html if it exists in parent directory
if [ -f "$(dirname "$UNITY_BUILD_DIR")/index.html" ]; then
    echo "   Uploading index.html..."
    gsutil -h "Content-Type:text/html" \
           cp "$(dirname "$UNITY_BUILD_DIR")/index.html" "gs://$BUCKET_NAME/unity/npc/index.html"
fi

echo ""
echo "=========================================="
echo "✅ Upload complete!"
echo "=========================================="
echo ""
echo "📋 Verifying uploaded files..."
gsutil ls -lh "gs://$BUCKET_NAME/unity/npc/Build/" | head -20

echo ""
echo "🔗 Public URLs:"
echo "   https://storage.googleapis.com/$BUCKET_NAME/unity/npc/Build/yes.loader.js"
echo "   https://storage.googleapis.com/$BUCKET_NAME/unity/npc/Build/yes.data.gz"
echo "   https://storage.googleapis.com/$BUCKET_NAME/unity/npc/Build/yes.wasm.gz"
echo ""
echo "📝 Next steps:"
echo "   1. Enable Cloud CDN on the bucket (see GCS_CDN_SETUP.md)"
echo "   2. Deploy your Cloud Run service with the updated nginx.conf"
echo "   3. Test the redirect: https://YOUR-SERVICE.run.app/unity/npc/Build/yes.data.gz"
echo ""


#!/bin/bash
# Upload Unity Build files to GCS with correct metadata
# This script uploads files from the extracted Unity Build directory to GCS

set -e

# Configuration
BUCKET_NAME="${GCS_BUCKET_NAME:-}"
BUILD_DIR="${UNITY_BUILD_DIR:-vite-project/public/unity/npc/Build}"

if [ -z "$BUCKET_NAME" ]; then
    echo "❌ Error: GCS_BUCKET_NAME environment variable is required"
    echo ""
    echo "Usage:"
    echo "  export GCS_BUCKET_NAME=your-bucket-name"
    echo "  ./upload-unity-files-to-gcs.sh"
    echo ""
    echo "Or set it inline:"
    echo "  GCS_BUCKET_NAME=your-bucket-name ./upload-unity-files-to-gcs.sh"
    exit 1
fi

if [ ! -d "$BUILD_DIR" ]; then
    echo "❌ Error: Build directory not found: $BUILD_DIR"
    echo ""
    echo "Please ensure Unity files are extracted to: $BUILD_DIR"
    echo "Or set UNITY_BUILD_DIR environment variable to the correct path"
    exit 1
fi

echo "=========================================="
echo "📤 Uploading Unity Build files to GCS"
echo "=========================================="
echo "Bucket: gs://$BUCKET_NAME"
echo "Source: $BUILD_DIR"
echo ""

# Check if required files exist
REQUIRED_FILES=(
    "yes.loader.js"
    "yes.data.gz"
    "yes.wasm.gz"
    "yes.framework.js.gz"
)

echo "🔍 Checking for required files..."
MISSING_FILES=()
for file in "${REQUIRED_FILES[@]}"; do
    if [ ! -f "$BUILD_DIR/$file" ]; then
        MISSING_FILES+=("$file")
        echo "  ❌ Missing: $file"
    else
        echo "  ✅ Found: $file ($(du -h "$BUILD_DIR/$file" | cut -f1))"
    fi
done

if [ ${#MISSING_FILES[@]} -gt 0 ]; then
    echo ""
    echo "❌ Error: Missing required files. Please extract Unity Build files first."
    exit 1
fi

echo ""
echo "📤 Uploading files with correct metadata..."
echo ""

# Upload yes.wasm.gz as yes.wasm (with gzip encoding)
echo "1. Uploading yes.wasm.gz → yes.wasm (with gzip encoding)..."
gsutil -h "Content-Type:application/wasm" \
       -h "Content-Encoding:gzip" \
       cp "$BUILD_DIR/yes.wasm.gz" "gs://$BUCKET_NAME/unity/npc/Build/yes.wasm"

# Upload yes.data.gz as yes.data (with gzip encoding)
echo "2. Uploading yes.data.gz → yes.data (with gzip encoding)..."
gsutil -h "Content-Type:application/octet-stream" \
       -h "Content-Encoding:gzip" \
       cp "$BUILD_DIR/yes.data.gz" "gs://$BUCKET_NAME/unity/npc/Build/yes.data"

# Upload yes.framework.js.gz as yes.framework.js (with gzip encoding)
echo "3. Uploading yes.framework.js.gz → yes.framework.js (with gzip encoding)..."
gsutil -h "Content-Type:application/javascript" \
       -h "Content-Encoding:gzip" \
       cp "$BUILD_DIR/yes.framework.js.gz" "gs://$BUCKET_NAME/unity/npc/Build/yes.framework.js"

# Upload yes.loader.js (not gzipped)
echo "4. Uploading yes.loader.js..."
gsutil -h "Content-Type:application/javascript" \
       cp "$BUILD_DIR/yes.loader.js" "gs://$BUCKET_NAME/unity/npc/Build/yes.loader.js"

# Upload any other files in Build directory (TemplateData, etc.)
if [ -d "$BUILD_DIR/TemplateData" ]; then
    echo "5. Uploading TemplateData directory..."
    gsutil -m cp -r "$BUILD_DIR/TemplateData" "gs://$BUCKET_NAME/unity/npc/Build/"
fi

# Upload any other .js files (not gzipped)
echo "6. Uploading other JavaScript files..."
for js_file in "$BUILD_DIR"/*.js; do
    if [ -f "$js_file" ] && [[ "$js_file" != *"loader.js" ]]; then
        filename=$(basename "$js_file")
        echo "   Uploading $filename..."
        gsutil -h "Content-Type:application/javascript" \
               cp "$js_file" "gs://$BUCKET_NAME/unity/npc/Build/$filename"
    fi
done

# Upload any other assets (images, etc.)
echo "7. Uploading other assets..."
for asset in "$BUILD_DIR"/*.{png,jpg,jpeg,gif,svg,json}; do
    if [ -f "$asset" ]; then
        filename=$(basename "$asset")
        ext="${filename##*.}"
        case "$ext" in
            png) content_type="image/png" ;;
            jpg|jpeg) content_type="image/jpeg" ;;
            gif) content_type="image/gif" ;;
            svg) content_type="image/svg+xml" ;;
            json) content_type="application/json" ;;
            *) content_type="application/octet-stream" ;;
        esac
        echo "   Uploading $filename ($content_type)..."
        gsutil -h "Content-Type:$content_type" \
               cp "$asset" "gs://$BUCKET_NAME/unity/npc/Build/$filename"
    fi
done

echo ""
echo "=========================================="
echo "✅ Upload complete!"
echo "=========================================="
echo ""

# Verify uploaded files
echo "🔍 Verifying uploaded files..."
echo ""
gsutil ls -lh "gs://$BUCKET_NAME/unity/npc/Build/" | grep -E "yes\.(wasm|data|framework\.js|loader\.js)$"

echo ""
echo "📋 Verifying metadata for critical files..."
echo ""

echo "yes.wasm metadata:"
gsutil stat "gs://$BUCKET_NAME/unity/npc/Build/yes.wasm" | grep -E "Content-Type:|Content-Encoding:"

echo ""
echo "yes.data metadata:"
gsutil stat "gs://$BUCKET_NAME/unity/npc/Build/yes.data" | grep -E "Content-Type:|Content-Encoding:"

echo ""
echo "yes.framework.js metadata:"
gsutil stat "gs://$BUCKET_NAME/unity/npc/Build/yes.framework.js" | grep -E "Content-Type:|Content-Encoding:"

echo ""
echo "=========================================="
echo "✅ All files uploaded successfully!"
echo "=========================================="
echo ""
echo "Base URL: https://storage.googleapis.com/$BUCKET_NAME/unity/npc/Build/"
echo ""
echo "Test URLs:"
echo "  - https://storage.googleapis.com/$BUCKET_NAME/unity/npc/Build/yes.loader.js"
echo "  - https://storage.googleapis.com/$BUCKET_NAME/unity/npc/Build/yes.data"
echo "  - https://storage.googleapis.com/$BUCKET_NAME/unity/npc/Build/yes.wasm"
echo "  - https://storage.googleapis.com/$BUCKET_NAME/unity/npc/Build/yes.framework.js"
echo ""
echo "Next step: Set VITE_UNITY_GCS_BUCKET=$BUCKET_NAME in your environment"
echo ""


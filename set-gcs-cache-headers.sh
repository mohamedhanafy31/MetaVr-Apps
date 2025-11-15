#!/bin/bash
# Set Cache-Control headers on Unity WebGL files in GCS
# This improves CDN performance by allowing long-term caching

set -e

# Configuration
BUCKET_NAME="${GCS_BUCKET_NAME:-metavr-assets}"

echo "=========================================="
echo "🔧 Setting Cache-Control headers on GCS files"
echo "=========================================="
echo "Bucket: gs://$BUCKET_NAME"
echo ""

# Check if gsutil is available
if ! command -v gsutil &> /dev/null; then
    echo "❌ Error: gsutil is not installed or not in PATH"
    echo "Please install Google Cloud SDK: https://cloud.google.com/sdk/docs/install"
    exit 1
fi

# Set cache headers for Unity WebGL files (immutable - never change)
echo "1. Setting cache headers for Unity .gz files (immutable)..."
gsutil -m setmeta -h "Cache-Control:public, max-age=31536000, immutable" \
  "gs://$BUCKET_NAME/unity/npc/Build/*.gz" 2>/dev/null || echo "   No .gz files found"

echo "2. Setting cache headers for Unity .js files (immutable)..."
gsutil -m setmeta -h "Cache-Control:public, max-age=31536000, immutable" \
  "gs://$BUCKET_NAME/unity/npc/Build/*.js" 2>/dev/null || echo "   No .js files found"

echo "3. Setting cache headers for Unity .wasm files (immutable)..."
gsutil -m setmeta -h "Cache-Control:public, max-age=31536000, immutable" \
  "gs://$BUCKET_NAME/unity/npc/Build/*.wasm" 2>/dev/null || echo "   No .wasm files found"

echo "4. Setting cache headers for Unity .data files (immutable)..."
gsutil -m setmeta -h "Cache-Control:public, max-age=31536000, immutable" \
  "gs://$BUCKET_NAME/unity/npc/Build/*.data" 2>/dev/null || echo "   No .data files found"

echo "5. Setting cache headers for TemplateData files (immutable)..."
gsutil -m setmeta -h "Cache-Control:public, max-age=31536000, immutable" \
  "gs://$BUCKET_NAME/unity/npc/TemplateData/**" 2>/dev/null || echo "   No TemplateData files found"

echo "6. Setting cache headers for logo and image files (immutable)..."
gsutil -m setmeta -h "Cache-Control:public, max-age=31536000, immutable" \
  "gs://$BUCKET_NAME/unity/npc/*.png" \
  "gs://$BUCKET_NAME/unity/npc/*.jpg" \
  "gs://$BUCKET_NAME/unity/npc/*.ico" 2>/dev/null || echo "   No image files found"

echo "7. Setting cache headers for CSS files (immutable)..."
gsutil -m setmeta -h "Cache-Control:public, max-age=31536000, immutable" \
  "gs://$BUCKET_NAME/unity/npc/*.css" 2>/dev/null || echo "   No CSS files found"

# HTML files should have shorter cache (may be updated)
echo "8. Setting cache headers for HTML files (shorter cache)..."
gsutil -m setmeta -h "Cache-Control:public, max-age=3600" \
  "gs://$BUCKET_NAME/unity/npc/*.html" 2>/dev/null || echo "   No HTML files found"

echo ""
echo "=========================================="
echo "✅ Cache headers set successfully!"
echo "=========================================="
echo ""
echo "📋 Verifying cache headers..."
echo ""
echo "Sample file headers:"
if gsutil stat "gs://$BUCKET_NAME/unity/npc/Build/yes.data.gz" 2>/dev/null | grep -i "cache-control"; then
    echo "✅ Cache-Control header found"
else
    echo "⚠️  Cache-Control header not found (may need to run again)"
fi

echo ""
echo "🔍 To verify all files:"
echo "   gsutil stat gs://$BUCKET_NAME/unity/npc/Build/yes.data.gz | grep -i cache"
echo ""


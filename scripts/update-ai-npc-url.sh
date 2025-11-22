#!/bin/bash

# Script to update AI-npc application URL in the database
# This sets the domain-based URL for the AI-npc app

set -e

APP_ID="ZGSdwVvxtwxb4P8quDPk"
DOMAIN_URL="https://metavrai.shop/AI-npc"

echo "============================================"
echo "Updating AI-npc Application URL"
echo "============================================"
echo "App ID: $APP_ID"
echo "New URL: $DOMAIN_URL"
echo ""

# Get the dashboard URL
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

if [ -f "$PROJECT_DIR/.env" ]; then
  source "$PROJECT_DIR/.env"
  DASHBOARD_URL="${NEXT_PUBLIC_APP_URL:-https://metavrai.shop}"
else
  DASHBOARD_URL="https://metavrai.shop"
fi

echo "Dashboard URL: $DASHBOARD_URL"
echo ""
echo "Note: This requires admin authentication."
echo "You can update the app manually through the admin UI:"
echo "$DASHBOARD_URL/admin/applications"
echo ""
echo "Or use this script with a session cookie:"
echo "SESSION_COOKIE='your-cookie' $0"
echo ""

# Update data
UPDATE_DATA=$(cat <<EOF
{
  "url": "$DOMAIN_URL"
}
EOF
)

if [ -n "$SESSION_COOKIE" ]; then
  echo "Updating application via API..."
  RESPONSE=$(curl -s -w "\n%{http_code}" \
    -X PUT \
    -H "Content-Type: application/json" \
    -H "Cookie: $SESSION_COOKIE" \
    -d "$UPDATE_DATA" \
    "$DASHBOARD_URL/api/applications/$APP_ID")
  
  HTTP_STATUS=$(echo "$RESPONSE" | tail -n1)
  HTTP_BODY=$(echo "$RESPONSE" | sed '$d')
  
  echo "Response Status: $HTTP_STATUS"
  echo "Response Body:"
  echo "$HTTP_BODY" | jq '.' 2>/dev/null || echo "$HTTP_BODY"
  
  if [ "$HTTP_STATUS" = "200" ]; then
    echo ""
    echo "✅ Success! AI-npc application URL updated to: $DOMAIN_URL"
  else
    echo ""
    echo "❌ Failed to update application. Status: $HTTP_STATUS"
    echo "You may need to update it manually through the admin UI."
  fi
else
  echo "============================================"
  echo "Manual Update Instructions"
  echo "============================================"
  echo ""
  echo "To update the application URL manually:"
  echo ""
  echo "1. Go to: $DASHBOARD_URL/admin/applications"
  echo "2. Find the 'AI NPC' application"
  echo "3. Click the 'Edit' button"
  echo "4. Set the 'External URL' field to: $DOMAIN_URL"
  echo "5. Click 'Save' or 'Update Application'"
  echo ""
fi

echo ""
echo "============================================"
echo "Next Steps"
echo "============================================"
echo ""
echo "1. ✅ Nginx configuration updated (local file)"
echo "2. ⚠️  Deploy updated nginx.conf to production server"
echo "3. ⚠️  Reload Nginx on production: sudo nginx -s reload"
echo "4. ⚠️  Ensure AI-npc app is running on port 3003"
echo "5. ⚠️  Update app URL in database (use this script or admin UI)"
echo ""
echo "Once these steps are complete, the app will be accessible at:"
echo "$DOMAIN_URL"
echo ""


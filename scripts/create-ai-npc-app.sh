#!/bin/bash

# Script to manually create AI-npc application entry with domain-based URL
# Usage: ./scripts/create-ai-npc-app.sh [DOMAIN_URL]
# Example: ./scripts/create-ai-npc-app.sh https://ai-npc.metavrai.shop

set -e

# Get domain URL from argument or prompt
DOMAIN_URL="${1:-}"

if [ -z "$DOMAIN_URL" ]; then
  echo "Enter the domain URL for AI-npc app (e.g., https://ai-npc.metavrai.shop):"
  read -r DOMAIN_URL
fi

# Validate URL format
if [[ ! "$DOMAIN_URL" =~ ^https?:// ]]; then
  echo "Error: URL must start with http:// or https://"
  exit 1
fi

# Remove trailing slash
DOMAIN_URL="${DOMAIN_URL%/}"

echo "============================================"
echo "Creating AI-npc Application Entry"
echo "============================================"
echo "Domain URL: $DOMAIN_URL"
echo ""

# Get the dashboard URL (for API endpoint)
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

# Check if we're in production or development
if [ -f "$PROJECT_DIR/.env" ]; then
  source "$PROJECT_DIR/.env"
  DASHBOARD_URL="${NEXT_PUBLIC_APP_URL:-http://localhost:3000}"
else
  DASHBOARD_URL="http://localhost:3000"
fi

echo "Dashboard URL: $DASHBOARD_URL"
echo ""
echo "Note: You must be logged in as admin to create applications."
echo "If you're not logged in, please:"
echo "1. Open the admin dashboard in your browser"
echo "2. Log in as admin"
echo "3. Copy your session cookie"
echo "4. Run this script with the cookie:"
echo "   SESSION_COOKIE='your-cookie' $0 $DOMAIN_URL"
echo ""
echo "Or create the app manually through the admin UI at:"
echo "$DASHBOARD_URL/admin/applications"
echo ""
read -p "Press Enter to continue or Ctrl+C to cancel..."

# Application data from apps-map.json
APP_DATA=$(cat <<EOF
{
  "name": "AI NPC",
  "description": "A simple Next.js project displaying an iframe embedding the AI Avatar Closed game from itch.io.",
  "platform": "web",
  "authRequired": true,
  "status": "active",
  "path": "apps/AI-npc",
  "url": "$DOMAIN_URL",
  "port": 3003,
  "configPath": "apps/AI-npc/app/config/page.tsx",
  "deploymentType": "manual",
  "healthCheck": {
    "lastCheck": "$(date -u +"%Y-%m-%dT%H:%M:%S.000Z")",
    "status": "healthy"
  }
}
EOF
)

echo ""
echo "Application Data:"
echo "$APP_DATA" | jq '.' 2>/dev/null || echo "$APP_DATA"
echo ""

# Try to create via API (requires authentication)
if [ -n "$SESSION_COOKIE" ]; then
  echo "Creating application via API..."
  RESPONSE=$(curl -s -w "\n%{http_code}" \
    -X POST \
    -H "Content-Type: application/json" \
    -H "Cookie: $SESSION_COOKIE" \
    -d "$APP_DATA" \
    "$DASHBOARD_URL/api/applications")
  
  HTTP_STATUS=$(echo "$RESPONSE" | tail -n1)
  HTTP_BODY=$(echo "$RESPONSE" | sed '$d')
  
  echo "Response Status: $HTTP_STATUS"
  echo "Response Body:"
  echo "$HTTP_BODY" | jq '.' 2>/dev/null || echo "$HTTP_BODY"
  
  if [ "$HTTP_STATUS" = "200" ] || [ "$HTTP_STATUS" = "201" ]; then
    echo ""
    echo "✅ Success! AI-npc application created."
  else
    echo ""
    echo "❌ Failed to create application. Status: $HTTP_STATUS"
    echo "You may need to create it manually through the admin UI."
  fi
else
  echo "============================================"
  echo "Manual Creation Instructions"
  echo "============================================"
  echo ""
  echo "To create the application manually:"
  echo ""
  echo "1. Go to: $DASHBOARD_URL/admin/applications"
  echo "2. Click 'Create Application' button"
  echo "3. Fill in the following details:"
  echo ""
  echo "   Name: AI NPC"
  echo "   Description: A simple Next.js project displaying an iframe embedding the AI Avatar Closed game from itch.io."
  echo "   Platform: Web"
  echo "   Auth Required: Yes (checked)"
  echo "   Status: Active"
  echo "   App Path: apps/AI-npc"
  echo "   External URL: $DOMAIN_URL"
  echo "   Port: 3003"
  echo "   Config Path: apps/AI-npc/app/config/page.tsx"
  echo "   Deployment Type: Manual"
  echo ""
  echo "4. Click 'Create Application'"
  echo ""
fi

echo ""
echo "============================================"
echo "Done!"
echo "============================================"


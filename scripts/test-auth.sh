#!/bin/bash

# Test Authentication Endpoint
# Usage: ./scripts/test-auth.sh <session-token> <app-path>

BACKEND_URL="${BACKEND_URL:-http://localhost:4000}"
SESSION_TOKEN="${1}"
APP_PATH="${2:-apps/iq-questions}"

if [ -z "$SESSION_TOKEN" ]; then
  echo "Usage: $0 <session-token> <app-path>"
  echo "Example: $0 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' apps/iq-questions"
  echo ""
  echo "To get session token:"
  echo "1. Login at http://localhost:3000/admin/login"
  echo "2. Open DevTools → Application → Cookies"
  echo "3. Copy the 'session' cookie value"
  exit 1
fi

echo "Testing authentication endpoint..."
echo "Backend: $BACKEND_URL"
echo "App Path: $APP_PATH"
echo ""

response=$(curl -s -w "\n%{http_code}" -X GET \
  "${BACKEND_URL}/auth/validate-app-access?appPath=${APP_PATH}" \
  -H "Cookie: session=${SESSION_TOKEN}" \
  -H "Content-Type: application/json")

http_code=$(echo "$response" | tail -n1)
body=$(echo "$response" | sed '$d')

echo "HTTP Status: $http_code"
echo "Response:"
echo "$body" | jq '.' 2>/dev/null || echo "$body"
echo ""

if [ "$http_code" = "200" ]; then
  allowed=$(echo "$body" | grep -o '"allowed":[^,]*' | cut -d: -f2)
  if [ "$allowed" = "true" ]; then
    echo "✅ Access granted"
  else
    echo "❌ Access denied"
  fi
else
  echo "❌ Request failed"
fi


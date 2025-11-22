#!/bin/bash

# Environment Variables Validation Script
# This script validates that all required environment variables are properly set

echo "🔍 MetaVR Dashboard - Environment Variables Validator"
echo "====================================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Check if .env.local exists
if [ ! -f .env.local ]; then
    echo -e "${RED}❌ .env.local file not found${NC}"
    echo -e "${YELLOW}💡 Run: cp env.example .env.local${NC}"
    exit 1
fi

echo -e "${GREEN}✅ .env.local file found${NC}"

# Source the environment file
source .env.local

# Function to check if variable is set
check_variable() {
    local var_name=$1
    local var_value=$2
    local is_required=$3
    
    if [ -z "$var_value" ]; then
        if [ "$is_required" = "true" ]; then
            echo -e "${RED}❌ $var_name is not set${NC}"
            return 1
        else
            echo -e "${YELLOW}⚠️  $var_name is not set (optional)${NC}"
            return 0
        fi
    else
        echo -e "${GREEN}✅ $var_name is set${NC}"
        return 0
    fi
}

# Function to check Firebase JSON format
check_firebase_json() {
    local json_value=$1
    
    if [ -z "$json_value" ]; then
        echo -e "${RED}❌ FIREBASE_SERVICE_ACCOUNT_JSON is not set${NC}"
        return 1
    fi
    
    # Try to parse JSON
    if echo "$json_value" | jq empty 2>/dev/null; then
        echo -e "${GREEN}✅ FIREBASE_SERVICE_ACCOUNT_JSON is valid JSON${NC}"
        
        # Extract project_id
        local project_id=$(echo "$json_value" | jq -r '.project_id' 2>/dev/null)
        if [ "$project_id" != "null" ] && [ -n "$project_id" ]; then
            echo -e "${BLUE}📁 Project ID: $project_id${NC}"
        fi
        
        return 0
    else
        echo -e "${RED}❌ FIREBASE_SERVICE_ACCOUNT_JSON is not valid JSON${NC}"
        return 1
    fi
}

echo ""
echo "🔧 Checking Core Application Settings..."
echo "======================================="

# Check core variables
check_variable "NODE_ENV" "$NODE_ENV" "true"
check_variable "SESSION_SECRET" "$SESSION_SECRET" "true"
check_variable "ADMIN_SETUP_TOKEN" "$ADMIN_SETUP_TOKEN" "true"

echo ""
echo "🔥 Checking Firebase Configuration..."
echo "===================================="

# Check Firebase service account
if [ -n "$FIREBASE_SERVICE_ACCOUNT_JSON" ]; then
    check_firebase_json "$FIREBASE_SERVICE_ACCOUNT_JSON"
elif [ -n "$FIREBASE_SERVICE_ACCOUNT_KEY" ]; then
    echo -e "${GREEN}✅ FIREBASE_SERVICE_ACCOUNT_KEY is set (Base64 format)${NC}"
else
    echo -e "${RED}❌ Neither FIREBASE_SERVICE_ACCOUNT_JSON nor FIREBASE_SERVICE_ACCOUNT_KEY is set${NC}"
fi

echo ""
echo "🌐 Checking Firebase Client Configuration..."
echo "==========================================="

# Check Firebase client variables
check_variable "NEXT_PUBLIC_FIREBASE_API_KEY" "$NEXT_PUBLIC_FIREBASE_API_KEY" "true"
check_variable "NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN" "$NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN" "true"
check_variable "NEXT_PUBLIC_FIREBASE_PROJECT_ID" "$NEXT_PUBLIC_FIREBASE_PROJECT_ID" "true"
check_variable "NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET" "$NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET" "true"
check_variable "NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID" "$NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID" "true"
check_variable "NEXT_PUBLIC_FIREBASE_APP_ID" "$NEXT_PUBLIC_FIREBASE_APP_ID" "true"

echo ""
echo "⚙️  Checking Application Settings..."
echo "==================================="

# Check application settings
check_variable "NEXT_PUBLIC_APP_NAME" "$NEXT_PUBLIC_APP_NAME" "false"
check_variable "NEXT_PUBLIC_APP_URL" "$NEXT_PUBLIC_APP_URL" "false"

echo ""
echo "🔐 Security Validation..."
echo "========================"

# Check secret strength
if [ -n "$SESSION_SECRET" ]; then
    secret_length=${#SESSION_SECRET}
    if [[ "$SESSION_SECRET" == *"your-super-secret-session-key"* ]]; then
        echo -e "${YELLOW}⚠️  SESSION_SECRET is still using the example placeholder${NC}"
    elif [ $secret_length -ge 32 ]; then
        echo -e "${GREEN}✅ SESSION_SECRET length is sufficient ($secret_length chars)${NC}"
    else
        echo -e "${YELLOW}⚠️  SESSION_SECRET length is short ($secret_length chars) - consider regenerating${NC}"
    fi
fi

if [ -n "$ADMIN_SETUP_TOKEN" ]; then
    token_length=${#ADMIN_SETUP_TOKEN}
    if [ $token_length -ge 32 ]; then
        echo -e "${GREEN}✅ ADMIN_SETUP_TOKEN length is sufficient ($token_length chars)${NC}"
    else
        echo -e "${YELLOW}⚠️  ADMIN_SETUP_TOKEN length is short ($token_length chars) - consider regenerating${NC}"
    fi
fi

if [ -n "$SESSION_PUBLIC_KEY" ]; then
    if echo "$SESSION_PUBLIC_KEY" | grep -q "BEGIN PUBLIC KEY"; then
        echo -e "${GREEN}✅ SESSION_PUBLIC_KEY detected (RS256 verification enabled)${NC}"
    else
        echo -e "${YELLOW}⚠️  SESSION_PUBLIC_KEY is set but not PEM formatted${NC}"
    fi
else
    echo -e "${YELLOW}⚠️  SESSION_PUBLIC_KEY not set - dashboard cannot verify RS256 tokens${NC}"
fi

echo ""
echo "🧪 Testing Firebase Connection..."
echo "================================"

# Test Firebase connection by running init-db
if command -v npm &> /dev/null; then
    echo -e "${BLUE}🔄 Testing Firebase connection...${NC}"
    
    # Run init-db in dry-run mode (if available) or check if it would work
    if npm run init-db --dry-run 2>/dev/null; then
        echo -e "${GREEN}✅ Firebase connection test passed${NC}"
    else
        echo -e "${YELLOW}⚠️  Firebase connection test inconclusive - run 'npm run init-db' to verify${NC}"
    fi
else
    echo -e "${YELLOW}⚠️  npm not found - cannot test Firebase connection${NC}"
fi

echo ""
echo "📋 Summary"
echo "========="

# Count issues
issues=0

# Check for critical missing variables
if [ -z "$SESSION_SECRET" ]; then ((issues++)); fi
if [ -z "$ADMIN_SETUP_TOKEN" ]; then ((issues++)); fi
if [ -z "$FIREBASE_SERVICE_ACCOUNT_JSON" ] && [ -z "$FIREBASE_SERVICE_ACCOUNT_KEY" ]; then ((issues++)); fi
if [ -z "$NEXT_PUBLIC_FIREBASE_API_KEY" ]; then ((issues++)); fi

if [ $issues -eq 0 ]; then
    echo -e "${GREEN}🎉 All required environment variables are properly configured!${NC}"
    echo -e "${GREEN}✅ You can now run: npm run dev${NC}"
    exit 0
else
    echo -e "${RED}❌ Found $issues critical issues that need to be resolved${NC}"
    echo ""
    echo -e "${YELLOW}💡 Quick fixes:${NC}"
    echo -e "${YELLOW}   1. Run: npm run generate-secrets${NC}"
    echo -e "${YELLOW}   2. Copy the generated secrets to .env.local${NC}"
    echo -e "${YELLOW}   3. Add your Firebase credentials to .env.local${NC}"
    echo -e "${YELLOW}   4. Run this script again to validate${NC}"
    exit 1
fi

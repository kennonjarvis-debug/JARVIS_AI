#!/bin/bash

# JARVIS Bridge API Test Script
# Tests all endpoints with proper authentication

set -e

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
BASE_URL="http://localhost:5555"
BEARER_TOKEN="${BRIDGE_BEARER_TOKEN:-}"

if [ -z "$BEARER_TOKEN" ]; then
  echo -e "${RED}Error: BRIDGE_BEARER_TOKEN environment variable not set${NC}"
  echo "Usage: BRIDGE_BEARER_TOKEN=your-token ./test-bridge.sh"
  exit 1
fi

echo "🧪 Testing JARVIS Bridge API at $BASE_URL"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Test 1: Health Check
echo -e "${YELLOW}Test 1: Health Check (GET /health)${NC}"
echo "Testing: curl $BASE_URL/health"
RESPONSE=$(curl -s $BASE_URL/health)
echo "Response: $RESPONSE"
if echo "$RESPONSE" | grep -q '"status":"ok"'; then
  echo -e "${GREEN}✓ Health check passed${NC}"
else
  echo -e "${RED}✗ Health check failed${NC}"
  exit 1
fi
echo ""

# Test 2: Run Command - Success
echo -e "${YELLOW}Test 2: Run Command - Success (POST /run)${NC}"
echo "Testing: pwd"
RESPONSE=$(curl -s -X POST $BASE_URL/run \
  -H "Authorization: Bearer $BEARER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"cmd":"pwd"}')
echo "Response: $RESPONSE"
if echo "$RESPONSE" | grep -q '"code":0'; then
  echo -e "${GREEN}✓ Command execution passed${NC}"
else
  echo -e "${RED}✗ Command execution failed${NC}"
  echo "Response: $RESPONSE"
  exit 1
fi
echo ""

# Test 3: Run Command - Git Status
echo -e "${YELLOW}Test 3: Run Git Command (POST /run)${NC}"
echo "Testing: git status"
RESPONSE=$(curl -s -X POST $BASE_URL/run \
  -H "Authorization: Bearer $BEARER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"cmd":"git status"}')
echo "Response: $RESPONSE"
if echo "$RESPONSE" | grep -q '"code":0'; then
  echo -e "${GREEN}✓ Git command passed${NC}"
else
  echo -e "${RED}✗ Git command failed${NC}"
  exit 1
fi
echo ""

# Test 4: Run Command - Not Whitelisted
echo -e "${YELLOW}Test 4: Command Not Whitelisted (POST /run)${NC}"
echo "Testing: rm -rf / (should be blocked)"
RESPONSE=$(curl -s -w "\n%{http_code}" -X POST $BASE_URL/run \
  -H "Authorization: Bearer $BEARER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"cmd":"rm -rf /"}')
HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
if [ "$HTTP_CODE" = "400" ] || [ "$HTTP_CODE" = "403" ]; then
  echo -e "${GREEN}✓ Dangerous command blocked (HTTP $HTTP_CODE)${NC}"
else
  echo -e "${RED}✗ Dangerous command not properly blocked (HTTP $HTTP_CODE)${NC}"
  exit 1
fi
echo ""

# Test 5: Read File - Success
echo -e "${YELLOW}Test 5: Read File - Success (POST /read)${NC}"
echo "Creating test file..."
TEST_FILE="/tmp/jarvis-bridge-test.txt"
echo "Hello from JARVIS Bridge Test" > $TEST_FILE
echo "Testing: Read $TEST_FILE"
RESPONSE=$(curl -s -X POST $BASE_URL/read \
  -H "Authorization: Bearer $BEARER_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"path\":\"$TEST_FILE\"}")
echo "Response: $RESPONSE"
if echo "$RESPONSE" | grep -q "Hello from JARVIS Bridge Test"; then
  echo -e "${GREEN}✓ File read passed${NC}"
else
  echo -e "${RED}✗ File read failed${NC}"
  exit 1
fi
rm -f $TEST_FILE
echo ""

# Test 6: Read File - Not Found
echo -e "${YELLOW}Test 6: Read File - Not Found (POST /read)${NC}"
echo "Testing: Read non-existent file"
RESPONSE=$(curl -s -w "\n%{http_code}" -X POST $BASE_URL/read \
  -H "Authorization: Bearer $BEARER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"path":"/tmp/nonexistent-file-12345.txt"}')
HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
if [ "$HTTP_CODE" = "404" ]; then
  echo -e "${GREEN}✓ File not found handled correctly (HTTP 404)${NC}"
else
  echo -e "${RED}✗ File not found not handled correctly (HTTP $HTTP_CODE)${NC}"
  exit 1
fi
echo ""

# Test 7: Authentication - No Token
echo -e "${YELLOW}Test 7: Authentication - No Token (POST /run)${NC}"
echo "Testing: Request without bearer token"
RESPONSE=$(curl -s -w "\n%{http_code}" -X POST $BASE_URL/run \
  -H "Content-Type: application/json" \
  -d '{"cmd":"ls"}')
HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
if [ "$HTTP_CODE" = "401" ]; then
  echo -e "${GREEN}✓ Unauthorized request blocked (HTTP 401)${NC}"
else
  echo -e "${RED}✗ Unauthorized request not blocked (HTTP $HTTP_CODE)${NC}"
  exit 1
fi
echo ""

# Test 8: Authentication - Invalid Token
echo -e "${YELLOW}Test 8: Authentication - Invalid Token (POST /run)${NC}"
echo "Testing: Request with invalid bearer token"
RESPONSE=$(curl -s -w "\n%{http_code}" -X POST $BASE_URL/run \
  -H "Authorization: Bearer invalid-token-12345" \
  -H "Content-Type: application/json" \
  -d '{"cmd":"ls"}')
HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
if [ "$HTTP_CODE" = "401" ]; then
  echo -e "${GREEN}✓ Invalid token blocked (HTTP 401)${NC}"
else
  echo -e "${RED}✗ Invalid token not blocked (HTTP $HTTP_CODE)${NC}"
  exit 1
fi
echo ""

# Summary
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "${GREEN}✨ All tests passed!${NC}"
echo ""
echo "Your JARVIS Bridge API is ready to connect to Custom GPT!"
echo ""
echo "Next steps:"
echo "1. Set up ngrok: ngrok http 5555"
echo "2. Note the ngrok URL"
echo "3. Follow CUSTOM_GPT_SETUP.md to integrate with ChatGPT"

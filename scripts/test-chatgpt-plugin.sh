#!/bin/bash

# ChatGPT Plugin Integration Diagnostic Script
# Tests all endpoints and verifies configuration

set -e

# Configuration
BASE_URL="https://kaycee-nonextrinsical-yosef.ngrok-free.dev"
API_KEY="${CHATGPT_APP_KEY:-your-key-here}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "=========================================="
echo "ChatGPT Plugin Integration Diagnostic"
echo "=========================================="
echo ""

# Test 1: AI Plugin Manifest
echo -e "${YELLOW}[1/7]${NC} Testing AI Plugin Manifest..."
MANIFEST_STATUS=$(curl -s -o /dev/null -w "%{http_code}" -H "ngrok-skip-browser-warning: true" "$BASE_URL/.well-known/ai-plugin.json")

if [ "$MANIFEST_STATUS" = "200" ]; then
    echo -e "${GREEN}✓${NC} AI Plugin Manifest found (200)"
    curl -s -H "ngrok-skip-browser-warning: true" "$BASE_URL/.well-known/ai-plugin.json" | jq -r '.name_for_model, .description_for_human' | sed 's/^/  /'
else
    echo -e "${RED}✗${NC} AI Plugin Manifest NOT found (${MANIFEST_STATUS})"
    echo -e "  ${YELLOW}→${NC} Need to add /.well-known/ai-plugin.json endpoint"
fi
echo ""

# Test 2: OpenAPI Spec
echo -e "${YELLOW}[2/7]${NC} Testing OpenAPI Spec..."
OPENAPI_STATUS=$(curl -s -o /dev/null -w "%{http_code}" -H "ngrok-skip-browser-warning: true" "$BASE_URL/openapi.chatgpt.yaml")

if [ "$OPENAPI_STATUS" = "200" ]; then
    echo -e "${GREEN}✓${NC} OpenAPI spec accessible (200)"

    # Extract operation IDs
    echo "  Available Operations:"
    curl -s -H "ngrok-skip-browser-warning: true" "$BASE_URL/openapi.chatgpt.yaml" | \
        grep "operationId:" | \
        sed 's/.*operationId: /    - /' | \
        sort

    # Check for jit_plugin
    if curl -s -H "ngrok-skip-browser-warning: true" "$BASE_URL/openapi.chatgpt.yaml" | grep -q "operationId: jit_plugin"; then
        echo -e "  ${GREEN}✓${NC} jit_plugin operation found"
    else
        echo -e "  ${RED}✗${NC} jit_plugin operation NOT found"
        echo -e "  ${YELLOW}→${NC} This is why you're getting 'InvalidRecipient' errors"
    fi
else
    echo -e "${RED}✗${NC} OpenAPI spec NOT accessible (${OPENAPI_STATUS})"
fi
echo ""

# Test 3: API Key Authentication
echo -e "${YELLOW}[3/7]${NC} Testing API Key Authentication..."

# Test without key
NO_KEY_STATUS=$(curl -s -o /dev/null -w "%{http_code}" -H "ngrok-skip-browser-warning: true" "$BASE_URL/api/v1/app/status")
if [ "$NO_KEY_STATUS" = "401" ] || [ "$NO_KEY_STATUS" = "403" ]; then
    echo -e "${GREEN}✓${NC} Auth required (${NO_KEY_STATUS}) - Security working"
else
    echo -e "${YELLOW}⚠${NC} No auth required (${NO_KEY_STATUS}) - Possible security issue"
fi

# Test with key
if [ "$API_KEY" != "your-key-here" ]; then
    WITH_KEY_STATUS=$(curl -s -o /dev/null -w "%{http_code}" \
        -H "X-ChatGPT-App-Key: $API_KEY" \
        -H "ngrok-skip-browser-warning: true" \
        "$BASE_URL/api/v1/app/status")

    if [ "$WITH_KEY_STATUS" = "200" ]; then
        echo -e "${GREEN}✓${NC} API key authentication working (200)"
    else
        echo -e "${RED}✗${NC} API key rejected (${WITH_KEY_STATUS})"
        echo -e "  ${YELLOW}→${NC} Check your X-ChatGPT-App-Key header value"
    fi
else
    echo -e "${YELLOW}⚠${NC} API_KEY not set - skipping authenticated test"
    echo -e "  ${YELLOW}→${NC} Set CHATGPT_APP_KEY environment variable to test"
fi
echo ""

# Test 4: Terminal Command Endpoint
echo -e "${YELLOW}[4/7]${NC} Testing Terminal Command Endpoint..."
if [ "$API_KEY" != "your-key-here" ]; then
    TERMINAL_RESPONSE=$(curl -s -X POST "$BASE_URL/api/v1/app/terminal/validate" \
        -H "X-ChatGPT-App-Key: $API_KEY" \
        -H "Content-Type: application/json" \
        -H "ngrok-skip-browser-warning: true" \
        -d '{"command":"git status"}')

    if echo "$TERMINAL_RESPONSE" | jq -e '.allowed' > /dev/null 2>&1; then
        ALLOWED=$(echo "$TERMINAL_RESPONSE" | jq -r '.allowed')
        RISK=$(echo "$TERMINAL_RESPONSE" | jq -r '.riskLevel')
        echo -e "${GREEN}✓${NC} Terminal validation working"
        echo -e "  Command 'git status' allowed: $ALLOWED (risk: $RISK)"
    else
        echo -e "${RED}✗${NC} Terminal validation failed"
        echo "$TERMINAL_RESPONSE" | jq . | sed 's/^/  /'
    fi
else
    echo -e "${YELLOW}⚠${NC} Skipped (no API key)"
fi
echo ""

# Test 5: Jarvis Health Endpoint
echo -e "${YELLOW}[5/7]${NC} Testing Jarvis Health Endpoint..."
if [ "$API_KEY" != "your-key-here" ]; then
    JARVIS_RESPONSE=$(curl -s "$BASE_URL/api/v1/app/jarvis/health" \
        -H "X-ChatGPT-App-Key: $API_KEY" \
        -H "ngrok-skip-browser-warning: true")

    if echo "$JARVIS_RESPONSE" | jq -e '.success' > /dev/null 2>&1; then
        STATUS=$(echo "$JARVIS_RESPONSE" | jq -r '.data.status')
        MODULES=$(echo "$JARVIS_RESPONSE" | jq -r '.data.metrics.totalModules // "unknown"')
        echo -e "${GREEN}✓${NC} Jarvis health check working"
        echo -e "  Status: $STATUS, Modules: $MODULES"
    else
        echo -e "${RED}✗${NC} Jarvis health check failed"
        echo "$JARVIS_RESPONSE" | jq . | sed 's/^/  /'
    fi
else
    echo -e "${YELLOW}⚠${NC} Skipped (no API key)"
fi
echo ""

# Test 6: Jarvis Modules Endpoint
echo -e "${YELLOW}[6/7]${NC} Testing Jarvis Modules Endpoint..."
if [ "$API_KEY" != "your-key-here" ]; then
    MODULES_RESPONSE=$(curl -s "$BASE_URL/api/v1/app/jarvis/modules" \
        -H "X-ChatGPT-App-Key: $API_KEY" \
        -H "ngrok-skip-browser-warning: true")

    if echo "$MODULES_RESPONSE" | jq -e '.success' > /dev/null 2>&1; then
        TOTAL=$(echo "$MODULES_RESPONSE" | jq -r '.data.totalModules // 0')
        ENABLED=$(echo "$MODULES_RESPONSE" | jq -r '.data.enabledModules // 0')
        echo -e "${GREEN}✓${NC} Jarvis modules endpoint working"
        echo -e "  Total: $TOTAL, Enabled: $ENABLED"

        # List module names
        echo "$MODULES_RESPONSE" | jq -r '.data.modules[]?.name // empty' | sed 's/^/    - /'
    else
        echo -e "${RED}✗${NC} Jarvis modules endpoint failed"
    fi
else
    echo -e "${YELLOW}⚠${NC} Skipped (no API key)"
fi
echo ""

# Test 7: Network Connectivity
echo -e "${YELLOW}[7/7]${NC} Testing Network Connectivity..."
PING_STATUS=$(curl -s -o /dev/null -w "%{http_code}" -H "ngrok-skip-browser-warning: true" "$BASE_URL")
if [ "$PING_STATUS" = "200" ] || [ "$PING_STATUS" = "404" ]; then
    echo -e "${GREEN}✓${NC} Server reachable (${PING_STATUS})"
else
    echo -e "${RED}✗${NC} Server unreachable (${PING_STATUS})"
fi
echo ""

# Summary
echo "=========================================="
echo "SUMMARY"
echo "=========================================="
echo ""

ISSUES=()

if [ "$MANIFEST_STATUS" != "200" ]; then
    ISSUES+=("Missing AI plugin manifest (/.well-known/ai-plugin.json)")
fi

if ! curl -s -H "ngrok-skip-browser-warning: true" "$BASE_URL/openapi.chatgpt.yaml" | grep -q "operationId: jit_plugin"; then
    ISSUES+=("Operation 'jit_plugin' not found in OpenAPI spec")
fi

if [ "$API_KEY" = "your-key-here" ]; then
    ISSUES+=("API key not configured (set CHATGPT_APP_KEY)")
fi

if [ ${#ISSUES[@]} -eq 0 ]; then
    echo -e "${GREEN}✓ All tests passed!${NC}"
    echo ""
    echo "Your plugin should work correctly."
    echo "If ChatGPT still shows 'InvalidRecipient' errors:"
    echo "  1. Re-import the Action in your GPT"
    echo "  2. Clear the GPT cache (bump API version)"
    echo "  3. Try recreating the GPT"
else
    echo -e "${RED}Found ${#ISSUES[@]} issue(s):${NC}"
    echo ""
    for issue in "${ISSUES[@]}"; do
        echo -e "  ${RED}✗${NC} $issue"
    done
    echo ""
    echo -e "${YELLOW}Next Steps:${NC}"
    echo "  1. Review the fix guide: GPT_ACTION_FIX_GUIDE.md"
    echo "  2. Deploy missing endpoints"
    echo "  3. Re-run this diagnostic script"
fi

echo ""
echo "=========================================="
echo "For detailed fix instructions, see:"
echo "  - GPT_ACTION_FIX_GUIDE.md"
echo "  - OPERATION_ID_MAPPING.md"
echo "=========================================="

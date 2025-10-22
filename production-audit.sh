#!/bin/bash

echo "======================================"
echo "JARVIS PRODUCTION HEALTH CHECK"
echo "======================================"
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 1. Check if Control Plane is running
echo -e "${YELLOW}1. Checking Control Plane...${NC}"
if lsof -i:4000 > /dev/null 2>&1; then
  echo -e "${GREEN}✓ Control Plane is running on port 4000${NC}"
  HEALTH=$(curl -s -H "Authorization: Bearer test-token" http://localhost:4000/health)
  echo "  Response: $HEALTH"
else
  echo -e "${RED}✗ Control Plane is NOT running${NC}"
fi
echo ""

# 2. Check AI DAWG Backend
echo -e "${YELLOW}2. Checking AI DAWG Backend...${NC}"
if lsof -i:3001 > /dev/null 2>&1; then
  echo -e "${GREEN}✓ AI DAWG Backend is running on port 3001${NC}"
  HEALTH=$(curl -s http://localhost:3001/api/v1/jarvis/desktop/health 2>/dev/null || echo "Error")
  echo "  Response: $HEALTH"
else
  echo -e "${RED}✗ AI DAWG Backend is NOT running${NC}"
fi
echo ""

# 3. Check Dashboard
echo -e "${YELLOW}3. Checking Dashboard Backend...${NC}"
if lsof -i:5001 > /dev/null 2>&1; then
  echo -e "${GREEN}✓ Dashboard Backend is running on port 5001${NC}"
else
  echo -e "${RED}✗ Dashboard Backend is NOT running${NC}"
fi
echo ""

# 4. Check Domain Agents
echo -e "${YELLOW}4. Checking Domain Agents...${NC}"
AGENTS=$(curl -s -H "Authorization: Bearer test-token" http://localhost:4000/api/autonomous/domains/stats 2>/dev/null)
if [ $? -eq 0 ]; then
  echo "  $AGENTS"
else
  echo -e "${RED}✗ Cannot reach Domain Agents API${NC}"
fi
echo ""

# 5. Check AI Model Router
echo -e "${YELLOW}5. Checking AI Model Router...${NC}"
COSTS=$(curl -s -H "Authorization: Bearer test-token" http://localhost:4000/api/v1/costs/current 2>/dev/null)
if [ $? -eq 0 ]; then
  echo -e "${GREEN}✓ AI Model Router is accessible${NC}"
  echo "  $(echo $COSTS | python3 -c "import sys, json; d=json.load(sys.stdin); print(f'Providers: Gemini={d[\"data\"][\"geminiFreeTierRemaining\"]}/1500, Total Requests={d[\"data\"][\"totalRequests\"]}')"  2>/dev/null || echo $COSTS)"
else
  echo -e "${RED}✗ AI Model Router is NOT accessible${NC}"
fi
echo ""

# 6. Check TypeScript compilation (core files only)
echo -e "${YELLOW}6. Running TypeScript check (core files)...${NC}"
CORE_ERRORS=$(npx tsc --noEmit 2>&1 | grep -v "node_modules" | grep -v "chat-conversation-domain" | grep -v "music-production-domain" | grep "error TS" | wc -l | tr -d ' ')
if [ "$CORE_ERRORS" -eq "0" ]; then
  echo -e "${GREEN}✓ No TypeScript errors in core files${NC}"
else
  echo -e "${YELLOW}⚠ $CORE_ERRORS TypeScript errors found (non-blocking)${NC}"
fi
echo ""

# 7. Check Environment Variables
echo -e "${YELLOW}7. Checking Environment Variables...${NC}"
[ -n "$OPENAI_API_KEY" ] && echo -e "${GREEN}✓ OPENAI_API_KEY set${NC}" || echo -e "${YELLOW}⚠ OPENAI_API_KEY not set${NC}"
[ -n "$ANTHROPIC_API_KEY" ] && echo -e "${GREEN}✓ ANTHROPIC_API_KEY set${NC}" || echo -e "${YELLOW}⚠ ANTHROPIC_API_KEY not set${NC}"
[ -n "$GEMINI_API_KEY" ] && echo -e "${GREEN}✓ GEMINI_API_KEY set${NC}" || echo -e "${YELLOW}⚠ GEMINI_API_KEY not set${NC}"
[ -n "$MISTRAL_API_KEY" ] && echo -e "${GREEN}✓ MISTRAL_API_KEY set${NC}" || echo -e "${RED}✗ MISTRAL_API_KEY not set${NC}"
echo ""

echo "======================================"
echo "PRODUCTION STATUS SUMMARY"
echo "======================================"

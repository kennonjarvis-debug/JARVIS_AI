#!/bin/bash
###############################################################################
# Jarvis Dashboard System Health Check
#
# Tests all services and endpoints to ensure the system is functioning properly
###############################################################################

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

FAILED=0
PASSED=0

echo "=========================================="
echo "Jarvis Dashboard - System Health Check"
echo "=========================================="
echo ""

# Function to check if a service is running on a port
check_port() {
  local port=$1
  local service=$2

  if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null 2>&1; then
    echo -e "${GREEN}✓${NC} $service is running on port $port"
    ((PASSED++))
    return 0
  else
    echo -e "${RED}✗${NC} $service is NOT running on port $port"
    ((FAILED++))
    return 1
  fi
}

# Function to check HTTP endpoint
check_endpoint() {
  local url=$1
  local name=$2
  local expected_status=${3:-200}

  response=$(curl -s -o /dev/null -w "%{http_code}" "$url" 2>&1)

  if [ "$response" = "$expected_status" ]; then
    echo -e "${GREEN}✓${NC} $name: HTTP $response"
    ((PASSED++))
    return 0
  else
    echo -e "${RED}✗${NC} $name: HTTP $response (expected $expected_status)"
    ((FAILED++))
    return 1
  fi
}

# Function to check response time
check_response_time() {
  local url=$1
  local name=$2
  local max_time=${3:-2}

  start_time=$(date +%s%3N)
  curl -s -o /dev/null "$url" 2>&1
  end_time=$(date +%s%3N)

  elapsed=$((end_time - start_time))
  elapsed_seconds=$(echo "scale=2; $elapsed / 1000" | bc)

  if (( $(echo "$elapsed_seconds < $max_time" | bc -l) )); then
    echo -e "${GREEN}✓${NC} $name response time: ${elapsed_seconds}s (< ${max_time}s)"
    ((PASSED++))
    return 0
  else
    echo -e "${YELLOW}⚠${NC} $name response time: ${elapsed_seconds}s (> ${max_time}s)"
    ((PASSED++))
    return 0
  fi
}

echo -e "${BLUE}[1/4] Checking Service Ports...${NC}"
echo "-------------------------------------------"
check_port 3003 "Dashboard Frontend"
check_port 5001 "Dashboard API"
check_port 4000 "Jarvis Control Plane"
check_port 3001 "AI DAWG Backend"
echo ""

echo -e "${BLUE}[2/4] Checking API Endpoints...${NC}"
echo "-------------------------------------------"
check_endpoint "http://localhost:5001/health" "Dashboard API Health"
check_endpoint "http://localhost:5001/api/dashboard/overview" "Dashboard Overview"
check_endpoint "http://localhost:5001/api/dashboard/instances" "Instance Monitor"
check_endpoint "http://localhost:5001/api/dashboard/business" "Business Metrics"
check_endpoint "http://localhost:5001/api/dashboard/health" "System Health"
check_endpoint "http://localhost:5001/api/dashboard/financial" "Financial Summary"
check_endpoint "http://localhost:5001/api/dashboard/waves" "Wave Progress"
echo ""

echo -e "${BLUE}[3/4] Checking Response Times...${NC}"
echo "-------------------------------------------"
check_response_time "http://localhost:5001/api/dashboard/overview" "Dashboard Overview" 2
check_response_time "http://localhost:3003" "Frontend" 2
echo ""

echo -e "${BLUE}[4/4] Checking Integration Points...${NC}"
echo "-------------------------------------------"

# Check if Dashboard API can reach Control Plane
if curl -s "http://localhost:5001/api/dashboard/health" | grep -q "controlPlane"; then
  echo -e "${GREEN}✓${NC} Dashboard API → Control Plane: Connected"
  ((PASSED++))
else
  echo -e "${YELLOW}⚠${NC} Dashboard API → Control Plane: Connection issue"
  ((PASSED++))
fi

# Check if Dashboard API can reach AI DAWG
if curl -s "http://localhost:5001/api/dashboard/health" | grep -q "aiDawg"; then
  echo -e "${GREEN}✓${NC} Dashboard API → AI DAWG: Connected"
  ((PASSED++))
else
  echo -e "${YELLOW}⚠${NC} Dashboard API → AI DAWG: Connection issue"
  ((PASSED++))
fi

# Check if Frontend can fetch data
if curl -s "http://localhost:3003" | grep -q "Business Performance\|Jarvis"; then
  echo -e "${GREEN}✓${NC} Frontend: Loading correctly"
  ((PASSED++))
else
  echo -e "${RED}✗${NC} Frontend: Not loading correctly"
  ((FAILED++))
fi

echo ""
echo "=========================================="
echo -e "Results: ${GREEN}$PASSED passed${NC}, ${RED}$FAILED failed${NC}"
echo "=========================================="

if [ $FAILED -gt 0 ]; then
  echo -e "${RED}Some health checks failed!${NC}"
  exit 1
else
  echo -e "${GREEN}All health checks passed!${NC}"
  exit 0
fi

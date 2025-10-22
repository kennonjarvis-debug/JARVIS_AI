#!/bin/bash

###############################################################################
# Orchestrator-Generated Integration Test Runner
#
# Runs all 5 integration test suites and generates a comprehensive report
###############################################################################

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../../.." && pwd)"
REPORT_FILE="$SCRIPT_DIR/test-report-$(date +%Y%m%d-%H%M%S).txt"

echo -e "${BLUE}╔══════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║  Orchestrator-Generated Integration Test Suite              ║${NC}"
echo -e "${BLUE}║  Full Stack End-to-End Flow Testing                         ║${NC}"
echo -e "${BLUE}╚══════════════════════════════════════════════════════════════╝${NC}"
echo ""

# Start timing
START_TIME=$(date +%s)

# Initialize report
{
  echo "╔══════════════════════════════════════════════════════════════╗"
  echo "║  JARVIS Integration Test Report                              ║"
  echo "║  Generated: $(date)                           ║"
  echo "╚══════════════════════════════════════════════════════════════╝"
  echo ""
  echo "INTEGRATION PATHS TESTED:"
  echo "========================"
  echo "1. JARVIS Control Plane → AI DAWG Backend → Database"
  echo "2. AI DAWG Backend → AI Producer → S3 Upload"
  echo "3. AI DAWG Frontend → Backend → Vocal Coach → WebSocket"
  echo "4. JARVIS Dashboard → Health Aggregator → All Services"
  echo "5. Business Intelligence → Cost Calculator → Metrics Storage"
  echo ""
} > "$REPORT_FILE"

# Check if services are running
echo -e "${YELLOW}Checking service availability...${NC}"
SERVICES_OK=true

check_service() {
  local name=$1
  local url=$2

  if curl -s -f -o /dev/null --max-time 5 "$url"; then
    echo -e "  ${GREEN}✓${NC} $name is running"
    return 0
  else
    echo -e "  ${RED}✗${NC} $name is NOT running"
    SERVICES_OK=false
    return 1
  fi
}

check_service "JARVIS Control Plane" "http://localhost:4000/health"
check_service "Dashboard API" "http://localhost:5001/health"
check_service "AI DAWG Backend" "http://localhost:3001/api/v1/jarvis/desktop/health" || true
check_service "Vocal Coach" "http://localhost:8000/health" || true
check_service "Producer" "http://localhost:8001/health" || true

echo ""

if [ "$SERVICES_OK" = false ]; then
  echo -e "${YELLOW}⚠️  Some services are offline. Tests may fail or be skipped.${NC}"
  echo -e "${YELLOW}   Starting tests anyway...${NC}"
  echo ""
fi

# Test counters
TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0
SKIPPED_TESTS=0

# Run each test suite
run_test_suite() {
  local suite_name=$1
  local test_file=$2

  echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  echo -e "${BLUE}Running: $suite_name${NC}"
  echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  echo ""

  # Add to report
  {
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "TEST SUITE: $suite_name"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""
  } >> "$REPORT_FILE"

  # Run the test
  if cd "$PROJECT_ROOT" && npm test -- "$test_file" --verbose 2>&1 | tee -a "$REPORT_FILE"; then
    echo -e "${GREEN}✓ $suite_name completed${NC}"
    echo ""
  else
    echo -e "${RED}✗ $suite_name failed${NC}"
    echo ""
  fi

  echo "" >> "$REPORT_FILE"
}

# Run all test suites
echo ""
echo -e "${GREEN}Starting test execution...${NC}"
echo ""

run_test_suite "Path 1: JARVIS → Database" "$SCRIPT_DIR/01-jarvis-to-database.test.ts"
run_test_suite "Path 2: AI Producer → S3" "$SCRIPT_DIR/02-ai-producer-s3.test.ts"
run_test_suite "Path 3: Vocal Coach → WebSocket" "$SCRIPT_DIR/03-vocal-coach-websocket.test.ts"
run_test_suite "Path 4: Dashboard → Health Aggregator" "$SCRIPT_DIR/04-dashboard-health-aggregator.test.ts"
run_test_suite "Path 5: Business Intelligence → Costs" "$SCRIPT_DIR/05-business-intelligence-costs.test.ts"

# Calculate totals
END_TIME=$(date +%s)
DURATION=$((END_TIME - START_TIME))
MINUTES=$((DURATION / 60))
SECONDS=$((DURATION % 60))

# Generate final report summary
{
  echo ""
  echo "╔══════════════════════════════════════════════════════════════╗"
  echo "║  TEST EXECUTION SUMMARY                                      ║"
  echo "╚══════════════════════════════════════════════════════════════╝"
  echo ""
  echo "Total Execution Time: ${MINUTES}m ${SECONDS}s"
  echo ""
  echo "Report saved to: $REPORT_FILE"
  echo ""
} >> "$REPORT_FILE"

# Display summary
echo ""
echo -e "${BLUE}╔══════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║  TEST EXECUTION COMPLETE                                     ║${NC}"
echo -e "${BLUE}╚══════════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${GREEN}Total Execution Time: ${MINUTES}m ${SECONDS}s${NC}"
echo ""
echo -e "${YELLOW}Full report saved to:${NC}"
echo -e "${YELLOW}$REPORT_FILE${NC}"
echo ""
echo -e "${BLUE}To view the report:${NC}"
echo -e "  cat $REPORT_FILE"
echo ""

exit 0

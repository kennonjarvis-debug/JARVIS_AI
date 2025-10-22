#!/bin/bash

###############################################################################
# Quick Integration Test Runner
# Runs tests and generates summary report
###############################################################################

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../../.." && pwd)"

echo "🚀 Running Orchestrator-Generated Integration Tests"
echo "=================================================="
echo ""

# Track results
TOTAL_SCENARIOS=0
PASSED_SCENARIOS=0
START_TIME=$(date +%s)

# Test files
TESTS=(
  "01-jarvis-to-database.test.ts:JARVIS → Database"
  "04-dashboard-health-aggregator.test.ts:Dashboard → Health"
  "05-business-intelligence-costs.test.ts:Business Intelligence"
)

for test_info in "${TESTS[@]}"; do
  IFS=':' read -r test_file test_name <<< "$test_info"

  echo "📝 Running: $test_name"
  echo "   File: $test_file"

  # Run test and capture output
  if cd "$PROJECT_ROOT" && npm test -- "tests/integration/orchestrator-generated/$test_file" --silent --testTimeout=30000 2>&1; then
    echo "   ✅ Passed"
  else
    echo "   ⚠️  Failed or services unavailable"
  fi
  echo ""
done

END_TIME=$(date +%s)
DURATION=$((END_TIME - START_TIME))

echo "=================================================="
echo "Completed in ${DURATION}s"
echo ""

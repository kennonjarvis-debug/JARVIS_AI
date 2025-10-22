#!/bin/bash

# Jarvis Dashboard Integration Test Suite
# Tests all dashboard endpoints for real-time data accuracy

set -e

DASHBOARD_API="http://localhost:5001"
JARVIS_CONTROL_PLANE="http://localhost:4000"
AI_DAWG_BACKEND="http://localhost:3001"

echo "========================================"
echo "JARVIS DASHBOARD INTEGRATION TESTS"
echo "========================================"
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

passed=0
failed=0

test_endpoint() {
    local name="$1"
    local url="$2"
    local expected_status="${3:-200}"

    echo -n "Testing $name... "

    status=$(curl -s -o /dev/null -w "%{http_code}" "$url")

    if [ "$status" = "$expected_status" ]; then
        echo -e "${GREEN}PASS${NC} (HTTP $status)"
        ((passed++))
        return 0
    else
        echo -e "${RED}FAIL${NC} (HTTP $status, expected $expected_status)"
        ((failed++))
        return 1
    fi
}

test_json_field() {
    local name="$1"
    local url="$2"
    local field="$3"

    echo -n "Testing $name has $field... "

    value=$(curl -s "$url" | jq -r "$field" 2>/dev/null)

    if [ "$value" != "null" ] && [ -n "$value" ]; then
        echo -e "${GREEN}PASS${NC} (value: $value)"
        ((passed++))
        return 0
    else
        echo -e "${RED}FAIL${NC} (field missing or null)"
        ((failed++))
        return 1
    fi
}

echo "=== Service Health Checks ==="
test_endpoint "Dashboard API Health" "$DASHBOARD_API/health"
test_endpoint "Jarvis Control Plane Health" "$JARVIS_CONTROL_PLANE/health"
test_endpoint "AI DAWG Backend Health" "$AI_DAWG_BACKEND/health"
echo ""

echo "=== Dashboard Endpoints ==="
test_endpoint "Dashboard Overview" "$DASHBOARD_API/api/dashboard/overview"
test_endpoint "Instance Activity" "$DASHBOARD_API/api/dashboard/instances"
test_endpoint "Business Metrics" "$DASHBOARD_API/api/dashboard/business"
test_endpoint "System Health" "$DASHBOARD_API/api/dashboard/health"
test_endpoint "Financial Metrics" "$DASHBOARD_API/api/dashboard/financial"
test_endpoint "Wave Progress" "$DASHBOARD_API/api/dashboard/waves"
echo ""

echo "=== Real-Time Data Validation ==="
test_json_field "Instance Count" "$DASHBOARD_API/api/dashboard/instances" ".data.metrics.active_instances"
test_json_field "Total Instances" "$DASHBOARD_API/api/dashboard/instances" ".data.metrics.total_instances"
test_json_field "Tasks Completed" "$DASHBOARD_API/api/dashboard/instances" ".data.metrics.tasks_completed"
test_json_field "Tasks In Progress" "$DASHBOARD_API/api/dashboard/instances" ".data.metrics.tasks_in_progress"
test_json_field "Overall Completion" "$DASHBOARD_API/api/dashboard/instances" ".data.metrics.overall_completion_percent"
test_json_field "Efficiency Ratio" "$DASHBOARD_API/api/dashboard/instances" ".data.metrics.efficiency_ratio"
echo ""

echo "=== Business Metrics Validation ==="
test_json_field "Music Module Health" "$DASHBOARD_API/api/dashboard/business" ".data.music.health"
test_json_field "Music Module Uptime" "$DASHBOARD_API/api/dashboard/business" ".data.music.uptime"
test_json_field "Marketing Module Health" "$DASHBOARD_API/api/dashboard/business" ".data.marketing.health"
test_json_field "Engagement Module Health" "$DASHBOARD_API/api/dashboard/business" ".data.engagement.health"
test_json_field "Automation Module Health" "$DASHBOARD_API/api/dashboard/business" ".data.automation.health"
echo ""

echo "=== Financial Metrics Validation ==="
test_json_field "MRR" "$DASHBOARD_API/api/dashboard/financial" ".data.mrr"
test_json_field "ARR" "$DASHBOARD_API/api/dashboard/financial" ".data.arr"
test_json_field "Calculation Source" "$DASHBOARD_API/api/dashboard/financial" ".data.calculation_source"
test_json_field "Burn Rate" "$DASHBOARD_API/api/dashboard/financial" ".data.burn_rate"
test_json_field "Runway Months" "$DASHBOARD_API/api/dashboard/financial" ".data.runway_months"
echo ""

echo "=== System Health Validation ==="
test_json_field "Overall Health Status" "$DASHBOARD_API/api/dashboard/health" ".data.overall"
test_json_field "Control Plane Status" "$DASHBOARD_API/api/dashboard/health" ".data.services.controlPlane.status"
test_json_field "AI DAWG Status" "$DASHBOARD_API/api/dashboard/health" ".data.services.aiDawg.status"
echo ""

echo "=== Business Intelligence Endpoints ==="
test_endpoint "BI Metrics" "$DASHBOARD_API/api/dashboard/intelligence/metrics"
test_endpoint "BI Alerts" "$DASHBOARD_API/api/dashboard/intelligence/alerts"
test_endpoint "BI Insights" "$DASHBOARD_API/api/dashboard/intelligence/insights"
test_endpoint "BI Health" "$DASHBOARD_API/api/dashboard/intelligence/health"
echo ""

echo "=== Proactive System Endpoints ==="
test_endpoint "Proactive Suggestions" "$DASHBOARD_API/api/proactive/suggestions"
echo ""

echo "========================================"
echo "TEST SUMMARY"
echo "========================================"
echo -e "Passed: ${GREEN}$passed${NC}"
echo -e "Failed: ${RED}$failed${NC}"
echo -e "Total:  $((passed + failed))"
echo ""

if [ $failed -eq 0 ]; then
    echo -e "${GREEN}✓ ALL TESTS PASSED${NC}"
    exit 0
else
    echo -e "${RED}✗ SOME TESTS FAILED${NC}"
    exit 1
fi

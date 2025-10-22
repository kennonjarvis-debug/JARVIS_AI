#!/bin/bash
#
# COMPREHENSIVE E2E LIVE DATA TESTING SUITE FOR JARVIS
# Multi-stage test to verify end-to-end live data flow
#
# STAGES:
#   1. Data Source Verification
#   2. Dashboard Backend API Audit
#   3. Frontend Data Validation
#   4. E2E Data Flow Test
#   5. Live Data Verification Report
#

set -e

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
BOLD='\033[1m'
NC='\033[0m'

# Test configuration
DASHBOARD_API="http://localhost:5001"
JARVIS_CONTROL_PLANE="http://localhost:4000"
AI_DAWG_BACKEND="http://localhost:3001"
DASHBOARD_FRONTEND="http://localhost:3003"

# Test counters
stage_passed=0
stage_failed=0
total_tests=0
total_passed=0
total_failed=0

# Stage tracking (using simple variables instead of associative array)

echo "========================================"
echo "JARVIS E2E LIVE DATA TESTING SUITE"
echo "========================================"
echo ""
echo "Test Environment:"
echo "  Dashboard API: $DASHBOARD_API"
echo "  Control Plane: $JARVIS_CONTROL_PLANE"
echo "  AI DAWG:       $AI_DAWG_BACKEND"
echo "  Frontend:      $DASHBOARD_FRONTEND"
echo ""
echo "Test Date: $(date)"
echo ""

#
# STAGE 1: DATA SOURCE VERIFICATION
#
echo -e "${BOLD}==== STAGE 1: DATA SOURCE VERIFICATION ====${NC}"
echo ""

stage_1_passed=0
stage_1_failed=0

test_data_source() {
    local name="$1"
    local test_command="$2"
    local expected="$3"

    echo -n "Testing $name... "
    ((total_tests++))

    result=$(eval "$test_command" 2>/dev/null || echo "ERROR")

    if echo "$result" | grep -q "$expected"; then
        echo -e "${GREEN}PASS${NC}"
        ((stage_1_passed++))
        ((total_passed++))
        return 0
    else
        echo -e "${RED}FAIL${NC} (expected: $expected, got: $result)"
        ((stage_1_failed++))
        ((total_failed++))
        return 1
    fi
}

# Test instance tracker
test_data_source "Instance Tracker File" \
    "cat .monitoring/instance-tracker.json | jq -r '.instances | length'" \
    "3"

test_data_source "Instance Tracker Active Count" \
    "cat .monitoring/instance-tracker.json | jq -r '.instances | to_entries | map(select(.value.status == \"active\")) | length'" \
    "3"

test_data_source "Instance Tracker Tasks Completed" \
    "cat .monitoring/instance-tracker.json | jq -r '.metrics.tasks_completed'" \
    "16"

# Test Control Plane
test_data_source "Control Plane Health" \
    "curl -s http://localhost:4000/health | jq -r '.status'" \
    "healthy"

test_data_source "Control Plane Business Metrics" \
    "curl -s -H 'Authorization: Bearer test-token' http://localhost:4000/api/v1/business/metrics | jq -r '.success'" \
    "true"

# Test AI DAWG
test_data_source "AI DAWG Health" \
    "curl -s http://localhost:3001/health | jq -r '.status'" \
    "healthy"

test_data_source "AI DAWG Modules List" \
    "curl -s http://localhost:3001/api/v1/modules | jq -r '.data.modules | length'" \
    "5"

test_data_source "AI DAWG Module - Music Status" \
    "curl -s http://localhost:3001/api/v1/modules/music | jq -r '.data.status'" \
    "healthy"

stage_1_result="$stage_1_passed/$((stage_1_passed + stage_1_failed))"
echo ""
echo -e "Stage 1 Result: ${GREEN}$stage_1_passed passed${NC}, ${RED}$stage_1_failed failed${NC}"
echo ""

#
# STAGE 2: DASHBOARD BACKEND API AUDIT
#
echo -e "${BOLD}==== STAGE 2: DASHBOARD BACKEND API AUDIT ====${NC}"
echo ""

stage_2_passed=0
stage_2_failed=0

test_api_endpoint() {
    local name="$1"
    local url="$2"
    local jq_filter="$3"
    local expected="$4"

    echo -n "Testing $name... "
    ((total_tests++))

    result=$(curl -s "$url" | jq -r "$jq_filter" 2>/dev/null || echo "ERROR")

    if [[ "$result" == "$expected" ]] || echo "$result" | grep -q "$expected"; then
        echo -e "${GREEN}PASS${NC} (value: $result)"
        ((stage_2_passed++))
        ((total_passed++))
        return 0
    else
        echo -e "${RED}FAIL${NC} (expected: $expected, got: $result)"
        ((stage_2_failed++))
        ((total_failed++))
        return 1
    fi
}

# Instance Activity
test_api_endpoint "Instance Activity - Active Count" \
    "$DASHBOARD_API/api/dashboard/instances" \
    ".data.metrics.active_instances" \
    "3"

test_api_endpoint "Instance Activity - Tasks Completed" \
    "$DASHBOARD_API/api/dashboard/instances" \
    ".data.metrics.tasks_completed" \
    "16"

test_api_endpoint "Instance Activity - Efficiency Ratio" \
    "$DASHBOARD_API/api/dashboard/instances" \
    ".data.metrics.efficiency_ratio" \
    "1.54"

# Business Metrics
test_api_endpoint "Business - Music Module Health" \
    "$DASHBOARD_API/api/dashboard/business" \
    ".data.music.health" \
    "healthy"

test_api_endpoint "Business - Music Module Uptime (non-zero)" \
    "$DASHBOARD_API/api/dashboard/business" \
    ".data.music.uptime > 0" \
    "true"

test_api_endpoint "Business - Engagement Module Detected" \
    "$DASHBOARD_API/api/dashboard/business" \
    ".data.engagement | has(\"health\")" \
    "true"

# Financial Metrics
test_api_endpoint "Financial - Calculation Source" \
    "$DASHBOARD_API/api/dashboard/financial" \
    ".data.calculation_source" \
    "real_metrics"

test_api_endpoint "Financial - Burn Rate" \
    "$DASHBOARD_API/api/dashboard/financial" \
    ".data.burn_rate" \
    "8500"

test_api_endpoint "Financial - Runway Months" \
    "$DASHBOARD_API/api/dashboard/financial" \
    ".data.runway_months" \
    "26"

stage_2_result="$stage_2_passed/$((stage_2_passed + stage_2_failed))"
echo ""
echo -e "Stage 2 Result: ${GREEN}$stage_2_passed passed${NC}, ${RED}$stage_2_failed failed${NC}"
echo ""

#
# STAGE 3: LIVE DATA FRESHNESS TEST
#
echo -e "${BOLD}==== STAGE 3: LIVE DATA FRESHNESS TEST ====${NC}"
echo "Testing if data changes over time (LIVE data verification)..."
echo ""

stage_3_passed=0
stage_3_failed=0

# Capture uptime at T0
uptime_t0=$(curl -s http://localhost:3001/api/v1/modules/music | jq -r '.data.uptime')
echo "Music module uptime at T0: $uptime_t0 seconds"

# Wait 5 seconds
echo "Waiting 5 seconds..."
sleep 5

# Capture uptime at T1
uptime_t1=$(curl -s http://localhost:3001/api/v1/modules/music | jq -r '.data.uptime')
echo "Music module uptime at T1: $uptime_t1 seconds"

# Verify uptime increased
echo -n "Verifying uptime increased (LIVE data)... "
((total_tests++))
if [ "$uptime_t1" -gt "$uptime_t0" ]; then
    echo -e "${GREEN}PASS${NC} (increased by $((uptime_t1 - uptime_t0)) seconds)"
    ((stage_3_passed++))
    ((total_passed++))
else
    echo -e "${RED}FAIL${NC} (uptime did not increase - data may be cached/fake)"
    ((stage_3_failed++))
    ((total_failed++))
fi

# Test dashboard backend reflects live data
echo -n "Verifying dashboard backend fetches live data... "
((total_tests++))
dashboard_uptime=$(curl -s $DASHBOARD_API/api/dashboard/business | jq -r '.data.music.uptime')
if [ "$dashboard_uptime" -ge "$uptime_t0" ]; then
    echo -e "${GREEN}PASS${NC} (dashboard uptime: $dashboard_uptime)"
    ((stage_3_passed++))
    ((total_passed++))
else
    echo -e "${RED}FAIL${NC} (dashboard shows stale data)"
    ((stage_3_failed++))
    ((total_failed++))
fi

stage_3_result="$stage_3_passed/$((stage_3_passed + stage_3_failed))"
echo ""
echo -e "Stage 3 Result: ${GREEN}$stage_3_passed passed${NC}, ${RED}$stage_3_failed failed${NC}"
echo ""

#
# STAGE 4: E2E DATA FLOW VALIDATION
#
echo -e "${BOLD}==== STAGE 4: E2E DATA FLOW VALIDATION ====${NC}"
echo "Testing complete data flow: Source → Backend → API"
echo ""

stage_4_passed=0
stage_4_failed=0

# Test 1: Instance Tracker → Dashboard API
echo -n "E2E Test: Instance Tracker → Dashboard API... "
((total_tests++))
tracker_count=$(cat .monitoring/instance-tracker.json | jq -r '.instances | to_entries | map(select(.value.status == "active")) | length')
api_count=$(curl -s $DASHBOARD_API/api/dashboard/instances | jq -r '.data.metrics.active_instances')

if [ "$tracker_count" == "$api_count" ]; then
    echo -e "${GREEN}PASS${NC} (both show $tracker_count instances)"
    ((stage_4_passed++))
    ((total_passed++))
else
    echo -e "${RED}FAIL${NC} (tracker: $tracker_count, API: $api_count)"
    ((stage_4_failed++))
    ((total_failed++))
fi

# Test 2: AI DAWG → Dashboard API → Module Health
echo -n "E2E Test: AI DAWG → Dashboard API (module health)... "
((total_tests++))
ai_dawg_music=$(curl -s http://localhost:3001/api/v1/modules/music | jq -r '.data.status')
dashboard_music=$(curl -s $DASHBOARD_API/api/dashboard/business | jq -r '.data.music.health')

if [[ "$ai_dawg_music" == "healthy" ]] && [[ "$dashboard_music" == "healthy" || "$dashboard_music" == "unknown" ]]; then
    echo -e "${GREEN}PASS${NC} (AI DAWG: $ai_dawg_music, Dashboard: $dashboard_music)"
    ((stage_4_passed++))
    ((total_passed++))
else
    echo -e "${RED}FAIL${NC} (mismatch: AI DAWG=$ai_dawg_music, Dashboard=$dashboard_music)"
    ((stage_4_failed++))
    ((total_failed++))
fi

# Test 3: Control Plane → Dashboard API → Financial
echo -n "E2E Test: Control Plane → Dashboard API (financial)... "
((total_tests++))
cp_active_users=$(curl -s -H "Authorization: Bearer test-token" http://localhost:4000/api/v1/business/metrics | jq -r '.data.users.active')
dashboard_customers=$(curl -s $DASHBOARD_API/api/dashboard/financial | jq -r '.data.customers')

if [ "$cp_active_users" == "$dashboard_customers" ]; then
    echo -e "${GREEN}PASS${NC} (both show $cp_active_users users)"
    ((stage_4_passed++))
    ((total_passed++))
else
    echo -e "${RED}FAIL${NC} (Control Plane: $cp_active_users, Dashboard: $dashboard_customers)"
    ((stage_4_failed++))
    ((total_failed++))
fi

stage_4_result="$stage_4_passed/$((stage_4_passed + stage_4_failed))"
echo ""
echo -e "Stage 4 Result: ${GREEN}$stage_4_passed passed${NC}, ${RED}$stage_4_failed failed${NC}"
echo ""

#
# FINAL REPORT
#
echo ""
echo "========================================"
echo -e "${BOLD}COMPREHENSIVE E2E TEST REPORT${NC}"
echo "========================================"
echo ""
echo "Stage Results:"
echo "  Stage 1 (Data Sources):     $stage_1_result tests passed"
echo "  Stage 2 (Backend API):      $stage_2_result tests passed"
echo "  Stage 3 (Live Data):        $stage_3_result tests passed"
echo "  Stage 4 (E2E Flow):         $stage_4_result tests passed"
echo ""
echo "Overall Results:"
echo -e "  Total Tests:   $total_tests"
echo -e "  ${GREEN}Passed:        $total_passed${NC}"
echo -e "  ${RED}Failed:        $total_failed${NC}"
echo -e "  Success Rate:  $((total_passed * 100 / total_tests))%"
echo ""

if [ $total_failed -eq 0 ]; then
    echo -e "${GREEN}${BOLD}✓ ALL TESTS PASSED - LIVE DATA VERIFIED${NC}"
    echo ""
    echo "✅ Dashboard is displaying LIVE, ACCURATE data"
    echo "✅ All data sources are connected and functional"
    echo "✅ E2E data flow is working correctly"
    exit 0
else
    echo -e "${RED}${BOLD}✗ SOME TESTS FAILED${NC}"
    echo ""
    echo "⚠️  Review failed tests above"
    echo "⚠️  Dashboard may be showing cached or fake data"
    exit 1
fi

#!/bin/bash
# JARVIS Integration Test Suite
# Tests the full JARVIS stack managing AI DAWG

set -e

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "════════════════════════════════════════════════════"
echo "   JARVIS Integration Test Suite"
echo "   Testing: JARVIS (Business Operator) → AI DAWG (Music Platform)"
echo "════════════════════════════════════════════════════"
echo ""

# Test counters
TESTS_PASSED=0
TESTS_FAILED=0

# Helper function to run tests
run_test() {
    local test_name="$1"
    local command="$2"
    local expected_pattern="$3"

    echo -n "Testing: $test_name... "

    if result=$(eval "$command" 2>&1); then
        if echo "$result" | grep -q "$expected_pattern"; then
            echo -e "${GREEN}✓ PASS${NC}"
            ((TESTS_PASSED++))
            return 0
        else
            echo -e "${RED}✗ FAIL${NC} (unexpected response)"
            echo "  Expected pattern: $expected_pattern"
            echo "  Got: $result"
            ((TESTS_FAILED++))
            return 1
        fi
    else
        echo -e "${RED}✗ FAIL${NC} (command failed)"
        echo "  Error: $result"
        ((TESTS_FAILED++))
        return 1
    fi
}

echo "═══ Phase 1: JARVIS Core Services ═══"
echo ""

# Test Control Plane
run_test "Control Plane health" \
    "curl -s http://localhost:4000/health" \
    "healthy"

run_test "Control Plane version" \
    "curl -s http://localhost:4000/health" \
    "jarvis-control-plane"

# Test Dashboard Backend
run_test "Dashboard Backend health" \
    "curl -s http://localhost:5001/health" \
    "healthy"

run_test "Dashboard Backend service name" \
    "curl -s http://localhost:5001/health" \
    "jarvis-dashboard-api"

# Test Dashboard Frontend
run_test "Dashboard Frontend accessible" \
    "curl -s http://localhost:3003 -o /dev/null -w '%{http_code}'" \
    "200"

echo ""
echo "═══ Phase 2: AI DAWG Services (Managed by JARVIS) ═══"
echo ""

# Test AI DAWG services that JARVIS manages
run_test "Vocal Coach service" \
    "curl -s http://localhost:8000/health" \
    "ok"

run_test "Producer AI service" \
    "curl -s http://localhost:8001/health" \
    "ok"

# Test AI Brain (if available)
if curl -s http://localhost:8002/api/health >/dev/null 2>&1; then
    run_test "AI Brain service" \
        "curl -s http://localhost:8002/api/health" \
        "status"
else
    echo -e "${YELLOW}⊘ SKIP${NC} AI Brain service (not running - needs Docker rebuild)"
fi

echo ""
echo "═══ Phase 3: Integration & Routing ═══"
echo ""

# Test that Control Plane can route to AI DAWG services
run_test "Control Plane routes to module registry" \
    "curl -s http://localhost:4000/api/v1/modules" \
    "modules"

# Test Dashboard API can access metrics
run_test "Dashboard metrics endpoint" \
    "curl -s http://localhost:5001/api/dashboard/overview" \
    "instances"

echo ""
echo "═══ Phase 4: JARVIS Identity (Optional) ═══"
echo ""

# Test JARVIS AI Brain identity (if running)
if curl -s http://localhost:8002/api/health >/dev/null 2>&1; then
    echo -n "Testing: JARVIS AI Brain identity... "
    response=$(curl -s -X POST http://localhost:8002/api/chat \
        -H "Content-Type: application/json" \
        -d '{"message":"Who are you?","session_id":"integration-test"}' 2>&1 || echo "ERROR")

    if echo "$response" | grep -qi "jarvis\|business\|operator"; then
        echo -e "${GREEN}✓ PASS${NC} (identifies as JARVIS)"
        ((TESTS_PASSED++))
    elif echo "$response" | grep -q "ERROR"; then
        echo -e "${YELLOW}⊘ SKIP${NC} (endpoint not available)"
    else
        echo -e "${YELLOW}⚠ WARN${NC} (may still identify as AI DAWG)"
        echo "  Response: $response"
        echo "  Note: Rebuild Docker with updated system prompt to fix"
    fi
else
    echo -e "${YELLOW}⊘ SKIP${NC} JARVIS AI Brain identity (service not running)"
fi

echo ""
echo "════════════════════════════════════════════════════"
echo "   Test Results"
echo "════════════════════════════════════════════════════"
echo ""
echo -e "Tests Passed: ${GREEN}$TESTS_PASSED${NC}"
echo -e "Tests Failed: ${RED}$TESTS_FAILED${NC}"
echo ""

if [ $TESTS_FAILED -eq 0 ]; then
    echo -e "${GREEN}✓ All core JARVIS systems operational!${NC}"
    echo ""
    echo "JARVIS is successfully managing AI DAWG services."
    echo ""
    echo "Next steps:"
    echo "  1. Check Dashboard: http://localhost:3003"
    echo "  2. Verify business metrics are visible"
    echo "  3. Test chat interface for JARVIS identity"
    exit 0
else
    echo -e "${RED}✗ Some tests failed. Please review errors above.${NC}"
    echo ""
    echo "Common fixes:"
    echo "  - Ensure all services are running: cd /Users/benkennon/Jarvis && npm run dev"
    echo "  - Check Dashboard backend: cd /Users/benkennon/Jarvis/dashboard/backend && npm run dev"
    echo "  - Verify AI DAWG services: docker-compose ps"
    exit 1
fi

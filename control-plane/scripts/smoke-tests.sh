#!/bin/bash
set -euo pipefail

# Smoke Tests Script
# Usage: ./smoke-tests.sh <base-url>
# Example: ./smoke-tests.sh https://staging.jarvis-ai.app

BASE_URL="${1:-http://localhost:3000}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TIMEOUT=10

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

TESTS_PASSED=0
TESTS_FAILED=0

log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[✓]${NC} $1"
    TESTS_PASSED=$((TESTS_PASSED + 1))
}

log_error() {
    echo -e "${RED}[✗]${NC} $1"
    TESTS_FAILED=$((TESTS_FAILED + 1))
}

# Test HTTP endpoint
test_endpoint() {
    local NAME="$1"
    local PATH="$2"
    local EXPECTED_STATUS="${3:-200}"

    log_info "Testing: $NAME"

    RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" --max-time $TIMEOUT "${BASE_URL}${PATH}" || echo "000")

    if [ "$RESPONSE" = "$EXPECTED_STATUS" ]; then
        log_success "$NAME - Status: $RESPONSE"
        return 0
    else
        log_error "$NAME - Expected: $EXPECTED_STATUS, Got: $RESPONSE"
        return 1
    fi
}

# Test endpoint with JSON response
test_json_endpoint() {
    local NAME="$1"
    local PATH="$2"

    log_info "Testing: $NAME"

    RESPONSE=$(curl -s --max-time $TIMEOUT "${BASE_URL}${PATH}")
    STATUS=$?

    if [ $STATUS -eq 0 ] && echo "$RESPONSE" | jq . > /dev/null 2>&1; then
        log_success "$NAME - Valid JSON response"
        return 0
    else
        log_error "$NAME - Invalid JSON or failed request"
        return 1
    fi
}

# Test performance
test_performance() {
    local NAME="$1"
    local PATH="$2"
    local MAX_TIME="$3"

    log_info "Testing: $NAME (max: ${MAX_TIME}ms)"

    START=$(date +%s%N)
    curl -s -o /dev/null --max-time $TIMEOUT "${BASE_URL}${PATH}"
    END=$(date +%s%N)

    DURATION=$(( (END - START) / 1000000 ))

    if [ $DURATION -lt $MAX_TIME ]; then
        log_success "$NAME - Response time: ${DURATION}ms"
        return 0
    else
        log_error "$NAME - Too slow: ${DURATION}ms (max: ${MAX_TIME}ms)"
        return 1
    fi
}

# Main smoke tests
run_smoke_tests() {
    log_info "========================================="
    log_info "Running Smoke Tests"
    log_info "Base URL: $BASE_URL"
    log_info "========================================="

    # Health Checks
    test_endpoint "Health Check" "/health" "200"
    test_endpoint "Ready Check" "/health/ready" "200"
    test_endpoint "Live Check" "/health/live" "200"

    # API Endpoints
    test_json_endpoint "API Root" "/api"
    test_endpoint "Agents List" "/api/agents" "200,401"

    # Performance Tests
    test_performance "Health Check Performance" "/health" "200"
    test_performance "API Root Performance" "/api" "500"

    # Security Tests
    log_info "Testing: Security Headers"
    HEADERS=$(curl -s -I --max-time $TIMEOUT "${BASE_URL}/health")
    if echo "$HEADERS" | grep -qi "x-frame-options"; then
        log_success "Security Headers - X-Frame-Options present"
    else
        log_error "Security Headers - X-Frame-Options missing"
    fi

    if echo "$HEADERS" | grep -qi "x-content-type-options"; then
        log_success "Security Headers - X-Content-Type-Options present"
    else
        log_error "Security Headers - X-Content-Type-Options missing"
    fi

    # 404 Handling
    test_endpoint "404 Handling" "/this-does-not-exist" "404"

    # Database Check
    log_info "Testing: Database Connectivity"
    DB_CHECK=$(curl -s --max-time $TIMEOUT "${BASE_URL}/health" | jq -r '.database.connected // "false"' 2>/dev/null || echo "false")
    if [ "$DB_CHECK" = "true" ]; then
        log_success "Database - Connected"
    else
        log_error "Database - Not connected"
    fi

    # Cache Check
    log_info "Testing: Cache Connectivity"
    CACHE_CHECK=$(curl -s --max-time $TIMEOUT "${BASE_URL}/health" | jq -r '.cache.connected // "false"' 2>/dev/null || echo "false")
    if [ "$CACHE_CHECK" = "true" ]; then
        log_success "Cache - Connected"
    else
        log_error "Cache - Not connected"
    fi

    # Summary
    log_info "========================================="
    log_info "Smoke Tests Complete"
    log_info "Passed: $TESTS_PASSED"
    log_info "Failed: $TESTS_FAILED"
    log_info "========================================="

    if [ $TESTS_FAILED -gt 0 ]; then
        log_error "Some tests failed!"
        return 1
    else
        log_success "All tests passed!"
        return 0
    fi
}

# Run tests
run_smoke_tests

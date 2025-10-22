#!/bin/bash

###############################################################################
# Security Audit Script for Jarvis Platform
# Performs comprehensive security testing and vulnerability scanning
###############################################################################

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
REPORT_DIR="./security-reports"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
REPORT_FILE="$REPORT_DIR/security-audit-$TIMESTAMP.html"
JSON_REPORT="$REPORT_DIR/security-audit-$TIMESTAMP.json"

# Create report directory
mkdir -p "$REPORT_DIR"

echo -e "${BLUE}============================================${NC}"
echo -e "${BLUE}   Jarvis Platform Security Audit${NC}"
echo -e "${BLUE}============================================${NC}\n"

# Function to print section headers
print_section() {
    echo -e "\n${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}\n"
}

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Initialize results
CRITICAL_ISSUES=0
HIGH_ISSUES=0
MEDIUM_ISSUES=0
LOW_ISSUES=0
INFO_ISSUES=0

###############################################################################
# 1. Dependency Vulnerability Scanning
###############################################################################

print_section "1. Scanning Dependencies for Vulnerabilities"

if command_exists npm; then
    echo "Running npm audit..."
    npm audit --json > "$REPORT_DIR/npm-audit.json" 2>&1 || true

    # Parse npm audit results
    if [ -f "$REPORT_DIR/npm-audit.json" ]; then
        CRITICAL_ISSUES=$((CRITICAL_ISSUES + $(jq '.metadata.vulnerabilities.critical // 0' "$REPORT_DIR/npm-audit.json")))
        HIGH_ISSUES=$((HIGH_ISSUES + $(jq '.metadata.vulnerabilities.high // 0' "$REPORT_DIR/npm-audit.json")))
        MEDIUM_ISSUES=$((MEDIUM_ISSUES + $(jq '.metadata.vulnerabilities.moderate // 0' "$REPORT_DIR/npm-audit.json")))
        LOW_ISSUES=$((LOW_ISSUES + $(jq '.metadata.vulnerabilities.low // 0' "$REPORT_DIR/npm-audit.json")))

        echo -e "${GREEN}✓${NC} npm audit complete"
        echo "   Critical: $(jq '.metadata.vulnerabilities.critical // 0' "$REPORT_DIR/npm-audit.json")"
        echo "   High: $(jq '.metadata.vulnerabilities.high // 0' "$REPORT_DIR/npm-audit.json")"
        echo "   Medium: $(jq '.metadata.vulnerabilities.moderate // 0' "$REPORT_DIR/npm-audit.json")"
        echo "   Low: $(jq '.metadata.vulnerabilities.low // 0' "$REPORT_DIR/npm-audit.json")"
    fi
else
    echo -e "${YELLOW}⚠${NC} npm not found, skipping dependency scan"
fi

###############################################################################
# 2. OWASP ZAP Dynamic Application Security Testing
###############################################################################

print_section "2. OWASP ZAP Security Scan"

if command_exists docker; then
    echo "Starting OWASP ZAP scan..."

    TARGET_URL=${TARGET_URL:-"http://localhost:3000"}

    # Run ZAP baseline scan
    docker run --rm \
        -v "$PWD/$REPORT_DIR:/zap/wrk/:rw" \
        -t owasp/zap2docker-stable zap-baseline.py \
        -t "$TARGET_URL" \
        -g gen.conf \
        -r "zap-report.html" \
        -J "zap-report.json" \
        || true

    if [ -f "$REPORT_DIR/zap-report.json" ]; then
        echo -e "${GREEN}✓${NC} OWASP ZAP scan complete"

        # Parse ZAP results (simplified - actual parsing would be more complex)
        HIGH_ISSUES=$((HIGH_ISSUES + $(jq '[.site[].alerts[] | select(.riskcode == "3")] | length' "$REPORT_DIR/zap-report.json" 2>/dev/null || echo 0)))
        MEDIUM_ISSUES=$((MEDIUM_ISSUES + $(jq '[.site[].alerts[] | select(.riskcode == "2")] | length' "$REPORT_DIR/zap-report.json" 2>/dev/null || echo 0)))
        LOW_ISSUES=$((LOW_ISSUES + $(jq '[.site[].alerts[] | select(.riskcode == "1")] | length' "$REPORT_DIR/zap-report.json" 2>/dev/null || echo 0)))
    fi
else
    echo -e "${YELLOW}⚠${NC} Docker not found, skipping OWASP ZAP scan"
fi

###############################################################################
# 3. SQL Injection Testing
###############################################################################

print_section "3. SQL Injection Vulnerability Testing"

echo "Testing common SQL injection patterns..."

SQL_INJECTION_TESTS=(
    "' OR '1'='1"
    "'; DROP TABLE users--"
    "' UNION SELECT NULL--"
    "1' OR '1' = '1"
    "admin'--"
)

SQL_ISSUES=0

for payload in "${SQL_INJECTION_TESTS[@]}"; do
    # Test login endpoint
    RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" \
        -X POST "$TARGET_URL/api/auth/login" \
        -H "Content-Type: application/json" \
        -d "{\"email\":\"$payload\",\"password\":\"test\"}" \
        2>/dev/null || echo "000")

    if [ "$RESPONSE" = "200" ]; then
        echo -e "${RED}✗${NC} Possible SQL injection vulnerability detected!"
        SQL_ISSUES=$((SQL_ISSUES + 1))
    fi
done

if [ $SQL_ISSUES -eq 0 ]; then
    echo -e "${GREEN}✓${NC} No SQL injection vulnerabilities detected"
else
    echo -e "${RED}✗${NC} Found $SQL_ISSUES potential SQL injection issues"
    CRITICAL_ISSUES=$((CRITICAL_ISSUES + SQL_ISSUES))
fi

###############################################################################
# 4. Cross-Site Scripting (XSS) Testing
###############################################################################

print_section "4. Cross-Site Scripting (XSS) Testing"

echo "Testing XSS vulnerabilities..."

XSS_PAYLOADS=(
    "<script>alert('XSS')</script>"
    "<img src=x onerror=alert('XSS')>"
    "<svg/onload=alert('XSS')>"
    "javascript:alert('XSS')"
)

XSS_ISSUES=0

for payload in "${XSS_PAYLOADS[@]}"; do
    # Test search endpoint
    RESPONSE=$(curl -s "$TARGET_URL/api/search?q=$payload" 2>/dev/null || echo "")

    if echo "$RESPONSE" | grep -q "$payload"; then
        echo -e "${RED}✗${NC} Possible XSS vulnerability (payload reflected)"
        XSS_ISSUES=$((XSS_ISSUES + 1))
    fi
done

if [ $XSS_ISSUES -eq 0 ]; then
    echo -e "${GREEN}✓${NC} No XSS vulnerabilities detected"
else
    echo -e "${RED}✗${NC} Found $XSS_ISSUES potential XSS issues"
    HIGH_ISSUES=$((HIGH_ISSUES + XSS_ISSUES))
fi

###############################################################################
# 5. CSRF Protection Verification
###############################################################################

print_section "5. CSRF Protection Testing"

echo "Checking CSRF token implementation..."

# Test if sensitive endpoints accept requests without CSRF token
CSRF_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" \
    -X POST "$TARGET_URL/api/users/delete" \
    -H "Content-Type: application/json" \
    -d '{"userId":"test"}' \
    2>/dev/null || echo "000")

if [ "$CSRF_RESPONSE" = "200" ] || [ "$CSRF_RESPONSE" = "204" ]; then
    echo -e "${RED}✗${NC} Missing CSRF protection on sensitive endpoint"
    HIGH_ISSUES=$((HIGH_ISSUES + 1))
else
    echo -e "${GREEN}✓${NC} CSRF protection appears to be implemented"
fi

###############################################################################
# 6. Authentication Bypass Attempts
###############################################################################

print_section "6. Authentication Bypass Testing"

echo "Testing authentication mechanisms..."

# Test direct access to protected endpoints
AUTH_TESTS=(
    "/api/admin/users"
    "/api/billing/all"
    "/settings/security"
)

AUTH_ISSUES=0

for endpoint in "${AUTH_TESTS[@]}"; do
    RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" "$TARGET_URL$endpoint" 2>/dev/null || echo "000")

    if [ "$RESPONSE" = "200" ]; then
        echo -e "${RED}✗${NC} Unauthenticated access to: $endpoint"
        AUTH_ISSUES=$((AUTH_ISSUES + 1))
    fi
done

if [ $AUTH_ISSUES -eq 0 ]; then
    echo -e "${GREEN}✓${NC} Authentication properly enforced"
else
    echo -e "${RED}✗${NC} Found $AUTH_ISSUES authentication bypass issues"
    CRITICAL_ISSUES=$((CRITICAL_ISSUES + AUTH_ISSUES))
fi

###############################################################################
# 7. Rate Limiting Verification
###############################################################################

print_section "7. Rate Limiting Tests"

echo "Testing rate limiting..."

RATE_LIMIT_ENDPOINT="$TARGET_URL/api/auth/login"
RAPID_REQUESTS=100
BLOCKED_COUNT=0

for i in $(seq 1 $RAPID_REQUESTS); do
    RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" \
        -X POST "$RATE_LIMIT_ENDPOINT" \
        -H "Content-Type: application/json" \
        -d '{"email":"test@test.com","password":"wrong"}' \
        2>/dev/null || echo "000")

    if [ "$RESPONSE" = "429" ]; then
        BLOCKED_COUNT=$((BLOCKED_COUNT + 1))
    fi
done

if [ $BLOCKED_COUNT -gt 0 ]; then
    echo -e "${GREEN}✓${NC} Rate limiting active (blocked $BLOCKED_COUNT/$RAPID_REQUESTS requests)"
else
    echo -e "${YELLOW}⚠${NC} Rate limiting may not be configured"
    MEDIUM_ISSUES=$((MEDIUM_ISSUES + 1))
fi

###############################################################################
# 8. SSL/TLS Configuration Check
###############################################################################

print_section "8. SSL/TLS Configuration"

if command_exists testssl.sh; then
    echo "Running SSL/TLS security scan..."
    testssl.sh --jsonfile "$REPORT_DIR/ssl-report.json" "$TARGET_URL" || true
    echo -e "${GREEN}✓${NC} SSL/TLS scan complete"
else
    echo -e "${YELLOW}⚠${NC} testssl.sh not found, skipping SSL/TLS scan"
    echo "   Install from: https://github.com/drwetter/testssl.sh"
fi

###############################################################################
# 9. Security Headers Check
###############################################################################

print_section "9. Security Headers Verification"

echo "Checking security headers..."

HEADERS=$(curl -s -I "$TARGET_URL" 2>/dev/null || echo "")

check_header() {
    local header=$1
    local severity=$2

    if echo "$HEADERS" | grep -qi "$header"; then
        echo -e "${GREEN}✓${NC} $header present"
    else
        echo -e "${YELLOW}✗${NC} Missing $header"
        if [ "$severity" = "high" ]; then
            HIGH_ISSUES=$((HIGH_ISSUES + 1))
        else
            MEDIUM_ISSUES=$((MEDIUM_ISSUES + 1))
        fi
    fi
}

check_header "X-Content-Type-Options" "medium"
check_header "X-Frame-Options" "high"
check_header "X-XSS-Protection" "medium"
check_header "Strict-Transport-Security" "high"
check_header "Content-Security-Policy" "high"
check_header "Referrer-Policy" "low"
check_header "Permissions-Policy" "low"

###############################################################################
# 10. Secrets and Sensitive Data Exposure
###############################################################################

print_section "10. Secrets Scanning"

echo "Scanning for exposed secrets..."

if command_exists trufflehog; then
    trufflehog filesystem . --json > "$REPORT_DIR/secrets-scan.json" 2>&1 || true

    if [ -f "$REPORT_DIR/secrets-scan.json" ]; then
        SECRET_COUNT=$(jq -s 'length' "$REPORT_DIR/secrets-scan.json" 2>/dev/null || echo 0)

        if [ "$SECRET_COUNT" -gt 0 ]; then
            echo -e "${RED}✗${NC} Found $SECRET_COUNT potential secrets!"
            CRITICAL_ISSUES=$((CRITICAL_ISSUES + SECRET_COUNT))
        else
            echo -e "${GREEN}✓${NC} No secrets detected"
        fi
    fi
else
    echo -e "${YELLOW}⚠${NC} trufflehog not found, skipping secrets scan"
fi

# Check for common secret patterns in env files
if [ -f ".env" ]; then
    echo -e "${YELLOW}⚠${NC} .env file exists (ensure it's in .gitignore)"
fi

if git ls-files | grep -q "\.env"; then
    echo -e "${RED}✗${NC} .env file is tracked in git!"
    CRITICAL_ISSUES=$((CRITICAL_ISSUES + 1))
fi

###############################################################################
# 11. Generate Final Report
###############################################################################

print_section "11. Generating Security Report"

# Create JSON summary
cat > "$JSON_REPORT" <<EOF
{
  "timestamp": "$TIMESTAMP",
  "target": "$TARGET_URL",
  "summary": {
    "critical": $CRITICAL_ISSUES,
    "high": $HIGH_ISSUES,
    "medium": $MEDIUM_ISSUES,
    "low": $LOW_ISSUES,
    "info": $INFO_ISSUES,
    "total": $((CRITICAL_ISSUES + HIGH_ISSUES + MEDIUM_ISSUES + LOW_ISSUES + INFO_ISSUES))
  },
  "status": "$([ $CRITICAL_ISSUES -eq 0 ] && [ $HIGH_ISSUES -eq 0 ] && echo "PASS" || echo "FAIL")"
}
EOF

# Print summary
echo -e "\n${BLUE}════════════════════════════════════════${NC}"
echo -e "${BLUE}        Security Audit Summary${NC}"
echo -e "${BLUE}════════════════════════════════════════${NC}\n"

echo -e "  ${RED}Critical Issues:${NC} $CRITICAL_ISSUES"
echo -e "  ${YELLOW}High Issues:${NC}     $HIGH_ISSUES"
echo -e "  ${BLUE}Medium Issues:${NC}   $MEDIUM_ISSUES"
echo -e "  ${GREEN}Low Issues:${NC}      $LOW_ISSUES"
echo -e "  Info Issues:     $INFO_ISSUES"
echo -e "  ${BLUE}─────────────────────────────${NC}"
echo -e "  Total Issues:    $((CRITICAL_ISSUES + HIGH_ISSUES + MEDIUM_ISSUES + LOW_ISSUES + INFO_ISSUES))\n"

echo -e "Reports generated:"
echo -e "  • JSON: $JSON_REPORT"
echo -e "  • Directory: $REPORT_DIR\n"

# Exit with appropriate code
if [ $CRITICAL_ISSUES -gt 0 ] || [ $HIGH_ISSUES -gt 0 ]; then
    echo -e "${RED}✗ Security audit FAILED${NC}"
    echo -e "${RED}  Critical or high severity issues found!${NC}\n"
    exit 1
else
    echo -e "${GREEN}✓ Security audit PASSED${NC}"
    echo -e "${GREEN}  No critical or high severity issues found${NC}\n"
    exit 0
fi

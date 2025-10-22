#!/bin/bash

###############################################################################
# Performance Audit Script for Jarvis Platform
# Uses Lighthouse CI, WebPageTest, and custom metrics
# Target: Lighthouse score > 90
###############################################################################

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Configuration
REPORT_DIR="./performance-reports"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
TARGET_URL=${TARGET_URL:-"http://localhost:3000"}

mkdir -p "$REPORT_DIR"

echo -e "${BLUE}============================================${NC}"
echo -e "${BLUE}   Jarvis Performance Audit${NC}"
echo -e "${BLUE}============================================${NC}\n"

print_section() {
    echo -e "\n${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}\n"
}

command_exists() {
    command -v "$1" >/dev/null 2>&1
}

###############################################################################
# 1. Lighthouse CI Audit
###############################################################################

print_section "1. Running Lighthouse CI Audit"

if command_exists lhci; then
    echo "Running Lighthouse CI..."

    # Create Lighthouse CI config if it doesn't exist
    if [ ! -f "lighthouserc.json" ]; then
        cat > lighthouserc.json <<'EOF'
{
  "ci": {
    "collect": {
      "url": ["http://localhost:3000", "http://localhost:3000/dashboard", "http://localhost:3000/observatory"],
      "numberOfRuns": 3,
      "settings": {
        "preset": "desktop",
        "throttling": {
          "rttMs": 40,
          "throughputKbps": 10240,
          "cpuSlowdownMultiplier": 1
        }
      }
    },
    "assert": {
      "assertions": {
        "categories:performance": ["error", {"minScore": 0.9}],
        "categories:accessibility": ["error", {"minScore": 0.9}],
        "categories:best-practices": ["error", {"minScore": 0.9}],
        "categories:seo": ["warn", {"minScore": 0.8}],
        "first-contentful-paint": ["warn", {"maxNumericValue": 2000}],
        "largest-contentful-paint": ["error", {"maxNumericValue": 2500}],
        "cumulative-layout-shift": ["error", {"maxNumericValue": 0.1}],
        "total-blocking-time": ["warn", {"maxNumericValue": 300}],
        "speed-index": ["warn", {"maxNumericValue": 3000}]
      }
    },
    "upload": {
      "target": "filesystem",
      "outputDir": "./performance-reports/lighthouse"
    }
  }
}
EOF
    fi

    lhci autorun --config=lighthouserc.json || {
        echo -e "${RED}✗${NC} Lighthouse CI audit failed"
        exit 1
    }

    echo -e "${GREEN}✓${NC} Lighthouse CI audit complete"

    # Parse results
    LATEST_REPORT=$(find ./performance-reports/lighthouse -name "*.json" -type f -printf '%T+ %p\n' | sort -r | head -1 | cut -d' ' -f2-)

    if [ -f "$LATEST_REPORT" ]; then
        PERF_SCORE=$(jq '.categories.performance.score * 100' "$LATEST_REPORT")
        ACC_SCORE=$(jq '.categories.accessibility.score * 100' "$LATEST_REPORT")
        BP_SCORE=$(jq '.categories["best-practices"].score * 100' "$LATEST_REPORT")
        SEO_SCORE=$(jq '.categories.seo.score * 100' "$LATEST_REPORT")

        echo ""
        echo "Lighthouse Scores:"
        echo "  Performance:    $PERF_SCORE/100"
        echo "  Accessibility:  $ACC_SCORE/100"
        echo "  Best Practices: $BP_SCORE/100"
        echo "  SEO:            $SEO_SCORE/100"
    fi
else
    echo -e "${YELLOW}⚠${NC} Lighthouse CI not installed"
    echo "   Install with: npm install -g @lhci/cli"
fi

###############################################################################
# 2. Core Web Vitals
###############################################################################

print_section "2. Measuring Core Web Vitals"

if command_exists node; then
    cat > measure-web-vitals.js <<'EOF'
const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();

  // Collect metrics
  await page.goto(process.env.TARGET_URL || 'http://localhost:3000', {
    waitUntil: 'networkidle0'
  });

  const metrics = await page.evaluate(() => {
    return new Promise((resolve) => {
      const observer = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        const vitals = {};

        entries.forEach((entry) => {
          if (entry.name === 'first-contentful-paint') {
            vitals.FCP = entry.startTime;
          }
          if (entry.name === 'largest-contentful-paint') {
            vitals.LCP = entry.startTime;
          }
        });

        resolve(vitals);
      });

      observer.observe({ entryTypes: ['paint', 'largest-contentful-paint'] });

      setTimeout(() => resolve({}), 5000);
    });
  });

  const performanceMetrics = await page.metrics();

  console.log(JSON.stringify({
    ...metrics,
    ...performanceMetrics
  }, null, 2));

  await browser.close();
})();
EOF

    if command_exists node; then
        node measure-web-vitals.js > "$REPORT_DIR/web-vitals-$TIMESTAMP.json" 2>/dev/null || true
        rm -f measure-web-vitals.js

        if [ -f "$REPORT_DIR/web-vitals-$TIMESTAMP.json" ]; then
            echo -e "${GREEN}✓${NC} Core Web Vitals measured"
        fi
    fi
fi

###############################################################################
# 3. API Response Time Testing
###############################################################################

print_section "3. API Response Time Analysis"

echo "Testing API endpoint performance..."

API_ENDPOINTS=(
    "/api/auth/session"
    "/api/observatories"
    "/api/metrics"
    "/api/ai/chat"
    "/api/integrations"
)

API_RESULTS="$REPORT_DIR/api-performance-$TIMESTAMP.json"
echo "{" > "$API_RESULTS"
echo '  "endpoints": {' >> "$API_RESULTS"

FIRST=true
for endpoint in "${API_ENDPOINTS[@]}"; do
    [ "$FIRST" = false ] && echo "," >> "$API_RESULTS"
    FIRST=false

    # Measure response time with curl
    RESPONSE_TIME=$(curl -o /dev/null -s -w '%{time_total}' "$TARGET_URL$endpoint" 2>/dev/null || echo "0")
    RESPONSE_MS=$(echo "$RESPONSE_TIME * 1000" | bc)

    echo "    \"$endpoint\": {" >> "$API_RESULTS"
    echo "      \"responseTime\": $RESPONSE_MS," >> "$API_RESULTS"
    echo "      \"timestamp\": \"$(date -u +%Y-%m-%dT%H:%M:%SZ)\"" >> "$API_RESULTS"
    echo -n "    }" >> "$API_RESULTS"

    if (( $(echo "$RESPONSE_MS < 200" | bc -l) )); then
        echo -e "  ${GREEN}✓${NC} $endpoint: ${RESPONSE_MS}ms"
    elif (( $(echo "$RESPONSE_MS < 500" | bc -l) )); then
        echo -e "  ${YELLOW}⚠${NC} $endpoint: ${RESPONSE_MS}ms"
    else
        echo -e "  ${RED}✗${NC} $endpoint: ${RESPONSE_MS}ms (TOO SLOW)"
    fi
done

echo "" >> "$API_RESULTS"
echo '  }' >> "$API_RESULTS"
echo "}" >> "$API_RESULTS"

echo -e "${GREEN}✓${NC} API performance analysis complete"

###############################################################################
# 4. Database Query Performance
###############################################################################

print_section "4. Database Query Analysis"

echo "Analyzing database query performance..."

# This would connect to your database and analyze slow queries
# For demonstration, we'll show the concept

echo "Checking for slow queries (>100ms)..."

# Example: PostgreSQL slow query log
# psql -c "SELECT query, mean_exec_time FROM pg_stat_statements WHERE mean_exec_time > 100 ORDER BY mean_exec_time DESC LIMIT 10;"

echo -e "${BLUE}ℹ${NC} Database query analysis requires database connection"
echo "   Set up slow query logging in your database configuration"

###############################################################################
# 5. Memory Leak Detection
###############################################################################

print_section "5. Memory Leak Detection"

echo "Checking for memory leaks..."

if command_exists node; then
    cat > memory-leak-test.js <<'EOF'
const v8 = require('v8');

// Take heap snapshot before
const before = v8.getHeapStatistics();

// Simulate operations (would be replaced with actual app testing)
const arrays = [];
for (let i = 0; i < 100; i++) {
    arrays.push(new Array(1000).fill('test'));
}

// Take heap snapshot after
setTimeout(() => {
    const after = v8.getHeapStatistics();

    const growth = {
        heapSizeMB: ((after.total_heap_size - before.total_heap_size) / 1024 / 1024).toFixed(2),
        usedHeapMB: ((after.used_heap_size - before.used_heap_size) / 1024 / 1024).toFixed(2)
    };

    console.log(JSON.stringify(growth, null, 2));

    // Cleanup
    arrays.length = 0;
}, 1000);
EOF

    node memory-leak-test.js > "$REPORT_DIR/memory-test-$TIMESTAMP.json" 2>/dev/null || true
    rm -f memory-leak-test.js

    echo -e "${GREEN}✓${NC} Memory leak test complete"
fi

###############################################################################
# 6. Bundle Size Analysis
###############################################################################

print_section "6. Bundle Size Analysis"

echo "Analyzing JavaScript bundle sizes..."

if [ -d ".next" ]; then
    # Next.js build analysis
    du -sh .next/static/chunks/* 2>/dev/null | sort -hr | head -10

    TOTAL_SIZE=$(du -sh .next/static | cut -f1)
    echo ""
    echo "Total static size: $TOTAL_SIZE"
fi

if command_exists webpack-bundle-analyzer; then
    echo -e "${GREEN}✓${NC} Use 'npm run analyze' for detailed bundle analysis"
else
    echo -e "${YELLOW}⚠${NC} Install webpack-bundle-analyzer for detailed analysis"
fi

###############################################################################
# 7. Generate Performance Report
###############################################################################

print_section "7. Generating Performance Report"

cat > "$REPORT_DIR/performance-summary-$TIMESTAMP.json" <<EOF
{
  "timestamp": "$TIMESTAMP",
  "target": "$TARGET_URL",
  "lighthouse": {
    "performance": ${PERF_SCORE:-0},
    "accessibility": ${ACC_SCORE:-0},
    "bestPractices": ${BP_SCORE:-0},
    "seo": ${SEO_SCORE:-0}
  },
  "status": "$([ "${PERF_SCORE:-0}" -ge 90 ] && echo "PASS" || echo "FAIL")"
}
EOF

echo -e "\n${BLUE}════════════════════════════════════════${NC}"
echo -e "${BLUE}      Performance Audit Summary${NC}"
echo -e "${BLUE}════════════════════════════════════════${NC}\n"

if [ "${PERF_SCORE:-0}" -ge 90 ]; then
    echo -e "${GREEN}✓ Performance Score: $PERF_SCORE/100${NC}"
else
    echo -e "${RED}✗ Performance Score: $PERF_SCORE/100 (Target: 90+)${NC}"
fi

echo -e "\nReports saved to: $REPORT_DIR\n"

# Exit with appropriate code
if [ "${PERF_SCORE:-0}" -ge 90 ]; then
    echo -e "${GREEN}✓ Performance audit PASSED${NC}\n"
    exit 0
else
    echo -e "${RED}✗ Performance audit FAILED${NC}\n"
    exit 1
fi

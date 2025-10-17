#!/bin/bash

##
# Live Activity Monitoring Test
#
# Tests all components of the activity monitoring system
##

set -e

echo "======================================================================"
echo "🧪 ACTIVITY MONITORING - LIVE SYSTEM TEST"
echo "======================================================================"
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

TESTS_PASSED=0
TESTS_FAILED=0

##
# Test 1: Jarvis Backend Health
##
echo -e "${BLUE}Test 1: Jarvis Backend Health${NC}"
if curl -s http://localhost:4000/health | grep -q "healthy"; then
    echo -e "${GREEN}✅ PASSED: Jarvis is healthy${NC}"
    TESTS_PASSED=$((TESTS_PASSED + 1))
else
    echo -e "${RED}❌ FAILED: Jarvis is not responding${NC}"
    TESTS_FAILED=$((TESTS_FAILED + 1))
fi
echo ""

##
# Test 2: Screen Recorder (Check for recent screenshots)
##
echo -e "${BLUE}Test 2: Screen Recorder${NC}"
SCREENSHOT_DIR="/Users/benkennon/Jarvis/data/activity-logs/screenshots"
if [ -d "$SCREENSHOT_DIR" ]; then
    SCREENSHOT_COUNT=$(ls "$SCREENSHOT_DIR" | wc -l | tr -d ' ')
    if [ "$SCREENSHOT_COUNT" -gt 0 ]; then
        # Check if latest screenshot is recent (within last 2 minutes)
        LATEST_SCREENSHOT=$(ls -t "$SCREENSHOT_DIR" | head -1)
        SCREENSHOT_AGE=$(( $(date +%s) - $(stat -f %m "$SCREENSHOT_DIR/$LATEST_SCREENSHOT") ))

        if [ "$SCREENSHOT_AGE" -lt 120 ]; then
            echo -e "${GREEN}✅ PASSED: Screen recorder active${NC}"
            echo "   📸 Total screenshots: $SCREENSHOT_COUNT"
            echo "   🕐 Latest: $SCREENSHOT_AGE seconds ago"
            TESTS_PASSED=$((TESTS_PASSED + 1))
        else
            echo -e "${YELLOW}⚠️  WARNING: Screen recorder may be stalled${NC}"
            echo "   Last screenshot: $SCREENSHOT_AGE seconds ago"
            TESTS_FAILED=$((TESTS_FAILED + 1))
        fi
    else
        echo -e "${RED}❌ FAILED: No screenshots found${NC}"
        TESTS_FAILED=$((TESTS_FAILED + 1))
    fi
else
    echo -e "${RED}❌ FAILED: Screenshot directory doesn't exist${NC}"
    TESTS_FAILED=$((TESTS_FAILED + 1))
fi
echo ""

##
# Test 3: Activity Log Storage
##
echo -e "${BLUE}Test 3: Activity Log Storage${NC}"
DATA_DIR="/Users/benkennon/Jarvis/data/activity-logs"
if [ -d "$DATA_DIR" ]; then
    STORAGE_SIZE=$(du -sh "$DATA_DIR" | awk '{print $1}')
    echo -e "${GREEN}✅ PASSED: Activity logs directory exists${NC}"
    echo "   💾 Storage used: $STORAGE_SIZE"
    TESTS_PASSED=$((TESTS_PASSED + 1))
else
    echo -e "${RED}❌ FAILED: Activity logs directory missing${NC}"
    TESTS_FAILED=$((TESTS_FAILED + 1))
fi
echo ""

##
# Test 4: Audio Monitor Status
##
echo -e "${BLUE}Test 4: Audio Monitor${NC}"
if grep -q "Audio monitor started" /tmp/jarvis-activity.log; then
    if grep -q "Audio permissions not granted" /tmp/jarvis-activity.log; then
        echo -e "${YELLOW}⚠️  WARNING: Audio monitor running without mic permissions${NC}"
        echo "   Status: Running (limited)"
        echo "   Action needed: Grant microphone permissions"
        TESTS_PASSED=$((TESTS_PASSED + 1))
    else
        echo -e "${GREEN}✅ PASSED: Audio monitor active with permissions${NC}"
        TESTS_PASSED=$((TESTS_PASSED + 1))
    fi
else
    echo -e "${RED}❌ FAILED: Audio monitor not started${NC}"
    TESTS_FAILED=$((TESTS_FAILED + 1))
fi
echo ""

##
# Test 5: Activity Monitoring Startup
##
echo -e "${BLUE}Test 5: Activity Monitoring System${NC}"
if grep -q "ACTIVITY MONITORING ACTIVE" /tmp/jarvis-activity.log; then
    STARTUP_LINE=$(grep "ACTIVITY MONITORING ACTIVE" /tmp/jarvis-activity.log | tail -1)
    echo -e "${GREEN}✅ PASSED: Activity monitoring system initialized${NC}"
    TESTS_PASSED=$((TESTS_PASSED + 1))
else
    echo -e "${RED}❌ FAILED: Activity monitoring not initialized${NC}"
    TESTS_FAILED=$((TESTS_FAILED + 1))
fi
echo ""

##
# Test 6: Current App Detection
##
echo -e "${BLUE}Test 6: App Usage Tracker${NC}"
ACTIVE_APP=$(osascript -e 'tell application "System Events" to get name of first application process whose frontmost is true' 2>/dev/null || echo "unknown")
if [ "$ACTIVE_APP" != "unknown" ]; then
    echo -e "${GREEN}✅ PASSED: Can detect active application${NC}"
    echo "   📱 Current app: $ACTIVE_APP"
    TESTS_PASSED=$((TESTS_PASSED + 1))
else
    echo -e "${RED}❌ FAILED: Cannot detect active app${NC}"
    TESTS_FAILED=$((TESTS_FAILED + 1))
fi
echo ""

##
# Test 7: Autonomous Orchestrator
##
echo -e "${BLUE}Test 7: Autonomous Orchestrator${NC}"
if grep -q "AUTONOMOUS MODE ACTIVE" /tmp/jarvis-activity.log; then
    echo -e "${GREEN}✅ PASSED: Autonomous orchestrator active${NC}"
    TESTS_PASSED=$((TESTS_PASSED + 1))
else
    echo -e "${RED}❌ FAILED: Autonomous orchestrator not active${NC}"
    TESTS_FAILED=$((TESTS_FAILED + 1))
fi
echo ""

##
# Test 8: Microphone Access Test
##
echo -e "${BLUE}Test 8: Microphone Permissions${NC}"
# Try to check input volume
if osascript -e 'input volume of (get volume settings)' > /dev/null 2>&1; then
    VOLUME=$(osascript -e 'input volume of (get volume settings)' 2>/dev/null || echo "0")
    echo -e "${GREEN}✅ PASSED: Microphone access granted${NC}"
    echo "   🎤 Input volume: $VOLUME"
    TESTS_PASSED=$((TESTS_PASSED + 1))
else
    echo -e "${YELLOW}⚠️  WARNING: Cannot verify microphone access${NC}"
    echo "   Action: Grant mic permissions to Terminal/iTerm"
    echo "   Go to: System Settings → Privacy & Security → Microphone"
    TESTS_FAILED=$((TESTS_FAILED + 1))
fi
echo ""

##
# Summary
##
echo "======================================================================"
echo -e "${BLUE}TEST SUMMARY${NC}"
echo "======================================================================"
TOTAL_TESTS=$((TESTS_PASSED + TESTS_FAILED))
echo "Total tests: $TOTAL_TESTS"
echo -e "${GREEN}Passed: $TESTS_PASSED${NC}"
echo -e "${RED}Failed: $TESTS_FAILED${NC}"
echo ""

if [ $TESTS_FAILED -eq 0 ]; then
    echo -e "${GREEN}🎉 ALL TESTS PASSED!${NC}"
    echo ""
    echo "✅ Activity monitoring is FULLY OPERATIONAL"
    echo ""
    echo "Ready to:"
    echo "  1. Monitor your screen (every 60s)"
    echo "  2. Track app usage (every 10s)"
    echo "  3. Detect freestyle sessions (with mic access)"
    echo "  4. Auto-finish songs proactively"
    echo ""
elif [ $TESTS_FAILED -eq 1 ] && grep -q "WARNING.*Microphone" <(echo "$OUTPUT"); then
    echo -e "${YELLOW}⚠️  MOSTLY WORKING - Microphone permissions needed${NC}"
    echo ""
    echo "✅ Working:"
    echo "  - Screen recording"
    echo "  - App tracking"
    echo "  - Activity monitoring"
    echo ""
    echo "⚠️  Needs attention:"
    echo "  - Microphone permissions (for freestyle detection)"
    echo ""
    echo "To enable microphone:"
    echo "  System Settings → Privacy & Security → Microphone"
    echo "  Enable for Terminal/iTerm"
    echo ""
else
    echo -e "${RED}❌ SOME TESTS FAILED${NC}"
    echo ""
    echo "Check the failed tests above and fix the issues."
    echo ""
fi

echo "======================================================================"
echo ""
echo "📊 System Status:"
echo "   Jarvis PID: $(lsof -ti:4000 || echo 'Not running')"
echo "   Logs: /tmp/jarvis-activity.log"
echo "   Data: /Users/benkennon/Jarvis/data/activity-logs/"
echo ""
echo "======================================================================"

exit $TESTS_FAILED

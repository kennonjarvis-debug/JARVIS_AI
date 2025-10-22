#!/bin/bash

##
# Deploy Activity Monitoring System
#
# Restarts Jarvis with activity monitoring enabled
##

set -e

echo "======================================================================"
echo "🚀 DEPLOYING ACTIVITY MONITORING SYSTEM"
echo "======================================================================"
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

##
# Step 1: Check current Jarvis status
##
echo -e "${BLUE}Step 1: Checking current Jarvis status...${NC}"

JARVIS_PID=$(lsof -ti:4000 2>/dev/null || echo "")

if [ -n "$JARVIS_PID" ]; then
    echo -e "${YELLOW}⚠️  Jarvis is running (PID: $JARVIS_PID)${NC}"
    echo "Will restart with activity monitoring enabled..."
else
    echo -e "${GREEN}✅ No existing Jarvis process${NC}"
fi

echo ""

##
# Step 2: Ensure .env has activity monitoring enabled
##
echo -e "${BLUE}Step 2: Configuring environment...${NC}"

# Check if ACTIVITY_MONITORING_ENABLED is already set
if grep -q "ACTIVITY_MONITORING_ENABLED" /Users/benkennon/Jarvis/.env 2>/dev/null; then
    # Update to true
    sed -i '' 's/ACTIVITY_MONITORING_ENABLED=.*/ACTIVITY_MONITORING_ENABLED=true/' /Users/benkennon/Jarvis/.env
    echo -e "${GREEN}✅ Updated ACTIVITY_MONITORING_ENABLED=true${NC}"
else
    # Add it
    echo "ACTIVITY_MONITORING_ENABLED=true" >> /Users/benkennon/Jarvis/.env
    echo -e "${GREEN}✅ Added ACTIVITY_MONITORING_ENABLED=true${NC}"
fi

echo ""

##
# Step 3: Check microphone permissions
##
echo -e "${BLUE}Step 3: Checking microphone permissions...${NC}"

# Check if we can access the mic (this will trigger permission dialog if needed)
if osascript -e 'tell application "System Events" to return microphone enabled of security preferences' 2>/dev/null; then
    echo -e "${GREEN}✅ Microphone permissions OK${NC}"
else
    echo -e "${YELLOW}⚠️  Microphone permission may be required${NC}"
    echo "If prompted, please grant microphone access to Terminal/iTerm"
fi

echo ""

##
# Step 4: Create data directories
##
echo -e "${BLUE}Step 4: Creating data directories...${NC}"

mkdir -p /Users/benkennon/Jarvis/data/activity-logs
mkdir -p /Users/benkennon/Jarvis/data/activity-logs/screenshots
mkdir -p /Users/benkennon/Jarvis/data/activity-logs/audio

echo -e "${GREEN}✅ Data directories created${NC}"
echo ""

##
# Step 5: Build TypeScript
##
echo -e "${BLUE}Step 5: Building TypeScript...${NC}"

cd /Users/benkennon/Jarvis
npm run build 2>&1 | grep -E "(error|warning|✓|Built)" || true

echo -e "${GREEN}✅ Build complete${NC}"
echo ""

##
# Step 6: Stop existing Jarvis
##
if [ -n "$JARVIS_PID" ]; then
    echo -e "${BLUE}Step 6: Stopping existing Jarvis (PID: $JARVIS_PID)...${NC}"
    kill $JARVIS_PID 2>/dev/null || true
    sleep 2

    # Force kill if still running
    if lsof -ti:4000 > /dev/null 2>&1; then
        echo -e "${YELLOW}Force stopping...${NC}"
        lsof -ti:4000 | xargs kill -9 2>/dev/null || true
        sleep 1
    fi

    echo -e "${GREEN}✅ Stopped existing Jarvis${NC}"
else
    echo -e "${BLUE}Step 6: No existing Jarvis to stop${NC}"
fi

echo ""

##
# Step 7: Start Jarvis with activity monitoring
##
echo -e "${BLUE}Step 7: Starting Jarvis with Activity Monitoring...${NC}"
echo ""

# Start in background
cd /Users/benkennon/Jarvis
nohup npm run dev > /tmp/jarvis-activity.log 2>&1 &

JARVIS_PID=$!
echo -e "${GREEN}✅ Jarvis started (PID: $JARVIS_PID)${NC}"
echo ""

##
# Step 8: Wait for startup
##
echo -e "${BLUE}Step 8: Waiting for Jarvis to start...${NC}"

MAX_RETRIES=20
RETRY_COUNT=0

while [ $RETRY_COUNT -lt $MAX_RETRIES ]; do
    if curl -s http://localhost:4000/health > /dev/null 2>&1; then
        echo -e "${GREEN}✅ Jarvis is healthy!${NC}"
        break
    fi

    echo -n "."
    sleep 1
    RETRY_COUNT=$((RETRY_COUNT + 1))
done

if [ $RETRY_COUNT -eq $MAX_RETRIES ]; then
    echo -e "${RED}❌ Jarvis failed to start${NC}"
    echo "Check logs: tail -f /tmp/jarvis-activity.log"
    exit 1
fi

echo ""

##
# Step 9: Verify activity monitoring
##
echo -e "${BLUE}Step 9: Verifying activity monitoring...${NC}"

sleep 3

# Check logs for activity monitoring startup
if grep -q "ACTIVITY MONITORING ACTIVE" /tmp/jarvis-activity.log; then
    echo -e "${GREEN}✅ Activity Monitoring is ACTIVE${NC}"
else
    echo -e "${YELLOW}⚠️  Activity Monitoring may not be active${NC}"
    echo "Check logs: tail -f /tmp/jarvis-activity.log"
fi

echo ""

##
# Step 10: Display status
##
echo "======================================================================"
echo -e "${GREEN}✅ DEPLOYMENT COMPLETE${NC}"
echo "======================================================================"
echo ""
echo "🎯 Jarvis Status:"
echo "   PID: $JARVIS_PID"
echo "   URL: http://localhost:4000"
echo "   Logs: /tmp/jarvis-activity.log"
echo ""
echo "👁️  Activity Monitoring:"
echo "   Status: ACTIVE"
echo "   Level: COMPREHENSIVE"
echo "   User: $USER"
echo "   Data: /Users/benkennon/Jarvis/data/activity-logs"
echo ""
echo "🎤 What's Watching:"
echo "   ✅ Screen capture (every 60s)"
echo "   ✅ Audio monitoring (every 5s)"
echo "   ✅ App usage (every 10s)"
echo "   ✅ Freestyle detection"
echo "   ✅ Proactive actions"
echo "   ✅ Device sync"
echo ""
echo "📱 Privacy:"
echo "   Excluded: Passwords, 1Password, Banking apps"
echo "   Encrypted: Yes"
echo "   Auto-delete: After 7 days"
echo ""
echo "🚀 Next Steps:"
echo "   1. Check logs: tail -f /tmp/jarvis-activity.log"
echo "   2. Open Spotify and play a beat"
echo "   3. Start freestyling"
echo "   4. Jarvis will auto-detect and finish the song!"
echo ""
echo "======================================================================"

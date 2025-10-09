#!/bin/bash
# Instance Activity Monitor
# Tracks git activity, logs, and progress across all Claude instances

MONITOR_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
JARVIS_ROOT="$(dirname "$MONITOR_DIR")"
AI_DAWG_ROOT="/Users/benkennon/ai-dawg-v0.1"
TRACKER_FILE="$MONITOR_DIR/instance-tracker.json"
DASHBOARD_FILE="$MONITOR_DIR/DASHBOARD.md"
LOG_FILE="$MONITOR_DIR/monitor.log"

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

log() {
    echo "[$(date +'%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

log_color() {
    echo -e "${2}[$(date +'%Y-%m-%d %H:%M:%S')] $1${NC}" | tee -a "$LOG_FILE"
}

# Monitor git activity
check_git_activity() {
    log_color "🔍 Checking git activity..." "$BLUE"

    # Check Jarvis repo
    cd "$JARVIS_ROOT"
    echo -e "${GREEN}━━━ Jarvis Repository ━━━${NC}"
    git log --all --since="1 hour ago" --pretty=format:"%C(yellow)%h%C(reset) %C(blue)%ai%C(reset) %C(green)%an%C(reset) %s" --branches="*instance*"
    echo ""

    # Check AI DAWG repo
    if [ -d "$AI_DAWG_ROOT" ]; then
        cd "$AI_DAWG_ROOT"
        echo -e "${GREEN}━━━ AI DAWG Repository ━━━${NC}"
        git log --all --since="1 hour ago" --pretty=format:"%C(yellow)%h%C(reset) %C(blue)%ai%C(reset) %C(green)%an%C(reset) %s" --branches="*instance*"
        echo ""
    fi
}

# Check active branches
check_branches() {
    log_color "🌿 Checking instance branches..." "$BLUE"

    cd "$JARVIS_ROOT"
    echo -e "${GREEN}━━━ Jarvis Branches ━━━${NC}"
    git branch -a | grep -E "instance-[0-9]" || echo "No instance branches found"

    if [ -d "$AI_DAWG_ROOT" ]; then
        cd "$AI_DAWG_ROOT"
        echo -e "${GREEN}━━━ AI DAWG Branches ━━━${NC}"
        git branch -a | grep -E "instance-[0-9]" || echo "No instance branches found"
    fi
}

# Check service health
check_services() {
    log_color "🏥 Checking service health..." "$BLUE"

    # Check Jarvis Control Plane
    echo -e "${GREEN}━━━ Jarvis Control Plane ━━━${NC}"
    curl -s http://localhost:4000/health 2>/dev/null && echo "" || echo -e "${RED}❌ Control Plane offline${NC}"

    # Check AI DAWG
    echo -e "${GREEN}━━━ AI DAWG Backend ━━━${NC}"
    curl -s http://localhost:3001/api/v1/jarvis/desktop/health 2>/dev/null && echo "" || echo -e "${RED}❌ AI DAWG offline${NC}"
}

# Monitor logs
tail_logs() {
    log_color "📋 Recent activity from logs..." "$BLUE"

    if [ -f "$JARVIS_ROOT/logs/combined.log" ]; then
        echo -e "${GREEN}━━━ Last 10 log entries ━━━${NC}"
        tail -10 "$JARVIS_ROOT/logs/combined.log"
    fi
}

# Calculate metrics
calculate_metrics() {
    log_color "📊 Calculating metrics..." "$BLUE"

    # Extract from JSON using basic tools
    if [ -f "$TRACKER_FILE" ]; then
        echo -e "${GREEN}━━━ Current Metrics ━━━${NC}"
        grep -A 5 '"metrics"' "$TRACKER_FILE" | grep -E "(total_|efficiency|tasks_|blockers)"
    fi
}

# Display dashboard
show_dashboard() {
    if [ -f "$DASHBOARD_FILE" ]; then
        cat "$DASHBOARD_FILE"
    fi
}

# Main monitoring loop
monitor_loop() {
    clear
    log_color "🎯 INSTANCE MONITOR - Started" "$GREEN"
    log_color "Press Ctrl+C to stop" "$YELLOW"
    echo ""

    while true; do
        clear
        echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
        echo -e "${BLUE}║        JARVIS & AI DAWG - INSTANCE MONITOR v1.0           ║${NC}"
        echo -e "${BLUE}║                 $(date +'%Y-%m-%d %H:%M:%S')                       ║${NC}"
        echo -e "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}"
        echo ""

        check_branches
        echo ""
        check_git_activity
        echo ""
        check_services
        echo ""
        tail_logs
        echo ""
        calculate_metrics
        echo ""

        echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
        echo -e "${BLUE}Refreshing in 30 seconds... (Ctrl+C to stop)${NC}"

        sleep 30
    done
}

# CLI Interface
case "${1:-}" in
    "loop")
        monitor_loop
        ;;
    "once")
        check_branches
        echo ""
        check_git_activity
        echo ""
        check_services
        echo ""
        tail_logs
        echo ""
        calculate_metrics
        ;;
    "dashboard")
        show_dashboard
        ;;
    "git")
        check_git_activity
        ;;
    "health")
        check_services
        ;;
    *)
        echo "Usage: $0 {loop|once|dashboard|git|health}"
        echo ""
        echo "Commands:"
        echo "  loop       - Continuous monitoring (refreshes every 30s)"
        echo "  once       - Single snapshot of current status"
        echo "  dashboard  - Display the markdown dashboard"
        echo "  git        - Check git activity only"
        echo "  health     - Check service health only"
        exit 1
        ;;
esac

#!/bin/bash
# Auto-updating watch script
# Runs update-tracker every 5 minutes and optionally displays dashboard

MONITOR_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

echo "🎯 Starting auto-update watcher..."
echo "Updates every 5 minutes. Press Ctrl+C to stop."
echo ""

while true; do
    echo "[$(date +'%Y-%m-%d %H:%M:%S')] Running update..."
    node "$MONITOR_DIR/update-tracker.mjs"

    if [ "${1:-}" = "show" ]; then
        clear
        cat "$MONITOR_DIR/DASHBOARD.md"
    fi

    echo ""
    echo "Next update in 5 minutes..."
    sleep 300
done

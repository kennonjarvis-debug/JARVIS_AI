#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/../.." && pwd)"
LOG_DIR="$ROOT_DIR/logs"
mkdir -p "$LOG_DIR"
NIGHTLY_LOG="$LOG_DIR/nightly.log"
EVOLVE_LOG="$LOG_DIR/evolve.log"
SHORTCUT_LOG="$LOG_DIR/shortcut_update.log"

echo "[$(date -u +%FT%TZ)] Nightly: start" | tee -a "$NIGHTLY_LOG"

# 1) Run evolve if available
if [ -f "$ROOT_DIR/scripts/self-adapt/jarvis-evolve.js" ]; then
  node "$ROOT_DIR/scripts/self-adapt/jarvis-evolve.js" >> "$EVOLVE_LOG" 2>&1 || true
else
  echo "⚠️ Jarvis evolve script not found." | tee -a "$NIGHTLY_LOG"
fi

# 2) Regenerate Shortcut
pushd "$ROOT_DIR/web/jarvis-web" >/dev/null
export NEXT_PUBLIC_JARVIS_API_URL="${NEXT_PUBLIC_JARVIS_API_URL:-https://jarvis-ai-backend.onrender.com/api/ask}"
node scripts/shortcuts/auto-update-shortcut.js >> "$SHORTCUT_LOG" 2>&1 || true
popd >/dev/null

# 3) Notify (optional via Slack webhook)
if [ -n "${SLACK_WEBHOOK_URL:-}" ]; then
  curl -s -X POST -H 'Content-type: application/json' --data "{\"text\":\"🧠 Jarvis evolved and Siri Shortcut refreshed successfully.\"}" "$SLACK_WEBHOOK_URL" >/dev/null || true
fi

echo "[$(date -u +%FT%TZ)] Nightly: done" | tee -a "$NIGHTLY_LOG"

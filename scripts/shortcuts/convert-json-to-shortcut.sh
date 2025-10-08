#!/usr/bin/env bash
set -euo pipefail

# Convert a Shortcuts JSON export to a signed Apple .shortcut file.
#
# Usage:
#   scripts/shortcuts/convert-json-to-shortcut.sh /path/to/Jarvis.shortcut.json web/jarvis-web/public/Jarvis.shortcut
#
# Requirements:
# - macOS with `plutil` and `shortcuts` CLI available (macOS 14+)

if [[ $# -lt 2 ]]; then
  echo "Usage: $0 <input_json> <output_shortcut>" >&2
  exit 1
fi

INPUT_JSON="$1"
OUTPUT_SHORTCUT="$2"

if [[ ! -f "$INPUT_JSON" ]]; then
  echo "Input JSON not found: $INPUT_JSON" >&2
  exit 1
fi

OUT_DIR="$(dirname "$OUTPUT_SHORTCUT")"
mkdir -p "$OUT_DIR"

TMP_UNSIGNED="${OUTPUT_SHORTCUT}.unsigned"

echo "Converting JSON -> binary .shortcut (unsigned)…"
plutil -convert binary1 -o "$TMP_UNSIGNED" "$INPUT_JSON"

echo "Signing .shortcut for distribution…"
shortcuts sign --input "$TMP_UNSIGNED" --output "$OUTPUT_SHORTCUT"

rm -f "$TMP_UNSIGNED"

echo "Done: $OUTPUT_SHORTCUT"


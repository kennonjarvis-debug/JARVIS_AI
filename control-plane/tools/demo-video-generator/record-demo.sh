#!/bin/bash

# Playwright Demo Video Recorder Helper Script
# Usage: ./record-demo.sh [test|jarvis|aidawg|form]

cd ~/Jarvis

echo "=========================================="
echo "Playwright Demo Video Recorder"
echo "=========================================="
echo ""

if [ -z "$1" ]; then
  echo "Usage: ./record-demo.sh [test|jarvis|aidawg|form]"
  echo ""
  echo "Options:"
  echo "  test    - Record a simple 5-second test video"
  echo "  jarvis  - Record Jarvis dashboard demo (localhost:3100)"
  echo "  aidawg  - Record AI DAWG chat demo (localhost:5173)"
  echo "  form    - Record form interaction demo"
  echo ""
  exit 1
fi

case "$1" in
  test)
    echo "Recording test video..."
    npx tsx tools/demo-video-generator/quick-test.ts
    ;;
  jarvis|aidawg|form)
    echo "Recording $1 demo..."
    npx tsx tools/demo-video-generator/example-usage.ts "$1"
    ;;
  *)
    echo "Unknown option: $1"
    echo "Valid options: test, jarvis, aidawg, form"
    exit 1
    ;;
esac

echo ""
echo "=========================================="
echo "Recording complete!"
echo "Check the recordings/ directory for output"
echo "=========================================="

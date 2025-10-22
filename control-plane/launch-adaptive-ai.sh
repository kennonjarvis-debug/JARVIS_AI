#!/bin/bash

# Launch Adaptive AI Service
# Port: 8003

echo "🧠 Starting Jarvis Adaptive AI Service..."
echo "Port: 8003"
echo ""

cd "$(dirname "$0")/python"
source venv/bin/activate
PORT=8003 python3 adaptive_ai_service.py

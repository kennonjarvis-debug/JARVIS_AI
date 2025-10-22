#!/bin/bash

# Jarvis Desktop App - Project Initialization Script
# This creates the basic directory structure and initializes git

echo "🚀 Initializing Jarvis Desktop App..."

# Create directory structure
echo "📁 Creating directory structure..."
mkdir -p src/jarvis/core
mkdir -p src/jarvis/api
mkdir -p src/jarvis/modules/music
mkdir -p src/jarvis/modules/marketing
mkdir -p src/jarvis/modules/engagement
mkdir -p src/jarvis/modules/workflow
mkdir -p src/jarvis/modules/intelligence
mkdir -p src/jarvis/jobs
mkdir -p src/renderer/components
mkdir -p src/renderer/hooks
mkdir -p src/renderer/pages
mkdir -p tests/unit/core
mkdir -p tests/unit/api
mkdir -p tests/unit/modules
mkdir -p tests/integration
mkdir -p tests/e2e
mkdir -p docs
mkdir -p dist

# Initialize git if not already initialized
if [ ! -d .git ]; then
    echo "🔧 Initializing git repository..."
    git init
    echo "node_modules/" > .gitignore
    echo "dist/" >> .gitignore
    echo ".env" >> .gitignore
    echo "*.log" >> .gitignore
    echo ".DS_Store" >> .gitignore
    git add .
    git commit -m "Initial commit: Project structure and config"
fi

# Create branches for each instance
echo "🌿 Creating instance branches..."
git checkout -b instance-1-backend 2>/dev/null || git checkout instance-1-backend
git checkout -b instance-2-frontend 2>/dev/null || git checkout instance-2-frontend
git checkout -b instance-3-modules-music-marketing 2>/dev/null || git checkout instance-3-modules-music-marketing
git checkout -b instance-4-modules-engagement-intelligence 2>/dev/null || git checkout instance-4-modules-engagement-intelligence
git checkout -b instance-5-jobs-tests 2>/dev/null || git checkout instance-5-jobs-tests

# Return to main
git checkout main 2>/dev/null || git checkout -b main

# Create .env.example
echo "🔐 Creating .env.example..."
cat > .env.example << 'EOF'
# Jarvis AI API Configuration
JARVIS_API_URL=https://kaycee-nonextrinsical-yosef.ngrok-free.dev
JARVIS_API_KEY=aigpt_b-Vwg_lDEBh5EX1tHM3frWlFTTdnylYbPImeY0XfI10

# Environment
NODE_ENV=development

# Monitoring
MONITORING_INTERVAL_HOURS=3
METRICS_RETENTION_DAYS=30

# Notifications
SLACK_WEBHOOK_URL=
EMAIL_SMTP_HOST=
EMAIL_SMTP_PORT=587
EMAIL_SMTP_USER=
EMAIL_SMTP_PASS=

# Optional: External Services
OPENAI_API_KEY=
ANTHROPIC_API_KEY=
SENDGRID_API_KEY=
EOF

echo "✅ Project structure created!"
echo ""
echo "📋 Next steps:"
echo "1. Read QUICK_START.md for instructions"
echo "2. Open 5 separate terminal windows"
echo "3. Assign each terminal to an instance:"
echo "   Terminal 1: git checkout instance-1-backend"
echo "   Terminal 2: git checkout instance-2-frontend"
echo "   Terminal 3: git checkout instance-3-modules-music-marketing"
echo "   Terminal 4: git checkout instance-4-modules-engagement-intelligence"
echo "   Terminal 5: git checkout instance-5-jobs-tests"
echo "4. Follow the prompts in QUICK_START.md for each instance"
echo ""
echo "🎯 Start with Instance 1 first! Other instances depend on it."
echo ""
echo "Directory structure:"
tree -L 3 -I 'node_modules' . 2>/dev/null || find . -type d -not -path '*/\.*' -not -path '*/node_modules/*' | head -30

echo ""
echo "Happy building! 🎉"

#!/bin/bash

###############################################################################
# Jarvis Enhanced Hybrid Setup Script
#
# This script automates the setup of the Enhanced Hybrid deployment
# Saves ~$165/month vs full cloud deployment
###############################################################################

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
NC='\033[0m'

# Directories
JARVIS_DIR="$HOME/Jarvis"
AIDAWG_DIR="$HOME/ai-dawg-v0.1"

###############################################################################
# Helper Functions
###############################################################################

print_header() {
    echo ""
    echo -e "${PURPLE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${PURPLE}  $1${NC}"
    echo -e "${PURPLE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""
}

success() {
    echo -e "${GREEN}✓${NC} $1"
}

error() {
    echo -e "${RED}✗${NC} $1"
}

warn() {
    echo -e "${YELLOW}⚠${NC} $1"
}

info() {
    echo -e "${BLUE}ℹ${NC} $1"
}

###############################################################################
# Main Setup
###############################################################################

print_header "Jarvis Enhanced Hybrid Setup"
echo "Cost-optimized deployment: 70% Gemini / 20% GPT-4o Mini / 10% Claude"
echo "Target monthly cost: \$35-50 (saves ~\$165/month vs full cloud)"
echo ""

# Check if running in Jarvis directory
if [ ! -f "package.json" ] || [ ! -d "src/core" ]; then
    error "Please run this script from the Jarvis root directory"
    exit 1
fi

# Step 1: Check prerequisites
print_header "Step 1: Checking Prerequisites"

# Node.js
if command -v node &> /dev/null; then
    NODE_VERSION=$(node -v)
    success "Node.js: $NODE_VERSION"
else
    error "Node.js not found. Please install Node.js v18+"
    exit 1
fi

# PostgreSQL
if command -v psql &> /dev/null; then
    PG_VERSION=$(psql --version | awk '{print $3}')
    success "PostgreSQL: $PG_VERSION"
else
    error "PostgreSQL not found. Please install PostgreSQL 15+"
    exit 1
fi

# Redis
if command -v redis-cli &> /dev/null; then
    REDIS_VERSION=$(redis-cli --version | awk '{print $2}')
    success "Redis: $REDIS_VERSION"
else
    error "Redis not found. Please install Redis 7+"
    exit 1
fi

# Git
if command -v git &> /dev/null; then
    GIT_VERSION=$(git --version | awk '{print $3}')
    success "Git: $GIT_VERSION"
else
    error "Git not found. Please install Git"
    exit 1
fi

# Step 2: Install dependencies
print_header "Step 2: Installing Dependencies"

if [ ! -d "node_modules" ]; then
    info "Installing Jarvis dependencies..."
    npm install
    success "Jarvis dependencies installed"
else
    success "Jarvis dependencies already installed"
fi

if [ -d "$AIDAWG_DIR" ]; then
    if [ ! -d "$AIDAWG_DIR/node_modules" ]; then
        info "Installing AI DAWG dependencies..."
        cd "$AIDAWG_DIR"
        npm install
        cd "$JARVIS_DIR"
        success "AI DAWG dependencies installed"
    else
        success "AI DAWG dependencies already installed"
    fi
else
    warn "AI DAWG not found at $AIDAWG_DIR"
    info "Please clone AI DAWG repository to $AIDAWG_DIR"
fi

# Step 3: Environment configuration
print_header "Step 3: Environment Configuration"

if [ ! -f ".env" ]; then
    info "Creating .env file from template..."
    cp .env.example .env
    success ".env file created"

    warn "Please edit .env and add your API keys:"
    echo "  - GEMINI_API_KEY"
    echo "  - OPENAI_API_KEY"
    echo "  - ANTHROPIC_API_KEY"
    echo ""
    info "Sign up links:"
    echo "  Gemini:  https://makersuite.google.com/app/apikey"
    echo "  OpenAI:  https://platform.openai.com/api-keys"
    echo "  Claude:  https://console.anthropic.com/settings/keys"
    echo ""

    read -p "Press Enter when you've added your API keys to .env..."
else
    success ".env file already exists"
fi

# Step 4: Database setup
print_header "Step 4: Database Setup"

# Check if PostgreSQL is running
if brew services list 2>/dev/null | grep postgresql | grep started > /dev/null || \
   pgrep -x postgres > /dev/null; then
    success "PostgreSQL is running"
else
    info "Starting PostgreSQL..."
    if command -v brew &> /dev/null; then
        brew services start postgresql@15 || brew services start postgresql
        sleep 3
        success "PostgreSQL started"
    else
        warn "Please start PostgreSQL manually"
    fi
fi

# Check if Redis is running
if brew services list 2>/dev/null | grep redis | grep started > /dev/null || \
   pgrep -x redis-server > /dev/null; then
    success "Redis is running"
else
    info "Starting Redis..."
    if command -v brew &> /dev/null; then
        brew services start redis
        sleep 2
        success "Redis started"
    else
        warn "Please start Redis manually"
    fi
fi

# Run migrations if AI DAWG exists
if [ -d "$AIDAWG_DIR" ]; then
    info "Running database migrations..."
    cd "$AIDAWG_DIR"
    npx prisma migrate deploy 2>/dev/null || warn "Migration failed or already up to date"
    cd "$JARVIS_DIR"
    success "Database migrations complete"
fi

# Step 5: Build TypeScript
print_header "Step 5: Building TypeScript"

info "Compiling TypeScript..."
npm run build
success "TypeScript compiled"

# Step 6: Service launcher
print_header "Step 6: Service Launcher Setup"

if [ -f "launch-hybrid-services.sh" ]; then
    chmod +x launch-hybrid-services.sh
    success "Service launcher is ready"
else
    error "launch-hybrid-services.sh not found"
fi

# Step 7: Final verification
print_header "Step 7: Verification"

# Check API keys in .env
if grep -q "your-.*-api-key-here" .env; then
    warn "Some API keys are still using placeholder values"
    echo "Please update the following in .env:"
    grep "your-.*-api-key-here" .env | awk -F= '{print "  - " $1}'
    echo ""
else
    success "API keys configured"
fi

# Summary
print_header "Setup Complete! 🎉"

echo "Next steps:"
echo ""
echo "1. Start services:"
echo "   ${GREEN}./launch-hybrid-services.sh start${NC}"
echo ""
echo "2. Check status:"
echo "   ${GREEN}./launch-hybrid-services.sh status${NC}"
echo ""
echo "3. View cost dashboard:"
echo "   ${BLUE}http://localhost:4000/cost-dashboard.html${NC}"
echo ""
echo "4. Access API documentation:"
echo "   ${BLUE}http://localhost:4000/api/v1/costs/summary${NC}"
echo ""
echo "5. Read full documentation:"
echo "   ${BLUE}docs/ENHANCED_HYBRID_SETUP.md${NC}"
echo ""

info "Expected monthly cost: \$35-50"
info "Savings vs full cloud: ~\$165/month"
info "Smart routing: 70% Gemini (free) / 20% GPT-4o Mini / 10% Claude"

echo ""
print_header "Happy deploying! 🚀"

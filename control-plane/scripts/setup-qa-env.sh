#!/bin/bash
###############################################################################
# Jarvis v2 QA Environment Setup
# Creates isolated test databases and resources for distributed testing
###############################################################################

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
POSTGRES_USER="${POSTGRES_USER:-benkennon}"
POSTGRES_HOST="${POSTGRES_HOST:-localhost}"
POSTGRES_PORT="${POSTGRES_PORT:-5432}"
REDIS_HOST="${REDIS_HOST:-localhost}"
REDIS_PORT="${REDIS_PORT:-6379}"

echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}  Jarvis v2 QA Environment Setup${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
echo ""

# Function to print status
print_status() {
    echo -e "${GREEN}✓${NC} $1"
}

print_error() {
    echo -e "${RED}✗${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

# 1. Create QA directories
echo -e "${BLUE}[1/6] Creating QA directories...${NC}"
mkdir -p /Users/benkennon/Jarvis/.qa-logs/claude-a
mkdir -p /Users/benkennon/Jarvis/.qa-logs/claude-b
mkdir -p /Users/benkennon/Jarvis/.qa-logs/claude-c
mkdir -p /Users/benkennon/Jarvis/.qa-logs/claude-d
mkdir -p /Users/benkennon/Jarvis/.qa-logs/claude-e
mkdir -p /Users/benkennon/Jarvis/.qa-logs/claude-f
mkdir -p /Users/benkennon/Jarvis/.qa-locks
mkdir -p /Users/benkennon/Jarvis/.qa-data
mkdir -p /Users/benkennon/Jarvis/docs
print_status "QA directories created"

# 2. Create test databases
echo -e "${BLUE}[2/6] Creating test databases...${NC}"

create_database() {
    local db_name=$1
    local schema_name=$2

    # Drop database if exists
    psql -U "$POSTGRES_USER" -h "$POSTGRES_HOST" -p "$POSTGRES_PORT" -c "DROP DATABASE IF EXISTS $db_name;" 2>/dev/null || true

    # Create database
    psql -U "$POSTGRES_USER" -h "$POSTGRES_HOST" -p "$POSTGRES_PORT" -c "CREATE DATABASE $db_name;" 2>/dev/null || {
        print_warning "Database $db_name might already exist or creation failed"
    }

    # Create schema
    psql -U "$POSTGRES_USER" -h "$POSTGRES_HOST" -p "$POSTGRES_PORT" -d "$db_name" -c "CREATE SCHEMA IF NOT EXISTS $schema_name;" 2>/dev/null || true

    print_status "Database: $db_name (schema: $schema_name)"
}

create_database "jarvis_test_security" "security_qa"
create_database "jarvis_test_agents" "agents_qa"
create_database "jarvis_test_memory" "memory_qa"
create_database "jarvis_test_analytics" "analytics_qa"
create_database "jarvis_test_ai" "ai_qa"
create_database "jarvis_test_audio" "audio_qa"

# 3. Setup Redis databases
echo -e "${BLUE}[3/6] Verifying Redis databases...${NC}"

verify_redis() {
    local db_num=$1
    redis-cli -h "$REDIS_HOST" -p "$REDIS_PORT" -n "$db_num" PING > /dev/null 2>&1 && {
        print_status "Redis DB $db_num accessible"
    } || {
        print_warning "Redis DB $db_num not accessible"
    }
}

verify_redis 1
verify_redis 2
verify_redis 3
verify_redis 4
verify_redis 5
verify_redis 6

# 4. Initialize TypeScript lock system
echo -e "${BLUE}[4/6] Compiling TypeScript lock system...${NC}"
cd /Users/benkennon/Jarvis
if [ -f "scripts/qa-lock.ts" ]; then
    chmod +x scripts/qa-lock.ts
    chmod +x scripts/qa-progress-writer.ts
    print_status "Lock system ready"
else
    print_warning "Lock system TypeScript files not found"
fi

# 5. Initialize progress log
echo -e "${BLUE}[5/6] Initializing progress tracking...${NC}"
if [ -f "scripts/qa-progress-writer.ts" ]; then
    npx ts-node scripts/qa-progress-writer.ts init 2>/dev/null || print_warning "Could not initialize progress log"
    print_status "Progress tracking initialized"
else
    # Fallback: create basic log file
    cat > /Users/benkennon/Jarvis/docs/QA_PROGRESS.log << 'EOF'
═══════════════════════════════════════════════════════════════
  Jarvis v2 QA Testing Progress Log
  Distributed Testing Across Multiple Claude Instances
  Initialized: $(date -u +"%Y-%m-%dT%H:%M:%SZ")
═══════════════════════════════════════════════════════════════

EOF
    print_status "Basic progress log created"
fi

# 6. Verify port availability
echo -e "${BLUE}[6/6] Checking port availability...${NC}"

check_port() {
    local port=$1
    local instance=$2
    lsof -i:$port > /dev/null 2>&1 && {
        print_warning "Port $port ($instance) already in use"
    } || {
        print_status "Port $port ($instance) available"
    }
}

# Check API ports
check_port 5000 "Claude A - API"
check_port 5100 "Claude B - API"
check_port 5200 "Claude C - API"
check_port 5300 "Claude D - API"
check_port 5400 "Claude E - API"
check_port 5500 "Claude F - API"

# Check WebSocket ports
check_port 6000 "Claude A - WebSocket"
check_port 6100 "Claude B - WebSocket"
check_port 6200 "Claude C - WebSocket"
check_port 6300 "Claude D - WebSocket"
check_port 6400 "Claude E - WebSocket"
check_port 6500 "Claude F - WebSocket"

# Summary
echo ""
echo -e "${GREEN}═══════════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}  QA Environment Setup Complete${NC}"
echo -e "${GREEN}═══════════════════════════════════════════════════════════════${NC}"
echo ""
echo "Test Databases Created:"
echo "  • jarvis_test_security (Claude A)"
echo "  • jarvis_test_agents (Claude B)"
echo "  • jarvis_test_memory (Claude C)"
echo "  • jarvis_test_analytics (Claude D)"
echo "  • jarvis_test_ai (Claude E)"
echo "  • jarvis_test_audio (Claude F)"
echo ""
echo "Redis Databases:"
echo "  • DB 1-6 (One per Claude instance)"
echo ""
echo "Port Ranges:"
echo "  • API: 5000-5500 (100/instance)"
echo "  • WebSocket: 6000-6500 (100/instance)"
echo "  • Dashboard: 7000-7500 (100/instance)"
echo "  • Metrics: 8000-8500 (100/instance)"
echo ""
echo "Lock System: /Users/benkennon/Jarvis/.qa-locks"
echo "Progress Log: /Users/benkennon/Jarvis/docs/QA_PROGRESS.log"
echo ""
echo -e "${BLUE}Next Steps:${NC}"
echo "  1. Review config/qa-isolation.yml"
echo "  2. Create QA branches for each test domain"
echo "  3. Start distributed QA testing"
echo ""

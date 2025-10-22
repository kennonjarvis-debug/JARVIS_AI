#!/bin/bash

# Health Check Script for Jarvis AI Platform
# Comprehensive health check for load balancer routing
# Returns HTTP 200 for healthy, 503 for unhealthy

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

# Configuration
HEALTH_CHECK_PORT="${PORT:-3000}"
REDIS_HOST="${REDIS_HOST:-localhost}"
REDIS_PORT="${REDIS_PORT:-6379}"
POSTGRES_HOST="${POSTGRES_HOST:-localhost}"
POSTGRES_PORT="${POSTGRES_PORT:-5432}"
POSTGRES_USER="${POSTGRES_USER:-jarvis}"
POSTGRES_DB="${POSTGRES_DB:-jarvis}"

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Exit codes
EXIT_OK=0
EXIT_WARN=1
EXIT_CRITICAL=2

# Metrics
TOTAL_CHECKS=0
FAILED_CHECKS=0
WARNINGS=0

# Logging function
log() {
    echo "[$(date +'%Y-%m-%d %H:%M:%S')] $1"
}

error() {
    echo -e "${RED}[ERROR] $1${NC}" >&2
    FAILED_CHECKS=$((FAILED_CHECKS + 1))
}

warn() {
    echo -e "${YELLOW}[WARN] $1${NC}"
    WARNINGS=$((WARNINGS + 1))
}

success() {
    echo -e "${GREEN}[OK] $1${NC}"
}

# Check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Check Redis connection
check_redis() {
    TOTAL_CHECKS=$((TOTAL_CHECKS + 1))
    log "Checking Redis connection..."

    if ! command_exists redis-cli; then
        warn "redis-cli not found, skipping Redis check"
        return 0
    fi

    if timeout 3 redis-cli -h "$REDIS_HOST" -p "$REDIS_PORT" ping > /dev/null 2>&1; then
        success "Redis is responsive"
        return 0
    else
        error "Redis is not responsive at ${REDIS_HOST}:${REDIS_PORT}"
        return 1
    fi
}

# Check PostgreSQL connection
check_postgres() {
    TOTAL_CHECKS=$((TOTAL_CHECKS + 1))
    log "Checking PostgreSQL connection..."

    if ! command_exists psql; then
        warn "psql not found, skipping PostgreSQL check"
        return 0
    fi

    if timeout 3 psql -h "$POSTGRES_HOST" -p "$POSTGRES_PORT" -U "$POSTGRES_USER" -d "$POSTGRES_DB" -c "SELECT 1;" > /dev/null 2>&1; then
        success "PostgreSQL is responsive"
        return 0
    else
        error "PostgreSQL is not responsive at ${POSTGRES_HOST}:${POSTGRES_PORT}"
        return 1
    fi
}

# Check disk space
check_disk_space() {
    TOTAL_CHECKS=$((TOTAL_CHECKS + 1))
    log "Checking disk space..."

    local threshold=90
    local usage=$(df -h / | awk 'NR==2 {print $5}' | sed 's/%//')

    if [ "$usage" -lt "$threshold" ]; then
        success "Disk usage: ${usage}%"
        return 0
    else
        error "Disk usage too high: ${usage}% (threshold: ${threshold}%)"
        return 1
    fi
}

# Check memory usage
check_memory() {
    TOTAL_CHECKS=$((TOTAL_CHECKS + 1))
    log "Checking memory usage..."

    local threshold=90

    if [[ "$OSTYPE" == "darwin"* ]]; then
        # macOS
        local total=$(sysctl -n hw.memsize)
        local used=$(vm_stat | grep "Pages active" | awk '{print $3}' | sed 's/\.//')
        local usage=$((used * 100 / (total / 4096)))
    else
        # Linux
        local usage=$(free | grep Mem | awk '{print int($3/$2 * 100)}')
    fi

    if [ "$usage" -lt "$threshold" ]; then
        success "Memory usage: ${usage}%"
        return 0
    else
        warn "Memory usage high: ${usage}% (threshold: ${threshold}%)"
        return 0
    fi
}

# Check CPU load
check_cpu() {
    TOTAL_CHECKS=$((TOTAL_CHECKS + 1))
    log "Checking CPU load..."

    local threshold=4

    if [[ "$OSTYPE" == "darwin"* ]]; then
        # macOS
        local load=$(sysctl -n vm.loadavg | awk '{print $2}')
    else
        # Linux
        local load=$(cat /proc/loadavg | awk '{print $1}')
    fi

    local load_int=$(echo "$load" | awk '{print int($1)}')

    if [ "$load_int" -lt "$threshold" ]; then
        success "CPU load: ${load}"
        return 0
    else
        warn "CPU load high: ${load} (threshold: ${threshold})"
        return 0
    fi
}

# Check application endpoint
check_app_endpoint() {
    TOTAL_CHECKS=$((TOTAL_CHECKS + 1))
    log "Checking application endpoint..."

    if ! command_exists curl; then
        warn "curl not found, skipping app endpoint check"
        return 0
    fi

    local endpoint="http://localhost:${HEALTH_CHECK_PORT}/api/health"
    local response=$(timeout 5 curl -s -o /dev/null -w "%{http_code}" "$endpoint" 2>/dev/null || echo "000")

    if [ "$response" = "200" ]; then
        success "Application endpoint is healthy"
        return 0
    else
        error "Application endpoint returned: ${response}"
        return 1
    fi
}

# Check process is running
check_process() {
    TOTAL_CHECKS=$((TOTAL_CHECKS + 1))
    log "Checking if Node.js process is running..."

    if pgrep -f "node.*main.js" > /dev/null 2>&1 || pgrep -f "tsx.*main.ts" > /dev/null 2>&1; then
        success "Node.js process is running"
        return 0
    else
        error "Node.js process not found"
        return 1
    fi
}

# Check open file descriptors
check_file_descriptors() {
    TOTAL_CHECKS=$((TOTAL_CHECKS + 1))
    log "Checking file descriptors..."

    if [[ "$OSTYPE" == "darwin"* ]]; then
        warn "File descriptor check not available on macOS"
        return 0
    fi

    local threshold=80
    local max_fds=$(ulimit -n)
    local current_fds=$(lsof -p $$ 2>/dev/null | wc -l || echo "0")
    local usage=$((current_fds * 100 / max_fds))

    if [ "$usage" -lt "$threshold" ]; then
        success "File descriptors: ${current_fds}/${max_fds} (${usage}%)"
        return 0
    else
        warn "File descriptor usage high: ${usage}%"
        return 0
    fi
}

# Main health check
main() {
    log "=========================================="
    log "Jarvis Health Check"
    log "=========================================="

    # Run all checks
    check_process
    check_app_endpoint
    check_redis
    check_postgres
    check_disk_space
    check_memory
    check_cpu
    check_file_descriptors

    log "=========================================="
    log "Health Check Summary"
    log "=========================================="
    log "Total checks: ${TOTAL_CHECKS}"
    log "Failed: ${FAILED_CHECKS}"
    log "Warnings: ${WARNINGS}"

    # Determine exit code
    if [ "$FAILED_CHECKS" -gt 0 ]; then
        error "Health check FAILED"
        echo "UNHEALTHY"
        exit $EXIT_CRITICAL
    elif [ "$WARNINGS" -gt 2 ]; then
        warn "Health check DEGRADED"
        echo "DEGRADED"
        exit $EXIT_WARN
    else
        success "Health check PASSED"
        echo "HEALTHY"
        exit $EXIT_OK
    fi
}

# Handle command line arguments
case "${1:-check}" in
    check)
        main
        ;;
    json)
        # Output JSON for programmatic consumption
        main > /dev/null 2>&1
        exit_code=$?

        if [ $exit_code -eq 0 ]; then
            status="healthy"
        elif [ $exit_code -eq 1 ]; then
            status="degraded"
        else
            status="unhealthy"
        fi

        echo "{\"status\":\"$status\",\"timestamp\":\"$(date -u +%Y-%m-%dT%H:%M:%SZ)\",\"checks\":$TOTAL_CHECKS,\"failed\":$FAILED_CHECKS,\"warnings\":$WARNINGS}"
        exit $exit_code
        ;;
    *)
        echo "Usage: $0 {check|json}"
        echo ""
        echo "  check - Run health check with human-readable output"
        echo "  json  - Run health check with JSON output"
        exit 1
        ;;
esac

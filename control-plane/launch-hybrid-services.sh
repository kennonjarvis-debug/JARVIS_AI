#!/bin/bash

###############################################################################
# Jarvis Enhanced Hybrid Deployment - Local Services Launcher
#
# This script starts all required Jarvis services for 24/7 operation:
# - Jarvis Control Plane (port 4000)
# - AI DAWG Backend (port 3001)
# - PostgreSQL (port 5432) - if not running
# - Redis (port 6379) - if not running
# - Dashboard Backend (port 3002) - optional
#
# Features:
# - Auto-restart on failure
# - Logging to files
# - Health checks
# - Graceful shutdown handling
#
# Usage:
#   ./launch-hybrid-services.sh          # Start all services
#   ./launch-hybrid-services.sh stop     # Stop all services
#   ./launch-hybrid-services.sh status   # Check service status
#   ./launch-hybrid-services.sh restart  # Restart all services
###############################################################################

set -e

# Configuration
JARVIS_DIR="$HOME/Jarvis"
AIDAWG_DIR="$HOME/ai-dawg-v0.1"
LOG_DIR="$JARVIS_DIR/logs/hybrid"
PID_DIR="$JARVIS_DIR/pids"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Create directories
mkdir -p "$LOG_DIR"
mkdir -p "$PID_DIR"

###############################################################################
# Helper Functions
###############################################################################

log() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1"
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

# Check if a process is running
is_running() {
    local pid_file="$1"
    if [ -f "$pid_file" ]; then
        local pid=$(cat "$pid_file")
        if ps -p "$pid" > /dev/null 2>&1; then
            return 0
        fi
    fi
    return 1
}

# Start PostgreSQL if not running
start_postgres() {
    log "Checking PostgreSQL..."

    if brew services list | grep postgresql | grep started > /dev/null; then
        success "PostgreSQL already running"
        return 0
    fi

    log "Starting PostgreSQL..."
    brew services start postgresql@15 || brew services start postgresql
    sleep 3
    success "PostgreSQL started"
}

# Start Redis if not running
start_redis() {
    log "Checking Redis..."

    if brew services list | grep redis | grep started > /dev/null; then
        success "Redis already running"
        return 0
    fi

    log "Starting Redis..."
    brew services start redis
    sleep 2
    success "Redis started"
}

# Start AI DAWG Backend
start_aidawg() {
    local pid_file="$PID_DIR/aidawg.pid"

    if is_running "$pid_file"; then
        success "AI DAWG Backend already running (PID: $(cat $pid_file))"
        return 0
    fi

    log "Starting AI DAWG Backend..."

    cd "$AIDAWG_DIR"

    # Start with auto-restart on failure
    (
        while true; do
            npm run dev > "$LOG_DIR/aidawg.log" 2>&1 &
            local pid=$!
            echo $pid > "$pid_file"

            log "AI DAWG Backend started (PID: $pid)"

            # Wait for process to exit
            wait $pid
            local exit_code=$?

            error "AI DAWG Backend crashed (exit code: $exit_code)"
            warn "Restarting in 5 seconds..."
            sleep 5
        done
    ) &

    local wrapper_pid=$!
    echo $wrapper_pid > "$PID_DIR/aidawg-wrapper.pid"

    sleep 3
    success "AI DAWG Backend started with auto-restart"
}

# Start Jarvis Control Plane
start_jarvis() {
    local pid_file="$PID_DIR/jarvis.pid"

    if is_running "$pid_file"; then
        success "Jarvis Control Plane already running (PID: $(cat $pid_file))"
        return 0
    fi

    log "Starting Jarvis Control Plane..."

    cd "$JARVIS_DIR"

    # Start with auto-restart on failure
    (
        while true; do
            npm run dev > "$LOG_DIR/jarvis.log" 2>&1 &
            local pid=$!
            echo $pid > "$pid_file"

            log "Jarvis Control Plane started (PID: $pid)"

            # Wait for process to exit
            wait $pid
            local exit_code=$?

            error "Jarvis Control Plane crashed (exit code: $exit_code)"
            warn "Restarting in 5 seconds..."
            sleep 5
        done
    ) &

    local wrapper_pid=$!
    echo $wrapper_pid > "$PID_DIR/jarvis-wrapper.pid"

    sleep 3
    success "Jarvis Control Plane started with auto-restart"
}

# Start Dashboard (optional)
start_dashboard() {
    local pid_file="$PID_DIR/dashboard.pid"

    if is_running "$pid_file"; then
        success "Dashboard already running (PID: $(cat $pid_file))"
        return 0
    fi

    log "Starting Dashboard..."

    cd "$JARVIS_DIR/dashboard"

    if [ -f "./launch-dashboard.sh" ]; then
        ./launch-dashboard.sh > "$LOG_DIR/dashboard.log" 2>&1 &
        local pid=$!
        echo $pid > "$pid_file"
        success "Dashboard started (PID: $pid)"
    else
        warn "Dashboard launcher not found, skipping"
    fi
}

# Stop a service
stop_service() {
    local name="$1"
    local pid_file="$PID_DIR/${name}.pid"
    local wrapper_pid_file="$PID_DIR/${name}-wrapper.pid"

    # Stop wrapper process
    if [ -f "$wrapper_pid_file" ]; then
        local wrapper_pid=$(cat "$wrapper_pid_file")
        if ps -p "$wrapper_pid" > /dev/null 2>&1; then
            log "Stopping ${name} wrapper..."
            kill "$wrapper_pid" 2>/dev/null || true
            rm "$wrapper_pid_file"
        fi
    fi

    # Stop main process
    if [ -f "$pid_file" ]; then
        local pid=$(cat "$pid_file")
        if ps -p "$pid" > /dev/null 2>&1; then
            log "Stopping ${name}..."
            kill "$pid" 2>/dev/null || true
            sleep 2

            # Force kill if still running
            if ps -p "$pid" > /dev/null 2>&1; then
                warn "Force killing ${name}..."
                kill -9 "$pid" 2>/dev/null || true
            fi
        fi
        rm "$pid_file"
        success "${name} stopped"
    else
        warn "${name} was not running"
    fi
}

# Check service health
check_health() {
    local service="$1"
    local url="$2"

    if curl -s -f "$url" > /dev/null 2>&1; then
        success "${service} is healthy"
        return 0
    else
        error "${service} health check failed"
        return 1
    fi
}

# Show status of all services
show_status() {
    log "Checking service status..."
    echo ""

    # PostgreSQL
    if brew services list | grep postgresql | grep started > /dev/null; then
        success "PostgreSQL: Running"
    else
        error "PostgreSQL: Stopped"
    fi

    # Redis
    if brew services list | grep redis | grep started > /dev/null; then
        success "Redis: Running"
    else
        error "Redis: Stopped"
    fi

    # AI DAWG
    if is_running "$PID_DIR/aidawg.pid"; then
        success "AI DAWG Backend: Running (PID: $(cat $PID_DIR/aidawg.pid))"
        check_health "AI DAWG" "http://localhost:3001/api/v1/health" || true
    else
        error "AI DAWG Backend: Stopped"
    fi

    # Jarvis
    if is_running "$PID_DIR/jarvis.pid"; then
        success "Jarvis Control Plane: Running (PID: $(cat $PID_DIR/jarvis.pid))"
        check_health "Jarvis" "http://localhost:4000/health" || true
    else
        error "Jarvis Control Plane: Stopped"
    fi

    # Dashboard
    if is_running "$PID_DIR/dashboard.pid"; then
        success "Dashboard: Running (PID: $(cat $PID_DIR/dashboard.pid))"
    else
        warn "Dashboard: Stopped (optional)"
    fi

    echo ""
    log "Logs available in: $LOG_DIR"
}

###############################################################################
# Main Commands
###############################################################################

start_all() {
    log "Starting Jarvis Enhanced Hybrid Services..."
    echo ""

    start_postgres
    start_redis
    sleep 2

    start_aidawg
    sleep 5

    start_jarvis
    sleep 3

    start_dashboard

    echo ""
    success "All services started successfully!"
    echo ""

    show_status

    echo ""
    log "Services are running in the background with auto-restart"
    log "Use './launch-hybrid-services.sh status' to check status"
    log "Use './launch-hybrid-services.sh stop' to stop all services"
}

stop_all() {
    log "Stopping all Jarvis services..."
    echo ""

    stop_service "jarvis"
    stop_service "aidawg"
    stop_service "dashboard"

    echo ""
    success "All services stopped"
}

restart_all() {
    log "Restarting all services..."
    stop_all
    sleep 3
    start_all
}

# Handle commands
case "${1:-start}" in
    start)
        start_all
        ;;
    stop)
        stop_all
        ;;
    restart)
        restart_all
        ;;
    status)
        show_status
        ;;
    *)
        echo "Usage: $0 {start|stop|restart|status}"
        exit 1
        ;;
esac

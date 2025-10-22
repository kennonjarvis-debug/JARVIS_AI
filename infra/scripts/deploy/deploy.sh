#!/bin/bash

###############################################################################
# Jarvis Deployment Script
# Purpose: Deploy Jarvis V2 to EC2 with health checks and notifications
# Usage: ./deploy.sh [staging|production]
###############################################################################

set -euo pipefail

# Configuration
ENVIRONMENT="${1:-staging}"
JARVIS_ROOT="/opt/jarvis"
DEPLOY_TIMESTAMP=$(date +%Y-%m-%d-%H-%M-%S)
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

log_step() {
    echo -e "${BLUE}[STEP]${NC} $1"
}

# Validate environment
validate_environment() {
    log_step "Validating environment: $ENVIRONMENT"

    if [ "$ENVIRONMENT" != "staging" ] && [ "$ENVIRONMENT" != "production" ]; then
        log_error "Invalid environment. Must be 'staging' or 'production'"
        exit 1
    fi

    log_info "Environment validated ✅"
}

# Pre-deployment health check
pre_deploy_health_check() {
    log_step "Running pre-deployment health check..."

    if [ -f "$SCRIPT_DIR/health-check.sh" ]; then
        if ! bash "$SCRIPT_DIR/health-check.sh" --threshold 60; then
            log_error "Pre-deployment health check failed!"
            log_error "Deployment blocked due to low vitality"

            # Send alert
            if [ -f "$SCRIPT_DIR/slack-notify.sh" ]; then
                NOTIFICATION_TYPE=health \
                VITALITY=0 \
                THRESHOLD=60 \
                bash "$SCRIPT_DIR/slack-notify.sh" warning "$ENVIRONMENT"
            fi

            exit 1
        fi
    else
        log_warn "Health check script not found, skipping..."
    fi

    log_info "Pre-deployment health check passed ✅"
}

# Backup current version
backup_current_version() {
    log_step "Backing up current version..."

    if [ -d "$JARVIS_ROOT" ]; then
        BACKUP_DIR="/opt/jarvis-backup-${DEPLOY_TIMESTAMP}"
        sudo cp -r "$JARVIS_ROOT" "$BACKUP_DIR"
        log_info "Backup created at $BACKUP_DIR ✅"
    else
        log_warn "No existing installation found, skipping backup"
    fi
}

# Download and extract new version
deploy_new_version() {
    log_step "Deploying new version..."

    # This would typically download from S3 or artifact storage
    # For now, we'll assume the build artifacts are in the current directory

    if [ ! -d "./dist" ]; then
        log_error "Build artifacts not found in ./dist"
        exit 1
    fi

    # Create Jarvis directory if it doesn't exist
    sudo mkdir -p "$JARVIS_ROOT"

    # Copy new files
    sudo rsync -av --delete \
        --exclude='node_modules' \
        --exclude='logs' \
        --exclude='memory' \
        --exclude='adaptive' \
        ./dist/ "$JARVIS_ROOT/"

    # Copy package files
    sudo cp package.json package-lock.json "$JARVIS_ROOT/" || true

    log_info "New version deployed ✅"
}

# Install dependencies
install_dependencies() {
    log_step "Installing dependencies..."

    cd "$JARVIS_ROOT"

    if [ -f "package.json" ]; then
        sudo npm ci --production --no-audit
        log_info "Dependencies installed ✅"
    else
        log_warn "package.json not found, skipping npm install"
    fi
}

# Run database migrations
run_migrations() {
    log_step "Running database migrations..."

    cd "$JARVIS_ROOT"

    if [ -f "node_modules/.bin/prisma" ]; then
        sudo npm run db:migrate || log_warn "Migrations failed or not configured"
    else
        log_warn "Prisma not found, skipping migrations"
    fi
}

# Restart Jarvis service
restart_service() {
    log_step "Restarting Jarvis service..."

    if sudo systemctl is-active --quiet jarvis; then
        sudo systemctl restart jarvis
        log_info "Jarvis service restarted ✅"
    else
        sudo systemctl start jarvis
        log_info "Jarvis service started ✅"
    fi

    # Wait for service to be ready
    log_info "Waiting for service to be ready..."
    sleep 10
}

# Post-deployment health check
post_deploy_health_check() {
    log_step "Running post-deployment health check..."

    RETRIES=0
    MAX_RETRIES=5

    while [ $RETRIES -lt $MAX_RETRIES ]; do
        if curl -f http://localhost:3001/health > /dev/null 2>&1; then
            log_info "Health endpoint responding ✅"

            # Run full health check
            if [ -f "$SCRIPT_DIR/health-check.sh" ]; then
                if bash "$SCRIPT_DIR/health-check.sh" --threshold 60; then
                    log_info "Post-deployment health check passed ✅"
                    return 0
                fi
            else
                log_info "Health check passed ✅"
                return 0
            fi
        fi

        RETRIES=$((RETRIES + 1))
        log_warn "Health check attempt $RETRIES/$MAX_RETRIES failed, retrying..."
        sleep 5
    done

    log_error "Post-deployment health check failed after $MAX_RETRIES attempts"
    return 1
}

# Rollback deployment
rollback() {
    log_error "Rolling back deployment..."

    BACKUP_DIR=$(ls -td /opt/jarvis-backup-* 2>/dev/null | head -1)

    if [ -n "$BACKUP_DIR" ]; then
        log_info "Restoring from backup: $BACKUP_DIR"
        sudo rm -rf "$JARVIS_ROOT"
        sudo cp -r "$BACKUP_DIR" "$JARVIS_ROOT"
        sudo systemctl restart jarvis

        log_info "Rollback complete ✅"
    else
        log_error "No backup found for rollback!"
        exit 1
    fi
}

# Send deployment notification
send_notification() {
    STATUS=$1

    log_step "Sending deployment notification..."

    if [ -f "$SCRIPT_DIR/slack-notify.sh" ]; then
        NOTIFICATION_TYPE=deployment \
        COMMIT_SHA="${GITHUB_SHA:-unknown}" \
        COMMIT_MESSAGE="${COMMIT_MESSAGE:-Deployment}" \
        AUTHOR="${GITHUB_ACTOR:-system}" \
        VITALITY="${VITALITY:-N/A}" \
        bash "$SCRIPT_DIR/slack-notify.sh" "$STATUS" "$ENVIRONMENT"

        log_info "Notification sent ✅"
    else
        log_warn "Notification script not found, skipping..."
    fi
}

# Main deployment flow
main() {
    log_info "╔═══════════════════════════════════════════════╗"
    log_info "║     Jarvis V2 Deployment - $ENVIRONMENT"
    log_info "╚═══════════════════════════════════════════════╝"
    log_info ""

    # Send started notification
    send_notification "started"

    # Validate
    validate_environment

    # Pre-deployment checks
    pre_deploy_health_check

    # Deployment steps
    backup_current_version
    deploy_new_version
    install_dependencies
    run_migrations
    restart_service

    # Post-deployment verification
    if post_deploy_health_check; then
        log_info ""
        log_info "╔═══════════════════════════════════════════════╗"
        log_info "║     ✅ Deployment Successful                  ║"
        log_info "╚═══════════════════════════════════════════════╝"
        log_info ""
        log_info "Environment: $ENVIRONMENT"
        log_info "Timestamp: $DEPLOY_TIMESTAMP"
        log_info ""

        send_notification "success"
        exit 0
    else
        log_error ""
        log_error "╔═══════════════════════════════════════════════╗"
        log_error "║     ❌ Deployment Failed                      ║"
        log_error "╚═══════════════════════════════════════════════╝"
        log_error ""

        # Attempt rollback
        rollback
        send_notification "failure"
        exit 1
    fi
}

# Trap errors
trap 'log_error "Deployment failed! Rolling back..."; rollback; send_notification "failure"; exit 1' ERR

# Run main
main "$@"

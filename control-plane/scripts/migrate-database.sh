#!/bin/bash
set -euo pipefail

# Database Migration Script with Safety Features
# Usage: ./migrate-database.sh <environment>
# Example: ./migrate-database.sh production

ENVIRONMENT="${1:-staging}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="${PROJECT_ROOT}/backups/migrations"
LOCK_FILE="/tmp/jarvis-migration-${ENVIRONMENT}.lock"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if another migration is running
acquire_lock() {
    if [ -e "$LOCK_FILE" ]; then
        LOCK_PID=$(cat "$LOCK_FILE")
        if ps -p "$LOCK_PID" > /dev/null 2>&1; then
            log_error "Another migration is running (PID: $LOCK_PID)"
            exit 1
        else
            log_warning "Removing stale lock file"
            rm -f "$LOCK_FILE"
        fi
    fi
    echo $$ > "$LOCK_FILE"
    log_info "Acquired migration lock"
}

release_lock() {
    rm -f "$LOCK_FILE"
    log_info "Released migration lock"
}

# Ensure lock is released on exit
trap release_lock EXIT

# Load environment variables
load_environment() {
    log_info "Loading environment: $ENVIRONMENT"

    if [ -f "${PROJECT_ROOT}/.env.${ENVIRONMENT}" ]; then
        set -a
        source "${PROJECT_ROOT}/.env.${ENVIRONMENT}"
        set +a
        log_success "Loaded environment file"
    else
        log_error "Environment file .env.${ENVIRONMENT} not found"
        exit 1
    fi

    if [ -z "${DATABASE_URL:-}" ]; then
        log_error "DATABASE_URL not set in environment"
        exit 1
    fi
}

# Create backup directory
setup_backup_dir() {
    mkdir -p "$BACKUP_DIR"
    log_info "Backup directory: $BACKUP_DIR"
}

# Backup database before migration
backup_database() {
    log_info "Creating pre-migration backup..."

    BACKUP_FILE="${BACKUP_DIR}/pre-migration-${ENVIRONMENT}-${TIMESTAMP}.sql"

    # Extract database connection details
    DB_HOST=$(echo "$DATABASE_URL" | sed -n 's|.*@\([^:]*\):.*|\1|p')
    DB_PORT=$(echo "$DATABASE_URL" | sed -n 's|.*:\([0-9]*\)/.*|\1|p')
    DB_NAME=$(echo "$DATABASE_URL" | sed -n 's|.*/\([^?]*\).*|\1|p')
    DB_USER=$(echo "$DATABASE_URL" | sed -n 's|.*://\([^:]*\):.*|\1|p')
    DB_PASS=$(echo "$DATABASE_URL" | sed -n 's|.*://[^:]*:\([^@]*\)@.*|\1|p')

    # Create backup using pg_dump
    PGPASSWORD="$DB_PASS" pg_dump \
        -h "$DB_HOST" \
        -p "$DB_PORT" \
        -U "$DB_USER" \
        -d "$DB_NAME" \
        --no-owner \
        --no-acl \
        -F p \
        -f "$BACKUP_FILE"

    # Compress backup
    gzip "$BACKUP_FILE"

    log_success "Backup created: ${BACKUP_FILE}.gz"

    # Store backup location for rollback
    echo "${BACKUP_FILE}.gz" > "${BACKUP_DIR}/latest-backup.txt"
}

# Check migration status
check_migration_status() {
    log_info "Checking current migration status..."

    npx prisma migrate status || true
}

# Verify database connectivity
verify_connection() {
    log_info "Verifying database connection..."

    if npx prisma db execute --stdin <<< "SELECT 1;" > /dev/null 2>&1; then
        log_success "Database connection verified"
    else
        log_error "Failed to connect to database"
        exit 1
    fi
}

# Run migrations
run_migrations() {
    log_info "Running database migrations..."

    # Deploy migrations
    if npx prisma migrate deploy; then
        log_success "Migrations completed successfully"
        return 0
    else
        log_error "Migration failed!"
        return 1
    fi
}

# Verify migrations
verify_migrations() {
    log_info "Verifying migrations..."

    # Check if all migrations are applied
    if npx prisma migrate status | grep -q "No pending migrations"; then
        log_success "All migrations verified"
        return 0
    else
        log_warning "Some migrations may not have been applied"
        npx prisma migrate status
        return 1
    fi
}

# Rollback on failure
rollback_migrations() {
    log_error "Rolling back migrations..."

    LATEST_BACKUP="${BACKUP_DIR}/latest-backup.txt"

    if [ -f "$LATEST_BACKUP" ]; then
        BACKUP_FILE=$(cat "$LATEST_BACKUP")
        log_info "Restoring from backup: $BACKUP_FILE"

        # Extract and restore
        gunzip -c "$BACKUP_FILE" | PGPASSWORD="$DB_PASS" psql \
            -h "$DB_HOST" \
            -p "$DB_PORT" \
            -U "$DB_USER" \
            -d "$DB_NAME"

        log_success "Database restored from backup"
    else
        log_error "No backup found for rollback"
        exit 1
    fi
}

# Clean old backups
cleanup_old_backups() {
    log_info "Cleaning up old backups (keeping last 10)..."

    find "$BACKUP_DIR" -name "pre-migration-*.sql.gz" -type f -mtime +30 -delete || true

    # Keep only the last 10 backups
    ls -t "$BACKUP_DIR"/pre-migration-*.sql.gz 2>/dev/null | tail -n +11 | xargs rm -f 2>/dev/null || true

    log_success "Cleanup completed"
}

# Send notification
send_notification() {
    local status="$1"
    local message="$2"

    if [ -n "${SLACK_WEBHOOK_URL:-}" ]; then
        curl -X POST "$SLACK_WEBHOOK_URL" \
            -H 'Content-Type: application/json' \
            -d "{
                \"text\": \"Database Migration: $status\",
                \"blocks\": [{
                    \"type\": \"section\",
                    \"text\": {
                        \"type\": \"mrkdwn\",
                        \"text\": \"*Environment:* $ENVIRONMENT\\n*Status:* $status\\n*Message:* $message\\n*Time:* $(date)\"
                    }
                }]
            }" > /dev/null 2>&1 || true
    fi
}

# Main execution
main() {
    log_info "========================================="
    log_info "Database Migration Script"
    log_info "Environment: $ENVIRONMENT"
    log_info "Timestamp: $TIMESTAMP"
    log_info "========================================="

    # Acquire lock
    acquire_lock

    # Load environment
    load_environment

    # Setup backup directory
    setup_backup_dir

    # Verify connection
    verify_connection

    # Check current status
    check_migration_status

    # Backup database
    backup_database

    # Run migrations
    if run_migrations; then
        # Verify migrations
        if verify_migrations; then
            log_success "========================================="
            log_success "Migration completed successfully!"
            log_success "========================================="

            send_notification "✅ SUCCESS" "Migrations completed successfully"

            # Cleanup old backups
            cleanup_old_backups

            exit 0
        else
            log_error "Migration verification failed"
            send_notification "⚠️ WARNING" "Migration verification failed"
            exit 1
        fi
    else
        log_error "========================================="
        log_error "Migration failed - initiating rollback"
        log_error "========================================="

        # Attempt rollback
        rollback_migrations

        send_notification "❌ FAILED" "Migration failed and was rolled back"

        exit 1
    fi
}

# Run main function
main

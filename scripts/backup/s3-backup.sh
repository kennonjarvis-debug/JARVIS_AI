#!/bin/bash

###############################################################################
# Jarvis S3 Backup Script
# Purpose: Backup Jarvis data to AWS S3 with encryption and verification
# Schedule: Daily at 6:00 AM UTC (via GitHub Actions or cron)
###############################################################################

set -euo pipefail

# Configuration
JARVIS_ROOT="${JARVIS_ROOT:-/opt/jarvis}"
BACKUP_BUCKET="${S3_BACKUP_BUCKET:-jarvis-backups}"
RETENTION_DAYS="${BACKUP_RETENTION_DAYS:-30}"
TIMESTAMP=$(date +%Y-%m-%d-%H-%M-%S)
BACKUP_DIR="/tmp/jarvis-backup-${TIMESTAMP}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Logging
log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check prerequisites
check_prerequisites() {
    log_info "Checking prerequisites..."

    # Check if AWS CLI is installed
    if ! command -v aws &> /dev/null; then
        log_error "AWS CLI is not installed"
        exit 1
    fi

    # Check AWS credentials
    if ! aws sts get-caller-identity &> /dev/null; then
        log_error "AWS credentials are not configured"
        exit 1
    fi

    # Check if Jarvis directory exists
    if [ ! -d "$JARVIS_ROOT" ]; then
        log_error "Jarvis directory not found: $JARVIS_ROOT"
        exit 1
    fi

    log_info "Prerequisites check passed ✅"
}

# Verify S3 bucket
verify_s3_bucket() {
    log_info "Verifying S3 bucket: $BACKUP_BUCKET"

    # Check if bucket exists
    if ! aws s3 ls "s3://${BACKUP_BUCKET}" &> /dev/null; then
        log_error "S3 bucket does not exist: $BACKUP_BUCKET"
        exit 1
    fi

    # Check encryption
    ENCRYPTION=$(aws s3api get-bucket-encryption --bucket "$BACKUP_BUCKET" 2>&1 || echo "NOT_ENCRYPTED")

    if echo "$ENCRYPTION" | grep -q "AES256\|aws:kms"; then
        log_info "Bucket encryption: ENABLED ✅"
    else
        log_warn "Bucket encryption: DISABLED ⚠️"
    fi

    # Check versioning
    VERSIONING=$(aws s3api get-bucket-versioning --bucket "$BACKUP_BUCKET" 2>&1 | jq -r '.Status // "Disabled"')
    log_info "Bucket versioning: $VERSIONING"
}

# Create backup archive
create_backup() {
    log_info "Creating backup archive..."

    mkdir -p "$BACKUP_DIR"

    # Backup memory folder
    if [ -d "$JARVIS_ROOT/memory" ]; then
        log_info "📁 Backing up /memory..."
        tar -czf "$BACKUP_DIR/memory.tar.gz" \
            -C "$JARVIS_ROOT" memory/ \
            --exclude='*.tmp' \
            --exclude='.DS_Store' \
            --exclude='node_modules' \
            2>/dev/null || log_warn "Memory backup had warnings"
    fi

    # Backup adaptive folder
    if [ -d "$JARVIS_ROOT/adaptive" ]; then
        log_info "🧠 Backing up /adaptive..."
        tar -czf "$BACKUP_DIR/adaptive.tar.gz" \
            -C "$JARVIS_ROOT" adaptive/ \
            --exclude='*.tmp' \
            2>/dev/null || log_warn "Adaptive backup had warnings"
    fi

    # Backup logs (last 7 days)
    if [ -d "$JARVIS_ROOT/logs" ]; then
        log_info "📋 Backing up /logs (last 7 days)..."
        find "$JARVIS_ROOT/logs" -type f -mtime -7 -print0 2>/dev/null | \
            tar -czf "$BACKUP_DIR/logs.tar.gz" \
                --null -T - \
                --ignore-failed-read || log_warn "Logs backup had warnings"
    fi

    # Backup config files
    if [ -d "$JARVIS_ROOT/config" ]; then
        log_info "⚙️  Backing up /config..."
        tar -czf "$BACKUP_DIR/config.tar.gz" \
            -C "$JARVIS_ROOT" config/ \
            2>/dev/null || log_warn "Config backup had warnings"
    fi

    # Create manifest
    cat > "$BACKUP_DIR/manifest.json" << EOF
{
    "timestamp": "$TIMESTAMP",
    "backup_type": "daily",
    "source": "$(hostname)",
    "jarvis_root": "$JARVIS_ROOT",
    "files": [
        "memory.tar.gz",
        "adaptive.tar.gz",
        "logs.tar.gz",
        "config.tar.gz"
    ],
    "retention_days": $RETENTION_DAYS
}
EOF

    # Calculate checksums
    log_info "🔐 Calculating checksums..."
    cd "$BACKUP_DIR"
    sha256sum *.tar.gz > checksums.sha256

    log_info "Backup archive created at $BACKUP_DIR ✅"
}

# Upload to S3
upload_to_s3() {
    log_info "☁️  Uploading backup to S3..."

    aws s3 sync "$BACKUP_DIR/" \
        "s3://${BACKUP_BUCKET}/backups/${TIMESTAMP}/" \
        --storage-class STANDARD_IA \
        --metadata "backup-date=${TIMESTAMP},retention-days=${RETENTION_DAYS}"

    log_info "Backup uploaded to s3://${BACKUP_BUCKET}/backups/${TIMESTAMP}/ ✅"
}

# Verify backup integrity
verify_backup() {
    log_info "🔍 Verifying backup integrity..."

    # Download checksums from S3
    aws s3 cp "s3://${BACKUP_BUCKET}/backups/${TIMESTAMP}/checksums.sha256" /tmp/checksums-remote.sha256

    # Verify each file
    FILES=("memory.tar.gz" "adaptive.tar.gz" "logs.tar.gz" "config.tar.gz")

    for file in "${FILES[@]}"; do
        if [ ! -f "$BACKUP_DIR/$file" ]; then
            log_warn "File not found in local backup: $file"
            continue
        fi

        # Get expected checksum
        EXPECTED=$(grep "$file" "$BACKUP_DIR/checksums.sha256" | awk '{print $1}')

        # Download and calculate actual checksum
        aws s3 cp "s3://${BACKUP_BUCKET}/backups/${TIMESTAMP}/$file" "/tmp/${file}.verify"
        ACTUAL=$(sha256sum "/tmp/${file}.verify" | awk '{print $1}')

        if [ "$EXPECTED" = "$ACTUAL" ]; then
            log_info "✅ $file checksum verified"
        else
            log_error "❌ $file checksum mismatch!"
            exit 1
        fi

        rm -f "/tmp/${file}.verify"
    done

    rm -f /tmp/checksums-remote.sha256

    log_info "All backups verified successfully ✅"
}

# Cleanup old backups
cleanup_old_backups() {
    log_info "🧹 Cleaning up backups older than ${RETENTION_DAYS} days..."

    CUTOFF_DATE=$(date -u -d "${RETENTION_DAYS} days ago" +%Y-%m-%d 2>/dev/null || date -u -v-${RETENTION_DAYS}d +%Y-%m-%d)

    DELETED_COUNT=0

    aws s3 ls "s3://${BACKUP_BUCKET}/backups/" | while read -r line; do
        BACKUP_DATE=$(echo "$line" | awk '{print $2}' | cut -d'/' -f1 | cut -d'-' -f1-3)

        if [ -n "$BACKUP_DATE" ] && [ "$BACKUP_DATE" \< "$CUTOFF_DATE" ]; then
            BACKUP_PATH=$(echo "$line" | awk '{print $2}')
            log_info "🗑️  Deleting old backup: $BACKUP_PATH"
            aws s3 rm "s3://${BACKUP_BUCKET}/backups/${BACKUP_PATH%/}" --recursive
            DELETED_COUNT=$((DELETED_COUNT + 1))
        fi
    done

    log_info "Cleaned up $DELETED_COUNT old backups ✅"
}

# Cleanup local backup
cleanup_local() {
    log_info "🧹 Cleaning up local backup directory..."
    rm -rf "$BACKUP_DIR"
    log_info "Local cleanup complete ✅"
}

# Generate backup report
generate_report() {
    log_info "📊 Generating backup report..."

    # Get backup size
    BACKUP_SIZE=$(aws s3 ls "s3://${BACKUP_BUCKET}/backups/${TIMESTAMP}/" --recursive --summarize | grep "Total Size" | awk '{print $3}')
    BACKUP_SIZE_MB=$((BACKUP_SIZE / 1024 / 1024))

    # Count files
    FILE_COUNT=$(aws s3 ls "s3://${BACKUP_BUCKET}/backups/${TIMESTAMP}/" --recursive | wc -l)

    cat << EOF

╔═══════════════════════════════════════════════╗
║        Jarvis S3 Backup Report               ║
╚═══════════════════════════════════════════════╝

  Timestamp:        $TIMESTAMP
  Status:           SUCCESS ✅
  Backup Size:      ${BACKUP_SIZE_MB} MB
  Files Backed Up:  ${FILE_COUNT}
  S3 Bucket:        s3://${BACKUP_BUCKET}/backups/${TIMESTAMP}/
  Retention:        ${RETENTION_DAYS} days

  Backed Up:
    • Memory folder 💾
    • Adaptive data 🧠
    • Logs (7 days) 📋
    • Config files ⚙️

  Next Backup:      Tomorrow at 6:00 AM UTC

EOF
}

# Main execution
main() {
    log_info "Starting Jarvis S3 Backup..."
    log_info "Timestamp: $TIMESTAMP"

    check_prerequisites
    verify_s3_bucket
    create_backup
    upload_to_s3
    verify_backup
    cleanup_old_backups
    cleanup_local
    generate_report

    log_info "Backup completed successfully! 🎉"
}

# Trap errors
trap 'log_error "Backup failed at line $LINENO. Cleaning up..."; rm -rf "$BACKUP_DIR"; exit 1' ERR

# Run main
main "$@"

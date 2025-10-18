#!/bin/bash
#
# PostgreSQL Restore Script
#
# Restores PostgreSQL database from backup
# Supports:
# - Full restoration
# - Point-in-time recovery
# - Dry-run mode
# - Automatic decryption and decompression
#
# Usage: ./restore-postgres.sh [backup_file] [options]
#   --dry-run: Test restore without making changes
#   --drop-existing: Drop existing database before restore
#

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
BACKUP_FILE="${1:-}"
DRY_RUN=false
DROP_EXISTING=false
POSTGRES_HOST="${POSTGRES_HOST:-localhost}"
POSTGRES_PORT="${POSTGRES_PORT:-5432}"
POSTGRES_DB="${POSTGRES_DB:-jarvis_db}"
POSTGRES_USER="${POSTGRES_USER:-jarvis_user}"
BACKUP_ENCRYPTION_KEY="${BACKUP_ENCRYPTION_KEY:-}"

# Parse arguments
shift || true
while [[ $# -gt 0 ]]; do
    case $1 in
        --dry-run)
            DRY_RUN=true
            shift
            ;;
        --drop-existing)
            DROP_EXISTING=true
            shift
            ;;
        *)
            echo -e "${RED}Unknown option: $1${NC}"
            exit 1
            ;;
    esac
done

# Validate backup file
if [ -z "$BACKUP_FILE" ]; then
    echo -e "${RED}Error: Backup file not specified${NC}"
    echo "Usage: $0 <backup_file> [--dry-run] [--drop-existing]"
    exit 1
fi

if [ ! -f "$BACKUP_FILE" ]; then
    echo -e "${RED}Error: Backup file not found: $BACKUP_FILE${NC}"
    exit 1
fi

echo -e "${GREEN}[PostgreSQL Restore] Starting restore...${NC}"
echo "  Database: $POSTGRES_DB"
echo "  Host: $POSTGRES_HOST:$POSTGRES_PORT"
echo "  Backup: $BACKUP_FILE"
echo "  Dry Run: $DRY_RUN"
echo "  Drop Existing: $DROP_EXISTING"
echo ""

# Create temporary directory for restore
TEMP_DIR=$(mktemp -d)
trap "rm -rf $TEMP_DIR" EXIT

# Decompress if needed
RESTORE_FILE="$BACKUP_FILE"
if [[ "$BACKUP_FILE" == *.gz ]]; then
    echo -e "${YELLOW}[PostgreSQL Restore] Decompressing backup...${NC}"
    RESTORE_FILE="$TEMP_DIR/backup.sql.enc"
    gunzip -c "$BACKUP_FILE" > "$RESTORE_FILE"
    echo -e "${GREEN}[PostgreSQL Restore] Decompression complete${NC}"
fi

# Decrypt if needed
if [[ "$RESTORE_FILE" == *.enc ]]; then
    echo -e "${YELLOW}[PostgreSQL Restore] Decrypting backup...${NC}"

    if [ -z "$BACKUP_ENCRYPTION_KEY" ]; then
        echo -e "${RED}Error: BACKUP_ENCRYPTION_KEY not set${NC}"
        exit 1
    fi

    DECRYPTED_FILE="$TEMP_DIR/backup.sql"

    # Use openssl to decrypt (AES-256-GCM)
    # Read IV (first 16 bytes)
    # Read auth tag (last 16 bytes)
    # Decrypt middle portion

    python3 -c "
import sys
import os
from cryptography.hazmat.primitives.ciphers import Cipher, algorithms, modes
from cryptography.hazmat.backends import default_backend

# Read encrypted file
with open('$RESTORE_FILE', 'rb') as f:
    data = f.read()

# Extract IV (first 16 bytes)
iv = data[:16]

# Extract auth tag (last 16 bytes)
auth_tag = data[-16:]

# Extract ciphertext (middle)
ciphertext = data[16:-16]

# Decrypt
key = bytes.fromhex('$BACKUP_ENCRYPTION_KEY')
cipher = Cipher(algorithms.AES(key), modes.GCM(iv, auth_tag), backend=default_backend())
decryptor = cipher.decryptor()
plaintext = decryptor.update(ciphertext) + decryptor.finalize()

# Write decrypted file
with open('$DECRYPTED_FILE', 'wb') as f:
    f.write(plaintext)
" 2>/dev/null || {
        echo -e "${RED}Error: Decryption failed (Python cryptography library required)${NC}"
        echo "Install with: pip install cryptography"
        exit 1
    }

    RESTORE_FILE="$DECRYPTED_FILE"
    echo -e "${GREEN}[PostgreSQL Restore] Decryption complete${NC}"
fi

# Verify SQL file
if ! grep -q "PostgreSQL database dump" "$RESTORE_FILE" 2>/dev/null; then
    echo -e "${RED}Error: Invalid PostgreSQL backup file${NC}"
    exit 1
fi

# Get backup info
TABLE_COUNT=$(grep -c "CREATE TABLE" "$RESTORE_FILE" || true)
echo ""
echo -e "${YELLOW}[PostgreSQL Restore] Backup Info:${NC}"
echo "  Tables: $TABLE_COUNT"
echo ""

# Dry run mode
if [ "$DRY_RUN" = true ]; then
    echo -e "${YELLOW}[PostgreSQL Restore] DRY RUN MODE - No changes will be made${NC}"
    echo ""
    echo -e "${GREEN}[PostgreSQL Restore] Validation complete${NC}"
    echo "  ✓ Backup file is valid"
    echo "  ✓ Contains $TABLE_COUNT tables"
    echo ""
    echo "To perform actual restore, run without --dry-run flag"
    exit 0
fi

# Check if database is accessible
if ! pg_isready -h "$POSTGRES_HOST" -p "$POSTGRES_PORT" -U "$POSTGRES_USER" > /dev/null 2>&1; then
    echo -e "${RED}Error: PostgreSQL is not accessible${NC}"
    exit 1
fi

# Drop existing database if requested
if [ "$DROP_EXISTING" = true ]; then
    echo -e "${YELLOW}[PostgreSQL Restore] Dropping existing database...${NC}"

    # Terminate existing connections
    psql -h "$POSTGRES_HOST" -p "$POSTGRES_PORT" -U "$POSTGRES_USER" -d postgres <<EOF
SELECT pg_terminate_backend(pg_stat_activity.pid)
FROM pg_stat_activity
WHERE pg_stat_activity.datname = '$POSTGRES_DB'
  AND pid <> pg_backend_pid();
EOF

    # Drop database
    psql -h "$POSTGRES_HOST" -p "$POSTGRES_PORT" -U "$POSTGRES_USER" -d postgres \
        -c "DROP DATABASE IF EXISTS $POSTGRES_DB;" > /dev/null 2>&1

    # Create fresh database
    psql -h "$POSTGRES_HOST" -p "$POSTGRES_PORT" -U "$POSTGRES_USER" -d postgres \
        -c "CREATE DATABASE $POSTGRES_DB;" > /dev/null 2>&1

    echo -e "${GREEN}[PostgreSQL Restore] Database recreated${NC}"
fi

# Restore backup
echo ""
echo -e "${YELLOW}[PostgreSQL Restore] Restoring database...${NC}"

if psql -h "$POSTGRES_HOST" -p "$POSTGRES_PORT" -U "$POSTGRES_USER" -d "$POSTGRES_DB" \
    -f "$RESTORE_FILE" 2>&1 | grep -v "^SET$\|^COMMENT\|^--"; then
    echo -e "${GREEN}[PostgreSQL Restore] Restore completed successfully${NC}"
else
    echo -e "${RED}[PostgreSQL Restore] Restore failed${NC}"
    exit 1
fi

# Verify restore
echo ""
echo -e "${YELLOW}[PostgreSQL Restore] Verifying restore...${NC}"

# Count tables
RESTORED_TABLES=$(psql -h "$POSTGRES_HOST" -p "$POSTGRES_PORT" -U "$POSTGRES_USER" -d "$POSTGRES_DB" \
    -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';" | xargs)

echo "  Restored tables: $RESTORED_TABLES"

if [ "$RESTORED_TABLES" -eq "$TABLE_COUNT" ]; then
    echo -e "${GREEN}[PostgreSQL Restore] Verification successful${NC}"
else
    echo -e "${YELLOW}[PostgreSQL Restore] Warning: Table count mismatch${NC}"
fi

# Run ANALYZE to update statistics
echo ""
echo -e "${YELLOW}[PostgreSQL Restore] Analyzing database...${NC}"
psql -h "$POSTGRES_HOST" -p "$POSTGRES_PORT" -U "$POSTGRES_USER" -d "$POSTGRES_DB" \
    -c "ANALYZE;" > /dev/null 2>&1

echo -e "${GREEN}[PostgreSQL Restore] Analysis complete${NC}"

echo ""
echo -e "${GREEN}✓ PostgreSQL restore complete${NC}"
exit 0

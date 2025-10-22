#!/bin/bash
#
# PostgreSQL Backup Script
#
# Performs full database backup using pg_dump
# Supports schema-only, data-only, and full backups
# Includes all tables, indexes, sequences, and constraints
# Verifies backup integrity
#
# Usage: ./backup-postgres.sh [output_file] [backup_type]
#   backup_type: full (default), schema, data
#

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
OUTPUT_FILE="${1:-/var/backups/jarvis/postgres/postgres_$(date +%Y%m%d_%H%M%S).sql}"
BACKUP_TYPE="${2:-full}"
POSTGRES_HOST="${POSTGRES_HOST:-localhost}"
POSTGRES_PORT="${POSTGRES_PORT:-5432}"
POSTGRES_DB="${POSTGRES_DB:-jarvis_db}"
POSTGRES_USER="${POSTGRES_USER:-jarvis_user}"

# Ensure output directory exists
mkdir -p "$(dirname "$OUTPUT_FILE")"

echo -e "${GREEN}[PostgreSQL Backup] Starting backup...${NC}"
echo "  Database: $POSTGRES_DB"
echo "  Host: $POSTGRES_HOST:$POSTGRES_PORT"
echo "  Type: $BACKUP_TYPE"
echo "  Output: $OUTPUT_FILE"
echo ""

# Check if PostgreSQL is accessible
if ! pg_isready -h "$POSTGRES_HOST" -p "$POSTGRES_PORT" -U "$POSTGRES_USER" > /dev/null 2>&1; then
    echo -e "${RED}[PostgreSQL Backup] Error: PostgreSQL is not accessible${NC}"
    exit 1
fi

# Perform backup based on type
case "$BACKUP_TYPE" in
    "full")
        echo -e "${YELLOW}[PostgreSQL Backup] Creating full backup...${NC}"
        pg_dump \
            -h "$POSTGRES_HOST" \
            -p "$POSTGRES_PORT" \
            -U "$POSTGRES_USER" \
            -d "$POSTGRES_DB" \
            --verbose \
            --no-owner \
            --no-acl \
            --format=plain \
            --file="$OUTPUT_FILE" \
            2>&1 | grep -v "^pg_dump:"
        ;;

    "schema")
        echo -e "${YELLOW}[PostgreSQL Backup] Creating schema-only backup...${NC}"
        pg_dump \
            -h "$POSTGRES_HOST" \
            -p "$POSTGRES_PORT" \
            -U "$POSTGRES_USER" \
            -d "$POSTGRES_DB" \
            --verbose \
            --no-owner \
            --no-acl \
            --schema-only \
            --format=plain \
            --file="$OUTPUT_FILE" \
            2>&1 | grep -v "^pg_dump:"
        ;;

    "data")
        echo -e "${YELLOW}[PostgreSQL Backup] Creating data-only backup...${NC}"
        pg_dump \
            -h "$POSTGRES_HOST" \
            -p "$POSTGRES_PORT" \
            -U "$POSTGRES_USER" \
            -d "$POSTGRES_DB" \
            --verbose \
            --no-owner \
            --no-acl \
            --data-only \
            --format=plain \
            --file="$OUTPUT_FILE" \
            2>&1 | grep -v "^pg_dump:"
        ;;

    *)
        echo -e "${RED}[PostgreSQL Backup] Error: Invalid backup type: $BACKUP_TYPE${NC}"
        echo "Valid types: full, schema, data"
        exit 1
        ;;
esac

# Check if backup file was created
if [ ! -f "$OUTPUT_FILE" ]; then
    echo -e "${RED}[PostgreSQL Backup] Error: Backup file was not created${NC}"
    exit 1
fi

# Get backup file size
BACKUP_SIZE=$(du -h "$OUTPUT_FILE" | cut -f1)

echo ""
echo -e "${GREEN}[PostgreSQL Backup] Backup completed successfully${NC}"
echo "  File: $OUTPUT_FILE"
echo "  Size: $BACKUP_SIZE"

# Verify backup integrity
echo ""
echo -e "${YELLOW}[PostgreSQL Backup] Verifying backup integrity...${NC}"

# Count CREATE TABLE statements
TABLE_COUNT=$(grep -c "CREATE TABLE" "$OUTPUT_FILE" || true)

# Count INSERT statements
INSERT_COUNT=$(grep -c "^COPY " "$OUTPUT_FILE" || true)

# Check for errors in backup
ERROR_COUNT=$(grep -c "ERROR:" "$OUTPUT_FILE" || true)

echo "  Tables: $TABLE_COUNT"
echo "  Data rows: $INSERT_COUNT"
echo "  Errors: $ERROR_COUNT"

if [ "$ERROR_COUNT" -gt 0 ]; then
    echo -e "${RED}[PostgreSQL Backup] Warning: Backup contains errors${NC}"
    exit 1
fi

# Calculate checksum
CHECKSUM=$(sha256sum "$OUTPUT_FILE" | cut -d' ' -f1)
echo "  Checksum: $CHECKSUM"

# Save backup metadata
METADATA_FILE="${OUTPUT_FILE}.metadata.json"
cat > "$METADATA_FILE" << EOF
{
  "database": "$POSTGRES_DB",
  "host": "$POSTGRES_HOST",
  "port": $POSTGRES_PORT,
  "backup_type": "$BACKUP_TYPE",
  "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "file": "$OUTPUT_FILE",
  "size_bytes": $(stat -f%z "$OUTPUT_FILE" 2>/dev/null || stat -c%s "$OUTPUT_FILE"),
  "size_human": "$BACKUP_SIZE",
  "table_count": $TABLE_COUNT,
  "insert_count": $INSERT_COUNT,
  "checksum": "$CHECKSUM",
  "error_count": $ERROR_COUNT
}
EOF

echo ""
echo -e "${GREEN}[PostgreSQL Backup] Backup verification complete${NC}"
echo "  Metadata: $METADATA_FILE"

# Optional: Test restore to temporary database (if VERIFY_RESTORE=true)
if [ "${VERIFY_RESTORE:-false}" == "true" ]; then
    echo ""
    echo -e "${YELLOW}[PostgreSQL Backup] Testing restore to temporary database...${NC}"

    TEMP_DB="jarvis_backup_test_$(date +%s)"

    # Create temporary database
    psql -h "$POSTGRES_HOST" -p "$POSTGRES_PORT" -U "$POSTGRES_USER" -d postgres \
        -c "CREATE DATABASE $TEMP_DB;" > /dev/null 2>&1

    # Restore backup
    if psql -h "$POSTGRES_HOST" -p "$POSTGRES_PORT" -U "$POSTGRES_USER" -d "$TEMP_DB" \
        -f "$OUTPUT_FILE" > /dev/null 2>&1; then
        echo -e "${GREEN}[PostgreSQL Backup] Restore test successful${NC}"
    else
        echo -e "${RED}[PostgreSQL Backup] Restore test failed${NC}"
        psql -h "$POSTGRES_HOST" -p "$POSTGRES_PORT" -U "$POSTGRES_USER" -d postgres \
            -c "DROP DATABASE $TEMP_DB;" > /dev/null 2>&1
        exit 1
    fi

    # Drop temporary database
    psql -h "$POSTGRES_HOST" -p "$POSTGRES_PORT" -U "$POSTGRES_USER" -d postgres \
        -c "DROP DATABASE $TEMP_DB;" > /dev/null 2>&1

    echo -e "${GREEN}[PostgreSQL Backup] Temporary database cleaned up${NC}"
fi

echo ""
echo -e "${GREEN}✓ PostgreSQL backup complete${NC}"
exit 0

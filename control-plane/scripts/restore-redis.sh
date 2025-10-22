#!/bin/bash
#
# Redis Restore Script
#
# Restores Redis database from backup
# Supports:
# - RDB file restoration
# - JSON import
# - TTL preservation
# - Dry-run mode
#
# Usage: ./restore-redis.sh [backup_file] [options]
#   --dry-run: Test restore without making changes
#   --flush: Flush existing data before restore
#   --from-json: Restore from JSON backup instead of RDB
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
FLUSH=false
FROM_JSON=false
REDIS_HOST="${REDIS_HOST:-localhost}"
REDIS_PORT="${REDIS_PORT:-6379}"
REDIS_PASSWORD="${REDIS_PASSWORD:-}"
REDIS_CLI="redis-cli -h $REDIS_HOST -p $REDIS_PORT"
BACKUP_ENCRYPTION_KEY="${BACKUP_ENCRYPTION_KEY:-}"

# Add password if provided
if [ -n "$REDIS_PASSWORD" ]; then
    REDIS_CLI="$REDIS_CLI -a $REDIS_PASSWORD"
fi

# Parse arguments
shift || true
while [[ $# -gt 0 ]]; do
    case $1 in
        --dry-run)
            DRY_RUN=true
            shift
            ;;
        --flush)
            FLUSH=true
            shift
            ;;
        --from-json)
            FROM_JSON=true
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
    echo "Usage: $0 <backup_file> [--dry-run] [--flush] [--from-json]"
    exit 1
fi

if [ ! -f "$BACKUP_FILE" ]; then
    echo -e "${RED}Error: Backup file not found: $BACKUP_FILE${NC}"
    exit 1
fi

echo -e "${GREEN}[Redis Restore] Starting restore...${NC}"
echo "  Host: $REDIS_HOST:$REDIS_PORT"
echo "  Backup: $BACKUP_FILE"
echo "  Dry Run: $DRY_RUN"
echo "  Flush: $FLUSH"
echo "  From JSON: $FROM_JSON"
echo ""

# Create temporary directory
TEMP_DIR=$(mktemp -d)
trap "rm -rf $TEMP_DIR" EXIT

# Check if Redis is accessible
if ! $REDIS_CLI PING > /dev/null 2>&1; then
    echo -e "${RED}Error: Redis is not accessible${NC}"
    exit 1
fi

# Restore from JSON
if [ "$FROM_JSON" = true ]; then
    echo -e "${YELLOW}[Redis Restore] Restoring from JSON...${NC}"

    RESTORE_FILE="$BACKUP_FILE"

    # Decompress if needed
    if [[ "$BACKUP_FILE" == *.gz ]]; then
        echo -e "${YELLOW}[Redis Restore] Decompressing backup...${NC}"
        RESTORE_FILE="$TEMP_DIR/backup.json"
        gunzip -c "$BACKUP_FILE" > "$RESTORE_FILE"
    fi

    # Parse JSON and restore
    KEY_COUNT=$(jq '.data | length' "$RESTORE_FILE")
    echo "  Keys to restore: $KEY_COUNT"

    if [ "$DRY_RUN" = true ]; then
        echo -e "${GREEN}[Redis Restore] Dry run complete${NC}"
        exit 0
    fi

    # Flush if requested
    if [ "$FLUSH" = true ]; then
        echo -e "${YELLOW}[Redis Restore] Flushing existing data...${NC}"
        $REDIS_CLI FLUSHALL
    fi

    # Restore each key
    jq -r '.data | to_entries[] | @json' "$RESTORE_FILE" | while read -r entry; do
        KEY=$(echo "$entry" | jq -r '.key')
        TYPE=$(echo "$entry" | jq -r '.value.type')
        VALUE=$(echo "$entry" | jq -r '.value.value')
        TTL=$(echo "$entry" | jq -r '.value.ttl')

        # Restore based on type
        case "$TYPE" in
            "string")
                $REDIS_CLI SET "$KEY" "$VALUE" > /dev/null
                ;;
            "list")
                # Clear existing list
                $REDIS_CLI DEL "$KEY" > /dev/null
                # Add items
                echo "$VALUE" | jq -r '.[]' | while read -r item; do
                    $REDIS_CLI RPUSH "$KEY" "$item" > /dev/null
                done
                ;;
            "set")
                $REDIS_CLI DEL "$KEY" > /dev/null
                echo "$VALUE" | jq -r '.[]' | while read -r item; do
                    $REDIS_CLI SADD "$KEY" "$item" > /dev/null
                done
                ;;
            *)
                echo -e "${YELLOW}Warning: Skipping key $KEY (unsupported type: $TYPE)${NC}"
                ;;
        esac

        # Set TTL if not -1
        if [ "$TTL" != "-1" ]; then
            $REDIS_CLI EXPIRE "$KEY" "$TTL" > /dev/null
        fi
    done

    echo -e "${GREEN}[Redis Restore] JSON restore complete${NC}"

else
    # Restore from RDB
    echo -e "${YELLOW}[Redis Restore] Restoring from RDB...${NC}"

    RESTORE_FILE="$BACKUP_FILE"

    # Decompress if needed
    if [[ "$BACKUP_FILE" == *.gz ]]; then
        echo -e "${YELLOW}[Redis Restore] Decompressing backup...${NC}"
        RESTORE_FILE="$TEMP_DIR/backup.rdb.enc"
        gunzip -c "$BACKUP_FILE" > "$RESTORE_FILE"
    fi

    # Decrypt if needed
    if [[ "$RESTORE_FILE" == *.enc ]]; then
        echo -e "${YELLOW}[Redis Restore] Decrypting backup...${NC}"

        if [ -z "$BACKUP_ENCRYPTION_KEY" ]; then
            echo -e "${RED}Error: BACKUP_ENCRYPTION_KEY not set${NC}"
            exit 1
        fi

        DECRYPTED_FILE="$TEMP_DIR/backup.rdb"

        python3 -c "
import sys
from cryptography.hazmat.primitives.ciphers import Cipher, algorithms, modes
from cryptography.hazmat.backends import default_backend

with open('$RESTORE_FILE', 'rb') as f:
    data = f.read()

iv = data[:16]
auth_tag = data[-16:]
ciphertext = data[16:-16]

key = bytes.fromhex('$BACKUP_ENCRYPTION_KEY')
cipher = Cipher(algorithms.AES(key), modes.GCM(iv, auth_tag), backend=default_backend())
decryptor = cipher.decryptor()
plaintext = decryptor.update(ciphertext) + decryptor.finalize()

with open('$DECRYPTED_FILE', 'wb') as f:
    f.write(plaintext)
" 2>/dev/null || {
            echo -e "${RED}Error: Decryption failed${NC}"
            exit 1
        }

        RESTORE_FILE="$DECRYPTED_FILE"
    fi

    # Verify RDB file
    if command -v redis-check-rdb > /dev/null 2>&1; then
        if ! redis-check-rdb "$RESTORE_FILE" > /dev/null 2>&1; then
            echo -e "${RED}Error: Invalid RDB file${NC}"
            exit 1
        fi
    fi

    if [ "$DRY_RUN" = true ]; then
        echo -e "${GREEN}[Redis Restore] Dry run complete (RDB file is valid)${NC}"
        exit 0
    fi

    # Get Redis data directory
    REDIS_DIR=$($REDIS_CLI CONFIG GET dir | tail -n1 | tr -d '\r')
    REDIS_DBFILENAME=$($REDIS_CLI CONFIG GET dbfilename | tail -n1 | tr -d '\r')
    RDB_PATH="$REDIS_DIR/$REDIS_DBFILENAME"

    echo "  Target RDB: $RDB_PATH"

    # Flush if requested
    if [ "$FLUSH" = true ]; then
        echo -e "${YELLOW}[Redis Restore] Flushing existing data...${NC}"
        $REDIS_CLI FLUSHALL
    fi

    # Stop Redis, replace RDB, restart
    echo -e "${YELLOW}[Redis Restore] Stopping Redis to replace RDB file...${NC}"

    # Save current state
    $REDIS_CLI SAVE

    # Copy backup to Redis data directory
    cp "$RESTORE_FILE" "$RDB_PATH"

    # Restart Redis (this will load the new RDB file)
    echo -e "${YELLOW}[Redis Restore] Restarting Redis...${NC}"

    # Wait for Redis to restart
    sleep 2

    # Verify restore
    if ! $REDIS_CLI PING > /dev/null 2>&1; then
        echo -e "${RED}Error: Redis failed to restart${NC}"
        exit 1
    fi

    echo -e "${GREEN}[Redis Restore] RDB restore complete${NC}"
fi

# Verify restore
echo ""
echo -e "${YELLOW}[Redis Restore] Verifying restore...${NC}"
RESTORED_KEYS=$($REDIS_CLI DBSIZE | cut -d: -f2 | tr -d '\r')
echo "  Restored keys: $RESTORED_KEYS"

echo ""
echo -e "${GREEN}✓ Redis restore complete${NC}"
exit 0

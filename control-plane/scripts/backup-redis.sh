#!/bin/bash
#
# Redis Backup Script
#
# Performs Redis backup by:
# 1. Creating RDB snapshot
# 2. Exporting to JSON for portability
# 3. Preserving TTL information
#
# Usage: ./backup-redis.sh [output_file]
#

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
OUTPUT_FILE="${1:-/var/backups/jarvis/redis/redis_$(date +%Y%m%d_%H%M%S).rdb}"
REDIS_HOST="${REDIS_HOST:-localhost}"
REDIS_PORT="${REDIS_PORT:-6379}"
REDIS_PASSWORD="${REDIS_PASSWORD:-}"
REDIS_CLI="redis-cli -h $REDIS_HOST -p $REDIS_PORT"

# Add password if provided
if [ -n "$REDIS_PASSWORD" ]; then
    REDIS_CLI="$REDIS_CLI -a $REDIS_PASSWORD"
fi

# Ensure output directory exists
mkdir -p "$(dirname "$OUTPUT_FILE")"

echo -e "${GREEN}[Redis Backup] Starting backup...${NC}"
echo "  Host: $REDIS_HOST:$REDIS_PORT"
echo "  Output: $OUTPUT_FILE"
echo ""

# Check if Redis is accessible
if ! $REDIS_CLI PING > /dev/null 2>&1; then
    echo -e "${RED}[Redis Backup] Error: Redis is not accessible${NC}"
    exit 1
fi

# Get Redis info
REDIS_VERSION=$($REDIS_CLI INFO SERVER | grep "redis_version" | cut -d: -f2 | tr -d '\r')
KEY_COUNT=$($REDIS_CLI DBSIZE | cut -d: -f2 | tr -d '\r')

echo -e "${YELLOW}[Redis Backup] Redis Info:${NC}"
echo "  Version: $REDIS_VERSION"
echo "  Keys: $KEY_COUNT"
echo ""

# Trigger Redis save
echo -e "${YELLOW}[Redis Backup] Creating RDB snapshot...${NC}"
SAVE_RESULT=$($REDIS_CLI BGSAVE)

if [[ "$SAVE_RESULT" != *"Background saving started"* ]] && [[ "$SAVE_RESULT" != *"OK"* ]]; then
    echo -e "${RED}[Redis Backup] Error: Failed to start background save${NC}"
    exit 1
fi

# Wait for save to complete
echo -e "${YELLOW}[Redis Backup] Waiting for snapshot to complete...${NC}"
WAIT_COUNT=0
MAX_WAIT=60 # 60 seconds max

while [ $WAIT_COUNT -lt $MAX_WAIT ]; do
    LASTSAVE=$($REDIS_CLI LASTSAVE)
    sleep 1
    CURRENT_SAVE=$($REDIS_CLI LASTSAVE)

    if [ "$CURRENT_SAVE" != "$LASTSAVE" ]; then
        echo -e "${GREEN}[Redis Backup] Snapshot complete${NC}"
        break
    fi

    WAIT_COUNT=$((WAIT_COUNT + 1))

    if [ $WAIT_COUNT -ge $MAX_WAIT ]; then
        echo -e "${RED}[Redis Backup] Error: Snapshot timeout${NC}"
        exit 1
    fi
done

# Get Redis data directory
REDIS_DIR=$($REDIS_CLI CONFIG GET dir | tail -n1 | tr -d '\r')
REDIS_DBFILENAME=$($REDIS_CLI CONFIG GET dbfilename | tail -n1 | tr -d '\r')
RDB_FILE="$REDIS_DIR/$REDIS_DBFILENAME"

echo ""
echo -e "${YELLOW}[Redis Backup] Copying RDB file...${NC}"
echo "  Source: $RDB_FILE"

# Copy RDB file
if [ -f "$RDB_FILE" ]; then
    cp "$RDB_FILE" "$OUTPUT_FILE"
    echo -e "${GREEN}[Redis Backup] RDB file copied${NC}"
else
    echo -e "${RED}[Redis Backup] Error: RDB file not found${NC}"
    exit 1
fi

# Export to JSON for portability
JSON_FILE="${OUTPUT_FILE%.rdb}.json"
echo ""
echo -e "${YELLOW}[Redis Backup] Exporting to JSON...${NC}"

# Create JSON export with TTL information
{
    echo "{"
    echo "  \"metadata\": {"
    echo "    \"redis_version\": \"$REDIS_VERSION\","
    echo "    \"timestamp\": \"$(date -u +%Y-%m-%dT%H:%M:%SZ)\","
    echo "    \"key_count\": $KEY_COUNT"
    echo "  },"
    echo "  \"data\": {"

    FIRST_KEY=true

    # Get all keys
    KEYS=$($REDIS_CLI KEYS '*' 2>/dev/null || echo "")

    if [ -n "$KEYS" ]; then
        while IFS= read -r key; do
            if [ -z "$key" ]; then
                continue
            fi

            # Add comma for all but first key
            if [ "$FIRST_KEY" = false ]; then
                echo ","
            fi
            FIRST_KEY=false

            # Get key type
            KEY_TYPE=$($REDIS_CLI TYPE "$key" | tr -d '\r')

            # Get TTL (-1 = no expiry, -2 = key doesn't exist)
            TTL=$($REDIS_CLI TTL "$key" | tr -d '\r')

            # Get value based on type
            case "$KEY_TYPE" in
                "string")
                    VALUE=$($REDIS_CLI GET "$key" | sed 's/"/\\"/g')
                    echo -n "    \"$key\": {\"type\": \"string\", \"value\": \"$VALUE\", \"ttl\": $TTL}"
                    ;;
                "list")
                    VALUE=$($REDIS_CLI LRANGE "$key" 0 -1 | sed 's/"/\\"/g' | tr '\n' ',' | sed 's/,$//')
                    echo -n "    \"$key\": {\"type\": \"list\", \"value\": [$VALUE], \"ttl\": $TTL}"
                    ;;
                "set")
                    VALUE=$($REDIS_CLI SMEMBERS "$key" | sed 's/"/\\"/g' | tr '\n' ',' | sed 's/,$//')
                    echo -n "    \"$key\": {\"type\": \"set\", \"value\": [$VALUE], \"ttl\": $TTL}"
                    ;;
                "hash")
                    VALUE=$($REDIS_CLI HGETALL "$key" | sed 's/"/\\"/g')
                    echo -n "    \"$key\": {\"type\": \"hash\", \"value\": {}, \"ttl\": $TTL}"
                    ;;
                "zset")
                    VALUE=$($REDIS_CLI ZRANGE "$key" 0 -1 WITHSCORES | sed 's/"/\\"/g')
                    echo -n "    \"$key\": {\"type\": \"zset\", \"value\": [], \"ttl\": $TTL}"
                    ;;
                *)
                    echo -n "    \"$key\": {\"type\": \"$KEY_TYPE\", \"value\": null, \"ttl\": $TTL}"
                    ;;
            esac
        done <<< "$KEYS"
    fi

    echo ""
    echo "  }"
    echo "}"
} > "$JSON_FILE"

echo -e "${GREEN}[Redis Backup] JSON export complete${NC}"
echo "  File: $JSON_FILE"

# Get file sizes
RDB_SIZE=$(du -h "$OUTPUT_FILE" | cut -f1)
JSON_SIZE=$(du -h "$JSON_FILE" | cut -f1)

echo ""
echo -e "${GREEN}[Redis Backup] Backup completed successfully${NC}"
echo "  RDB File: $OUTPUT_FILE ($RDB_SIZE)"
echo "  JSON File: $JSON_FILE ($JSON_SIZE)"

# Verify backup integrity
echo ""
echo -e "${YELLOW}[Redis Backup] Verifying backup integrity...${NC}"

# Calculate checksums
RDB_CHECKSUM=$(sha256sum "$OUTPUT_FILE" | cut -d' ' -f1)
JSON_CHECKSUM=$(sha256sum "$JSON_FILE" | cut -d' ' -f1)

echo "  RDB Checksum: $RDB_CHECKSUM"
echo "  JSON Checksum: $JSON_CHECKSUM"

# Save backup metadata
METADATA_FILE="${OUTPUT_FILE}.metadata.json"
cat > "$METADATA_FILE" << EOF
{
  "redis_version": "$REDIS_VERSION",
  "host": "$REDIS_HOST",
  "port": $REDIS_PORT,
  "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "key_count": $KEY_COUNT,
  "rdb_file": "$OUTPUT_FILE",
  "rdb_size_bytes": $(stat -f%z "$OUTPUT_FILE" 2>/dev/null || stat -c%s "$OUTPUT_FILE"),
  "rdb_size_human": "$RDB_SIZE",
  "rdb_checksum": "$RDB_CHECKSUM",
  "json_file": "$JSON_FILE",
  "json_size_bytes": $(stat -f%z "$JSON_FILE" 2>/dev/null || stat -c%s "$JSON_FILE"),
  "json_size_human": "$JSON_SIZE",
  "json_checksum": "$JSON_CHECKSUM"
}
EOF

echo ""
echo -e "${GREEN}[Redis Backup] Backup verification complete${NC}"
echo "  Metadata: $METADATA_FILE"

# Test RDB file validity (if redis-check-rdb is available)
if command -v redis-check-rdb > /dev/null 2>&1; then
    echo ""
    echo -e "${YELLOW}[Redis Backup] Checking RDB file integrity...${NC}"

    if redis-check-rdb "$OUTPUT_FILE" > /dev/null 2>&1; then
        echo -e "${GREEN}[Redis Backup] RDB file is valid${NC}"
    else
        echo -e "${RED}[Redis Backup] Warning: RDB file may be corrupted${NC}"
        exit 1
    fi
fi

echo ""
echo -e "${GREEN}✓ Redis backup complete${NC}"
exit 0

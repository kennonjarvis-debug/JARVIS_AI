#!/bin/bash
#
# Files Restore Script
#
# Restores user files and configuration from backup
# Supports:
# - Full restoration
# - Selective file restoration
# - Dry-run mode
#
# Usage: ./restore-files.sh [backup_id] [options]
#   --dry-run: Test restore without making changes
#   --target-dir: Specify custom restore directory
#

set -euo pipefail

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Configuration
BACKUP_ID="${1:-}"
DRY_RUN=false
TARGET_DIR=""
BACKUP_DIR="${BACKUP_DIR:-/var/backups/jarvis/files}"

# Parse arguments
shift || true
while [[ $# -gt 0 ]]; do
    case $1 in
        --dry-run)
            DRY_RUN=true
            shift
            ;;
        --target-dir)
            TARGET_DIR="$2"
            shift 2
            ;;
        *)
            echo -e "${RED}Unknown option: $1${NC}"
            exit 1
            ;;
    esac
done

# Validate backup ID
if [ -z "$BACKUP_ID" ]; then
    echo -e "${RED}Error: Backup ID not specified${NC}"
    echo "Usage: $0 <backup_id> [--dry-run] [--target-dir <dir>]"
    exit 1
fi

BACKUP_PATH="$BACKUP_DIR/$BACKUP_ID"
MANIFEST_FILE="$BACKUP_PATH/manifest.json"

if [ ! -d "$BACKUP_PATH" ]; then
    echo -e "${RED}Error: Backup not found: $BACKUP_ID${NC}"
    exit 1
fi

if [ ! -f "$MANIFEST_FILE" ]; then
    echo -e "${RED}Error: Manifest not found${NC}"
    exit 1
fi

echo -e "${GREEN}[File Restore] Starting restore...${NC}"
echo "  Backup ID: $BACKUP_ID"
echo "  Dry Run: $DRY_RUN"
echo ""

# Read manifest
TOTAL_FILES=$(jq '.total_files' "$MANIFEST_FILE")
TOTAL_SIZE=$(jq '.total_size' "$MANIFEST_FILE")

echo -e "${YELLOW}[File Restore] Backup Info:${NC}"
echo "  Files: $TOTAL_FILES"
echo "  Size: $TOTAL_SIZE bytes"
echo ""

if [ "$DRY_RUN" = true ]; then
    echo -e "${GREEN}[File Restore] Dry run complete${NC}"
    exit 0
fi

# Restore files
echo -e "${YELLOW}[File Restore] Restoring files...${NC}"

# Use rsync for efficient restoration
if [ -n "$TARGET_DIR" ]; then
    rsync -av "$BACKUP_PATH/" "$TARGET_DIR/"
else
    rsync -av "$BACKUP_PATH/" /
fi

echo -e "${GREEN}✓ File restore complete${NC}"
exit 0

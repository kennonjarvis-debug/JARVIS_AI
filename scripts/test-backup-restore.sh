#!/bin/bash
#
# Backup and Restore Testing Script
#
# Automated testing of backup and restore procedures
# Features:
# - Full backup + restore cycle
# - Data integrity verification
# - Performance benchmarks
# - Automated reporting
#
# Usage: ./test-backup-restore.sh [options]
#   --skip-postgres: Skip PostgreSQL testing
#   --skip-redis: Skip Redis testing
#   --skip-files: Skip file backup testing
#

set -euo pipefail

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
SKIP_POSTGRES=false
SKIP_REDIS=false
SKIP_FILES=false
TEST_DIR="/tmp/jarvis-backup-test-$(date +%s)"
BACKUP_DIR="$TEST_DIR/backups"
RESTORE_DIR="$TEST_DIR/restore"

# Parse arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --skip-postgres)
            SKIP_POSTGRES=true
            shift
            ;;
        --skip-redis)
            SKIP_REDIS=true
            shift
            ;;
        --skip-files)
            SKIP_FILES=true
            shift
            ;;
        *)
            echo -e "${RED}Unknown option: $1${NC}"
            exit 1
            ;;
    esac
done

# Create test directories
mkdir -p "$BACKUP_DIR"
mkdir -p "$RESTORE_DIR"

# Cleanup on exit
trap "rm -rf $TEST_DIR" EXIT

echo -e "${BLUE}================================${NC}"
echo -e "${BLUE}Backup & Restore Testing${NC}"
echo -e "${BLUE}================================${NC}"
echo ""

# Test results
TESTS_PASSED=0
TESTS_FAILED=0
TESTS_TOTAL=0

# Function to run test
run_test() {
    local test_name="$1"
    local test_command="$2"

    TESTS_TOTAL=$((TESTS_TOTAL + 1))

    echo -e "${YELLOW}[TEST $TESTS_TOTAL] $test_name${NC}"

    local start_time=$(date +%s%3N)

    if eval "$test_command"; then
        local end_time=$(date +%s%3N)
        local duration=$((end_time - start_time))

        echo -e "${GREEN}✓ PASSED${NC} (${duration}ms)"
        TESTS_PASSED=$((TESTS_PASSED + 1))
        echo ""
        return 0
    else
        local end_time=$(date +%s%3N)
        local duration=$((end_time - start_time))

        echo -e "${RED}✗ FAILED${NC} (${duration}ms)"
        TESTS_FAILED=$((TESTS_FAILED + 1))
        echo ""
        return 1
    fi
}

# PostgreSQL Tests
if [ "$SKIP_POSTGRES" = false ]; then
    echo -e "${BLUE}PostgreSQL Backup & Restore Tests${NC}"
    echo -e "${BLUE}----------------------------------${NC}"
    echo ""

    # Test 1: Create PostgreSQL backup
    run_test "PostgreSQL: Create full backup" \
        "bash scripts/backup-postgres.sh $BACKUP_DIR/test_postgres.sql full"

    # Test 2: Verify backup file exists
    run_test "PostgreSQL: Verify backup file exists" \
        "[ -f $BACKUP_DIR/test_postgres.sql ]"

    # Test 3: Verify backup metadata
    run_test "PostgreSQL: Verify backup metadata" \
        "[ -f $BACKUP_DIR/test_postgres.sql.metadata.json ]"

    # Test 4: Dry run restore
    run_test "PostgreSQL: Dry run restore" \
        "bash scripts/restore-postgres.sh $BACKUP_DIR/test_postgres.sql --dry-run"

    # Test 5: Full restore (if safe test environment)
    if [ "${ALLOW_DESTRUCTIVE_TESTS:-false}" = "true" ]; then
        run_test "PostgreSQL: Full restore" \
            "bash scripts/restore-postgres.sh $BACKUP_DIR/test_postgres.sql --drop-existing"
    fi
fi

# Redis Tests
if [ "$SKIP_REDIS" = false ]; then
    echo -e "${BLUE}Redis Backup & Restore Tests${NC}"
    echo -e "${BLUE}---------------------------${NC}"
    echo ""

    # Test 1: Create Redis backup
    run_test "Redis: Create RDB backup" \
        "bash scripts/backup-redis.sh $BACKUP_DIR/test_redis.rdb"

    # Test 2: Verify RDB file exists
    run_test "Redis: Verify RDB backup file" \
        "[ -f $BACKUP_DIR/test_redis.rdb ]"

    # Test 3: Verify JSON export exists
    run_test "Redis: Verify JSON export" \
        "[ -f $BACKUP_DIR/test_redis.json ]"

    # Test 4: Verify backup metadata
    run_test "Redis: Verify backup metadata" \
        "[ -f $BACKUP_DIR/test_redis.rdb.metadata.json ]"

    # Test 5: Dry run restore from JSON
    run_test "Redis: Dry run restore from JSON" \
        "bash scripts/restore-redis.sh $BACKUP_DIR/test_redis.json --dry-run --from-json"
fi

# File Backup Tests
if [ "$SKIP_FILES" = false ]; then
    echo -e "${BLUE}File Backup & Restore Tests${NC}"
    echo -e "${BLUE}--------------------------${NC}"
    echo ""

    # Create test files
    TEST_FILE_DIR="$TEST_DIR/test-files"
    mkdir -p "$TEST_FILE_DIR"
    echo "Test content 1" > "$TEST_FILE_DIR/file1.txt"
    echo "Test content 2" > "$TEST_FILE_DIR/file2.txt"
    mkdir -p "$TEST_FILE_DIR/subdir"
    echo "Test content 3" > "$TEST_FILE_DIR/subdir/file3.txt"

    # Test 1: Create file backup
    run_test "Files: Create backup archive" \
        "tar -czf $BACKUP_DIR/test_files.tar.gz -C $TEST_FILE_DIR ."

    # Test 2: Verify backup archive
    run_test "Files: Verify backup archive" \
        "[ -f $BACKUP_DIR/test_files.tar.gz ]"

    # Test 3: Restore files
    run_test "Files: Restore from archive" \
        "mkdir -p $RESTORE_DIR/files && tar -xzf $BACKUP_DIR/test_files.tar.gz -C $RESTORE_DIR/files"

    # Test 4: Verify restored files
    run_test "Files: Verify restored files" \
        "[ -f $RESTORE_DIR/files/file1.txt ] && [ -f $RESTORE_DIR/files/file2.txt ] && [ -f $RESTORE_DIR/files/subdir/file3.txt ]"

    # Test 5: Verify file content
    run_test "Files: Verify file content integrity" \
        "diff $TEST_FILE_DIR/file1.txt $RESTORE_DIR/files/file1.txt"
fi

# Performance Benchmarks
echo -e "${BLUE}Performance Benchmarks${NC}"
echo -e "${BLUE}---------------------${NC}"
echo ""

if [ -f "$BACKUP_DIR/test_postgres.sql" ]; then
    POSTGRES_SIZE=$(du -h "$BACKUP_DIR/test_postgres.sql" | cut -f1)
    echo "PostgreSQL backup size: $POSTGRES_SIZE"
fi

if [ -f "$BACKUP_DIR/test_redis.rdb" ]; then
    REDIS_SIZE=$(du -h "$BACKUP_DIR/test_redis.rdb" | cut -f1)
    echo "Redis RDB backup size: $REDIS_SIZE"
fi

if [ -f "$BACKUP_DIR/test_files.tar.gz" ]; then
    FILES_SIZE=$(du -h "$BACKUP_DIR/test_files.tar.gz" | cut -f1)
    echo "File backup size: $FILES_SIZE"
fi

echo ""

# Test Summary
echo -e "${BLUE}================================${NC}"
echo -e "${BLUE}Test Summary${NC}"
echo -e "${BLUE}================================${NC}"
echo ""
echo "Total Tests: $TESTS_TOTAL"
echo -e "${GREEN}Passed: $TESTS_PASSED${NC}"
echo -e "${RED}Failed: $TESTS_FAILED${NC}"
echo ""

if [ $TESTS_FAILED -eq 0 ]; then
    echo -e "${GREEN}✓ All tests passed!${NC}"
    exit 0
else
    echo -e "${RED}✗ Some tests failed${NC}"
    exit 1
fi

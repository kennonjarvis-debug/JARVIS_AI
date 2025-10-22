#!/bin/bash

# PostgreSQL Streaming Replication Setup for Jarvis AI Platform
# Sets up 1 primary + 2 read replicas with automatic failover

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Configuration
PRIMARY_HOST="${PRIMARY_HOST:-localhost}"
PRIMARY_PORT="${PRIMARY_PORT:-5432}"
REPLICA1_PORT="${REPLICA1_PORT:-5433}"
REPLICA2_PORT="${REPLICA2_PORT:-5434}"
REPLICATION_USER="${REPLICATION_USER:-replicator}"
REPLICATION_PASSWORD="${REPLICATION_PASSWORD:-replicator_password}"
POSTGRES_USER="${POSTGRES_USER:-postgres}"

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo "=========================================="
echo "PostgreSQL Replication Setup for Jarvis"
echo "=========================================="
echo "Configuration:"
echo "  - Primary: ${PRIMARY_HOST}:${PRIMARY_PORT}"
echo "  - Replica 1: localhost:${REPLICA1_PORT}"
echo "  - Replica 2: localhost:${REPLICA2_PORT}"
echo "  - Replication User: ${REPLICATION_USER}"
echo "=========================================="

# Check if PostgreSQL is installed
if ! command -v psql &> /dev/null; then
    echo -e "${RED}Error: psql not found${NC}"
    echo "Install PostgreSQL first:"
    echo "  - macOS: brew install postgresql@15"
    echo "  - Ubuntu: sudo apt-get install postgresql-15"
    exit 1
fi

# Step 1: Configure Primary Server
echo -e "${YELLOW}Step 1: Configuring Primary Server...${NC}"

cat > "${SCRIPT_DIR}/primary.conf" <<EOF
# PostgreSQL Primary Configuration for Jarvis AI Platform
# Streaming replication with synchronous commit

# Connection Settings
listen_addresses = '*'
port = ${PRIMARY_PORT}
max_connections = 200
superuser_reserved_connections = 3

# Replication Settings (Primary)
wal_level = replica
max_wal_senders = 10
max_replication_slots = 10
wal_keep_size = 1GB
synchronous_commit = on
synchronous_standby_names = 'replica1,replica2'

# Resource Usage
shared_buffers = 4GB
effective_cache_size = 12GB
maintenance_work_mem = 1GB
checkpoint_completion_target = 0.9
wal_buffers = 16MB
default_statistics_target = 100
random_page_cost = 1.1
effective_io_concurrency = 200
work_mem = 20MB
min_wal_size = 2GB
max_wal_size = 8GB

# Query Tuning
max_parallel_workers_per_gather = 4
max_parallel_workers = 8
max_parallel_maintenance_workers = 4

# Logging
logging_collector = on
log_directory = 'log'
log_filename = 'postgresql-primary-%Y-%m-%d_%H%M%S.log'
log_line_prefix = '%t [%p]: [%l-1] user=%u,db=%d,app=%a,client=%h '
log_min_duration_statement = 1000
log_checkpoints = on
log_connections = on
log_disconnections = on
log_lock_waits = on
log_replication_commands = on

# Performance
shared_preload_libraries = 'pg_stat_statements'
pg_stat_statements.track = all
track_io_timing = on
track_functions = all

# Autovacuum
autovacuum = on
autovacuum_max_workers = 3
autovacuum_naptime = 10s
EOF

# Step 2: Create replication user on primary
echo -e "${YELLOW}Step 2: Creating replication user...${NC}"
cat > "${SCRIPT_DIR}/setup-replication-user.sql" <<EOF
-- Create replication user
CREATE USER ${REPLICATION_USER} WITH REPLICATION ENCRYPTED PASSWORD '${REPLICATION_PASSWORD}';

-- Grant necessary permissions
GRANT CONNECT ON DATABASE postgres TO ${REPLICATION_USER};
EOF

echo -e "${BLUE}Run this SQL on primary database:${NC}"
echo "psql -U ${POSTGRES_USER} -f ${SCRIPT_DIR}/setup-replication-user.sql"
echo ""

# Step 3: Configure pg_hba.conf for replication
echo -e "${YELLOW}Step 3: Configuring authentication...${NC}"
cat > "${SCRIPT_DIR}/pg_hba_replication.conf" <<EOF
# PostgreSQL Client Authentication Configuration
# Add these lines to your pg_hba.conf file

# TYPE  DATABASE        USER            ADDRESS                 METHOD

# Replication connections
host    replication     ${REPLICATION_USER}     127.0.0.1/32           md5
host    replication     ${REPLICATION_USER}     ::1/128                md5
host    replication     ${REPLICATION_USER}     0.0.0.0/0              md5

# Allow replica connections
host    all             all             172.16.0.0/12          md5
host    all             all             192.168.0.0/16         md5
host    all             all             10.0.0.0/8             md5
EOF

echo -e "${BLUE}Add these lines to pg_hba.conf on primary:${NC}"
cat "${SCRIPT_DIR}/pg_hba_replication.conf"
echo ""

# Step 4: Create base backup script
echo -e "${YELLOW}Step 4: Creating backup scripts...${NC}"
cat > "${SCRIPT_DIR}/create-replica.sh" <<'REPLICA_SCRIPT'
#!/bin/bash

# Script to create a new replica from primary

set -e

REPLICA_PORT=$1
REPLICA_NAME=$2
PRIMARY_HOST="${PRIMARY_HOST:-localhost}"
PRIMARY_PORT="${PRIMARY_PORT:-5432}"
REPLICATION_USER="${REPLICATION_USER:-replicator}"

if [ -z "$REPLICA_PORT" ] || [ -z "$REPLICA_NAME" ]; then
    echo "Usage: $0 <replica_port> <replica_name>"
    echo "Example: $0 5433 replica1"
    exit 1
fi

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DATA_DIR="${SCRIPT_DIR}/data/${REPLICA_NAME}"

echo "Creating replica: ${REPLICA_NAME}"
echo "  Port: ${REPLICA_PORT}"
echo "  Data: ${DATA_DIR}"

# Stop replica if running
pg_ctl -D "${DATA_DIR}" stop -m fast 2>/dev/null || true

# Remove old data
rm -rf "${DATA_DIR}"
mkdir -p "${DATA_DIR}"

# Create base backup
echo "Creating base backup from primary..."
pg_basebackup -h ${PRIMARY_HOST} -p ${PRIMARY_PORT} \
    -U ${REPLICATION_USER} -D "${DATA_DIR}" \
    -Fp -Xs -P -R

# Configure replica
cat > "${DATA_DIR}/postgresql.auto.conf" <<EOF
port = ${REPLICA_PORT}
primary_conninfo = 'host=${PRIMARY_HOST} port=${PRIMARY_PORT} user=${REPLICATION_USER} password=${REPLICATION_PASSWORD} application_name=${REPLICA_NAME}'
primary_slot_name = '${REPLICA_NAME}_slot'
EOF

# Create standby.signal
touch "${DATA_DIR}/standby.signal"

# Copy replica configuration
cp "${SCRIPT_DIR}/replica.conf" "${DATA_DIR}/postgresql.conf"

echo "Replica ${REPLICA_NAME} created successfully!"
echo "Start with: pg_ctl -D ${DATA_DIR} start"
REPLICA_SCRIPT

chmod +x "${SCRIPT_DIR}/create-replica.sh"

# Step 5: Create management script
cat > "${SCRIPT_DIR}/manage-replication.sh" <<'MGMT_SCRIPT'
#!/bin/bash

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PRIMARY_PORT="${PRIMARY_PORT:-5432}"
REPLICA1_PORT="${REPLICA1_PORT:-5433}"
REPLICA2_PORT="${REPLICA2_PORT:-5434}"

check_postgres() {
    local port=$1
    pg_isready -p ${port} > /dev/null 2>&1
    return $?
}

case "$1" in
    status)
        echo "PostgreSQL Replication Status"
        echo "=============================="

        # Check primary
        if check_postgres ${PRIMARY_PORT}; then
            echo "Primary (port ${PRIMARY_PORT}): RUNNING"
            psql -p ${PRIMARY_PORT} -c "SELECT * FROM pg_stat_replication;" 2>/dev/null || true
        else
            echo "Primary (port ${PRIMARY_PORT}): STOPPED"
        fi

        echo ""

        # Check replicas
        for port in ${REPLICA1_PORT} ${REPLICA2_PORT}; do
            if check_postgres ${port}; then
                echo "Replica (port ${port}): RUNNING"
                psql -p ${port} -c "SELECT pg_is_in_recovery();" 2>/dev/null || true
            else
                echo "Replica (port ${port}): STOPPED"
            fi
        done
        ;;

    start-primary)
        echo "Starting primary..."
        pg_ctl -D "${SCRIPT_DIR}/data/primary" start
        ;;

    stop-primary)
        echo "Stopping primary..."
        pg_ctl -D "${SCRIPT_DIR}/data/primary" stop -m fast
        ;;

    start-replica1)
        echo "Starting replica1..."
        pg_ctl -D "${SCRIPT_DIR}/data/replica1" start
        ;;

    stop-replica1)
        echo "Stopping replica1..."
        pg_ctl -D "${SCRIPT_DIR}/data/replica1" stop -m fast
        ;;

    start-replica2)
        echo "Starting replica2..."
        pg_ctl -D "${SCRIPT_DIR}/data/replica2" start
        ;;

    stop-replica2)
        echo "Stopping replica2..."
        pg_ctl -D "${SCRIPT_DIR}/data/replica2" stop -m fast
        ;;

    start-all)
        $0 start-primary
        sleep 3
        $0 start-replica1
        $0 start-replica2
        sleep 2
        $0 status
        ;;

    stop-all)
        $0 stop-replica1
        $0 stop-replica2
        sleep 2
        $0 stop-primary
        ;;

    promote)
        REPLICA=$2
        if [ -z "$REPLICA" ]; then
            echo "Usage: $0 promote <replica1|replica2>"
            exit 1
        fi
        echo "Promoting ${REPLICA} to primary..."
        pg_ctl -D "${SCRIPT_DIR}/data/${REPLICA}" promote
        ;;

    *)
        echo "Usage: $0 {status|start-primary|stop-primary|start-replica1|stop-replica1|start-replica2|stop-replica2|start-all|stop-all|promote <replica>}"
        echo ""
        echo "Commands:"
        echo "  status        - Show replication status"
        echo "  start-primary - Start primary server"
        echo "  stop-primary  - Stop primary server"
        echo "  start-replica1 - Start replica1"
        echo "  stop-replica1  - Stop replica1"
        echo "  start-replica2 - Start replica2"
        echo "  stop-replica2  - Stop replica2"
        echo "  start-all     - Start all servers"
        echo "  stop-all      - Stop all servers"
        echo "  promote       - Promote replica to primary"
        exit 1
        ;;
esac
MGMT_SCRIPT

chmod +x "${SCRIPT_DIR}/manage-replication.sh"

# Step 6: Create replication slots script
cat > "${SCRIPT_DIR}/setup-replication-slots.sql" <<EOF
-- Create replication slots for replicas
SELECT pg_create_physical_replication_slot('replica1_slot');
SELECT pg_create_physical_replication_slot('replica2_slot');

-- Verify slots
SELECT * FROM pg_replication_slots;
EOF

echo ""
echo "=========================================="
echo -e "${GREEN}Replication Setup Scripts Created!${NC}"
echo "=========================================="
echo ""
echo "Next Steps:"
echo ""
echo "1. Configure Primary Server:"
echo "   - Append ${SCRIPT_DIR}/primary.conf to postgresql.conf"
echo "   - Append ${SCRIPT_DIR}/pg_hba_replication.conf to pg_hba.conf"
echo "   - Restart PostgreSQL: sudo systemctl restart postgresql"
echo ""
echo "2. Create Replication User:"
echo "   psql -U postgres -f ${SCRIPT_DIR}/setup-replication-user.sql"
echo ""
echo "3. Create Replication Slots:"
echo "   psql -U postgres -f ${SCRIPT_DIR}/setup-replication-slots.sql"
echo ""
echo "4. Create Replicas:"
echo "   ${SCRIPT_DIR}/create-replica.sh ${REPLICA1_PORT} replica1"
echo "   ${SCRIPT_DIR}/create-replica.sh ${REPLICA2_PORT} replica2"
echo ""
echo "5. Start Replicas:"
echo "   pg_ctl -D ${SCRIPT_DIR}/data/replica1 start"
echo "   pg_ctl -D ${SCRIPT_DIR}/data/replica2 start"
echo ""
echo "6. Verify Replication:"
echo "   ${SCRIPT_DIR}/manage-replication.sh status"
echo ""
echo "Management Commands:"
echo "   ${SCRIPT_DIR}/manage-replication.sh status"
echo "   ${SCRIPT_DIR}/manage-replication.sh start-all"
echo "   ${SCRIPT_DIR}/manage-replication.sh stop-all"
echo "=========================================="

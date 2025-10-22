#!/bin/bash

# Redis Cluster Setup Script for Jarvis AI Platform
# Creates a 6-node Redis Cluster (3 masters + 3 replicas)
# Production-ready with automatic failover

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CLUSTER_NODES=6
REDIS_PORT_BASE=7000
CLUSTER_REPLICAS=1

echo "=========================================="
echo "Redis Cluster Setup for Jarvis AI"
echo "=========================================="
echo "Configuration:"
echo "  - Total Nodes: ${CLUSTER_NODES}"
echo "  - Masters: 3"
echo "  - Replicas: 3"
echo "  - Base Port: ${REDIS_PORT_BASE}"
echo "=========================================="

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if Redis is installed
if ! command -v redis-server &> /dev/null; then
    echo -e "${RED}Error: redis-server not found${NC}"
    echo "Install Redis first:"
    echo "  - macOS: brew install redis"
    echo "  - Ubuntu: sudo apt-get install redis-server"
    echo "  - CentOS: sudo yum install redis"
    exit 1
fi

if ! command -v redis-cli &> /dev/null; then
    echo -e "${RED}Error: redis-cli not found${NC}"
    exit 1
fi

# Create directories
echo -e "${YELLOW}Creating cluster directories...${NC}"
for i in $(seq 0 $((CLUSTER_NODES - 1))); do
    PORT=$((REDIS_PORT_BASE + i))
    mkdir -p "${SCRIPT_DIR}/cluster/${PORT}/data"
    mkdir -p "${SCRIPT_DIR}/cluster/${PORT}/logs"

    # Create node-specific config
    cat > "${SCRIPT_DIR}/cluster/${PORT}/redis.conf" <<EOF
# Redis Cluster Node ${PORT}
port ${PORT}
bind 0.0.0.0
protected-mode no
tcp-backlog 511
timeout 0
tcp-keepalive 300

# Cluster
cluster-enabled yes
cluster-config-file nodes-${PORT}.conf
cluster-node-timeout 5000
cluster-replica-validity-factor 10
cluster-migration-barrier 1
cluster-require-full-coverage no

# General
daemonize no
supervised no
pidfile ${SCRIPT_DIR}/cluster/${PORT}/redis-${PORT}.pid
loglevel notice
logfile ${SCRIPT_DIR}/cluster/${PORT}/logs/redis-${PORT}.log
databases 16

# Persistence
save 900 1
save 300 10
save 60 10000
stop-writes-on-bgsave-error yes
rdbcompression yes
rdbchecksum yes
dbfilename dump-${PORT}.rdb
dir ${SCRIPT_DIR}/cluster/${PORT}/data

appendonly yes
appendfilename "appendonly-${PORT}.aof"
appendfsync everysec
no-appendfsync-on-rewrite no
auto-aof-rewrite-percentage 100
auto-aof-rewrite-min-size 64mb

# Memory
maxmemory 1gb
maxmemory-policy allkeys-lru

# Security (uncomment and set password)
# requirepass your_redis_password
# masterauth your_redis_password

# Performance
io-threads 4
io-threads-do-reads yes
maxclients 10000

# Monitoring
slowlog-log-slower-than 10000
slowlog-max-len 128
latency-monitor-threshold 100
EOF

    echo -e "${GREEN}Created config for node ${PORT}${NC}"
done

# Start cluster nodes
echo -e "${YELLOW}Starting Redis cluster nodes...${NC}"
for i in $(seq 0 $((CLUSTER_NODES - 1))); do
    PORT=$((REDIS_PORT_BASE + i))
    cd "${SCRIPT_DIR}/cluster/${PORT}"

    # Check if already running
    if lsof -Pi :${PORT} -sTCP:LISTEN -t >/dev/null 2>&1; then
        echo -e "${YELLOW}Node ${PORT} already running, stopping first...${NC}"
        redis-cli -p ${PORT} shutdown nosave || true
        sleep 1
    fi

    # Start node
    redis-server "${SCRIPT_DIR}/cluster/${PORT}/redis.conf" > "${SCRIPT_DIR}/cluster/${PORT}/logs/redis-${PORT}.log" 2>&1 &
    echo $! > "${SCRIPT_DIR}/cluster/${PORT}/redis-${PORT}.pid"

    echo -e "${GREEN}Started Redis node on port ${PORT}${NC}"
done

# Wait for nodes to start
echo -e "${YELLOW}Waiting for nodes to initialize...${NC}"
sleep 3

# Verify all nodes are running
echo -e "${YELLOW}Verifying nodes...${NC}"
ALL_RUNNING=true
for i in $(seq 0 $((CLUSTER_NODES - 1))); do
    PORT=$((REDIS_PORT_BASE + i))
    if ! redis-cli -p ${PORT} ping &> /dev/null; then
        echo -e "${RED}Node ${PORT} is not responding${NC}"
        ALL_RUNNING=false
    else
        echo -e "${GREEN}Node ${PORT}: RUNNING${NC}"
    fi
done

if [ "$ALL_RUNNING" = false ]; then
    echo -e "${RED}Some nodes failed to start. Check logs in cluster/*/logs/${NC}"
    exit 1
fi

# Create cluster
echo -e "${YELLOW}Creating Redis Cluster...${NC}"
CLUSTER_NODES_ARG=""
for i in $(seq 0 $((CLUSTER_NODES - 1))); do
    PORT=$((REDIS_PORT_BASE + i))
    CLUSTER_NODES_ARG="${CLUSTER_NODES_ARG} 127.0.0.1:${PORT}"
done

# Use redis-cli to create cluster
echo -e "${YELLOW}Configuring cluster with ${CLUSTER_REPLICAS} replica(s) per master...${NC}"
redis-cli --cluster create ${CLUSTER_NODES_ARG} \
    --cluster-replicas ${CLUSTER_REPLICAS} \
    --cluster-yes

# Verify cluster
echo -e "${YELLOW}Verifying cluster status...${NC}"
sleep 2
redis-cli -p ${REDIS_PORT_BASE} cluster info

echo ""
echo -e "${GREEN}Cluster nodes:${NC}"
redis-cli -p ${REDIS_PORT_BASE} cluster nodes

# Create management script
cat > "${SCRIPT_DIR}/manage-cluster.sh" <<'MGMT_EOF'
#!/bin/bash

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BASE_PORT=7000
NUM_NODES=6

case "$1" in
    start)
        echo "Starting Redis Cluster..."
        for i in $(seq 0 $((NUM_NODES - 1))); do
            PORT=$((BASE_PORT + i))
            redis-server "${SCRIPT_DIR}/cluster/${PORT}/redis.conf" > "${SCRIPT_DIR}/cluster/${PORT}/logs/redis-${PORT}.log" 2>&1 &
            echo "Started node on port ${PORT}"
        done
        echo "Cluster started"
        ;;

    stop)
        echo "Stopping Redis Cluster..."
        for i in $(seq 0 $((NUM_NODES - 1))); do
            PORT=$((BASE_PORT + i))
            redis-cli -p ${PORT} shutdown nosave 2>/dev/null || true
            echo "Stopped node on port ${PORT}"
        done
        echo "Cluster stopped"
        ;;

    restart)
        $0 stop
        sleep 2
        $0 start
        ;;

    status)
        echo "Redis Cluster Status:"
        for i in $(seq 0 $((NUM_NODES - 1))); do
            PORT=$((BASE_PORT + i))
            if redis-cli -p ${PORT} ping &> /dev/null; then
                echo "Port ${PORT}: RUNNING"
            else
                echo "Port ${PORT}: STOPPED"
            fi
        done
        echo ""
        echo "Cluster Info:"
        redis-cli -p ${BASE_PORT} cluster info 2>/dev/null || echo "Cluster not available"
        ;;

    info)
        redis-cli -p ${BASE_PORT} cluster info
        echo ""
        echo "Cluster Nodes:"
        redis-cli -p ${BASE_PORT} cluster nodes
        ;;

    clean)
        echo "Cleaning cluster data..."
        $0 stop
        sleep 1
        rm -rf "${SCRIPT_DIR}/cluster/*/data/*"
        rm -rf "${SCRIPT_DIR}/cluster/*/nodes-*.conf"
        echo "Cluster data cleaned"
        ;;

    *)
        echo "Usage: $0 {start|stop|restart|status|info|clean}"
        echo ""
        echo "Commands:"
        echo "  start   - Start all cluster nodes"
        echo "  stop    - Stop all cluster nodes"
        echo "  restart - Restart all cluster nodes"
        echo "  status  - Show status of all nodes"
        echo "  info    - Show cluster information"
        echo "  clean   - Stop cluster and remove all data"
        exit 1
        ;;
esac
MGMT_EOF

chmod +x "${SCRIPT_DIR}/manage-cluster.sh"

echo ""
echo "=========================================="
echo -e "${GREEN}Redis Cluster Setup Complete!${NC}"
echo "=========================================="
echo ""
echo "Cluster Info:"
echo "  - Nodes: ${CLUSTER_NODES}"
echo "  - Port Range: ${REDIS_PORT_BASE}-$((REDIS_PORT_BASE + CLUSTER_NODES - 1))"
echo "  - Config Dir: ${SCRIPT_DIR}/cluster/"
echo ""
echo "Management Commands:"
echo "  - Start:   ${SCRIPT_DIR}/manage-cluster.sh start"
echo "  - Stop:    ${SCRIPT_DIR}/manage-cluster.sh stop"
echo "  - Status:  ${SCRIPT_DIR}/manage-cluster.sh status"
echo "  - Info:    ${SCRIPT_DIR}/manage-cluster.sh info"
echo ""
echo "Connect to cluster:"
echo "  redis-cli -c -p ${REDIS_PORT_BASE}"
echo ""
echo "Test the cluster:"
echo "  redis-cli -c -p ${REDIS_PORT_BASE} set test 'Hello Cluster'"
echo "  redis-cli -c -p ${REDIS_PORT_BASE} get test"
echo "=========================================="

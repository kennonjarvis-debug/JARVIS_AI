# Horizontal Scaling Guide - Jarvis AI Platform

Complete guide to horizontal scaling implementation, configuration, and management.

## Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Components](#components)
4. [Auto-Scaling](#auto-scaling)
5. [Database Replication](#database-replication)
6. [Redis Cluster](#redis-cluster)
7. [Instance Management](#instance-management)
8. [Deployment](#deployment)
9. [Monitoring](#monitoring)
10. [Troubleshooting](#troubleshooting)

---

## Overview

The Jarvis AI Platform implements complete horizontal scaling to handle 10x traffic growth. The system scales from 3 to 10 application instances based on real-time metrics.

### Scaling Targets

| Metric | Target | Maximum |
|--------|--------|---------|
| Concurrent Users | 10,000 | 15,000 |
| Requests/Second | 5,000 | 7,500 |
| Average Response Time | < 100ms | < 200ms |
| Uptime | 99.9% | 99.99% |
| Instance Count | 3-10 | 10 |

### Key Features

- **Automatic scaling**: Based on CPU, memory, and request rate
- **Zero downtime**: Rolling updates and graceful shutdown
- **Session persistence**: Sticky sessions and session migration
- **Data replication**: PostgreSQL streaming replication
- **Distributed caching**: Redis Cluster with 6 nodes
- **Health-based routing**: Automatic traffic routing away from unhealthy instances

---

## Architecture

### System Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                      Load Balancer (Nginx)                  │
│              Sticky Sessions + Health Checks                │
└──────────────┬──────────────┬──────────────┬────────────────┘
               │              │              │
       ┌───────v──────┐ ┌────v──────┐ ┌────v──────┐
       │   App 1      │ │  App 2    │ │  App N    │
       │ (3-10 inst.) │ │           │ │           │
       └───────┬──────┘ └────┬──────┘ └────┬──────┘
               │              │              │
       ┌───────┴──────────────┴──────────────┴───────┐
       │                                              │
       │  ┌────────────────┐    ┌────────────────┐   │
       │  │ Redis Cluster  │    │   PostgreSQL   │   │
       │  │   (6 nodes)    │    │  Primary + 2   │   │
       │  │ 3M + 3R        │    │    Replicas    │   │
       │  └────────────────┘    └────────────────┘   │
       │                                              │
       └──────────────────────────────────────────────┘
```

### Data Flow

1. **Request arrives** at nginx load balancer
2. **Routing decision** based on:
   - Session affinity (sticky sessions)
   - Instance health scores
   - Current load distribution
3. **Request processing** at application instance
4. **Data access**:
   - Reads: Random read replica (load balancing)
   - Writes: Primary database only
   - Cache: Redis Cluster (distributed)
5. **Response** returned through load balancer

---

## Components

### 1. Auto-Scaler Service

Monitors metrics and scales instances automatically.

**File**: `/Users/benkennon/Jarvis/src/services/auto-scaler.service.ts`

**Configuration**:
```typescript
autoScalerService.configure({
  minInstances: 3,
  maxInstances: 10,
  targetCPU: 70,           // 70% CPU target
  targetMemory: 80,        // 80% memory target
  targetRequestRate: 1000, // 1000 req/s per instance
  scaleUpThreshold: 0.8,   // Scale up at 80% of target
  scaleDownThreshold: 0.3, // Scale down at 30% of target
  cooldownPeriod: 300,     // 5 minutes between scaling events
  checkInterval: 30,       // Check every 30 seconds
});

autoScalerService.start();
```

### 2. Instance Registry

Tracks all running instances with service discovery.

**File**: `/Users/benkennon/Jarvis/src/services/instance-registry.service.ts`

**Usage**:
```typescript
// Register instance on startup
await instanceRegistryService.register();

// Update health metrics
await instanceRegistryService.updateCPU(cpuUsage);
await instanceRegistryService.updateConnections(activeConnections);

// Get all instances
const instances = await instanceRegistryService.getAllInstances();
```

### 3. Health Router

Routes traffic based on instance health scores.

**File**: `/Users/benkennon/Jarvis/src/services/health-router.service.ts`

**Features**:
- Real-time health tracking
- Circuit breaker pattern
- Gradual instance recovery
- Dynamic routing weights

### 4. Distributed Locks

Prevents duplicate job execution across instances.

**File**: `/Users/benkennon/Jarvis/src/services/distributed-lock.service.ts`

**Usage**:
```typescript
// Execute with lock
await distributedLockService.withLock('job:daily-report', async () => {
  // Only one instance will execute this
  await generateDailyReport();
});
```

### 5. Session Affinity

Maintains sticky sessions across instances.

**File**: `/Users/benkennon/Jarvis/src/middleware/session-affinity.ts`

**Usage**:
```typescript
import { sessionAffinityMiddleware } from './middleware/session-affinity';

app.use(sessionAffinityMiddleware());
```

### 6. Graceful Shutdown

Handles clean instance shutdown during scaling.

**File**: `/Users/benkennon/Jarvis/src/services/graceful-shutdown.service.ts`

**Features**:
- Connection draining
- Session migration
- In-flight request completion
- Resource cleanup

---

## Auto-Scaling

### Scaling Triggers

The auto-scaler monitors three key metrics:

**1. CPU Usage**
```
Scale Up:   CPU > 56% (80% of 70% target)
Scale Down: CPU < 21% (30% of 70% target)
```

**2. Memory Usage**
```
Scale Up:   Memory > 64% (80% of 80% target)
Scale Down: Memory < 24% (30% of 80% target)
```

**3. Request Rate**
```
Scale Up:   > 800 req/s per instance
Scale Down: < 300 req/s per instance
```

### Scaling Strategy

**Gradual Scaling**:
- Scale one instance at a time
- Wait for instance to be healthy
- 5-minute cooldown between scaling events

**Example Scaling Timeline**:
```
00:00 - 3 instances, 70% CPU
00:30 - CPU reaches 80%, trigger scale-up
00:31 - Scaling to 4 instances
00:32 - Instance 4 starting
00:35 - Instance 4 healthy, scale-up complete
05:35 - Cooldown expires
```

### Manual Scaling

**Docker Swarm**:
```bash
# Scale to 5 instances
docker service scale jarvis_app=5

# Check scaling status
docker service ps jarvis_app
```

**Kubernetes**:
```bash
# Scale to 5 instances
kubectl scale deployment jarvis-app --replicas=5

# Check status
kubectl get pods
```

### Scaling Monitoring

```typescript
// Get scaling statistics
const stats = await scalingMonitorService.getStats();

console.log(stats);
// {
//   totalScaleUps: 15,
//   totalScaleDowns: 8,
//   failedScaleOps: 0,
//   averageScaleDuration: 45000,
//   lastScaleEvent: { ... },
//   uptimePercent: 99.95
// }
```

---

## Database Replication

### PostgreSQL Streaming Replication

**Configuration**: 1 Primary + 2 Read Replicas

#### Setup

1. **Run setup script**:
```bash
cd /Users/benkennon/Jarvis/infra/postgres
./replication-setup.sh
```

2. **Configure primary server**:
```bash
# Edit postgresql.conf
wal_level = replica
max_wal_senders = 10
synchronous_commit = on

# Edit pg_hba.conf
host replication replicator 0.0.0.0/0 md5
```

3. **Create replicas**:
```bash
./create-replica.sh 5433 replica1
./create-replica.sh 5434 replica2
```

4. **Start all servers**:
```bash
./manage-replication.sh start-all
```

#### Read-Write Splitting

**Application Configuration**:
```typescript
// Write queries go to primary
const writeDb = new Pool({
  connectionString: process.env.DATABASE_URL
});

// Read queries distributed across replicas
const readReplicas = [
  new Pool({ connectionString: process.env.READ_REPLICA_1_URL }),
  new Pool({ connectionString: process.env.READ_REPLICA_2_URL })
];

// Get random read replica
const getReadDb = () => {
  return readReplicas[Math.floor(Math.random() * readReplicas.length)];
};
```

#### Failover

**Automatic failover with pg_auto_failover**:
```bash
# Install pg_auto_failover
apt-get install postgresql-15-auto-failover

# Initialize monitor
pg_autoctl create monitor --pgdata ./monitor

# Create nodes
pg_autoctl create postgres --pgdata ./primary --monitor postgresql://monitor:5432
pg_autoctl create postgres --pgdata ./replica1 --monitor postgresql://monitor:5432
```

**Manual failover**:
```bash
# Promote replica1 to primary
./manage-replication.sh promote replica1
```

---

## Redis Cluster

### 6-Node Cluster Configuration

**Setup**: 3 Masters + 3 Replicas

#### Installation

```bash
cd /Users/benkennon/Jarvis/infra/redis
./cluster-setup.sh
```

This creates:
- 6 Redis nodes (ports 7000-7005)
- Automatic failover
- 16,384 hash slots distributed across masters

#### Management

```bash
# Start cluster
./manage-cluster.sh start

# Stop cluster
./manage-cluster.sh stop

# Check status
./manage-cluster.sh status

# View cluster info
./manage-cluster.sh info
```

#### Application Configuration

**Using ioredis**:
```typescript
import Redis from 'ioredis';

const redis = new Redis.Cluster([
  { host: 'redis-cluster-1', port: 7000 },
  { host: 'redis-cluster-2', port: 7001 },
  { host: 'redis-cluster-3', port: 7002 },
  { host: 'redis-cluster-4', port: 7003 },
  { host: 'redis-cluster-5', port: 7004 },
  { host: 'redis-cluster-6', port: 7005 },
], {
  redisOptions: {
    password: process.env.REDIS_PASSWORD,
  },
  clusterRetryStrategy: (times) => {
    return Math.min(100 * times, 2000);
  },
});
```

#### Cluster Operations

**Check cluster health**:
```bash
redis-cli -c -p 7000 cluster info
redis-cli -c -p 7000 cluster nodes
```

**Add new node**:
```bash
redis-cli --cluster add-node new-node:7006 existing-node:7000
redis-cli --cluster reshard existing-node:7000
```

**Remove node**:
```bash
redis-cli --cluster del-node existing-node:7000 node-id
```

---

## Instance Management

### Instance Lifecycle

**1. Startup**:
```typescript
// Register instance
await instanceRegistryService.register();

// Start health monitoring
healthRouterService.start();

// Start auto-scaler
autoScalerService.start();
```

**2. Running**:
```typescript
// Update metrics periodically
setInterval(async () => {
  await instanceRegistryService.updateCPU(getCPUUsage());
  await instanceRegistryService.updateConnections(getActiveConnections());
}, 10000);
```

**3. Shutdown**:
```typescript
// Register shutdown handlers
gracefulShutdownService.registerHandlers();

// On SIGTERM
gracefulShutdownService.setServer(server);
await gracefulShutdownService.shutdown();
```

### Instance Discovery

**Get all healthy instances**:
```typescript
const instances = await instanceRegistryService.getInstancesByStatus('ready');

for (const instance of instances) {
  console.log(`Instance: ${instance.instanceId}`);
  console.log(`  Host: ${instance.hostname}`);
  console.log(`  CPU: ${instance.current.cpuUsage}%`);
  console.log(`  Memory: ${instance.current.memoryUsage}%`);
  console.log(`  Connections: ${instance.current.connections}`);
}
```

---

## Deployment

### Docker Swarm Deployment

**1. Initialize Swarm**:
```bash
docker swarm init
```

**2. Deploy stack**:
```bash
# Set environment variables
export POSTGRES_PASSWORD=your_password
export GRAFANA_PASSWORD=your_password

# Deploy
docker stack deploy -c infra/docker/docker-compose.swarm.yml jarvis
```

**3. Verify deployment**:
```bash
# Check services
docker service ls

# Check logs
docker service logs jarvis_app

# Check health
curl http://localhost/api/health
```

**4. Scale application**:
```bash
# Scale to 5 instances
docker service scale jarvis_app=5

# Watch scaling
watch docker service ps jarvis_app
```

### Kubernetes Deployment

**1. Apply configuration**:
```bash
kubectl apply -f infra/k8s/
```

**2. Check deployment**:
```bash
kubectl get pods
kubectl get services
kubectl get deployments
```

**3. Scale deployment**:
```bash
kubectl scale deployment jarvis-app --replicas=5
```

**4. Rolling update**:
```bash
kubectl set image deployment/jarvis-app jarvis=jarvis-ai:2.0.0
kubectl rollout status deployment/jarvis-app
```

---

## Monitoring

### Metrics Collection

**Prometheus metrics**:
```
# Instance metrics
jarvis_instances_total
jarvis_instances_ready
jarvis_instances_unhealthy

# Request metrics
jarvis_requests_total
jarvis_requests_per_second
jarvis_request_duration_seconds

# Scaling metrics
jarvis_scaling_events_total
jarvis_scaling_duration_seconds
jarvis_autoscale_triggers_total

# Database metrics
jarvis_db_connections_active
jarvis_db_queries_total
jarvis_db_replication_lag_seconds

# Redis metrics
jarvis_redis_commands_total
jarvis_redis_memory_used_bytes
jarvis_redis_cluster_nodes_total
```

### Grafana Dashboards

Access at: http://localhost:3001

**1. Scaling Overview**:
- Current instance count
- Auto-scaling events timeline
- CPU/Memory/Request rate trends
- Scaling efficiency metrics

**2. Instance Health**:
- Health scores per instance
- Resource utilization
- Request distribution
- Error rates

**3. Database Replication**:
- Replication lag
- Read/write distribution
- Connection pooling
- Query performance

**4. Redis Cluster**:
- Cluster health
- Key distribution
- Memory usage
- Command statistics

### Alerts

**Critical alerts**:
- All instances unhealthy
- Database replication lag > 10s
- Redis cluster nodes down
- Scaling failures

**Warning alerts**:
- High CPU/memory usage (> 80%)
- High error rate (> 5%)
- Slow response times (> 200ms)
- Low available instances

---

## Troubleshooting

### Common Issues

#### 1. Instances Not Scaling

**Symptoms**: Auto-scaler not adding instances despite high load

**Diagnosis**:
```bash
# Check auto-scaler status
curl http://localhost:3000/api/admin/autoscaler/status

# Check metrics
curl http://localhost:3000/api/admin/metrics
```

**Solutions**:
- Verify auto-scaler is running: `autoScalerService.start()`
- Check cooldown period hasn't been recently triggered
- Verify max instances not reached
- Check Docker/K8s permissions

#### 2. Uneven Load Distribution

**Symptoms**: Some instances handling more traffic than others

**Diagnosis**:
```bash
# Check request distribution
docker service ps jarvis_app

# Check instance health scores
curl http://localhost:3000/api/admin/health/instances
```

**Solutions**:
- Verify load balancing algorithm (round-robin vs ip_hash)
- Check session affinity configuration
- Review long-lived connections
- Monitor instance health scores

#### 3. Database Replication Lag

**Symptoms**: Read replicas showing old data

**Diagnosis**:
```bash
# Check replication status
psql -h primary -c "SELECT * FROM pg_stat_replication;"

# Check lag on replica
psql -h replica1 -c "SELECT now() - pg_last_xact_replay_timestamp() AS replication_delay;"
```

**Solutions**:
- Check network latency between primary and replica
- Verify replica resources (CPU, memory, disk I/O)
- Check for long-running transactions on primary
- Consider adding more replicas

#### 4. Redis Cluster Split-Brain

**Symptoms**: Redis cluster reporting multiple masters for same slots

**Diagnosis**:
```bash
redis-cli -c -p 7000 cluster nodes
redis-cli -c -p 7000 cluster info
```

**Solutions**:
```bash
# Manual cluster fix
redis-cli --cluster fix 127.0.0.1:7000

# Reshard if needed
redis-cli --cluster reshard 127.0.0.1:7000
```

#### 5. Session Loss During Scaling

**Symptoms**: Users logged out during instance shutdown

**Diagnosis**:
- Check graceful shutdown logs
- Verify session migration
- Check Redis session store

**Solutions**:
- Enable session affinity
- Increase graceful shutdown timeout
- Verify session migration code
- Use Redis for session storage

---

## Best Practices

### 1. Scaling

- Start with minimum instances (3)
- Scale gradually (one instance at a time)
- Use auto-scaling based on metrics
- Set appropriate cooldown periods
- Test scaling procedures regularly

### 2. Database

- Use read replicas for read-heavy workloads
- Monitor replication lag
- Implement connection pooling
- Use prepared statements
- Index frequently queried columns

### 3. Caching

- Use Redis Cluster for distributed caching
- Set appropriate TTLs
- Implement cache warming
- Monitor cache hit rates
- Handle cache misses gracefully

### 4. Monitoring

- Track all key metrics
- Set up alerts for critical issues
- Review metrics regularly
- Perform capacity planning
- Test disaster recovery

### 5. Deployment

- Use rolling updates
- Test in staging first
- Monitor during deployment
- Have rollback plan ready
- Document deployment process

---

## Configuration Reference

### Environment Variables

```bash
# Scaling
MIN_INSTANCES=3
MAX_INSTANCES=10
AUTOSCALE_ENABLED=true
SCALE_UP_THRESHOLD=0.8
SCALE_DOWN_THRESHOLD=0.3
COOLDOWN_PERIOD=300

# Database
DATABASE_URL=postgresql://user:pass@primary:5432/jarvis
READ_REPLICA_1_URL=postgresql://user:pass@replica1:5433/jarvis
READ_REPLICA_2_URL=postgresql://user:pass@replica2:5434/jarvis

# Redis
REDIS_CLUSTER_NODES=redis-1:7000,redis-2:7001,redis-3:7002,redis-4:7003,redis-5:7004,redis-6:7005
REDIS_PASSWORD=your_password

# Orchestrator
ORCHESTRATOR=docker  # or 'kubernetes'
DOCKER_SERVICE_NAME=jarvis_app
K8S_DEPLOYMENT_NAME=jarvis-app
K8S_NAMESPACE=default
```

---

## Next Steps

1. Review [Load Balancing Guide](./LOAD_BALANCING.md)
2. Set up monitoring and alerts
3. Test auto-scaling in staging
4. Perform load testing
5. Document runbooks for common scenarios
6. Train team on scaling procedures

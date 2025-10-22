# Load Balancing Guide - Jarvis AI Platform

Complete guide to load balancing configuration and management for horizontal scaling.

## Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Nginx Configuration](#nginx-configuration)
4. [Session Affinity](#session-affinity)
5. [Health Checks](#health-checks)
6. [Deployment](#deployment)
7. [Monitoring](#monitoring)
8. [Troubleshooting](#troubleshooting)

---

## Overview

The Jarvis AI Platform uses **nginx** as a high-performance load balancer to distribute traffic across multiple Express.js application instances. This setup enables:

- **Horizontal scaling**: 3-10 application instances
- **Zero downtime deployments**: Rolling updates
- **High availability**: Automatic failover
- **SSL termination**: Centralized SSL/TLS handling
- **Request routing**: Intelligent traffic distribution

### Key Features

- Round-robin load balancing with sticky sessions (ip_hash)
- WebSocket support for real-time features
- Rate limiting at load balancer level
- Active and passive health checks
- Connection pooling and keepalive
- Request buffering and timeouts
- Static asset caching

---

## Architecture

```
                                   Internet
                                      |
                                      v
                           ┌──────────────────┐
                           │   Nginx LB       │
                           │   (Port 80/443)  │
                           └──────────────────┘
                                      |
                    ┌─────────────────┼─────────────────┐
                    |                 |                 |
                    v                 v                 v
            ┌──────────────┐  ┌──────────────┐  ┌──────────────┐
            │   App 1      │  │   App 2      │  │   App 3      │
            │ (Port 3000)  │  │ (Port 3000)  │  │ (Port 3000)  │
            └──────────────┘  └──────────────┘  └──────────────┘
                    |                 |                 |
                    └─────────────────┼─────────────────┘
                                      |
                           ┌──────────┴──────────┐
                           |                     |
                           v                     v
                  ┌──────────────┐      ┌──────────────┐
                  │ Redis Cluster│      │  PostgreSQL  │
                  │   (6 nodes)  │      │  (Primary +  │
                  │              │      │  2 Replicas) │
                  └──────────────┘      └──────────────┘
```

---

## Nginx Configuration

### Load Balancing Strategy

The nginx configuration uses **ip_hash** for sticky sessions:

```nginx
upstream jarvis_backend {
    ip_hash;  # Sticky sessions for WebSocket support

    server app1:3000 max_fails=3 fail_timeout=30s weight=1;
    server app2:3000 max_fails=3 fail_timeout=30s weight=1;
    server app3:3000 max_fails=3 fail_timeout=30s weight=1;

    keepalive 256;
    keepalive_requests 1000;
    keepalive_timeout 60s;
}
```

### Configuration Files

Located in `/Users/benkennon/Jarvis/infra/nginx/`:

- **load-balancer.conf**: Main nginx configuration

### Key Settings

| Setting | Value | Purpose |
|---------|-------|---------|
| `max_fails` | 3 | Mark backend as down after 3 failures |
| `fail_timeout` | 30s | Try backend again after 30 seconds |
| `keepalive` | 256 | Connection pool size |
| `client_max_body_size` | 100M | Maximum request body size |

### Rate Limiting

Three rate limit zones:

```nginx
limit_req_zone $binary_remote_addr zone=general_limit:10m rate=100r/s;
limit_req_zone $binary_remote_addr zone=api_limit:10m rate=50r/s;
limit_req_zone $binary_remote_addr zone=auth_limit:10m rate=10r/s;
```

### SSL/TLS Configuration

```nginx
ssl_protocols TLSv1.2 TLSv1.3;
ssl_ciphers 'ECDHE-ECDSA-AES128-GCM-SHA256:...';
ssl_prefer_server_ciphers on;
ssl_session_cache shared:SSL:10m;
ssl_stapling on;
ssl_stapling_verify on;
```

---

## Session Affinity

### Sticky Sessions

Session affinity ensures requests from the same client are routed to the same instance:

**1. IP Hash (nginx level)**
```nginx
upstream jarvis_backend {
    ip_hash;  # Routes based on client IP
    ...
}
```

**2. Cookie-based (application level)**
```typescript
import { sessionAffinityMiddleware } from './middleware/session-affinity';

app.use(sessionAffinityMiddleware());
```

### Session Migration

During instance shutdown, sessions are migrated to healthy instances:

```typescript
await sessionAffinityManager.migrateSessions(
  fromInstanceId,
  toInstanceId
);
```

### WebSocket Handling

WebSocket connections maintain session affinity:

```nginx
location /ws {
    proxy_pass http://jarvis_backend;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
    ...
}
```

---

## Health Checks

### Passive Health Checks

Nginx monitors backend responses:

```nginx
server app1:3000 max_fails=3 fail_timeout=30s;
```

- After 3 failures, instance is marked as down
- Retries after 30 seconds

### Active Health Checks

Health check endpoint at `/api/health`:

```bash
# Run health check
./scripts/health-check.sh

# JSON output
./scripts/health-check.sh json
```

#### Checks Performed

1. **Process**: Node.js process running
2. **Application**: HTTP endpoint responding
3. **Redis**: Connection and responsiveness
4. **PostgreSQL**: Connection and query execution
5. **Disk**: Available disk space (< 90%)
6. **Memory**: Memory usage (< 90%)
7. **CPU**: CPU load (< 4.0)

### Load Balancer Health Check

```nginx
location /lb-health {
    access_log off;
    proxy_pass http://jarvis_backend/api/health;
    proxy_connect_timeout 2s;
    proxy_read_timeout 2s;
}
```

---

## Deployment

### Docker Swarm

Deploy the stack:

```bash
# Initialize Swarm
docker swarm init

# Deploy stack
docker stack deploy -c infra/docker/docker-compose.swarm.yml jarvis

# Check status
docker service ls

# Scale application
docker service scale jarvis_app=5
```

### Kubernetes

Deploy with kubectl:

```bash
# Apply configuration
kubectl apply -f infra/k8s/

# Check status
kubectl get pods

# Scale deployment
kubectl scale deployment jarvis-app --replicas=5
```

### Manual Setup

1. **Start nginx**:
```bash
sudo nginx -c /path/to/load-balancer.conf
```

2. **Start application instances**:
```bash
PORT=3000 npm start &
PORT=3001 npm start &
PORT=3002 npm start &
```

3. **Verify**:
```bash
curl http://localhost/api/health
```

---

## Monitoring

### Nginx Status

```bash
curl http://localhost:8080/nginx_status
```

Output:
```
Active connections: 42
server accepts handled requests
 1234 1234 5678
Reading: 2 Writing: 10 Waiting: 30
```

### Instance Health

```bash
# Check all instances
docker service ps jarvis_app

# View logs
docker service logs jarvis_app
```

### Metrics

Access Prometheus metrics:

```bash
curl http://localhost:9090/metrics
```

Key metrics:
- `nginx_http_requests_total`: Total HTTP requests
- `nginx_upstream_response_time`: Backend response time
- `nginx_upstream_status`: Backend status codes
- `jarvis_instances_total`: Total instances
- `jarvis_active_connections`: Active connections per instance

### Grafana Dashboards

Access at: http://localhost:3001

Dashboards:
1. **Load Balancer Overview**: Request rate, response times, errors
2. **Instance Health**: CPU, memory, connections per instance
3. **Scaling Metrics**: Instance count, auto-scaling events

---

## Troubleshooting

### Issue: 502 Bad Gateway

**Cause**: All backend instances are down

**Solution**:
1. Check instance status: `docker service ps jarvis_app`
2. View instance logs: `docker service logs jarvis_app`
3. Restart instances: `docker service update --force jarvis_app`

### Issue: Sticky Sessions Not Working

**Cause**: Client IP changing or cookie not set

**Solution**:
1. Verify `ip_hash` is enabled in nginx config
2. Check `X-Forwarded-For` header is passed
3. Verify session affinity middleware is active

### Issue: WebSocket Connections Failing

**Cause**: Missing WebSocket upgrade headers

**Solution**:
1. Check nginx `/ws` location configuration
2. Verify `Upgrade` and `Connection` headers
3. Check application WebSocket handler

### Issue: Uneven Load Distribution

**Cause**: Long-lived connections or sticky sessions

**Solution**:
1. Monitor connection distribution
2. Adjust `keepalive_timeout`
3. Consider using least_conn instead of ip_hash

### Issue: High Response Times

**Cause**: Overloaded instances

**Solution**:
1. Check instance CPU/memory: `docker stats`
2. Scale up: `docker service scale jarvis_app=5`
3. Review slow queries and optimize

---

## Best Practices

### 1. Health Checks
- Implement comprehensive health checks
- Check all dependencies (DB, Redis, APIs)
- Return appropriate HTTP status codes
- Monitor health check failures

### 2. Connection Management
- Use connection pooling
- Set appropriate timeouts
- Limit concurrent connections
- Monitor connection counts

### 3. Rate Limiting
- Implement rate limiting at LB level
- Different limits for different endpoints
- Use Redis for distributed rate limiting
- Monitor rate limit hits

### 4. Monitoring
- Track request distribution
- Monitor response times per instance
- Alert on backend failures
- Track scaling events

### 5. Scaling
- Start with minimum instances (3)
- Scale gradually (one at a time)
- Use auto-scaling based on metrics
- Test scaling procedures regularly

### 6. Security
- Terminate SSL at load balancer
- Use strong SSL/TLS configuration
- Implement rate limiting
- Monitor for DDoS attacks

---

## Configuration Reference

### Environment Variables

```bash
# Load Balancer
NGINX_WORKER_PROCESSES=auto
NGINX_WORKER_CONNECTIONS=1024

# Application
PORT=3000
MAX_CONNECTIONS=1000

# Scaling
MIN_INSTANCES=3
MAX_INSTANCES=10
```

### File Locations

```
/Users/benkennon/Jarvis/
├── infra/
│   ├── nginx/
│   │   └── load-balancer.conf
│   └── docker/
│       └── docker-compose.swarm.yml
├── scripts/
│   └── health-check.sh
└── src/
    └── middleware/
        └── session-affinity.ts
```

---

## Additional Resources

- [Nginx Load Balancing Documentation](http://nginx.org/en/docs/http/load_balancing.html)
- [Docker Swarm Documentation](https://docs.docker.com/engine/swarm/)
- [Kubernetes Documentation](https://kubernetes.io/docs/home/)
- [Horizontal Scaling Guide](./HORIZONTAL_SCALING.md)

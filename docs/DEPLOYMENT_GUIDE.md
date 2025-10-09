# Deployment Guide

**Jarvis + AI DAWG - Complete Deployment Guide**
**Version:** 2.0.0
**Last Updated:** 2025-10-08

---

## Prerequisites

- Node.js v18+ installed
- PostgreSQL 15+ running
- Redis 7+ running
- Git installed
- Minimum 4GB RAM
- 10GB free disk space

---

## Local Development Setup

### 1. Clone Repositories

```bash
# Clone Jarvis Control Plane
cd ~
git clone <jarvis-repo-url> Jarvis
cd Jarvis
npm install

# Clone AI DAWG Backend
cd ~
git clone <aidawg-repo-url> ai-dawg-v0.1
cd ai-dawg-v0.1
npm install
```

### 2. Configure Environment

**Jarvis (.env):**
```bash
cp .env.example .env

# Edit .env
JARVIS_PORT=4000
AI_DAWG_BACKEND_URL=http://localhost:3001
JARVIS_AUTH_TOKEN=your-secret-token-here
NODE_ENV=development
LOG_LEVEL=info
```

**AI DAWG (.env):**
```bash
cp .env.example .env

# Edit .env
PORT=3001
DATABASE_URL=postgresql://user:password@localhost:5432/aidawg
REDIS_URL=redis://localhost:6379
NODE_ENV=development
```

### 3. Setup Database

```bash
cd ~/ai-dawg-v0.1

# Run migrations
npx prisma migrate deploy

# Seed database (optional)
npm run seed
```

### 4. Start Services

```bash
# Terminal 1: AI DAWG Backend
cd ~/ai-dawg-v0.1
npm run dev

# Terminal 2: Jarvis Control Plane
cd ~/Jarvis
npm run dev

# Terminal 3: Dashboard (optional)
cd ~/Jarvis/dashboard
./launch-dashboard.sh
```

### 5. Verify Installation

```bash
# Check Jarvis
curl http://localhost:4000/health

# Check AI DAWG
curl http://localhost:3001/api/v1/modules

# Test command execution
curl -X POST http://localhost:4000/api/v1/execute \
  -H "Authorization: Bearer your-secret-token-here" \
  -H "Content-Type: application/json" \
  -d '{"module":"test","action":"ping","params":{}}'
```

---

## Docker Deployment

### 1. Build Images

```bash
# Build Jarvis
cd ~/Jarvis
docker build -t jarvis:latest .

# Build AI DAWG
cd ~/ai-dawg-v0.1
docker build -t aidawg:latest .
```

### 2. Docker Compose

```yaml
# docker-compose.yml
version: '3.8'

services:
  postgres:
    image: postgres:15
    environment:
      POSTGRES_DB: aidawg
      POSTGRES_USER: user
      POSTGRES_PASSWORD: password
    volumes:
      - pgdata:/var/lib/postgresql/data
    ports:
      - "5432:5432"

  redis:
    image: redis:7-alpine
    volumes:
      - redisdata:/data
    ports:
      - "6379:6379"

  aidawg:
    image: aidawg:latest
    environment:
      DATABASE_URL: postgresql://user:password@postgres:5432/aidawg
      REDIS_URL: redis://redis:6379
      PORT: 3001
    depends_on:
      - postgres
      - redis
    ports:
      - "3001:3001"

  jarvis:
    image: jarvis:latest
    environment:
      JARVIS_PORT: 4000
      AI_DAWG_BACKEND_URL: http://aidawg:3001
      JARVIS_AUTH_TOKEN: ${JARVIS_AUTH_TOKEN}
    depends_on:
      - aidawg
    ports:
      - "4000:4000"

volumes:
  pgdata:
  redisdata:
```

### 3. Start Stack

```bash
docker-compose up -d
```

---

## Production Deployment

### AWS Deployment

#### 1. Infrastructure Setup

```bash
# Create ECS cluster
aws ecs create-cluster --cluster-name jarvis-prod

# Create RDS instance
aws rds create-db-instance \
  --db-instance-identifier jarvis-db \
  --db-instance-class db.t3.micro \
  --engine postgres \
  --master-username admin \
  --master-user-password <password>

# Create ElastiCache Redis
aws elasticache create-cache-cluster \
  --cache-cluster-id jarvis-cache \
  --engine redis \
  --cache-node-type cache.t3.micro
```

#### 2. Deploy Application

```bash
# Push images to ECR
aws ecr create-repository --repository-name jarvis
aws ecr create-repository --repository-name aidawg

docker tag jarvis:latest <account-id>.dkr.ecr.us-east-1.amazonaws.com/jarvis:latest
docker push <account-id>.dkr.ecr.us-east-1.amazonaws.com/jarvis:latest

# Create ECS task definition
aws ecs register-task-definition --cli-input-json file://task-definition.json

# Create ECS service
aws ecs create-service \
  --cluster jarvis-prod \
  --service-name jarvis-service \
  --task-definition jarvis-task \
  --desired-count 2 \
  --load-balancer targetGroupArn=<tg-arn>,containerName=jarvis,containerPort=4000
```

### Kubernetes Deployment

#### 1. Create Namespace

```bash
kubectl create namespace jarvis
```

#### 2. Deploy PostgreSQL

```yaml
# postgres-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: postgres
  namespace: jarvis
spec:
  replicas: 1
  selector:
    matchLabels:
      app: postgres
  template:
    metadata:
      labels:
        app: postgres
    spec:
      containers:
      - name: postgres
        image: postgres:15
        env:
        - name: POSTGRES_DB
          value: "aidawg"
        - name: POSTGRES_USER
          valueFrom:
            secretKeyRef:
              name: db-secret
              key: username
        - name: POSTGRES_PASSWORD
          valueFrom:
            secretKeyRef:
              name: db-secret
              key: password
        ports:
        - containerPort: 5432
        volumeMounts:
        - name: postgres-storage
          mountPath: /var/lib/postgresql/data
      volumes:
      - name: postgres-storage
        persistentVolumeClaim:
          claimName: postgres-pvc
```

#### 3. Deploy Application

```yaml
# aidawg-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: aidawg
  namespace: jarvis
spec:
  replicas: 3
  selector:
    matchLabels:
      app: aidawg
  template:
    metadata:
      labels:
        app: aidawg
    spec:
      containers:
      - name: aidawg
        image: aidawg:latest
        env:
        - name: DATABASE_URL
          valueFrom:
            secretKeyRef:
              name: db-secret
              key: url
        - name: REDIS_URL
          valueFrom:
            secretKeyRef:
              name: redis-secret
              key: url
        ports:
        - containerPort: 3001
---
apiVersion: v1
kind: Service
metadata:
  name: aidawg-service
  namespace: jarvis
spec:
  selector:
    app: aidawg
  ports:
  - port: 3001
    targetPort: 3001
```

```yaml
# jarvis-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: jarvis
  namespace: jarvis
spec:
  replicas: 3
  selector:
    matchLabels:
      app: jarvis
  template:
    metadata:
      labels:
        app: jarvis
    spec:
      containers:
      - name: jarvis
        image: jarvis:latest
        env:
        - name: AI_DAWG_BACKEND_URL
          value: "http://aidawg-service:3001"
        - name: JARVIS_AUTH_TOKEN
          valueFrom:
            secretKeyRef:
              name: jarvis-secret
              key: auth-token
        ports:
        - containerPort: 4000
---
apiVersion: v1
kind: Service
metadata:
  name: jarvis-service
  namespace: jarvis
spec:
  type: LoadBalancer
  selector:
    app: jarvis
  ports:
  - port: 80
    targetPort: 4000
```

#### 4. Apply Configuration

```bash
kubectl apply -f postgres-deployment.yaml
kubectl apply -f aidawg-deployment.yaml
kubectl apply -f jarvis-deployment.yaml
```

---

## Environment Variables Reference

### Jarvis Control Plane

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `JARVIS_PORT` | No | 4000 | HTTP server port |
| `AI_DAWG_BACKEND_URL` | Yes | - | AI DAWG backend URL |
| `JARVIS_AUTH_TOKEN` | Yes | - | Authentication token |
| `NODE_ENV` | No | development | Environment (development/production) |
| `LOG_LEVEL` | No | info | Log level (error/warn/info/debug) |
| `CORS_ORIGINS` | No | * | Allowed CORS origins (comma-separated) |
| `RATE_LIMIT_REQUESTS` | No | 100 | Rate limit requests per window |
| `RATE_LIMIT_WINDOW_MS` | No | 900000 | Rate limit window (15 min default) |

### AI DAWG Backend

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `PORT` | No | 3001 | HTTP server port |
| `DATABASE_URL` | Yes | - | PostgreSQL connection string |
| `REDIS_URL` | Yes | - | Redis connection string |
| `NODE_ENV` | No | development | Environment |
| `S3_BUCKET` | No | - | S3 bucket for file storage |
| `AWS_REGION` | No | us-east-1 | AWS region |
| `SUNO_API_KEY` | No | - | Suno AI API key (music module) |

---

## Health Checks

### Liveness Probe

```
GET /health
Expected: 200 OK
```

### Readiness Probe

```
GET /health/detailed
Expected: 200 OK with status: "healthy" or "degraded"
```

### Kubernetes Health Check Example

```yaml
livenessProbe:
  httpGet:
    path: /health
    port: 4000
  initialDelaySeconds: 30
  periodSeconds: 10

readinessProbe:
  httpGet:
    path: /health/detailed
    port: 4000
  initialDelaySeconds: 10
  periodSeconds: 5
```

---

## Scaling

### Horizontal Scaling

Both Jarvis and AI DAWG are stateless and can be horizontally scaled:

```bash
# Docker Compose
docker-compose up --scale jarvis=3 --scale aidawg=3

# Kubernetes
kubectl scale deployment jarvis --replicas=5 -n jarvis
kubectl scale deployment aidawg --replicas=5 -n jarvis
```

### Vertical Scaling

Increase resources per container:

```yaml
resources:
  requests:
    memory: "512Mi"
    cpu: "500m"
  limits:
    memory: "1Gi"
    cpu: "1000m"
```

---

## Backup & Recovery

### Database Backup

```bash
# Backup PostgreSQL
pg_dump -h localhost -U user aidawg > backup.sql

# Restore
psql -h localhost -U user aidawg < backup.sql
```

### Redis Backup

```bash
# Backup Redis
redis-cli BGSAVE
cp /var/lib/redis/dump.rdb ./redis-backup.rdb

# Restore
cp ./redis-backup.rdb /var/lib/redis/dump.rdb
redis-cli SHUTDOWN
# Redis will load backup on restart
```

---

## Monitoring

### Metrics to Track

- Request rate (req/s)
- Error rate (%)
- Response time (p50, p95, p99)
- CPU usage
- Memory usage
- Database connections
- Redis memory
- Module health status

### Prometheus Integration (Future)

```yaml
# prometheus.yml
scrape_configs:
  - job_name: 'jarvis'
    static_configs:
      - targets: ['jarvis:4000']
  - job_name: 'aidawg'
    static_configs:
      - targets: ['aidawg:3001']
```

---

## Troubleshooting

See [TROUBLESHOOTING.md](./TROUBLESHOOTING.md) for common issues and solutions.

---

## Security Checklist

- [ ] Change default authentication tokens
- [ ] Use HTTPS in production
- [ ] Configure firewall rules
- [ ] Enable database encryption
- [ ] Use secrets management (AWS Secrets Manager, Vault)
- [ ] Configure CORS for specific domains
- [ ] Enable rate limiting
- [ ] Set up WAF (Web Application Firewall)
- [ ] Regular security audits
- [ ] Keep dependencies updated

---

## References

- [Architecture Documentation](./ARCHITECTURE.md)
- [API Documentation](./API_DOCUMENTATION.md)
- [Troubleshooting Guide](./TROUBLESHOOTING.md)
- [Monitoring Guide](./MONITORING.md)


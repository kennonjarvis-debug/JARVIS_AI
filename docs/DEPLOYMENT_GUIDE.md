# JARVIS Deployment Guide

**Version:** 0.1.0
**Target Environment:** Production
**Last Updated:** October 15, 2025

---

## Table of Contents

1. [Overview](#overview)
2. [Prerequisites](#prerequisites)
3. [Local Development](#local-development)
4. [Docker Deployment](#docker-deployment)
5. [Production Deployment](#production-deployment)
6. [Environment Configuration](#environment-configuration)
7. [Monitoring & Logging](#monitoring--logging)
8. [Backup & Recovery](#backup--recovery)
9. [Scaling](#scaling)
10. [Troubleshooting](#troubleshooting)

---

## Overview

This guide covers deploying JARVIS in various environments from local development to production.

### Architecture Components

1. **JARVIS API** (Node.js/Express) - Port 3000
2. **JARVIS Orchestrator** (Node.js) - No external port
3. **Observatory Dashboard** (Svelte) - Port 5174
4. **DAWG AI Backend** (Python/FastAPI) - Port 9000
5. **Supabase** (PostgreSQL) - External service

---

## Prerequisites

### Required Tools

- **Node.js**: v18.0.0 or higher
- **npm**: v9.0.0 or higher
- **Docker**: v24.0.0 or higher (for containerized deployment)
- **Docker Compose**: v2.20.0 or higher

### Required Services

- **Supabase Account**: https://supabase.com
- **Anthropic API Key**: https://console.anthropic.com

### Optional Services

- **Discord Webhook**: For alerts and notifications
- **Sentry**: For error tracking
- **DataDog**: For advanced monitoring

---

## Local Development

### Quick Start

1. **Clone Repository**
   ```bash
   git clone https://github.com/your-org/jarvis-v0.git
   cd jarvis-v0
   ```

2. **Install Dependencies**
   ```bash
   npm install
   ```

3. **Configure Environment**
   ```bash
   cp .env.example .env
   # Edit .env with your credentials
   ```

4. **Run Database Migrations**
   ```bash
   npm run db:migrate
   ```

5. **Start Services**
   ```bash
   # Terminal 1: API Server
   npm run api

   # Terminal 2: Orchestrator
   npm run orchestrator

   # Terminal 3: Observatory
   cd observatory && npm run dev
   ```

6. **Verify Installation**
   - API Health: http://localhost:3000/api/health
   - Observatory: http://localhost:5174
   - API Docs: http://localhost:3000/api-docs

### Development Workflow

```bash
# Type checking
npm run typecheck

# Linting
npm run lint
npm run lint:fix

# Testing
npm run test:unit
npm run test:integration
npm run test:coverage

# Building
npm run build
```

---

## Docker Deployment

### Using Docker Compose (Recommended)

1. **Prepare Environment**
   ```bash
   cp .env.example .env
   # Edit .env with production credentials
   ```

2. **Build Images**
   ```bash
   docker-compose build
   ```

3. **Start All Services**
   ```bash
   docker-compose up -d
   ```

4. **View Logs**
   ```bash
   # All services
   docker-compose logs -f

   # Specific service
   docker-compose logs -f jarvis-api
   ```

5. **Stop Services**
   ```bash
   docker-compose down
   ```

### Individual Container Deployment

**Build JARVIS API:**
```bash
docker build -t jarvis-api:latest .
docker run -d \
  --name jarvis-api \
  -p 3000:3000 \
  --env-file .env \
  jarvis-api:latest
```

**Build JARVIS Orchestrator:**
```bash
docker build -t jarvis-orchestrator:latest -f Dockerfile.orchestrator .
docker run -d \
  --name jarvis-orchestrator \
  --env-file .env \
  jarvis-orchestrator:latest
```

### Docker Health Checks

All containers include health checks:
```bash
# Check container health
docker ps
# Look for "healthy" in STATUS column

# Manual health check
docker exec jarvis-api curl http://localhost:3000/api/health
```

---

## Production Deployment

### Pre-Deployment Checklist

- [ ] Environment variables configured
- [ ] Database migrations run
- [ ] SSL certificates obtained
- [ ] DNS records configured
- [ ] Backup strategy in place
- [ ] Monitoring configured
- [ ] CI/CD pipeline tested

### Option 1: Cloud Platform (Recommended)

#### Deploy to AWS ECS

1. **Build and Push Images**
   ```bash
   # Tag images
   docker tag jarvis-api:latest \
     123456789.dkr.ecr.us-east-1.amazonaws.com/jarvis-api:latest

   # Push to ECR
   aws ecr get-login-password --region us-east-1 | \
     docker login --username AWS \
     --password-stdin 123456789.dkr.ecr.us-east-1.amazonaws.com

   docker push 123456789.dkr.ecr.us-east-1.amazonaws.com/jarvis-api:latest
   ```

2. **Create ECS Task Definition**
   ```json
   {
     "family": "jarvis-api",
     "networkMode": "awsvpc",
     "requiresCompatibilities": ["FARGATE"],
     "cpu": "512",
     "memory": "1024",
     "containerDefinitions": [
       {
         "name": "jarvis-api",
         "image": "123456789.dkr.ecr.us-east-1.amazonaws.com/jarvis-api:latest",
         "portMappings": [
           {
             "containerPort": 3000,
             "protocol": "tcp"
           }
         ],
         "environment": [
           {
             "name": "NODE_ENV",
             "value": "production"
           }
         ],
         "secrets": [
           {
             "name": "SUPABASE_URL",
             "valueFrom": "arn:aws:secretsmanager:us-east-1:123456789:secret:jarvis/supabase-url"
           }
         ],
         "healthCheck": {
           "command": [
             "CMD-SHELL",
             "curl -f http://localhost:3000/api/health || exit 1"
           ],
           "interval": 30,
           "timeout": 5,
           "retries": 3
         }
       }
     ]
   }
   ```

3. **Create ECS Service**
   ```bash
   aws ecs create-service \
     --cluster jarvis-cluster \
     --service-name jarvis-api \
     --task-definition jarvis-api:1 \
     --desired-count 2 \
     --launch-type FARGATE \
     --network-configuration "awsvpcConfiguration={subnets=[subnet-12345],securityGroups=[sg-12345],assignPublicIp=ENABLED}"
   ```

#### Deploy to Vercel (Observatory Only)

```bash
cd observatory
vercel --prod
```

### Option 2: VPS Deployment

#### Using Nginx as Reverse Proxy

1. **Install Nginx**
   ```bash
   sudo apt update
   sudo apt install nginx
   ```

2. **Configure Nginx**
   ```nginx
   # /etc/nginx/sites-available/jarvis
   server {
       listen 80;
       server_name api.jarvis.example.com;

       location / {
           proxy_pass http://localhost:3000;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection 'upgrade';
           proxy_set_header Host $host;
           proxy_cache_bypass $http_upgrade;
           proxy_set_header X-Real-IP $remote_addr;
           proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
       }
   }

   server {
       listen 80;
       server_name dashboard.jarvis.example.com;

       location / {
           proxy_pass http://localhost:5174;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection 'upgrade';
           proxy_set_header Host $host;
           proxy_cache_bypass $http_upgrade;
       }
   }
   ```

3. **Enable Site**
   ```bash
   sudo ln -s /etc/nginx/sites-available/jarvis /etc/nginx/sites-enabled/
   sudo nginx -t
   sudo systemctl restart nginx
   ```

4. **Setup SSL with Let's Encrypt**
   ```bash
   sudo apt install certbot python3-certbot-nginx
   sudo certbot --nginx -d api.jarvis.example.com -d dashboard.jarvis.example.com
   ```

### Option 3: Kubernetes

```yaml
# k8s/deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: jarvis-api
spec:
  replicas: 3
  selector:
    matchLabels:
      app: jarvis-api
  template:
    metadata:
      labels:
        app: jarvis-api
    spec:
      containers:
      - name: jarvis-api
        image: jarvis-api:latest
        ports:
        - containerPort: 3000
        env:
        - name: NODE_ENV
          value: "production"
        envFrom:
        - secretRef:
            name: jarvis-secrets
        livenessProbe:
          httpGet:
            path: /api/health
            port: 3000
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /api/health
            port: 3000
          initialDelaySeconds: 5
          periodSeconds: 5
        resources:
          requests:
            memory: "512Mi"
            cpu: "250m"
          limits:
            memory: "1Gi"
            cpu: "500m"
---
apiVersion: v1
kind: Service
metadata:
  name: jarvis-api-service
spec:
  selector:
    app: jarvis-api
  ports:
  - port: 80
    targetPort: 3000
  type: LoadBalancer
```

---

## Environment Configuration

### Required Environment Variables

```bash
# Supabase (Database)
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Anthropic (AI)
ANTHROPIC_API_KEY=sk-ant-api03-...
ANTHROPIC_MODEL=claude-sonnet-4-5-20250929

# API Configuration
API_PORT=3000
NODE_ENV=production

# Timezone
TZ=America/Phoenix
CRON_TIMEZONE=America/Phoenix
```

### Optional Environment Variables

```bash
# Monitoring & Alerts
DISCORD_WEBHOOK_URL=https://discord.com/api/webhooks/...
SENTRY_DSN=https://...@sentry.io/...

# External Integrations
HUBSPOT_PRIVATE_APP_TOKEN=pat-na1-...
BREVO_API_KEY=xkeysib-...
BUFFER_ACCESS_TOKEN=...

# Performance
MAX_WORKERS=4
TIMEOUT_MS=30000
```

### Secrets Management

**Using AWS Secrets Manager:**
```bash
aws secretsmanager create-secret \
  --name jarvis/anthropic-api-key \
  --secret-string "sk-ant-api03-..."
```

**Using Kubernetes Secrets:**
```bash
kubectl create secret generic jarvis-secrets \
  --from-literal=ANTHROPIC_API_KEY=sk-ant-api03-... \
  --from-literal=SUPABASE_SERVICE_KEY=eyJhbGci...
```

---

## Monitoring & Logging

### Health Checks

**API Health Endpoint:**
```bash
curl http://localhost:3000/api/health
```

**Expected Response:**
```json
{
  "status": "healthy",
  "timestamp": "2025-10-15T12:00:00.000Z",
  "uptime": 3600000,
  "checks": {
    "database": { "status": "pass", "responseTime": 45 },
    "anthropic": { "status": "pass" },
    "memory": { "status": "pass" }
  },
  "system": {
    "memory": {
      "used": 123456789,
      "total": 536870912,
      "percentage": 23.0
    },
    "cpu": {
      "usage": 0.15
    }
  }
}
```

### Logging

**View Logs:**
```bash
# Docker Compose
docker-compose logs -f jarvis-api

# Kubernetes
kubectl logs -f deployment/jarvis-api

# PM2 (Node process manager)
pm2 logs jarvis-api
```

**Log Levels:**
- **error**: Critical failures
- **warn**: Degraded performance
- **info**: Normal operations
- **debug**: Detailed debugging (development only)

### Metrics Collection

**Prometheus Integration:**
```yaml
# prometheus.yml
scrape_configs:
  - job_name: 'jarvis-api'
    static_configs:
      - targets: ['localhost:3000']
    metrics_path: '/api/metrics'
```

**Grafana Dashboard:**
Import dashboard ID: [Create custom dashboard]

---

## Backup & Recovery

### Database Backups

**Automated Supabase Backups:**
Supabase automatically backs up data daily. Configure retention in Supabase dashboard.

**Manual Backup:**
```bash
# Export schema
pg_dump -h db.your-project.supabase.co \
  -U postgres \
  --schema-only \
  jarvis > schema-backup.sql

# Export data
pg_dump -h db.your-project.supabase.co \
  -U postgres \
  --data-only \
  jarvis > data-backup.sql
```

### Disaster Recovery

**Recovery Steps:**
1. Deploy new infrastructure
2. Restore database from backup
3. Deploy application containers
4. Restore environment variables
5. Run health checks
6. Update DNS if needed

**RTO (Recovery Time Objective):** <1 hour
**RPO (Recovery Point Objective):** <24 hours

---

## Scaling

### Horizontal Scaling

**Docker Compose:**
```bash
docker-compose up -d --scale jarvis-api=3
```

**Kubernetes:**
```bash
kubectl scale deployment jarvis-api --replicas=5
```

### Auto-Scaling

**AWS ECS:**
```json
{
  "scalableTarget": {
    "serviceNamespace": "ecs",
    "resourceId": "service/jarvis-cluster/jarvis-api",
    "scalableDimension": "ecs:service:DesiredCount",
    "minCapacity": 2,
    "maxCapacity": 10
  },
  "scalingPolicy": {
    "policyType": "TargetTrackingScaling",
    "targetTrackingScalingPolicyConfiguration": {
      "targetValue": 75.0,
      "predefinedMetricSpecification": {
        "predefinedMetricType": "ECSServiceAverageCPUUtilization"
      }
    }
  }
}
```

### Performance Optimization

1. **Enable caching** for frequently accessed data
2. **Use connection pooling** for database
3. **Implement rate limiting** on API endpoints
4. **Optimize Docker images** (multi-stage builds)
5. **Use CDN** for static assets (Observatory)

---

## Troubleshooting

### Common Issues

**Issue: Container fails health check**
```bash
# Check logs
docker logs jarvis-api

# Manual health check
docker exec jarvis-api curl http://localhost:3000/api/health

# Check environment variables
docker exec jarvis-api env | grep SUPABASE
```

**Issue: High memory usage**
```bash
# Check container stats
docker stats jarvis-api

# Increase memory limit
docker update --memory 2g jarvis-api

# Restart with more memory
docker-compose down
# Edit docker-compose.yml memory limits
docker-compose up -d
```

**Issue: Database connection failures**
```bash
# Test Supabase connectivity
curl -I https://your-project.supabase.co

# Check service key
echo $SUPABASE_SERVICE_KEY | jwt decode -

# Verify network connectivity
docker network inspect jarvis-network
```

---

## Support

For deployment issues:
- **GitHub Issues**: https://github.com/your-org/jarvis-v0/issues
- **Documentation**: https://docs.jarvis.example.com
- **Email**: support@dawgai.example.com

---

**Last Updated:** October 15, 2025
**Maintained By:** DAWG AI Engineering Team

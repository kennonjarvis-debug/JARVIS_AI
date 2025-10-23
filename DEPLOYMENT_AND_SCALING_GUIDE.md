# JARVIS Browser Automation - Deployment & Scaling Guide

**Date**: October 22, 2025
**Version**: 1.0.0
**Status**: Production Ready

---

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Local Development Setup](#local-development-setup)
3. [Testing](#testing)
4. [Docker Deployment](#docker-deployment)
5. [Production Deployment](#production-deployment)
6. [Scaling Strategy](#scaling-strategy)
7. [Monitoring & Health Checks](#monitoring--health-checks)
8. [CI/CD Pipeline](#cicd-pipeline)
9. [Performance Optimization](#performance-optimization)
10. [Troubleshooting](#troubleshooting)

---

## Prerequisites

### System Requirements

**Minimum**:
- CPU: 2 cores
- RAM: 4GB
- Disk: 20GB
- OS: Linux (Ubuntu 20.04+), macOS 10.15+, Windows Server 2019+

**Recommended (Production)**:
- CPU: 4+ cores
- RAM: 8GB+
- Disk: 50GB+ SSD
- OS: Linux (Ubuntu 22.04 LTS)

### Software Dependencies

```bash
# Node.js 18+
node --version  # Should be v18.x or higher

# npm or pnpm
npm --version
# or
pnpm --version

# Docker (for containerized deployment)
docker --version
docker-compose --version

# Kubernetes (for scaled deployment)
kubectl version
```

---

## Local Development Setup

### 1. Clone Repository

```bash
git clone https://github.com/your-org/JARVIS_AI.git
cd JARVIS_AI/control-plane
```

### 2. Install Dependencies

```bash
npm install
# or
pnpm install
```

### 3. Configure Environment

```bash
cp .env.example .env
```

Edit `.env`:

```bash
# Server Configuration
PORT=5001
NODE_ENV=development
LOG_LEVEL=debug

# Authentication
JARVIS_AUTH_TOKEN=your-secure-token-here

# Service URLs
AI_DAWG_BACKEND_URL=http://localhost:3001

# Monitoring (Optional)
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/YOUR/WEBHOOK/URL
PUSHOVER_API_TOKEN=your-pushover-token
PUSHOVER_USER_KEY=your-pushover-user-key
```

### 4. Start Development Server

```bash
npm run dev
```

Server will start on http://localhost:5001

---

## Testing

### Run Test Suite

```bash
# Run all tests
npm test

# Run browser automation tests only
tsx tests/browser-automation.test.ts

# Run with custom config
JARVIS_URL=http://localhost:5001 \
JARVIS_AUTH_TOKEN=test-token \
tsx tests/browser-automation.test.ts
```

### Expected Output

```
============================================================
🚀 JARVIS Browser Automation Test Suite
============================================================

🧪 Running: Test 1: Basic Console Log Collection
✅ PASSED (2341ms): Test 1: Basic Console Log Collection

🧪 Running: Test 2: Network Request Monitoring
✅ PASSED (1987ms): Test 2: Network Request Monitoring

...

============================================================
📊 Test Results Summary
============================================================

✅ Passed: 10
❌ Failed: 0
⏱️  Total Duration: 23456ms
📈 Success Rate: 100.0%
```

---

## Docker Deployment

### Dockerfile

```dockerfile
# control-plane/Dockerfile
FROM node:18-alpine

# Install Playwright dependencies
RUN apk add --no-cache \
    chromium \
    nss \
    freetype \
    harfbuzz \
    ca-certificates \
    ttf-freefont

# Set Playwright to use installed Chromium
ENV PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1
ENV PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium-browser

# Create app directory
WORKDIR /app

# Copy package files
COPY package*.json ./
COPY pnpm-lock.yaml* ./

# Install dependencies
RUN npm install -g pnpm && pnpm install --frozen-lockfile

# Copy application code
COPY . .

# Build TypeScript
RUN pnpm build

# Expose port
EXPOSE 5001

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
  CMD node -e "require('http').get('http://localhost:5001/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Start server
CMD ["node", "dist/main.js"]
```

### Docker Compose

```yaml
# docker-compose.yml
version: '3.8'

services:
  jarvis-control-plane:
    build:
      context: ./control-plane
      dockerfile: Dockerfile
    ports:
      - "5001:5001"
    environment:
      - PORT=5001
      - NODE_ENV=production
      - LOG_LEVEL=info
      - JARVIS_AUTH_TOKEN=${JARVIS_AUTH_TOKEN}
      - AI_DAWG_BACKEND_URL=http://ai-dawg-backend:3001
    volumes:
      - ./logs:/app/logs
    restart: unless-stopped
    networks:
      - jarvis-network
    depends_on:
      - ai-dawg-backend

  ai-dawg-backend:
    image: your-org/ai-dawg-backend:latest
    ports:
      - "3001:3001"
    environment:
      - NODE_ENV=production
    restart: unless-stopped
    networks:
      - jarvis-network

  health-monitor:
    build:
      context: ./control-plane
      dockerfile: Dockerfile
    command: ["tsx", "scripts/health-monitor.ts"]
    environment:
      - JARVIS_URL=http://jarvis-control-plane:5001
      - JARVIS_AUTH_TOKEN=${JARVIS_AUTH_TOKEN}
      - SLACK_WEBHOOK_URL=${SLACK_WEBHOOK_URL}
      - PUSHOVER_API_TOKEN=${PUSHOVER_API_TOKEN}
      - PUSHOVER_USER_KEY=${PUSHOVER_USER_KEY}
    volumes:
      - ./logs:/app/logs
    restart: unless-stopped
    networks:
      - jarvis-network
    depends_on:
      - jarvis-control-plane

networks:
  jarvis-network:
    driver: bridge
```

### Build and Run

```bash
# Build images
docker-compose build

# Start services
docker-compose up -d

# View logs
docker-compose logs -f jarvis-control-plane

# Stop services
docker-compose down
```

---

## Production Deployment

### Option 1: Railway

```bash
# Install Railway CLI
npm install -g @railway/cli

# Login
railway login

# Create new project
railway init

# Add environment variables
railway variables set PORT=5001
railway variables set NODE_ENV=production
railway variables set JARVIS_AUTH_TOKEN=your-secure-token

# Deploy
railway up
```

### Option 2: AWS ECS

```yaml
# task-definition.json
{
  "family": "jarvis-control-plane",
  "networkMode": "awsvpc",
  "requiresCompatibilities": ["FARGATE"],
  "cpu": "1024",
  "memory": "2048",
  "containerDefinitions": [
    {
      "name": "jarvis-control-plane",
      "image": "your-ecr-repo/jarvis-control-plane:latest",
      "portMappings": [
        {
          "containerPort": 5001,
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
          "name": "JARVIS_AUTH_TOKEN",
          "valueFrom": "arn:aws:secretsmanager:region:account:secret:jarvis-auth"
        }
      ],
      "healthCheck": {
        "command": ["CMD-SHELL", "curl -f http://localhost:5001/health || exit 1"],
        "interval": 30,
        "timeout": 5,
        "retries": 3,
        "startPeriod": 60
      },
      "logConfiguration": {
        "logDriver": "awslogs",
        "options": {
          "awslogs-group": "/ecs/jarvis-control-plane",
          "awslogs-region": "us-east-1",
          "awslogs-stream-prefix": "ecs"
        }
      }
    }
  ]
}
```

### Option 3: Kubernetes

```yaml
# kubernetes/deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: jarvis-control-plane
  labels:
    app: jarvis-control-plane
spec:
  replicas: 3  # Scale as needed
  selector:
    matchLabels:
      app: jarvis-control-plane
  template:
    metadata:
      labels:
        app: jarvis-control-plane
    spec:
      containers:
      - name: jarvis-control-plane
        image: your-registry/jarvis-control-plane:latest
        ports:
        - containerPort: 5001
        env:
        - name: NODE_ENV
          value: "production"
        - name: PORT
          value: "5001"
        - name: JARVIS_AUTH_TOKEN
          valueFrom:
            secretKeyRef:
              name: jarvis-secrets
              key: auth-token
        resources:
          requests:
            memory: "2Gi"
            cpu: "1000m"
          limits:
            memory: "4Gi"
            cpu: "2000m"
        livenessProbe:
          httpGet:
            path: /health
            port: 5001
          initialDelaySeconds: 30
          periodSeconds: 30
        readinessProbe:
          httpGet:
            path: /health
            port: 5001
          initialDelaySeconds: 10
          periodSeconds: 10

---
apiVersion: v1
kind: Service
metadata:
  name: jarvis-control-plane
spec:
  type: LoadBalancer
  selector:
    app: jarvis-control-plane
  ports:
  - protocol: TCP
    port: 80
    targetPort: 5001

---
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: jarvis-control-plane-hpa
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: jarvis-control-plane
  minReplicas: 3
  maxReplicas: 10
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
  - type: Resource
    resource:
      name: memory
      target:
        type: Utilization
        averageUtilization: 80
```

Apply:

```bash
kubectl apply -f kubernetes/
kubectl get pods
kubectl logs -f deployment/jarvis-control-plane
```

---

## Scaling Strategy

### Horizontal Scaling

**When to Scale**:
- CPU usage > 70%
- Memory usage > 80%
- Request queue > 100
- Response time > 5s

**Scaling Metrics**:

```yaml
# Kubernetes HPA (above)
# or Docker Swarm
docker service scale jarvis-control-plane=5

# or AWS ECS
aws ecs update-service --cluster jarvis --service jarvis-control-plane --desired-count 5
```

### Vertical Scaling

**Resource Allocation**:

| Load Level | CPUs | Memory | Instances |
|------------|------|--------|-----------|
| Low | 1 | 2GB | 2 |
| Medium | 2 | 4GB | 3-5 |
| High | 4 | 8GB | 5-10 |
| Very High | 8 | 16GB | 10+ |

### Load Balancing

**NGINX Configuration**:

```nginx
upstream jarvis_backend {
    least_conn;  # Use least connections algorithm

    server jarvis-1:5001 max_fails=3 fail_timeout=30s;
    server jarvis-2:5001 max_fails=3 fail_timeout=30s;
    server jarvis-3:5001 max_fails=3 fail_timeout=30s;
}

server {
    listen 80;
    server_name jarvis.example.com;

    location / {
        proxy_pass http://jarvis_backend;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Request-ID $request_id;

        # Browser automation timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 120s;
        proxy_read_timeout 120s;
    }
}
```

---

## Monitoring & Health Checks

### Start Health Monitor

```bash
# Start health monitor
tsx scripts/health-monitor.ts

# Or with Docker
docker-compose up -d health-monitor

# View logs
tail -f logs/health-monitor.log
```

### Metrics Endpoint

```bash
# Get system metrics
curl http://localhost:5001/api/v1/business/metrics \
  -H "Authorization: Bearer your-token"
```

Response:

```json
{
  "uptime": { "overall": 86400 },
  "performance": {
    "responseTime": { "browser": 2345 },
    "requestsPerMinute": 120,
    "errorRate": 0.02
  },
  "costs": { "total": 12.45 },
  "users": { "active": 150 }
}
```

### Health Check Dashboard

Create Grafana dashboard with:
- Request rate
- Response time (p50, p95, p99)
- Error rate
- Browser automation success rate
- Resource usage (CPU, memory)

---

## CI/CD Pipeline

### GitHub Actions

```yaml
# .github/workflows/deploy.yml
name: Deploy JARVIS Control Plane

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'

      - name: Install dependencies
        run: |
          cd control-plane
          npm install

      - name: Run tests
        run: |
          cd control-plane
          npm test
        env:
          JARVIS_URL: http://localhost:5001
          JARVIS_AUTH_TOKEN: ${{ secrets.JARVIS_AUTH_TOKEN }}

  build:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Build Docker image
        run: |
          docker build -t jarvis-control-plane:${{ github.sha }} ./control-plane

      - name: Push to registry
        run: |
          echo "${{ secrets.DOCKER_PASSWORD }}" | docker login -u "${{ secrets.DOCKER_USERNAME }}" --password-stdin
          docker tag jarvis-control-plane:${{ github.sha }} your-registry/jarvis-control-plane:latest
          docker push your-registry/jarvis-control-plane:latest

  deploy:
    needs: build
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    steps:
      - name: Deploy to production
        run: |
          # Deploy to your infrastructure
          kubectl set image deployment/jarvis-control-plane jarvis-control-plane=your-registry/jarvis-control-plane:latest
```

---

## Performance Optimization

### 1. Browser Instance Pool

```typescript
// Implement browser instance pooling
class BrowserPool {
  private pool: Browser[] = [];
  private maxSize = 5;

  async acquire(): Promise<Browser> {
    if (this.pool.length > 0) {
      return this.pool.pop()!;
    }
    return await chromium.launch({ headless: true });
  }

  release(browser: Browser): void {
    if (this.pool.length < this.maxSize) {
      this.pool.push(browser);
    } else {
      browser.close();
    }
  }
}
```

### 2. Caching

```typescript
// Cache frequently accessed pages
const cache = new Map<string, CachedResult>();

async function getCached(url: string): Promise<CachedResult | null> {
  const cached = cache.get(url);
  if (cached && Date.now() - cached.timestamp < 300000) {
    return cached;
  }
  return null;
}
```

### 3. Rate Limiting

Already implemented in gateway.ts with 5000 requests per 15 minutes.

---

## Troubleshooting

### Common Issues

#### 1. Browser Launch Fails

**Symptoms**: "Failed to launch browser"

**Solutions**:
```bash
# Install missing dependencies (Ubuntu)
sudo apt-get install -y \
  libnss3 \
  libatk-bridge2.0-0 \
  libdrm2 \
  libxkbcommon0 \
  libxcomposite1 \
  libxdamage1 \
  libxfixes3 \
  libxrandr2 \
  libgbm1 \
  libasound2

# Or use Docker
docker run -it your-image /bin/sh
```

#### 2. Memory Leaks

**Symptoms**: Memory usage grows over time

**Solutions**:
- Ensure browsers are properly closed after each use
- Implement browser pooling with limits
- Restart service periodically
- Monitor with:

```bash
# Memory usage
docker stats jarvis-control-plane

# Or in Kubernetes
kubectl top pod -l app=jarvis-control-plane
```

#### 3. Slow Performance

**Symptoms**: Response time > 10s

**Solutions**:
- Enable headless mode (faster)
- Reduce viewport size
- Disable images: `page.route('**/*', route => route.abort())`
- Scale horizontally

---

## Support & Maintenance

### Logs

```bash
# Application logs
tail -f logs/combined.log

# Error logs only
tail -f logs/error.log

# Health monitor logs
tail -f logs/health-monitor.log
```

### Backup & Recovery

```bash
# Backup configuration
tar -czf backup-$(date +%Y%m%d).tar.gz \
  .env \
  logs/ \
  config/

# Restore
tar -xzf backup-20251022.tar.gz
```

---

## Quick Commands Reference

```bash
# Development
npm run dev                  # Start dev server
npm test                     # Run tests
tsx scripts/health-monitor.ts  # Start health monitor

# Docker
docker-compose up -d         # Start all services
docker-compose logs -f       # View logs
docker-compose down          # Stop services

# Kubernetes
kubectl apply -f kubernetes/  # Deploy
kubectl scale deployment jarvis-control-plane --replicas=5  # Scale
kubectl logs -f deployment/jarvis-control-plane  # View logs
kubectl delete -f kubernetes/  # Remove

# Testing
curl -X POST http://localhost:5001/api/v1/browser/automate \
  -H "Authorization: Bearer test-token" \
  -H "Content-Type: application/json" \
  -d '{"url":"https://example.com","captureConsole":true}'
```

---

**Last Updated**: October 22, 2025
**Maintained By**: DevOps Team
**Version**: 1.0.0


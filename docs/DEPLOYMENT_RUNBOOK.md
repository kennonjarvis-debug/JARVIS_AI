# Jarvis + AI DAWG - Production Deployment Runbook

**Last Updated**: 2025-10-08
**Version**: 2.0.0
**Estimated Deployment Time**: 30-45 minutes (first time), 10-15 minutes (updates)

---

## Table of Contents

1. [Pre-Deployment Checklist](#pre-deployment-checklist)
2. [Environment Setup](#environment-setup)
3. [Deployment Options](#deployment-options)
4. [Post-Deployment Verification](#post-deployment-verification)
5. [Monitoring Setup](#monitoring-setup)
6. [Rollback Procedures](#rollback-procedures)
7. [Troubleshooting](#troubleshooting)
8. [Maintenance](#maintenance)

---

## Pre-Deployment Checklist

### ✅ Required Before Deployment

- [ ] **Domain & DNS**: Domain purchased and DNS configured
- [ ] **SSL Certificate**: TLS/SSL certificate obtained (Let's Encrypt or commercial)
- [ ] **Server/Platform**: Production server provisioned (VPS, AWS, Railway, etc.)
- [ ] **Environment Variables**: All secrets generated and documented
- [ ] **API Keys**: OpenAI, Anthropic, Gemini keys obtained
- [ ] **Database Backups**: Backup strategy implemented
- [ ] **Monitoring**: Uptime monitoring service configured
- [ ] **Alerts**: Slack/email alerts configured
- [ ] **Git Repository**: Code pushed to main branch
- [ ] **CI/CD**: GitHub Actions configured and tested
- [ ] **Dependencies**: All npm packages updated and audited

### ✅ Security Checklist

- [ ] All `<CHANGE_ME_*>` values in `.env.production` replaced
- [ ] Strong passwords generated (32+ characters)
- [ ] Different secrets for each environment
- [ ] `.env.production` never committed to git
- [ ] CORS restricted to actual domains (no wildcards)
- [ ] Rate limiting enabled
- [ ] CSRF protection enabled
- [ ] API authentication tokens rotated
- [ ] Security headers configured (CSP, HSTS)
- [ ] SSH keys configured for server access

---

## Environment Setup

### Step 1: Generate Secrets

```bash
# Generate strong secrets
openssl rand -base64 32  # JWT_SECRET
openssl rand -base64 32  # REFRESH_TOKEN_SECRET
openssl rand -base64 32  # CSRF_SECRET
openssl rand -base64 32  # JARVIS_AUTH_TOKEN
openssl rand -base64 32  # POSTGRES_PASSWORD
openssl rand -base64 32  # REDIS_PASSWORD
openssl rand -base64 32  # MINIO_ROOT_PASSWORD
```

### Step 2: Configure Environment

```bash
# Copy template
cp .env.production.template .env.production

# Edit with secure values
nano .env.production

# Required values:
# - All passwords and secrets
# - API keys (OPENAI_API_KEY, ANTHROPIC_API_KEY, etc.)
# - Domain configuration
# - CORS_ORIGIN (your actual domains)
```

### Step 3: Verify Configuration

```bash
# Check required environment variables
grep -E "<CHANGE_ME" .env.production
# Should return NO matches

# Verify secrets are unique
cat .env.production | grep SECRET | sort | uniq -d
# Should return NO duplicates
```

---

## Deployment Options

### Option 1: Docker Compose (Recommended for VPS/Self-Hosted)

**Best for**: DigitalOcean Droplets, AWS EC2, Linode, self-hosted servers

#### Initial Deployment

```bash
# 1. SSH into server
ssh user@your-server.com

# 2. Clone repository
git clone https://github.com/your-org/jarvis.git /opt/jarvis
cd /opt/jarvis

# 3. Set up environment
cp .env.production.template .env.production
nano .env.production
# Fill in all values

# 4. Build and start services
docker-compose -f docker-compose.prod.yml up -d

# 5. Check services
docker-compose -f docker-compose.prod.yml ps

# 6. Watch logs
docker-compose -f docker-compose.prod.yml logs -f jarvis aidawg-backend

# 7. Run database migrations
docker-compose -f docker-compose.prod.yml exec aidawg-backend npx prisma migrate deploy
```

#### Updates

```bash
# 1. Pull latest code
cd /opt/jarvis
git pull origin main

# 2. Rebuild and restart (zero-downtime)
docker-compose -f docker-compose.prod.yml up -d --build --no-deps jarvis aidawg-backend

# 3. Verify health
curl https://your-domain.com/health
```

### Option 2: Railway

**Best for**: Quick deployment, automatic scaling, managed infrastructure

#### Initial Setup

```bash
# 1. Install Railway CLI
npm install -g @railway/cli

# 2. Login
railway login

# 3. Create project
railway init

# 4. Set environment variables
railway variables set NODE_ENV=production
railway variables set JARVIS_AUTH_TOKEN=$(openssl rand -base64 32)
# ... set all other variables from .env.production

# 5. Deploy
railway up

# 6. Link custom domain
railway domain add your-domain.com
```

#### Updates

```bash
# Automatic deployment on git push to main
git push origin main

# Or manual deployment
railway up
```

### Option 3: AWS ECS (Advanced)

**Best for**: Enterprise deployments, high availability, AWS ecosystem

#### Prerequisites

```bash
# Install AWS CLI
brew install awscli  # macOS
# or
curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip"
unzip awscliv2.zip
sudo ./aws/install

# Configure AWS credentials
aws configure
```

#### Deployment

```bash
# 1. Create ECR repository
aws ecr create-repository --repository-name jarvis-control-plane

# 2. Build and push image
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin YOUR_ACCOUNT.dkr.ecr.us-east-1.amazonaws.com
docker build -t jarvis-control-plane .
docker tag jarvis-control-plane:latest YOUR_ACCOUNT.dkr.ecr.us-east-1.amazonaws.com/jarvis-control-plane:latest
docker push YOUR_ACCOUNT.dkr.ecr.us-east-1.amazonaws.com/jarvis-control-plane:latest

# 3. Create ECS cluster (if not exists)
aws ecs create-cluster --cluster-name jarvis-cluster

# 4. Register task definition
aws ecs register-task-definition --cli-input-json file://ecs-task-definition.json

# 5. Create service
aws ecs create-service \
  --cluster jarvis-cluster \
  --service-name jarvis-control-plane \
  --task-definition jarvis-task \
  --desired-count 2 \
  --launch-type FARGATE \
  --network-configuration "awsvpcConfiguration={subnets=[subnet-xxx],securityGroups=[sg-xxx],assignPublicIp=ENABLED}"
```

### Option 4: Render

**Best for**: Simple deployment, automatic SSL, good for startups

#### Setup

1. Go to [render.com](https://render.com)
2. Click "New +" → "Web Service"
3. Connect GitHub repository
4. Configure:
   - **Name**: jarvis-control-plane
   - **Environment**: Docker
   - **Dockerfile Path**: Dockerfile
   - **Instance Type**: Starter ($7/mo) or higher
5. Add environment variables from `.env.production`
6. Click "Create Web Service"

---

## Post-Deployment Verification

### Step 1: Health Checks

```bash
# Basic health
curl https://your-domain.com/health
# Expected: {"status":"healthy","service":"jarvis-control-plane",...}

# Detailed health
curl https://your-domain.com/health/detailed
# Expected: 200 or 207 status

# AI DAWG backend health
curl https://your-domain.com:3000/health
# or internal: curl http://aidawg-backend:3000/health
```

### Step 2: Endpoint Verification

```bash
# Test authentication
curl -H "Authorization: Bearer YOUR_TOKEN" \
  https://your-domain.com/api/v1/execute \
  -X POST \
  -H "Content-Type: application/json" \
  -d '{"module":"testing","action":"health-check"}'

# Test ChatGPT integration
curl -H "Authorization: Bearer YOUR_TOKEN" \
  https://your-domain.com/integrations/chatgpt/
# Expected: {"status":"ready","version":"2.0.0",...}
```

### Step 3: Service Connectivity

```bash
# Check database connection
docker-compose -f docker-compose.prod.yml exec aidawg-backend \
  npx prisma db pull --print

# Check Redis connection
docker-compose -f docker-compose.prod.yml exec redis \
  redis-cli -a YOUR_REDIS_PASSWORD ping
# Expected: PONG

# Check MinIO
curl http://localhost:9000/minio/health/live
# Expected: 200 OK
```

### Step 4: Log Verification

```bash
# Check Jarvis logs
docker-compose -f docker-compose.prod.yml logs --tail=100 jarvis | grep ERROR
# Should have NO critical errors

# Check AI DAWG logs
docker-compose -f docker-compose.prod.yml logs --tail=100 aidawg-backend | grep ERROR
# Should have NO critical errors

# Check for startup success
docker-compose -f docker-compose.prod.yml logs jarvis | grep "Jarvis Control Plane started"
docker-compose -f docker-compose.prod.yml logs aidawg-backend | grep "Server running"
```

---

## Monitoring Setup

### 1. Application Monitoring

#### Sentry (Error Tracking)

```bash
# 1. Create Sentry project at sentry.io
# 2. Get DSN
# 3. Add to .env.production
echo "SENTRY_DSN=https://xxx@sentry.io/xxx" >> .env.production

# 4. Restart services
docker-compose -f docker-compose.prod.yml restart jarvis aidawg-backend
```

#### Prometheus Metrics (if using Grafana)

```yaml
# Add to docker-compose.prod.yml
prometheus:
  image: prom/prometheus:latest
  volumes:
    - ./prometheus.yml:/etc/prometheus/prometheus.yml
  ports:
    - "9090:9090"

grafana:
  image: grafana/grafana:latest
  ports:
    - "3002:3000"
  environment:
    - GF_SECURITY_ADMIN_PASSWORD=YOUR_PASSWORD
```

### 2. Uptime Monitoring

#### UptimeRobot (Free tier available)

1. Go to [uptimerobot.com](https://uptimerobot.com)
2. Create monitors for:
   - `https://your-domain.com/health` (every 5 minutes)
   - `https://your-domain.com/health/detailed` (every 15 minutes)
3. Configure alerts:
   - Email notification on downtime
   - Slack webhook (optional)

#### HealthChecks.io (Alternative)

```bash
# Create account at healthchecks.io
# Get ping URL

# Add to crontab
crontab -e
*/5 * * * * curl -fsS --retry 3 https://hc-ping.com/YOUR-UUID
```

### 3. Log Aggregation

#### Logtail / BetterStack

```bash
# 1. Create account at betterstack.com/logs
# 2. Get source token

# 3. Update docker-compose.prod.yml
services:
  jarvis:
    logging:
      driver: json-file
      options:
        max-size: "10m"
        max-file: "3"
        labels: "service=jarvis,environment=production"

# 4. Install Vector for log shipping
docker run -d \
  --name vector \
  -v /var/run/docker.sock:/var/run/docker.sock \
  -e VECTOR_SOURCE_TOKEN=YOUR_TOKEN \
  timberio/vector:latest-alpine
```

### 4. Alert Configuration

#### Slack Alerts

```bash
# 1. Create Slack incoming webhook
# 2. Add to .env.production
echo "SLACK_WEBHOOK_URL=https://hooks.slack.com/services/..." >> .env.production

# 3. Test alert
curl -X POST YOUR_SLACK_WEBHOOK_URL \
  -H 'Content-Type: application/json' \
  -d '{"text":"✅ Jarvis production deployment successful"}'
```

#### Email Alerts (via SendGrid)

```bash
# 1. Create SendGrid account
# 2. Get API key
# 3. Add to application monitoring config
echo "SENDGRID_API_KEY=SG.xxx" >> .env.production
echo "ALERT_EMAIL=alerts@your-domain.com" >> .env.production
```

---

## Rollback Procedures

### Quick Rollback (Last Working Version)

```bash
# 1. SSH into server
ssh user@your-server.com
cd /opt/jarvis

# 2. Revert to previous commit
git log --oneline -10  # Find last working commit
git reset --hard COMMIT_HASH

# 3. Restart services
docker-compose -f docker-compose.prod.yml up -d --build

# 4. Verify health
curl https://your-domain.com/health
```

### Rollback to Specific Version

```bash
# 1. Check available tags
git tag -l

# 2. Checkout specific version
git checkout v1.5.2

# 3. Rebuild and restart
docker-compose -f docker-compose.prod.yml up -d --build

# 4. Verify
curl https://your-domain.com/health
```

### Database Rollback

```bash
# 1. Stop services
docker-compose -f docker-compose.prod.yml stop

# 2. Restore database from backup
docker run --rm \
  -v postgres_prod_data:/var/lib/postgresql/data \
  -v $(pwd)/backups:/backups \
  postgres:15-alpine \
  sh -c "psql -U aidawg_user aidawg_prod < /backups/backup-2025-10-07.sql"

# 3. Restart services
docker-compose -f docker-compose.prod.yml up -d

# 4. Verify data
docker-compose -f docker-compose.prod.yml exec aidawg-backend npx prisma studio
```

---

## Troubleshooting

### Service Won't Start

```bash
# Check logs
docker-compose -f docker-compose.prod.yml logs SERVICE_NAME

# Check resource usage
docker stats

# Check disk space
df -h

# Check Docker daemon
systemctl status docker

# Restart Docker if needed
sudo systemctl restart docker
```

### Database Connection Issues

```bash
# Test connectivity
docker-compose -f docker-compose.prod.yml exec postgres \
  psql -U aidawg_user -d aidawg_prod -c "SELECT 1;"

# Check connection string
docker-compose -f docker-compose.prod.yml exec aidawg-backend \
  printenv DATABASE_URL

# Regenerate Prisma client
docker-compose -f docker-compose.prod.yml exec aidawg-backend \
  npx prisma generate
```

### High Memory Usage

```bash
# Check per-service memory
docker stats --no-stream

# Adjust resource limits in docker-compose.prod.yml
services:
  jarvis:
    deploy:
      resources:
        limits:
          memory: 256M  # Reduce if needed

# Restart with new limits
docker-compose -f docker-compose.prod.yml up -d
```

### SSL Certificate Issues

```bash
# Using Let's Encrypt with Certbot
sudo certbot --nginx -d your-domain.com -d www.your-domain.com

# Verify certificate
openssl s_client -connect your-domain.com:443 -servername your-domain.com

# Auto-renewal test
sudo certbot renew --dry-run
```

---

## Maintenance

### Daily Tasks

```bash
# Check health
curl https://your-domain.com/health

# Check logs for errors
docker-compose -f docker-compose.prod.yml logs --since=24h | grep ERROR

# Check disk space
df -h
```

### Weekly Tasks

```bash
# Database backup
docker-compose -f docker-compose.prod.yml exec postgres \
  pg_dump -U aidawg_user aidawg_prod > backups/backup-$(date +%Y%m%d).sql

# Check for updates
cd /opt/jarvis
git fetch origin
git log --oneline HEAD..origin/main

# Review monitoring dashboards
# - UptimeRobot
# - Sentry
# - Resource usage
```

### Monthly Tasks

```bash
# Rotate secrets (every 90 days)
# 1. Generate new secrets
# 2. Update .env.production
# 3. Restart services
# 4. Update secret manager

# Update dependencies
npm audit
npm update

# Clean up old Docker images
docker system prune -a --volumes

# Review and archive old logs
find logs/ -name "*.log" -mtime +30 -delete
```

### Database Maintenance

```bash
# Vacuum database (once a month)
docker-compose -f docker-compose.prod.yml exec postgres \
  psql -U aidawg_user -d aidawg_prod -c "VACUUM ANALYZE;"

# Check database size
docker-compose -f docker-compose.prod.yml exec postgres \
  psql -U aidawg_user -d aidawg_prod -c "\l+"

# Backup and compress
pg_dump aidawg_prod | gzip > backup-$(date +%Y%m%d).sql.gz
```

---

## Quick Reference Commands

```bash
# Start all services
docker-compose -f docker-compose.prod.yml up -d

# Stop all services
docker-compose -f docker-compose.prod.yml down

# Restart service
docker-compose -f docker-compose.prod.yml restart jarvis

# View logs
docker-compose -f docker-compose.prod.yml logs -f SERVICE_NAME

# Check status
docker-compose -f docker-compose.prod.yml ps

# Execute command in container
docker-compose -f docker-compose.prod.yml exec SERVICE_NAME COMMAND

# Scale service
docker-compose -f docker-compose.prod.yml up -d --scale jarvis=3

# Update and restart
git pull && docker-compose -f docker-compose.prod.yml up -d --build
```

---

## Support

**Documentation**: `/docs`
**GitHub Issues**: https://github.com/your-org/jarvis/issues
**Slack**: #jarvis-support
**On-call**: Check PagerDuty rotation

---

**Last Review**: 2025-10-08
**Next Review Due**: 2025-11-08
**Maintained By**: DevOps Team

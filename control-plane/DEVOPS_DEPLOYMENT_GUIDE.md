# Jarvis V2 DevOps & Deployment Guide

Complete guide for CI/CD, deployment automation, and operational excellence.

---

## 🎯 Overview

This DevOps implementation provides:
- ✅ Automated CI/CD pipeline with GitHub Actions
- ✅ Daily S3 backups with encryption and verification
- ✅ Health-based deployment gating
- ✅ Automatic rollback on failure
- ✅ Slack & email notifications
- ✅ Comprehensive deployment history logging

---

## 📋 Table of Contents

1. [Quick Start](#quick-start)
2. [CI/CD Pipeline](#cicd-pipeline)
3. [Deployment Process](#deployment-process)
4. [Backup Strategy](#backup-strategy)
5. [Health Monitoring](#health-monitoring)
6. [Notifications](#notifications)
7. [Deployment History](#deployment-history)
8. [Configuration](#configuration)
9. [Troubleshooting](#troubleshooting)

---

## 🚀 Quick Start

### Prerequisites

```bash
# Required tools
- Node.js 18+
- AWS CLI
- GitHub Actions (for CI/CD)
- Slack workspace (for notifications)

# Required secrets (configure in GitHub Settings)
- AWS_ACCESS_KEY_ID
- AWS_SECRET_ACCESS_KEY
- EC2_SSH_KEY
- SLACK_WEBHOOK_URL
```

### Initial Setup

```bash
# 1. Clone repository
git clone https://github.com/your-org/jarvis-v2.git
cd jarvis-v2

# 2. Make scripts executable
chmod +x scripts/deploy/*.sh
chmod +x scripts/backup/*.sh

# 3. Configure AWS credentials
aws configure

# 4. Test health check
./scripts/deploy/health-check.sh

# 5. Run manual deployment (staging)
./scripts/deploy/deploy.sh staging
```

---

## 🔄 CI/CD Pipeline

### Workflow File

**Location:** `.github/workflows/ci-cd.yml`

### Pipeline Stages

```
┌─────────────────────────────────────────┐
│  1. Setup & Dependencies               │
│     - Install Node.js                   │
│     - Cache node_modules                │
│     - Install dependencies              │
└─────────────────────────────────────────┘
                  ↓
┌─────────────────────────────────────────┐
│  2. Code Quality                        │
│     - ESLint                            │
│     - TypeScript type check             │
└─────────────────────────────────────────┘
                  ↓
┌─────────────────────────────────────────┐
│  3. Testing                             │
│     - Unit tests                        │
│     - Integration tests (with Redis)    │
│     - E2E tests (with Playwright)       │
│     - Security scan (npm audit)         │
└─────────────────────────────────────────┘
                  ↓
┌─────────────────────────────────────────┐
│  4. Build                               │
│     - TypeScript compilation            │
│     - Create artifacts                  │
└─────────────────────────────────────────┘
                  ↓
┌─────────────────────────────────────────┐
│  5. Health Check (Pre-Deploy)           │
│     - Check Jarvis vitality ≥ 60        │
│     - Block if vitality too low         │
└─────────────────────────────────────────┘
                  ↓
┌─────────────────────────────────────────┐
│  6. Deploy                              │
│     - Upload to S3                      │
│     - SSH to EC2                        │
│     - Extract & install                 │
│     - Restart service                   │
└─────────────────────────────────────────┘
                  ↓
┌─────────────────────────────────────────┐
│  7. Health Check (Post-Deploy)          │
│     - Verify service health             │
│     - Rollback if failed                │
└─────────────────────────────────────────┘
                  ↓
┌─────────────────────────────────────────┐
│  8. Sync Memory to S3                   │
│     - Backup /memory                    │
│     - Backup /adaptive                  │
│     - Backup /logs (7 days)             │
└─────────────────────────────────────────┘
                  ↓
┌─────────────────────────────────────────┐
│  9. Notifications                       │
│     - Send Slack notification           │
│     - Send email notification           │
└─────────────────────────────────────────┘
                  ↓
┌─────────────────────────────────────────┐
│  10. Log Deployment History             │
│     - Create JSON log                   │
│     - Upload to S3                      │
└─────────────────────────────────────────┘
```

### Trigger Events

**Automatic Triggers:**
```yaml
# On push to main branches
push:
  branches: [main, develop, release/**]

# On pull requests
pull_request:
  branches: [main, develop]

# On release publication
release:
  types: [published]

# Manual dispatch
workflow_dispatch:
  inputs:
    environment: [staging, production]
    skip_tests: [true, false]
```

### Running Workflows

```bash
# Via git push
git push origin main

# Via GitHub UI
# Actions → CI/CD Pipeline → Run workflow

# Via GitHub CLI
gh workflow run ci-cd.yml -f environment=staging
```

---

## 🚢 Deployment Process

### Automated Deployment (via CI/CD)

**Triggered automatically on:**
- Push to `main` branch
- Release publication
- Manual workflow dispatch

**Process:**
1. Tests run and pass
2. Health check validates vitality ≥ 60
3. Build artifacts created
4. Deployed to EC2 via SSH
5. Service restarted
6. Post-deploy health check
7. Memory synced to S3
8. Notifications sent

### Manual Deployment

```bash
# Deploy to staging
./scripts/deploy/deploy.sh staging

# Deploy to production
./scripts/deploy/deploy.sh production

# With custom settings
JARVIS_ROOT=/custom/path \
GITHUB_SHA=abc123 \
GITHUB_ACTOR=john.doe \
./scripts/deploy/deploy.sh production
```

### Rollback

**Automatic rollback** occurs if:
- Post-deployment health check fails
- Service fails to start
- API becomes unresponsive

**Manual rollback:**
```bash
# Restore from latest backup
BACKUP_DIR=$(ls -td /opt/jarvis-backup-* | head -1)
sudo rm -rf /opt/jarvis
sudo cp -r $BACKUP_DIR /opt/jarvis
sudo systemctl restart jarvis
```

---

## 💾 Backup Strategy

### Daily S3 Backup

**Schedule:** Daily at 6:00 AM UTC (via GitHub Actions)

**Workflow:** `.github/workflows/daily-s3-backup.yml`

**What's Backed Up:**

| Folder | Description | Retention |
|--------|-------------|-----------|
| `/memory/` | Adaptive memory data | 30 days |
| `/adaptive/` | Learning models | 30 days |
| `/logs/` | Application logs (7 days) | 30 days |
| `/config/` | Configuration files | 30 days |

**Features:**
- ✅ Incremental backup with checksums
- ✅ S3 encryption verification
- ✅ Integrity checks (SHA-256)
- ✅ Automatic cleanup of old backups
- ✅ Slack notifications on completion/failure

### Manual Backup

```bash
# Run backup script
./scripts/backup/s3-backup.sh

# With custom settings
S3_BACKUP_BUCKET=my-backups \
RETENTION_DAYS=60 \
./scripts/backup/s3-backup.sh
```

### Restore from Backup

```bash
# List available backups
aws s3 ls s3://jarvis-backups/backups/

# Download specific backup
aws s3 sync s3://jarvis-backups/backups/2025-10-07-14-15-30/ /tmp/restore/

# Extract and restore
cd /opt/jarvis
tar -xzf /tmp/restore/memory.tar.gz
tar -xzf /tmp/restore/adaptive.tar.gz
tar -xzf /tmp/restore/config.tar.gz

# Restart service
sudo systemctl restart jarvis
```

---

## 🏥 Health Monitoring

### Health Check Script

**Location:** `scripts/deploy/health-check.sh`

**What's Checked:**

| Metric | Threshold | Action if Failed |
|--------|-----------|------------------|
| **Vitality** | ≥ 60 | Block deployment |
| **API Availability** | HTTP 200 | Retry with backoff |
| **CPU Usage** | < 90% | Warn |
| **Memory Usage** | < 85% | Warn |
| **API Response Time** | < 1000ms | Warn |
| **Error Rate** | < 5% | Warn |

### Health Check API

**Endpoint:** `GET /api/v1/jarvis/status`

**Response:**
```json
{
  "vitality": 85,
  "status": "healthy",
  "metrics": {
    "cpu_usage": 45,
    "memory_usage": 67,
    "api_response_time": 234,
    "error_rate": 0.2
  },
  "dependencies": {
    "redis": "healthy",
    "database": "healthy",
    "s3": "healthy"
  }
}
```

### Run Health Check

```bash
# Default (threshold: 60)
./scripts/deploy/health-check.sh

# Custom threshold
./scripts/deploy/health-check.sh --threshold 70 --retries 5

# Check specific URL
./scripts/deploy/health-check.sh --url http://staging.jarvis.com:3001
```

---

## 📢 Notifications

### Slack Integration

**Webhook Configuration:**
```bash
# Set webhook URL
export SLACK_WEBHOOK_URL="https://hooks.slack.com/services/YOUR/WEBHOOK/URL"

# Test notification
./scripts/deploy/slack-notify.sh success staging
```

**Notification Types:**

| Type | When Sent | Template |
|------|-----------|----------|
| **Deployment Started** | Deploy begins | `deployment_started` |
| **Deployment Success** | Deploy completes | `deployment_success` |
| **Deployment Failure** | Deploy fails | `deployment_failure` |
| **Backup Success** | Backup completes | `backup_success` |
| **Backup Failure** | Backup fails | `backup_failure` |
| **Health Alert** | Vitality < 60 | `health_alert` |
| **Daily Summary** | End of day | `daily_summary` |

**Message Templates:** `config/templates/slack-messages.json`

### Email Notifications

**SMTP Configuration:**
```bash
export SMTP_HOST="smtp.gmail.com"
export SMTP_PORT="587"
export SMTP_USER="jarvis@example.com"
export SMTP_PASSWORD="app-password"
export SMTP_FROM="jarvis@example.com"
export NOTIFY_EMAIL="admin@example.com"
```

---

## 📝 Deployment History

### Log Format

**Location:** `/logs/deploy-history/`

**Schema:** `/logs/deploy-history/schema.json`

**Example Log:**
```json
{
  "deployment_id": "1234567890",
  "timestamp": "2025-10-07T14:15:30Z",
  "status": "success",
  "environment": "staging",
  "commit": {
    "sha": "a1b2c3d4e5f6",
    "message": "Add new feature",
    "author": "john.doe"
  },
  "health": {
    "pre_deploy_vitality": 85,
    "post_deploy_vitality": 87,
    "deploy_allowed": true
  },
  "jobs": {
    "lint": "success",
    "unit_tests": "success",
    "integration_tests": "success",
    "e2e_tests": "success",
    "deploy": "success",
    "sync_memory": "success"
  },
  "metrics": {
    "duration_seconds": 342,
    "build_time_seconds": 87,
    "test_time_seconds": 156,
    "deploy_time_seconds": 45
  },
  "backup": {
    "sync_performed": true,
    "backup_size_mb": 245,
    "files_synced": 1247
  }
}
```

### Query Deployment History

```bash
# View recent deployments
ls -lt /logs/deploy-history/ | head -10

# Find failed deployments
grep -l '"status": "failure"' /logs/deploy-history/*.json

# Get deployment stats
jq -s '[.[] | {env: .environment, status: .status}] | group_by(.env) | map({env: .[0].env, total: length})' /logs/deploy-history/*.json
```

---

## ⚙️ Configuration

### Required Environment Variables

**AWS:**
```bash
AWS_ACCESS_KEY_ID=AKIA...
AWS_SECRET_ACCESS_KEY=...
AWS_REGION=us-east-1
S3_BACKUP_BUCKET=jarvis-backups
DEPLOYMENT_BUCKET=jarvis-deployments
```

**EC2:**
```bash
EC2_SSH_KEY="-----BEGIN RSA PRIVATE KEY-----..."
EC2_USER=ubuntu
EC2_HOST=ec2-12-34-56-78.compute.amazonaws.com
```

**Notifications:**
```bash
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/...
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=jarvis@example.com
SMTP_PASSWORD=app-specific-password
NOTIFY_EMAIL=admin@example.com
```

**Jarvis:**
```bash
JARVIS_ROOT=/opt/jarvis
JARVIS_API_URL=http://localhost:3001
VITALITY_THRESHOLD=60
```

### GitHub Secrets

Configure in: `Settings → Secrets and variables → Actions`

**Required Secrets:**
- `AWS_ACCESS_KEY_ID`
- `AWS_SECRET_ACCESS_KEY`
- `S3_BACKUP_BUCKET`
- `EC2_SSH_KEY`
- `EC2_USER`
- `EC2_HOST`
- `SLACK_WEBHOOK_URL`
- `SMTP_HOST`
- `SMTP_PORT`
- `SMTP_USER`
- `SMTP_PASSWORD`
- `NOTIFY_EMAIL`

---

## 🔧 Troubleshooting

### Deployment Blocked by Health Check

**Symptom:**
```
[ERROR] ❌ Jarvis vitality: 45 - Deploy blocked (threshold: 60)
```

**Solution:**
1. Check Jarvis logs: `journalctl -u jarvis -n 100`
2. Review system metrics: `curl http://localhost:3001/api/v1/jarvis/status | jq`
3. Investigate recent changes or errors
4. Fix underlying issue
5. Wait for vitality to recover
6. Retry deployment

### Backup Fails

**Symptom:**
```
[ERROR] ❌ Backup checksum mismatch!
```

**Solution:**
1. Verify AWS credentials: `aws sts get-caller-identity`
2. Check S3 bucket: `aws s3 ls s3://jarvis-backups`
3. Verify encryption: `aws s3api get-bucket-encryption --bucket jarvis-backups`
4. Check disk space: `df -h /opt/jarvis`
5. Retry backup

### Service Won't Start After Deploy

**Symptom:**
```
[ERROR] ❌ Health check failed after 5 attempts
```

**Solution:**
1. Check service status: `sudo systemctl status jarvis`
2. View service logs: `sudo journalctl -u jarvis -n 50`
3. Check for port conflicts: `sudo netstat -tulpn | grep 3001`
4. Verify dependencies: `npm ls --production`
5. Rollback if necessary

### Notifications Not Sent

**Symptom:**
```
[ERROR] ❌ Slack notification failed: invalid_webhook
```

**Solution:**
1. Verify webhook URL: `echo $SLACK_WEBHOOK_URL`
2. Test webhook: `curl -X POST $SLACK_WEBHOOK_URL -d '{"text":"test"}'`
3. Check Slack app permissions
4. Verify SMTP settings for email
5. Review notification logs

---

## 📊 Monitoring & Metrics

### Key Metrics to Track

**Deployment Metrics:**
- Deployment frequency
- Success rate
- Average deployment time
- Rollback rate
- Time to recovery

**System Health:**
- Vitality score trend
- CPU/Memory usage
- API response times
- Error rates
- Dependency health

**Backup Metrics:**
- Backup success rate
- Backup size trend
- Restore test success
- Data retention compliance

### Dashboard Queries

```bash
# Deployment success rate (last 30 days)
jq -s '[.[] | select(.timestamp > (now - 2592000 | todate))] | group_by(.status) | map({status: .[0].status, count: length}) | map("\(.status): \(.count)")' /logs/deploy-history/*.json

# Average deployment time
jq -s '[.[] | .metrics.duration_seconds] | add / length' /logs/deploy-history/*.json

# Failed deployments this week
find /logs/deploy-history -name "*.json" -mtime -7 -exec jq -r 'select(.status == "failure") | .deployment_id + ": " + .commit.message' {} \;
```

---

## 🎯 Best Practices

1. **Always run health checks before deploying**
2. **Monitor vitality trends over time**
3. **Test backup restoration regularly**
4. **Keep deployment logs for audit trail**
5. **Use staging environment for testing**
6. **Document any manual interventions**
7. **Review failed deployments promptly**
8. **Maintain up-to-date runbooks**

---

## 📚 Additional Resources

- [GitHub Actions Documentation](https://docs.github.com/actions)
- [AWS CLI Reference](https://docs.aws.amazon.com/cli/)
- [Slack Webhook Guide](https://api.slack.com/messaging/webhooks)
- [Systemd Service Management](https://systemd.io/)

---

**Questions?** Check `/scripts/deploy/README.md` or contact the DevOps team.

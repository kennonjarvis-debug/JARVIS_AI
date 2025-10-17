# Jarvis V2 Deployment Scripts

Comprehensive deployment, backup, and monitoring scripts for Jarvis V2.

## 📁 Directory Structure

```
scripts/
├── backup/
│   └── s3-backup.sh          # Daily S3 backup script
└── deploy/
    ├── deploy.sh             # Main deployment script
    ├── health-check.sh       # Health monitoring script
    ├── slack-notify.sh       # Slack notification utility
    └── README.md             # This file
```

---

## 🚀 Deployment Scripts

### deploy.sh

Main deployment script with health checks, rollback, and notifications.

**Usage:**
```bash
./scripts/deploy/deploy.sh [staging|production]
```

**Environment Variables:**
- `JARVIS_ROOT` - Jarvis installation directory (default: `/opt/jarvis`)
- `GITHUB_SHA` - Git commit SHA
- `GITHUB_ACTOR` - Deployment author
- `COMMIT_MESSAGE` - Commit message

**Features:**
- ✅ Pre-deployment health check
- ✅ Automatic backup before deployment
- ✅ Database migrations
- ✅ Service restart
- ✅ Post-deployment verification
- ✅ Automatic rollback on failure
- ✅ Slack notifications

**Example:**
```bash
# Deploy to staging
./scripts/deploy/deploy.sh staging

# Deploy to production
./scripts/deploy/deploy.sh production
```

---

### health-check.sh

Check Jarvis vitality and system health before deployment.

**Usage:**
```bash
./scripts/deploy/health-check.sh [OPTIONS]
```

**Options:**
- `--threshold <number>` - Vitality threshold (default: 60)
- `--retries <number>` - Max retry attempts (default: 3)
- `--url <url>` - Jarvis API URL (default: http://localhost:3001)

**Environment Variables:**
- `JARVIS_API_URL` - Jarvis API endpoint
- `VITALITY_THRESHOLD` - Minimum vitality score
- `MAX_RETRIES` - Maximum retry attempts

**Exit Codes:**
- `0` - Health check passed, deployment allowed
- `1` - Health check failed, deployment blocked

**Example:**
```bash
# Check with default threshold (60)
./scripts/deploy/health-check.sh

# Check with custom threshold
./scripts/deploy/health-check.sh --threshold 70

# Check with retries
./scripts/deploy/health-check.sh --threshold 60 --retries 5
```

**Output:**
```
[INFO] Checking Jarvis API connectivity...
[INFO] ✅ Jarvis API is accessible (HTTP 200)
[INFO] Fetching Jarvis status...
[INFO] Current vitality: 85
[INFO] ✅ Vitality check passed (85 >= 60)
[INFO] Checking system health metrics...
[DEBUG] CPU Usage: 45%
[DEBUG] Memory Usage: 67%
[DEBUG] API Response Time: 234ms
[DEBUG] Error Rate: 0.2%

╔═══════════════════════════════════════════════╗
║        Jarvis Health Check Report            ║
╚═══════════════════════════════════════════════╝

  Timestamp:        2025-10-07 14:15:30 UTC
  API URL:          http://localhost:3001
  Vitality:         85
  Threshold:        60
  Deploy Allowed:   YES

  ✅ DEPLOYMENT ALLOWED
```

---

### slack-notify.sh

Send deployment notifications to Slack.

**Usage:**
```bash
./scripts/deploy/slack-notify.sh <status> <environment>
```

**Arguments:**
- `status` - Deployment status (success|failure|warning|started)
- `environment` - Target environment (staging|production)

**Environment Variables:**
- `SLACK_WEBHOOK_URL` - Slack webhook URL (required)
- `NOTIFICATION_TYPE` - Notification type (deployment|backup|health)
- `COMMIT_SHA` - Git commit SHA
- `COMMIT_MESSAGE` - Commit message
- `AUTHOR` - Deployment author
- `VITALITY` - Current vitality score
- `DEPLOY_URL` - Deployment workflow URL

**Example:**
```bash
# Deployment success
COMMIT_SHA="a1b2c3d" \
COMMIT_MESSAGE="Add new feature" \
AUTHOR="john.doe" \
VITALITY="85" \
./scripts/deploy/slack-notify.sh success production

# Deployment failure
./scripts/deploy/slack-notify.sh failure staging

# Health alert
NOTIFICATION_TYPE=health \
VITALITY="45" \
THRESHOLD="60" \
./scripts/deploy/slack-notify.sh warning production
```

---

## 💾 Backup Scripts

### s3-backup.sh

Daily backup of Jarvis data to AWS S3.

**Usage:**
```bash
./scripts/backup/s3-backup.sh
```

**Environment Variables:**
- `JARVIS_ROOT` - Jarvis installation directory (default: `/opt/jarvis`)
- `S3_BACKUP_BUCKET` - S3 bucket name (default: `jarvis-backups`)
- `BACKUP_RETENTION_DAYS` - Retention period (default: 30)
- `AWS_ACCESS_KEY_ID` - AWS access key
- `AWS_SECRET_ACCESS_KEY` - AWS secret key
- `AWS_REGION` - AWS region (default: `us-east-1`)

**What Gets Backed Up:**
- `/memory/` folder (adaptive memory)
- `/adaptive/` folder (learning data)
- `/logs/` folder (last 7 days)
- `/config/` folder (configuration files)

**Features:**
- ✅ Incremental backup with checksums
- ✅ Encryption verification
- ✅ Integrity checks
- ✅ Automatic cleanup of old backups
- ✅ Slack notifications

**Example:**
```bash
# Run manual backup
./scripts/backup/s3-backup.sh

# Run with custom settings
JARVIS_ROOT=/custom/path \
S3_BACKUP_BUCKET=my-backups \
RETENTION_DAYS=60 \
./scripts/backup/s3-backup.sh
```

**Output:**
```
[INFO] Starting Jarvis S3 Backup...
[INFO] Checking prerequisites...
[INFO] Prerequisites check passed ✅
[INFO] Verifying S3 bucket: jarvis-backups
[INFO] Bucket encryption: ENABLED ✅
[INFO] Creating backup archive...
[INFO] 📁 Backing up /memory...
[INFO] 🧠 Backing up /adaptive...
[INFO] 📋 Backing up /logs (last 7 days)...
[INFO] ⚙️  Backing up /config...
[INFO] Backup archive created ✅
[INFO] ☁️  Uploading backup to S3...
[INFO] Backup uploaded to s3://jarvis-backups/backups/2025-10-07-14-15-30/ ✅
[INFO] 🔍 Verifying backup integrity...
[INFO] ✅ All backups verified successfully

╔═══════════════════════════════════════════════╗
║        Jarvis S3 Backup Report               ║
╚═══════════════════════════════════════════════╝

  Timestamp:        2025-10-07-14-15-30
  Status:           SUCCESS ✅
  Backup Size:      245 MB
  Files Backed Up:  1247
  S3 Bucket:        s3://jarvis-backups/backups/2025-10-07-14-15-30/
  Retention:        30 days
```

---

## 🔄 GitHub Actions Integration

All scripts are integrated with GitHub Actions workflows:

### CI/CD Workflow
`.github/workflows/ci-cd.yml`

**Triggers:**
- Push to `main`, `develop`, or `release/**`
- Pull requests
- Release publication
- Manual dispatch

**Jobs:**
1. Setup & Dependencies
2. Lint & Type Check
3. Unit Tests
4. Integration Tests
5. E2E Tests
6. Security Scan
7. Build Application
8. Pre-Deploy Health Check
9. Deploy to Environment
10. Sync Memory to S3
11. Send Notifications
12. Log Deployment History

### Daily S3 Backup Workflow
`.github/workflows/daily-s3-backup.yml`

**Schedule:** Daily at 6:00 AM UTC

**Jobs:**
1. Backup to S3
2. Verify Backup Integrity
3. Cleanup Old Backups
4. Send Notifications

---

## 📊 Deployment History

Deployment logs are stored in `/logs/deploy-history/` following this schema:

```json
{
  "deployment_id": "1234567890",
  "timestamp": "2025-10-07T14:15:30Z",
  "status": "success",
  "environment": "staging",
  "commit": {
    "sha": "a1b2c3d",
    "message": "...",
    "author": "..."
  },
  "health": {
    "pre_deploy_vitality": 85,
    "post_deploy_vitality": 87
  },
  "jobs": { ... },
  "metrics": { ... },
  "backup": { ... }
}
```

**Schema:** `/logs/deploy-history/schema.json`

---

## 🔐 Required Secrets

Configure these secrets in GitHub Actions or environment:

**AWS:**
- `AWS_ACCESS_KEY_ID` - AWS access key
- `AWS_SECRET_ACCESS_KEY` - AWS secret key
- `AWS_REGION` - AWS region
- `S3_BACKUP_BUCKET` - S3 bucket for backups
- `DEPLOYMENT_BUCKET` - S3 bucket for deployment artifacts

**EC2 Deployment:**
- `EC2_SSH_KEY` - SSH private key for EC2
- `EC2_USER` - EC2 username
- `EC2_HOST` - EC2 hostname or IP

**Notifications:**
- `SLACK_WEBHOOK_URL` - Slack webhook URL
- `SMTP_HOST` - SMTP server host
- `SMTP_PORT` - SMTP server port
- `SMTP_USER` - SMTP username
- `SMTP_PASSWORD` - SMTP password
- `SMTP_FROM` - From email address
- `NOTIFY_EMAIL` - Notification recipient email

**Ngrok (Optional):**
- `NGROK_AUTH_TOKEN` - Ngrok authentication token

---

## 🚨 Troubleshooting

### Deployment Fails Health Check

**Symptom:** Deployment blocked due to low vitality

**Solution:**
1. Check Jarvis logs: `journalctl -u jarvis -n 100`
2. Review health endpoint: `curl http://localhost:3001/api/v1/jarvis/status`
3. Investigate system metrics (CPU, memory, error rate)
4. Fix underlying issues before retrying deployment

### Backup Fails

**Symptom:** S3 backup job fails

**Solution:**
1. Verify AWS credentials
2. Check S3 bucket permissions
3. Verify bucket encryption settings
4. Check disk space on EC2
5. Review backup logs

### Notifications Not Sent

**Symptom:** Slack/email notifications not received

**Solution:**
1. Verify `SLACK_WEBHOOK_URL` is set correctly
2. Test webhook: `curl -X POST $SLACK_WEBHOOK_URL -d '{"text":"test"}'`
3. Check SMTP settings for email
4. Review notification logs

---

## 📚 Additional Resources

- [GitHub Actions Documentation](https://docs.github.com/actions)
- [AWS S3 CLI Reference](https://docs.aws.amazon.com/cli/latest/reference/s3/)
- [Slack Webhook Guide](https://api.slack.com/messaging/webhooks)
- [Systemd Service Management](https://www.freedesktop.org/software/systemd/man/systemctl.html)

---

**Need Help?** Check the logs or open an issue in the repository.

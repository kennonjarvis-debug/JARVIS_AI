# Backup System - Quick Start Guide

Fast setup guide for the Jarvis AI backup and disaster recovery system.

---

## 1. Quick Setup (5 minutes)

### Generate Encryption Key

```bash
# Generate 256-bit encryption key
openssl rand -hex 32

# Add to .env file
echo "BACKUP_ENCRYPTION_KEY=$(openssl rand -hex 32)" >> .env
```

### Configure Backup Directory

```bash
# Create backup directory
sudo mkdir -p /var/backups/jarvis
sudo chown -R $USER:$USER /var/backups/jarvis
chmod 700 /var/backups/jarvis

# Add to .env
echo "BACKUP_DIR=/var/backups/jarvis" >> .env
```

### Enable Automated Backups

```bash
# Add to .env (already in .env.example)
cat >> .env << 'EOF'
BACKUP_DAILY_ENABLED=true
BACKUP_DAILY_TIME="0 2 * * *"
BACKUP_WEEKLY_ENABLED=true
BACKUP_WEEKLY_TIME="0 3 * * 0"
BACKUP_MONTHLY_ENABLED=true
BACKUP_MONTHLY_TIME="0 4 1 * *"
BACKUP_CLEANUP_ENABLED=true
BACKUP_CLEANUP_TIME="0 5 * * 0"
EOF
```

---

## 2. Manual Backup (2 minutes)

### Full System Backup

```bash
# PostgreSQL
bash scripts/backup-postgres.sh /var/backups/jarvis/postgres/manual.sql full

# Redis
bash scripts/backup-redis.sh /var/backups/jarvis/redis/manual.rdb

# Files
tar -czf /var/backups/jarvis/files/manual.tar.gz \
  /tmp/jarvis-music-uploads \
  /tmp/jarvis-generated-music \
  config/
```

### Quick Backup via API

```bash
curl -X POST http://localhost:4000/api/backups \
  -H "Content-Type: application/json" \
  -d '{"type": "full"}'
```

---

## 3. Restore (5 minutes)

### PostgreSQL Restore

```bash
# Dry run first (verify backup)
bash scripts/restore-postgres.sh /var/backups/jarvis/postgres/backup.sql.gz --dry-run

# Full restore
bash scripts/restore-postgres.sh /var/backups/jarvis/postgres/backup.sql.gz --drop-existing
```

### Redis Restore

```bash
# Restore from RDB
bash scripts/restore-redis.sh /var/backups/jarvis/redis/backup.rdb.gz --flush

# Or restore from JSON (preserves TTL)
bash scripts/restore-redis.sh /var/backups/jarvis/redis/backup.json.gz --from-json --flush
```

### File Restore

```bash
# Restore to original locations
bash scripts/restore-files.sh files_2025-10-17

# Or restore to custom directory
bash scripts/restore-files.sh files_2025-10-17 --target-dir /tmp/restore
```

---

## 4. Common Commands

### List Backups

```bash
# List all backups
ls -lh /var/backups/jarvis/postgres/
ls -lh /var/backups/jarvis/redis/
ls -lh /var/backups/jarvis/files/

# Via API
curl http://localhost:4000/api/backups
```

### Verify Backup

```bash
# Verify PostgreSQL backup
gunzip -c backup.sql.gz | head -100

# Verify Redis backup
redis-check-rdb backup.rdb

# Verify file backup
tar -tzf backup.tar.gz | head -20
```

### Cleanup Old Backups

```bash
# Delete backups older than 7 days
find /var/backups/jarvis -mtime +7 -delete

# Or use API
curl -X DELETE http://localhost:4000/api/backups/old
```

---

## 5. S3 Setup (Optional, 10 minutes)

### Create S3 Bucket

```bash
# Create bucket
aws s3 mb s3://jarvis-backups --region us-east-1

# Enable versioning
aws s3api put-bucket-versioning \
  --bucket jarvis-backups \
  --versioning-configuration Status=Enabled

# Enable encryption
aws s3api put-bucket-encryption \
  --bucket jarvis-backups \
  --server-side-encryption-configuration '{
    "Rules": [{
      "ApplyServerSideEncryptionByDefault": {
        "SSEAlgorithm": "AES256"
      }
    }]
  }'
```

### Configure S3 in .env

```bash
cat >> .env << 'EOF'
S3_ENABLED=true
S3_BUCKET=jarvis-backups
AWS_REGION=us-east-1
S3_ACCESS_KEY=your-access-key
S3_SECRET_KEY=your-secret-key
EOF
```

### Upload to S3

```bash
# Manual upload
aws s3 sync /var/backups/jarvis/ s3://jarvis-backups/

# Automated upload (already configured in backup service)
```

---

## 6. Testing (5 minutes)

### Run Full Test Suite

```bash
# Test all components
bash scripts/test-backup-restore.sh

# Test specific components
bash scripts/test-backup-restore.sh --skip-redis --skip-files
```

### Verify Backup Integrity

```bash
# Via API
curl -X POST http://localhost:4000/api/backups/latest/verify
```

---

## 7. Admin UI

Access the backup management UI:

```
http://localhost:3000/admin/backups
```

Features:
- View backup history
- Trigger manual backups
- Download backups
- Verify backups
- View statistics
- Monitor health

---

## 8. Monitoring

### Check Backup Status

```bash
# View statistics
curl http://localhost:4000/api/backups/stats/overview

# View schedule
curl http://localhost:4000/api/backups/schedule/status

# View history
curl http://localhost:4000/api/backups | jq '.[0:5]'
```

### Alert Configuration

Add to `.env`:

```bash
# iPhone notifications (Pushover)
PUSHOVER_USER_KEY=your-key
PUSHOVER_API_TOKEN=your-token

# Slack
SLACK_WEBHOOK_URL=https://hooks.slack.com/...

# Email
NOTIFICATION_EMAIL=admin@jarvis.ai
```

---

## 9. Disaster Recovery

### Complete System Failure

```bash
# 1. Download from S3
aws s3 sync s3://jarvis-backups/backups/latest/ /var/backups/jarvis/

# 2. Restore PostgreSQL
bash scripts/restore-postgres.sh /var/backups/jarvis/postgres/latest.sql.gz --drop-existing

# 3. Restore Redis
bash scripts/restore-redis.sh /var/backups/jarvis/redis/latest.rdb.gz --flush

# 4. Restore files
bash scripts/restore-files.sh /var/backups/jarvis/files/latest

# 5. Restart services
docker-compose restart

# 6. Verify
curl http://localhost:4000/health
```

**Expected Recovery Time:** 45-60 minutes

---

## 10. Troubleshooting

### Backup Fails

```bash
# Check disk space
df -h /var/backups/jarvis

# Check logs
tail -f /var/log/jarvis/backup.log

# Check permissions
ls -la /var/backups/jarvis
```

### Restore Fails

```bash
# Verify backup file
gunzip -t backup.sql.gz

# Check database connectivity
psql -h localhost -U jarvis_user -d postgres -c "\l"

# Dry run first
bash scripts/restore-postgres.sh backup.sql.gz --dry-run
```

### S3 Upload Fails

```bash
# Check credentials
aws sts get-caller-identity

# Check bucket permissions
aws s3api get-bucket-acl --bucket jarvis-backups

# Test upload
aws s3 cp test.txt s3://jarvis-backups/test.txt
```

---

## Key Metrics

- **RTO (Recovery Time Objective):** 1 hour
- **RPO (Recovery Point Objective):** 24 hours
- **Backup Frequency:** Daily at 2 AM
- **Retention:** 7 days (daily), 4 weeks (weekly), 12 months (monthly)
- **Encryption:** AES-256-GCM
- **Compression:** gzip level 9 (~80% reduction)

---

## Documentation

- **Full Guide:** `/docs/BACKUP_RESTORE.md`
- **Disaster Recovery Plan:** `/docs/DISASTER_RECOVERY.md`
- **Implementation Summary:** `/BACKUP_SYSTEM_IMPLEMENTATION_SUMMARY.md`

---

## Support

**For Emergency Support:**
- Email: oncall@jarvis.ai
- Phone: +1-XXX-XXX-XXXX
- Slack: #incidents

**For General Questions:**
- Email: engineering@jarvis.ai
- Documentation: `/docs/`

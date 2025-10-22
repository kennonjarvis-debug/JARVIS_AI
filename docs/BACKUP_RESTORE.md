# Backup and Restore Guide

Complete guide for backup and restore operations in the Jarvis AI platform.

---

## Table of Contents

1. [Overview](#overview)
2. [Automated Backup Configuration](#automated-backup-configuration)
3. [Manual Backup Procedures](#manual-backup-procedures)
4. [Restore Procedures](#restore-procedures)
5. [Troubleshooting](#troubleshooting)
6. [Best Practices](#best-practices)

---

## Overview

The Jarvis AI platform includes a comprehensive backup and disaster recovery system that protects all critical data.

### What Gets Backed Up

- **PostgreSQL Database:** All user data, configurations, and system state
- **Redis Database:** Sessions, cache, and real-time data
- **User Files:** Music uploads, generated audio, and user content
- **Secrets:** Encrypted API keys and credentials
- **Configuration:** Application settings and environment variables

### Backup Features

- AES-256-GCM encryption
- gzip compression (level 9)
- Incremental file backups
- Multi-destination storage (local + S3)
- Automated verification
- Retention policies
- Point-in-time recovery

---

## Automated Backup Configuration

### Environment Variables

Add these to your `.env` file:

```bash
# Backup Configuration
BACKUP_DIR=/var/backups/jarvis
BACKUP_ENCRYPTION_KEY=your-64-char-hex-key-here

# Backup Schedule
BACKUP_DAILY_ENABLED=true
BACKUP_DAILY_TIME="0 2 * * *"  # 2 AM daily
BACKUP_WEEKLY_ENABLED=true
BACKUP_WEEKLY_TIME="0 3 * * 0"  # 3 AM Sunday
BACKUP_MONTHLY_ENABLED=true
BACKUP_MONTHLY_TIME="0 4 1 * *"  # 4 AM 1st of month
BACKUP_CLEANUP_ENABLED=true
BACKUP_CLEANUP_TIME="0 5 * * 0"  # 5 AM Sunday

# S3 Configuration (optional)
S3_ENABLED=true
S3_BUCKET=jarvis-backups
S3_ACCESS_KEY=your-access-key
S3_SECRET_KEY=your-secret-key
AWS_REGION=us-east-1

# Retention Policy
BACKUP_RETENTION_DAILY=7      # Keep daily backups for 7 days
BACKUP_RETENTION_WEEKLY=4     # Keep weekly backups for 4 weeks
BACKUP_RETENTION_MONTHLY=12   # Keep monthly backups for 12 months
```

### Generate Encryption Key

```bash
# Generate a secure 256-bit encryption key
openssl rand -hex 32

# Add to .env file
echo "BACKUP_ENCRYPTION_KEY=$(openssl rand -hex 32)" >> .env
```

### Initialize Backup Service

```bash
# Start backup scheduler
npm run backup:init

# Verify schedule
npm run backup:status
```

---

## Manual Backup Procedures

### Full System Backup

Create a complete backup of all components:

```bash
# Using the backup service
npm run backup:full

# Or via API
curl -X POST http://localhost:4000/api/backups \
  -H "Content-Type: application/json" \
  -d '{"type": "full"}'
```

### PostgreSQL Backup

#### Full Database Backup

```bash
# Standard backup
bash scripts/backup-postgres.sh /var/backups/jarvis/postgres/manual_$(date +%Y%m%d).sql full

# With verification
VERIFY_RESTORE=true bash scripts/backup-postgres.sh /var/backups/jarvis/postgres/manual.sql full
```

#### Schema-Only Backup

```bash
bash scripts/backup-postgres.sh /var/backups/jarvis/postgres/schema.sql schema
```

#### Data-Only Backup

```bash
bash scripts/backup-postgres.sh /var/backups/jarvis/postgres/data.sql data
```

### Redis Backup

#### RDB Snapshot

```bash
# Create RDB snapshot
bash scripts/backup-redis.sh /var/backups/jarvis/redis/manual_$(date +%Y%m%d).rdb

# Creates both RDB and JSON export
ls -lh /var/backups/jarvis/redis/
```

#### JSON Export Only

The script automatically creates a JSON export for portability:

```bash
# View JSON backup
cat /var/backups/jarvis/redis/manual.json | jq .
```

### File Backup

#### Full File Backup

```bash
# Using TypeScript service
npm run backup:files

# Manual tar backup
tar -czf /var/backups/jarvis/files/manual_$(date +%Y%m%d).tar.gz \
  /tmp/jarvis-music-uploads \
  /tmp/jarvis-generated-music \
  config/
```

#### Incremental File Backup

```bash
# Only backs up changed files
npm run backup:files:incremental
```

### Backup to S3

#### Upload Existing Backup

```bash
# Upload specific backup
aws s3 cp /var/backups/jarvis/postgres/backup.sql.gz \
  s3://jarvis-backups/postgres/backup.sql.gz

# Upload entire backup directory
aws s3 sync /var/backups/jarvis/ s3://jarvis-backups/
```

---

## Restore Procedures

### PostgreSQL Restore

#### Full Database Restore

```bash
# Dry run (verify backup without changes)
bash scripts/restore-postgres.sh /var/backups/jarvis/postgres/backup.sql.gz --dry-run

# Full restore (drops existing database)
bash scripts/restore-postgres.sh /var/backups/jarvis/postgres/backup.sql.gz --drop-existing

# Restore to new database
POSTGRES_DB=jarvis_db_restored bash scripts/restore-postgres.sh backup.sql.gz
```

#### Restore from S3

```bash
# Download from S3
aws s3 cp s3://jarvis-backups/postgres/backup.sql.gz /tmp/

# Restore
bash scripts/restore-postgres.sh /tmp/backup.sql.gz --drop-existing
```

#### Restore Specific Tables

```bash
# Extract specific table from backup
pg_restore -t users /var/backups/jarvis/postgres/backup.dump

# Or use psql with grep
gunzip -c backup.sql.gz | grep -A 1000 "CREATE TABLE users" > users_table.sql
psql -h localhost -U jarvis_user -d jarvis_db -f users_table.sql
```

### Redis Restore

#### Restore from RDB

```bash
# Dry run
bash scripts/restore-redis.sh /var/backups/jarvis/redis/backup.rdb.gz --dry-run

# Full restore (flushes existing data)
bash scripts/restore-redis.sh /var/backups/jarvis/redis/backup.rdb.gz --flush
```

#### Restore from JSON

```bash
# Restore from JSON export (preserves TTL)
bash scripts/restore-redis.sh /var/backups/jarvis/redis/backup.json.gz --from-json --flush
```

### File Restore

#### Restore All Files

```bash
# Restore to original locations
bash scripts/restore-files.sh files_2025-10-17

# Restore to custom directory
bash scripts/restore-files.sh files_2025-10-17 --target-dir /tmp/restored
```

#### Restore Specific Files

```bash
# Extract specific files from tar archive
tar -xzf /var/backups/jarvis/files/backup.tar.gz \
  -C /tmp/restored \
  path/to/specific/file
```

### Complete System Restore

Step-by-step complete system restoration:

```bash
# 1. Stop all services
docker-compose down

# 2. Download backups from S3 (if needed)
aws s3 sync s3://jarvis-backups/backups/latest/ /var/backups/jarvis/

# 3. Restore PostgreSQL
bash scripts/restore-postgres.sh /var/backups/jarvis/postgres/latest.sql.gz --drop-existing

# 4. Restore Redis
bash scripts/restore-redis.sh /var/backups/jarvis/redis/latest.rdb.gz --flush

# 5. Restore files
bash scripts/restore-files.sh /var/backups/jarvis/files/latest

# 6. Restore environment variables
cp /var/backups/jarvis/secrets/latest.json .env

# 7. Start services
docker-compose up -d

# 8. Verify restoration
npm run health:check
```

---

## Troubleshooting

### Backup Issues

#### Backup Fails - Insufficient Disk Space

```bash
# Check disk space
df -h

# Clean up old backups
npm run backup:cleanup

# Or manually
find /var/backups/jarvis -mtime +7 -delete
```

#### Backup Fails - Database Lock

```bash
# For PostgreSQL, use --no-owner and --no-acl flags (already in script)
# For Redis, ensure BGSAVE is completing:
redis-cli LASTSAVE
```

#### Backup Files Are Too Large

```bash
# Enable compression (already enabled in scripts)
# Adjust compression level in backup scripts

# For PostgreSQL, use custom format
pg_dump -Fc -f backup.dump jarvis_db

# For files, exclude large temporary files
tar --exclude='*.tmp' --exclude='*.cache' -czf backup.tar.gz /path
```

### Restore Issues

#### Restore Fails - Version Mismatch

```bash
# Check PostgreSQL version
psql --version

# Check backup version
pg_restore --version

# If mismatch, upgrade/downgrade PostgreSQL or use compatible pg_dump format
```

#### Restore Fails - Permissions Error

```bash
# Ensure correct database user
psql -h localhost -U postgres -c "ALTER USER jarvis_user WITH SUPERUSER;"

# After restore, remove superuser
psql -h localhost -U postgres -c "ALTER USER jarvis_user WITH NOSUPERUSER;"
```

#### Partial Restore - Some Tables Missing

```bash
# Check backup integrity
gunzip -c backup.sql.gz | grep "CREATE TABLE"

# Verify backup metadata
cat backup.sql.metadata.json | jq .

# Re-run backup if integrity check fails
```

### Verification Issues

#### Checksum Mismatch

```bash
# Recalculate checksum
sha256sum /var/backups/jarvis/postgres/backup.sql.gz

# Compare with metadata
cat backup.sql.gz.metadata.json | jq .checksum

# If mismatch, backup may be corrupted - create new backup
```

---

## Best Practices

### Before Backup

1. **Test in Development First**
   ```bash
   # Test backup/restore cycle in dev environment
   NODE_ENV=development npm run backup:test
   ```

2. **Verify Disk Space**
   ```bash
   # Ensure at least 2x database size available
   df -h /var/backups/jarvis
   ```

3. **Check Database Health**
   ```bash
   # PostgreSQL
   psql -c "SELECT pg_database_size('jarvis_db');"

   # Redis
   redis-cli INFO memory
   ```

### During Backup

1. **Monitor Backup Progress**
   ```bash
   # Watch backup logs
   tail -f /var/log/jarvis/backup.log
   ```

2. **Avoid Concurrent Backups**
   - Backup service prevents concurrent runs
   - Manual backups should be coordinated

3. **Low-Priority I/O**
   - Backups use `ionice` for low priority
   - Won't impact production performance

### After Backup

1. **Verify Backup Integrity**
   ```bash
   # Automated verification
   npm run backup:verify latest

   # Manual verification
   bash scripts/test-backup-restore.sh
   ```

2. **Test Restore Procedure**
   ```bash
   # Monthly dry run
   bash scripts/restore-postgres.sh backup.sql.gz --dry-run
   ```

3. **Upload to S3**
   ```bash
   # Automatic if S3_ENABLED=true
   # Manual upload
   aws s3 sync /var/backups/jarvis/ s3://jarvis-backups/
   ```

### Security Best Practices

1. **Encrypt All Backups**
   - Always use AES-256-GCM encryption
   - Rotate encryption keys annually
   - Store keys in AWS Secrets Manager

2. **Restrict Backup Access**
   ```bash
   # Secure backup directory
   chmod 700 /var/backups/jarvis
   chown jarvis:jarvis /var/backups/jarvis
   ```

3. **Secure S3 Bucket**
   - Enable bucket encryption
   - Enable versioning
   - Use IAM roles, not access keys
   - Enable MFA delete

4. **Audit Backup Access**
   ```bash
   # Enable S3 access logging
   aws s3api put-bucket-logging --bucket jarvis-backups \
     --bucket-logging-status file://logging.json
   ```

### Retention Best Practices

1. **Follow 3-2-1 Rule**
   - 3 copies of data
   - 2 different media types (disk + S3)
   - 1 off-site copy (S3 in different region)

2. **Implement Lifecycle Policies**
   ```bash
   # Transition to Glacier after 90 days
   # Delete after 365 days (except monthly)
   ```

3. **Test Old Backups**
   ```bash
   # Quarterly test of oldest backup
   bash scripts/restore-postgres.sh oldest_backup.sql.gz --dry-run
   ```

---

## Monitoring and Alerts

### Backup Health Monitoring

```bash
# View backup statistics
curl http://localhost:4000/api/backups/stats/overview

# Check last backup time
curl http://localhost:4000/api/backups | jq '.[0]'

# View backup schedule
curl http://localhost:4000/api/backups/schedule/status
```

### Automated Alerts

The backup system sends alerts for:
- Backup failures
- Missing backups (>25 hours)
- Verification failures
- Low disk space
- S3 upload failures

Configure alert destinations in `.env`:

```bash
# Pushover (iPhone notifications)
PUSHOVER_USER_KEY=your-key
PUSHOVER_API_TOKEN=your-token

# Slack
SLACK_WEBHOOK_URL=https://hooks.slack.com/...

# Email
NOTIFICATION_EMAIL=admin@jarvis.ai
```

---

## API Reference

### Trigger Backup

```bash
POST /api/backups
Content-Type: application/json

{
  "type": "full"  # or "incremental"
}
```

### List Backups

```bash
GET /api/backups
```

### Get Backup Details

```bash
GET /api/backups/:id
```

### Verify Backup

```bash
POST /api/backups/:id/verify
```

### Download Backup

```bash
GET /api/backups/:id/download
```

### Restore Backup

```bash
POST /api/backups/:id/restore
Content-Type: application/json

{
  "type": "postgres",  # or "redis", "files", "full"
  "dry_run": false
}
```

---

## Additional Resources

- **Disaster Recovery Plan:** `/docs/DISASTER_RECOVERY.md`
- **TLS Setup:** `/docs/TLS_SETUP.md`
- **Security:** `/docs/SECRETS_MANAGEMENT.md`
- **Database Encryption:** `/docs/DATABASE_ENCRYPTION.md`

---

**For Support:** Contact engineering@jarvis.ai

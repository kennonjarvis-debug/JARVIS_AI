# Disaster Recovery Plan

**Jarvis AI Platform**
**Version:** 2.0
**Last Updated:** 2025-10-17
**RTO:** 1 hour
**RPO:** 24 hours

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Disaster Recovery Objectives](#disaster-recovery-objectives)
3. [Backup Strategy](#backup-strategy)
4. [Recovery Procedures](#recovery-procedures)
5. [Incident Response](#incident-response)
6. [Contact Information](#contact-information)
7. [Testing Schedule](#testing-schedule)

---

## Executive Summary

This document outlines the disaster recovery procedures for the Jarvis AI platform. In the event of a catastrophic failure, data loss, or system compromise, follow these procedures to restore service with minimal downtime and data loss.

### Key Metrics

- **RTO (Recovery Time Objective):** 1 hour
- **RPO (Recovery Point Objective):** 24 hours
- **Backup Frequency:** Daily at 2:00 AM
- **Backup Retention:** 7 days (daily), 4 weeks (weekly), 12 months (monthly)
- **Backup Locations:** Local storage + AWS S3 (multi-region)

---

## Disaster Recovery Objectives

### Recovery Time Objective (RTO)

**Target:** 1 hour from incident detection to full service restoration

**Breakdown:**
- Incident detection and assessment: 15 minutes
- Decision to initiate DR: 5 minutes
- Infrastructure provisioning: 15 minutes
- Data restoration: 20 minutes
- Service verification and testing: 5 minutes

### Recovery Point Objective (RPO)

**Target:** 24 hours maximum data loss

**Implementation:**
- Daily backups at 2:00 AM
- Last backup is never more than 24 hours old
- Critical data changes are replicated in real-time to Redis

---

## Backup Strategy

### Automated Backups

#### Daily Backups
- **Schedule:** 2:00 AM every day
- **Type:** Incremental (files), Full (databases)
- **Retention:** 7 days
- **Contents:**
  - PostgreSQL database (full dump)
  - Redis snapshots
  - User uploaded files (incremental)
  - Configuration files
  - Secrets (encrypted)

#### Weekly Backups
- **Schedule:** 3:00 AM every Sunday
- **Type:** Full backup
- **Retention:** 4 weeks
- **Contents:** Complete system snapshot

#### Monthly Backups
- **Schedule:** 4:00 AM on the 1st of each month
- **Type:** Full archival backup
- **Retention:** 12 months
- **Contents:** Complete system snapshot with long-term archival

### Backup Components

#### 1. PostgreSQL Database
- **Method:** `pg_dump` with custom format
- **Encryption:** AES-256-GCM
- **Compression:** gzip level 9
- **Includes:**
  - All tables
  - Indexes
  - Sequences
  - Constraints
  - User data
  - System configuration

#### 2. Redis Database
- **Method:** RDB snapshot + JSON export
- **Encryption:** AES-256-GCM
- **Includes:**
  - Session data
  - Cache data
  - Real-time data
  - TTL information

#### 3. User Files
- **Method:** Incremental tar archives
- **Compression:** gzip
- **Includes:**
  - Music uploads
  - Generated audio files
  - User profiles
  - Configuration files

#### 4. Secrets
- **Method:** Encrypted JSON export
- **Encryption:** Double AES-256-GCM
- **Includes:**
  - API keys
  - Database credentials
  - JWT secrets
  - AWS credentials

### Backup Storage

#### Primary Location
- **Type:** Local disk storage
- **Path:** `/var/backups/jarvis/`
- **Encryption:** At rest (AES-256)

#### Secondary Location
- **Type:** AWS S3
- **Bucket:** `jarvis-backups`
- **Region:** `us-east-1` (primary), `us-west-2` (replica)
- **Encryption:** Server-side encryption (AES-256)
- **Versioning:** Enabled
- **Lifecycle:** Automated transition to Glacier after 90 days

---

## Recovery Procedures

### Complete System Failure

**Scenario:** Total system loss, need to rebuild from scratch

#### Step 1: Provision Infrastructure (15 minutes)

```bash
# 1. Launch new EC2 instance or provision server
# 2. Install base operating system (Ubuntu 22.04 LTS)
# 3. Install Docker and Docker Compose
sudo apt update
sudo apt install -y docker.io docker-compose git

# 4. Clone Jarvis repository
git clone https://github.com/your-org/jarvis.git
cd jarvis
```

#### Step 2: Restore from Backup (20 minutes)

```bash
# 1. Download latest backup from S3
export AWS_ACCESS_KEY_ID=your-key
export AWS_SECRET_ACCESS_KEY=your-secret

aws s3 sync s3://jarvis-backups/backups/latest /var/backups/jarvis/

# 2. Restore PostgreSQL
cd /var/backups/jarvis
bash scripts/restore-postgres.sh postgres/latest.sql.gz

# 3. Restore Redis
bash scripts/restore-redis.sh redis/latest.rdb.gz

# 4. Restore files
bash scripts/restore-files.sh files/latest.tar.gz

# 5. Restore secrets
cp secrets/latest.json .env
```

#### Step 3: Start Services (10 minutes)

```bash
# 1. Start infrastructure
docker-compose up -d postgres redis

# 2. Wait for databases to initialize
sleep 30

# 3. Run database migrations
npm run db:migrate

# 4. Start application services
docker-compose up -d

# 5. Verify services
docker-compose ps
```

#### Step 4: Verify System (5 minutes)

```bash
# 1. Health checks
curl http://localhost:4000/health

# 2. Database connectivity
psql -h localhost -U jarvis_user -d jarvis_db -c "SELECT COUNT(*) FROM users;"

# 3. Redis connectivity
redis-cli PING

# 4. API endpoints
curl http://localhost:4000/api/status

# 5. Check logs
docker-compose logs -f --tail=100
```

### Database Corruption

**Scenario:** PostgreSQL database is corrupted

```bash
# 1. Stop application
docker-compose stop

# 2. Backup current state (even if corrupted)
pg_dump -h localhost -U jarvis_user -d jarvis_db > /tmp/corrupted_backup.sql

# 3. Drop corrupted database
psql -h localhost -U jarvis_user -d postgres -c "DROP DATABASE jarvis_db;"

# 4. Recreate database
psql -h localhost -U jarvis_user -d postgres -c "CREATE DATABASE jarvis_db;"

# 5. Restore from latest backup
bash scripts/restore-postgres.sh /var/backups/jarvis/postgres/latest.sql.gz --drop-existing

# 6. Verify restoration
psql -h localhost -U jarvis_user -d jarvis_db -c "SELECT COUNT(*) FROM users;"

# 7. Restart application
docker-compose start
```

### Redis Data Loss

**Scenario:** Redis cache is lost or corrupted

```bash
# 1. Stop Redis
docker-compose stop redis

# 2. Restore from RDB backup
bash scripts/restore-redis.sh /var/backups/jarvis/redis/latest.rdb.gz --flush

# 3. Start Redis
docker-compose start redis

# 4. Verify restoration
redis-cli DBSIZE
```

### Accidental File Deletion

**Scenario:** User files were accidentally deleted

```bash
# 1. List available backups
ls -la /var/backups/jarvis/files/

# 2. Restore specific backup
bash scripts/restore-files.sh files_2025-10-17 --target-dir /tmp/restored-files

# 3. Copy specific files back
cp -r /tmp/restored-files/path/to/deleted/files /path/to/original/location

# 4. Verify restoration
ls -la /path/to/original/location
```

---

## Incident Response

### Incident Classification

#### Severity 1 - Critical
- Complete system failure
- Data breach
- Major data loss
- **Response Time:** Immediate (24/7)
- **Escalation:** CTO, CEO

#### Severity 2 - High
- Partial system failure
- Database corruption
- Service degradation affecting >50% users
- **Response Time:** 1 hour
- **Escalation:** Engineering Lead

#### Severity 3 - Medium
- Minor service disruption
- Individual file loss
- Performance degradation
- **Response Time:** 4 hours
- **Escalation:** On-call engineer

### Response Workflow

1. **Detect:** Monitoring alerts, user reports, health checks
2. **Assess:** Determine severity and impact
3. **Notify:** Alert on-call team and stakeholders
4. **Respond:** Execute recovery procedures
5. **Verify:** Confirm system restoration
6. **Document:** Create post-incident report

### Communication Protocol

- **Internal:** Slack #incidents channel
- **External:** Status page updates every 15 minutes
- **Customers:** Email notification when resolved

---

## Contact Information

### Emergency Contacts

**Primary On-Call Engineer**
- Name: [Your Name]
- Phone: +1-XXX-XXX-XXXX
- Email: oncall@jarvis.ai
- Backup: [Backup Name]

**Engineering Lead**
- Name: [Lead Name]
- Phone: +1-XXX-XXX-XXXX
- Email: engineering@jarvis.ai

**CTO**
- Name: [CTO Name]
- Phone: +1-XXX-XXX-XXXX
- Email: cto@jarvis.ai

### Service Providers

**AWS Support**
- Support Level: Business
- Phone: 1-866-720-6105
- Case Portal: console.aws.amazon.com/support

**Database Administrator**
- Name: [DBA Name]
- Phone: +1-XXX-XXX-XXXX
- Email: dba@jarvis.ai

---

## Testing Schedule

### Regular Testing

**Monthly DR Drill**
- **Schedule:** First Saturday of each month
- **Scope:** Full backup + restore cycle
- **Duration:** 2 hours
- **Participants:** Engineering team
- **Deliverable:** Test report

**Quarterly Failover Test**
- **Schedule:** Every quarter
- **Scope:** Complete infrastructure failover
- **Duration:** 4 hours
- **Participants:** Full engineering + operations team
- **Deliverable:** Updated DR plan

**Annual DR Exercise**
- **Schedule:** Once per year
- **Scope:** Simulated disaster scenario
- **Duration:** Full day
- **Participants:** All technical staff
- **Deliverable:** Lessons learned document

### Test Checklist

- [ ] Backup creation successful
- [ ] Backup encryption verified
- [ ] Backup uploaded to S3
- [ ] PostgreSQL restore successful
- [ ] Redis restore successful
- [ ] File restore successful
- [ ] Application starts successfully
- [ ] All services healthy
- [ ] Data integrity verified
- [ ] Performance acceptable
- [ ] Documentation updated

---

## Appendix

### Backup Verification Commands

```bash
# Verify PostgreSQL backup
bash scripts/backup-postgres.sh /var/backups/jarvis/postgres/test.sql full
bash scripts/restore-postgres.sh /var/backups/jarvis/postgres/test.sql --dry-run

# Verify Redis backup
bash scripts/backup-redis.sh /var/backups/jarvis/redis/test.rdb
bash scripts/restore-redis.sh /var/backups/jarvis/redis/test.rdb --dry-run

# Verify file backup integrity
sha256sum /var/backups/jarvis/files/latest.tar.gz
```

### Common Issues and Solutions

**Issue:** Backup fails due to disk space
- **Solution:** Clean up old backups, increase disk size, enable S3-only backups

**Issue:** Restore takes longer than RTO
- **Solution:** Use parallel restoration, optimize database indexes, increase instance size

**Issue:** S3 upload fails
- **Solution:** Check AWS credentials, verify network connectivity, check S3 bucket permissions

---

## Document Revision History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2025-10-17 | System | Initial disaster recovery plan |
| 2.0 | 2025-10-17 | System | Added comprehensive backup procedures |

---

**For Emergency Support:** Contact oncall@jarvis.ai or call +1-XXX-XXX-XXXX

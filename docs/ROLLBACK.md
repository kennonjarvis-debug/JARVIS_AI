# Rollback Procedures

Complete guide for rolling back deployments when issues arise.

## When to Rollback

Rollback immediately if:

- ✗ Critical functionality broken
- ✗ Data corruption or loss
- ✗ Security vulnerability introduced
- ✗ Performance degradation >50%
- ✗ Error rate >5%
- ✗ Service unavailable
- ✗ Database migration failures
- ✗ Third-party integration failures

## Rollback Types

### 1. Automatic Rollback

Triggered automatically when:
- Smoke tests fail after deployment
- Health checks fail
- High error rates detected
- Traffic monitoring shows issues

### 2. Manual Rollback

Initiated by operator when:
- User-reported critical issues
- Monitoring alerts
- Performance degradation
- Business requirement

## Quick Rollback

### Emergency Rollback (< 5 minutes)

```bash
# Fastest rollback method
./scripts/rollback.sh production

# Or manually with kubectl
kubectl rollout undo deployment/jarvis-api -n production

# Verify rollback
kubectl rollout status deployment/jarvis-api -n production
```

## Detailed Rollback Procedures

### Step 1: Assess Situation

```bash
# 1. Check current deployment status
kubectl get deployment jarvis-api -n production

# 2. View recent events
kubectl get events -n production --sort-by='.lastTimestamp' | tail -20

# 3. Check error rates
kubectl logs -n production -l app=jarvis-api --tail=100 | grep -i error

# 4. Review monitoring dashboards
# - Sentry for errors
# - CloudWatch for metrics
# - Grafana for system health

# 5. Confirm rollback is needed
read -p "Proceed with rollback? (yes/no): " -r
```

### Step 2: Notify Team

```bash
# 1. Send Slack notification
curl -X POST $SLACK_WEBHOOK_URL \
  -H 'Content-Type: application/json' \
  -d '{"text": "⚠️ ROLLBACK IN PROGRESS - Production deployment"}'

# 2. Create incident ticket
# In PagerDuty or incident management system

# 3. Update status page
# If public status page exists
```

### Step 3: Execute Rollback

#### Option A: Automated Script (Recommended)

```bash
# Run rollback script
./scripts/rollback.sh production

# Script will:
# 1. Confirm rollback
# 2. Backup current state
# 3. Rollback Kubernetes deployment
# 4. Wait for rollback completion
# 5. Verify rollback success
# 6. Optionally rollback database
# 7. Run smoke tests
# 8. Generate incident report
```

#### Option B: Kubernetes Rollback

```bash
# 1. View deployment history
kubectl rollout history deployment/jarvis-api -n production

# 2. Rollback to previous revision
kubectl rollout undo deployment/jarvis-api -n production

# 3. Or rollback to specific revision
kubectl rollout undo deployment/jarvis-api -n production --to-revision=5

# 4. Wait for rollback to complete
kubectl rollout status deployment/jarvis-api -n production --timeout=5m
```

#### Option C: Blue-Green Rollback

```bash
# If using blue-green deployment

# 1. Identify current color
CURRENT_COLOR=$(kubectl get service jarvis-api -n production -o jsonpath='{.spec.selector.color}')
echo "Current: $CURRENT_COLOR"

# 2. Switch back to previous color
PREVIOUS_COLOR=$([[ "$CURRENT_COLOR" == "blue" ]] && echo "green" || echo "blue")

# 3. Update service selector
kubectl patch service jarvis-api -n production -p "{\"spec\":{\"selector\":{\"color\":\"$PREVIOUS_COLOR\"}}}"

# 4. Scale up previous deployment if needed
kubectl scale deployment/jarvis-api-$PREVIOUS_COLOR -n production --replicas=3

# 5. Verify traffic switched
kubectl get endpoints jarvis-api -n production
```

### Step 4: Verify Rollback

```bash
# 1. Check pod status
kubectl get pods -n production -l app=jarvis-api

# Expected output: All pods Running and Ready

# 2. Run smoke tests
./scripts/smoke-tests.sh https://jarvis-ai.app

# 3. Check health endpoint
curl https://jarvis-ai.app/health | jq .

# 4. Verify version
curl https://jarvis-ai.app/api | jq .version

# 5. Monitor logs
kubectl logs -n production -l app=jarvis-api --tail=50

# 6. Check error rates
# Should return to normal levels
```

### Step 5: Database Rollback (If Needed)

```bash
# Only if database migrations were applied

# 1. List available backups
ls -lh backups/migrations/

# 2. Identify pre-deployment backup
BACKUP_FILE=$(find backups/migrations -name "pre-migration-production-*.sql.gz" | sort -r | head -n 1)

# 3. Review backup details
echo "Backup: $BACKUP_FILE"
gunzip -c "$BACKUP_FILE" | head -n 20

# 4. Restore database (CAUTION!)
./scripts/restore-database.sh production "$BACKUP_FILE"

# 5. Verify database state
kubectl exec -n production deployment/jarvis-api -- npx prisma migrate status

# 6. Run database smoke tests
# Verify critical queries work
```

### Step 6: Post-Rollback Validation

```bash
# Monitor for 15-30 minutes

# 1. Watch pod health
kubectl get pods -n production -l app=jarvis-api -w

# 2. Monitor error rates
kubectl logs -n production -l app=jarvis-api -f | grep -i error

# 3. Check key metrics
# - Response times
# - Error rates
# - Database performance
# - Cache hit rates

# 4. Verify user functionality
# - Login/logout
# - Critical user flows
# - API endpoints

# 5. Review monitoring dashboards
# - Sentry errors
# - CloudWatch metrics
# - Application Performance Monitoring
```

### Step 7: Document Incident

```bash
# Incident report auto-generated at:
cat logs/incidents/incident-production-$(date +%Y%m%d)*.md

# Add additional details:
# 1. Root cause
# 2. Impact assessment
# 3. Timeline of events
# 4. Resolution steps
# 5. Preventive measures
# 6. Action items
```

## Database Rollback

### When to Rollback Database

Rollback database only if:
- Data corruption occurred
- Migration caused service failure
- Schema changes broke application
- Data loss detected

### Database Rollback Procedure

```bash
# 1. Stop application (prevent writes)
kubectl scale deployment/jarvis-api -n production --replicas=0

# 2. Verify no connections
kubectl exec -n production deployment/jarvis-postgres -- \
  psql -c "SELECT count(*) FROM pg_stat_activity WHERE datname='jarvis_production';"

# 3. Create current state backup
./scripts/backup-database.sh production current-state

# 4. Restore from pre-migration backup
BACKUP_FILE="backups/migrations/pre-migration-production-20240117_143022.sql.gz"

gunzip -c "$BACKUP_FILE" | kubectl exec -i -n production deployment/jarvis-postgres -- \
  psql -U jarvis -d jarvis_production

# 5. Verify restore
kubectl exec -n production deployment/jarvis-postgres -- \
  psql -U jarvis -d jarvis_production -c "\dt"

# 6. Restart application
kubectl scale deployment/jarvis-api -n production --replicas=3

# 7. Verify application
kubectl rollout status deployment/jarvis-api -n production
```

## Partial Rollback

Sometimes you need to rollback specific components:

### Rollback Specific Service

```bash
# Rollback only API service
kubectl rollout undo deployment/jarvis-api -n production

# Keep worker service at current version
# (no action needed)
```

### Rollback Configuration Only

```bash
# Revert ConfigMap
kubectl rollout undo configmap/jarvis-config -n production

# Restart pods to apply
kubectl rollout restart deployment/jarvis-api -n production
```

### Rollback Feature Flag

```bash
# Disable feature via environment variable
kubectl set env deployment/jarvis-api -n production FEATURE_NEW_DASHBOARD=false

# Or update ConfigMap
kubectl edit configmap jarvis-config -n production
```

## Rollback Decision Tree

```
Issue Detected
    │
    ├─ Critical (data loss, security, complete outage)
    │   └─> IMMEDIATE ROLLBACK
    │
    ├─ High (broken features, high error rate)
    │   └─> Assess impact → Quick fix possible?
    │       ├─ Yes → Deploy hotfix
    │       └─ No → ROLLBACK
    │
    ├─ Medium (degraded performance, minor bugs)
    │   └─> Monitor → Deploy fix within hours
    │
    └─ Low (cosmetic issues, edge cases)
        └─> Schedule fix for next release
```

## Common Rollback Scenarios

### Scenario 1: Failed Deployment

**Symptoms:** Pods crash looping, health checks failing

```bash
# Quick rollback
kubectl rollout undo deployment/jarvis-api -n production

# Check issue
kubectl logs -n production <failing-pod-name>

# Fix and redeploy
```

### Scenario 2: Database Migration Failure

**Symptoms:** Application errors after migration

```bash
# 1. Rollback application
./scripts/rollback.sh production

# 2. Rollback database
./scripts/restore-database.sh production <backup-file>

# 3. Fix migration
# Edit migration files

# 4. Re-deploy when fixed
```

### Scenario 3: Performance Degradation

**Symptoms:** Slow response times, timeouts

```bash
# 1. Quick assessment
kubectl top pods -n production

# 2. Check if rollback helps
./scripts/rollback.sh production

# 3. If issue persists, may be infrastructure
# Check database, cache, network

# 4. If rollback fixes it
# Investigate performance regression in code
```

### Scenario 4: Third-Party Integration Breaking

**Symptoms:** External API calls failing

```bash
# 1. Disable feature flag
kubectl set env deployment/jarvis-api -n production FEATURE_NEW_INTEGRATION=false

# 2. If that doesn't help, rollback
./scripts/rollback.sh production

# 3. Fix integration
# Update API client, credentials, etc.
```

## Prevention

Prevent the need for rollbacks:

- ✅ Comprehensive testing in staging
- ✅ Gradual rollout (canary deployments)
- ✅ Feature flags for risky changes
- ✅ Database migration testing
- ✅ Automated smoke tests
- ✅ Monitoring and alerts
- ✅ Code reviews
- ✅ Load testing

## Post-Rollback Actions

After successful rollback:

1. **Stabilize** - Ensure system is healthy
2. **Investigate** - Root cause analysis
3. **Fix** - Address the issue
4. **Test** - Verify fix thoroughly
5. **Document** - Update runbooks
6. **Review** - Post-mortem meeting
7. **Improve** - Prevent similar issues

## Incident Report Template

```markdown
# Rollback Incident Report

**Date:** 2024-01-17
**Environment:** Production
**Triggered By:** Jane Doe
**Duration:** 15 minutes

## Issue Description
Brief description of what went wrong

## Impact
- Users affected: X
- Services impacted: API, Dashboard
- Duration: 15 minutes
- Revenue impact: $X

## Timeline
- 14:30 - Deployment started
- 14:35 - High error rate detected
- 14:36 - Rollback initiated
- 14:45 - Rollback completed
- 14:50 - Service restored

## Root Cause
What caused the issue

## Resolution
How it was resolved

## Preventive Measures
- [ ] Add test coverage
- [ ] Update monitoring
- [ ] Improve deployment process
- [ ] Update documentation

## Action Items
- [ ] Fix bug (assigned to: John)
- [ ] Add integration test (assigned to: Jane)
- [ ] Update runbook (assigned to: DevOps)

## Lessons Learned
What we learned and how to prevent this
```

## Emergency Contacts

**Escalation Path:**
1. On-call engineer (PagerDuty)
2. DevOps lead
3. Engineering manager
4. CTO

**Contact Information:**
- PagerDuty: Check on-call schedule
- Slack: `#incidents`
- Email: `incidents@jarvis-ai.app`

## Related Documentation

- [CI/CD Guide](./CI_CD.md)
- [Deployment Runbook](./DEPLOYMENT.md)
- [Monitoring Guide](./MONITORING.md)
- [Disaster Recovery](./DISASTER_RECOVERY.md)

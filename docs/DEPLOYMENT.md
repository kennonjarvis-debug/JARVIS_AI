# Deployment Runbook

Step-by-step guide for deploying the Jarvis AI Platform.

## Prerequisites

### Required Tools

- `kubectl` - Kubernetes CLI
- `docker` - Container runtime
- `git` - Version control
- `aws` - AWS CLI
- `jq` - JSON processor
- `gh` - GitHub CLI (optional)

### Required Access

- GitHub repository write access
- AWS credentials with appropriate permissions
- Kubernetes cluster access
- Secrets access (AWS Secrets Manager)

### Environment Setup

```bash
# Install required tools
brew install kubectl docker aws-cli jq gh

# Configure AWS credentials
aws configure

# Configure kubectl
aws eks update-kubeconfig --name jarvis-production --region us-east-1

# Verify cluster access
kubectl cluster-info
```

## Deployment Types

### 1. Staging Deployment

**Automatic** - Triggered on every merge to `main` branch

```bash
# 1. Create feature branch
git checkout -b feature/my-feature

# 2. Make changes and commit
git add .
git commit -m "feat: add new feature"

# 3. Push to GitHub
git push origin feature/my-feature

# 4. Create PR and merge to main
gh pr create --title "Add new feature" --body "Description"

# 5. Auto-deploys to staging after merge
# Monitor: https://github.com/jarvis-ai/jarvis/actions
```

### 2. Production Deployment

**Manual** - Requires creating a release tag

```bash
# 1. Ensure staging is stable
./scripts/smoke-tests.sh https://staging.jarvis-ai.app

# 2. Bump version
./scripts/version-bump.sh minor "Release v2.1.0"

# 3. Push tag (triggers production deployment)
git push origin v2.1.0

# 4. Monitor deployment
gh run list --workflow=cd.yml

# 5. Verify production
./scripts/smoke-tests.sh https://jarvis-ai.app
```

### 3. Hotfix Deployment

**Urgent fixes** to production

```bash
# 1. Create hotfix branch from main
git checkout main
git pull
git checkout -b hotfix/critical-bug

# 2. Fix the issue
# ... make changes ...

# 3. Test locally
npm test
npm run build

# 4. Bump patch version
./scripts/version-bump.sh patch "Hotfix: critical bug"

# 5. Push and create PR
git push origin hotfix/critical-bug
gh pr create --title "Hotfix: Critical bug" --base main

# 6. After approval, merge and tag
git checkout main
git pull
git tag -a v2.0.1 -m "Hotfix: critical bug"
git push origin v2.0.1

# 7. Monitor deployment
gh run watch
```

## Deployment Steps

### Pre-Deployment Checklist

- [ ] All tests passing in CI
- [ ] Security scans completed
- [ ] Code review approved
- [ ] Staging deployment successful
- [ ] Database migrations prepared
- [ ] Backup strategy confirmed
- [ ] Rollback plan documented
- [ ] Stakeholders notified

### Step 1: Prepare Release

```bash
# 1. Update changelog
vim CHANGELOG.md

# 2. Bump version
./scripts/version-bump.sh minor "Description of changes"

# 3. Review changes
git diff HEAD~1

# 4. Verify package.json updated
cat package.json | jq .version
```

### Step 2: Build and Test

```bash
# 1. Clean install
rm -rf node_modules
npm ci

# 2. Run all tests
npm run test
npm run test:integration

# 3. Build application
npm run build

# 4. Test Docker build
docker build -f Dockerfile.production -t jarvis:test .

# 5. Run container locally
docker run -p 3000:3000 jarvis:test
curl http://localhost:3000/health
```

### Step 3: Deploy to Staging

```bash
# 1. Push to main (auto-deploys to staging)
git push origin main

# 2. Monitor CI/CD pipeline
gh run watch

# 3. Wait for deployment to complete
kubectl rollout status deployment/jarvis-api -n staging

# 4. Run smoke tests
./scripts/smoke-tests.sh https://staging.jarvis-ai.app

# 5. Manual testing
# - Test critical user flows
# - Verify new features
# - Check for regressions
```

### Step 4: Database Migrations

```bash
# 1. Review migration files
ls prisma/migrations/

# 2. Test migrations on staging
./scripts/migrate-database.sh staging

# 3. Verify migration success
kubectl logs -n staging deployment/jarvis-api | grep migration

# 4. Backup production database
./scripts/backup-database.sh production pre-deployment
```

### Step 5: Deploy to Production

```bash
# 1. Create release tag
git tag -a v2.1.0 -m "Release v2.1.0

Features:
- Feature 1
- Feature 2

Fixes:
- Bug fix 1
"

# 2. Push tag (triggers deployment)
git push origin v2.1.0

# 3. Monitor deployment
gh run watch

# 4. Watch Kubernetes rollout
kubectl rollout status deployment/jarvis-api -n production -w

# 5. Verify pods are running
kubectl get pods -n production -l app=jarvis-api
```

### Step 6: Post-Deployment Verification

```bash
# 1. Run smoke tests
./scripts/smoke-tests.sh https://jarvis-ai.app

# 2. Check health endpoint
curl https://jarvis-ai.app/health | jq .

# 3. Verify database connectivity
curl https://jarvis-ai.app/health | jq .database

# 4. Check application logs
kubectl logs -n production -l app=jarvis-api --tail=100

# 5. Monitor error rates
# Check Sentry dashboard

# 6. Verify metrics
curl https://jarvis-ai.app/metrics
```

### Step 7: Monitor and Validate

```bash
# Monitor for 30 minutes minimum

# 1. Watch pod status
kubectl get pods -n production -l app=jarvis-api -w

# 2. Monitor logs for errors
kubectl logs -n production -l app=jarvis-api -f | grep -i error

# 3. Check service endpoints
kubectl get endpoints jarvis-api -n production

# 4. Verify traffic distribution
# Check load balancer metrics

# 5. Monitor user-facing metrics
# - Response times
# - Error rates
# - Success rates
```

## Blue-Green Deployment

For zero-downtime deployments:

```bash
# 1. Deploy to inactive environment (green)
./scripts/blue-green-deploy.sh production ghcr.io/jarvis-ai/jarvis:v2.1.0

# Script automatically:
# - Creates green deployment
# - Runs smoke tests
# - Switches traffic
# - Monitors for issues
# - Keeps blue for rollback

# 2. If issues detected, automatic rollback occurs

# 3. Manual rollback if needed
./scripts/rollback.sh production
```

## Database Migrations

### Safe Migration Process

```bash
# 1. Backup database
./scripts/migrate-database.sh production

# Script automatically:
# - Acquires migration lock
# - Creates backup
# - Runs migrations in transaction
# - Verifies migrations
# - Rollback on error

# 2. Monitor migration
tail -f logs/migrations/migration-*.log

# 3. Verify database state
kubectl exec -n production deployment/jarvis-api -- npx prisma migrate status
```

### Migration Rollback

```bash
# If migration fails:

# 1. Check migration logs
cat backups/migrations/latest-backup.txt

# 2. Restore from backup
./scripts/rollback.sh production

# 3. Fix migration
# Edit migration files

# 4. Re-run migration
./scripts/migrate-database.sh production
```

## Environment-Specific Configuration

### Staging Environment

```bash
# Load staging environment
source .env.staging

# Deploy staging
kubectl apply -f k8s/ -n staging

# Verify staging
kubectl get all -n staging
```

### Production Environment

```bash
# Sync production secrets from AWS
./scripts/sync-env.sh production pull

# Verify secrets
kubectl get secrets -n production

# Deploy production
kubectl apply -f k8s/ -n production
```

## Rollback Procedures

See [ROLLBACK.md](./ROLLBACK.md) for detailed rollback procedures.

### Quick Rollback

```bash
# Automatic rollback
./scripts/rollback.sh production

# Manual rollback
kubectl rollout undo deployment/jarvis-api -n production

# Verify rollback
kubectl rollout status deployment/jarvis-api -n production
```

## Notifications

Deployment notifications sent to:
- Slack: `#deployments` channel
- Email: DevOps team
- PagerDuty: On failures
- GitHub: Deployment status

## Troubleshooting

### Deployment Stuck

```bash
# Check pod status
kubectl get pods -n production -l app=jarvis-api

# Describe problematic pod
kubectl describe pod <pod-name> -n production

# View pod logs
kubectl logs <pod-name> -n production

# Check events
kubectl get events -n production --sort-by='.lastTimestamp'
```

### Image Pull Errors

```bash
# Verify image exists
docker pull ghcr.io/jarvis-ai/jarvis:v2.1.0

# Check image pull secrets
kubectl get secrets -n production | grep regcred

# Recreate secret
kubectl delete secret regcred -n production
kubectl create secret docker-registry regcred \
  --docker-server=ghcr.io \
  --docker-username=$GITHUB_USER \
  --docker-password=$GITHUB_TOKEN
```

### Database Connection Issues

```bash
# Test database connectivity
kubectl run -it --rm debug --image=postgres:15 --restart=Never -- \
  psql $DATABASE_URL -c "SELECT 1;"

# Check database secrets
kubectl get secret jarvis-secrets -n production -o yaml

# Verify service endpoints
kubectl get endpoints -n production
```

## Post-Deployment Tasks

- [ ] Update documentation
- [ ] Close deployment ticket
- [ ] Notify stakeholders
- [ ] Monitor for 24 hours
- [ ] Review metrics
- [ ] Document issues
- [ ] Update runbook

## Emergency Contacts

- **DevOps Lead:** [contact info]
- **On-Call Engineer:** Check PagerDuty
- **Platform Team:** Slack `#platform-team`
- **Security Team:** `security@jarvis-ai.app`

## Related Documentation

- [CI/CD Guide](./CI_CD.md)
- [Rollback Procedures](./ROLLBACK.md)
- [Monitoring Guide](./MONITORING.md)
- [Troubleshooting](./TROUBLESHOOTING.md)

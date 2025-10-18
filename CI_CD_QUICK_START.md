# CI/CD Quick Start Guide

Fast track guide to get the Jarvis CI/CD pipeline up and running.

## Prerequisites (5 minutes)

```bash
# Install required tools
brew install kubectl docker aws-cli jq gh

# Verify installations
kubectl version --client
docker --version
aws --version
jq --version
```

## Setup Steps

### 1. Configure GitHub Secrets (10 minutes)

Go to: `Settings > Secrets and variables > Actions > New repository secret`

Add these secrets:

```bash
# AWS Credentials
AWS_ACCESS_KEY_ID=AKIA...
AWS_SECRET_ACCESS_KEY=...

# Tokens
GITHUB_TOKEN=ghp_...           # Auto-provided by GitHub
CODECOV_TOKEN=...              # From codecov.io
SNYK_TOKEN=...                 # From snyk.io
GITGUARDIAN_API_KEY=...        # From gitguardian.com

# Notifications
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/...
PAGERDUTY_INTEGRATION_KEY=...  # Optional
```

### 2. Setup AWS Resources (30 minutes)

```bash
# Create EKS cluster
eksctl create cluster \
  --name jarvis-production \
  --region us-east-1 \
  --nodes 3 \
  --node-type t3.medium

# Create RDS database
aws rds create-db-instance \
  --db-instance-identifier jarvis-production \
  --db-instance-class db.t3.medium \
  --engine postgres \
  --master-username jarvis \
  --master-user-password YOUR_PASSWORD \
  --allocated-storage 20

# Create ElastiCache Redis
aws elasticache create-cache-cluster \
  --cache-cluster-id jarvis-production \
  --cache-node-type cache.t3.micro \
  --engine redis \
  --num-cache-nodes 1

# Create S3 buckets
aws s3 mb s3://jarvis-production-storage
aws s3 mb s3://jarvis-production-backups
```

### 3. Configure Kubernetes (15 minutes)

```bash
# Update kubeconfig
aws eks update-kubeconfig --name jarvis-production --region us-east-1

# Create namespaces
kubectl create namespace production
kubectl create namespace staging

# Create secrets (use actual values!)
kubectl create secret generic jarvis-secrets \
  --from-literal=database-url="postgresql://..." \
  --from-literal=redis-url="redis://..." \
  --from-literal=openai-api-key="sk-..." \
  --from-literal=anthropic-api-key="sk-ant-..." \
  --from-literal=session-secret="RANDOM_32_CHAR_STRING" \
  --from-literal=jwt-secret="RANDOM_32_CHAR_STRING" \
  -n production

# Apply Kubernetes manifests
kubectl apply -f k8s/ -n production

# Verify deployment
kubectl get all -n production
```

### 4. Test the Pipeline (20 minutes)

```bash
# 1. Make a small change
echo "# Test" >> README.md
git add README.md
git commit -m "test: CI/CD pipeline"

# 2. Create feature branch
git checkout -b test/ci-cd-pipeline
git push origin test/ci-cd-pipeline

# 3. Create PR
gh pr create --title "Test: CI/CD Pipeline" --body "Testing the pipeline"

# 4. Watch CI run
gh run watch

# 5. Merge to main (deploys to staging)
gh pr merge --auto --squash

# 6. Create production release
./scripts/version-bump.sh patch "Test deployment"
git push origin v2.0.1

# 7. Watch CD run
gh run watch

# 8. Verify deployment
kubectl get pods -n production
./scripts/smoke-tests.sh https://jarvis-ai.app
```

## Common Commands

### Deploy to Staging
```bash
git checkout main
git pull
git merge feature/my-feature
git push origin main
# Auto-deploys via CI/CD
```

### Deploy to Production
```bash
./scripts/version-bump.sh minor "New features"
git push origin v2.1.0
# Deploys via CD workflow
```

### Rollback
```bash
./scripts/rollback.sh production
```

### Check Status
```bash
# CI/CD runs
gh run list

# Deployments
kubectl get deployments -n production

# Pods
kubectl get pods -n production

# Logs
kubectl logs -n production -l app=jarvis-api --tail=50
```

### Smoke Tests
```bash
./scripts/smoke-tests.sh https://jarvis-ai.app
```

## Troubleshooting

### CI Failing?
```bash
# Run tests locally
npm test
npm run lint
npm run type-check
npm run build
```

### Deployment Failing?
```bash
# Check pod status
kubectl get pods -n production

# View logs
kubectl logs -n production <pod-name>

# Describe pod
kubectl describe pod <pod-name> -n production
```

### Need to Rollback?
```bash
# Quick rollback
./scripts/rollback.sh production

# Or manually
kubectl rollout undo deployment/jarvis-api -n production
```

## Environment Files

### Staging
```bash
# Pull from AWS Secrets Manager
./scripts/sync-env.sh staging pull

# Or create manually
cp .env.staging.example .env.staging
# Edit with actual values
```

### Production
```bash
# Pull from AWS Secrets Manager
./scripts/sync-env.sh production pull

# Or create from template
cp .env.production.example .env.production
# Fill in all CHANGE_ME values
# NEVER commit this file!
```

## Monitoring

### GitHub Actions
- View runs: https://github.com/YOUR_ORG/jarvis/actions
- Workflow logs available for 90 days

### Kubernetes
```bash
# Watch pods
kubectl get pods -n production -w

# Live logs
kubectl logs -n production -l app=jarvis-api -f

# Events
kubectl get events -n production --sort-by='.lastTimestamp'
```

### Notifications
- Slack: #deployments channel
- Email: Check inbox for deployment alerts
- PagerDuty: For critical failures

## Next Steps

1. ✅ Complete setup steps above
2. ✅ Test with a small PR
3. ✅ Deploy to staging
4. ✅ Create production release
5. ✅ Monitor deployment
6. ✅ Review documentation
7. ✅ Train team on procedures

## Full Documentation

- **CI/CD Guide:** `/Users/benkennon/Jarvis/docs/CI_CD.md`
- **Deployment Runbook:** `/Users/benkennon/Jarvis/docs/DEPLOYMENT.md`
- **Rollback Procedures:** `/Users/benkennon/Jarvis/docs/ROLLBACK.md`

## Support

- Documentation: `docs/` directory
- Issues: GitHub Issues
- Slack: #platform-team
- On-call: Check PagerDuty

---

**Estimated Setup Time:** 1-2 hours
**Difficulty:** Medium
**Support:** Available via Slack #platform-team

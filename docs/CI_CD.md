# CI/CD Pipeline Documentation

Complete guide to the Jarvis AI Platform continuous integration and deployment pipeline.

## Table of Contents

1. [Overview](#overview)
2. [Pipeline Architecture](#pipeline-architecture)
3. [Workflows](#workflows)
4. [Deployment Strategy](#deployment-strategy)
5. [Security](#security)
6. [Monitoring](#monitoring)
7. [Troubleshooting](#troubleshooting)

## Overview

The Jarvis CI/CD pipeline is designed for:

- **Zero downtime deployments** using blue-green deployment strategy
- **Automated testing** at every stage
- **Security scanning** for vulnerabilities and secrets
- **Performance testing** to prevent regressions
- **Automated rollback** on failures
- **Multi-environment support** (staging, production)

### Key Features

- ✅ Parallel job execution for faster CI
- ✅ Automated dependency updates with Dependabot
- ✅ Docker multi-stage builds for optimized images
- ✅ Kubernetes-based deployment
- ✅ Comprehensive smoke tests
- ✅ Slack/email notifications
- ✅ Deployment audit trail

## Pipeline Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    GitHub Actions                        │
└─────────────────────────────────────────────────────────┘
                            │
        ┌───────────────────┼───────────────────┐
        │                   │                   │
        ▼                   ▼                   ▼
┌──────────────┐    ┌──────────────┐    ┌──────────────┐
│      CI      │    │   Security   │    │ Performance  │
│  Workflow    │    │   Scanning   │    │   Testing    │
└──────────────┘    └──────────────┘    └──────────────┘
        │                   │                   │
        └───────────────────┼───────────────────┘
                            │
                            ▼
                   ┌──────────────┐
                   │      CD      │
                   │  Workflow    │
                   └──────────────┘
                            │
        ┌───────────────────┼───────────────────┐
        │                   │                   │
        ▼                   ▼                   ▼
┌──────────────┐    ┌──────────────┐    ┌──────────────┐
│   Staging    │    │  Production  │    │   Rollback   │
│  Deployment  │    │  Deployment  │    │  (if needed) │
└──────────────┘    └──────────────┘    └──────────────┘
```

## Workflows

### 1. CI Workflow (`.github/workflows/ci.yml`)

**Trigger:** Push to any branch, PRs to main/develop

**Jobs:**
- **Lint & Type Check** - ESLint, TypeScript validation
- **Test** - Unit and integration tests with coverage
- **Build** - TypeScript compilation
- **Security Audit** - npm audit, secret scanning
- **Code Quality** - Dead code analysis, bundle size

**Duration:** ~5-8 minutes

**Cache Strategy:**
- Node modules cached by `package-lock.json` hash
- Build artifacts cached for downstream jobs

### 2. CD Workflow (`.github/workflows/cd.yml`)

**Trigger:**
- Push to main → Deploy to staging
- Tags (v*.*.*) → Deploy to production
- Manual dispatch with environment selection

**Jobs:**
- **Build Docker** - Multi-platform image build
- **Deploy Staging** - Automatic on main branch
- **Deploy Production** - Manual approval required
- **Cleanup** - Remove old container images

**Duration:** ~8-12 minutes

**Deployment Strategy:** Blue-Green (zero downtime)

### 3. Security Scan Workflow (`.github/workflows/security-scan.yml`)

**Trigger:**
- Push to main/develop
- PRs to main/develop
- Daily schedule (2 AM UTC)
- Manual dispatch

**Scans:**
- **Dependency Scan** - npm audit, Snyk
- **SAST** - CodeQL for code analysis
- **Docker Scan** - Trivy for container vulnerabilities
- **Secrets Scan** - TruffleHog, GitGuardian
- **License Compliance** - Check for incompatible licenses
- **IaC Scan** - Checkov for Kubernetes/Docker configs

### 4. Performance Test Workflow (`.github/workflows/performance-test.yml`)

**Trigger:**
- Push to main/develop
- PRs to main
- Weekly schedule (Sundays 3 AM)
- Manual dispatch

**Tests:**
- **Load Testing** - k6 for API load tests
- **Lighthouse** - Frontend performance audit
- **Benchmarks** - API response time baselines
- **Memory Profiling** - clinic.js profiling

**Thresholds:**
- API P95 < 500ms
- API P99 < 1000ms
- Error rate < 5%
- Lighthouse score > 90

### 5. Dependency Update Workflow (`.github/workflows/dependency-update.yml`)

**Trigger:**
- Weekly schedule (Mondays 9 AM)
- Manual dispatch

**Actions:**
- Auto-merge Dependabot minor/patch updates
- Weekly dependency review
- Automated security fixes
- License compliance check
- Create PRs for updates

## Deployment Strategy

### Blue-Green Deployment

Our zero-downtime deployment strategy:

1. **Deploy to Green** - New version deployed to inactive environment
2. **Smoke Tests** - Verify green deployment health
3. **Switch Traffic** - Route production traffic to green
4. **Monitor** - Watch for errors/issues (60 seconds)
5. **Cleanup** - Scale down blue (keep for rollback)

**Benefits:**
- Zero downtime
- Instant rollback capability
- Testing in production-like environment
- Reduced risk

### Deployment Flow

```bash
# 1. Build Docker image
docker build -t jarvis:v2.0.0 .

# 2. Deploy to green environment
./scripts/blue-green-deploy.sh production jarvis:v2.0.0

# 3. Automatic smoke tests run
# 4. Traffic switches to green
# 5. Blue kept for rollback
```

### Rollback Process

If deployment fails or issues detected:

```bash
# Automatic rollback triggered
./scripts/rollback.sh production

# Manual rollback if needed
kubectl rollout undo deployment/jarvis-api -n production
```

## Security

### Secrets Management

**DO NOT** commit secrets to Git. Use:

1. **GitHub Secrets** for CI/CD workflows
2. **AWS Secrets Manager** for production secrets
3. **Kubernetes Secrets** for cluster secrets
4. **Environment variables** for runtime config

### Required Secrets

**GitHub Repository Secrets:**
```
AWS_ACCESS_KEY_ID
AWS_SECRET_ACCESS_KEY
GITHUB_TOKEN
CODECOV_TOKEN
SLACK_WEBHOOK_URL
SNYK_TOKEN
GITGUARDIAN_API_KEY
PAGERDUTY_INTEGRATION_KEY
```

**Production Secrets (AWS Secrets Manager):**
```
jarvis/production/database-url
jarvis/production/redis-url
jarvis/production/openai-api-key
jarvis/production/anthropic-api-key
jarvis/production/stripe-secret-key
jarvis/production/session-secret
jarvis/production/jwt-secret
```

### Security Scanning

All code is scanned for:
- Known vulnerabilities (Snyk, npm audit)
- Hardcoded secrets (TruffleHog, GitGuardian)
- Code quality issues (CodeQL)
- Container vulnerabilities (Trivy, Docker Scout)
- License compliance violations

## Monitoring

### Deployment Monitoring

**Metrics Tracked:**
- Deployment frequency
- Lead time for changes
- Mean time to recovery (MTTR)
- Change failure rate

**Notifications:**
- Slack notifications for all deployments
- Email notifications for failures
- PagerDuty alerts for critical issues
- GitHub deployment status updates

### Health Checks

All deployments include:
- Liveness probe - Is application alive?
- Readiness probe - Ready to serve traffic?
- Startup probe - Has application started?
- Smoke tests - Critical paths working?

### Logs

Deployment logs stored in:
```
logs/deployments/          # Deployment history
logs/rollback/            # Rollback incidents
logs/incidents/           # Incident reports
backups/migrations/       # Database backups
backups/deployments/      # Deployment backups
```

## Troubleshooting

### Common Issues

#### 1. CI Pipeline Failing

**Symptom:** Tests failing, build errors

**Solutions:**
```bash
# Run tests locally
npm test

# Check types
npm run type-check

# Lint code
npm run lint

# Build locally
npm run build
```

#### 2. Docker Build Failing

**Symptom:** Image build errors

**Solutions:**
```bash
# Test Docker build locally
docker build -f Dockerfile.production -t jarvis:test .

# Check multi-platform build
docker buildx build --platform linux/amd64,linux/arm64 .

# View build logs
docker build --progress=plain -f Dockerfile.production .
```

#### 3. Deployment Failing

**Symptom:** Kubernetes deployment not ready

**Solutions:**
```bash
# Check pod status
kubectl get pods -n production -l app=jarvis-api

# View pod logs
kubectl logs -n production -l app=jarvis-api --tail=100

# Describe pod for events
kubectl describe pod <pod-name> -n production

# Check deployment status
kubectl rollout status deployment/jarvis-api -n production
```

#### 4. Smoke Tests Failing

**Symptom:** Post-deployment tests fail

**Solutions:**
```bash
# Run smoke tests manually
./scripts/smoke-tests.sh https://staging.jarvis-ai.app

# Check health endpoint
curl https://staging.jarvis-ai.app/health

# View detailed test output
npm run test:smoke -- --verbose
```

#### 5. Rollback Needed

**Symptom:** Production issues after deployment

**Solutions:**
```bash
# Automatic rollback
./scripts/rollback.sh production

# Manual rollback to specific version
./scripts/rollback.sh production v1.9.0

# Check rollback status
kubectl rollout history deployment/jarvis-api -n production
```

### Debug Commands

```bash
# View all workflows
gh workflow list

# View workflow run
gh run view <run-id>

# Re-run failed workflow
gh run rerun <run-id>

# View deployment logs
kubectl logs -n production deployment/jarvis-api --tail=100 -f

# Get deployment events
kubectl get events -n production --sort-by='.lastTimestamp'

# Check service endpoints
kubectl get endpoints jarvis-api -n production

# Port forward for local testing
kubectl port-forward -n production svc/jarvis-api 8080:80
```

### Getting Help

1. Check workflow logs in GitHub Actions
2. Review deployment logs in `logs/` directory
3. Check Slack #deployments channel
4. Contact DevOps team
5. Create incident in PagerDuty (critical issues)

## Best Practices

1. **Always run CI before deploying**
2. **Deploy to staging first**
3. **Monitor deployments for 5+ minutes**
4. **Keep rollback option available**
5. **Document deployment issues**
6. **Update version numbers**
7. **Write clear commit messages**
8. **Review security scan results**
9. **Test locally before pushing**
10. **Keep documentation updated**

## Related Documentation

- [Deployment Runbook](./DEPLOYMENT.md)
- [Rollback Procedures](./ROLLBACK.md)
- [Monitoring Guide](./MONITORING.md)
- [Security Guidelines](./SECURITY.md)

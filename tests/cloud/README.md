# Cloud Infrastructure Tests

Tests to validate Jarvis cloud-first migration (Week 2-6 of 6-week plan).

## Overview

This directory contains tests for cloud deployments, infrastructure, and business automation. Tests validate AWS ECS, Google Cloud Run, Kubernetes, and multi-cloud communication.

**Cloud Architecture**:
```
AWS/GCP Cloud
├── Jarvis Control Plane (ECS/Cloud Run)
│   ├── AI Router (Gemini/GPT/Claude)
│   ├── Business Intelligence
│   ├── Service Manager
│   └── Memory Layer
├── AI DAWG Services (Kubernetes)
│   ├── Producer (8001)
│   ├── Vocal Coach (8000)
│   └── AI Brain (8003)
└── Shared Infrastructure
    ├── PostgreSQL RDS
    ├── ElastiCache Redis
    ├── S3 (Audio Storage)
    └── Secrets Manager
```

## Test Files

### `aws-ecs-deployment.test.ts`
Tests AWS ECS deployment for Jarvis Control Plane:
- Deploy container to ECS Fargate (<5 minutes)
- CPU: 512, Memory: 1024MB
- Auto-scaling: 2 to 5 tasks based on CPU >80%
- Rolling updates with zero downtime
- Automatic rollback on health check failure
- Load balancer integration

**Key Scenarios**:
- ✅ Deploy Jarvis to ECS within 5 minutes
- ✅ Scale from 2 to 5 tasks on high CPU (3 minutes)
- ✅ Rollback on deployment failure (automatic)
- ✅ Zero-downtime rolling update

### `gcp-cloud-run-deployment.test.ts`
Tests Google Cloud Run deployment:
- Deploy Jarvis to Cloud Run (<3 minutes)
- Min instances: 1, Max instances: 10
- Cold start: <5 seconds
- Blue-green deployment with 10% canary
- Rollback on error rate >1%

**Key Scenarios**:
- ✅ Deploy to Cloud Run within 3 minutes
- ✅ Cold start <5 seconds
- ✅ Auto-scale from 1 to 10 instances
- ✅ Blue-green deployment with canary

### `kubernetes-ai-dawg.test.ts`
Tests Kubernetes deployment for AI DAWG services:
- Deploy pods: Producer (8001), Vocal Coach (8000), AI Brain (8003)
- Replicas: 3 per service
- HPA: Scale from 3 to 10 based on CPU >70%
- Liveness/readiness probes
- Pod failure recovery: <10 seconds

**Key Scenarios**:
- ✅ Deploy all 3 services with 3 pods each
- ✅ HPA auto-scaling on high CPU
- ✅ Pod recovery <10 seconds after failure
- ✅ Rolling updates with zero downtime

### `postgresql-rds.test.ts`
Tests PostgreSQL RDS migration and operations:
- Create db.t3.micro instance (<10 minutes)
- Migrate 10,000 events from SQLite (<2 minutes)
- Connect from ECS/Cloud Run (<3 seconds)
- Connection pool: 20 connections
- Multi-AZ failover: <2 minutes

**Key Scenarios**:
- ✅ Migrate 10,000 events within 2 minutes
- ✅ Connect from cloud services
- ✅ Failover to standby within 2 minutes
- ✅ Connection pool handles 100 concurrent connections

### `elasticache-redis.test.ts`
Tests ElastiCache Redis connectivity and failover:
- Create cache.t3.micro cluster (<10 minutes)
- Session storage with 30-minute TTL
- Cache invalidation
- Failover to replica: <30 seconds
- Connect from all services

**Key Scenarios**:
- ✅ Connect from ECS/Cloud Run/Kubernetes
- ✅ Session storage and retrieval
- ✅ Cache invalidation working
- ✅ Failover <30 seconds

### `s3-storage.test.ts`
Tests S3 storage operations:
- Upload 10MB audio files (multipart)
- Generate presigned URLs (1-hour expiry)
- Lifecycle policy: Delete after 90 days
- Cross-region replication to us-west-2
- Versioning enabled

**Key Scenarios**:
- ✅ Upload 10MB file <10 seconds
- ✅ Presigned URLs work and expire correctly
- ✅ Lifecycle policy applied
- ✅ Cross-region replication <1 minute

### `multi-cloud-communication.test.ts`
Tests cross-cloud communication (AWS ↔ GCP):
- Jarvis (ECS) → AI DAWG (GKE)
- Cross-cloud latency: <100ms (p95)
- Network security validation
- VPN/VPC peering (optional)
- Failover: ECS → Cloud Run on region outage

**Key Scenarios**:
- ✅ ECS → GKE latency <100ms
- ✅ Full AI request completes <30 seconds
- ✅ Network security enforced
- ✅ Multi-cloud failover working

### `business-automation.test.ts`
Tests Week 3+ business intelligence automation:
- Autonomous cost optimization
- Automated scaling decisions
- Performance-based model selection
- Customer lifecycle automation

**Key Scenarios**:
- ✅ Switch models when budget threshold reached
- ✅ Scale down during low traffic (3am)
- ✅ Route code requests to Claude, creative to GPT
- ✅ Auto-onboard new customers
- ✅ Detect churn and re-engage

### `cost-optimization.test.ts`
Tests autonomous cost optimization:
- Budget tracking: $500/month
- Alert at: 50%, 80%, 100%
- Model switching: GPT-4o → Gemini at 90% budget
- Cost projection after optimization
- Quality maintained (user satisfaction >90%)

**Key Scenarios**:
- ✅ Cost tracking across AWS + GCP
- ✅ Budget alert triggers at 80%
- ✅ Auto-switch to cheaper model
- ✅ Projected savings >20%

### `automated-scaling.test.ts`
Tests autonomous scaling decisions:
- Traffic-based scaling (high/low)
- Time-based scaling (day/night)
- Cost-aware scaling
- Latency-aware scaling (keep <100ms)

**Key Scenarios**:
- ✅ Scale up on traffic spike (1000 req/min)
- ✅ Scale down during low traffic (10 req/min at 3am)
- ✅ Maintain latency <100ms during scaling
- ✅ Cost savings from nighttime scale-down

### `customer-lifecycle.test.ts`
Tests customer lifecycle automation:
- New user onboarding (<2 seconds)
- Stripe customer creation
- Welcome email + dashboard provisioning
- Churn detection (30 days inactive)
- Re-engagement automation (20% discount)
- Account deactivation (60 days)

**Key Scenarios**:
- ✅ Auto-onboard new customer <2 seconds
- ✅ Detect churn risk (30 days inactive)
- ✅ Send re-engagement email with discount
- ✅ All actions logged to audit trail

## Running Tests

```bash
# Run all cloud tests
cd /Users/benkennon/Jarvis
npm test -- tests/cloud/

# Run specific test file
npm test -- tests/cloud/aws-ecs-deployment.test.ts

# Run with coverage
npm test -- --coverage tests/cloud/

# Run business automation tests (Week 3+)
npm test -- tests/cloud/business-automation.test.ts
npm test -- tests/cloud/cost-optimization.test.ts
npm test -- tests/cloud/automated-scaling.test.ts
npm test -- tests/cloud/customer-lifecycle.test.ts
```

## Success Criteria

### Week 2 (Cloud Migration)
- ✅ All cloud deployments successful
- ✅ Auto-scaling working (ECS, Cloud Run, Kubernetes)
- ✅ Zero-downtime rolling updates
- ✅ Automatic rollback on failure
- ✅ Multi-cloud communication <100ms
- ✅ Cloud infrastructure validated (RDS, Redis, S3)

### Week 3+ (Business Automation)
- ✅ Autonomous cost optimization (stay within $500/month budget)
- ✅ Automated scaling (scale up/down based on traffic/time)
- ✅ Performance-based model routing (>90% accuracy)
- ✅ Customer lifecycle fully automated
- ✅ 30-day cloud operation without human intervention

## Real-World Timing Targets

- AWS ECS deployment: <5 minutes
- Google Cloud Run deployment: <3 minutes
- Kubernetes deployment: <5 minutes
- RDS migration (10K events): <2 minutes
- Redis failover: <30 seconds
- S3 upload (10MB): <10 seconds
- Multi-cloud latency: <100ms (p95)
- Cost optimization decision: <3 minutes
- Customer onboarding: <2 seconds

## Cloud Cost Estimates

### Month 1 (Testing)
- AWS (ECS, RDS, Redis, S3): ~$88/month
- GCP (Cloud Run, GKE): ~$235/month
- **Total**: ~$323/month

### Production (Optimized)
- After autonomous cost optimization: ~$150/month
- Budget target: $500/month (with 40% buffer)

## Related Documentation

- **Part 8** in `REAL_WORLD_WORKFLOW_INTEGRATION.md`: Cloud workflow scenarios
- **Agent 7** in `.claude/prompts/instance-8-test-orchestrator.md`: Cloud tester agent
- **Agent 7 prompt**: `.claude/prompts/agent-7-cloud-tester.md`: Full cloud testing scenarios
- **Cloud audit**: `CLOUD_TESTING_AUDIT.md`: Gap analysis and testing strategy

## Notes

- Tests in this directory validate **cloud-first** infrastructure
- Business automation tests (cost, scaling, lifecycle) validate **Week 3+** features
- Tests may be skipped if cloud resources not provisioned yet
- Some tests require AWS/GCP credentials and provisioned infrastructure
- Business automation tests can be marked as "pending" until Week 3 implementation

---

**Generated for**: Jarvis Cloud-First Migration (6-week plan)
**Week 2 Focus**: Cloud deployment validation
**Week 3+ Focus**: Business automation validation
**Target**: 30-day cloud operation without human intervention

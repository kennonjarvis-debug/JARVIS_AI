# JARVIS Infrastructure

This directory contains all infrastructure and deployment configurations for the JARVIS control plane.

## Directory Structure

```
infra/
├── docker/           # Docker and containerization
│   ├── Dockerfile
│   ├── .dockerignore
│   └── docker-compose.yml
├── k8s/              # Kubernetes manifests
│   ├── deployment.yaml
│   ├── service.yaml
│   ├── ingress.yaml
│   ├── hpa.yaml
│   ├── namespace.yaml
│   ├── pvc.yaml
│   ├── serviceaccount.yaml
│   ├── configmap.yaml
│   ├── secret.yaml
│   └── kustomization.yaml
├── ci/               # CI/CD workflows
│   └── workflows/    # GitHub Actions workflows
└── scripts/          # Deployment and setup scripts
    ├── deploy/       # Deployment automation
    ├── create-aws-secrets.sh
    └── deploy-to-aws.sh
```

## Quick Start

### Local Development (Docker)
```bash
cd infra/docker
docker-compose up -d
```

### Kubernetes Deployment
```bash
cd infra/k8s
kubectl apply -f namespace.yaml
kubectl apply -k .
```

### AWS Deployment
```bash
cd infra/scripts
./create-aws-secrets.sh
./deploy-to-aws.sh
```

## Deployment Environments

### Development
- **Docker Compose**: Local development environment
- **Port**: 4000
- **Database**: Local PostgreSQL + Redis

### Production
- **Platform**: AWS ECS / Kubernetes
- **Scaling**: Horizontal Pod Autoscaler (HPA)
- **Database**: AWS RDS PostgreSQL + ElastiCache Redis
- **Monitoring**: CloudWatch / Prometheus

## Infrastructure Components

### Docker
- **Base Image**: Node.js 20 Alpine
- **Multi-stage build**: Optimized for production
- **Health checks**: Built-in for orchestration

### Kubernetes
- **Namespace**: `jarvis-system`
- **Replicas**: 2-10 (auto-scaling)
- **Resources**:
  - Requests: 500m CPU, 512Mi RAM
  - Limits: 2 CPU, 2Gi RAM
- **Ingress**: NGINX with TLS
- **Secrets**: External Secrets Operator (AWS Secrets Manager)

### CI/CD
- **Platform**: GitHub Actions
- **Workflows**:
  - `ci-cd.yml`: Build, test, and deploy on push to main
  - `tests.yml`: Run test suite on pull requests
  - `dashboard-tests.yml`: Test dashboard components
  - `daily-s3-backup.yml`: Daily database backups
  - `test.yml`: Automated testing
  - `deploy.yml`: Production deployment

## Environment Variables

See `../.env.example` for required environment variables.

**Critical Variables:**
- `DATABASE_URL`: PostgreSQL connection string
- `REDIS_URL`: Redis connection string
- `ANTHROPIC_API_KEY`: Claude API key
- `OPENAI_API_KEY`: GPT-4 API key
- `JWT_SECRET`: Authentication secret

## Secrets Management

### Local Development
Use `.env.local` (not tracked in git)

### Production
- **AWS**: AWS Secrets Manager
- **Kubernetes**: External Secrets Operator
- **GitHub Actions**: Repository secrets

## Monitoring & Logging

### Logs
```bash
# Docker
docker-compose logs -f jarvis

# Kubernetes
kubectl logs -f deployment/jarvis-control-plane -n jarvis-system
```

### Metrics
- **Prometheus**: `/metrics` endpoint
- **Health Check**: `/health` endpoint
- **Detailed Health**: `/health/detailed` endpoint

## Troubleshooting

### Container won't start
```bash
docker logs jarvis-control-plane
kubectl describe pod <pod-name> -n jarvis-system
```

### Database connection issues
- Verify `DATABASE_URL` is correct
- Check database is running: `docker ps | grep postgres`
- Test connection: `psql $DATABASE_URL`

### High memory usage
- Check for memory leaks in logs
- Review HPA metrics: `kubectl get hpa -n jarvis-system`
- Adjust resource limits in `k8s/deployment.yaml`

## Maintenance

### Updating Dependencies
```bash
npm audit fix
docker build -t jarvis:latest .
```

### Database Migrations
```bash
npx prisma migrate deploy
```

### Backups
- **Automated**: Daily S3 backups via GitHub Actions
- **Manual**: Run `scripts/maintenance/backup-database.sh`

## Security

- All secrets managed via AWS Secrets Manager
- Container images scanned with Trivy
- Network policies restrict inter-pod communication
- TLS enforced for all external traffic

## Support

For infrastructure issues, contact the DevOps team or open an issue with:
- Environment (dev/staging/prod)
- Error logs
- Steps to reproduce

---

**Last Updated**: 2025-10-17
**Maintained By**: JARVIS Team

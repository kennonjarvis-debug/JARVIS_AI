# Jarvis Kubernetes Deployment

This directory contains Kubernetes manifests for deploying Jarvis Control Plane to a Kubernetes cluster.

## =Á Files

| File | Purpose |
|------|---------|
| `namespace.yaml` | Creates the `jarvis` namespace |
| `serviceaccount.yaml` | ServiceAccount and RBAC permissions |
| `configmap.yaml` | Non-sensitive configuration |
| `secret.yaml` | Sensitive configuration (API keys, secrets) |
| `pvc.yaml` | Persistent storage for data and logs |
| `deployment.yaml` | Main Jarvis deployment |
| `service.yaml` | ClusterIP service for internal access |
| `ingress.yaml` | External access via Ingress controller |
| `hpa.yaml` | Horizontal Pod Autoscaler |
| `kustomization.yaml` | Kustomize configuration |

## =€ Quick Start

### Prerequisites

1. Kubernetes cluster (v1.24+)
2. kubectl configured to access your cluster
3. Docker registry to host Jarvis image
4. Ingress Controller (optional, for external access)

### Step 1: Build and Push Docker Image

```bash
# Build image
docker build -t your-registry.com/jarvis-control-plane:latest .

# Push to registry
docker push your-registry.com/jarvis-control-plane:latest
```

### Step 2: Update Configuration

Edit `secret.yaml` with your API keys, then:

```bash
# Deploy with kubectl
kubectl apply -k k8s/
```

### Step 3: Verify Deployment

```bash
# Check pods
kubectl get pods -n jarvis

# Check logs
kubectl logs -f deployment/jarvis-control-plane -n jarvis
```

## =' Cloud Provider Specific

### AWS EKS

- Storage Class: `gp3`
- Ingress: AWS Load Balancer Controller

### Google GKE

- Storage Class: `pd-ssd`
- Ingress: GCE Ingress

### Azure AKS

- Storage Class: `managed-premium`
- Ingress: NGINX Ingress Controller

## = Security

Use External Secrets Operator for production secrets management.

## =Ñ Cleanup

```bash
kubectl delete -k k8s/
```

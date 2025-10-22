#!/bin/bash
set -euo pipefail

# Blue-Green Deployment Script
# Usage: ./blue-green-deploy.sh <environment> <image-tag>
# Example: ./blue-green-deploy.sh production ghcr.io/jarvis-ai/jarvis:v2.0.0

ENVIRONMENT="${1:-staging}"
IMAGE_TAG="${2:-latest}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
NAMESPACE="$ENVIRONMENT"
APP_NAME="jarvis-api"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check prerequisites
check_prerequisites() {
    log_info "Checking prerequisites..."

    # Check kubectl
    if ! command -v kubectl &> /dev/null; then
        log_error "kubectl not found. Please install kubectl."
        exit 1
    fi

    # Check cluster connection
    if ! kubectl cluster-info &> /dev/null; then
        log_error "Cannot connect to Kubernetes cluster"
        exit 1
    fi

    log_success "Prerequisites check passed"
}

# Get current active deployment (blue or green)
get_active_color() {
    log_info "Detecting active deployment..."

    # Check which service is currently active
    ACTIVE_SELECTOR=$(kubectl get service "$APP_NAME" -n "$NAMESPACE" -o jsonpath='{.spec.selector.color}' 2>/dev/null || echo "blue")

    if [ "$ACTIVE_SELECTOR" = "blue" ]; then
        echo "blue"
    else
        echo "green"
    fi
}

# Get inactive color (opposite of active)
get_inactive_color() {
    ACTIVE=$(get_active_color)
    if [ "$ACTIVE" = "blue" ]; then
        echo "green"
    else
        echo "blue"
    fi
}

# Create deployment for inactive environment
create_deployment() {
    local COLOR="$1"
    local DEPLOYMENT_NAME="${APP_NAME}-${COLOR}"

    log_info "Creating $COLOR deployment with image: $IMAGE_TAG"

    cat <<EOF | kubectl apply -f -
apiVersion: apps/v1
kind: Deployment
metadata:
  name: $DEPLOYMENT_NAME
  namespace: $NAMESPACE
  labels:
    app: $APP_NAME
    color: $COLOR
    version: "$IMAGE_TAG"
spec:
  replicas: 3
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxSurge: 1
      maxUnavailable: 0
  selector:
    matchLabels:
      app: $APP_NAME
      color: $COLOR
  template:
    metadata:
      labels:
        app: $APP_NAME
        color: $COLOR
        version: "$IMAGE_TAG"
    spec:
      containers:
      - name: $APP_NAME
        image: $IMAGE_TAG
        imagePullPolicy: Always
        ports:
        - containerPort: 3000
          name: http
        env:
        - name: NODE_ENV
          value: "$ENVIRONMENT"
        - name: COLOR
          value: "$COLOR"
        envFrom:
        - secretRef:
            name: jarvis-secrets
        - configMapRef:
            name: jarvis-config
        resources:
          requests:
            memory: "512Mi"
            cpu: "250m"
          limits:
            memory: "2Gi"
            cpu: "1000m"
        livenessProbe:
          httpGet:
            path: /health
            port: 3000
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /health/ready
            port: 3000
          initialDelaySeconds: 10
          periodSeconds: 5
        startupProbe:
          httpGet:
            path: /health
            port: 3000
          initialDelaySeconds: 0
          periodSeconds: 5
          failureThreshold: 30
EOF

    log_success "$COLOR deployment created"
}

# Wait for deployment to be ready
wait_for_deployment() {
    local COLOR="$1"
    local DEPLOYMENT_NAME="${APP_NAME}-${COLOR}"
    local TIMEOUT=600

    log_info "Waiting for $COLOR deployment to be ready (timeout: ${TIMEOUT}s)..."

    if kubectl rollout status deployment/"$DEPLOYMENT_NAME" -n "$NAMESPACE" --timeout="${TIMEOUT}s"; then
        log_success "$COLOR deployment is ready"
        return 0
    else
        log_error "$COLOR deployment failed to become ready"
        return 1
    fi
}

# Run smoke tests against inactive deployment
run_smoke_tests() {
    local COLOR="$1"
    local DEPLOYMENT_NAME="${APP_NAME}-${COLOR}"

    log_info "Running smoke tests on $COLOR deployment..."

    # Get pod IP for testing
    POD_NAME=$(kubectl get pods -n "$NAMESPACE" -l "app=$APP_NAME,color=$COLOR" -o jsonpath='{.items[0].metadata.name}')
    POD_IP=$(kubectl get pod "$POD_NAME" -n "$NAMESPACE" -o jsonpath='{.status.podIP}')

    log_info "Testing pod: $POD_NAME (IP: $POD_IP)"

    # Port forward for testing
    kubectl port-forward -n "$NAMESPACE" "$POD_NAME" 8888:3000 &
    PORT_FORWARD_PID=$!

    # Wait for port forward
    sleep 3

    # Run smoke tests
    if "$SCRIPT_DIR/smoke-tests.sh" "http://localhost:8888"; then
        log_success "Smoke tests passed on $COLOR deployment"
        kill $PORT_FORWARD_PID 2>/dev/null || true
        return 0
    else
        log_error "Smoke tests failed on $COLOR deployment"
        kill $PORT_FORWARD_PID 2>/dev/null || true
        return 1
    fi
}

# Switch traffic to new deployment
switch_traffic() {
    local NEW_COLOR="$1"

    log_info "Switching traffic to $NEW_COLOR deployment..."

    # Update service selector
    kubectl patch service "$APP_NAME" -n "$NAMESPACE" -p "{\"spec\":{\"selector\":{\"color\":\"$NEW_COLOR\"}}}"

    log_success "Traffic switched to $NEW_COLOR deployment"

    # Wait for service endpoints to update
    sleep 5

    # Verify service endpoints
    ENDPOINTS=$(kubectl get endpoints "$APP_NAME" -n "$NAMESPACE" -o jsonpath='{.subsets[*].addresses[*].ip}')
    log_info "Service endpoints: $ENDPOINTS"
}

# Monitor traffic after switch
monitor_traffic() {
    local NEW_COLOR="$1"
    local MONITOR_DURATION=60

    log_info "Monitoring traffic for ${MONITOR_DURATION}s..."

    # Monitor for errors
    local START_TIME=$(date +%s)
    local ERROR_COUNT=0

    while [ $(($(date +%s) - START_TIME)) -lt $MONITOR_DURATION ]; do
        # Check pod logs for errors
        ERROR_LOGS=$(kubectl logs -n "$NAMESPACE" -l "app=$APP_NAME,color=$NEW_COLOR" --tail=10 --since=10s 2>/dev/null | grep -i "error" | wc -l || echo "0")

        if [ "$ERROR_LOGS" -gt 10 ]; then
            ERROR_COUNT=$((ERROR_COUNT + 1))
            log_warning "High error rate detected (count: $ERROR_COUNT)"

            if [ "$ERROR_COUNT" -gt 3 ]; then
                log_error "Too many errors detected - deployment may be unhealthy"
                return 1
            fi
        fi

        sleep 10
        echo -n "."
    done

    echo ""
    log_success "Traffic monitoring completed - deployment appears healthy"
    return 0
}

# Cleanup old deployment
cleanup_old_deployment() {
    local OLD_COLOR="$1"
    local DEPLOYMENT_NAME="${APP_NAME}-${OLD_COLOR}"

    log_info "Scaling down $OLD_COLOR deployment..."

    # Scale to 0 instead of deleting (for quick rollback)
    kubectl scale deployment/"$DEPLOYMENT_NAME" -n "$NAMESPACE" --replicas=0

    log_success "$OLD_COLOR deployment scaled to 0 (kept for rollback)"

    # Optionally delete after confirmation period (e.g., 1 hour)
    log_info "To delete old deployment later, run:"
    log_info "kubectl delete deployment/$DEPLOYMENT_NAME -n $NAMESPACE"
}

# Rollback to old deployment
rollback_deployment() {
    local OLD_COLOR="$1"

    log_error "Initiating rollback to $OLD_COLOR deployment..."

    # Switch traffic back
    switch_traffic "$OLD_COLOR"

    # Scale old deployment back up
    kubectl scale deployment/"${APP_NAME}-${OLD_COLOR}" -n "$NAMESPACE" --replicas=3

    # Wait for old deployment to be ready
    wait_for_deployment "$OLD_COLOR"

    log_success "Rollback completed - traffic restored to $OLD_COLOR"
}

# Send notification
send_notification() {
    local STATUS="$1"
    local MESSAGE="$2"

    if [ -n "${SLACK_WEBHOOK_URL:-}" ]; then
        curl -X POST "$SLACK_WEBHOOK_URL" \
            -H 'Content-Type: application/json' \
            -d "{
                \"text\": \"Blue-Green Deployment: $STATUS\",
                \"blocks\": [{
                    \"type\": \"section\",
                    \"text\": {
                        \"type\": \"mrkdwn\",
                        \"text\": \"*Environment:* $ENVIRONMENT\\n*Image:* $IMAGE_TAG\\n*Status:* $STATUS\\n*Message:* $MESSAGE\\n*Time:* $(date)\"
                    }
                }]
            }" > /dev/null 2>&1 || true
    fi
}

# Main deployment flow
main() {
    log_info "========================================="
    log_info "Blue-Green Deployment"
    log_info "Environment: $ENVIRONMENT"
    log_info "Image: $IMAGE_TAG"
    log_info "Timestamp: $TIMESTAMP"
    log_info "========================================="

    # Check prerequisites
    check_prerequisites

    # Get active and inactive colors
    ACTIVE_COLOR=$(get_active_color)
    INACTIVE_COLOR=$(get_inactive_color)

    log_info "Active deployment: $ACTIVE_COLOR"
    log_info "Target deployment: $INACTIVE_COLOR"

    # Deploy to inactive environment
    create_deployment "$INACTIVE_COLOR"

    # Wait for deployment to be ready
    if ! wait_for_deployment "$INACTIVE_COLOR"; then
        log_error "Deployment failed - keeping active deployment"
        send_notification "❌ FAILED" "Deployment to $INACTIVE_COLOR failed"
        exit 1
    fi

    # Run smoke tests
    if ! run_smoke_tests "$INACTIVE_COLOR"; then
        log_error "Smoke tests failed - keeping active deployment"
        send_notification "❌ FAILED" "Smoke tests failed on $INACTIVE_COLOR"
        kubectl delete deployment/"${APP_NAME}-${INACTIVE_COLOR}" -n "$NAMESPACE"
        exit 1
    fi

    # Switch traffic
    switch_traffic "$INACTIVE_COLOR"

    # Monitor traffic
    if ! monitor_traffic "$INACTIVE_COLOR"; then
        log_error "Traffic monitoring detected issues - rolling back"
        rollback_deployment "$ACTIVE_COLOR"
        send_notification "⚠️ ROLLED BACK" "Issues detected, rolled back to $ACTIVE_COLOR"
        exit 1
    fi

    # Cleanup old deployment
    cleanup_old_deployment "$ACTIVE_COLOR"

    log_success "========================================="
    log_success "Blue-Green deployment completed!"
    log_success "New active deployment: $INACTIVE_COLOR"
    log_success "Old deployment: $ACTIVE_COLOR (scaled to 0)"
    log_success "========================================="

    send_notification "✅ SUCCESS" "Deployment to $INACTIVE_COLOR completed successfully"
}

# Run main function
main

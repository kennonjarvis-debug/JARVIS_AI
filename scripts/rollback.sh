#!/bin/bash
set -euo pipefail

# Automated Rollback Script
# Usage: ./rollback.sh <environment> [version]
# Example: ./rollback.sh production v1.9.0

ENVIRONMENT="${1:-staging}"
TARGET_VERSION="${2:-}" # Optional: specific version to rollback to
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
NAMESPACE="$ENVIRONMENT"
APP_NAME="jarvis-api"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
ROLLBACK_LOG="${PROJECT_ROOT}/logs/rollback-${ENVIRONMENT}-${TIMESTAMP}.log"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log_info() {
    echo -e "${BLUE}[INFO]${NC} $1" | tee -a "$ROLLBACK_LOG"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1" | tee -a "$ROLLBACK_LOG"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1" | tee -a "$ROLLBACK_LOG"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1" | tee -a "$ROLLBACK_LOG"
}

# Create log directory
mkdir -p "$(dirname "$ROLLBACK_LOG")"

# Confirm rollback
confirm_rollback() {
    log_warning "========================================="
    log_warning "ROLLBACK CONFIRMATION REQUIRED"
    log_warning "Environment: $ENVIRONMENT"
    log_warning "This will rollback to the previous version"
    log_warning "========================================="

    if [ "${FORCE_ROLLBACK:-}" = "true" ]; then
        log_warning "Force rollback enabled - skipping confirmation"
        return 0
    fi

    read -p "Are you sure you want to proceed? (yes/no): " -r
    if [[ ! $REPLY =~ ^[Yy][Ee][Ss]$ ]]; then
        log_info "Rollback cancelled by user"
        exit 0
    fi
}

# Check prerequisites
check_prerequisites() {
    log_info "Checking prerequisites..."

    if ! command -v kubectl &> /dev/null; then
        log_error "kubectl not found"
        exit 1
    fi

    if ! kubectl cluster-info &> /dev/null; then
        log_error "Cannot connect to Kubernetes cluster"
        exit 1
    fi

    log_success "Prerequisites check passed"
}

# Get deployment history
get_deployment_history() {
    log_info "Fetching deployment history..."

    kubectl rollout history deployment/"$APP_NAME" -n "$NAMESPACE" | tee -a "$ROLLBACK_LOG"
}

# Identify last good version
identify_last_good_version() {
    log_info "Identifying last good version..."

    if [ -n "$TARGET_VERSION" ]; then
        ROLLBACK_VERSION="$TARGET_VERSION"
        log_info "Using specified version: $ROLLBACK_VERSION"
    else
        # Get previous revision
        CURRENT_REVISION=$(kubectl get deployment "$APP_NAME" -n "$NAMESPACE" -o jsonpath='{.metadata.annotations.deployment\.kubernetes\.io/revision}')
        PREVIOUS_REVISION=$((CURRENT_REVISION - 1))

        if [ $PREVIOUS_REVISION -lt 1 ]; then
            log_error "No previous revision available to rollback to"
            exit 1
        fi

        ROLLBACK_VERSION="revision-${PREVIOUS_REVISION}"
        log_info "Rolling back to revision: $PREVIOUS_REVISION"
    fi
}

# Backup current state
backup_current_state() {
    log_info "Backing up current deployment state..."

    BACKUP_FILE="${PROJECT_ROOT}/backups/deployments/deployment-${ENVIRONMENT}-${TIMESTAMP}.yaml"
    mkdir -p "$(dirname "$BACKUP_FILE")"

    kubectl get deployment "$APP_NAME" -n "$NAMESPACE" -o yaml > "$BACKUP_FILE"

    log_success "Current state backed up to: $BACKUP_FILE"
}

# Rollback Kubernetes deployment
rollback_deployment() {
    log_info "Rolling back Kubernetes deployment..."

    if [ -n "$TARGET_VERSION" ]; then
        # Rollback to specific version by updating image
        kubectl set image deployment/"$APP_NAME" \
            "$APP_NAME=$TARGET_VERSION" \
            -n "$NAMESPACE"
    else
        # Rollback to previous revision
        kubectl rollout undo deployment/"$APP_NAME" -n "$NAMESPACE"
    fi

    log_success "Rollback command executed"
}

# Wait for rollback to complete
wait_for_rollback() {
    log_info "Waiting for rollback to complete..."

    if kubectl rollout status deployment/"$APP_NAME" -n "$NAMESPACE" --timeout=600s; then
        log_success "Rollback completed successfully"
        return 0
    else
        log_error "Rollback failed to complete"
        return 1
    fi
}

# Verify rollback
verify_rollback() {
    log_info "Verifying rollback..."

    # Check deployment status
    READY_REPLICAS=$(kubectl get deployment "$APP_NAME" -n "$NAMESPACE" -o jsonpath='{.status.readyReplicas}')
    DESIRED_REPLICAS=$(kubectl get deployment "$APP_NAME" -n "$NAMESPACE" -o jsonpath='{.spec.replicas}')

    if [ "$READY_REPLICAS" = "$DESIRED_REPLICAS" ]; then
        log_success "All replicas are ready ($READY_REPLICAS/$DESIRED_REPLICAS)"
    else
        log_error "Not all replicas are ready ($READY_REPLICAS/$DESIRED_REPLICAS)"
        return 1
    fi

    # Run health checks
    log_info "Running health checks..."

    POD_NAME=$(kubectl get pods -n "$NAMESPACE" -l "app=$APP_NAME" -o jsonpath='{.items[0].metadata.name}')

    if kubectl exec -n "$NAMESPACE" "$POD_NAME" -- wget -q -O- http://localhost:3000/health > /dev/null 2>&1; then
        log_success "Health check passed"
        return 0
    else
        log_error "Health check failed"
        return 1
    fi
}

# Rollback database migrations (if needed)
rollback_database() {
    log_warning "Database migration rollback required..."

    # Check if there's a recent backup
    BACKUP_DIR="${PROJECT_ROOT}/backups/migrations"
    LATEST_BACKUP=$(find "$BACKUP_DIR" -name "pre-migration-${ENVIRONMENT}-*.sql.gz" -type f | sort -r | head -n 1)

    if [ -z "$LATEST_BACKUP" ]; then
        log_warning "No recent database backup found"
        log_warning "Skipping database rollback - manual intervention may be required"
        return 0
    fi

    log_info "Found backup: $LATEST_BACKUP"

    # Load environment
    if [ -f "${PROJECT_ROOT}/.env.${ENVIRONMENT}" ]; then
        set -a
        source "${PROJECT_ROOT}/.env.${ENVIRONMENT}"
        set +a
    fi

    # Extract database connection details
    DB_HOST=$(echo "$DATABASE_URL" | sed -n 's|.*@\([^:]*\):.*|\1|p')
    DB_PORT=$(echo "$DATABASE_URL" | sed -n 's|.*:\([0-9]*\)/.*|\1|p')
    DB_NAME=$(echo "$DATABASE_URL" | sed -n 's|.*/\([^?]*\).*|\1|p')
    DB_USER=$(echo "$DATABASE_URL" | sed -n 's|.*://\([^:]*\):.*|\1|p')
    DB_PASS=$(echo "$DATABASE_URL" | sed -n 's|.*://[^:]*:\([^@]*\)@.*|\1|p')

    # Confirm database rollback
    log_warning "WARNING: This will restore database from backup: $LATEST_BACKUP"
    read -p "Proceed with database rollback? (yes/no): " -r

    if [[ $REPLY =~ ^[Yy][Ee][Ss]$ ]]; then
        log_info "Restoring database from backup..."

        # Restore database
        gunzip -c "$LATEST_BACKUP" | PGPASSWORD="$DB_PASS" psql \
            -h "$DB_HOST" \
            -p "$DB_PORT" \
            -U "$DB_USER" \
            -d "$DB_NAME"

        log_success "Database restored from backup"
    else
        log_warning "Database rollback skipped"
    fi
}

# Run smoke tests
run_smoke_tests() {
    log_info "Running smoke tests..."

    if [ -x "$SCRIPT_DIR/smoke-tests.sh" ]; then
        if "$SCRIPT_DIR/smoke-tests.sh" "https://${ENVIRONMENT}.jarvis-ai.app"; then
            log_success "Smoke tests passed"
            return 0
        else
            log_error "Smoke tests failed"
            return 1
        fi
    else
        log_warning "Smoke test script not found - skipping"
        return 0
    fi
}

# Send notification
send_notification() {
    local STATUS="$1"
    local MESSAGE="$2"

    if [ -n "${SLACK_WEBHOOK_URL:-}" ]; then
        curl -X POST "$SLACK_WEBHOOK_URL" \
            -H 'Content-Type: application/json' \
            -d "{
                \"text\": \"🔄 Rollback: $STATUS\",
                \"blocks\": [{
                    \"type\": \"section\",
                    \"text\": {
                        \"type\": \"mrkdwn\",
                        \"text\": \"*Environment:* $ENVIRONMENT\\n*Status:* $STATUS\\n*Message:* $MESSAGE\\n*Version:* ${ROLLBACK_VERSION:-unknown}\\n*Time:* $(date)\\n*Log:* $ROLLBACK_LOG\"
                    }
                }]
            }" > /dev/null 2>&1 || true
    fi
}

# Create incident log
create_incident_log() {
    local INCIDENT_FILE="${PROJECT_ROOT}/logs/incidents/incident-${ENVIRONMENT}-${TIMESTAMP}.md"
    mkdir -p "$(dirname "$INCIDENT_FILE")"

    cat > "$INCIDENT_FILE" <<EOF
# Rollback Incident Report

**Environment:** $ENVIRONMENT
**Timestamp:** $(date)
**Triggered By:** ${USER:-unknown}
**Target Version:** ${ROLLBACK_VERSION:-previous}

## Incident Details

### Reason for Rollback
- [ ] Deployment failure
- [ ] Critical bugs in production
- [ ] Performance degradation
- [ ] Security issue
- [ ] Other: ___________

### Actions Taken
1. Deployment rolled back to: ${ROLLBACK_VERSION:-previous revision}
2. Database rollback: ${DATABASE_ROLLBACK:-not performed}
3. Smoke tests: ${SMOKE_TESTS_STATUS:-not run}

### Current Status
- Deployment Status: $(kubectl rollout status deployment/"$APP_NAME" -n "$NAMESPACE" 2>&1 || echo "unknown")
- Pods Running: $(kubectl get pods -n "$NAMESPACE" -l "app=$APP_NAME" --no-headers | wc -l)

### Follow-up Actions Required
- [ ] Root cause analysis
- [ ] Fix issues in code
- [ ] Update tests to prevent recurrence
- [ ] Re-deploy after fixes

### Logs
- Rollback Log: $ROLLBACK_LOG
- Deployment History: $(kubectl rollout history deployment/"$APP_NAME" -n "$NAMESPACE")

---
*Auto-generated incident report*
EOF

    log_info "Incident report created: $INCIDENT_FILE"
}

# Main rollback flow
main() {
    log_info "========================================="
    log_info "ROLLBACK PROCEDURE"
    log_info "Environment: $ENVIRONMENT"
    log_info "Timestamp: $TIMESTAMP"
    log_info "========================================="

    # Confirm rollback
    confirm_rollback

    # Check prerequisites
    check_prerequisites

    # Get deployment history
    get_deployment_history

    # Identify target version
    identify_last_good_version

    # Backup current state
    backup_current_state

    # Rollback deployment
    rollback_deployment

    # Wait for rollback
    if ! wait_for_rollback; then
        log_error "Rollback failed to complete properly"
        send_notification "❌ FAILED" "Rollback failed to complete"
        create_incident_log
        exit 1
    fi

    # Verify rollback
    if ! verify_rollback; then
        log_error "Rollback verification failed"
        send_notification "⚠️ WARNING" "Rollback completed but verification failed"
        create_incident_log
        exit 1
    fi

    # Ask about database rollback
    read -p "Do you need to rollback database migrations? (yes/no): " -r
    if [[ $REPLY =~ ^[Yy][Ee][Ss]$ ]]; then
        rollback_database
    fi

    # Run smoke tests
    run_smoke_tests

    log_success "========================================="
    log_success "Rollback completed successfully!"
    log_success "Environment: $ENVIRONMENT"
    log_success "Version: $ROLLBACK_VERSION"
    log_success "========================================="

    send_notification "✅ SUCCESS" "Rollback completed successfully to ${ROLLBACK_VERSION}"
    create_incident_log
}

# Run main function
main

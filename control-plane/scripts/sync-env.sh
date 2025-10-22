#!/bin/bash
set -euo pipefail

# Environment Sync Script - AWS Secrets Manager Integration
# Usage: ./sync-env.sh <environment> <direction>
# Example: ./sync-env.sh production pull
# Example: ./sync-env.sh staging push

ENVIRONMENT="${1:-staging}"
DIRECTION="${2:-pull}" # pull or push
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
ENV_FILE="${PROJECT_ROOT}/.env.${ENVIRONMENT}"
SECRET_NAME="jarvis/${ENVIRONMENT}/env"

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

# Check AWS CLI
check_aws_cli() {
    if ! command -v aws &> /dev/null; then
        log_error "AWS CLI not found. Please install it."
        exit 1
    fi

    # Verify AWS credentials
    if ! aws sts get-caller-identity &> /dev/null; then
        log_error "AWS credentials not configured or invalid"
        exit 1
    fi

    log_success "AWS CLI configured"
}

# Pull secrets from AWS Secrets Manager
pull_secrets() {
    log_info "Pulling secrets from AWS Secrets Manager..."

    # Get secret value
    SECRET_VALUE=$(aws secretsmanager get-secret-value \
        --secret-id "$SECRET_NAME" \
        --query SecretString \
        --output text 2>/dev/null || echo "")

    if [ -z "$SECRET_VALUE" ]; then
        log_error "Secret not found: $SECRET_NAME"
        exit 1
    fi

    # Parse JSON and convert to .env format
    echo "$SECRET_VALUE" | jq -r 'to_entries[] | "\(.key)=\(.value)"' > "$ENV_FILE"

    log_success "Secrets pulled to $ENV_FILE"
}

# Push secrets to AWS Secrets Manager
push_secrets() {
    log_warning "Pushing secrets to AWS Secrets Manager..."

    if [ ! -f "$ENV_FILE" ]; then
        log_error "Environment file not found: $ENV_FILE"
        exit 1
    fi

    # Convert .env to JSON
    SECRET_JSON=$(awk -F= '{
        if ($1 !~ /^#/ && NF == 2) {
            gsub(/^[ \t]+|[ \t]+$/, "", $1);
            gsub(/^[ \t]+|[ \t]+$/, "", $2);
            gsub(/"/, "\\\"", $2);
            printf "\"%s\":\"%s\",", $1, $2
        }
    }' "$ENV_FILE" | sed 's/,$//')

    SECRET_JSON="{${SECRET_JSON}}"

    # Validate JSON
    if ! echo "$SECRET_JSON" | jq . > /dev/null 2>&1; then
        log_error "Invalid JSON generated from .env file"
        exit 1
    fi

    # Check if secret exists
    if aws secretsmanager describe-secret --secret-id "$SECRET_NAME" &> /dev/null; then
        # Update existing secret
        aws secretsmanager update-secret \
            --secret-id "$SECRET_NAME" \
            --secret-string "$SECRET_JSON" \
            > /dev/null

        log_success "Secret updated in AWS Secrets Manager"
    else
        # Create new secret
        aws secretsmanager create-secret \
            --name "$SECRET_NAME" \
            --description "Jarvis ${ENVIRONMENT} environment variables" \
            --secret-string "$SECRET_JSON" \
            > /dev/null

        log_success "Secret created in AWS Secrets Manager"
    fi
}

# Validate environment file
validate_env_file() {
    log_info "Validating environment file..."

    if [ ! -f "$ENV_FILE" ]; then
        log_error "Environment file not found: $ENV_FILE"
        exit 1
    fi

    # Check for required variables
    REQUIRED_VARS=(
        "NODE_ENV"
        "DATABASE_URL"
        "REDIS_URL"
        "SESSION_SECRET"
        "JWT_SECRET"
    )

    MISSING_VARS=()

    for VAR in "${REQUIRED_VARS[@]}"; do
        if ! grep -q "^${VAR}=" "$ENV_FILE"; then
            MISSING_VARS+=("$VAR")
        fi
    done

    if [ ${#MISSING_VARS[@]} -gt 0 ]; then
        log_error "Missing required variables:"
        printf '%s\n' "${MISSING_VARS[@]}"
        exit 1
    fi

    # Check for placeholder values
    if grep -q "CHANGE_ME" "$ENV_FILE"; then
        log_warning "Found placeholder values (CHANGE_ME) in environment file"
        read -p "Continue anyway? (yes/no): " -r
        if [[ ! $REPLY =~ ^[Yy][Ee][Ss]$ ]]; then
            log_info "Aborted"
            exit 0
        fi
    fi

    log_success "Environment file validated"
}

# Backup current environment
backup_env() {
    if [ -f "$ENV_FILE" ]; then
        BACKUP_FILE="${ENV_FILE}.backup.$(date +%Y%m%d_%H%M%S)"
        cp "$ENV_FILE" "$BACKUP_FILE"
        log_info "Backed up to: $BACKUP_FILE"
    fi
}

# Main function
main() {
    log_info "========================================="
    log_info "Environment Sync"
    log_info "Environment: $ENVIRONMENT"
    log_info "Direction: $DIRECTION"
    log_info "========================================="

    # Check prerequisites
    check_aws_cli

    case "$DIRECTION" in
        pull)
            # Backup before pulling
            backup_env

            # Pull from AWS
            pull_secrets

            # Validate
            validate_env_file

            log_success "Environment synchronized from AWS Secrets Manager"
            ;;

        push)
            # Validate before pushing
            validate_env_file

            # Confirm push
            log_warning "This will update secrets in AWS Secrets Manager"
            read -p "Are you sure? (yes/no): " -r
            if [[ ! $REPLY =~ ^[Yy][Ee][Ss]$ ]]; then
                log_info "Aborted"
                exit 0
            fi

            # Push to AWS
            push_secrets

            log_success "Environment synchronized to AWS Secrets Manager"
            ;;

        *)
            log_error "Invalid direction: $DIRECTION (use 'pull' or 'push')"
            exit 1
            ;;
    esac
}

# Run main function
main

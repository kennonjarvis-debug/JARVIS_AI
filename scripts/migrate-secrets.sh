#!/bin/bash

################################################################################
# AWS Secrets Manager Migration Script for Jarvis
#
# This script migrates secrets from a local .env file to AWS Secrets Manager
#
# Usage:
#   ./scripts/migrate-secrets.sh [OPTIONS]
#
# Options:
#   --env-file PATH       Path to .env file (default: .env)
#   --secret-name NAME    AWS Secrets Manager secret name (default: jarvis/production)
#   --region REGION       AWS region (default: us-east-1)
#   --dry-run            Show what would be uploaded without actually doing it
#   --update             Update existing secret instead of creating new one
#   --help               Show this help message
#
# Prerequisites:
#   - AWS CLI installed and configured
#   - Proper IAM permissions for Secrets Manager
#   - jq installed for JSON processing
#
################################################################################

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Default values
ENV_FILE=".env"
SECRET_NAME="jarvis/production"
AWS_REGION="us-east-1"
DRY_RUN=false
UPDATE=false

# Secret keys to migrate (sensitive data only)
SECRET_KEYS=(
  "DATABASE_URL"
  "REDIS_URL"
  "OPENAI_API_KEY"
  "ANTHROPIC_API_KEY"
  "GOOGLE_AI_API_KEY"
  "MISTRAL_API_KEY"
  "JWT_SECRET"
  "CSRF_SECRET"
  "REFRESH_TOKEN_SECRET"
  "S3_ACCESS_KEY"
  "S3_SECRET_KEY"
  "SUNO_API_KEY"
  "ELEVENLABS_API_KEY"
  "MUSIC_GEN_API_KEY"
  "STABLE_AUDIO_API_KEY"
  "PUSHOVER_USER_KEY"
  "PUSHOVER_API_TOKEN"
  "SLACK_WEBHOOK_URL"
  "STRIPE_SECRET_KEY"
  "STRIPE_WEBHOOK_SECRET"
)

# Parse command line arguments
while [[ $# -gt 0 ]]; do
  case $1 in
    --env-file)
      ENV_FILE="$2"
      shift 2
      ;;
    --secret-name)
      SECRET_NAME="$2"
      shift 2
      ;;
    --region)
      AWS_REGION="$2"
      shift 2
      ;;
    --dry-run)
      DRY_RUN=true
      shift
      ;;
    --update)
      UPDATE=true
      shift
      ;;
    --help)
      head -n 30 "$0" | tail -n +3 | sed 's/^# //'
      exit 0
      ;;
    *)
      echo -e "${RED}Unknown option: $1${NC}"
      echo "Use --help for usage information"
      exit 1
      ;;
  esac
done

# Function to print colored messages
print_info() {
  echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
  echo -e "${YELLOW}[WARN]${NC} $1"
}

print_error() {
  echo -e "${RED}[ERROR]${NC} $1"
}

# Check prerequisites
check_prerequisites() {
  print_info "Checking prerequisites..."

  # Check if AWS CLI is installed
  if ! command -v aws &> /dev/null; then
    print_error "AWS CLI is not installed. Please install it first."
    print_info "Visit: https://aws.amazon.com/cli/"
    exit 1
  fi

  # Check if jq is installed
  if ! command -v jq &> /dev/null; then
    print_error "jq is not installed. Please install it first."
    print_info "macOS: brew install jq"
    print_info "Linux: apt-get install jq or yum install jq"
    exit 1
  fi

  # Check AWS credentials
  if ! aws sts get-caller-identity &> /dev/null; then
    print_error "AWS credentials not configured properly."
    print_info "Run: aws configure"
    exit 1
  fi

  # Check if .env file exists
  if [ ! -f "$ENV_FILE" ]; then
    print_error "Environment file not found: $ENV_FILE"
    exit 1
  fi

  print_info "All prerequisites met!"
}

# Parse .env file and extract secrets
parse_env_file() {
  print_info "Parsing environment file: $ENV_FILE"

  local json_output="{"
  local first=true

  for key in "${SECRET_KEYS[@]}"; do
    # Extract value from .env file
    local value=$(grep "^${key}=" "$ENV_FILE" | cut -d '=' -f2- | sed 's/^["'\'']//' | sed 's/["'\'']$//')

    if [ -n "$value" ] && [ "$value" != "..." ] && [[ ! "$value" =~ ^your- ]]; then
      if [ "$first" = false ]; then
        json_output+=","
      fi
      json_output+="\"$key\":\"$value\""
      first=false
      print_info "  Found: $key"
    else
      print_warning "  Skipping: $key (empty or placeholder value)"
    fi
  done

  json_output+="}"

  echo "$json_output"
}

# Upload secrets to AWS Secrets Manager
upload_to_aws() {
  local json_secrets="$1"

  print_info "Preparing to upload secrets to AWS Secrets Manager..."
  print_info "  Secret Name: $SECRET_NAME"
  print_info "  Region: $AWS_REGION"

  if [ "$DRY_RUN" = true ]; then
    print_warning "DRY RUN MODE - No changes will be made"
    echo ""
    print_info "Secrets that would be uploaded:"
    echo "$json_secrets" | jq '.'
    return 0
  fi

  # Check if secret already exists
  if aws secretsmanager describe-secret \
      --secret-id "$SECRET_NAME" \
      --region "$AWS_REGION" &> /dev/null; then

    if [ "$UPDATE" = false ]; then
      print_error "Secret '$SECRET_NAME' already exists!"
      print_info "Use --update flag to update existing secret"
      print_info "Or use a different secret name with --secret-name"
      exit 1
    fi

    print_info "Updating existing secret..."
    aws secretsmanager put-secret-value \
      --secret-id "$SECRET_NAME" \
      --secret-string "$json_secrets" \
      --region "$AWS_REGION"

    print_info "Secret updated successfully!"
  else
    print_info "Creating new secret..."
    aws secretsmanager create-secret \
      --name "$SECRET_NAME" \
      --description "Jarvis application secrets (migrated from .env)" \
      --secret-string "$json_secrets" \
      --region "$AWS_REGION"

    print_info "Secret created successfully!"
  fi
}

# Verify uploaded secrets
verify_secrets() {
  if [ "$DRY_RUN" = true ]; then
    return 0
  fi

  print_info "Verifying uploaded secrets..."

  local retrieved_secrets=$(aws secretsmanager get-secret-value \
    --secret-id "$SECRET_NAME" \
    --region "$AWS_REGION" \
    --query 'SecretString' \
    --output text)

  local key_count=$(echo "$retrieved_secrets" | jq 'keys | length')

  print_info "Successfully retrieved $key_count secrets from AWS Secrets Manager"
  echo ""
  print_info "Secret keys stored:"
  echo "$retrieved_secrets" | jq 'keys[]' -r | sed 's/^/  - /'
}

# Create backup of original .env file
create_backup() {
  if [ "$DRY_RUN" = true ]; then
    return 0
  fi

  local backup_file="${ENV_FILE}.backup.$(date +%Y%m%d_%H%M%S)"
  cp "$ENV_FILE" "$backup_file"
  print_info "Created backup: $backup_file"
}

# Generate production .env file
generate_production_env() {
  if [ "$DRY_RUN" = true ]; then
    return 0
  fi

  local prod_env_file=".env.production"

  print_info "Generating production .env file..."

  cat > "$prod_env_file" << EOF
# ==========================================
# Jarvis Production Configuration
# ==========================================
# This file is safe to commit - no secrets here!
# Secrets are stored in AWS Secrets Manager

# AWS Secrets Manager Configuration
USE_LOCAL_SECRETS=false
AWS_REGION=$AWS_REGION
AWS_SECRET_NAME=$SECRET_NAME

# Node Environment
NODE_ENV=production
PORT=4000
LOG_LEVEL=info

# AI DAWG Integration
AI_DAWG_BACKEND_URL=http://ai-dawg-backend:3000
VOCAL_COACH_URL=http://ai-dawg-vocal-coach:8000
PRODUCER_URL=http://ai-dawg-producer:8001
AI_BRAIN_URL=http://ai-dawg-ai-brain:8002

# Feature Flags
AUTONOMOUS_ENABLED=true
ENABLE_MCP=false
ENABLE_MARKETING_MODULE=true
ENABLE_ENGAGEMENT_MODULE=true
ENABLE_AUTOMATION_MODULE=true
ENABLE_TESTING_MODULE=true
ENABLE_MUSIC_MODULE=true

# Monitoring
HEALTH_CHECK_INTERVAL=30
MAX_RESTART_ATTEMPTS=3
RESTART_COOLDOWN=60
DASHBOARD_URL=https://jarvis.yourdomain.com

# Deployment
DEPLOYMENT_MODE=integrated
EOF

  print_info "Created: $prod_env_file"
}

# Main execution
main() {
  echo ""
  print_info "=========================================="
  print_info "AWS Secrets Manager Migration for Jarvis"
  print_info "=========================================="
  echo ""

  check_prerequisites
  echo ""

  create_backup
  echo ""

  local json_secrets=$(parse_env_file)
  echo ""

  upload_to_aws "$json_secrets"
  echo ""

  verify_secrets
  echo ""

  generate_production_env
  echo ""

  print_info "=========================================="
  print_info "Migration Complete!"
  print_info "=========================================="
  echo ""

  if [ "$DRY_RUN" = false ]; then
    print_info "Next steps:"
    echo "  1. Verify secrets in AWS Console:"
    echo "     https://console.aws.amazon.com/secretsmanager/home?region=$AWS_REGION"
    echo ""
    echo "  2. Update your production deployment to use:"
    echo "     USE_LOCAL_SECRETS=false"
    echo "     AWS_SECRET_NAME=$SECRET_NAME"
    echo "     AWS_REGION=$AWS_REGION"
    echo ""
    echo "  3. Test your application with the new secrets"
    echo ""
    echo "  4. Remove sensitive data from your local .env file"
    echo "     (A backup has been created)"
  fi
}

# Run main function
main

#!/bin/bash

###############################################################################
# Create AWS Secrets for Jarvis
#
# This script creates all necessary secrets in AWS Secrets Manager
# for Jarvis improvements to work properly.
#
# Usage: ./scripts/create-aws-secrets.sh [environment]
# Example: ./scripts/create-aws-secrets.sh production
###############################################################################

set -e

ENVIRONMENT=${1:-production}
AWS_REGION=${AWS_REGION:-us-east-1}

echo "🔐 Creating AWS Secrets for Jarvis ($ENVIRONMENT)"
echo "Region: $AWS_REGION"
echo ""

###############################################################################
# Database Secret
###############################################################################

echo "📊 Creating database secret..."

# Prompt for database details
read -p "Database Host (e.g., jarvis-db.xyz.rds.amazonaws.com): " DB_HOST
read -p "Database Port [5432]: " DB_PORT
DB_PORT=${DB_PORT:-5432}
read -p "Database Name [jarvis]: " DB_NAME
DB_NAME=${DB_NAME:-jarvis}
read -p "Database User: " DB_USER
read -s -p "Database Password: " DB_PASSWORD
echo ""

# Construct DATABASE_URL
DATABASE_URL="postgresql://${DB_USER}:${DB_PASSWORD}@${DB_HOST}:${DB_PORT}/${DB_NAME}?schema=public"

# Create secret
aws secretsmanager create-secret \
  --name "jarvis/${ENVIRONMENT}/database" \
  --description "Jarvis RDS database connection" \
  --secret-string "{\"DATABASE_URL\":\"${DATABASE_URL}\"}" \
  --region $AWS_REGION \
  --tags Key=Environment,Value=$ENVIRONMENT Key=Service,Value=jarvis \
  2>/dev/null || \
aws secretsmanager update-secret \
  --secret-id "jarvis/${ENVIRONMENT}/database" \
  --secret-string "{\"DATABASE_URL\":\"${DATABASE_URL}\"}" \
  --region $AWS_REGION

echo "✅ Database secret created/updated"
echo ""

###############################################################################
# Redis Secret (Optional - for distributed task queue)
###############################################################################

echo "📮 Creating Redis secret..."
read -p "Skip Redis setup? (y/n) [y]: " SKIP_REDIS
SKIP_REDIS=${SKIP_REDIS:-y}

if [ "$SKIP_REDIS" != "y" ]; then
  read -p "Redis Host (e.g., jarvis-redis.cache.amazonaws.com): " REDIS_HOST
  read -p "Redis Port [6379]: " REDIS_PORT
  REDIS_PORT=${REDIS_PORT:-6379}
  read -s -p "Redis Password (leave empty if none): " REDIS_PASSWORD
  echo ""

  REDIS_SECRET="{\"REDIS_HOST\":\"${REDIS_HOST}\",\"REDIS_PORT\":\"${REDIS_PORT}\""

  if [ -n "$REDIS_PASSWORD" ]; then
    REDIS_SECRET="${REDIS_SECRET},\"REDIS_PASSWORD\":\"${REDIS_PASSWORD}\""
  fi

  REDIS_SECRET="${REDIS_SECRET}}"

  aws secretsmanager create-secret \
    --name "jarvis/${ENVIRONMENT}/redis" \
    --description "Jarvis Redis ElastiCache configuration" \
    --secret-string "$REDIS_SECRET" \
    --region $AWS_REGION \
    --tags Key=Environment,Value=$ENVIRONMENT Key=Service,Value=jarvis \
    2>/dev/null || \
  aws secretsmanager update-secret \
    --secret-id "jarvis/${ENVIRONMENT}/redis" \
    --secret-string "$REDIS_SECRET" \
    --region $AWS_REGION

  echo "✅ Redis secret created/updated"
else
  echo "⏭️  Skipped Redis setup"
fi

echo ""

###############################################################################
# AI API Keys
###############################################################################

echo "🤖 Creating AI API keys secret..."

read -s -p "OpenAI API Key: " OPENAI_KEY
echo ""
read -s -p "Anthropic API Key: " ANTHROPIC_KEY
echo ""
read -s -p "Gemini API Key: " GEMINI_KEY
echo ""

AI_KEYS_SECRET="{
  \"OPENAI_API_KEY\":\"${OPENAI_KEY}\",
  \"ANTHROPIC_API_KEY\":\"${ANTHROPIC_KEY}\",
  \"GEMINI_API_KEY\":\"${GEMINI_KEY}\"
}"

aws secretsmanager create-secret \
  --name "jarvis/${ENVIRONMENT}/ai-keys" \
  --description "AI provider API keys" \
  --secret-string "$AI_KEYS_SECRET" \
  --region $AWS_REGION \
  --tags Key=Environment,Value=$ENVIRONMENT Key=Service,Value=jarvis \
  2>/dev/null || \
aws secretsmanager update-secret \
  --secret-id "jarvis/${ENVIRONMENT}/ai-keys" \
  --secret-string "$AI_KEYS_SECRET" \
  --region $AWS_REGION

echo "✅ AI keys secret created/updated"
echo ""

###############################################################################
# Application Secrets
###############################################################################

echo "🔑 Creating application secrets..."

read -p "Jarvis Auth Token (for API authentication): " AUTH_TOKEN

APP_SECRET="{
  \"JARVIS_AUTH_TOKEN\":\"${AUTH_TOKEN}\"
}"

aws secretsmanager create-secret \
  --name "jarvis/${ENVIRONMENT}/app" \
  --description "Jarvis application secrets" \
  --secret-string "$APP_SECRET" \
  --region $AWS_REGION \
  --tags Key=Environment,Value=$ENVIRONMENT Key=Service,Value=jarvis \
  2>/dev/null || \
aws secretsmanager update-secret \
  --secret-id "jarvis/${ENVIRONMENT}/app" \
  --secret-string "$APP_SECRET" \
  --region $AWS_REGION

echo "✅ Application secrets created/updated"
echo ""

###############################################################################
# Summary
###############################################################################

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🎉 AWS Secrets Created Successfully!"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Created secrets:"
echo "  1. jarvis/${ENVIRONMENT}/database   - Database connection"
if [ "$SKIP_REDIS" != "y" ]; then
echo "  2. jarvis/${ENVIRONMENT}/redis      - Redis configuration"
fi
echo "  3. jarvis/${ENVIRONMENT}/ai-keys    - AI provider keys"
echo "  4. jarvis/${ENVIRONMENT}/app        - Application secrets"
echo ""
echo "View secrets:"
echo "  aws secretsmanager list-secrets --region $AWS_REGION | grep jarvis"
echo ""
echo "Get a secret value:"
echo "  aws secretsmanager get-secret-value --secret-id jarvis/${ENVIRONMENT}/database --region $AWS_REGION"
echo ""
echo "Next steps:"
echo "  1. Update ECS task definition to reference these secrets"
echo "  2. Ensure IAM role has secretsmanager:GetSecretValue permission"
echo "  3. Deploy Jarvis with: ./scripts/deploy-to-aws.sh ${ENVIRONMENT}"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

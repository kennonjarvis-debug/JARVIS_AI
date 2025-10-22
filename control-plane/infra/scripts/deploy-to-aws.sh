#!/bin/bash

###############################################################################
# Deploy Jarvis Improvements to AWS
#
# This script:
# 1. Runs database migrations on RDS
# 2. Builds and pushes Docker images
# 3. Updates ECS services
# 4. Verifies deployment
#
# Usage: ./scripts/deploy-to-aws.sh [environment]
# Example: ./scripts/deploy-to-aws.sh production
###############################################################################

set -e  # Exit on error

# Configuration
ENVIRONMENT=${1:-staging}
AWS_REGION=${AWS_REGION:-us-east-1}
AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
ECR_REPOSITORY="jarvis-control-plane"
ECS_CLUSTER="jarvis-cluster"
ECS_SERVICE="jarvis-service"

echo "🚀 Deploying Jarvis Improvements to AWS"
echo "Environment: $ENVIRONMENT"
echo "Region: $AWS_REGION"
echo ""

###############################################################################
# Step 1: Run Database Migrations
###############################################################################

echo "📊 Step 1: Running database migrations..."

# Get database URL from Secrets Manager
DB_SECRET=$(aws secretsmanager get-secret-value \
  --secret-id "jarvis/$ENVIRONMENT/database" \
  --region $AWS_REGION \
  --query SecretString \
  --output text)

DATABASE_URL=$(echo $DB_SECRET | jq -r '.DATABASE_URL')

# Run migrations
echo "Running SQL migrations..."
psql "$DATABASE_URL" < scripts/migrations/001-add-improvements-schema.sql

# OR use Prisma migrate
# DATABASE_URL="$DATABASE_URL" npx prisma migrate deploy

echo "✅ Database migrations complete"
echo ""

###############################################################################
# Step 2: Build Docker Images
###############################################################################

echo "🐳 Step 2: Building Docker images..."

# Login to ECR
aws ecr get-login-password --region $AWS_REGION | \
  docker login --username AWS --password-stdin \
  $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com

# Build for linux/amd64 (required for ECS)
docker buildx build \
  --platform linux/amd64 \
  --build-arg NODE_ENV=production \
  --build-arg APP_VERSION=$(git rev-parse --short HEAD) \
  -t $ECR_REPOSITORY:latest \
  -t $ECR_REPOSITORY:$(git rev-parse --short HEAD) \
  --push \
  .

echo "✅ Docker images built and pushed"
echo ""

###############################################################################
# Step 3: Update ECS Task Definition
###############################################################################

echo "📝 Step 3: Updating ECS task definition..."

# Get current task definition
TASK_DEFINITION=$(aws ecs describe-task-definition \
  --task-definition jarvis-task \
  --region $AWS_REGION \
  --query 'taskDefinition')

# Update image tag
NEW_TASK_DEF=$(echo $TASK_DEFINITION | jq --arg IMAGE \
  "$AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/$ECR_REPOSITORY:$(git rev-parse --short HEAD)" \
  '.containerDefinitions[0].image = $IMAGE | del(.taskDefinitionArn, .revision, .status, .requiresAttributes, .compatibilities, .registeredAt, .registeredBy)')

# Register new task definition
NEW_TASK_ARN=$(aws ecs register-task-definition \
  --region $AWS_REGION \
  --cli-input-json "$NEW_TASK_DEF" \
  --query 'taskDefinition.taskDefinitionArn' \
  --output text)

echo "✅ New task definition: $NEW_TASK_ARN"
echo ""

###############################################################################
# Step 4: Update ECS Service
###############################################################################

echo "🔄 Step 4: Updating ECS service..."

aws ecs update-service \
  --cluster $ECS_CLUSTER \
  --service $ECS_SERVICE \
  --task-definition $NEW_TASK_ARN \
  --force-new-deployment \
  --region $AWS_REGION \
  > /dev/null

echo "✅ ECS service update initiated"
echo ""

###############################################################################
# Step 5: Wait for Deployment
###############################################################################

echo "⏳ Step 5: Waiting for deployment to complete..."

aws ecs wait services-stable \
  --cluster $ECS_CLUSTER \
  --services $ECS_SERVICE \
  --region $AWS_REGION

echo "✅ Deployment stable"
echo ""

###############################################################################
# Step 6: Verify Health
###############################################################################

echo "🏥 Step 6: Verifying health..."

# Get load balancer URL
LB_URL=$(aws ecs describe-services \
  --cluster $ECS_CLUSTER \
  --services $ECS_SERVICE \
  --region $AWS_REGION \
  --query 'services[0].loadBalancers[0].targetGroupArn' \
  --output text | xargs -I {} aws elbv2 describe-target-groups \
  --target-group-arns {} \
  --region $AWS_REGION \
  --query 'TargetGroups[0].LoadBalancerArns[0]' \
  --output text | xargs -I {} aws elbv2 describe-load-balancers \
  --load-balancer-arns {} \
  --region $AWS_REGION \
  --query 'LoadBalancers[0].DNSName' \
  --output text)

# Check health endpoint
HEALTH_RESPONSE=$(curl -s "http://$LB_URL/health")
HEALTH_STATUS=$(echo $HEALTH_RESPONSE | jq -r '.status')

if [ "$HEALTH_STATUS" == "healthy" ]; then
  echo "✅ Health check passed: $HEALTH_STATUS"
else
  echo "❌ Health check failed: $HEALTH_STATUS"
  echo "Response: $HEALTH_RESPONSE"
  exit 1
fi

# Check circuit breakers
CB_RESPONSE=$(curl -s "http://$LB_URL/api/v1/circuit-breakers" \
  -H "Authorization: Bearer ${JARVIS_AUTH_TOKEN}")
echo "Circuit Breakers: $(echo $CB_RESPONSE | jq -r '.data | keys | length') registered"

# Check task history
TASKS_RESPONSE=$(curl -s "http://$LB_URL/api/v1/tasks/history?domain=system-health&action=monitor-services" \
  -H "Authorization: Bearer ${JARVIS_AUTH_TOKEN}")
TASK_COUNT=$(echo $TASKS_RESPONSE | jq -r '.data.totalExecutions')
echo "Task History: $TASK_COUNT executions recorded"

echo ""

###############################################################################
# Step 7: CloudWatch Logs
###############################################################################

echo "📋 Step 7: Checking CloudWatch logs..."

# Get latest log stream
LOG_STREAM=$(aws logs describe-log-streams \
  --log-group-name /ecs/jarvis \
  --order-by LastEventTime \
  --descending \
  --max-items 1 \
  --region $AWS_REGION \
  --query 'logStreams[0].logStreamName' \
  --output text)

# Get recent logs
aws logs get-log-events \
  --log-group-name /ecs/jarvis \
  --log-stream-name "$LOG_STREAM" \
  --limit 10 \
  --region $AWS_REGION \
  --query 'events[*].message' \
  --output text

echo ""

###############################################################################
# Summary
###############################################################################

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🎉 Deployment Complete!"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Environment:     $ENVIRONMENT"
echo "Image:           $ECR_REPOSITORY:$(git rev-parse --short HEAD)"
echo "Task Definition: $NEW_TASK_ARN"
echo "Load Balancer:   http://$LB_URL"
echo "Health Status:   $HEALTH_STATUS"
echo ""
echo "Next Steps:"
echo "1. Monitor CloudWatch logs: aws logs tail /ecs/jarvis --follow"
echo "2. Check circuit breakers: curl http://$LB_URL/api/v1/circuit-breakers"
echo "3. View task history: curl http://$LB_URL/api/v1/tasks/history"
echo "4. Test correlation IDs: Check X-Correlation-ID in response headers"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

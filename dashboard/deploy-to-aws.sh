#!/bin/bash
# Deploy Dashboard API to AWS ECS

set -e

REGION="us-east-1"
AWS_ACCOUNT_ID="837526330276"
CLUSTER_NAME="aidawg-jarvis-cluster"
SERVICE_NAME="aidawg-jarvis-dashboard-api"
TASK_FAMILY="aidawg-jarvis-dashboard-api"
IMAGE_NAME="aidawg-jarvis-dashboard-api"
ECR_REPO="${AWS_ACCOUNT_ID}.dkr.ecr.${REGION}.amazonaws.com/${IMAGE_NAME}"

echo "🚀 Deploying Dashboard API to AWS..."

# 1. Create ECR repository if it doesn't exist
echo "📦 Creating ECR repository..."
aws ecr describe-repositories --repository-names ${IMAGE_NAME} --region ${REGION} 2>/dev/null || \
  aws ecr create-repository --repository-name ${IMAGE_NAME} --region ${REGION}

# 2. Login to ECR
echo "🔐 Logging in to ECR..."
aws ecr get-login-password --region ${REGION} | docker login --username AWS --password-stdin ${ECR_REPO}

# 3. Build Docker image
echo "🏗️  Building Docker image..."
cd backend
docker build -t ${IMAGE_NAME}:latest .

# 4. Tag and push
echo "📤 Pushing to ECR..."
docker tag ${IMAGE_NAME}:latest ${ECR_REPO}:latest
docker push ${ECR_REPO}:latest

# 5. Create task definition
echo "📝 Registering task definition..."
cat > task-definition.json <<EOF
{
  "family": "${TASK_FAMILY}",
  "networkMode": "awsvpc",
  "requiresCompatibilities": ["FARGATE"],
  "cpu": "256",
  "memory": "512",
  "executionRoleArn": "arn:aws:iam::${AWS_ACCOUNT_ID}:role/ecsTaskExecutionRole",
  "containerDefinitions": [
    {
      "name": "${IMAGE_NAME}",
      "image": "${ECR_REPO}:latest",
      "essential": true,
      "portMappings": [
        {
          "containerPort": 5001,
          "protocol": "tcp"
        }
      ],
      "environment": [
        {
          "name": "DASHBOARD_PORT",
          "value": "5001"
        },
        {
          "name": "NODE_ENV",
          "value": "production"
        }
      ],
      "logConfiguration": {
        "logDriver": "awslogs",
        "options": {
          "awslogs-group": "/ecs/${TASK_FAMILY}",
          "awslogs-region": "${REGION}",
          "awslogs-stream-prefix": "ecs"
        }
      }
    }
  ]
}
EOF

aws ecs register-task-definition --cli-input-json file://task-definition.json

# 6. Create or update service
echo "🎯 Creating/updating ECS service..."

# Check if service exists
if aws ecs describe-services --cluster ${CLUSTER_NAME} --services ${SERVICE_NAME} --region ${REGION} | grep -q "ACTIVE"; then
  echo "Updating existing service..."
  aws ecs update-service \
    --cluster ${CLUSTER_NAME} \
    --service ${SERVICE_NAME} \
    --force-new-deployment \
    --region ${REGION}
else
  echo "Creating new service..."
  # Get VPC and subnet info from existing service
  SUBNETS=$(aws ecs describe-services --cluster ${CLUSTER_NAME} --services aidawg-jarvis-jarvis --region ${REGION} --query 'services[0].networkConfiguration.awsvpcConfiguration.subnets' --output text)
  SECURITY_GROUPS=$(aws ecs describe-services --cluster ${CLUSTER_NAME} --services aidawg-jarvis-jarvis --region ${REGION} --query 'services[0].networkConfiguration.awsvpcConfiguration.securityGroups' --output text)

  aws ecs create-service \
    --cluster ${CLUSTER_NAME} \
    --service-name ${SERVICE_NAME} \
    --task-definition ${TASK_FAMILY} \
    --desired-count 1 \
    --launch-type FARGATE \
    --network-configuration "awsvpcConfiguration={subnets=[${SUBNETS}],securityGroups=[${SECURITY_GROUPS}],assignPublicIp=ENABLED}" \
    --region ${REGION}
fi

echo "✅ Deployment complete!"
echo "📊 Dashboard API is deploying to ECS cluster: ${CLUSTER_NAME}"
echo ""
echo "To check status:"
echo "  aws ecs describe-services --cluster ${CLUSTER_NAME} --services ${SERVICE_NAME} --region ${REGION}"

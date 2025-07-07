#!/bin/bash

# Exit on any error
set -e

# Configuration
AWS_REGION="ap-northeast-1"
ECR_BACKEND_REPO="splitmate-backend"
ECR_FRONTEND_REPO="splitmate-frontend"
ECS_CLUSTER="splitmate-cluster"
BACKEND_SERVICE="splitmate-backend-service"
FRONTEND_SERVICE="splitmate-frontend-service"

echo "🚀 Starting deployment..."

# Get AWS account ID
AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
echo "AWS Account ID: $AWS_ACCOUNT_ID"

# ECR repository URLs
ECR_BACKEND_URL="$AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/$ECR_BACKEND_REPO"
ECR_FRONTEND_URL="$AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/$ECR_FRONTEND_REPO"

echo "📦 Building and pushing Docker images..."

# Login to ECR
echo "🔐 Logging in to ECR..."
aws ecr get-login-password --region $AWS_REGION | docker login --username AWS --password-stdin $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com

# Build and push backend
echo "🔨 Building backend image..."
cd backend
docker buildx build --no-cache --platform linux/amd64 -f Dockerfile.prod -t $ECR_BACKEND_URL:latest . --push
cd ..

# Build and push frontend
echo "🔨 Building frontend image..."
cd frontend

# Get ALB DNS name for VITE_API_URL
ALB_DNS=$(aws elbv2 describe-load-balancers --names splitmate-alb --region $AWS_REGION --query 'LoadBalancers[0].DNSName' --output text)
VITE_API_URL="http://$ALB_DNS"

echo "Using VITE_API_URL: $VITE_API_URL"

docker buildx build --no-cache --platform linux/amd64 \
  --build-arg VITE_API_URL=$VITE_API_URL \
  -f Dockerfile.prod \
  -t $ECR_FRONTEND_URL:latest . --push
cd ..

echo "🔄 Updating ECS services..."

# Update backend service
echo "🔄 Updating backend service..."
aws ecs update-service \
    --cluster $ECS_CLUSTER \
    --service $BACKEND_SERVICE \
    --force-new-deployment \
    --region $AWS_REGION

# Update frontend service
echo "🔄 Updating frontend service..."
aws ecs update-service \
    --cluster $ECS_CLUSTER \
    --service $FRONTEND_SERVICE \
    --force-new-deployment \
    --region $AWS_REGION

echo "⏳ Waiting for services to stabilize..."

# Wait for backend service to stabilize
aws ecs wait services-stable \
    --cluster $ECS_CLUSTER \
    --services $BACKEND_SERVICE \
    --region $AWS_REGION

# Wait for frontend service to stabilize
aws ecs wait services-stable \
    --cluster $ECS_CLUSTER \
    --services $FRONTEND_SERVICE \
    --region $AWS_REGION

echo "✅ Deployment completed successfully!"

# Get ALB DNS name
ALB_DNS=$(aws elbv2 describe-load-balancers --names splitmate-alb --region $AWS_REGION --query 'LoadBalancers[0].DNSName' --output text)
echo "🌐 Application URL: http://$ALB_DNS"

echo "📊 Service status:"
aws ecs describe-services \
    --cluster $ECS_CLUSTER \
    --services $BACKEND_SERVICE $FRONTEND_SERVICE \
    --region $AWS_REGION \
    --query 'services[*].[serviceName,runningCount,desiredCount,status]' \
    --output table 

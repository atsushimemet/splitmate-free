#!/bin/bash

echo "🚀 Starting SplitMate development environment with Docker..."

# Stop any existing containers
echo "🛑 Stopping existing containers..."
docker compose -f docker-compose.dev.yml down

# Build and start containers
echo "🔨 Building and starting containers..."
docker compose -f docker-compose.dev.yml up --build -d

# Wait for services to be ready
echo "⏳ Waiting for services to be ready..."
sleep 10

# Check service status
echo "📊 Checking service status..."
docker compose -f docker-compose.dev.yml ps

echo "✅ Development environment is ready!"
echo "🌐 Frontend: http://localhost:3000"
echo "🔧 Backend API: http://localhost:3001"
echo "🗄️  MySQL: localhost:3306"
echo ""
echo "📝 Useful commands:"
echo "  View logs: docker compose -f docker-compose.dev.yml logs -f"
echo "  Stop services: docker compose -f docker-compose.dev.yml down"
echo "  Restart services: docker compose -f docker-compose.dev.yml restart" 

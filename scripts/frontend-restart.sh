#!/bin/bash

# Frontend Restart Script
# 프론트엔드만 내리고 리빌드해서 다시 올리는 스크립트

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
SERVICE_NAME="mcp-orch-frontend"

echo "🔄 Frontend Restart Script Starting..."
echo "📁 Project Directory: $PROJECT_DIR"
echo "🏗️  Service Name: $SERVICE_NAME"

cd "$PROJECT_DIR"

# 1. 현재 상태 확인
echo ""
echo "📊 Current container status:"
docker compose ps $SERVICE_NAME

# 2. 프론트엔드 컨테이너 중지 및 제거
echo ""
echo "⏹️  Stopping frontend container..."
docker compose stop $SERVICE_NAME

echo "🗑️  Removing frontend container..."
docker compose rm -f $SERVICE_NAME

# 3. 이미지도 제거 (완전한 리빌드를 위해)
echo ""
echo "🧹 Removing old frontend image..."
docker compose images $SERVICE_NAME
docker rmi $(docker compose images -q $SERVICE_NAME) 2>/dev/null || echo "No image to remove"

# 4. 리빌드 및 재시작
echo ""
echo "🏗️  Rebuilding and starting frontend..."
docker compose up -d --build --no-deps $SERVICE_NAME

# 5. 로그 확인
echo ""
echo "📋 Checking frontend logs (last 20 lines):"
sleep 3
docker compose logs --tail=20 $SERVICE_NAME

# 6. 최종 상태 확인
echo ""
echo "✅ Final container status:"
docker compose ps $SERVICE_NAME

echo ""
echo "🎉 Frontend restart completed!"
echo "🌐 Frontend should be available at: http://localhost:3000"
echo ""
echo "💡 Useful commands:"
echo "   View logs: docker compose logs -f $SERVICE_NAME"
echo "   Stop only: docker compose stop $SERVICE_NAME"
echo "   Restart: docker compose restart $SERVICE_NAME"
echo "   Build only frontend: docker compose up -d --build --no-deps $SERVICE_NAME"
#!/bin/bash

# MCP Orchestrator 간단 마이그레이션 스크립트
# 사용법: ./scripts/migrate.sh

set -e

echo "🔄 MCP Orchestrator 마이그레이션 시작"
echo "========================================"

# 색상 정의
GREEN='\033[0;32m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

log_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

log_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

log_error() {
    echo -e "${RED}❌ $1${NC}"
}

# 1단계: Git pull
log_info "1/4: Git pull 실행 중..."
if git pull; then
    log_success "Git pull 완료"
else
    log_error "Git pull 실패. 수동으로 확인하세요."
    exit 1
fi

# 2단계: 기존 프로세스 종료
log_info "2/4: 기존 프로세스 종료 중..."
pkill -f "mcp-orch serve" 2>/dev/null || true
pkill -f "uvicorn.*mcp_orch" 2>/dev/null || true
sleep 2

# 강제 종료 확인
if pgrep -f "mcp-orch serve\|uvicorn.*mcp_orch" > /dev/null; then
    log_info "강제 종료 실행 중..."
    pkill -9 -f "mcp-orch serve" 2>/dev/null || true
    pkill -9 -f "uvicorn.*mcp_orch" 2>/dev/null || true
    sleep 1
fi
log_success "프로세스 종료 완료"

# 3단계: 마이그레이션 실행
log_info "3/4: 데이터베이스 마이그레이션 실행 중..."
if uv run alembic upgrade head; then
    log_success "마이그레이션 완료"
else
    log_error "마이그레이션 실패"
    exit 1
fi

# 4단계: 서버 시작
log_info "4/4: 백엔드 서버 시작 중..."
mkdir -p logs
nohup uv run mcp-orch serve > logs/mcp-orch-$(date +%Y%m%d).log 2>&1 &
SERVER_PID=$!

# 시작 확인
sleep 3
if kill -0 $SERVER_PID 2>/dev/null; then
    log_success "백엔드 서버 시작 완료 (PID: $SERVER_PID)"
    echo ""
    echo "🎉 마이그레이션 완료!"
    echo "=============================="
    echo "📊 서비스 URL:"
    echo "  • Backend API: http://localhost:8000"
    echo "  • Frontend: http://localhost:3000"
    echo "  • 로그 확인: tail -f logs/mcp-orch-$(date +%Y%m%d).log"
else
    log_error "백엔드 서버 시작 실패"
    echo "로그 확인: cat logs/mcp-orch-$(date +%Y%m%d).log"
    exit 1
fi
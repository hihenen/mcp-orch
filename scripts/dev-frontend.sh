#!/bin/bash

# MCP Orchestrator Frontend Development Script
# 프론트엔드만 개발 모드로 실행합니다 (Hot Reload 포함)

set -e

echo "🌐 MCP Orchestrator Frontend Development"
echo "======================================="

# 색상 정의
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

log_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

log_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

log_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

log_error() {
    echo -e "${RED}❌ $1${NC}"
}

# 프로젝트 루트 확인
if [ ! -f "package.json" ] && [ ! -d "web" ]; then
    log_error "MCP Orchestrator 프로젝트 루트에서 실행해주세요"
    exit 1
fi

# web 디렉토리로 이동
if [ -d "web" ]; then
    log_info "web 디렉토리로 이동 중..."
    cd web
fi

# Node.js 및 pnpm 확인
if ! command -v node &> /dev/null; then
    log_error "Node.js가 설치되어 있지 않습니다."
    exit 1
fi

if ! command -v pnpm &> /dev/null; then
    log_warning "pnpm이 설치되어 있지 않습니다. npm으로 대체 실행합니다."
    PACKAGE_MANAGER="npm"
else
    PACKAGE_MANAGER="pnpm"
fi

# 환경 변수 확인
if [ ! -f ".env.local" ] && [ ! -f "../.env" ]; then
    log_warning "환경 변수 파일이 없습니다. 기본값으로 실행됩니다."
    log_info "백엔드 URL: http://localhost:8000 (기본값)"
fi

# 의존성 설치 확인
if [ ! -d "node_modules" ]; then
    log_info "의존성을 설치하는 중..."
    $PACKAGE_MANAGER install
    log_success "의존성 설치 완료"
fi

# 개발 서버 시작
log_success "프론트엔드 개발 서버를 시작합니다! 🚀"
echo ""
echo "🌐 개발 정보:"
echo "  • Frontend URL: http://localhost:3000"
echo "  • Hot Reload: 활성화 ✨"
echo "  • Backend API: http://localhost:8000 (별도 실행 필요)"
echo ""
echo "🔧 유용한 명령어들:"
echo "  • 백엔드 시작: ./scripts/dev-backend.sh"
echo "  • 데이터베이스 시작: ./scripts/dev-database.sh"
echo "  • 로그 모니터링: ./scripts/logs.sh"
echo ""
echo "종료하려면 Ctrl+C를 누르세요."
echo ""

$PACKAGE_MANAGER run dev
#!/bin/bash

# MCP Orchestrator Backend Development Script
# 백엔드만 개발 모드로 실행합니다 (Hot Reload 포함)

set -e

echo "⚡ MCP Orchestrator Backend Development"
echo "======================================"

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
if [ ! -f "pyproject.toml" ] || ! grep -q "mcp-orch" pyproject.toml 2>/dev/null; then
    log_error "MCP Orchestrator 프로젝트 루트에서 실행해주세요"
    exit 1
fi

# Python 및 uv 확인
if ! command -v python3 &> /dev/null; then
    log_error "Python 3.11+ 이 필요합니다."
    exit 1
fi

if ! command -v uv &> /dev/null; then
    log_error "uv가 설치되어 있지 않습니다."
    log_info "설치 방법: curl -LsSf https://astral.sh/uv/install.sh | sh"
    exit 1
fi

# 환경 변수 확인
if [ ! -f ".env" ]; then
    log_warning ".env 파일이 없습니다."
    if [ -f ".env.hybrid.example" ]; then
        log_info ".env.hybrid.example을 복사하여 .env 파일을 생성합니다..."
        cp .env.hybrid.example .env
        log_success ".env 파일 생성 완료"
    else
        log_error "환경 설정 파일이 없습니다."
        exit 1
    fi
fi

# 가상환경 확인
if [ ! -d ".venv" ]; then
    log_info "Python 가상환경을 생성하는 중..."
    uv venv
    log_success "가상환경 생성 완료"
fi

# 의존성 설치
log_info "Python 의존성을 확인하는 중..."
uv sync
log_success "의존성 확인 완료"

# 데이터베이스 연결 확인
log_info "데이터베이스 연결을 확인하는 중..."
if ! uv run python -c "
import asyncio
from src.mcp_orch.database import AsyncSessionLocal, engine

async def check_db():
    try:
        async with AsyncSessionLocal() as session:
            await session.execute('SELECT 1')
        print('✅ 데이터베이스 연결 성공')
        return True
    except Exception as e:
        print(f'❌ 데이터베이스 연결 실패: {e}')
        return False

result = asyncio.run(check_db())
exit(0 if result else 1)
" 2>/dev/null; then
    log_warning "데이터베이스 연결에 실패했습니다."
    log_info "PostgreSQL이 실행 중인지 확인하세요:"
    echo "  • Docker: docker compose up -d postgresql"
    echo "  • 전체 설정: ./scripts/quickstart.sh"
    echo ""
    log_info "그래도 개발 서버를 시작합니다..."
else
    log_success "데이터베이스 연결 확인 완료"
fi

# 백엔드 개발 서버 시작
log_success "백엔드 개발 서버를 시작합니다! ⚡"
echo ""
echo "🌐 개발 정보:"
echo "  • Backend API: http://localhost:8000"
echo "  • Hot Reload: 활성화 🔄"
echo "  • Log Level: DEBUG 📊"
echo "  • Frontend: http://localhost:3000 (별도 실행 필요)"
echo ""
echo "🔧 유용한 명령어들:"
echo "  • 프론트엔드 시작: ./scripts/dev-frontend.sh"
echo "  • 데이터베이스 시작: ./scripts/dev-database.sh"
echo "  • 로그 모니터링: ./scripts/logs.sh"
echo ""
echo "📋 API 엔드포인트들:"
echo "  • Health Check: http://localhost:8000/health"
echo "  • API Docs: http://localhost:8000/docs"
echo "  • Admin Stats: http://localhost:8000/api/admin/stats"
echo ""
echo "종료하려면 Ctrl+C를 누르세요."
echo ""

# 개발 모드로 서버 시작 (Hot Reload 활성화)
uv run mcp-orch serve --reload --log-level DEBUG
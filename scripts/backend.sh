#!/bin/bash

# MCP Orchestrator Backend Script
# 백엔드를 Python 직접 실행 또는 Docker 방식으로 시작합니다

set -e

echo "⚡ MCP Orchestrator Backend"
echo "=========================="

# 색상 정의
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
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

log_docker() {
    echo -e "${CYAN}🐳 $1${NC}"
}

show_help() {
    echo ""
    echo "사용법:"
    echo "  $0                # Python 직접 실행 (기본값, 권장)"
    echo "  $0 --docker       # Docker 방식 (환경 격리)"
    echo "  $0 --help         # 도움말 표시"
    echo ""
    echo "실행 방식 비교:"
    echo "  ┌─────────────────┬─────────────────┬─────────────────┐"
    echo "  │     방식        │      장점       │      단점       │"
    echo "  ├─────────────────┼─────────────────┼─────────────────┤"
    echo "  │ Python 직접     │ • 빠른 시작     │ • 로컬 환경 의존│"
    echo "  │ 실행 (권장)     │ • 호스트 MCP    │ • 개발 도구 필요│"
    echo "  │                 │   서버 접근     │                 │"
    echo "  │                 │ • 디버깅 쉬움   │                 │"
    echo "  ├─────────────────┼─────────────────┼─────────────────┤"
    echo "  │ Docker 방식     │ • 환경 일관성   │ • Docker in     │"
    echo "  │                 │ • 도구 사전설치 │   Docker 제약   │"
    echo "  │                 │ • 격리된 환경   │ • 네트워크 복잡 │"
    echo "  └─────────────────┴─────────────────┴─────────────────┘"
    echo ""
}

check_python_env() {
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
}

check_docker_env() {
    # Docker 확인
    if ! command -v docker &> /dev/null; then
        log_error "Docker가 설치되어 있지 않습니다."
        exit 1
    fi

    if ! docker compose version &> /dev/null 2>&1; then
        log_error "Docker Compose가 설치되어 있지 않습니다."
        exit 1
    fi
}

setup_env_file() {
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
}

check_database() {
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
        echo "  • 데이터베이스 시작: ./scripts/database.sh"
        echo ""
        log_info "그래도 개발 서버를 시작합니다..."
    else
        log_success "데이터베이스 연결 확인 완료"
    fi
}

start_python_backend() {
    log_info "🐍 Python 직접 실행 방식으로 백엔드를 시작합니다..."
    
    check_python_env
    setup_env_file

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

    check_database

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
    echo "  • 프론트엔드 시작: ./scripts/frontend.sh"
    echo "  • 데이터베이스 시작: ./scripts/database.sh"
    echo "  • 상태 확인: ./scripts/status.sh"
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
}

start_docker_backend() {
    log_docker "🐳 Docker 방식으로 백엔드를 시작합니다..."
    
    check_docker_env
    setup_env_file

    # Docker in Docker 제약사항 경고
    echo ""
    log_warning "Docker 방식 제약사항:"
    echo "  • MCP 서버들이 Docker 컨테이너 내부에서 실행되어야 함"
    echo "  • 호스트의 MCP 서버 접근이 제한됨"
    echo "  • 네트워크 설정이 복잡할 수 있음"
    echo "  • 개발 시에는 Python 직접 실행을 권장합니다"
    echo ""
    
    read -p "계속 진행하시겠습니까? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        log_info "Docker 방식을 취소했습니다."
        log_info "Python 방식으로 실행하려면: $0"
        exit 0
    fi

    # 백엔드 개발용 Docker 서비스 시작
    log_docker "백엔드 개발 컨테이너를 시작하는 중..."
    
    # 기존 백엔드 컨테이너가 실행 중인지 확인 (포트 충돌 방지)
    if docker ps --format "table {{.Names}}" | grep -q "mcp-orch-backend"; then
        log_warning "프로덕션 백엔드 컨테이너가 실행 중입니다. 중지합니다..."
        docker compose stop mcp-orch-backend
    fi
    
    # 로컬 Python 프로세스가 8000 포트를 사용 중인지 확인
    if lsof -i :8000 >/dev/null 2>&1; then
        log_warning "포트 8000이 사용 중입니다. 프로세스를 중지해주세요."
        lsof -i :8000
        echo ""
        read -p "계속 진행하시겠습니까? Docker는 8080 포트를 사용합니다. (y/N): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            log_info "Docker 백엔드 시작을 취소했습니다."
            exit 0
        fi
    fi

    # 개발용 백엔드 컨테이너 시작
    log_docker "개발용 백엔드 컨테이너를 시작합니다..."
    docker compose up -d --no-deps mcp-orch-backend-dev

    # 컨테이너 준비 대기
    log_info "개발용 백엔드 준비를 기다리는 중..."
    for i in {1..30}; do
        if curl -f http://localhost:8080/health >/dev/null 2>&1; then
            log_success "Docker 개발용 백엔드가 정상적으로 시작되었습니다! 🐳"
            break
        fi
        if [ $i -eq 30 ]; then
            log_error "백엔드 시작 시간이 초과되었습니다"
            log_info "컨테이너 로그를 확인하세요: docker logs mcp-orch-backend-dev"
            exit 1
        fi
        sleep 2
    done

    echo ""
    echo "🐳 Docker 백엔드 개발 정보:"
    echo "  • Backend API: http://localhost:8080 (Docker 포트)"
    echo "  • Hot Reload: 활성화 🔄"
    echo "  • Docker in Docker: 지원 ⚠️"
    echo "  • Source Mount: 실시간 반영"
    echo ""
    echo "🔧 유용한 명령어들:"
    echo "  • 컨테이너 로그: docker logs -f mcp-orch-backend-dev"
    echo "  • 컨테이너 접속: docker exec -it mcp-orch-backend-dev bash"
    echo "  • 컨테이너 중지: docker compose stop mcp-orch-backend-dev"
    echo "  • 프론트엔드 시작: ./scripts/frontend.sh"
    echo ""
    echo "⚠️  제약사항:"
    echo "  • MCP 서버는 컨테이너 내부에서만 접근 가능"
    echo "  • 호스트 MCP 서버 접근 제한"
    echo "  • 네트워크 설정 복잡"
    echo ""
    echo "✅ Docker 개발용 백엔드가 백그라운드에서 실행 중입니다."
}

# 메인 스크립트 로직
case "${1:-}" in
    --docker)
        start_docker_backend
        ;;
    --help|-h)
        show_help
        ;;
    "")
        start_python_backend
        ;;
    *)
        log_error "알 수 없는 옵션: $1"
        show_help
        exit 1
        ;;
esac
#!/bin/bash

# MCP Orchestrator Quick Start - Hybrid Deployment
# 원클릭으로 Hybrid 환경을 설정하고 실행합니다.
# Database: Docker, Backend: Native, Frontend: Docker

set -e

echo "🚀 MCP Orchestrator Quick Start - Hybrid Deployment"
echo "=================================================="

# 색상 정의
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 함수 정의
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

# 시스템 요구사항 확인
check_requirements() {
    log_info "시스템 요구사항 확인 중..."
    
    # Docker 확인
    if ! command -v docker &> /dev/null; then
        log_error "Docker가 설치되어 있지 않습니다. Docker를 먼저 설치해주세요."
        exit 1
    fi
    
    # Docker Compose 확인
    if ! docker compose version &> /dev/null 2>&1; then
        log_error "Docker Compose가 설치되어 있지 않습니다."
        exit 1
    fi
    
    # Python 확인
    if ! command -v python3 &> /dev/null; then
        log_error "Python 3.11+ 이 필요합니다."
        exit 1
    fi
    
    # uv 확인
    if ! command -v uv &> /dev/null; then
        log_warning "uv가 설치되어 있지 않습니다. 설치를 진행합니다..."
        curl -LsSf https://astral.sh/uv/install.sh | sh
        export PATH="$HOME/.cargo/bin:$PATH"
    fi
    
    log_success "시스템 요구사항 확인 완료"
}

# 환경 변수 설정
setup_environment() {
    log_info "환경 변수 설정 중..."
    
    if [ ! -f ".env" ]; then
        log_info ".env 파일 생성 중..."
        cp .env.hybrid.example .env
        log_success ".env 파일 생성 완료"
        log_warning "필요시 .env 파일을 편집하여 설정을 변경하세요"
    else
        log_success ".env 파일이 이미 존재합니다"
    fi
}

# PostgreSQL 시작
start_database() {
    log_info "PostgreSQL 데이터베이스 시작 중..."
    
    docker compose -f docker-compose.hybrid.yml up -d postgresql
    
    # 데이터베이스 준비 대기
    log_info "데이터베이스 준비 대기 중..."
    for i in {1..30}; do
        if docker exec mcp-orch-postgres pg_isready -U mcp_orch -d mcp_orch &> /dev/null; then
            log_success "PostgreSQL 데이터베이스 준비 완료"
            break
        fi
        if [ $i -eq 30 ]; then
            log_error "데이터베이스 시작 시간이 초과되었습니다"
            exit 1
        fi
        sleep 2
    done
}

# Frontend 시작 (선택사항)
start_frontend() {
    if [ "$1" = "--with-frontend" ] || [ "$1" = "-f" ]; then
        log_info "Frontend 컨테이너 시작 중..."
        docker compose -f docker-compose.hybrid.yml --profile frontend up -d
        log_success "Frontend 컨테이너 시작 완료"
        log_info "Frontend URL: http://localhost:3000"
    else
        log_warning "Frontend를 함께 시작하려면 --with-frontend 또는 -f 옵션을 사용하세요"
    fi
}

# Python 의존성 설치
install_dependencies() {
    log_info "Python 의존성 설치 중..."
    
    # 가상환경이 없으면 생성
    if [ ! -d ".venv" ]; then
        uv venv
    fi
    
    # 의존성 설치
    uv sync
    log_success "Python 의존성 설치 완료"
}

# 데이터베이스 마이그레이션
run_migrations() {
    log_info "데이터베이스 마이그레이션 실행 중..."
    
    # 현재 alembic_version 테이블 초기화 (만약 문제가 있다면)
    if ! uv run alembic current &> /dev/null; then
        log_warning "마이그레이션 상태를 확인할 수 없습니다. 초기화를 진행합니다..."
        # Docker에서 alembic_version 테이블 초기화
        docker exec mcp-orch-postgres psql -U mcp_orch -d mcp_orch -c "DELETE FROM alembic_version;" 2>/dev/null || true
    fi
    
    uv run alembic upgrade head
    log_success "데이터베이스 마이그레이션 완료"
}

# 백엔드 서버 시작 정보 출력
show_startup_info() {
    log_success "🎉 Hybrid 환경 설정 완료!"
    echo ""
    echo "다음 명령으로 백엔드 서버를 시작하세요:"
    echo -e "${YELLOW}uv run mcp-orch serve${NC}"
    echo ""
    echo "또는 개발 모드로 실행:"
    echo -e "${YELLOW}uv run mcp-orch serve --reload --log-level DEBUG${NC}"
    echo ""
    echo "🌐 서비스 접속 정보:"
    echo "  • Backend API: http://localhost:8000"
    if [ "$1" = "--with-frontend" ] || [ "$1" = "-f" ]; then
        echo "  • Frontend: http://localhost:3000"
    fi
    echo "  • PostgreSQL: localhost:5432"
    echo ""
    echo "🔧 유용한 명령어들:"
    echo "  • 도구 목록: uv run mcp-orch list-tools"
    echo "  • 서버 목록: uv run mcp-orch list-servers"
    echo "  • 서비스 중지: docker compose -f docker-compose.hybrid.yml down"
}

# 메인 실행
main() {
    check_requirements
    setup_environment
    start_database
    install_dependencies
    run_migrations
    start_frontend "$1"
    show_startup_info "$1"
}

# 스크립트 실행
main "$@"
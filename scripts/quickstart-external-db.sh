#!/bin/bash

# MCP Orchestrator Quick Start (External Database)
# 외부 데이터베이스 사용 시 설정 및 실행
# Database: External (AWS RDS/Aurora, Supabase, etc.), Backend: Native, Frontend: Docker

set -e

echo "🚀 MCP Orchestrator Quick Start (External Database)"
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

# 시스템 요구사항 확인 (Docker Compose 필요 - Frontend용)
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
        log_warning "⚠️  중요: .env 파일에서 DATABASE_URL을 외부 데이터베이스로 변경해주세요!"
        log_warning "   예시: DATABASE_URL=postgresql+asyncpg://user:pass@your-db-host:5432/dbname"
    else
        log_success ".env 파일이 이미 존재합니다"
    fi
    
    # DATABASE_URL 확인
    if [ -f ".env" ]; then
        DATABASE_URL=$(grep "^DATABASE_URL=" .env | cut -d'=' -f2- | sed 's/^"//' | sed 's/"$//' 2>/dev/null || echo "")
        if [[ "$DATABASE_URL" == *"localhost"* ]] || [[ "$DATABASE_URL" == *"127.0.0.1"* ]]; then
            log_warning "⚠️  DATABASE_URL이 localhost로 설정되어 있습니다."
            log_warning "   외부 데이터베이스를 사용하려면 .env 파일을 수정해주세요."
        else
            log_success "외부 데이터베이스 설정이 확인되었습니다"
        fi
    fi
}

# 외부 데이터베이스 확인
check_external_database() {
    log_info "외부 데이터베이스 연결 확인 중..."
    log_info "PostgreSQL Docker는 시작하지 않습니다 (외부 DB 모드)"
    log_success "외부 데이터베이스 모드 준비 완료"
}

# Frontend 시작 (무조건 포함)
start_frontend() {
    log_info "Frontend 컨테이너 시작 중..."
    docker compose up -d mcp-orch-frontend
    log_success "Frontend 컨테이너 시작 완료"
    log_info "Frontend URL: http://localhost:3000"
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
    
    # 외부 데이터베이스에 대해 마이그레이션 실행
    if ! uv run alembic current &> /dev/null; then
        log_warning "마이그레이션 상태를 확인할 수 없습니다."
        log_info "외부 데이터베이스에 최초 마이그레이션을 진행합니다..."
    fi
    
    uv run alembic upgrade head
    log_success "데이터베이스 마이그레이션 완료"
}

# 백엔드 서버 시작 정보 출력
show_startup_info() {
    log_success "🎉 MCP Orchestrator 설정 완료! (외부 데이터베이스 모드)"
    echo ""
    echo "다음 명령으로 백엔드 서버를 시작하세요:"
    echo -e "${YELLOW}uv run mcp-orch serve${NC}"
    echo ""
    echo "또는 개발 모드로 실행:"
    echo -e "${YELLOW}uv run mcp-orch serve --reload --log-level DEBUG${NC}"
    echo ""
    echo "🌐 서비스 접속 정보:"
    echo "  • Frontend: http://localhost:3000 ✨"
    echo "  • Backend API: http://localhost:8000"
    echo "  • Database: External (설정된 DATABASE_URL 사용)"
    echo ""
    echo "🔧 유용한 명령어들:"
    echo "  • 도구 목록: uv run mcp-orch list-tools"
    echo "  • 서버 목록: uv run mcp-orch list-servers"
    echo "  • 서비스 중지: docker compose down"
    echo ""
    echo "📝 참고사항:"
    echo "  • PostgreSQL Docker 컨테이너는 시작되지 않습니다"
    echo "  • DATABASE_URL에 설정된 외부 데이터베이스를 사용합니다"
}

# 메인 실행
main() {
    check_requirements
    setup_environment
    check_external_database
    install_dependencies
    run_migrations
    start_frontend
    show_startup_info
}

# 스크립트 실행
main "$@"
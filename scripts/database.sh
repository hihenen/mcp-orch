#!/bin/bash

# MCP Orchestrator Database Script
# PostgreSQL 데이터베이스를 시작하고 관리합니다

set -e

echo "🐘 MCP Orchestrator Database"
echo "==========================="

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
    echo "  $0                # PostgreSQL 시작 (기본값)"
    echo "  $0 --migrate      # 데이터베이스 마이그레이션 실행"
    echo "  $0 --reset        # 데이터베이스 초기화 (주의!)"
    echo "  $0 --psql         # PostgreSQL 콘솔 접속"
    echo "  $0 --logs         # PostgreSQL 로그 확인"
    echo "  $0 --stop         # PostgreSQL 중지"
    echo "  $0 --help         # 도움말 표시"
    echo ""
    echo "데이터베이스 관리:"
    echo "  • 자동 헬스 체크와 재시작 기능 포함"
    echo "  • 마이그레이션 안전성 검증"
    echo "  • 개발/프로덕션 환경 구분"
    echo ""
}

check_docker_env() {
    # 프로젝트 루트 확인
    if [ ! -f "docker-compose.yml" ]; then
        log_error "MCP Orchestrator 프로젝트 루트에서 실행해주세요"
        exit 1
    fi

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
            log_warning "기본 환경 변수로 진행합니다."
        fi
    fi
}

check_database_status() {
    if docker ps --format "table {{.Names}}" | grep -q "mcp-orch-postgres"; then
        # 연결 테스트
        if docker exec mcp-orch-postgres pg_isready -U mcp_orch -d mcp_orch &> /dev/null; then
            return 0  # 정상 실행 중
        else
            return 1  # 실행 중이지만 응답 안함
        fi
    else
        return 2  # 실행 안됨
    fi
}

show_database_info() {
    echo ""
    echo "🐘 데이터베이스 정보:"
    echo "  • Host: localhost"
    echo "  • Port: 5432"
    echo "  • Database: mcp_orch"
    echo "  • User: mcp_orch"
    echo "  • Container: mcp-orch-postgres"
    echo ""
    echo "🔧 유용한 명령어들:"
    echo "  • 백엔드 시작: ./scripts/backend.sh"
    echo "  • 프론트엔드 시작: ./scripts/frontend.sh"
    echo "  • 상태 확인: ./scripts/status.sh"
    echo "  • 마이그레이션: ./scripts/database.sh --migrate"
    echo "  • SQL 콘솔: ./scripts/database.sh --psql"
    echo "  • 로그 확인: ./scripts/database.sh --logs"
    echo "  • 중지: ./scripts/database.sh --stop"
    echo ""
}

start_database() {
    log_docker "🐘 PostgreSQL 데이터베이스를 시작합니다..."
    
    check_docker_env
    setup_env_file

    # 데이터베이스 상태 확인
    check_database_status
    status=$?

    if [ $status -eq 0 ]; then
        log_success "PostgreSQL이 이미 정상적으로 실행 중입니다"
        show_database_info
        echo "✅ PostgreSQL이 이미 실행 중입니다."
        return 0
    elif [ $status -eq 1 ]; then
        log_warning "PostgreSQL이 실행 중이지만 응답하지 않습니다. 재시작합니다..."
        docker compose restart postgresql
    else
        log_info "PostgreSQL 컨테이너를 시작하는 중..."
        docker compose up -d postgresql
    fi

    # PostgreSQL 준비 대기
    log_info "PostgreSQL 준비를 기다리는 중..."
    for i in {1..30}; do
        if docker exec mcp-orch-postgres pg_isready -U mcp_orch -d mcp_orch &> /dev/null; then
            log_success "PostgreSQL이 정상적으로 시작되었습니다! 🐘"
            break
        fi
        if [ $i -eq 30 ]; then
            log_error "PostgreSQL 시작 시간이 초과되었습니다"
            log_info "컨테이너 로그를 확인하세요: ./scripts/database.sh --logs"
            exit 1
        fi
        sleep 2
    done

    show_database_info
    echo "✅ PostgreSQL이 백그라운드에서 실행 중입니다."
}

run_migration() {
    log_info "🔄 데이터베이스 마이그레이션을 실행합니다..."
    
    # PostgreSQL 상태 확인
    check_database_status
    if [ $? -ne 0 ]; then
        log_error "PostgreSQL이 실행되지 않았습니다."
        log_info "먼저 데이터베이스를 시작하세요: ./scripts/database.sh"
        exit 1
    fi

    # Python 환경 확인
    if ! command -v uv &> /dev/null; then
        log_error "uv가 설치되어 있지 않습니다."
        log_info "설치 방법: curl -LsSf https://astral.sh/uv/install.sh | sh"
        exit 1
    fi

    # 마이그레이션 실행
    log_info "Alembic 마이그레이션을 실행하는 중..."
    if uv run alembic upgrade head; then
        log_success "마이그레이션이 성공적으로 완료되었습니다!"
    else
        log_error "마이그레이션 실행 중 오류가 발생했습니다."
        log_info "문제 해결 방법:"
        echo "  1. 데이터베이스 연결 확인: ./scripts/database.sh --psql"
        echo "  2. 마이그레이션 히스토리 확인: uv run alembic history"
        echo "  3. 현재 버전 확인: uv run alembic current"
        exit 1
    fi
}

reset_database() {
    log_warning "⚠️  데이터베이스를 완전히 초기화합니다!"
    echo "이 작업은 모든 데이터를 삭제하고 데이터베이스를 재생성합니다."
    echo ""
    
    read -p "정말로 계속하시겠습니까? 'RESET'을 입력하세요: " -r
    if [ "$REPLY" != "RESET" ]; then
        log_info "데이터베이스 초기화를 취소했습니다."
        exit 0
    fi

    log_warning "데이터베이스를 초기화하는 중..."

    # PostgreSQL 컨테이너 중지 및 삭제
    log_info "PostgreSQL 컨테이너를 중지하고 데이터를 삭제하는 중..."
    docker compose down postgresql
    docker volume rm mcp-orch_postgresql_data 2>/dev/null || true

    # PostgreSQL 재시작
    log_info "PostgreSQL을 새로 시작하는 중..."
    docker compose up -d postgresql

    # 준비 대기
    log_info "PostgreSQL 준비를 기다리는 중..."
    for i in {1..30}; do
        if docker exec mcp-orch-postgres pg_isready -U mcp_orch -d mcp_orch &> /dev/null; then
            log_success "PostgreSQL이 새로 시작되었습니다!"
            break
        fi
        if [ $i -eq 30 ]; then
            log_error "PostgreSQL 시작 시간이 초과되었습니다"
            exit 1
        fi
        sleep 2
    done

    # 마이그레이션 자동 실행
    log_info "초기 마이그레이션을 실행하는 중..."
    if uv run alembic upgrade head; then
        log_success "데이터베이스 초기화 및 마이그레이션이 완료되었습니다!"
    else
        log_error "마이그레이션 실행 중 오류가 발생했습니다."
        exit 1
    fi

    show_database_info
    echo "✅ 데이터베이스가 성공적으로 초기화되었습니다."
}

connect_psql() {
    log_info "🔗 PostgreSQL 콘솔에 접속합니다..."
    
    # PostgreSQL 상태 확인
    check_database_status
    if [ $? -ne 0 ]; then
        log_error "PostgreSQL이 실행되지 않았습니다."
        log_info "먼저 데이터베이스를 시작하세요: ./scripts/database.sh"
        exit 1
    fi

    echo "PostgreSQL 콘솔에 접속합니다..."
    echo "종료하려면 \\q를 입력하세요."
    echo ""
    docker exec -it mcp-orch-postgres psql -U mcp_orch -d mcp_orch
}

show_logs() {
    log_info "📋 PostgreSQL 로그를 확인합니다..."
    
    if ! docker ps --format "table {{.Names}}" | grep -q "mcp-orch-postgres"; then
        log_error "PostgreSQL 컨테이너가 실행되지 않았습니다."
        exit 1
    fi

    echo "PostgreSQL 로그 (실시간):"
    echo "종료하려면 Ctrl+C를 누르세요."
    echo ""
    docker logs -f mcp-orch-postgres
}

stop_database() {
    log_info "🛑 PostgreSQL을 중지합니다..."
    
    if ! docker ps --format "table {{.Names}}" | grep -q "mcp-orch-postgres"; then
        log_warning "PostgreSQL이 실행되지 않았습니다."
        exit 0
    fi

    docker compose stop postgresql
    log_success "PostgreSQL이 성공적으로 중지되었습니다."
}

# 메인 스크립트 로직
case "${1:-}" in
    --migrate)
        run_migration
        ;;
    --reset)
        reset_database
        ;;
    --psql)
        connect_psql
        ;;
    --logs)
        show_logs
        ;;
    --stop)
        stop_database
        ;;
    --help|-h)
        show_help
        ;;
    "")
        start_database
        ;;
    *)
        log_error "알 수 없는 옵션: $1"
        show_help
        exit 1
        ;;
esac
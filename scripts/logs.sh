#!/bin/bash

# MCP Orchestrator Log Monitoring Script
# 모든 서비스의 로그를 통합 모니터링합니다

set -e

echo "📊 MCP Orchestrator Log Monitor"
echo "==============================="

# 색상 정의
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
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

# 프로젝트 루트 확인
if [ ! -f "pyproject.toml" ] || ! grep -q "mcp-orch" pyproject.toml 2>/dev/null; then
    log_error "MCP Orchestrator 프로젝트 루트에서 실행해주세요"
    exit 1
fi

# 도움말 표시
show_help() {
    echo "사용법: $0 [옵션]"
    echo ""
    echo "옵션:"
    echo "  backend         백엔드 로그만 표시"
    echo "  frontend        프론트엔드 로그만 표시 (Docker)"
    echo "  database        데이터베이스 로그만 표시"
    echo "  all             모든 Docker 서비스 로그 표시"
    echo "  live            실시간 통합 로그 (기본값)"
    echo "  help            이 도움말 표시"
    echo ""
    echo "예시:"
    echo "  $0              # 실시간 통합 로그"
    echo "  $0 backend      # 백엔드 로그만"
    echo "  $0 database     # PostgreSQL 로그만"
    echo ""
}

# 백엔드 로그 모니터링
monitor_backend() {
    log_info "백엔드 로그를 모니터링합니다..."
    
    # 오늘 날짜의 로그 파일 찾기
    local log_file="logs/mcp-orch-$(date +%Y%m%d).log"
    
    if [ -f "$log_file" ]; then
        log_success "백엔드 로그 파일을 찾았습니다: $log_file"
        echo "종료하려면 Ctrl+C를 누르세요."
        echo ""
        tail -f "$log_file"
    else
        log_warning "백엔드 로그 파일을 찾을 수 없습니다: $log_file"
        
        # 가장 최근 로그 파일 찾기
        local latest_log=$(find logs -name "mcp-orch-*.log" 2>/dev/null | sort | tail -1)
        if [ -n "$latest_log" ]; then
            log_info "가장 최근 로그 파일을 사용합니다: $latest_log"
            echo "종료하려면 Ctrl+C를 누르세요."
            echo ""
            tail -f "$latest_log"
        else
            log_error "로그 파일을 찾을 수 없습니다."
            log_info "백엔드가 실행 중인지 확인하세요:"
            echo "  • 개발 모드: ./scripts/dev-backend.sh"
            echo "  • 프로덕션: uv run mcp-orch serve"
            exit 1
        fi
    fi
}

# 프론트엔드 로그 모니터링 (Docker)
monitor_frontend() {
    log_info "프론트엔드 Docker 로그를 모니터링합니다..."
    
    if docker ps --format "table {{.Names}}" | grep -q "mcp-orch-frontend"; then
        log_success "프론트엔드 컨테이너를 찾았습니다"
        echo "종료하려면 Ctrl+C를 누르세요."
        echo ""
        docker logs -f mcp-orch-frontend
    else
        log_error "프론트엔드 컨테이너가 실행 중이 아닙니다."
        log_info "프론트엔드를 시작하세요:"
        echo "  • Docker: docker compose up -d mcp-orch-frontend"
        echo "  • 개발 모드: ./scripts/dev-frontend.sh"
        exit 1
    fi
}

# 데이터베이스 로그 모니터링
monitor_database() {
    log_info "PostgreSQL 로그를 모니터링합니다..."
    
    if docker ps --format "table {{.Names}}" | grep -q "mcp-orch-postgres"; then
        log_success "PostgreSQL 컨테이너를 찾았습니다"
        echo "종료하려면 Ctrl+C를 누르세요."
        echo ""
        docker logs -f mcp-orch-postgres
    else
        log_error "PostgreSQL 컨테이너가 실행 중이 아닙니다."
        log_info "데이터베이스를 시작하세요:"
        echo "  • ./scripts/dev-database.sh"
        echo "  • docker compose up -d postgresql"
        exit 1
    fi
}

# 모든 Docker 서비스 로그
monitor_all_docker() {
    log_info "모든 Docker 서비스 로그를 모니터링합니다..."
    
    local running_services=$(docker compose ps --services --filter "status=running")
    if [ -z "$running_services" ]; then
        log_error "실행 중인 Docker 서비스가 없습니다."
        log_info "서비스를 시작하세요:"
        echo "  • 전체: ./scripts/quickstart.sh"
        echo "  • 데이터베이스만: ./scripts/dev-database.sh"
        exit 1
    fi
    
    log_success "실행 중인 서비스: $running_services"
    echo "종료하려면 Ctrl+C를 누르세요."
    echo ""
    docker compose logs -f
}

# 실시간 통합 로그 (기본값)
monitor_live() {
    log_info "실시간 통합 로그를 모니터링합니다..."
    echo ""
    
    # 백그라운드에서 각 로그를 다른 색상으로 표시
    (
        # 백엔드 로그
        local log_file="logs/mcp-orch-$(date +%Y%m%d).log"
        if [ -f "$log_file" ]; then
            tail -f "$log_file" 2>/dev/null | while IFS= read -r line; do
                echo -e "${CYAN}[BACKEND]${NC} $line"
            done
        fi
    ) &
    local backend_pid=$!
    
    (
        # 프론트엔드 로그 (Docker)
        if docker ps --format "table {{.Names}}" | grep -q "mcp-orch-frontend"; then
            docker logs -f mcp-orch-frontend 2>/dev/null | while IFS= read -r line; do
                echo -e "${GREEN}[FRONTEND]${NC} $line"
            done
        fi
    ) &
    local frontend_pid=$!
    
    (
        # 데이터베이스 로그
        if docker ps --format "table {{.Names}}" | grep -q "mcp-orch-postgres"; then
            docker logs -f mcp-orch-postgres 2>/dev/null | while IFS= read -r line; do
                echo -e "${PURPLE}[DATABASE]${NC} $line"
            done
        fi
    ) &
    local database_pid=$!
    
    echo -e "${BLUE}📊 통합 로그 모니터링 시작${NC}"
    echo -e "${CYAN}[BACKEND]${NC} - 백엔드 서비스 로그"
    echo -e "${GREEN}[FRONTEND]${NC} - 프론트엔드 Docker 로그"
    echo -e "${PURPLE}[DATABASE]${NC} - PostgreSQL 로그"
    echo ""
    echo "종료하려면 Ctrl+C를 누르세요."
    echo ""
    
    # Ctrl+C 처리
    trap "echo ''; log_info '로그 모니터링을 종료합니다...'; kill $backend_pid $frontend_pid $database_pid 2>/dev/null; exit 0" INT
    
    # 대기
    wait
}

# 메인 실행
case "${1:-live}" in
    "backend")
        monitor_backend
        ;;
    "frontend")
        monitor_frontend
        ;;
    "database")
        monitor_database
        ;;
    "all")
        monitor_all_docker
        ;;
    "live")
        monitor_live
        ;;
    "help"|"-h"|"--help")
        show_help
        ;;
    *)
        log_error "알 수 없는 옵션: $1"
        echo ""
        show_help
        exit 1
        ;;
esac
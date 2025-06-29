#!/bin/bash

# MCP Orchestrator Database Migration Script
# git pull 후 데이터베이스 마이그레이션과 서비스 재시작을 위한 스크립트

set -e

echo "🔄 MCP Orchestrator Database Migration"
echo "======================================"

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

# 프로젝트 디렉토리 확인
check_directory() {
    if [ ! -f "pyproject.toml" ] || [ ! -f "alembic.ini" ]; then
        log_error "mcp-orch 프로젝트 디렉토리에서 실행해주세요"
        echo "현재 위치: $(pwd)"
        echo "올바른 위치: /path/to/mcp-orch"
        exit 1
    fi
    log_success "프로젝트 디렉토리 확인 완료"
}

# uv 설치 확인
check_uv() {
    if ! command -v uv &> /dev/null; then
        log_error "uv가 설치되어 있지 않습니다"
        echo "설치 방법: curl -LsSf https://astral.sh/uv/install.sh | sh"
        exit 1
    fi
    log_success "uv 확인 완료"
}

# 데이터베이스 연결 확인
check_database() {
    log_info "데이터베이스 연결 확인 중..."
    
    # PostgreSQL 컨테이너 확인
    if docker ps | grep -q "mcp-orch-postgres"; then
        log_success "PostgreSQL 컨테이너 실행 중"
    else
        log_warning "PostgreSQL 컨테이너가 실행되지 않았습니다"
        read -p "데이터베이스를 시작하시겠습니까? (y/N): " -n 1 -r
        echo ""
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            log_info "PostgreSQL 시작 중..."
            docker compose up -d postgresql
            
            # 데이터베이스 준비 대기
            for i in {1..30}; do
                if docker exec mcp-orch-postgres pg_isready -U mcp_orch -d mcp_orch &> /dev/null; then
                    log_success "PostgreSQL 준비 완료"
                    break
                fi
                if [ $i -eq 30 ]; then
                    log_error "데이터베이스 시작 시간이 초과되었습니다"
                    exit 1
                fi
                sleep 2
            done
        else
            log_error "데이터베이스가 필요합니다. 스크립트를 종료합니다."
            exit 1
        fi
    fi
}

# 마이그레이션 상태 확인
check_migration_status() {
    log_info "현재 마이그레이션 상태 확인 중..."
    
    if uv run alembic current &> /dev/null; then
        current_revision=$(uv run alembic current 2>/dev/null | grep -o '[a-f0-9]\{12\}' | head -1)
        if [ -n "$current_revision" ]; then
            log_info "현재 마이그레이션 버전: $current_revision"
        else
            log_info "현재 마이그레이션: 최신 상태 또는 초기 상태"
        fi
    else
        log_warning "마이그레이션 상태를 확인할 수 없습니다"
    fi
}

# 마이그레이션 실행
run_migration() {
    log_info "데이터베이스 마이그레이션 실행 중..."
    
    # 의존성 확인 및 설치
    if [ ! -d ".venv" ]; then
        log_info "가상환경 생성 중..."
        uv venv
    fi
    
    log_info "의존성 동기화 중..."
    uv sync
    
    # 마이그레이션 실행
    if uv run alembic upgrade head; then
        log_success "데이터베이스 마이그레이션 완료"
    else
        log_error "마이그레이션 실패"
        echo ""
        echo "🔧 해결 방법:"
        echo "1. 데이터베이스 연결 상태 확인"
        echo "2. 마이그레이션 파일 충돌 확인"
        echo "3. 로그를 확인하여 구체적인 오류 파악"
        exit 1
    fi
}

# 백엔드 재시작
restart_backend() {
    log_info "백엔드 서버 재시작 중..."
    
    # 기존 프로세스 종료
    if pgrep -f "mcp-orch serve" > /dev/null || pgrep -f "uvicorn.*mcp_orch" > /dev/null; then
        log_info "기존 백엔드 프로세스 종료 중..."
        pkill -f "mcp-orch serve" 2>/dev/null || true
        pkill -f "uvicorn.*mcp_orch" 2>/dev/null || true
        sleep 3
        
        # 강제 종료가 필요한지 확인
        if pgrep -f "mcp-orch serve" > /dev/null || pgrep -f "uvicorn.*mcp_orch" > /dev/null; then
            log_warning "강제 종료 실행 중..."
            pkill -9 -f "mcp-orch serve" 2>/dev/null || true
            pkill -9 -f "uvicorn.*mcp_orch" 2>/dev/null || true
            sleep 2
        fi
    fi
    
    # 로그 디렉토리 생성
    if [ ! -d "logs" ]; then
        mkdir -p logs
    fi
    
    # 백엔드 시작
    local log_file="logs/mcp-orch-$(date +%Y%m%d).log"
    log_info "백엔드 시작 중... (로그: $log_file)"
    
    nohup uv run mcp-orch serve > "$log_file" 2>&1 &
    local backend_pid=$!
    
    # 시작 확인
    sleep 5
    
    if kill -0 $backend_pid 2>/dev/null; then
        log_success "백엔드 서버 시작 완료 (PID: $backend_pid)"
        
        # 헬스 체크
        log_info "서버 헬스 체크 중..."
        local max_attempts=10
        local attempt=1
        
        while [ $attempt -le $max_attempts ]; do
            if curl -s http://localhost:8000/health > /dev/null 2>&1; then
                log_success "백엔드 서버 정상 작동 중"
                echo ""
                echo "🌐 서비스 URL:"
                echo "  • Backend API: http://localhost:8000"
                echo "  • Frontend: http://localhost:3000"
                echo "  • 로그 확인: tail -f $log_file"
                return 0
            fi
            
            if [ $attempt -eq $max_attempts ]; then
                log_warning "헬스 체크 실패 - 로그를 확인해주세요"
                echo "로그 확인: tail -f $log_file"
                return 1
            fi
            
            log_info "헬스 체크 시도 $attempt/$max_attempts..."
            sleep 3
            attempt=$((attempt + 1))
        done
    else
        log_error "백엔드 서버 시작 실패"
        echo "로그 확인: cat $log_file"
        return 1
    fi
}

# 최종 상태 확인
show_status() {
    echo ""
    echo "🎉 마이그레이션 및 재시작 완료!"
    echo "=================================="
    echo ""
    
    # 프로세스 상태
    echo "📊 프로세스 상태:"
    if pgrep -f "mcp-orch serve" > /dev/null; then
        echo "  ✅ Backend: 실행 중"
    else
        echo "  ❌ Backend: 중지됨"
    fi
    
    if docker ps | grep -q "mcp-orch-postgres"; then
        echo "  ✅ Database: 실행 중"
    else
        echo "  ❌ Database: 중지됨"
    fi
    
    echo ""
    echo "🔧 유용한 명령어:"
    echo "  • 로그 확인: tail -f logs/mcp-orch-$(date +%Y%m%d).log"
    echo "  • 헬스 체크: curl http://localhost:8000/health"
    echo "  • 백엔드 재시작: ./scripts/restart-backend.sh"
    echo "  • 전체 종료: ./scripts/shutdown.sh"
}

# 메인 실행
main() {
    echo "🚀 MCP Orchestrator 마이그레이션 시작"
    echo ""
    
    echo "단계 1/6: 환경 확인"
    check_directory
    check_uv
    echo ""
    
    echo "단계 2/6: 데이터베이스 확인"
    check_database
    echo ""
    
    echo "단계 3/6: 마이그레이션 상태 확인"
    check_migration_status
    echo ""
    
    echo "단계 4/6: 마이그레이션 실행"
    run_migration
    echo ""
    
    echo "단계 5/6: 백엔드 재시작"
    if restart_backend; then
        echo ""
        echo "단계 6/6: 상태 확인"
        show_status
    else
        log_error "백엔드 재시작에 실패했습니다"
        echo ""
        echo "수동 재시작 방법:"
        echo "  uv run mcp-orch serve"
    fi
}

# 도움말
show_help() {
    echo "MCP Orchestrator Database Migration Script"
    echo ""
    echo "사용법:"
    echo "  ./scripts/migrate.sh         # 마이그레이션 + 백엔드 재시작"
    echo "  ./scripts/migrate.sh --help  # 도움말 표시"
    echo ""
    echo "기능:"
    echo "  • 데이터베이스 연결 확인"
    echo "  • Alembic 마이그레이션 실행"
    echo "  • 백엔드 서버 안전 재시작"
    echo "  • 서비스 상태 확인"
    echo ""
    echo "git pull 후 이 스크립트를 실행하여 변경사항을 적용하세요."
}

# 명령줄 인수 처리
case "${1:-}" in
    --help|-h)
        show_help
        exit 0
        ;;
    *)
        main "$@"
        ;;
esac
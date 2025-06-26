#!/bin/bash

# MCP Orchestrator Backend Restart Script
# 백엔드 서비스만 안전하게 재시작합니다.
# 프론트엔드와 데이터베이스는 그대로 유지됩니다.

set -e

echo "🔄 MCP Orchestrator Backend Restart"
echo "==================================="

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

# 백엔드 프로세스 종료
stop_backend_processes() {
    log_info "백엔드 프로세스 확인 중..."
    
    # uv run mcp-orch serve 프로세스 찾기
    local pids=$(pgrep -f "mcp-orch serve" 2>/dev/null || true)
    if [ -n "$pids" ]; then
        log_info "백엔드 서버 프로세스 종료 중... (PIDs: $pids)"
        echo "$pids" | xargs kill -TERM 2>/dev/null || true
        sleep 3
        
        # 여전히 실행 중이면 강제 종료
        local remaining_pids=$(pgrep -f "mcp-orch serve" 2>/dev/null || true)
        if [ -n "$remaining_pids" ]; then
            log_warning "프로세스가 여전히 실행 중입니다. 강제 종료합니다..."
            echo "$remaining_pids" | xargs kill -KILL 2>/dev/null || true
            sleep 1
        fi
        log_success "백엔드 프로세스 종료 완료"
    else
        log_info "실행 중인 백엔드 프로세스가 없습니다"
    fi
    
    # FastAPI/Uvicorn 프로세스 확인
    local uvicorn_pids=$(pgrep -f "uvicorn.*mcp_orch" 2>/dev/null || true)
    if [ -n "$uvicorn_pids" ]; then
        log_info "Uvicorn 프로세스 종료 중... (PIDs: $uvicorn_pids)"
        echo "$uvicorn_pids" | xargs kill -TERM 2>/dev/null || true
        sleep 2
        
        local remaining_uvicorn=$(pgrep -f "uvicorn.*mcp_orch" 2>/dev/null || true)
        if [ -n "$remaining_uvicorn" ]; then
            echo "$remaining_uvicorn" | xargs kill -KILL 2>/dev/null || true
        fi
        log_success "Uvicorn 프로세스 종료 완료"
    fi
}

# Git 업데이트
update_code() {
    log_info "코드 업데이트 확인 중..."
    
    # Git 저장소인지 확인
    if [ ! -d ".git" ]; then
        log_warning "Git 저장소가 아닙니다. 코드 업데이트를 건너뜁니다."
        return
    fi
    
    # 현재 브랜치 확인
    local current_branch=$(git branch --show-current 2>/dev/null || echo "main")
    log_info "현재 브랜치: $current_branch"
    
    # 원격 저장소에서 최신 변경사항 가져오기
    if git fetch origin &>/dev/null; then
        local local_commit=$(git rev-parse HEAD 2>/dev/null || echo "")
        local remote_commit=$(git rev-parse origin/$current_branch 2>/dev/null || echo "")
        
        if [ "$local_commit" != "$remote_commit" ]; then
            log_info "새로운 업데이트가 있습니다. 코드를 업데이트합니다..."
            git pull origin $current_branch
            log_success "코드 업데이트 완료"
        else
            log_info "최신 버전입니다. 업데이트가 필요하지 않습니다."
        fi
    else
        log_warning "원격 저장소에서 가져오기에 실패했습니다. 로컬 코드로 진행합니다."
    fi
}

# 로그 디렉토리 생성
create_logs_directory() {
    if [ ! -d "logs" ]; then
        log_info "로그 디렉토리를 생성합니다..."
        mkdir -p logs
        log_success "로그 디렉토리 생성 완료"
    fi
}

# 백엔드 시작
start_backend() {
    log_info "백엔드 서버 시작 중..."
    
    # 환경 설정 확인
    if [ ! -f ".env" ]; then
        log_warning ".env 파일이 없습니다. 기본 설정으로 진행합니다."
    fi
    
    # 로그 파일명 생성
    local log_file="logs/mcp-orch-$(date +%Y%m%d).log"
    
    # 백엔드 시작
    log_info "백엔드를 백그라운드에서 시작합니다..."
    log_info "로그 파일: $log_file"
    
    nohup uv run mcp-orch serve > "$log_file" 2>&1 &
    local backend_pid=$!
    
    # 시작 확인
    sleep 2
    if kill -0 $backend_pid 2>/dev/null; then
        log_success "백엔드 서버가 성공적으로 시작되었습니다 (PID: $backend_pid)"
        log_info "로그 확인: tail -f $log_file"
    else
        log_error "백엔드 서버 시작에 실패했습니다"
        log_error "로그를 확인하세요: cat $log_file"
        exit 1
    fi
}

# 헬스 체크
health_check() {
    log_info "서버 헬스 체크 중..."
    
    local max_attempts=10
    local attempt=1
    
    while [ $attempt -le $max_attempts ]; do
        if curl -s http://localhost:8000/health &>/dev/null; then
            log_success "백엔드 서버가 정상적으로 응답합니다"
            return 0
        fi
        
        log_info "헬스 체크 시도 $attempt/$max_attempts..."
        sleep 2
        attempt=$((attempt + 1))
    done
    
    log_warning "헬스 체크에 실패했습니다. 서버가 완전히 시작되지 않았을 수 있습니다."
    log_info "로그를 확인하세요: tail -f logs/mcp-orch-$(date +%Y%m%d).log"
    return 1
}

# 메인 실행
main() {
    # 현재 디렉토리가 mcp-orch 프로젝트 루트인지 확인
    if [ ! -f "pyproject.toml" ] || ! grep -q "mcp-orch" pyproject.toml 2>/dev/null; then
        log_error "MCP Orchestrator 프로젝트 루트 디렉토리에서 실행해주세요"
        exit 1
    fi
    
    echo "단계 1/5: 백엔드 프로세스 종료"
    stop_backend_processes
    echo
    
    echo "단계 2/5: 코드 업데이트"
    update_code
    echo
    
    echo "단계 3/5: 로그 디렉토리 준비"
    create_logs_directory
    echo
    
    echo "단계 4/5: 백엔드 서버 시작"
    start_backend
    echo
    
    echo "단계 5/5: 헬스 체크"
    health_check
    echo
    
    log_success "백엔드 재시작이 완료되었습니다! 🎉"
    echo
    echo "📋 다음 명령어로 서버 상태를 확인할 수 있습니다:"
    echo "  • 프로세스 확인: ps aux | grep 'mcp-orch serve'"
    echo "  • 로그 모니터링: tail -f logs/mcp-orch-$(date +%Y%m%d).log"
    echo "  • API 테스트: curl http://localhost:8000/health"
    echo "  • 웹 인터페이스: http://localhost:3000 (프론트엔드는 계속 실행 중)"
}

# 스크립트 실행
main "$@"
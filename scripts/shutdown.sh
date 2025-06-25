#!/bin/bash

# MCP Orchestrator Shutdown Script
# 모든 서비스를 안전하게 종료합니다.
# 로컬 개발용과 프로덕션용 모두 지원

set -e

echo "🛑 MCP Orchestrator Shutdown"
echo "=========================="

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

# Docker 컨테이너 종료
stop_docker_services() {
    log_info "Docker 컨테이너 종료 중..."
    
    # Docker Compose가 있는지 확인
    if [ -f "docker-compose.yml" ]; then
        if docker compose ps | grep -q "Up"; then
            log_info "Docker Compose 서비스 종료 중..."
            docker compose down
            log_success "Docker 컨테이너 종료 완료"
        else
            log_info "실행 중인 Docker 컨테이너가 없습니다"
        fi
    else
        log_warning "docker-compose.yml 파일을 찾을 수 없습니다"
    fi
    
    # 개별 MCP Orchestrator 컨테이너 확인 및 종료
    local containers=$(docker ps --filter "name=mcp-orch" --format "{{.Names}}" 2>/dev/null || true)
    if [ -n "$containers" ]; then
        log_info "MCP Orchestrator 관련 컨테이너 종료 중..."
        echo "$containers" | xargs docker stop 2>/dev/null || true
        echo "$containers" | xargs docker rm 2>/dev/null || true
        log_success "MCP Orchestrator 컨테이너 정리 완료"
    fi
}

# 백엔드 프로세스 종료
stop_backend_processes() {
    log_info "백엔드 프로세스 확인 중..."
    
    # uv run mcp-orch serve 프로세스 찾기
    local pids=$(pgrep -f "mcp-orch serve" 2>/dev/null || true)
    if [ -n "$pids" ]; then
        log_info "백엔드 서버 프로세스 종료 중... (PIDs: $pids)"
        echo "$pids" | xargs kill -TERM 2>/dev/null || true
        sleep 2
        
        # 여전히 실행 중이면 강제 종료
        local remaining_pids=$(pgrep -f "mcp-orch serve" 2>/dev/null || true)
        if [ -n "$remaining_pids" ]; then
            log_warning "프로세스가 여전히 실행 중입니다. 강제 종료합니다..."
            echo "$remaining_pids" | xargs kill -KILL 2>/dev/null || true
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

# 포트 사용 중인 프로세스 확인 및 종료
check_and_kill_ports() {
    log_info "주요 포트 사용 프로세스 확인 중..."
    
    local ports=("3000" "8000" "5432")
    
    for port in "${ports[@]}"; do
        local pid=$(lsof -ti:$port 2>/dev/null || true)
        if [ -n "$pid" ]; then
            local process_name=$(ps -p $pid -o comm= 2>/dev/null || echo "unknown")
            
            # PostgreSQL 컨테이너나 시스템 서비스는 건드리지 않음
            if [[ "$process_name" == *"postgres"* ]] && [[ "$port" == "5432" ]]; then
                log_info "포트 $port: PostgreSQL 서비스는 유지합니다"
                continue
            fi
            
            log_warning "포트 $port 사용 중인 프로세스 발견: $process_name (PID: $pid)"
            read -p "이 프로세스를 종료하시겠습니까? (y/N): " -r
            if [[ $REPLY =~ ^[Yy]$ ]]; then
                kill -TERM $pid 2>/dev/null || true
                sleep 1
                if kill -0 $pid 2>/dev/null; then
                    kill -KILL $pid 2>/dev/null || true
                fi
                log_success "포트 $port 프로세스 종료 완료"
            fi
        fi
    done
}

# 정리 및 상태 확인
cleanup_and_status() {
    log_info "정리 작업 및 상태 확인 중..."
    
    # Docker 볼륨 정리 여부 확인
    if docker volume ls | grep -q "mcp-orch"; then
        echo ""
        log_warning "Docker 볼륨이 남아있습니다:"
        docker volume ls | grep "mcp-orch" || true
        echo ""
        read -p "데이터베이스 볼륨을 삭제하시겠습니까? (데이터가 모두 삭제됩니다) (y/N): " -r
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            docker volume ls | grep "mcp-orch" | awk '{print $2}' | xargs docker volume rm 2>/dev/null || true
            log_success "Docker 볼륨 정리 완료"
        else
            log_info "볼륨은 유지됩니다"
        fi
    fi
    
    # 최종 상태 확인
    echo ""
    log_info "최종 상태 확인:"
    
    # Docker 상태
    local running_containers=$(docker ps --filter "name=mcp-orch" --format "{{.Names}}" 2>/dev/null || true)
    if [ -z "$running_containers" ]; then
        log_success "✓ Docker 컨테이너: 모두 종료됨"
    else
        log_warning "⚠ Docker 컨테이너: 일부 실행 중 ($running_containers)"
    fi
    
    # 백엔드 프로세스
    if ! pgrep -f "mcp-orch serve\|uvicorn.*mcp_orch" >/dev/null 2>&1; then
        log_success "✓ 백엔드 프로세스: 모두 종료됨"
    else
        log_warning "⚠ 백엔드 프로세스: 일부 실행 중"
    fi
    
    # 포트 상태
    local used_ports=""
    for port in 3000 8000; do
        if lsof -ti:$port >/dev/null 2>&1; then
            used_ports="$used_ports $port"
        fi
    done
    
    if [ -z "$used_ports" ]; then
        log_success "✓ 주요 포트: 모두 해제됨"
    else
        log_warning "⚠ 사용 중인 포트:$used_ports"
    fi
}

# 사용법 표시
show_usage() {
    echo "사용법: $0 [옵션]"
    echo ""
    echo "옵션:"
    echo "  --force, -f     확인 없이 모든 프로세스 강제 종료"
    echo "  --docker-only   Docker 컨테이너만 종료"
    echo "  --processes-only 백엔드 프로세스만 종료"
    echo "  --help, -h      이 도움말 표시"
    echo ""
    echo "예시:"
    echo "  $0              # 대화형 종료 (기본값)"
    echo "  $0 --force      # 강제 종료"
    echo "  $0 --docker-only # Docker만 종료"
}

# 메인 실행
main() {
    case "${1:-}" in
        --help|-h)
            show_usage
            exit 0
            ;;
        --force|-f)
            log_info "강제 종료 모드로 실행합니다"
            export FORCE_MODE=true
            ;;
        --docker-only)
            log_info "Docker 컨테이너만 종료합니다"
            stop_docker_services
            exit 0
            ;;
        --processes-only)
            log_info "백엔드 프로세스만 종료합니다"
            stop_backend_processes
            exit 0
            ;;
        "")
            # 기본 실행
            ;;
        *)
            log_error "알 수 없는 옵션: $1"
            show_usage
            exit 1
            ;;
    esac
    
    echo ""
    log_info "MCP Orchestrator 서비스를 종료합니다..."
    echo ""
    
    # 실행 순서
    stop_docker_services
    echo ""
    stop_backend_processes
    echo ""
    
    if [ "${FORCE_MODE:-}" != "true" ]; then
        check_and_kill_ports
        echo ""
    fi
    
    cleanup_and_status
    echo ""
    log_success "🎉 MCP Orchestrator 종료 완료!"
    echo ""
    log_info "다시 시작하려면 다음 명령을 사용하세요:"
    echo -e "${YELLOW}  로컬 개발용: ./scripts/quickstart.sh${NC}"
    echo -e "${YELLOW}  프로덕션용: docker compose up -d${NC}"
}

# 스크립트 실행
main "$@"
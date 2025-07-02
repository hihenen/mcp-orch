#!/bin/bash

# MCP Orchestrator Status Script
# 모든 서비스의 상태를 확인하고 통합 대시보드를 제공합니다

set -e

echo "📊 MCP Orchestrator Status Dashboard"
echo "===================================="

# 색상 정의
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
PURPLE='\033[0;35m'
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

log_system() {
    echo -e "${PURPLE}🔧 $1${NC}"
}

status_running() {
    echo -e "${GREEN}● RUNNING${NC}"
}

status_stopped() {
    echo -e "${RED}● STOPPED${NC}"
}

status_warning() {
    echo -e "${YELLOW}● WARNING${NC}"
}

show_help() {
    echo ""
    echo "사용법:"
    echo "  $0                # 전체 상태 확인 (기본값)"
    echo "  $0 --quick        # 빠른 상태 확인"
    echo "  $0 --detailed     # 상세 상태 정보"
    echo "  $0 --ports        # 포트 사용 현황"
    echo "  $0 --health       # 헬스 체크"
    echo "  $0 --help         # 도움말 표시"
    echo ""
    echo "상태 확인 범위:"
    echo "  • PostgreSQL 데이터베이스"
    echo "  • Backend API 서버"
    echo "  • Frontend 웹 서버"
    echo "  • Docker 컨테이너들"
    echo "  • 네트워크 연결 상태"
    echo ""
}

check_database_status() {
    echo -n "🐘 PostgreSQL Database: "
    
    if docker ps --format "table {{.Names}}" | grep -q "mcp-orch-postgres"; then
        if docker exec mcp-orch-postgres pg_isready -U mcp_orch -d mcp_orch &> /dev/null; then
            status_running
            DB_STATUS="running"
        else
            status_warning
            echo "   Container running but not responding"
            DB_STATUS="warning"
        fi
    else
        status_stopped
        DB_STATUS="stopped"
    fi
}

check_backend_status() {
    echo -n "⚡ Backend API: "
    
    # Docker 백엔드 확인
    if docker ps --format "table {{.Names}}" | grep -q "mcp-orch-backend"; then
        if curl -f http://localhost:8000/health >/dev/null 2>&1; then
            status_running
            echo "   (Docker mode)"
            BACKEND_STATUS="running_docker"
        else
            status_warning
            echo "   Docker container running but API not responding"
            BACKEND_STATUS="warning_docker"
        fi
    # 로컬 백엔드 확인
    elif lsof -i :8000 >/dev/null 2>&1; then
        if curl -f http://localhost:8000/health >/dev/null 2>&1; then
            status_running
            echo "   (Local Python mode)"
            BACKEND_STATUS="running_local"
        else
            status_warning
            echo "   Port 8000 occupied but API not responding"
            BACKEND_STATUS="warning_local"
        fi
    else
        status_stopped
        BACKEND_STATUS="stopped"
    fi
}

check_frontend_status() {
    echo -n "🌐 Frontend Web: "
    
    # Docker 프론트엔드 확인
    if docker ps --format "table {{.Names}}" | grep -q "mcp-orch-frontend"; then
        if curl -f http://localhost:3000 >/dev/null 2>&1; then
            status_running
            echo "   (Docker mode)"
            FRONTEND_STATUS="running_docker"
        else
            status_warning
            echo "   Docker container running but web not responding"
            FRONTEND_STATUS="warning_docker"
        fi
    # 로컬 프론트엔드 확인
    elif lsof -i :3000 >/dev/null 2>&1; then
        if curl -f http://localhost:3000 >/dev/null 2>&1; then
            status_running
            echo "   (Local Node.js mode)"
            FRONTEND_STATUS="running_local"
        else
            status_warning
            echo "   Port 3000 occupied but web not responding"
            FRONTEND_STATUS="warning_local"
        fi
    else
        status_stopped
        FRONTEND_STATUS="stopped"
    fi
}

check_docker_containers() {
    echo ""
    echo "🐳 Docker Containers:"
    echo "===================="
    
    if ! command -v docker &> /dev/null; then
        log_error "Docker is not installed"
        return
    fi

    # MCP Orchestrator 관련 컨테이너들
    containers=("mcp-orch-postgres" "mcp-orch-backend" "mcp-orch-frontend")
    
    for container in "${containers[@]}"; do
        echo -n "   $container: "
        if docker ps --format "table {{.Names}}" | grep -q "$container"; then
            status_running
            
            # 상세 정보 표시 (detailed 모드일 때)
            if [ "$1" = "--detailed" ]; then
                echo "     $(docker ps --format "table {{.Image}}\t{{.Status}}\t{{.Ports}}" | grep "$container" | head -1)"
            fi
        else
            if docker ps -a --format "table {{.Names}}" | grep -q "$container"; then
                status_stopped
                echo "     (Container exists but stopped)"
            else
                echo -e "${YELLOW}● NOT_FOUND${NC}"
                echo "     (Container not created)"
            fi
        fi
    done
}

check_network_connectivity() {
    echo ""
    echo "🌐 Network Connectivity:"
    echo "======================"
    
    # 포트 확인
    ports=(5432 8000 3000)
    port_names=("PostgreSQL" "Backend API" "Frontend Web")
    
    for i in "${!ports[@]}"; do
        port="${ports[$i]}"
        name="${port_names[$i]}"
        echo -n "   Port $port ($name): "
        
        if lsof -i :$port >/dev/null 2>&1; then
            status_running
            if [ "$1" = "--detailed" ]; then
                process=$(lsof -i :$port | tail -1 | awk '{print $1, $2}')
                echo "     Process: $process"
            fi
        else
            status_stopped
        fi
    done
}

check_system_resources() {
    echo ""
    echo "💻 System Resources:"
    echo "=================="
    
    # Docker 상태
    if command -v docker &> /dev/null; then
        echo -n "   Docker Service: "
        if docker info >/dev/null 2>&1; then
            status_running
        else
            status_stopped
        fi
    fi
    
    # 디스크 사용량 (Docker 볼륨)
    if command -v docker &> /dev/null; then
        echo "   Docker Volumes:"
        if docker volume ls | grep -q "mcp-orch"; then
            docker volume ls | grep "mcp-orch" | while read line; do
                echo "     $line"
            done
        else
            echo "     No MCP-Orch volumes found"
        fi
    fi
}

show_quick_status() {
    check_database_status
    check_backend_status
    check_frontend_status
}

show_detailed_status() {
    check_database_status
    check_backend_status
    check_frontend_status
    check_docker_containers "--detailed"
    check_network_connectivity "--detailed"
    check_system_resources
}

show_ports_info() {
    echo ""
    echo "🔌 Port Usage Information:"
    echo "========================"
    
    ports=(5432 8000 3000)
    port_names=("PostgreSQL" "Backend API" "Frontend Web")
    
    for i in "${!ports[@]}"; do
        port="${ports[$i]}"
        name="${port_names[$i]}"
        echo ""
        echo "Port $port ($name):"
        
        if lsof -i :$port >/dev/null 2>&1; then
            lsof -i :$port | head -1  # Header
            lsof -i :$port | tail -n +2 | while read line; do
                echo "  $line"
            done
        else
            echo "  Not in use"
        fi
    done
}

run_health_check() {
    echo ""
    echo "🏥 Health Check:"
    echo "==============="
    
    overall_health="healthy"
    
    # Database health
    echo -n "Database Connection: "
    if [ "$DB_STATUS" = "running" ]; then
        status_running
    else
        status_stopped
        overall_health="unhealthy"
    fi
    
    # Backend API health
    echo -n "Backend API Endpoint: "
    if curl -f http://localhost:8000/health >/dev/null 2>&1; then
        status_running
        # API 응답 시간 측정
        response_time=$(curl -o /dev/null -s -w '%{time_total}' http://localhost:8000/health)
        echo "   Response time: ${response_time}s"
    else
        status_stopped
        overall_health="unhealthy"
    fi
    
    # Frontend health
    echo -n "Frontend Web Access: "
    if curl -f http://localhost:3000 >/dev/null 2>&1; then
        status_running
    else
        status_stopped
        overall_health="unhealthy"
    fi
    
    echo ""
    echo -n "Overall System Health: "
    if [ "$overall_health" = "healthy" ]; then
        log_success "HEALTHY"
    else
        log_error "UNHEALTHY"
        echo ""
        echo "🔧 Suggested Actions:"
        if [ "$DB_STATUS" != "running" ]; then
            echo "  • Start database: ./scripts/database.sh"
        fi
        if [ "$BACKEND_STATUS" = "stopped" ]; then
            echo "  • Start backend: ./scripts/backend.sh"
        fi
        if [ "$FRONTEND_STATUS" = "stopped" ]; then
            echo "  • Start frontend: ./scripts/frontend.sh"
        fi
    fi
}

show_summary() {
    echo ""
    echo "📋 Quick Actions:"
    echo "================"
    echo "  • Start all services: ./scripts/database.sh && ./scripts/backend.sh && ./scripts/frontend.sh"
    echo "  • View logs: docker logs -f [container-name]"
    echo "  • Stop all: docker compose down"
    echo ""
    echo "🔗 Service URLs:"
    echo "==============="
    echo "  • Frontend:  http://localhost:3000"
    echo "  • Backend:   http://localhost:8000"
    echo "  • API Docs:  http://localhost:8000/docs"
    echo "  • Admin:     http://localhost:8000/api/admin/stats"
}

# 메인 스크립트 로직
case "${1:-}" in
    --quick)
        show_quick_status
        ;;
    --detailed)
        show_detailed_status
        show_summary
        ;;
    --ports)
        show_ports_info
        ;;
    --health)
        show_quick_status
        run_health_check
        ;;
    --help|-h)
        show_help
        ;;
    "")
        show_quick_status
        check_docker_containers
        check_network_connectivity
        show_summary
        ;;
    *)
        log_error "알 수 없는 옵션: $1"
        show_help
        exit 1
        ;;
esac
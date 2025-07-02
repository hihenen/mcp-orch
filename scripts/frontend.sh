#!/bin/bash

# MCP Orchestrator Frontend Script
# 프론트엔드를 Docker 방식으로 시작합니다 (의존성 무시)

set -e

echo "🌐 MCP Orchestrator Frontend"
echo "============================"

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
    echo "  $0                # Docker 방식으로 프론트엔드 시작 (기본값)"
    echo "  $0 --dev          # 로컬 Node.js 환경으로 시작 (개발용)"
    echo "  $0 --rebuild      # Docker 이미지 강제 재빌드 후 시작"
    echo "  $0 --help         # 도움말 표시"
    echo ""
    echo "실행 방식 비교:"
    echo "  ┌─────────────────┬─────────────────┬─────────────────┐"
    echo "  │     방식        │      장점       │      단점       │"
    echo "  ├─────────────────┼─────────────────┼─────────────────┤"
    echo "  │ Docker (권장)   │ • 빌드 관리     │ • 빌드 시간     │"
    echo "  │                 │ • 환경 일관성   │ • 메모리 사용   │"
    echo "  │                 │ • 의존성 격리   │                 │"
    echo "  ├─────────────────┼─────────────────┼─────────────────┤"
    echo "  │ 로컬 Node.js    │ • 빠른 시작     │ • 로컬 의존성   │"
    echo "  │                 │ • 직접 디버깅   │ • 환경 차이     │"
    echo "  │                 │ • HMR 빠름      │                 │"
    echo "  └─────────────────┴─────────────────┴─────────────────┘"
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

check_node_env() {
    # 프로젝트 루트 확인
    if [ ! -d "web" ]; then
        log_error "MCP Orchestrator 프로젝트 루트에서 실행해주세요"
        exit 1
    fi

    # Node.js 확인
    if ! command -v node &> /dev/null; then
        log_error "Node.js가 설치되어 있지 않습니다."
        exit 1
    fi

    # pnpm 확인
    if ! command -v pnpm &> /dev/null; then
        log_warning "pnpm이 설치되어 있지 않습니다. npm으로 대체 실행합니다."
        PACKAGE_MANAGER="npm"
    else
        PACKAGE_MANAGER="pnpm"
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

check_backend_status() {
    log_info "백엔드 연결을 확인하는 중..."
    
    # Docker 백엔드 확인
    if docker ps --format "table {{.Names}}" | grep -q "mcp-orch-backend"; then
        log_success "Docker 백엔드가 실행 중입니다"
        return 0
    fi
    
    # 로컬 백엔드 확인 (8000 포트)
    if lsof -i :8000 >/dev/null 2>&1; then
        log_success "로컬 백엔드가 실행 중입니다 (포트 8000)"
        return 0
    fi
    
    log_warning "백엔드가 실행되지 않은 것 같습니다."
    log_info "백엔드를 시작하세요:"
    echo "  • Python 방식: ./scripts/backend.sh"
    echo "  • Docker 방식: ./scripts/backend.sh --docker"
    echo ""
    log_info "그래도 프론트엔드를 시작합니다..."
}

start_docker_frontend() {
    log_docker "🐳 Docker 방식으로 프론트엔드를 시작합니다..."
    
    check_docker_env
    setup_env_file
    check_backend_status

    # 기존 프론트엔드 컨테이너 상태 확인
    if docker ps --format "table {{.Names}}" | grep -q "mcp-orch-frontend"; then
        log_info "기존 프론트엔드 컨테이너가 실행 중입니다."
        
        # 컨테이너 헬스 체크
        if docker exec mcp-orch-frontend curl -f http://localhost:3000 >/dev/null 2>&1; then
            log_success "프론트엔드가 정상적으로 응답합니다"
            
            echo ""
            echo "🌐 프론트엔드 정보:"
            echo "  • Frontend URL: http://localhost:3000"
            echo "  • Container: mcp-orch-frontend"
            echo "  • Backend API: http://localhost:8000"
            echo ""
            echo "🔧 유용한 명령어들:"
            echo "  • 백엔드 시작: ./scripts/backend.sh"
            echo "  • 컨테이너 재시작: docker compose restart mcp-orch-frontend"
            echo "  • 로그 확인: docker logs -f mcp-orch-frontend"
            echo "  • 컨테이너 중지: docker compose stop mcp-orch-frontend"
            echo ""
            echo "✅ 프론트엔드가 이미 실행 중입니다."
            return 0
        else
            log_warning "프론트엔드가 실행 중이지만 응답하지 않습니다. 재시작합니다..."
            docker compose restart mcp-orch-frontend
        fi
    else
        log_info "프론트엔드 컨테이너를 시작하는 중..."
        
        # --no-deps 옵션으로 백엔드 의존성 무시하고 프론트엔드만 시작
        log_docker "의존성을 무시하고 프론트엔드만 시작합니다 (--no-deps)"
        docker compose up -d --no-deps mcp-orch-frontend
    fi

    # 프론트엔드 준비 대기
    log_info "프론트엔드 준비를 기다리는 중..."
    for i in {1..30}; do
        if docker exec mcp-orch-frontend curl -f http://localhost:3000 >/dev/null 2>&1; then
            log_success "프론트엔드가 정상적으로 시작되었습니다! 🌐"
            break
        fi
        if [ $i -eq 30 ]; then
            log_error "프론트엔드 시작 시간이 초과되었습니다"
            log_info "컨테이너 로그를 확인하세요: docker logs mcp-orch-frontend"
            exit 1
        fi
        sleep 3
    done

    echo ""
    echo "🌐 프론트엔드 정보:"
    echo "  • Frontend URL: http://localhost:3000"
    echo "  • Hot Reload: 활성화 ✨"
    echo "  • Backend API: http://localhost:8000"
    echo ""
    echo "🔧 유용한 명령어들:"
    echo "  • 백엔드 시작: ./scripts/backend.sh"
    echo "  • 데이터베이스 시작: ./scripts/database.sh"
    echo "  • 상태 확인: ./scripts/status.sh"
    echo "  • 로그 확인: docker logs -f mcp-orch-frontend"
    echo "  • 컨테이너 중지: docker compose stop mcp-orch-frontend"
    echo ""
    echo "✅ 프론트엔드가 백그라운드에서 실행 중입니다."
}

rebuild_docker_frontend() {
    log_docker "🔄 Docker 이미지를 강제 재빌드하고 프론트엔드를 시작합니다..."
    
    check_docker_env
    setup_env_file

    # 기존 컨테이너 중지
    if docker ps --format "table {{.Names}}" | grep -q "mcp-orch-frontend"; then
        log_info "기존 프론트엔드 컨테이너를 중지합니다..."
        docker compose stop mcp-orch-frontend
    fi

    # 이미지 강제 재빌드
    log_docker "프론트엔드 이미지를 재빌드하는 중..."
    docker compose build --no-cache mcp-orch-frontend

    # 프론트엔드 시작
    log_docker "재빌드된 프론트엔드를 시작합니다..."
    docker compose up -d --no-deps mcp-orch-frontend

    # 준비 대기
    log_info "프론트엔드 준비를 기다리는 중..."
    for i in {1..30}; do
        if docker exec mcp-orch-frontend curl -f http://localhost:3000 >/dev/null 2>&1; then
            log_success "재빌드된 프론트엔드가 정상적으로 시작되었습니다! 🌐"
            break
        fi
        if [ $i -eq 30 ]; then
            log_error "프론트엔드 시작 시간이 초과되었습니다"
            exit 1
        fi
        sleep 3
    done

    echo ""
    echo "🌐 재빌드된 프론트엔드 정보:"
    echo "  • Frontend URL: http://localhost:3000"
    echo "  • 이미지: 새로 빌드됨"
    echo "  • Backend API: http://localhost:8000"
    echo ""
    echo "✅ 재빌드된 프론트엔드가 실행 중입니다."
}

start_dev_frontend() {
    log_info "🚀 로컬 Node.js 환경으로 프론트엔드를 시작합니다..."
    
    check_node_env
    check_backend_status

    # web 디렉토리로 이동
    if [ -d "web" ]; then
        log_info "web 디렉토리로 이동 중..."
        cd web
    fi

    # 환경 변수 확인
    if [ ! -f ".env.local" ] && [ ! -f "../.env" ]; then
        log_warning "환경 변수 파일이 없습니다. 기본값으로 실행됩니다."
        log_info "백엔드 URL: http://localhost:8000 (기본값)"
    fi

    # 의존성 설치 확인
    if [ ! -d "node_modules" ]; then
        log_info "의존성을 설치하는 중..."
        $PACKAGE_MANAGER install
        log_success "의존성 설치 완료"
    fi

    # 개발 서버 시작
    log_success "프론트엔드 개발 서버를 시작합니다! 🚀"
    echo ""
    echo "🌐 개발 정보:"
    echo "  • Frontend URL: http://localhost:3000"
    echo "  • Hot Reload: 활성화 ✨"
    echo "  • Backend API: http://localhost:8000"
    echo ""
    echo "🔧 유용한 명령어들:"
    echo "  • 백엔드 시작: ./scripts/backend.sh"
    echo "  • 데이터베이스 시작: ./scripts/database.sh"
    echo "  • 상태 확인: ./scripts/status.sh"
    echo ""
    echo "종료하려면 Ctrl+C를 누르세요."
    echo ""

    $PACKAGE_MANAGER run dev
}

# 메인 스크립트 로직
case "${1:-}" in
    --dev)
        start_dev_frontend
        ;;
    --rebuild)
        rebuild_docker_frontend
        ;;
    --help|-h)
        show_help
        ;;
    "")
        start_docker_frontend
        ;;
    *)
        log_error "알 수 없는 옵션: $1"
        show_help
        exit 1
        ;;
esac
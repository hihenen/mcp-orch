#!/bin/bash

# MCP Orchestrator Database Development Script
# PostgreSQL 데이터베이스만 시작합니다

set -e

echo "🐘 MCP Orchestrator Database Development"
echo "======================================="

# 색상 정의
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
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

# PostgreSQL 컨테이너 상태 확인
if docker ps --format "table {{.Names}}" | grep -q "mcp-orch-postgres"; then
    log_info "PostgreSQL이 이미 실행 중입니다."
    
    # 연결 테스트
    if docker exec mcp-orch-postgres pg_isready -U mcp_orch -d mcp_orch &> /dev/null; then
        log_success "PostgreSQL이 정상적으로 응답합니다"
        
        echo ""
        echo "🐘 데이터베이스 정보:"
        echo "  • Host: localhost"
        echo "  • Port: 5432"
        echo "  • Database: mcp_orch"
        echo "  • User: mcp_orch"
        echo ""
        echo "🔧 유용한 명령어들:"
        echo "  • 연결 테스트: docker exec mcp-orch-postgres pg_isready -U mcp_orch -d mcp_orch"
        echo "  • SQL 실행: docker exec -it mcp-orch-postgres psql -U mcp_orch -d mcp_orch"
        echo "  • 로그 확인: docker logs mcp-orch-postgres"
        echo "  • 컨테이너 중지: docker compose down postgresql"
        echo ""
        exit 0
    else
        log_warning "PostgreSQL이 실행 중이지만 응답하지 않습니다. 재시작합니다..."
        docker compose restart postgresql
    fi
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
        log_info "컨테이너 로그를 확인하세요: docker logs mcp-orch-postgres"
        exit 1
    fi
    sleep 2
done

echo ""
echo "🐘 데이터베이스 정보:"
echo "  • Host: localhost"
echo "  • Port: 5432"
echo "  • Database: mcp_orch"
echo "  • User: mcp_orch"
echo ""
echo "🔧 유용한 명령어들:"
echo "  • 백엔드 시작: ./scripts/dev-backend.sh"
echo "  • 프론트엔드 시작: ./scripts/dev-frontend.sh"
echo "  • 마이그레이션: uv run alembic upgrade head"
echo "  • SQL 콘솔: docker exec -it mcp-orch-postgres psql -U mcp_orch -d mcp_orch"
echo "  • 로그 확인: docker logs -f mcp-orch-postgres"
echo "  • 컨테이너 중지: docker compose down postgresql"
echo ""
echo "✅ PostgreSQL이 백그라운드에서 실행 중입니다."
#!/bin/bash

# MCP Orchestrator Development Setup
# SQLite 기반 완전 Native 개발 환경 설정

set -e

echo "🛠️  MCP Orchestrator Development Setup"
echo "====================================="

# 색상 정의
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

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

# 요구사항 확인
check_requirements() {
    log_info "개발 환경 요구사항 확인 중..."
    
    # Python 확인
    if ! command -v python3 &> /dev/null; then
        log_error "Python 3.11+ 이 필요합니다."
        exit 1
    fi
    
    # uv 확인 및 설치
    if ! command -v uv &> /dev/null; then
        log_warning "uv가 설치되어 있지 않습니다. 설치를 진행합니다..."
        curl -LsSf https://astral.sh/uv/install.sh | sh
        export PATH="$HOME/.cargo/bin:$PATH"
    fi
    
    log_success "요구사항 확인 완료"
}

# 개발용 환경 변수 설정
setup_dev_environment() {
    log_info "개발용 환경 변수 설정 중..."
    
    cat > .env << 'EOF'
# MCP Orchestrator Development Environment
# SQLite 기반 개발 환경

# Database (SQLite)
DATABASE_URL=sqlite:///./mcp_orch_dev.db

# Security (Development)
JWT_SECRET=dev-jwt-secret-key-change-in-production
AUTH_SECRET=dev-nextauth-secret-key-change-in-production
NEXTAUTH_SECRET=dev-nextauth-secret-key-change-in-production

# Server
SERVER__HOST=0.0.0.0
SERVER__PORT=8000
NEXTAUTH_URL=http://localhost:3000
NEXT_PUBLIC_MCP_API_URL=http://localhost:8000

# Admin User
INITIAL_ADMIN_EMAIL=admin@example.com
INITIAL_ADMIN_PASSWORD=admin123

# Development
ENV=development
DEBUG=true
LOG_LEVEL=DEBUG
API_DOCS_ENABLED=true

# MCP Settings
MAX_CONCURRENT_SERVERS=10
MCP_TIMEOUT_SECONDS=60
MCP_ALLOW_HOST_COMMANDS=true
EOF
    
    log_success "개발용 .env 파일 생성 완료"
}

# 의존성 설치
install_dependencies() {
    log_info "개발 의존성 설치 중..."
    
    # 가상환경이 없으면 생성
    if [ ! -d ".venv" ]; then
        uv venv
        log_success "가상환경 생성 완료"
    fi
    
    # 의존성 설치
    uv sync --dev
    log_success "개발 의존성 설치 완료"
}

# SQLite 데이터베이스 초기화
init_database() {
    log_info "SQLite 데이터베이스 초기화 중..."
    
    # 기존 데이터베이스 파일이 있으면 백업
    if [ -f "mcp_orch_dev.db" ]; then
        mv mcp_orch_dev.db "mcp_orch_dev.db.backup.$(date +%Y%m%d_%H%M%S)"
        log_warning "기존 데이터베이스를 백업했습니다"
    fi
    
    # 마이그레이션 실행
    uv run alembic upgrade head
    log_success "데이터베이스 초기화 완료"
}

# 샘플 MCP 설정 생성
create_sample_config() {
    log_info "샘플 MCP 설정 생성 중..."
    
    if [ ! -f "mcp-config.json" ]; then
        cat > mcp-config.json << 'EOF'
{
  "mcpServers": {
    "memory": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-memory"],
      "disabled": false,
      "timeout": 30
    },
    "filesystem": {
      "command": "npx", 
      "args": ["-y", "@modelcontextprotocol/server-filesystem", "/tmp"],
      "disabled": false,
      "timeout": 30
    }
  }
}
EOF
        log_success "샘플 mcp-config.json 생성 완료"
    else
        log_info "mcp-config.json이 이미 존재합니다"
    fi
}

# 개발 서버 시작 정보
show_dev_info() {
    log_success "🎉 개발 환경 설정 완료!"
    echo ""
    echo "개발 서버 시작 명령어들:"
    echo ""
    echo "1️⃣ 백엔드만 실행:"
    echo -e "   ${YELLOW}uv run mcp-orch serve --reload --log-level DEBUG${NC}"
    echo ""
    echo "2️⃣ 프론트엔드 개발 서버 (별도 터미널):"
    echo -e "   ${YELLOW}cd web && npm run dev${NC}"
    echo ""
    echo "🌐 개발 서버 접속 정보:"
    echo "  • Backend API: http://localhost:8000"
    echo "  • API Docs: http://localhost:8000/docs"
    echo "  • Frontend Dev: http://localhost:3000"
    echo "  • SQLite DB: ./mcp_orch_dev.db"
    echo ""
    echo "🔧 개발 유용 명령어들:"
    echo "  • 도구 목록: uv run mcp-orch list-tools"
    echo "  • 서버 목록: uv run mcp-orch list-servers"
    echo "  • DB 리셋: rm mcp_orch_dev.db && uv run alembic upgrade head"
    echo "  • 테스트: uv run pytest"
    echo ""
    echo "📝 개발자 팁:"
    echo "  • 코드 변경시 자동 재시작 (--reload 옵션)"
    echo "  • API 문서는 /docs 엔드포인트에서 확인"
    echo "  • SQLite 브라우저로 DB 직접 확인 가능"
}

# 메인 실행
main() {
    check_requirements
    setup_dev_environment
    install_dependencies
    init_database
    create_sample_config
    show_dev_info
}

# 스크립트 실행
main "$@"
#!/bin/bash

# MCP Orchestrator Quick Start  
# 원클릭으로 완전한 개발 환경을 설정하고 실행합니다.
# Database: Docker, Backend: Native, Frontend: Docker (무조건 포함)

set -e

echo "🚀 MCP Orchestrator Quick Start"
echo "==============================="

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

# 시스템 요구사항 확인
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
        
        # MCP 암호화 키 자동 생성
        generate_encryption_key
        
        log_warning "필요시 .env 파일을 편집하여 설정을 변경하세요"
    else
        log_success ".env 파일이 이미 존재합니다"
        
        # 기존 .env 파일에서 암호화 키 확인 및 생성
        check_encryption_key
    fi
}

# MCP 암호화 키 생성 함수
generate_encryption_key() {
    log_info "MCP 암호화 키 생성 중..."
    
    # Python을 사용하여 안전한 암호화 키 생성
    if command -v python3 &> /dev/null; then
        ENCRYPTION_KEY=$(python3 -c "import secrets; print(secrets.token_urlsafe(32))")
        
        # .env 파일에서 placeholder 교체
        if [[ "$OSTYPE" == "darwin"* ]]; then
            # macOS
            sed -i '' "s/your-secure-encryption-key-change-this-in-production/$ENCRYPTION_KEY/" .env
        else
            # Linux
            sed -i "s/your-secure-encryption-key-change-this-in-production/$ENCRYPTION_KEY/" .env
        fi
        
        log_success "MCP 암호화 키 생성 완료"
        log_warning "🔐 중요: 이 암호화 키는 MCP 서버 데이터 보안에 필수입니다"
        log_warning "🔐 키를 분실하면 암호화된 데이터를 복구할 수 없습니다"
    else
        log_warning "Python3를 찾을 수 없어 수동으로 암호화 키를 설정해야 합니다"
        log_warning "다음 명령으로 키를 생성하고 .env 파일을 편집하세요:"
        log_warning "python3 -c \"import secrets; print(secrets.token_urlsafe(32))\""
    fi
}

# 기존 .env 파일의 암호화 키 확인
check_encryption_key() {
    if grep -q "your-secure-encryption-key-change-this-in-production" .env 2>/dev/null; then
        log_warning "기본 암호화 키가 감지되었습니다. 새 키를 생성합니다..."
        generate_encryption_key
    elif grep -q "MCP_ENCRYPTION_KEY=" .env 2>/dev/null; then
        log_success "MCP 암호화 키가 이미 설정되어 있습니다"
    else
        log_warning "MCP_ENCRYPTION_KEY가 없습니다. 새 키를 생성합니다..."
        if command -v python3 &> /dev/null; then
            ENCRYPTION_KEY=$(python3 -c "import secrets; print(secrets.token_urlsafe(32))")
            echo "" >> .env
            echo "# MCP 데이터 암호화 키 (자동 생성됨)" >> .env
            echo "MCP_ENCRYPTION_KEY=$ENCRYPTION_KEY" >> .env
            log_success "MCP 암호화 키가 .env 파일에 추가되었습니다"
        fi
    fi
}

# PostgreSQL 시작
start_database() {
    log_info "PostgreSQL 데이터베이스 시작 중..."
    
    docker compose up -d postgresql
    
    # 데이터베이스 준비 대기
    log_info "데이터베이스 준비 대기 중..."
    for i in {1..30}; do
        if docker exec mcp-orch-postgres pg_isready -U mcp_orch -d mcp_orch &> /dev/null; then
            log_success "PostgreSQL 데이터베이스 준비 완료"
            break
        fi
        if [ $i -eq 30 ]; then
            log_error "데이터베이스 시작 시간이 초과되었습니다"
            exit 1
        fi
        sleep 2
    done
}

# Frontend 시작 (무조건 포함, 백엔드 의존성 제외)
start_frontend() {
    log_info "Frontend 컨테이너 시작 중..."
    docker compose up -d --no-deps mcp-orch-frontend
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
    
    # 현재 alembic_version 테이블 초기화 (만약 문제가 있다면)
    if ! uv run alembic current &> /dev/null; then
        log_warning "마이그레이션 상태를 확인할 수 없습니다. 초기화를 진행합니다..."
        # Docker에서 alembic_version 테이블 초기화
        docker exec mcp-orch-postgres psql -U mcp_orch -d mcp_orch -c "DELETE FROM alembic_version;" 2>/dev/null || true
    fi
    
    uv run alembic upgrade head
    log_success "데이터베이스 마이그레이션 완료"
}

# 백엔드 서버 자동 시작
start_backend_automatic() {
    log_info "백엔드 서버 자동 시작 중..."
    
    # 로그 디렉토리 생성
    if [ ! -d "logs" ]; then
        mkdir -p logs
    fi
    
    # 로그 파일명 생성
    local log_file="logs/mcp-orch-$(date +%Y%m%d).log"
    
    # 백엔드 시작
    log_info "백엔드를 백그라운드에서 시작합니다..."
    log_info "로그 파일: $log_file"
    
    nohup uv run mcp-orch serve > "$log_file" 2>&1 &
    local backend_pid=$!
    
    # 시작 확인
    sleep 3
    if kill -0 $backend_pid 2>/dev/null; then
        log_success "백엔드 서버가 성공적으로 시작되었습니다 (PID: $backend_pid)"
        log_info "로그 확인: tail -f $log_file"
        
        # 헬스 체크
        log_info "서버 헬스 체크 중..."
        local max_attempts=15
        local attempt=1
        
        while [ $attempt -le $max_attempts ]; do
            if curl -s http://localhost:8000/health &>/dev/null; then
                log_success "백엔드 서버가 정상적으로 응답합니다"
                return 0
            fi
            
            if [ $attempt -eq $max_attempts ]; then
                log_warning "헬스 체크에 실패했습니다. 브라우저를 통해 수동으로 확인해주세요."
                return 1
            fi
            
            log_info "헬스 체크 시도 $attempt/$max_attempts..."
            sleep 2
            attempt=$((attempt + 1))
        done
    else
        log_error "백엔드 서버 시작에 실패했습니다"
        log_error "로그를 확인하세요: cat $log_file"
        return 1
    fi
}

# 브라우저 자동 열기
open_browser() {
    log_info "브라우저에서 MCP Orchestrator를 여는 중..."
    
    # 잠깐 대기 (프론트엔드 완전 시작 대기)
    sleep 2
    
    # 운영체제별 브라우저 열기
    if command -v open &> /dev/null; then
        # macOS
        open http://localhost:3000
        log_success "macOS에서 브라우저가 열렸습니다"
    elif command -v xdg-open &> /dev/null; then
        # Linux
        xdg-open http://localhost:3000
        log_success "Linux에서 브라우저가 열렸습니다"
    elif command -v start &> /dev/null; then
        # Windows (WSL)
        start http://localhost:3000
        log_success "Windows에서 브라우저가 열렸습니다"
    else
        log_info "브라우저를 수동으로 열어주세요: http://localhost:3000"
    fi
}

# 완료 정보 출력
show_completion_info() {
    log_success "🎉 MCP Orchestrator 완전 자동 설정 완료!"
    echo ""
    echo "🌐 서비스 정보:"
    echo "  • Frontend: http://localhost:3000 ✨ (브라우저에서 열림)"
    echo "  • Backend API: http://localhost:8000 ⚡ (자동 시작됨)"
    echo "  • PostgreSQL: localhost:5432 🐘"
    echo ""
    echo "📋 다음 단계:"
    echo "  1. 브라우저에서 회원가입 또는 로그인"
    echo "  2. 첫 번째 프로젝트 생성"
    echo "  3. MCP 서버 추가 (예: brave-search)"
    echo "  4. 5분 안에 첫 MCP 서버 연결 완료!"
    echo ""
    echo "🔧 유용한 명령어들:"
    echo "  • 백엔드 로그: tail -f logs/mcp-orch-$(date +%Y%m%d).log"
    echo "  • 도구 목록: uv run mcp-orch list-tools"
    echo "  • 서버 목록: uv run mcp-orch list-servers"
    echo "  • 모든 서비스 중지: docker compose down"
    echo "  • 백엔드만 재시작: ./scripts/restart-backend.sh"
}

# 메인 실행
main() {
    echo "🚀 MCP Orchestrator 완전 자동 설정 시작!"
    echo "================================="
    echo ""
    
    echo "단계 1/7: 시스템 요구사항 확인"
    check_requirements
    echo ""
    
    echo "단계 2/7: 환경 설정"
    setup_environment
    echo ""
    
    echo "단계 3/7: 데이터베이스 시작"
    start_database
    echo ""
    
    echo "단계 4/7: Python 의존성 설치"
    install_dependencies
    echo ""
    
    echo "단계 5/7: 데이터베이스 마이그레이션"
    run_migrations
    echo ""
    
    echo "단계 6/7: 프론트엔드 시작"
    start_frontend
    echo ""
    
    echo "단계 7/7: 백엔드 자동 시작 및 브라우저 열기"
    if start_backend_automatic; then
        open_browser
        show_completion_info
    else
        log_error "백엔드 자동 시작에 실패했습니다."
        echo ""
        echo "수동으로 백엔드를 시작하세요:"
        echo -e "${YELLOW}uv run mcp-orch serve --log-level INFO${NC}"
        echo ""
        echo "브라우저에서 http://localhost:3000을 열어주세요."
    fi
}

# 스크립트 실행
main "$@"
#!/bin/bash

# MCP Orchestrator Quick Start
# 사용자가 배포 옵션을 선택할 수 있는 메인 스크립트

set -e

echo "🚀 MCP Orchestrator Quick Start"
echo "==============================="

# 색상 정의
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

echo -e "${CYAN}"
cat << 'EOF'
  __  __  ____  ____     ___            _               _             _             
 |  \/  |/ ___||  _ \   / _ \ _ __ ___  | |__   ___  ___| |_ _ __ __ _| |_ ___  _ __ 
 | |\/| | |    | |_) | | | | | '__/ __|| '_ \ / _ \/ __| __| '__/ _` | __/ _ \| '__|
 | |  | | |___ |  __/  | |_| | | | (__ | | | |  __/\__ \ |_| | | (_| | || (_) | |   
 |_|  |_|\____||_|      \___/|_|  \___||_| |_|\___||___/\__|_|  \__,_|\__\___/|_|   
                                                                                    
EOF
echo -e "${NC}"

echo "Model Context Protocol 서버를 위한 엔터프라이즈급 관리 플랫폼"
echo ""

# 배포 옵션 표시
echo -e "${BLUE}🎯 배포 옵션을 선택하세요:${NC}"
echo ""
echo -e "${GREEN}1. Hybrid (권장)${NC} - PostgreSQL(Docker) + Backend(Native) + Frontend(Docker)"
echo "   • 최적의 MCP 서버 호환성"
echo "   • 안정적인 데이터베이스"
echo "   • 빠른 개발 및 디버깅"
echo ""
echo -e "${YELLOW}2. Full Docker${NC} - 모든 서비스를 Docker로 실행"
echo "   • 완전한 격리 환경"
echo "   • 운영환경에 적합"
echo "   • 일관된 배포 환경"
echo ""
echo -e "${CYAN}3. Development${NC} - SQLite + Native 실행"
echo "   • 빠른 로컬 개발"
echo "   • 의존성 최소화"
echo "   • 간단한 디버깅"
echo ""

# 사용자 입력 받기
while true; do
    echo -n "선택하세요 (1-3): "
    read choice
    case $choice in
        1|hybrid|Hybrid)
            echo -e "${GREEN}Hybrid 배포를 선택했습니다!${NC}"
            ./scripts/quickstart-hybrid.sh "$@"
            break
            ;;
        2|docker|full|Full)
            echo -e "${YELLOW}Full Docker 배포를 선택했습니다!${NC}"
            echo "환경 변수 설정 중..."
            if [ ! -f ".env" ]; then
                cp .env.example .env 2>/dev/null || echo "# Docker 환경 변수" > .env
            fi
            echo "Docker Compose로 모든 서비스 시작 중..."
            docker-compose up -d
            echo -e "${GREEN}✅ Full Docker 환경 시작 완료!${NC}"
            echo "🌐 Frontend: http://localhost:3000"
            echo "🔧 Backend API: http://localhost:8000"
            break
            ;;
        3|dev|development|Development)
            echo -e "${CYAN}Development 환경을 선택했습니다!${NC}"
            ./scripts/dev-setup.sh "$@"
            break
            ;;
        *)
            echo -e "${RED}잘못된 선택입니다. 1, 2, 또는 3을 입력하세요.${NC}"
            ;;
    esac
done

echo ""
echo -e "${GREEN}🎉 MCP Orchestrator 설정이 완료되었습니다!${NC}"
echo ""
echo -e "${BLUE}📚 추가 리소스:${NC}"
echo "  • 문서: README.md"
echo "  • 설정 가이드: docs/"
echo "  • 모니터링 추가: docker-compose -f docker-compose.monitoring.yml up -d"
echo ""
echo -e "${YELLOW}💡 팁: 각 배포 옵션에 대한 자세한 정보는 README.md를 참고하세요!${NC}"

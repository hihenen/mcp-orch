#!/bin/bash

# MCP Orch 빠른 시작 스크립트
# uv를 사용하여 빠르게 설치하고 실행합니다.

set -e

echo "🚀 MCP Orch 빠른 시작 스크립트"
echo "================================"

# 색상 정의
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# OS 감지
OS="$(uname -s)"
case "${OS}" in
    Linux*)     OS_TYPE=Linux;;
    Darwin*)    OS_TYPE=Mac;;
    CYGWIN*|MINGW*|MSYS*) OS_TYPE=Windows;;
    *)          OS_TYPE="UNKNOWN:${OS}"
esac

echo "📍 시스템 정보: ${OS_TYPE}"

# Python 버전 확인
echo -e "\n📍 Python 버전 확인..."
if command -v python3 &> /dev/null; then
    PYTHON_VERSION=$(python3 -c 'import sys; print(".".join(map(str, sys.version_info[:2])))')
    PYTHON_MAJOR=$(echo $PYTHON_VERSION | cut -d. -f1)
    PYTHON_MINOR=$(echo $PYTHON_VERSION | cut -d. -f2)
    
    if [ "$PYTHON_MAJOR" -ge 3 ] && [ "$PYTHON_MINOR" -ge 11 ]; then
        echo -e "${GREEN}✓ Python $PYTHON_VERSION 발견${NC}"
    else
        echo -e "${RED}✗ Python 3.11 이상이 필요합니다. 현재: $PYTHON_VERSION${NC}"
        exit 1
    fi
else
    echo -e "${RED}✗ Python이 설치되어 있지 않습니다.${NC}"
    exit 1
fi

# uv 설치 확인
echo -e "\n📍 uv 설치 확인..."
if ! command -v uv &> /dev/null; then
    echo -e "${YELLOW}uv가 설치되어 있지 않습니다. 설치를 시작합니다...${NC}"
    
    if [ "$OS_TYPE" = "Windows" ]; then
        echo "Windows에서는 PowerShell을 사용하여 다음 명령을 실행하세요:"
        echo 'powershell -c "irm https://astral.sh/uv/install.ps1 | iex"'
        exit 1
    else
        curl -LsSf https://astral.sh/uv/install.sh | sh
        
        # PATH 업데이트
        export PATH="$HOME/.cargo/bin:$PATH"
        
        # .bashrc/.zshrc에 추가
        if [ -f "$HOME/.bashrc" ]; then
            echo 'export PATH="$HOME/.cargo/bin:$PATH"' >> "$HOME/.bashrc"
        fi
        if [ -f "$HOME/.zshrc" ]; then
            echo 'export PATH="$HOME/.cargo/bin:$PATH"' >> "$HOME/.zshrc"
        fi
    fi
    
    echo -e "${GREEN}✓ uv 설치 완료${NC}"
else
    echo -e "${GREEN}✓ uv가 이미 설치되어 있습니다${NC}"
fi

# 가상환경 생성
echo -e "\n📍 가상환경 설정..."
if [ ! -d ".venv" ]; then
    echo "가상환경을 생성합니다..."
    uv venv
    echo -e "${GREEN}✓ 가상환경 생성 완료${NC}"
else
    echo -e "${GREEN}✓ 가상환경이 이미 존재합니다${NC}"
fi

# 가상환경 활성화
echo -e "\n📍 가상환경 활성화..."
if [ "$OS_TYPE" = "Windows" ]; then
    ACTIVATE_SCRIPT=".venv/Scripts/activate"
else
    ACTIVATE_SCRIPT=".venv/bin/activate"
fi

# 의존성 설치
echo -e "\n📍 의존성 설치..."
source $ACTIVATE_SCRIPT
uv pip install -e ".[dev]"
echo -e "${GREEN}✓ 의존성 설치 완료${NC}"

# mcp-config.json 생성
echo -e "\n📍 설정 파일 확인..."
if [ ! -f "mcp-config.json" ]; then
    echo "mcp-config.json 파일을 생성합니다..."
    cat > mcp-config.json << 'EOF'
{
  "mcpServers": {
    "example-server": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-example"],
      "env": {
        "EXAMPLE_API_KEY": "your-api-key"
      },
      "transportType": "stdio",
      "timeout": 60,
      "autoApprove": ["safe_tool"],
      "disabled": false
    }
  }
}
EOF
    echo -e "${GREEN}✓ mcp-config.json 생성 완료${NC}"
    echo -e "${YELLOW}⚠️  mcp-config.json 파일을 편집하여 실제 MCP 서버를 추가하세요${NC}"
else
    echo -e "${GREEN}✓ mcp-config.json이 이미 존재합니다${NC}"
fi

# .env 파일 생성
if [ ! -f ".env" ]; then
    echo -e "\n📍 .env 파일을 생성합니다..."
    cat > .env << 'EOF'
# MCP Orch 환경 변수
PROXY_PORT=3000
LOG_LEVEL=INFO
API_KEY=your-api-key-here
JWT_SECRET=your-jwt-secret-here

# LLM 설정 (선택사항)
# AZURE_AI_ENDPOINT=https://your-endpoint.azure.com
# AZURE_AI_API_KEY=your-azure-key
# AWS_REGION=us-east-1
EOF
    echo -e "${GREEN}✓ .env 파일 생성 완료${NC}"
    echo -e "${YELLOW}⚠️  .env 파일을 편집하여 실제 API 키를 설정하세요${NC}"
fi

echo -e "\n${GREEN}🎉 설치 완료!${NC}"
echo -e "\n다음 명령으로 서버를 시작할 수 있습니다:"
echo -e "${YELLOW}source $ACTIVATE_SCRIPT${NC}"
echo -e "${YELLOW}mcp-orch serve${NC}"
echo -e "\n또는 개발 모드로 실행:"
echo -e "${YELLOW}mcp-orch serve --reload --log-level DEBUG${NC}"
echo -e "\n도구 목록 확인:"
echo -e "${YELLOW}mcp-orch list-tools${NC}"
echo -e "\n서버 목록 확인:"
echo -e "${YELLOW}mcp-orch list-servers${NC}"

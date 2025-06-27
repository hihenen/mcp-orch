#!/bin/bash

# MCP Orch 서버 중지 스크립트

# 프로젝트 디렉토리로 이동
cd "$(dirname "$0")/.."

echo "🛑 MCP Orch 서버 중지 중..."

# PID 파일이 있는지 확인
if [ -f "logs/mcp-orch.pid" ]; then
    PID=$(cat logs/mcp-orch.pid)
    if kill -0 $PID 2>/dev/null; then
        echo "📋 Process ID $PID 종료 중..."
        kill $PID
        sleep 2
        
        # 강제 종료가 필요한 경우
        if kill -0 $PID 2>/dev/null; then
            echo "⚠️  강제 종료 시도 중..."
            kill -9 $PID
        fi
        
        echo "✅ 서버가 종료되었습니다."
    else
        echo "⚠️  PID $PID 프로세스를 찾을 수 없습니다."
    fi
    rm -f logs/mcp-orch.pid
else
    echo "📄 PID 파일을 찾을 수 없습니다. 프로세스명으로 검색 중..."
fi

# 프로세스명으로 찾아서 종료
PIDS=$(pgrep -f "mcp-orch serve")
if [ -n "$PIDS" ]; then
    echo "🔍 발견된 MCP Orch 프로세스들: $PIDS"
    pkill -f "mcp-orch serve"
    echo "✅ 모든 MCP Orch 프로세스가 종료되었습니다."
else
    echo "ℹ️  실행 중인 MCP Orch 프로세스가 없습니다."
fi
#!/bin/bash

# MCP Orch 서버 시작 스크립트 (Nohup + 일별 로그)

# 프로젝트 디렉토리로 이동
cd "$(dirname "$0")/.."

# 로그 디렉토리 생성
mkdir -p logs

# 현재 날짜로 로그 파일명 생성
LOG_FILE="logs/mcp-orch-$(date +%Y-%m-%d).log"

# 기존에 실행 중인 프로세스가 있는지 확인
if pgrep -f "mcp-orch serve" > /dev/null; then
    echo "⚠️  MCP Orch가 이미 실행 중입니다."
    echo "현재 실행 중인 프로세스:"
    pgrep -fl "mcp-orch serve"
    echo ""
    echo "종료하려면: pkill -f 'mcp-orch serve'"
    exit 1
fi

# 서버 시작
echo "🚀 MCP Orch 서버 시작 중..."
echo "📁 로그 파일: $LOG_FILE"
echo "🔧 명령어: uv run mcp-orch serve --reload --log-level DEBUG"
echo ""

# Nohup으로 백그라운드 실행
nohup uv run mcp-orch serve --reload --log-level DEBUG > "$LOG_FILE" 2>&1 &

# 프로세스 ID 저장
PID=$!
echo $PID > logs/mcp-orch.pid

echo "✅ MCP Orch 서버가 백그라운드에서 시작되었습니다."
echo "📋 Process ID: $PID"
echo "📄 로그 확인: tail -f $LOG_FILE"
echo "🛑 서버 종료: kill $PID 또는 pkill -f 'mcp-orch serve'"
echo ""

# 잠시 기다린 후 프로세스 상태 확인
sleep 2
if kill -0 $PID 2>/dev/null; then
    echo "🟢 서버가 정상적으로 실행 중입니다."
else
    echo "🔴 서버 시작에 실패했습니다. 로그를 확인하세요:"
    echo "cat $LOG_FILE"
fi
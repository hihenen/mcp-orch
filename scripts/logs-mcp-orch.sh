#!/bin/bash

# MCP Orch 로그 모니터링 스크립트

# 프로젝트 디렉토리로 이동
cd "$(dirname "$0")/.."

# 오늘 날짜의 로그 파일
TODAY_LOG="logs/mcp-orch-$(date +%Y-%m-%d).log"

echo "📄 MCP Orch 로그 모니터링"
echo "📁 로그 파일: $TODAY_LOG"
echo "🔄 실시간 로그 보기 (Ctrl+C로 종료)"
echo "----------------------------------------"

# 로그 파일이 존재하는지 확인
if [ -f "$TODAY_LOG" ]; then
    tail -f "$TODAY_LOG"
else
    echo "⚠️  오늘 날짜의 로그 파일이 없습니다: $TODAY_LOG"
    echo ""
    echo "📂 사용 가능한 로그 파일들:"
    ls -la logs/mcp-orch-*.log 2>/dev/null || echo "로그 파일이 없습니다."
    echo ""
    echo "💡 서버가 실행되지 않았거나 다른 날짜의 로그를 확인하세요."
fi
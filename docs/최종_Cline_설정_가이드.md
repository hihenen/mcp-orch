# mcp-orch Cline 최종 설정 가이드

## 문제 분석
- mcp-proxy는 MCP Python SDK의 `SseServerTransport`를 사용
- mcp-orch의 커스텀 SSE 구현은 Cline과 호환되지 않음
- 표준 SSE 모드를 사용해야 함

## 해결 방법

### 1. mcp-orch 실행 (표준 SSE 모드)
```bash
cd mcp-orch
uv run mcp-orch serve --mode sse --port 8000
```

### 2. Cline 설정 (cline_mcp_settings.json)
```json
{
  "mcpServers": {
    "mcp-orch": {
      "command": "uv",
      "args": [
        "--directory",
        "/Users/yun/work/ai/mcp/mcp-orch",
        "run",
        "mcp-orch",
        "serve",
        "--mode",
        "sse",
        "--port",
        "8000"
      ]
    }
  }
}
```

### 3. VS Code 재시작

## 확인 사항
- mcp-orch 로그에서 SSE 연결 확인
- Cline에서 도구 인식 확인
- 도구 사용 테스트

## 주의사항
- 표준 SSE 모드는 단일 서버만 지원
- 여러 서버를 사용하려면 각각 별도의 포트로 실행
- 커스텀 SSE 모드는 Cline과 호환되지 않음

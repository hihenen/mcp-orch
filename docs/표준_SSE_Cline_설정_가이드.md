# MCP Orch 표준 SSE 모드 Cline 설정 가이드

## 개요

MCP SDK의 표준 SSE 구현을 사용하여 Cline과 연동하는 방법을 설명합니다.

## 1. MCP Orch 서버 실행

표준 SSE 모드로 서버를 실행합니다:

```bash
cd mcp-orch
# 기본 서버 (첫 번째 서버) 사용
uv run mcp-orch serve --mode proxy --port 8000 --sse-standard

# 특정 서버 지정
uv run mcp-orch serve --mode proxy --port 8000 --sse-standard --server brave-search
```

서버가 시작되면 다음과 같은 로그가 표시됩니다:
```
Starting MCP Orch in PROXY mode
Using MCP SDK Standard SSE implementation
SSE server ready at: http://0.0.0.0:8000/sse
Also available at: http://0.0.0.0:8000/sse/brave-search
```

## 2. Cline 설정

Cline의 MCP 설정 파일에 다음과 같이 추가합니다:

```json
{
  "mcpServers": {
    "search5": {
      "disabled": false,
      "timeout": 30,
      "url": "http://localhost:8000/sse/brave-search",
      "transportType": "sse"
    }
  }
}
```

## 3. URL 구조

표준 SSE 모드에서는 다음과 같은 URL 구조를 사용합니다:

- SSE 엔드포인트: `http://localhost:8000/sse/{server_name}`
- 메시지 엔드포인트: `http://localhost:8000/messages/{server_name}/`

## 4. 다중 서버 설정 (제한사항)

표준 SSE 모드는 단일 서버만 지원합니다. 여러 서버를 사용하려면:

### 옵션 1: 각 서버를 다른 포트에서 실행
```bash
# Terminal 1: Brave Search
uv run mcp-orch serve --port 8000 --sse-standard --server brave-search

# Terminal 2: GitHub
uv run mcp-orch serve --port 8001 --sse-standard --server github
```

### Cline 설정
```json
{
  "mcpServers": {
    "search5": {
      "disabled": false,
      "timeout": 30,
      "url": "http://localhost:8000/sse/brave-search",
      "transportType": "sse"
    },
    "github-proxy": {
      "disabled": false,
      "timeout": 30,
      "url": "http://localhost:8001/sse/github",
      "transportType": "sse"
    }
  }
}
```

### 옵션 2: 커스텀 SSE 모드 사용 (권장)
다중 서버를 단일 포트에서 지원하려면 커스텀 SSE 모드를 사용하세요:
```bash
uv run mcp-orch serve --mode proxy --port 8000
```

## 5. 문제 해결

### 연결 오류
- 서버가 실행 중인지 확인
- URL이 정확한지 확인 (`/sse/{server_name}` 형식)
- 포트가 올바른지 확인

### 404 Not Found 오류
- mcp-config.json에 해당 서버가 등록되어 있는지 확인
- 서버 이름이 정확한지 확인

### 도구가 표시되지 않음
- 서버 로그에서 초기화가 성공했는지 확인
- API 키나 토큰이 올바르게 설정되어 있는지 확인

## 6. 로그 확인

디버그 로그를 활성화하려면:

```bash
uv run mcp-orch serve --mode proxy --port 8000 --sse-standard --log-level debug
```

## 7. 주의사항

- 표준 SSE 모드는 **단일 서버만 지원**합니다
- 다중 서버가 필요한 경우 각각 다른 포트에서 실행해야 합니다
- MCP SDK의 SSE 클라이언트 제한으로 인한 구조적 한계입니다
- 안정적인 다중 서버 지원을 위해서는 커스텀 SSE 모드 사용을 권장합니다

## 8. 커스텀 SSE 모드로 전환

문제가 발생하면 커스텀 SSE 모드로 전환할 수 있습니다:

```bash
# --sse-standard 플래그 없이 실행
uv run mcp-orch serve --mode proxy --port 8000
```

Cline 설정은 동일하게 유지됩니다.

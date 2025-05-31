# mcp-orch와 mcp-proxy 비교 분석

## 문제점
mcp-orch가 Cline에서 SSE로 인식되지 않는 이유는 MCP SDK의 표준 구현을 따르지 않기 때문입니다.

## 핵심 차이점

### 1. mcp-proxy (작동함)
```python
# MCP SDK의 표준 구현 사용
from mcp.server import Server
from mcp.server.sse import SseServerTransport

# SSE 전송 계층 생성
sse_transport = SseServerTransport("messages/")

# MCP 서버 인스턴스 생성
app = Server(name=response.serverInfo.name)
app.capabilities = capabilities

# 표준 MCP 프로토콜 구현
```

### 2. mcp-orch (작동 안함)
```python
# FastAPI 기반 커스텀 구현
from fastapi import FastAPI
from sse_starlette.sse import EventSourceResponse

# 커스텀 SSE 핸들러
class ClineSSEHandler:
    async def handle_sse_connection(self, request: Request):
        # 커스텀 구현...
```

## 문제 해결 방법

### 방법 1: mcp-proxy 사용 (권장)
mcp-proxy는 이미 MCP SDK의 표준을 따르므로 Cline에서 완벽하게 작동합니다.

```bash
# mcp-proxy 실행
cd mcp-proxy
uv run mcp-proxy --port 8080 uvx mcp-server-fetch
```

### 방법 2: mcp-orch를 MCP SDK 표준으로 리팩토링
mcp-orch가 MCP SDK의 `Server`와 `SseServerTransport`를 사용하도록 수정해야 합니다.

주요 변경사항:
1. FastAPI 대신 MCP SDK의 서버 구현 사용
2. `SseServerTransport` 사용
3. 표준 MCP 프로토콜 메시지 형식 준수

### 방법 3: mcp-orch를 stdio 모드로 사용
mcp-orch를 stdio 서버로 실행하고, mcp-proxy를 통해 SSE로 노출:

```bash
# 터미널 1: mcp-proxy로 mcp-orch를 SSE로 노출
cd mcp-proxy
uv run mcp-proxy --port 8080 -- cd ../mcp-orch && uv run mcp-orch serve --stdio
```

## 결론

Cline이 SSE MCP 서버를 인식하려면:
1. MCP SDK의 표준 구현을 사용해야 함
2. 올바른 SSE 엔드포인트 구조 (`/sse`, `/messages/`)
3. 표준 MCP 프로토콜 메시지 형식

현재 mcp-orch는 이러한 요구사항을 충족하지 않으므로, mcp-proxy를 사용하거나 mcp-orch를 표준에 맞게 수정해야 합니다.

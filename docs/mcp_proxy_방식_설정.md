ㅇ# MCP Proxy 방식 설정 가이드

## 개요

mcp-orch는 mcp-proxy와 완전히 호환되는 SSE 서버 모드를 지원합니다. 이 모드를 사용하면 Cline 등의 MCP 클라이언트가 SSE를 통해 여러 MCP 서버에 연결할 수 있습니다.

## 특징

- **완벽한 mcp-proxy 호환성**: mcp-proxy와 동일한 URL 구조 및 프로토콜 사용
- **MCP SDK 표준 컴포넌트 활용**: `SseServerTransport`, `MCPServer` 사용
- **서버별 독립 세션**: 각 MCP 서버마다 별도의 SSE 세션 관리
- **CORS 지원**: 모든 오리진 허용으로 개발 환경 최적화

## 서버 실행

```bash
cd mcp-orch
uv run mcp-orch serve --mcp-proxy --port 8000
```

### 실행 옵션

- `--mcp-proxy`: mcp-proxy 호환 모드로 실행
- `--port`: 서버 포트 (기본값: 8000)
- `--host`: 서버 호스트 (기본값: 0.0.0.0)

## 엔드포인트 구조

서버가 실행되면 다음과 같은 엔드포인트가 제공됩니다:

- **상태 확인**: `http://localhost:8000/status`
- **SSE 연결**: `http://localhost:8000/servers/{server_name}/sse`
- **메시지 전송**: `http://localhost:8000/servers/{server_name}/messages/`

예시:
- brave-search: `http://localhost:8000/servers/brave-search/sse`
- excel-mcp-server: `http://localhost:8000/servers/excel-mcp-server/sse`

## Cline 설정

`cline_mcp_settings.json`에 다음과 같이 설정합니다:

```json
{
  "brave-proxy": {
    "disabled": false,
    "timeout": 30,
    "url": "http://localhost:8000/servers/brave-search/sse",
    "transportType": "sse"
  },
  "excel-proxy": {
    "disabled": false,
    "timeout": 30,
    "url": "http://localhost:8000/servers/excel-mcp-server/sse",
    "transportType": "sse"
  }
}
```

## 구현 세부사항

### 핵심 컴포넌트

1. **MCPProxyServer 클래스**
   - 각 MCP 서버별 인스턴스 관리
   - MCP SDK의 Server 클래스 래핑
   - 도구 목록 및 호출 핸들러 등록

2. **SseServerTransport**
   - MCP SDK의 표준 SSE 트랜스포트
   - endpoint를 "/messages/"로 설정하여 URL 경로 문제 해결
   - 서버별 독립적인 트랜스포트 인스턴스

3. **Starlette 라우팅**
   - Mount를 사용한 서버별 경로 구성
   - CORS 미들웨어로 크로스 오리진 지원

### URL 경로 이슈 해결

SseServerTransport의 URL 생성 로직:
```python
full_message_path = root_path.rstrip("/") + self._endpoint
```

- `root_path`: `/servers/brave-search`
- `self._endpoint`: `/messages/` (앞에 슬래시 필요)
- 결과: `/servers/brave-search/messages/`

## 테스트

### 상태 확인
```bash
curl http://localhost:8000/status
```

### SSE 연결 테스트
```bash
curl http://localhost:8000/servers/brave-search/sse
```

### 메시지 전송 테스트
```bash
curl "http://localhost:8000/servers/brave-search/messages/?session_id=test123" \
  -X POST -H "Content-Type: application/json" \
  -d '{"jsonrpc": "2.0", "id": 1, "method": "initialize"}'
```

## 문제 해결

### "NoneType object is not callable" 에러
- 원인: URL 경로에서 슬래시가 누락됨
- 해결: SseServerTransport 생성 시 endpoint를 "/messages/"로 설정

### 404 Not Found 에러
- 원인: 잘못된 URL 경로
- 해결: Mount와 Route 구조 확인, 서버별 독립적인 라우트 생성

## 참고 사항

- 개발 환경에서는 CORS를 모든 오리진에 대해 허용
- 프로덕션 환경에서는 적절한 CORS 설정 필요
- 각 서버는 독립적인 프로세스로 실행됨

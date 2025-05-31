# MCP 표준 SSE 구현 상태

## 개요

MCP SDK의 표준 SSE 서버 구현(`SseServerTransport`)을 사용하여 Cline과 호환되는 서버를 구축하려는 시도의 현재 상태를 문서화합니다.

## 현재 상태

### 구현된 기능

1. **MCP SDK 표준 컴포넌트 사용**
   - `mcp.server.Server` - MCP 서버 인스턴스
   - `mcp.server.sse.SseServerTransport` - SSE 전송 계층
   - `mcp.server.streamable_http_manager.StreamableHTTPSessionManager` - HTTP 세션 관리

2. **프록시 서버 구현**
   - stdio 클라이언트를 통한 MCP 서버 연결
   - 도구, 리소스, 프롬프트 핸들러 등록
   - 다중 서버 지원 구조

3. **CLI 통합**
   - `--sse-standard` 플래그로 표준 SSE 모드 활성화
   - 기존 모드와 분리된 독립적인 구현

### 발견된 문제

1. **URL 경로 처리 문제**
   - SSE 클라이언트가 `/servers/{name}/sse` 형태의 중첩된 경로를 제대로 처리하지 못함
   - 메시지 POST 요청 시 URL이 잘못 구성됨 (`/servers/brave-searchmessages/` 대신 `/servers/brave-search/messages/`가 되어야 함)

2. **MCP SDK의 제한사항**
   - `sse_client`가 베이스 URL을 올바르게 파싱하지 못함
   - 중첩된 경로 구조에서 상대 경로 처리에 문제 있음

## 테스트 결과

### mcp-proxy 테스트
```bash
# mcp-proxy 실행
cd mcp-proxy && uv run mcp-proxy --port 8081 uvx mcp-server-fetch

# 테스트 결과
- SSE 연결: 성공
- 초기화: 성공
- 도구 목록 조회: 성공
- URL 구조: /sse, /messages/
```

### mcp-orch 표준 SSE 테스트
```bash
# mcp-orch 표준 SSE 모드 실행
cd mcp-orch && uv run mcp-orch serve --sse-standard --port 8080

# 테스트 결과
- SSE 연결: 성공
- 초기화 시도: 실패 (URL 경로 문제)
- URL 구조: /servers/{name}/sse, /servers/{name}/messages/
```

## 해결 방안

### 1. 단기 해결책
- 기본 서버를 루트 경로에 배치 (mcp-proxy 방식)
- 다중 서버는 포트를 다르게 하여 실행

### 2. 중기 해결책
- URL 리라이팅 미들웨어 구현
- SSE 클라이언트의 요청을 가로채서 올바른 경로로 리다이렉트

### 3. 장기 해결책
- MCP SDK에 PR 제출하여 중첩된 경로 지원 추가
- 또는 커스텀 SSE 클라이언트 구현

## 권장사항

현재 시점에서는 다음을 권장합니다:

1. **프로덕션 사용**: 기존의 커스텀 SSE 구현 사용 (안정적)
2. **실험적 사용**: 단일 서버만 필요한 경우 표준 SSE 구현 사용 가능
3. **개발 참여**: MCP SDK 개선에 기여

## 코드 예시

### 작동하는 구조 (mcp-proxy 스타일)
```python
# 루트 경로에 기본 서버 배치
routes = [
    Mount("/mcp", app=handle_streamable_http),
    Route("/sse", endpoint=handle_sse),
    Mount("/messages/", app=sse_transport.handle_post_message),
]
```

### 문제가 있는 구조 (현재 mcp-orch)
```python
# 중첩된 경로 구조
server_mount = Mount(f"/servers/{server_name}", routes=routes)
# 결과: /servers/brave-search/sse
# 문제: 클라이언트가 /servers/brave-searchmessages/로 요청
```

## 향후 계획

1. MCP SDK 이슈 트래커에 문제 보고
2. 임시 해결책 구현 (URL 리라이팅)
3. 커뮤니티 피드백 수집
4. 장기적으로 SDK 개선 또는 대안 구현

## 참고 자료

- [MCP SDK 소스 코드](https://github.com/anthropics/model-context-protocol)
- [mcp-proxy 구현](https://github.com/sparfenyuk/mcp-proxy)
- [SSE 스펙](https://html.spec.whatwg.org/multipage/server-sent-events.html)

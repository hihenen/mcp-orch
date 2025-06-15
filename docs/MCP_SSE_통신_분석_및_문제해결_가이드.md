# MCP SSE 통신 분석 및 문제해결 가이드

## 개요

이 문서는 mcp-inspector에서 mcp-orch SSE 엔드포인트 연결 시 "disconnected" 상태로 표시되는 문제를 분석하고 해결 방안을 제시합니다.

---

## 🔍 문제 상황 분석

### 관찰된 현상
- **mcp-orch 서버**: SSE 연결 처리 정상, 인증 성공, 이벤트 전송 완료
- **mcp-inspector UI**: "disconnected" 상태로 표시
- **로그 분석**: 서버 측에서는 모든 과정이 성공으로 기록됨

### 로그 증거
```
✅ Found project: test
✅ Authenticated user via API key: hdyun@fnfcorp.com
✅ API key authentication successful: hdyun@fnfcorp.com
INFO: MCP SSE connection established
INFO: Sent endpoint event with relative URI: /messages
INFO: Sent initialized event for server brave-search
INFO: Sent 2 tools for server brave-search
INFO: Starting message queue loop for connection 2421e83f-4ae3-4d40-9c5d-7ad4aea0cc40
```

---

## 🏗️ MCP 프로토콜 표준 이해

### MCP SSE Transport 아키텍처

MCP SSE Transport는 **이중 채널 통신** 방식을 사용합니다:

1. **SSE 채널** (서버 → 클라이언트)
   - 서버에서 클라이언트로 알림/이벤트 전송
   - `text/event-stream` 형태
   - 단방향 통신

2. **HTTP POST 채널** (클라이언트 → 서버) 
   - 클라이언트에서 서버로 요청 전송
   - `/messages` 엔드포인트 사용
   - JSON-RPC 2.0 형태

### 정확한 초기화 시퀀스

#### 1. SSE 연결 설정
```
GET /projects/{project_id}/servers/{server_name}/sse
Accept: text/event-stream
Authorization: Bearer {token}
```

#### 2. 서버 → 클라이언트 이벤트 전송 순서

```javascript
// 1. endpoint 이벤트 (필수)
{
  "jsonrpc": "2.0", 
  "method": "endpoint",
  "params": {
    "uri": "http://localhost:8000/projects/c41aa472.../messages"  // 절대 URI 필요!
  }
}

// 2. 서버 초기화 완료 알림 (선택)
{
  "jsonrpc": "2.0",
  "method": "notifications/initialized", 
  "params": {
    "protocolVersion": "2024-11-05",
    "capabilities": {"tools": {}},
    "serverInfo": {"name": "mcp-orch-brave-search", "version": "1.0.0"}
  }
}

// 3. 도구 목록 알림 (선택)
{
  "jsonrpc": "2.0",
  "method": "notifications/tools/list_changed",
  "params": {
    "tools": [...]
  }
}
```

#### 3. 클라이언트 → 서버 초기화 요청 (핵심!)

SSE 이벤트를 받은 후, MCP SDK 클라이언트는 **반드시** 다음 요청을 보냅니다:

```javascript
POST /projects/{project_id}/servers/{server_name}/messages
Content-Type: application/json
Authorization: Bearer {token}

{
  "jsonrpc": "2.0",
  "id": "some-request-id",
  "method": "initialize", 
  "params": {
    "protocolVersion": "2024-11-05",
    "capabilities": {
      "sampling": {},
      "roots": {"listChanged": true}
    },
    "clientInfo": {
      "name": "mcp-inspector", 
      "version": "1.0.0"
    }
  }
}
```

#### 4. 서버 → 클라이언트 초기화 응답 (필수!)

```javascript
{
  "jsonrpc": "2.0",
  "id": "same-request-id", 
  "result": {
    "protocolVersion": "2024-11-05",
    "capabilities": {"tools": {}},
    "serverInfo": {"name": "mcp-orch", "version": "1.0.0"}
  }
}
```

---

## ❌ 현재 mcp-orch 구현의 문제점

### 1. **endpoint 이벤트 URI 형식 오류**

**현재 (잘못됨):**
```javascript
{
  "jsonrpc": "2.0",
  "method": "endpoint", 
  "params": {
    "uri": "/messages"  // ❌ 상대 경로
  }
}
```

**올바른 형식:**
```javascript
{
  "jsonrpc": "2.0",
  "method": "endpoint",
  "params": {
    "uri": "http://localhost:8000/projects/c41aa472.../messages"  // ✅ 절대 URI
  }
}
```

### 2. **초기화 핸드셰이크 누락**

**문제**: 클라이언트가 `initialize` 요청을 보내도 서버가 즉시 응답하지 않음
**원인**: `/messages` POST 엔드포인트가 `initialize` 메서드를 올바르게 처리하지 못함

### 3. **비동기 응답 처리 부족**

**문제**: MCP SDK는 `client.connect()` 시 동기적으로 초기화 완료를 기대함
**원인**: 현재 구현은 SSE 이벤트만 전송하고 HTTP 응답은 지연됨

---

## 🔧 해결 방안

### 1. endpoint 이벤트 수정

```python
# mcp_standard_sse.py 수정
async def generate_mcp_sse_stream(...):
    # 1. endpoint 이벤트 - 절대 URI 사용
    endpoint_event = {
        "jsonrpc": "2.0",
        "method": "endpoint",
        "params": {
            "uri": f"http://localhost:8000/projects/{project_id}/servers/{server_name}/messages"
        }
    }
    yield f"data: {json.dumps(endpoint_event)}\n\n"
```

### 2. initialize 핸들러 개선

```python
async def handle_initialize(message: Dict[str, Any]):
    """초기화 요청 즉시 응답"""
    response = {
        "jsonrpc": "2.0",
        "id": message.get("id"),  # 요청 ID 반드시 포함
        "result": {
            "protocolVersion": "2024-11-05",
            "capabilities": {
                "tools": {},
                "logging": {},
                "prompts": {},
                "resources": {}
            },
            "serverInfo": {
                "name": "mcp-orch",
                "version": "1.0.0"
            }
        }
    }
    return JSONResponse(content=response)
```

### 3. 메시지 엔드포인트 개선

```python
@router.post("/projects/{project_id}/servers/{server_name}/messages")
async def mcp_messages_endpoint(...):
    """즉시 응답 보장"""
    try:
        method = message.get("method")
        
        if method == "initialize":
            # 초기화는 즉시 응답 (지연 없음)
            return await handle_initialize(message)
        elif method == "tools/list":
            # 도구 목록도 즉시 응답
            return await handle_tools_list(server)
        elif method == "tools/call":
            # 도구 호출은 비동기 처리 가능
            return await handle_tool_call(message, server, project_id, server_name)
        # ...
    except Exception as e:
        # 오류 시에도 즉시 JSON-RPC 오류 응답
        error_response = {
            "jsonrpc": "2.0",
            "id": message.get("id"),
            "error": {"code": -32000, "message": str(e)}
        }
        return JSONResponse(content=error_response)
```

### 4. 클라이언트 연결 상태 로직 이해

```typescript
// useConnection.ts - 연결 성공 조건
const connect = async () => {
  try {
    await client.connect(transport);  // 여기서 initialize 핸드셰이크 완료되어야 함
    setConnectionStatus("connected");  // 초기화 완료 후에만 실행됨
  } catch (error) {
    setConnectionStatus("error");
  }
}
```

---

## 🧪 테스트 및 검증 방법

### 1. 브라우저 개발자 도구 확인
1. **Network 탭**:
   - SSE 연결: `Status 200`, `Type eventsource`
   - POST 요청: `initialize` 메서드가 즉시 응답받는지 확인

2. **Console 탭**:
   - MCP SDK 연결 오류 메시지 확인
   - `client.connect()` 성공/실패 로그

### 2. 수정 전후 비교
```bash
# 수정 전 동작
SSE: [endpoint, initialized, tools/list_changed] → ✅ 전송됨  
POST initialize: → ❌ 응답 지연/실패
client.connect(): → ❌ 타임아웃/오류
connectionStatus: → "disconnected"

# 수정 후 동작  
SSE: [endpoint, initialized, tools/list_changed] → ✅ 전송됨
POST initialize: → ✅ 즉시 응답
client.connect(): → ✅ 성공
connectionStatus: → "connected"
```

### 3. 로그 검증 포인트
- `endpoint` 이벤트에 절대 URI 포함 확인
- `initialize` POST 요청 수신 및 즉시 응답 확인  
- 클라이언트 연결 상태 변경 확인

---

## 📋 구현 체크리스트

### High Priority (즉시 구현)
- [ ] `endpoint` 이벤트 절대 URI 수정
- [ ] `handle_initialize` 즉시 응답 보장  
- [ ] `/messages` 엔드포인트 오류 처리 개선
- [ ] 브라우저에서 연결 테스트

### Medium Priority (추가 개선)
- [ ] Keep-alive 메커니즘 개선
- [ ] 연결 복구 로직 강화
- [ ] 상세 디버깅 로그 추가
- [ ] MCP 프로토콜 호환성 테스트

### Low Priority (장기 개선)
- [ ] 성능 최적화
- [ ] 다중 클라이언트 연결 지원
- [ ] 고급 MCP 기능 구현

---

## 🔗 관련 리소스

- **MCP Specification**: https://spec.modelcontextprotocol.io/
- **MCP SDK Documentation**: https://modelcontextprotocol.io/docs/
- **SSE Standard**: https://developer.mozilla.org/en-US/docs/Web/API/Server-sent_events
- **JSON-RPC 2.0**: https://www.jsonrpc.org/specification

---

## 📝 주요 학습 내용

1. **MCP는 이중 채널 프로토콜**: SSE + HTTP POST 조합 필수
2. **초기화 핸드셰이크 중요성**: `client.connect()` 성공의 핵심
3. **절대 URI 요구사항**: endpoint 이벤트의 필수 조건
4. **즉시 응답 필요성**: 비동기라도 초기화는 동기적 처리
5. **JSON-RPC 2.0 표준 준수**: id, method, params 정확한 형식

이러한 이해를 바탕으로 mcp-orch의 SSE 구현을 표준에 맞게 수정하면 mcp-inspector와의 완벽한 호환성을 달성할 수 있습니다.
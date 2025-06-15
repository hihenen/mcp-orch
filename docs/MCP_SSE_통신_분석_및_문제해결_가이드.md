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

### 🚨 Inspector Transport 시작 타임아웃 문제 (CRITICAL - 최신 분석 결과)

#### 최신 문제 현상 (2025-06-15)
**Inspector Proxy 로그에서 발견되는 "Not connected" 오류**:
```
🔧 [PROXY DEBUG] Client → Server message: {
  "jsonrpc": "2.0",
  "id": "unique-request-id",
  "method": "initialize",
  "params": {...}
}
🔧 [PROXY DEBUG] Error sending message to server: Error: Not connected
🔧 [PROXY DEBUG] Sending error response to client: {
  "jsonrpc": "2.0",
  "id": "unique-request-id", 
  "error": {
    "code": -32001,
    "message": "Error: Not connected"
  }
}
```

#### 핵심 원인 (최신 Inspector 코드 분석)
- **Inspector SSE Transport 연결 시퀀스 문제**: 
  - SSE 연결은 성공하고 `endpoint` 이벤트도 수신
  - 하지만 Transport가 실제로 "연결됨" 상태가 되지 않음
  - `transportToServer.send(message)` 호출 시 "Not connected" 오류 발생

- **타이밍 문제**: 
  - `SSEClientTransport.start()` 5초 타임아웃은 우회됨
  - 하지만 Transport 내부 상태가 연결 완료로 설정되지 않음
  - POST 메시지 전송 시점에 연결 상태 불일치 발생

#### Inspector Transport 연결 상태 흐름
```typescript
// Inspector의 기대 흐름
1. SSEClientTransport 생성
2. transport.start() 호출
3. endpoint 이벤트 수신 → endpointReceived = true
4. initialize 요청 자동 전송 → 이 단계에서 "Not connected" 발생!
5. initialize 응답 수신 → transport 연결 완료
6. transport.start() Promise resolve
```

#### 실제 발생하는 문제
```
✅ SSE 연결 성공
✅ endpoint 이벤트 수신  
❌ initialize 요청 전송 실패 ("Not connected")
❌ transport.start() 타임아웃 또는 실패
❌ Inspector "disconnected" 상태 유지
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

#### 🎯 핵심: Inspector Transport의 초기화 완료 조건

**Inspector `SSEClientTransport.start()` 완료 조건**:
1. **SSE 연결 설정** 완료
2. **`endpoint` 이벤트 수신** 완료
3. **MCP 초기화 핸드셰이크** 완료 ← **현재 누락!**

#### 1. SSE 연결 설정
```
GET /projects/{project_id}/servers/{server_name}/sse
Accept: text/event-stream
Authorization: Bearer {token}
```

#### 2. 서버 → 클라이언트: endpoint 이벤트 (필수)

```javascript
// 1. endpoint 이벤트 - SSE Transport 시작을 위해 반드시 필요
{
  "jsonrpc": "2.0", 
  "method": "endpoint",
  "params": {
    "uri": "http://localhost:8000/projects/c41aa472.../messages"  // 절대 URI 필요!
  }
}
```

#### 3. 클라이언트 → 서버: initialize 요청 (자동 실행) - ⚠️ 현재 실패 지점

**endpoint 이벤트 수신 후**, Inspector SDK는 **자동으로** 다음 요청을 전송:

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

**⚠️ 현재 문제**: 이 요청이 **"Not connected" 오류**로 전송되지 않음!

#### 4. 서버 → 클라이언트: initialize 응답 (핵심!)

**⚠️ 이 응답이 없으면 `transport.start()` 타임아웃 발생!**

```javascript
{
  "jsonrpc": "2.0",
  "id": "same-request-id",  // 요청 ID와 반드시 일치
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
```

#### 5. 클라이언트 → 서버: initialized 알림

```javascript
POST /projects/{project_id}/servers/{server_name}/messages

{
  "jsonrpc": "2.0",
  "method": "notifications/initialized"
}
```

#### 6. 🎉 Transport 초기화 완료

이 시점에서 `transport.start()` Promise가 **resolve**되고 Inspector가 **"connected"** 상태로 변경됩니다.

### 선택적 이벤트 (초기화 후)

```javascript
// 도구 목록 알림 (선택)
{
  "jsonrpc": "2.0",
  "method": "notifications/tools/list_changed",
  "params": {
    "tools": [...]
  }
}
```

---

## ❌ 현재 mcp-orch 구현의 문제점

### 1. **🚨 핵심 문제: Inspector Transport "Not connected" 오류**

**현재 상황 (2025-06-15 최신)**:
- ✅ SSE 연결 성공
- ✅ `endpoint` 이벤트 전송됨
- ❌ **`initialize` POST 요청 자체가 전송되지 않음** ("Not connected" 오류)
- ❌ Inspector Transport 내부 상태 불일치

**원인 분석**:
```javascript
// Inspector Transport 상태 흐름 문제
1. SSEClientTransport 생성 ✅
2. endpoint 이벤트 수신 ✅  
3. endpointReceived = true ✅
4. transportToServer.send(initialize) → "Error: Not connected" ❌
```

**실제 문제 지점**:
- mcp-orch는 `endpoint` 이벤트를 보내지만 Transport가 연결 상태로 인식하지 않음
- Inspector SDK의 `SSEClientTransport`가 메시지 전송 가능 상태가 되지 않음
- 따라서 `initialize` 요청 자체가 mcp-orch로 도달하지 않음

**Inspector 기대 vs 현실**:
```
Inspector 기대:
endpoint 이벤트 → Transport 연결 완료 → initialize 요청 → 응답 → 성공

현재 실제:
endpoint 이벤트 → Transport 상태 불일치 → initialize 요청 실패 ("Not connected")
```

### 2. **endpoint 이벤트 URI 형식 오류**

**현재 (잘못됨):**
```javascript
{
  "jsonrpc": "2.0",
  "method": "endpoint", 
  "params": {
    "uri": "/projects/c41aa472.../messages"  // ❌ 상대 경로
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

### 3. **비동기 응답 처리 문제**

**문제**: Inspector SDK의 `transport.start()`는 **동기적 초기화 완료**를 기대
**현재**: SSE 이벤트는 전송하지만 HTTP POST 응답이 제대로 처리되지 않음

### 4. **Inspector 호환성 부족**

**Inspector 요구사항**:
- `transport.start()` 메서드가 5초 내에 완료되어야 함
- MCP 표준 초기화 핸드셰이크 완료가 필수

**현재 mcp-orch**:
- `endpoint` 이벤트만 전송
- 초기화 핸드셰이크 미완료로 타임아웃 발생

---

## 🔧 해결 방안

### 🎯 우선순위 1: Inspector Transport "Not connected" 오류 해결

#### A. SSE 헤더 및 CORS 정책 강화

**문제**: Inspector Transport가 연결 상태로 인식하지 않음
**해결**: SSE 표준 헤더 강화 및 CORS 설정 개선

```python
# mcp_standard_sse.py - SSE 엔드포인트 헤더 개선
@router.get("/projects/{project_id}/servers/{server_name}/sse")
async def mcp_standard_sse_endpoint(...):
    return StreamingResponse(
        generate_mcp_sse_stream(...),
        media_type="text/event-stream",
        headers={
            # 표준 SSE 헤더 (Inspector 요구사항)
            "Cache-Control": "no-cache, no-store, must-revalidate",
            "Connection": "keep-alive",
            "Content-Type": "text/event-stream; charset=utf-8",
            
            # CORS 헤더 강화 (Inspector proxy 호환)
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Headers": "Content-Type, Authorization, Accept",
            "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
            "Access-Control-Expose-Headers": "Content-Type",
            
            # SSE 최적화 헤더
            "X-Accel-Buffering": "no",  # Nginx buffering 비활성화
            "Pragma": "no-cache",
            "Expires": "0",
            "Transfer-Encoding": "chunked"
        }
    )
```

#### B. endpoint 이벤트 형식 개선

**문제**: Inspector Transport가 endpoint 이벤트를 올바르게 처리하지 못함
**해결**: MCP 표준에 맞는 정확한 endpoint 이벤트 형식

```python
# generate_mcp_sse_stream 함수 개선
async def generate_mcp_sse_stream(...):
    # 1. 연결 설정 완료 대기 (중요!)
    await asyncio.sleep(0.1)  # Transport 초기화 대기
    
    # 2. 표준 MCP endpoint 이벤트 (절대 URI 필수)
    endpoint_uri = f"http://localhost:8000/projects/{project_id}/servers/{server_name}/messages"
    endpoint_event = {
        "jsonrpc": "2.0",
        "method": "endpoint",
        "params": {
            "uri": endpoint_uri
        }
    }
    
    # 3. SSE 형식으로 전송 (개행 중요!)
    yield f"data: {json.dumps(endpoint_event)}\n\n"
    logger.info(f"✅ Sent endpoint event: {endpoint_uri}")
    
    # 4. Transport 안정화 대기
    await asyncio.sleep(0.2)
    
    # 5. 추가 이벤트 전송 전 연결 확인
    yield f": connection-established\n\n"  # SSE 주석 이벤트
```

#### C. initialize 핸들러 즉시 응답 보장 (여전히 중요)

```python
async def handle_initialize(message: Dict[str, Any]):
    """초기화 요청 즉시 응답 - Inspector Transport 연결 완료"""
    
    request_id = message.get("id")
    logger.info(f"🚀 Processing initialize request with id: {request_id}")
    
    # MCP 표준 초기화 응답
    response = {
        "jsonrpc": "2.0",
        "id": request_id,  # 요청 ID 필수 매칭
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
    
    logger.info(f"✅ Sending initialize response for id: {request_id}")
    return JSONResponse(content=response)
```

#### B. 메시지 엔드포인트 우선순위 처리

```python
@router.post("/projects/{project_id}/servers/{server_name}/messages")
async def mcp_messages_endpoint(...):
    """Inspector 호환성을 위한 즉시 응답"""
    try:
        method = message.get("method")
        
        # initialize 최우선 처리 - Inspector 타임아웃 방지
        if method == "initialize":
            logger.info(f"Handling initialize request for server {server_name}")
            return await handle_initialize(message)
        elif method == "tools/list":
            # 도구 목록도 즉시 응답
            return await handle_tools_list(server)
        elif method == "tools/call":
            return await handle_tool_call(message, server, project_id, server_name)
        elif method.startswith("notifications/"):
            # 알림 메시지는 202 Accepted 반환
            return JSONResponse(content={"status": "accepted"}, status_code=202)
        else:
            # 알 수 없는 메서드
            logger.warning(f"Unknown method received: {method}")
            error_response = {
                "jsonrpc": "2.0",
                "id": message.get("id"),
                "error": {
                    "code": -32601,
                    "message": f"Method not found: {method}"
                }
            }
            return JSONResponse(content=error_response, status_code=200)
    except Exception as e:
        # 오류 시에도 즉시 JSON-RPC 오류 응답
        error_response = {
            "jsonrpc": "2.0",
            "id": message.get("id") if 'message' in locals() else None,
            "error": {
                "code": -32000,
                "message": f"Internal error: {str(e)}"
            }
        }
        return JSONResponse(content=error_response, status_code=200)
```

### 🎯 우선순위 2: endpoint 이벤트 절대 URI 수정

```python
# mcp_standard_sse.py 수정
async def generate_mcp_sse_stream(...):
    # 1. endpoint 이벤트 - 절대 URI 사용 (Inspector 요구사항)
    endpoint_uri = f"http://localhost:8000/projects/{project_id}/servers/{server_name}/messages"
    endpoint_event = {
        "jsonrpc": "2.0",
        "method": "endpoint",
        "params": {
            "uri": endpoint_uri
        }
    }
    yield f"data: {json.dumps(endpoint_event)}\n\n"
    logger.info(f"Sent endpoint event with URI: {endpoint_uri}")
```

### 🎯 우선순위 3: Inspector 호환성 검증

#### A. Transport 초기화 완료 확인

```typescript
// Inspector useConnection.ts의 연결 성공 조건 이해
const connect = async () => {
  try {
    // 1. SSE Transport 생성
    const transport = new SSEClientTransport(url, options);
    
    // 2. transport.start() 호출 - 여기서 5초 타임아웃 발생 가능
    await transport.start();  // ← 이 단계에서 initialize 핸드셰이크 완료되어야 함
    
    // 3. Client 연결
    await client.connect(transport);
    
    // 4. 연결 상태 업데이트
    setConnectionStatus("connected");  // 모든 과정 완료 후에만 실행
  } catch (error) {
    setConnectionStatus("error");
  }
}
```

#### B. 타임아웃 방지 검증

```bash
# 수정 후 확인해야 할 시퀀스
1. SSE 연결 → OK
2. endpoint 이벤트 수신 → OK  
3. initialize POST 요청 → OK
4. initialize 즉시 응답 → ✅ 이 단계에서 성공해야 함
5. transport.start() 완료 → ✅ 5초 내 완료
6. Inspector "connected" 상태 → ✅ 최종 성공
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

## 📋 구현 체크리스트 (2025-06-15 업데이트)

### 🚨 Critical Priority (Inspector "Not connected" 오류 해결)
- [ ] **SSE 헤더 강화** (최우선)
  - [ ] Content-Type: "text/event-stream; charset=utf-8" 정확한 형식
  - [ ] CORS 헤더 완전 설정 (Access-Control-*)
  - [ ] X-Accel-Buffering: no (버퍼링 비활성화)
  - [ ] Transfer-Encoding: chunked 명시
- [ ] **endpoint 이벤트 개선**
  - [ ] 절대 URI 사용 (http://localhost:8000/...)
  - [ ] 연결 초기화 대기 시간 추가 (0.1초)
  - [ ] 정확한 SSE 형식 (data: {...}\n\n)
  - [ ] connection-established 주석 이벤트 추가
- [ ] **Transport 연결 상태 확인**
  - [ ] Inspector proxy 로그에서 "Not connected" 오류 제거 확인
  - [ ] initialize 요청이 실제 mcp-orch에 도달하는지 검증
  - [ ] "connected" 상태 변경 확인

### High Priority (즉시 구현)
- [ ] **`handle_initialize` 즉시 응답 보장**
  - [ ] 요청 ID 정확히 반환
  - [ ] MCP 표준 capabilities 포함
  - [ ] 응답 지연 없이 즉시 JSONResponse 반환
- [ ] **`/messages` 엔드포인트 initialize 우선 처리**
  - [ ] `method == "initialize"` 최우선 분기
  - [ ] 다른 메서드보다 먼저 처리
- [ ] **POST 요청 수신 검증**
  - [ ] mcp-orch 로그에서 POST 요청 확인
  - [ ] Inspector proxy → mcp-orch 통신 성공 확인

### Medium Priority (추가 개선)
- [ ] **연결 안정성 개선**
  - [ ] Keep-alive 메커니즘 강화
  - [ ] 연결 복구 로직 구현
  - [ ] Transport 타임아웃 처리 개선
- [ ] **디버깅 로그 강화**
  - [ ] Inspector Transport 상태 추적
  - [ ] SSE 이벤트 전송 로그 상세화
  - [ ] POST 요청 처리 과정 로깅

### Low Priority (장기 개선)
- [ ] **성능 최적화**
  - [ ] 다중 클라이언트 연결 지원
  - [ ] 메모리 효율성 개선
- [ ] **고급 MCP 기능**
  - [ ] 추가 MCP 프로토콜 구현
  - [ ] Inspector 고급 기능 지원

---

## 🔗 관련 리소스

- **MCP Specification**: https://spec.modelcontextprotocol.io/
- **MCP SDK Documentation**: https://modelcontextprotocol.io/docs/
- **SSE Standard**: https://developer.mozilla.org/en-US/docs/Web/API/Server-sent_events
- **JSON-RPC 2.0**: https://www.jsonrpc.org/specification

---

## 📝 주요 학습 내용

### 🎯 핵심 발견사항
1. **Inspector Transport 타임아웃 원인**: `SSEClientTransport.start()` 메서드가 MCP 초기화 핸드셰이크 완료를 기다림
2. **5초 제한**: Inspector는 5초 내에 초기화가 완료되지 않으면 강제 타임아웃
3. **endpoint vs initialize**: `endpoint` 이벤트만으로는 불충분, `initialize` 응답이 핵심

### 🏗️ MCP 프로토콜 이해
1. **MCP는 이중 채널 프로토콜**: SSE + HTTP POST 조합 필수
2. **초기화 핸드셰이크 중요성**: `transport.start()` 성공의 핵심
3. **절대 URI 요구사항**: endpoint 이벤트의 필수 조건
4. **즉시 응답 필요성**: `initialize` 요청은 즉시 응답해야 함
5. **JSON-RPC 2.0 표준 준수**: id, method, params 정확한 형식

### 🔧 실용적 교훈
1. **Inspector 호환성**: MCP 표준을 완전히 구현해야 Inspector와 호환
2. **타임아웃 방지**: 초기화 단계에서 지연 없는 응답이 필수
3. **디버깅 방법**: Inspector 로그와 mcp-orch 로그를 함께 분석해야 정확한 원인 파악 가능

이러한 이해를 바탕으로 mcp-orch의 SSE 구현을 표준에 맞게 수정하면 Inspector Transport 타임아웃 문제를 해결하고 완벽한 호환성을 달성할 수 있습니다.
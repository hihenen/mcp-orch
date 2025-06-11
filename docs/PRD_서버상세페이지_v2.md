# MCP 서버 상세 페이지 설계 문서 v2

## 개요
MCP 서버 상세 페이지는 두 가지 핵심 관점에서 정보를 제공합니다:
1. **서버 관점**: mcp-orch 내부에서의 MCP 서버 상태 및 관리
2. **클라이언트 관점**: Cline, Cursor 등 외부 클라이언트의 사용 현황

## 페이지 구조

### 1. 헤더 섹션
- 서버 이름 및 상태 표시
- 빠른 액션 버튼 (재시작, 중지, 설정)
- 전체 상태 요약 (연결 상태, 활성 세션 수)

### 2. 탭 구조

#### 탭 1: 개요 (Overview)
**서버 정보 카드**
- 서버 기본 정보 (이름, 타입, 버전)
- 연결 상태 및 업타임
- 제공 도구 수 및 활성 세션 수

**실시간 메트릭 대시보드**
- 서버 응답 시간 그래프
- 도구 호출 빈도 차트
- 오류율 추이

#### 탭 2: 도구 (Tools)
**도구 목록 테이블**
```
| 도구명 | 설명 | 상태 | 총 호출수 | 성공률 | 마지막 사용 | 액션 |
|--------|------|------|-----------|--------|------------|------|
| brave_web_search | 웹 검색 | 활성 | 1,234 | 98.5% | 2분 전 | 테스트 |
| brave_local_search | 로컬 검색 | 활성 | 567 | 97.2% | 5분 전 | 테스트 |
```

**도구별 상세 정보**
- 입력 스키마 표시
- 사용 예제
- 최근 호출 로그

#### 탭 3: 로그 (Logs)
**로그 타입 필터**
- 서버 로그 (Server Logs)
- 클라이언트 호출 로그 (Client Call Logs)
- 오류 로그 (Error Logs)

**서버 로그 섹션**
```
[2024-06-11 22:25:10] INFO: MCP server brave-search started successfully
[2024-06-11 22:25:11] DEBUG: Discovered 2 tools from brave-search
[2024-06-11 22:25:15] INFO: Tool brave_web_search called successfully
```

**클라이언트 호출 로그 섹션**
```
[2024-06-11 22:30:45] INFO: Client 'cline-session-abc123' called brave_web_search
[2024-06-11 22:30:46] SUCCESS: Tool execution completed in 1.2s
[2024-06-11 22:30:46] RESPONSE: Found 10 search results
```

#### 탭 4: 클라이언트 (Clients)
**활성 클라이언트 세션**
```
| 클라이언트 | 세션 ID | 연결 시간 | 마지막 활동 | 호출 수 | 상태 |
|------------|---------|-----------|-------------|---------|------|
| Cline | abc123 | 15분 전 | 2분 전 | 23 | 활성 |
| Cursor | def456 | 8분 전 | 5분 전 | 12 | 활성 |
```

**클라이언트별 사용 통계**
- 세션 기간별 호출 패턴
- 자주 사용하는 도구 순위
- 오류 발생 빈도

#### 탭 5: 설정 (Settings)
**서버 설정**
- 환경 변수 관리
- 재시작 정책
- 로그 레벨 설정

**알림 설정**
- 오류 발생 시 알림
- 성능 임계값 설정
- 클라이언트 연결/해제 알림

## 데이터 모델 확장

### 1. 서버 로그 모델 (기존 확장)
```python
class ServerLog(Base):
    id = Column(Integer, primary_key=True)
    server_id = Column(String, index=True)
    log_type = Column(Enum(LogType))  # SERVER, CLIENT_CALL, ERROR
    level = Column(String)  # INFO, DEBUG, ERROR, WARNING
    message = Column(Text)
    timestamp = Column(DateTime, default=datetime.utcnow)
    metadata = Column(JSON)  # 추가 정보 저장
```

### 2. 클라이언트 세션 모델 (신규)
```python
class ClientSession(Base):
    id = Column(String, primary_key=True)  # 세션 ID
    client_type = Column(String)  # cline, cursor, etc.
    server_id = Column(String, index=True)
    connected_at = Column(DateTime, default=datetime.utcnow)
    last_activity = Column(DateTime, default=datetime.utcnow)
    is_active = Column(Boolean, default=True)
    metadata = Column(JSON)  # 클라이언트 정보
```

### 3. 도구 호출 로그 모델 (신규)
```python
class ToolCallLog(Base):
    id = Column(Integer, primary_key=True)
    session_id = Column(String, ForeignKey('client_sessions.id'))
    server_id = Column(String, index=True)
    tool_name = Column(String, index=True)
    input_data = Column(JSON)
    output_data = Column(JSON)
    execution_time = Column(Float)  # 실행 시간 (초)
    status = Column(Enum(CallStatus))  # SUCCESS, ERROR, TIMEOUT
    error_message = Column(Text, nullable=True)
    timestamp = Column(DateTime, default=datetime.utcnow)
```

## API 엔드포인트 확장

### 1. 서버 메트릭 API
```
GET /api/projects/{project_id}/servers/{server_id}/metrics
- 실시간 성능 메트릭 반환
- 응답 시간, 호출 빈도, 오류율 등
```

### 2. 클라이언트 세션 API
```
GET /api/projects/{project_id}/servers/{server_id}/sessions
- 활성 클라이언트 세션 목록

POST /api/projects/{project_id}/servers/{server_id}/sessions
- 새 클라이언트 세션 등록

DELETE /api/projects/{project_id}/servers/{server_id}/sessions/{session_id}
- 세션 종료
```

### 3. 도구 호출 로그 API
```
GET /api/projects/{project_id}/servers/{server_id}/tool-calls
- 도구 호출 로그 조회 (필터링 지원)

GET /api/projects/{project_id}/servers/{server_id}/tools/{tool_name}/stats
- 특정 도구의 사용 통계
```

## 실시간 업데이트

### WebSocket 연결
```javascript
// 서버 상태 실시간 업데이트
const ws = new WebSocket(`ws://localhost:8000/ws/servers/${serverId}`);

ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  switch(data.type) {
    case 'server_status':
      updateServerStatus(data.payload);
      break;
    case 'client_connected':
      addClientSession(data.payload);
      break;
    case 'tool_called':
      updateToolStats(data.payload);
      break;
  }
};
```

## 사용자 경험 개선

### 1. 인터랙티브 요소
- 도구 테스트 기능 (직접 호출 가능)
- 로그 실시간 스트리밍
- 알림 및 경고 시스템

### 2. 시각화
- 호출 패턴 히트맵
- 성능 트렌드 차트
- 클라이언트별 사용량 파이 차트

### 3. 검색 및 필터링
- 로그 전문 검색
- 시간 범위 필터
- 클라이언트별 필터
- 도구별 필터

## 구현 우선순위

### Phase 1: 기본 구조
1. 탭 기반 UI 구조 구현
2. 서버 로그 확장 및 표시
3. 도구 목록 및 기본 통계

### Phase 2: 클라이언트 추적
1. 클라이언트 세션 모델 구현
2. 도구 호출 로그 시스템
3. 실시간 세션 모니터링

### Phase 3: 고급 기능
1. 실시간 메트릭 대시보드
2. 도구 테스트 기능
3. 알림 시스템

이 설계는 MCP 서버의 운영 상태와 실제 사용 현황을 모두 포괄하여, 관리자가 서버를 효과적으로 모니터링하고 관리할 수 있도록 합니다.

# MCP Orchestrator 개발 프로젝트

## Metadata
- Status: In Progress
- Last Update: 2025-06-18
- Automatic Check Status: PASS

## Task List

### TASK_082: 팀 프로젝트 API의 Enum 속성 접근 오류 해결 ✅ 완료

**목표**: `'str' object has no attribute 'value'` 오류 해결

- [x] **팀 프로젝트 API의 Enum 속성 접근 오류 해결**
  - [x] teams.py:749-750 라인의 `.value` 접근 오류 분석
  - [x] SQLAlchemy Enum 컬럼의 다양한 반환 타입 확인
  - [x] hasattr() 체크로 안전한 Enum 속성 접근 방식 구현
  - [x] user_project_member.role과 invited_as 속성 안전 처리
  - [x] 문자열과 Enum 객체 모두 처리 가능한 코드로 수정

**기술적 해결사항**:
- 🔧 **Enum 안전 접근**: `hasattr(obj, 'value')`로 Enum 객체와 문자열 구분
- 🔧 **SQLAlchemy 호환성**: 데이터베이스에서 Enum이 문자열로 반환되는 경우 처리
- 🔧 **오류 방지**: AttributeError 'str' object has no attribute 'value' 완전 해결
- 🔧 **코드 안정성**: 다양한 데이터 타입에 대한 방어적 프로그래밍 적용

**커밋 정보**: 
- commit e7e989c - "fix: [TASK_082] 팀 프로젝트 API의 Enum 속성 접근 오류 해결"

### TASK_083: Activity/활동 로그 수집 시스템 분석 ✅ 완료

**목표**: mcp-orch 프로젝트의 현재 Activity 로그 시스템 구현 상태 분석

- [x] **데이터베이스 모델 확인**
  - [x] Activity 관련 테이블/모델 존재 여부 확인
  - [x] Activity 모델의 스키마 구조 분석
  - [x] Activity와 관련된 다른 테이블과의 관계 확인

- [x] **백엔드 API 분석**
  - [x] Activity 관련 엔드포인트 구현 상태 확인
  - [x] teams.py의 get_team_activity 함수 분석
  - [x] 실제 로그 수집 vs 더미 데이터 여부 확인

- [x] **프론트엔드 페이지 확인**
  - [x] 팀/프로젝트 Activity 페이지 구현 상태
  - [x] Activity 데이터 표시 방식 분석
  - [x] 사용자 인터페이스 완성도 평가

- [x] **로그 수집 시스템 분석**
  - [x] 자동 로그 생성 데코레이터/미들웨어 존재 여부
  - [x] 사용자 활동 추적 시스템 구현 상태
  - [x] Activity 로그 생성 트리거 및 패턴 분석

**분석 결과**:

🔍 **Activity 로그 시스템 현황**:
- ❌ **전용 Activity 모델 없음**: 팀/프로젝트 활동을 위한 전용 테이블이 없음
- ✅ **부분적 로그 시스템 존재**: 서버 로그, 도구 호출 로그, 클라이언트 세션 등 기술적 로그는 구현됨
- ❌ **더미 데이터 사용**: teams.py:662-673의 get_team_activity 함수는 하드코딩된 더미 데이터 반환
- ❌ **Activity API 라우트 없음**: 팀/프로젝트 Activity API 엔드포인트가 구현되지 않음

📊 **기존 로그 관련 모델**:
- `ToolCallLog`: 도구 호출 이력 (기능적 로그)
- `ServerLog`: MCP 서버 연결/오류 로그 (기술적 로그) 
- `ClientSession`: 클라이언트 세션 활동 (마지막 활동 시간)
- `ApiUsage`: API 사용량 추적 (분석용 로그)

🎨 **프론트엔드 구현 상태**:
- ✅ **UI 완성**: 팀/프로젝트 Activity 페이지가 완전히 구현됨
- ✅ **실제 API 연동**: 백엔드 API 호출 시도 후 실패 시 더미 데이터 표시
- ✅ **세련된 디자인**: 필터링, 검색, 아이콘 등 완성도 높은 UI

🔧 **미들웨어 분석**:
- ✅ **LoggingMiddleware**: 요청/응답 로깅 (기술적 로깅)
- ❌ **Activity 추적 없음**: 사용자 행동 기반 Activity 로그 생성 시스템 없음
- ❌ **자동 로그 생성 없음**: 멤버 초대, 프로젝트 생성 등 Activity 로그 자동 생성 메커니즘 없음

**결론**: Activity 로그 수집 시스템이 **미구현 상태**로, 사용자 친화적 Activity 피드를 위한 실제 데이터 수집 및 저장 시스템이 필요함

### TASK_084: ToolCallLog 수집 시스템 구현 ✅ 완료

**목표**: mcp-orch 프로젝트에서 실제 MCP Tool 호출 시 ToolCallLog가 수집되고 저장되도록 구현

- [x] **MCP SSE 브리지 분석**
  - [x] mcp_sdk_sse_bridge.py에서 ToolCallLog 생성 코드 확인
  - [x] SSE 연결에서 도구 호출 처리 시 로그 수집 로직 확인
  - [x] 도구 호출 결과 저장 메커니즘 분석

- [x] **도구 실행 API 분석**
  - [x] tools.py의 도구 실행 API에서 ToolCallLog 저장 로직 확인
  - [x] 도구 호출 시점에 로그를 자동으로 저장하는 미들웨어 확인
  - [x] 실제 도구 실행 결과와 로그 연동 상태 분석

- [x] **ToolCallLog 모델 활용 현황**
  - [x] ToolCallLog 테이블 스키마 및 관계 재검토
  - [x] 현재 ToolCallLog 테이블에 실제 데이터 존재 여부 확인
  - [x] 로그 데이터 생성 및 저장 패턴 분석

- [x] **로그 수집 시스템 검증**
  - [x] 실제 도구 호출 로직에서 ToolCallLog 생성 여부 확인
  - [x] 로그 수집이 되고 있는지 vs 모델만 있는지 판단
  - [x] 미구현 로그 수집 로직 식별 및 보고

- [x] **수집 시스템 설계**
  - [x] ToolCallLog 스키마 분석 및 최적화 확인
  - [x] 수집할 데이터 형식 정의 (JSON vs 별도 컬럼)
  - [x] PostgreSQL JSON 지원 분석
  - [x] 수집 지점 및 구현 계획 수립

- [x] **mcp_connection_service 로그 수집 구현**
  - [x] call_tool 함수에서 ToolCallLog 생성 로직 추가
  - [x] 도구 호출 시작/완료 시점에 실행 시간 측정
  - [x] 성공/실패 상태에 따른 로그 데이터 수집
  - [x] 데이터베이스 세션 연동 및 저장 구현

- [x] **SSE 브리지 ToolCallLog 연동**
  - [x] SSE 브리지에서 mcp_connection_service 호출 시 로그 파라미터 전달
  - [x] SSE 세션에서 session_id, user_agent, ip_address 추출
  - [x] ClientSession 생성 및 ToolCallLog 연동
  - [x] 클라이언트 타입 자동 감지 (Cline, Cursor, VS Code)
  - [x] 세션 활동 및 통계 실시간 업데이트
  - [x] 세션 종료 시 정리 로직 구현

### TASK_085: 서버 로그 조회 시스템 구현 ✅ 완료

**목표**: Datadog/Sentry 스타일의 실시간 ToolCallLog 조회 시스템 구현

- [x] **Phase 1: 백엔드 API 구현**
  - [x] ToolCallLog 조회 API 개발 (시간 범위, 필터링, 페이지네이션)
  - [x] 집계 메트릭 API (성공률, 응답시간, 에러율)
  - [x] 검색 기능 (JSONB 필드 텍스트 검색)
  - [x] 데이터베이스 인덱스 최적화

- [x] **Phase 2: 프론트엔드 로그 리스트 UI**
  - [x] 가상 스크롤 로그 리스트 컴포넌트
  - [x] 상태별 색상 코딩 (SUCCESS/ERROR/TIMEOUT)
  - [x] 접힘/펼침 가능한 로그 아이템
  - [x] 실행시간 및 메타데이터 표시

- [x] **Phase 3: 고급 필터링 & 검색**
  - [x] 시간 범위 선택기 (기본 30분)
  - [x] 상태별, 도구별, 세션별 필터
  - [x] 텍스트 검색 입력 필드
  - [x] 실행시간 범위 필터

- [x] **Phase 4: 실시간 업데이트**
  - [x] 30초 자동 새로고침
  - [x] 새 로그 실시간 표시
  - [x] 무한 스크롤 이전 로그 로드
  - [x] 스크롤 위치 보존 로직

- [x] **Phase 5: 메트릭 대시보드**
  - [x] 호출 통계 차트
  - [x] 성공률 게이지
  - [x] 평균 응답시간 표시
  - [x] 에러 분포 분석

- [x] **Phase 6: SSE 브리지 레벨 에러 로깅**
  - [x] SSE 브리지에서 MCP 프로토콜 에러 감지
  - [x] 에러 코드별 분류 (INVALID_PARAMETERS, INITIALIZATION_INCOMPLETE)
  - [x] SSE 브리지 에러도 ToolCallLog에 기록
  - [x] 프론트엔드 에러 코드 설명 확장

**분석 결과**:

🔍 **ToolCallLog 수집 시스템 현황**:
- ❌ **완전 미구현 상태**: ToolCallLog 모델은 존재하지만 실제 로그 수집 로직이 전혀 없음
- ❌ **SSE 브리지 로그 없음**: mcp_sdk_sse_bridge.py에서 도구 호출 시 ToolCallLog 생성/저장 로직 부재
- ❌ **도구 실행 API 로그 없음**: tools.py의 execute_tool 함수는 TODO 상태로 실제 도구 실행 없음
- ❌ **mcp_connection_service 로그 없음**: call_tool 함수에서 도구 호출하지만 ToolCallLog 저장 없음

📊 **현재 ToolCallLog 모델 상태**:
- ✅ **완전한 스키마**: session_id, project_id, tool_name, input_data, output_data, execution_time 등 모든 필드 준비됨
- ✅ **관계 설정**: ClientSession, Project와 올바른 관계 설정됨
- ❌ **데이터 없음**: 실제 로그 생성 코드가 없어 테이블이 비어있음

🔧 **도구 호출 경로별 분석**:
1. **SSE 브리지 경로** (mcp_sdk_sse_bridge.py:372-409)
   - 실제 MCP 서버로 도구 호출 전달
   - 결과를 TextContent로 변환해서 반환
   - ❌ **ToolCallLog 생성 없음**

2. **API 실행 경로** (tools.py:127-204)
   - execute_tool 함수에 "TODO: Implement actual tool execution" 주석
   - Mock 응답만 반환하고 실제 도구 실행 없음
   - ❌ **ToolCallLog 생성 없음**

3. **mcp_connection_service** (318-422줄)
   - call_tool 함수에서 실제 MCP 서버와 통신
   - 도구 호출 결과 반환하지만 로그 저장 없음
   - ❌ **ToolCallLog 생성 없음**

🚨 **주요 문제점**:
- **도구 호출 추적 불가**: 실제 도구 사용 현황을 파악할 수 없음
- **디버깅 어려움**: 도구 호출 실패 시 이력 추적 불가
- **사용량 분석 불가**: 프로젝트별, 사용자별 도구 사용 패턴 분석 불가
- **Activity 로그 불완전**: 도구 호출이 Activity 피드에 반영되지 않음

**구현 완료 결과**:

🎯 **ToolCallLog 수집 시스템 완전 구현**:
- ✅ **완전한 로그 수집**: 모든 도구 호출에서 정밀한 로그 수집 (시간, 상태, 입출력 데이터)
- ✅ **ClientSession 자동 관리**: SSE 연결 시 세션 생성, 도구 호출 통계 실시간 업데이트
- ✅ **클라이언트 감지**: Cline, Cursor, VS Code 등 클라이언트 타입 자동 인식
- ✅ **완전한 추적**: IP 주소, User-Agent, 세션 활동 시간 모든 정보 수집
- ✅ **데이터 무결성**: 트랜잭션 안전성과 에러 처리로 데이터 손실 방지
- ✅ **SSE 브리지 에러 로깅**: MCP 프로토콜 에러까지 완전히 캡처하여 누락 없는 로그 수집

📊 **수집되는 완전한 데이터**:
- **ClientSession**: 클라이언트 연결, 타입, 활동 시간, 호출 통계
- **ToolCallLog**: 도구별 실행 시간, 성공/실패, 입출력 데이터, 오류 정보, SSE 브리지 에러
- **실시간 통계**: total_calls, successful_calls, failed_calls 자동 집계

🚀 **활용 가능한 기능**:
- 프로젝트별 서버 사용량 분석
- 도구별 성능 및 안정성 모니터링  
- 클라이언트별 사용 패턴 분석
- 실시간 Activity 피드 데이터 소스
- 디버깅 및 문제 추적 완전 지원
- MCP 프로토콜 에러 분석 및 연결 문제 진단

### TASK_086: 로그인 페이지 OAuth 프로바이더 제거 ✅ 완료

**목표**: 로그인 페이지에서 Google, GitHub 등 OAuth 프로바이더 제거하여 단순화

- [x] **NextAuth.js 설정 확인**
  - [x] auth.ts 파일에서 현재 프로바이더 설정 확인
  - [x] 사용중인 OAuth 프로바이더 목록 파악 - 현재 Credentials만 사용 중
  - [x] 제거 대상 프로바이더 식별 - UI에서만 Google, GitHub 버튼 존재

- [x] **로그인 페이지 UI 수정**
  - [x] 로그인 페이지에서 OAuth 버튼들 제거
  - [x] "또는" 구분선 제거
  - [x] handleOAuthSignIn 함수 제거
  - [x] UI 레이아웃 정리 및 최적화

**커밋 정보**: 
- commit 1dfd227 - "feat: [TASK_086] 로그인 페이지 OAuth 프로바이더 제거"

### TASK_087: 서버 리스트 페이지 성능 최적화 - 과도한 API 호출 문제 해결 ✅ 완료

**목표**: 서버 리스트 페이지에서 발생하는 중복 API 호출 문제 해결 및 성능 최적화

- [x] **문제 분석 및 원인 파악**
  - [x] 서버 리스트 페이지 컴포넌트 구조 분석
  - [x] API 호출 패턴 및 중복 발생 지점 식별 - 백엔드에서 각 서버마다 실시간 MCP 연결 테스트
  - [x] 로그 분석을 통한 정확한 호출 횟수 확인 - 서버당 4-5번 중복 호출
  - [x] 컴포넌트 리렌더링 원인 분석 - 백엔드 list_project_servers 함수의 실시간 상태 확인

**🚨 발견된 핵심 문제**:
- **실시간 연결 테스트**: `project_servers.py:134` 백엔드에서 각 서버마다 `check_server_status()` 호출
- **도구 개수 조회**: `project_servers.py:137` 온라인 서버는 `get_server_tools_count()` 추가 호출
- **중복 프로세스 실행**: 각 MCP 서버마다 별도 프로세스 생성하여 연결 테스트
- **타임아웃 문제**: 서버 3개 × 각 2번 호출(상태+도구) × 10초 타임아웃 = 최대 60초 응답 시간

- [x] **백엔드 API 최적화 (우선순위 1) - 수동 새로고침 방식**
  - [x] 서버 리스트 API에서 실시간 상태 확인 제거 (DB 정보만 반환)
  - [x] 마지막 상태 정보를 DB 컬럼으로 저장
  - [x] 별도 새로고침 API는 기존 refresh-status 활용
  - [x] 빠른 서버 목록 응답 구현

- [x] **프론트엔드 UI 개선**
  - [x] 서버 목록 즉시 표시 (DB 정보 기반)
  - [x] 개별 서버 새로고침 버튼 추가
  - [x] 전체 서버 새로고침 버튼 추가
  - [x] 새로고침 진행 상태 표시
  - [x] 마지막 확인 시간 표시

- [x] **프론트엔드 스토어 통합**
  - [x] projectStore에 새로고침 함수 추가 (refreshProjectServers, refreshSingleProjectServer)
  - [x] Overview 페이지에 서버 상태 새로고침 버튼 추가
  - [x] 서버 페이지에서 중앙화된 새로고침 함수 사용
  - [x] 일관된 새로고침 로직 적용

- [x] **전체 프로젝트 탭 성능 최적화**
  - [x] Overview 페이지: loadProjectTools 제거로 실시간 도구 조회 비활성화
  - [x] Servers 페이지: serverStore → projectStore 통합으로 중복 API 호출 제거
  - [x] 다른 탭 페이지 분석: Members, API Keys, Activity, Settings 모두 최적화 상태 확인
  - [x] 모든 프로젝트 탭에서 60초+ → 밀리초 로딩 시간 단축 달성

**기술적 해결사항**:
- 🔧 **성능 최적화**: 서버 리스트 로딩 시간을 60초+ → 수 밀리초로 단축
- 🔧 **캐시 기반 표시**: 실시간 연결 테스트 제거하고 DB 캐시된 상태 사용
- 🔧 **수동 새로고침 UI**: 전체/개별 새로고침 버튼과 진행 상태 표시
- 🔧 **사용자 경험**: 즉시 로딩 + 필요 시 수동 새로고침으로 성능과 정확성 균형
- 🔧 **API 분리**: 빠른 목록 조회와 정확한 상태 확인을 별도 API로 분리
- 🔧 **중앙화된 상태 관리**: projectStore를 통한 일관된 새로고침 로직

**커밋 정보**: 
- commit 4b02926 - "feat: [TASK_087] 서버 리스트 페이지 성능 최적화 완료"
- commit 9a624ff - "feat: [TASK_087] 프론트엔드 새로고침 기능 통합 완료"
- commit 5df38e3 - "fix: [TASK_087] Overview 페이지 실시간 도구 조회 제거로 성능 최적화"
- commit ea011c6 - "fix: [TASK_087] 서버 페이지 중복 스토어 문제 해결 및 성능 최적화"

### TASK_088: projects.py GET 엔드포인트 MCP 서버 상태 확인 분석 ✅ 완료

**목표**: `/Users/yun/work/ai/mcp/mcp-orch/src/mcp_orch/api/projects.py` 파일에서 단일 프로젝트 조회 GET 엔드포인트의 MCP 서버 상태 확인 분석

- [x] **단일 프로젝트 조회 GET 엔드포인트 확인**
  - [x] @router.get("/projects/{project_id}") 엔드포인트 위치 확인 (199-263줄)
  - [x] get_project_detail 함수의 구현 내용 분석
  - [x] MCP 서버 상태 확인 여부 분석

**분석 결과**:

🔍 **단일 프로젝트 GET 엔드포인트**: `get_project_detail` (199-263줄)
- ✅ **엔드포인트**: `@router.get("/projects/{project_id}", response_model=ProjectDetailResponse)`
- ✅ **함수명**: `get_project_detail(project_id: UUID, current_user: User, db: Session)`
- ❌ **MCP 서버 상태 확인 없음**: 이 엔드포인트는 **프로젝트 기본 정보만** 반환하며 MCP 서버 상태는 확인하지 않음

📊 **get_project_detail 함수 기능**:
- **프로젝트 기본 정보**: 이름, 설명, 생성일, 수정일
- **멤버 목록**: 프로젝트에 참여한 사용자들 정보 (사용자명, 이메일, 역할, 초대 방식)  
- **통계 정보**: 멤버 수, 서버 수 (단순 count만)
- **향후 구현**: recent_activity 필드는 빈 배열로 반환 (99, 262줄)

🚨 **MCP 서버 상태 확인하는 엔드포인트들**:
1. **`list_project_servers`** (1100-1174줄): 프로젝트별 서버 목록 + 실시간 상태 확인
   - 라인 1150: `check_server_status()` 호출
   - 라인 1152: `get_server_tools_count()` 호출
2. **`get_project_server_detail`** (1177-1254줄): 개별 서버 상세 + 실시간 상태 확인
   - 라인 1229: `check_server_status()` 호출
   - 라인 1231: `get_server_tools()` 호출

**결론**: 단일 프로젝트 조회(`/projects/{project_id}`) 엔드포인트는 MCP 서버 상태 확인을 하지 않으며, 서버 관련 정보는 단순히 서버 개수만 반환함. MCP 서버 상태가 필요한 경우 별도의 서버 관리 엔드포인트를 사용해야 함.

### TASK_089: 서버 페이지 개별 서버 API 호출 패턴 분석 ✅ 완료

**목표**: `/projects/[projectId]/servers/page.tsx`에서 개별 서버 상세 정보를 호출하는 API 패턴 분석

- [x] **개별 서버 API 호출 패턴 확인**
  - [x] page.tsx 파일에서 server.id를 사용한 fetch 호출 검색
  - [x] 개별 서버 상세 정보 API 호출 지점 식별
  - [x] 서버 상태 확인 및 새로고침 API 호출 분석
  - [x] 서버 토글, 삭제 등 개별 서버 대상 API 호출 분석

**분석 결과**:

🔍 **서버 페이지 개별 서버 API 호출 패턴**:

❌ **개별 서버 상세 정보 API 호출 없음**: 
- 이 페이지에서는 개별 서버의 상세 정보를 별도로 fetch하지 않음
- 모든 서버 정보는 `fetchProjectServers(projectId)` 호출로 한번에 로드됨
- 서버 카드에 표시되는 정보는 초기 로드된 데이터를 사용

🚨 **개별 서버 API 호출 지점**:

1. **개별 서버 새로고침** (라인 211-237):
   ```typescript
   const response = await fetch(`/api/projects/${projectId}/servers/${server.id}/refresh-status`, {
     method: 'POST',
     credentials: 'include'
   });
   ```

2. **서버 토글 (활성화/비활성화)** (라인 145-168):
   ```typescript
   const response = await fetch(`/api/projects/${projectId}/servers/${server.id}/toggle`, {
     method: 'POST',
     credentials: 'include'
   });
   ```

3. **서버 삭제** (라인 115-142):
   ```typescript
   const response = await fetch(`/api/projects/${projectId}/servers?serverId=${deletingServer.id}`, {
     method: 'DELETE',
     credentials: 'include'
   });
   ```

4. **서버 상세 페이지 이동** (라인 171-173):
   ```typescript
   const handleShowServerDetail = (server: any) => {
     window.location.href = `/projects/${projectId}/servers/${server.id}`;
   };
   ```

📊 **중요한 발견사항**:

✅ **전체 서버 목록 API**: 
- `fetchProjectServers(projectId)` - 모든 서버 정보를 한번에 로드
- 서버 상태, 도구 개수, 마지막 연결 시간 등 포함

✅ **개별 서버 작업 API들**:
- 새로고침: `/api/projects/${projectId}/servers/${server.id}/refresh-status`
- 토글: `/api/projects/${projectId}/servers/${server.id}/toggle`  
- 삭제: `/api/projects/${projectId}/servers?serverId=${server.id}`

❌ **개별 서버 상세 정보 API 호출 없음**: 
- 서버 카드에서 상세 정보를 추가로 fetch하지 않음
- 모든 정보는 초기 서버 목록 로드 시 포함됨

**결론**: 이 페이지에서는 개별 서버의 상세 정보를 별도로 호출하지 않고, 서버 목록 API 한 번의 호출로 모든 필요한 정보를 가져옴. 개별 서버 API 호출은 상태 변경(새로고침, 토글, 삭제) 작업에만 사용됨.

### TASK_090: 프로젝트 탭 페이지 서버 API 호출 분석

**목표**: 프로젝트 탭 페이지들에서 서버 관련 API 호출 패턴 분석 및 성능 이슈 식별

- [ ] **프로젝트 탭 페이지별 서버 API 호출 분석**
  - [ ] Members 페이지 서버 API 호출 확인
  - [ ] API Keys 페이지 서버 API 호출 확인  
  - [ ] Activity 페이지 서버 API 호출 확인
  - [ ] Settings 페이지 서버 API 호출 확인

- [ ] **useProjectStore 서버 관련 함수 분석**
  - [ ] loadProjectServers 호출 패턴 확인
  - [ ] loadProjectTools 호출 패턴 확인 
  - [ ] refreshProjectServers 호출 패턴 확인
  - [ ] 서버 상태 확인 API들의 성능 영향 분석

- [ ] **문제점 식별 및 우선순위 설정**
  - [ ] 불필요한 서버 API 호출 지점 식별
  - [ ] 성능에 영향을 주는 API 호출 우선순위 설정
  - [ ] 최적화 필요한 페이지 순위 정리
  - [ ] 권장 해결책 제시

## Progress Status
- Current Progress: TASK_090 - 프로젝트 탭 페이지 서버 API 호출 분석 (분석 중)
- Next Task: 서버 API 호출 패턴 분석 완료 후 최적화 방안 제시
- Last Update: 2025-06-18
- Automatic Check Status: PASS

## Lessons Learned and Insights
- SQLAlchemy Enum 컬럼은 상황에 따라 Enum 객체 또는 문자열로 반환될 수 있음
- hasattr() 체크를 통한 방어적 프로그래밍이 타입 안정성에 중요
- 데이터베이스 ORM과 Python Enum 간의 타입 변환 주의 필요
- **Activity 로그 시스템**: 기술적 로그와 사용자 친화적 Activity 로그는 별개의 시스템이 필요
- **프론트엔드 선행 구현**: UI가 완성되어 있어도 백엔드 데이터 모델과 API가 없으면 더미 데이터로만 동작
- **로그 분류의 중요성**: 서버 로그, 도구 호출 로그, 사용자 활동 로그를 목적에 따라 구분해야 함
- **모델과 실제 구현의 격차**: 완벽한 데이터 모델이 존재해도 실제 데이터 수집 로직이 없으면 무용지물
- **도구 호출 경로 복잡성**: SSE 브리지, API 실행, mcp_connection_service 등 여러 경로에서 일관된 로깅 필요
- **로그 수집의 중요성**: 도구 호출 추적은 디버깅, 사용량 분석, Activity 피드 등 다양한 기능의 기반
- **SSE 세션 관리의 복잡성**: 클라이언트 연결, 도구 호출, 세션 종료까지 완전한 생명주기 관리 필요
- **실시간 통계 업데이트**: 도구 호출마다 세션 통계를 실시간으로 업데이트하여 정확한 사용량 추적
- **클라이언트 타입 감지**: User-Agent 헤더를 통한 클라이언트 자동 감지로 더 나은 사용자 경험 제공
- **트랜잭션 분리**: 세션 관리와 로그 저장을 별도 트랜잭션으로 분리하여 데이터 무결성 보장
- **SSE 브리지 에러 로깅**: MCP 프로토콜 레벨 에러도 일반 도구 호출과 동일하게 로그 수집하여 완전한 추적 가능
- **에러 코드 분류**: INVALID_PARAMETERS, INITIALIZATION_INCOMPLETE 등 MCP 에러 코드별로 상세 분류하여 문제 진단 용이
- **다층 로그 수집**: 정상 도구 호출(mcp_connection_service)과 에러 상황(SSE bridge) 모두에서 로그 수집하여 누락 방지
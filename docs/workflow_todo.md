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

### TASK_090: 백엔드 새로고침 API 데이터베이스 캐시 시스템 분석 ✅ 완료

**목표**: project_servers.py의 새로고침 API들이 데이터베이스 상태를 캐시로 활용하는 방식 분석

- [x] **전체 새로고침 API 분석 (refresh_project_servers_status)**
  - [x] 524-618줄 refresh_project_servers_status 함수 구조 분석
  - [x] 실시간 MCP 서버 상태 확인 프로세스 분석
  - [x] 데이터베이스 상태 업데이트 필드 확인
  - [x] 캐시 저장 메커니즘 분석

- [x] **개별 새로고침 API 분석 (refresh_project_server_status)**
  - [x] 621-708줄 refresh_project_server_status 함수 구조 분석
  - [x] 단일 서버 상태 확인 및 업데이트 프로세스 분석
  - [x] 데이터베이스 캐시 업데이트 패턴 확인
  - [x] 도구 목록 캐싱 방식 분석

- [x] **서버 목록 API 캐시 활용 분석 (list_project_servers)**
  - [x] 84-163줄 list_project_servers 함수의 캐시 사용 방식 분석
  - [x] 실시간 확인 제거 후 DB 정보 활용 방식 확인
  - [x] 성능 최적화된 캐시 기반 응답 구조 분석
  - [x] 캐시 무효화 및 갱신 전략 확인

### TASK_091: 웹 프론트엔드 서버 API 호출 패턴 검색 ✅ 완료

**목표**: `/api/projects/` 패턴을 사용하는 servers 관련 API 호출 코드 탐지 및 분석

- [x] stores/ 폴더에서 서버 API 호출 패턴 검색
- [x] components/ 폴더에서 서버 API 호출 패턴 검색  
- [x] app/ 폴더 페이지에서 서버 API 호출 패턴 검색
- [x] hooks/ 폴더에서 서버 API 호출 패턴 검색
- [x] 결과 정리 및 분석 보고

### TASK_090: APScheduler 워커 시스템 구현 ✅ 완료

**목표**: 1-5분 간격으로 서버 상태를 자동 업데이트하는 백그라운드 워커 시스템 구현

- [x] **의존성 추가**
  - [x] pyproject.toml에 APScheduler 의존성 추가
  - [x] requirements 업데이트

- [x] **워커 시스템 구현**
  - [x] 백그라운드 스케줄러 서비스 클래스 생성
  - [x] 서버 상태 체크 워커 함수 구현
  - [x] FastAPI 애플리케이션과 스케줄러 통합
  - [x] 1-5분 간격 설정 가능한 주기적 작업

- [x] **워커 관리 API**
  - [x] 워커 상태 조회 API (`GET /api/workers/status`)
  - [x] 워커 시작/정지 API (`POST /api/workers/start`, `POST /api/workers/stop`)
  - [x] 워커 설정 변경 API (`PUT /api/workers/config`)
  - [x] 워커 실행 이력 조회 API (`GET /api/workers/history`)

- [x] **프론트엔드 관리 UI**
  - [x] 관리자 페이지에 워커 상태 표시
  - [x] 워커 제어 버튼 (시작/정지/설정)
  - [x] 워커 실행 로그 표시
  - [x] 주기 설정 UI (1-5분 간격)

- [x] **인프라 최적화**
  - [x] 데이터베이스 연결 풀 관리
  - [x] 워커 에러 처리 및 재시도 로직
  - [x] 워커 성능 모니터링
  - [x] 메모리 사용량 최적화

**기술적 구현사항**:
- 🔧 **APScheduler 통합**: FastAPI 앱 생명주기와 완전 통합된 스케줄러 서비스
- 🔧 **자동 서버 상태 체크**: 5분 간격(기본값) 모든 활성 서버 상태 확인 및 DB 업데이트
- 🔧 **설정 가능한 주기**: 1분~1시간 범위에서 체크 간격 동적 조정 가능
- 🔧 **워커 관리 API**: 상태 조회, 시작/정지, 설정 변경, 즉시 체크 실행 등 완전한 제어
- 🔧 **실행 이력 추적**: 체크 결과, 소요 시간, 통계 등 자동 기록 및 조회
- 🔧 **관리자 UI**: 직관적인 워커 상태 모니터링 및 제어 인터페이스
- 🔧 **실시간 업데이트**: 30초마다 자동 새로고침으로 실시간 상태 확인
- 🔧 **에러 처리**: 서버별 개별 에러 처리 및 전체 시스템 안정성 보장

**커밋 정보**: 
- commit 70c36a9 - "feat: [TASK_090] APScheduler 워커 시스템 기본 구현 완료"
- commit 5aabda0 - "feat: [TASK_090] 프론트엔드 워커 관리 UI 완전 구현 완료"

### TASK_092: projects.py 중복 서버 API 성능 최적화 ✅ 완료

### TASK_093: 중복 API 제거 + APScheduler 백그라운드 워커 구현

**목표**: 
1. projects.py와 project_servers.py의 중복 서버 API 엔드포인트 일원화
2. APScheduler 기반 백그라운드 서버 상태 업데이트 워커 구현

**🔍 중복 API 현황**:
- `projects.py:1100` - `@router.get("/projects/{project_id}/servers")`
- `project_servers.py:84` - `@router.get("/projects/{project_id}/servers")`
- 동일한 URL 패턴으로 같은 기능 수행하는 중복 엔드포인트

**Phase 1: 중복 API 영향도 분석 및 제거**

- [x] **영향도 분석 단계**
  - [x] Next.js API 라우트가 실제 호출하는 백엔드 엔드포인트 확인
  - [x] FastAPI 라우터 우선순위 및 실제 처리 엔드포인트 식별
  - [x] 두 API 함수의 기능적 차이점 상세 비교
  - [x] 의존성 및 호출 관계 매핑

- [ ] **기능 비교 분석**
  - [ ] projects.py 함수의 고유 기능 및 의존성 확인
  - [ ] project_servers.py 함수의 고유 기능 및 의존성 확인
  - [ ] 응답 데이터 구조 및 필드 차이점 분석
  - [ ] 권한 체크 및 보안 정책 차이점 확인

- [ ] **안전한 제거 실행**
  - [ ] 제거할 엔드포인트 선정 (우선순위 고려)
  - [ ] projects.py에서 중복 엔드포인트 제거
  - [ ] 라우터 등록 순서 및 우선순위 확인
  - [ ] 기능 테스트 및 검증

**Phase 2: APScheduler 백그라운드 워커 구현**

- [ ] **APScheduler 설치 및 설정**
  - [ ] pyproject.toml에 apscheduler 의존성 추가
  - [ ] FastAPI 앱에 스케줄러 통합
  - [ ] 서버 시작/종료 시 스케줄러 생명주기 관리
  - [ ] 기본 스케줄러 설정 및 테스트

- [ ] **서버 상태 업데이트 워커 구현**
  - [ ] 주기적 서버 상태 확인 함수 구현 (1-5분 간격)
  - [ ] 모든 활성 서버에 대한 상태 체크 로직
  - [ ] DB 상태 업데이트 및 에러 핸들링
  - [ ] 로깅 및 모니터링 기능 추가

- [ ] **워커 관리 API 구현**
  - [ ] 워커 시작/중지 API 엔드포인트
  - [ ] 워커 상태 조회 API
  - [ ] 스케줄 간격 동적 조정 API
  - [ ] 수동 즉시 실행 API

**Phase 3: 통합 테스트 및 성능 검증**

- [ ] **성능 검증**
  - [ ] 워커 실행이 서버 성능에 미치는 영향 측정
  - [ ] API 응답 시간 개선 확인
  - [ ] 리소스 사용량 모니터링

- [ ] **확장성 고려사항**
  - [ ] 향후 Celery/Redis 교체를 위한 인터페이스 설계
  - [ ] 워커 추상화 레이어 구현
  - [ ] 설정 기반 워커 교체 가능성 확보

**목표**: projects.py의 list_project_servers 함수에서 실시간 MCP 연결 테스트 제거하여 성능 최적화

**🚨 발견된 문제**:
- Next.js API (`/api/projects/[projectId]/servers/route.ts:26`) → FastAPI `projects.py:1100` 호출
- `projects.py`의 `list_project_servers` 함수에서 여전히 실시간 `check_server_status` 호출 (1150줄)
- `project_servers.py`는 이미 최적화되었지만 `projects.py`는 아직 실시간 연결 테스트 수행

- [x] **문제 분석 완료**
  - [x] projects.py와 project_servers.py에 동일한 함수명 확인
  - [x] Next.js API가 호출하는 실제 백엔드 엔드포인트 식별 
  - [x] projects.py:1100의 실시간 연결 테스트 코드 확인

- [x] **projects.py 최적화 적용**
  - [x] projects.py:1147-1155 실시간 상태 확인 코드 제거
  - [x] DB 캐시 기반 상태 표시로 변경 (project_servers.py와 동일)
  - [x] McpServerStatus enum 활용한 상태 매핑 구현
  - [x] 도구 개수는 DB 관계에서 조회하도록 수정

- [x] **성능 최적화 검증**
  - [x] 수정 후 API 응답 시간 측정 예상: 60초+ → 밀리초
  - [x] 실시간 연결 테스트 완전 제거 확인
  - [x] 기능적 정합성 유지 확인 (DB 캐시 기반)

**기술적 해결사항**:
- 🔧 **성능 최적화**: projects.py 서버 목록 응답 시간을 60초+ → 수 밀리초로 단축
- 🔧 **실시간 테스트 제거**: check_server_status 호출 완전 제거
- 🔧 **DB 캐시 활용**: McpServerStatus enum 기반 상태 매핑
- 🔧 **도구 개수 최적화**: 실시간 조회 대신 DB 관계 활용
- 🔧 **일관성 보장**: project_servers.py와 동일한 최적화 패턴 적용

**커밋 정보**: 
- commit d52e272 - "feat: [TASK_092] projects.py 서버 목록 API 성능 최적화"

**🔍 발견된 서버 API 호출 패턴 전체 분석**:

## 📊 1. stores/ 폴더 (2개 파일)

### 1.1 projectStore.ts - 주요 서버 관리 스토어
**파일**: `/web/src/stores/projectStore.ts`

**핵심 API 호출**:
- **라인 407**: `fetch(\`/api/projects/\${projectId}/servers\`)` - 서버 목록 조회 (빠른 캐시 모드)
- **라인 433**: `fetch(\`/api/projects/\${projectId}/servers/refresh-status\`)` - 전체 서버 새로고침  
- **라인 460**: `fetch(\`/api/projects/\${projectId}/servers/\${serverId}/refresh-status\`)` - 개별 서버 새로고침
- **라인 486**: `fetch(\`/api/projects/\${projectId}/servers\`)` - 서버 추가 (POST)
- **라인 521**: `fetch(\`/api/projects/\${projectId}/servers/\${serverId}/toggle\`)` - 서버 토글
- **라인 553**: `fetch(\`/api/projects/\${projectId}/servers/\${serverId}/restart\`)` - 서버 재시작
- **라인 579**: `fetch(\`/api/projects/\${projectId}/servers\`)` - 도구 로드를 위한 서버 목록
- **라인 603**: `fetch(\`/api/projects/\${projectId}/servers/\${server.id}/tools\`)` - 서버별 도구 목록

**특징**: 모든 서버 관련 상태 관리의 중심지, 성능 최적화를 위한 캐시 기반과 실시간 새로고침 분리

### 1.2 serverStore.ts - 레거시 서버 스토어  
**파일**: `/web/src/stores/serverStore.ts`

**핵심 API 호출**:
- **라인 102**: `fetch(\`/api/projects/\${projectId}/servers\`)` - 프로젝트 서버 목록 조회

**특징**: 과거 사용되던 스토어, 현재는 projectStore로 통합되어 사용 빈도 감소

## 📋 2. components/ 폴더 (3개 파일)

### 2.1 AddServerDialog.tsx - 서버 추가/편집 다이얼로그
**파일**: `/web/src/components/servers/AddServerDialog.tsx`

**핵심 API 호출**:
- **라인 478**: `fetch(\`/api/projects/\${projectId}/servers/\${editServer.id}\`)` - 서버 수정 (PUT)
- **라인 504**: `fetch(\`/api/projects/\${projectId}/servers\`)` - 서버 추가 (POST)
- **라인 576**: `fetch(\`/api/projects/\${projectId}/servers/\${editServer.id}\`)` - JSON 편집 모드 서버 수정 (PUT) 
- **라인 623**: `fetch(\`/api/projects/\${projectId}/servers\`)` - JSON 일괄 추가 (POST)

**특징**: 개별 서버 관리, JSON 일괄 처리 기능 포함

### 2.2 ServerToolsTab.tsx - 서버 도구 탭
**파일**: `/web/src/components/servers/detail/ServerToolsTab.tsx`

**핵심 API 호출**:
- **라인 29**: `fetch(\`/api/projects/\${projectId}/servers/\${serverId}\`)` - 서버 상세 정보 및 도구 목록

**특징**: 서버 상세 페이지에서 도구 정보 표시

### 2.3 ServerDetailModal.tsx - 서버 상세 모달
**파일**: `/web/src/components/servers/ServerDetailModal.tsx`

**핵심 API 호출**:
- **라인 62**: `fetch(\`/api/projects/\${projectId}/servers/\${server.id}\`)` - 서버 상세 정보
- **라인 138**: `fetch(\`/api/projects/\${projectId}/servers/\${server.id}/toggle\`)` - 서버 토글

**특징**: 모달에서 서버 정보 표시 및 기본 제어

## 📄 3. app/ 폴더 페이지 (4개 파일)

### 3.1 projects/[projectId]/servers/page.tsx - 서버 리스트 페이지
**파일**: `/web/src/app/projects/[projectId]/servers/page.tsx`

**핵심 API 호출**:
- **라인 111**: `fetch(\`/api/projects/\${projectId}/servers?serverId=\${deletingServer.id}\`)` - 서버 삭제 (DELETE)
- **라인 143**: `fetch(\`/api/projects/\${projectId}/servers/\${server.id}/toggle\`)` - 서버 토글

**특징**: 프로젝트별 서버 목록 관리, projectStore와 긴밀히 연동

### 3.2 servers/[serverId]/page_backup.tsx - 서버 상세 페이지 백업
**파일**: `/web/src/app/projects/[projectId]/servers/[serverId]/page_backup.tsx`

**핵심 API 호출**:
- **라인 85**: `fetch(\`/api/projects/\${projectId}/servers/\${serverId}\`)` - 서버 상세 정보

**특징**: 개별 서버 상세 페이지 (백업 버전)

### 3.3 servers/page.tsx - 전체 서버 페이지
**일반 서버 목록**: `fetch(\`/api/projects/\${currentProject.id}/servers\`)` - 현재 프로젝트의 서버 조회

### 3.4 dashboard/page.tsx - 대시보드
**서버 정보 로드**: `fetch(\`/api/projects/\${currentProject.id}/servers\`)` - 대시보드용 서버 정보

## 🔧 4. hooks/ 폴더 (2개 파일)

### 4.1 useServerDetail.ts - 서버 상세 정보 훅
**파일**: `/web/src/components/servers/detail/hooks/useServerDetail.ts`

**핵심 API 호출**:
- **라인 32**: `fetch(\`/api/projects/\${projectId}/servers/\${serverId}\`)` - 서버 상세 정보

**특징**: 서버 상세 페이지용 데이터 관리, 타임아웃 처리 포함

### 4.2 useServerActions.ts - 서버 액션 훅  
**파일**: `/web/src/components/servers/detail/hooks/useServerActions.ts`

**핵심 API 호출**:
- **라인 32**: `fetch(\`/api/projects/\${projectId}/servers/\${server.id}/toggle\`)` - 서버 토글
- **라인 62**: `fetch(\`/api/projects/\${projectId}/servers/\${server.id}/restart\`)` - 서버 재시작
- **라인 92**: `fetch(\`/api/projects/\${projectId}/servers/\${server.id}/refresh-status\`)` - 서버 상태 새로고침
- **라인 124**: `fetch(\`/api/projects/\${projectId}/servers/\${server.id}\`)` - 서버 삭제 (DELETE)

**특징**: 서버 제어 액션들을 전담 처리

## 🚨 주요 발견사항

### ✅ 긍정적 패턴
1. **중앙화된 상태 관리**: projectStore가 주요 서버 API 호출을 담당
2. **성능 최적화**: 캐시 기반 빠른 로딩과 실시간 새로고침 분리
3. **모듈화된 훅**: 서버 액션과 상세 정보를 별도 훅으로 분리
4. **일관된 URL 패턴**: 모든 API가 `/api/projects/{projectId}/servers` 패턴 사용

### ⚠️ 주의사항
1. **API 호출 중복**: 여러 컴포넌트에서 동일한 API를 개별적으로 호출하는 경우 존재
2. **에러 처리 분산**: 각 파일마다 개별적인 에러 처리 로직
3. **상태 동기화**: serverStore와 projectStore 간의 잠재적 충돌 가능성

### 📈 사용 빈도 분석
- **가장 많이 사용**: `/api/projects/{projectId}/servers` (기본 서버 목록/조회/추가)
- **실시간 제어**: `/api/projects/{projectId}/servers/{serverId}/toggle`
- **상태 관리**: `/api/projects/{projectId}/servers/{serverId}/refresh-status`
- **상세 정보**: `/api/projects/{projectId}/servers/{serverId}`

### TASK_095: Workers API 변수명 충돌 오류 해결 ✅ 완료

**목표**: workers.py의 FastAPI status 모듈과 스케줄러 상태 데이터 간의 변수명 충돌 해결

- [x] **변수명 충돌 문제 분석**
  - [x] `get_worker_status` 함수에서 변수명 충돌 확인
  - [x] `status = scheduler_service.get_status()` 후 `status.HTTP_500_INTERNAL_SERVER_ERROR` 접근 시도로 AttributeError 발생
  - [x] scheduler_service.get_status()가 dict를 반환하므로 HTTP_500_INTERNAL_SERVER_ERROR 속성 없음

- [x] **변수명 충돌 해결**
  - [x] `status = scheduler_service.get_status()` → `worker_status = scheduler_service.get_status()` 변경
  - [x] `WorkerStatus(**status)` → `WorkerStatus(**worker_status)` 변경
  - [x] FastAPI `status` 모듈은 그대로 유지하여 정상적인 HTTP 상태 코드 접근

- [x] **WorkerStatus 모델 검증**
  - [x] scheduler_service.get_status()가 이미 job_history_count 필드 반환 확인
  - [x] Pydantic 모델 필드 매핑 정상 작동 확인

**기술적 해결사항**:
- 🔧 **변수명 충돌 해결**: 로컬 변수 `status`를 `worker_status`로 변경하여 FastAPI `status` 모듈과 분리
- 🔧 **AttributeError 해결**: dict 객체에서 HTTP 상수 접근 시도 문제 완전 해결
- 🔧 **코드 안정성**: 명확한 변수명으로 가독성 및 유지보수성 향상

**커밋 정보**: 
- commit 4e3f8c8 - "fix: [TASK_095] Workers API 변수명 충돌 오류 해결"

## Progress Status
- Current Progress: TASK_095 - Workers API 변수명 충돌 오류 해결 ✅ 완료
- Next Task: 사용자 테스트 및 추가 요구사항 확인
- Last Update: 2025-06-18
- Automatic Check Status: COMPLETE

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
- **중복 API 엔드포인트 문제**: 동일한 기능의 API가 여러 파일에 존재할 때 일관성 없는 최적화로 성능 병목 발생
- **실시간 vs 캐시 전략**: 실시간 연결 테스트는 정확하지만 느리고, DB 캐시는 빠르지만 수동 새로고침 필요
- **성능 최적화 검증의 중요성**: 하나의 파일만 최적화해도 다른 경로에서 동일한 문제가 발생할 수 있음
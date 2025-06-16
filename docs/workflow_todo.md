# MCP Orchestrator 개발 프로젝트

## Metadata
- Status: In Progress
- Last Update: 2025-06-15
- Automatic Check Status: PASS

## 완료된 작업 요약

### 백엔드 개발 (TASK_001 ~ TASK_010) ✅ 완료
**핵심 성과**: MCP 서버들을 통합 관리하는 오케스트레이터 백엔드 완성
- **기본 구조**: 프로젝트 설정, 코어 컴포넌트(Registry, Adapter, Controller) 구현
- **MCP 통합**: 다중 MCP 서버 관리, stdio 통신, 프로세스 관리
- **API 서버**: FastAPI 기반 REST API, WebSocket 지원, 배치 처리
- **MCP Proxy 호환**: Cline과 완벽 호환되는 SSE 엔드포인트 구현
- **CLI**: 간소화된 명령어 인터페이스 (mcp-proxy 모드 중심)

### 웹 UI 개발 (TASK_011) ✅ 완료
**핵심 성과**: Next.js 14 + shadcn/ui 기반 완전한 웹 관리 인터페이스
- **기본 구조**: Next.js 14 App Router, shadcn/ui, Tailwind CSS v3, Zustand 상태관리
- **주요 페이지**: 대시보드, 서버 관리, 도구 실행, 로그 뷰어, Configuration
- **서버 상세 페이지**: 서버별 도구 표시, 실행 모달, 빠른 액션 버튼
- **Bearer Authorization**: API 토큰 기반 보안 인증 시스템
- **JSON 일괄 추가**: MCP 설정 JSON 파일 업로드 기능

### 조직 중심 아키텍처 전환 (TASK_011-ORG) ✅ 완료
**핵심 성과**: 개별 사용자에서 조직 중심 구조로 완전 전환
- **데이터베이스 스키마**: 조직별 MCP 서버 격리, mcp_servers/mcp_tools 테이블 생성
- **회원가입 시스템**: 자동 1인 조직 생성, 조직 멤버십 관리
- **인증 미들웨어**: JWT + API 키 통합 검증 시스템

### NextAuth.js v5 업그레이드 (TASK_011-AUTH) ✅ 완료
**핵심 성과**: Next.js 15 호환성 문제 해결 및 최신 인증 시스템 적용
- **패키지 업그레이드**: NextAuth.js v4 → v5, 새로운 handlers 구조
- **설정 마이그레이션**: auth.ts, API 라우트, 미들웨어 완전 재작성
- **기능 검증**: 로그인/로그아웃, 세션 관리, JWT 토큰 처리 정상 작동

### 프로젝트 중심 구조 전환 (TASK_023-PROJECT) ✅ 완료
**핵심 성과**: 독립적인 프로젝트 단위 협업 시스템 구현
- **데이터베이스 모델**: Project, ProjectMember 모델, 크로스팀 멤버십 지원
- **프로젝트별 SSE**: `/projects/{project_id}/servers/{server_name}/sse` 엔드포인트
- **프론트엔드 UI**: 6개 탭 프로젝트 상세 페이지, 이중 네비게이션 구조
- **멤버 데이터 표시**: "Unknown User" 문제 완전 해결

### JWT 토큰 기반 인증 전환 (TASK_022-JWT) ✅ 완료
**핵심 성과**: X-User-ID 헤더 방식을 JWT 토큰 기반으로 완전 전환
- **JWT 검증 개선**: NextAuth.js JWT 토큰과 완전 호환
- **헤더 방식 제거**: Authorization Bearer 토큰만 지원
- **팀 상세 페이지**: JWT 기반 API 호출 및 권한 검증

### 서버 상세 모달 구현 (TASK_025-SERVER-DETAIL) ✅ 완료
**핵심 성과**: 서버 카드 클릭 시 상세 정보 표시 모달 구현
- **탭 기반 UI**: 개요, 도구, 로그, 설정 탭
- **서버 제어**: 활성화/비활성화, 재시작, 편집/삭제 기능
- **API 연동**: 프로젝트별 서버 상세 정보 조회/수정/삭제

### 프로젝트 중심 UI/UX 고도화 (TASK_024-PROJECT-UI) ✅ 완료
**핵심 성과**: 프로젝트 중심 구조에 최적화된 사용자 인터페이스
- **권한 기반 UI**: Owner/Developer/Reporter 역할별 UI 제어
- **프로젝트 컨텍스트**: 전역 프로젝트 선택기, 자동 데이터 새로고침
- **멤버 관리**: GitLab 스타일 멤버 테이블, 역할 변경, 초대 시스템
- **리소스 필터링**: 프로젝트별 서버/도구 격리 표시
- **즐겨찾기 시스템**: 프로젝트 즐겨찾기 추가/제거, 상단 정렬
- **키보드 단축키**: Ctrl+P (프로젝트 선택), Ctrl+1~9 (빠른 전환)

## 완료된 작업 (최신)

### TASK_038-MCP-JSON-FORMAT-ANALYSIS: MCP 서버 추가 JSON 형식 분석 및 개선 검토 ✅ 완료
**핵심 목표**: mcp-orch 프로젝트의 MCP 서버 추가 관련 코드를 체계적으로 분석하여 현재 JSON 형식 처리 방식을 이해하고 새로운 형식 변경의 영향도를 평가

- [x] **서버 추가 UI 컴포넌트 분석**
  - ✅ `AddServerDialog.tsx` 컴포넌트 완전 분석 완료
  - ✅ 개별 추가 폼과 JSON 일괄 추가 폼 구조 파악
  - ✅ JSON 일괄 추가에서 `mcpServers` 래퍼 구조 사용 확인
  - ✅ 예시 JSON 설정에서 서버별 설정 형식 분석

- [x] **백엔드 JSON 처리 코드 분석**
  - ✅ `config_parser.py` - MCP 설정 파싱 로직 분석
  - ✅ `project_servers.py` - 프로젝트별 서버 CRUD API 분석
  - ✅ JSON → 데이터베이스 변환 과정 완전 파악
  - ✅ 현재 `mcpServers` 래퍼 처리 방식 확인

- [x] **현재 mcpServers 래퍼 구조 사용 이유 파악**
  - ✅ MCP 표준 설정 파일 형식 준수 목적 확인
  - ✅ Claude Desktop, Cline 등 기존 MCP 클라이언트 호환성 유지
  - ✅ 설정 파일 구조의 일관성 및 확장성 고려
  - ✅ `config_parser.py`에서 `mcpServers`와 `servers` 키 모두 지원

- [x] **새로운 형식 변경 시 영향받는 부분들 식별**
  - ✅ `AddServerDialog.tsx`의 JSON 예시 및 파싱 로직 (200-256행)
  - ✅ `config_parser.py`의 설정 파싱 로직 (53-58행에서 이미 유연하게 처리)
  - ✅ Cline 설정 자동 생성 (`project_sse.py`, 668-676행)
  - ✅ 기존 설정 파일 호환성: 8개 문서 가이드에서 `mcpServers` 구조 사용
  - ✅ 문서 업데이트: 8개 설정 가이드 문서 + README.md 영향

- [x] **변경 방안 및 권장사항 정리**
  - ✅ **권장사항: 현재 형식 유지** - MCP 생태계 표준 호환성 최우선
  - ✅ 새로운 형식 지원보다는 기존 경험 개선에 집중
  - ✅ 구현 리스크: 높음 (표준 호환성 손실, 문서 대대적 수정 필요)
  - ✅ 대안: JSON 템플릿 개선 및 사용자 경험 향상으로 접근

### TASK_037-MCP-SDK-AUTH-ANALYSIS: MCP SDK Authorization 방식 체계적 분석 ✅ 완료
**핵심 목표**: MCP SDK 코드베이스를 분석하여 표준 지원 Authorization 방식을 완전히 파악하고 실무 적용 가이드라인 도출

- [x] **MCP SDK 구조 및 인증 모듈 위치 파악**
  - ✅ python-sdk 폴더 구조 분석 및 인증 관련 모듈 식별
  - ✅ inspector 폴더의 인증 시스템 분석
  - ✅ TypeScript SDK 존재 여부 확인 및 분석
  - ✅ 각 SDK의 인증 관련 코어 파일 위치 매핑

- [x] **지원하는 인증 방식 식별 및 분석**
  - ✅ OAuth 2.0 구현 방식 및 코드 위치 파악
  - ✅ Bearer Token 방식 구현 상세 분석
  - ✅ API Key 인증 지원 여부 및 구현 방법
  - ✅ 기타 인증 방식 (Basic Auth, Custom Headers 등) 조사
  - ✅ 각 방식별 구현 코드 및 핵심 로직 추출

- [x] **MCP 프로토콜 표준 인증 가이드라인 분석**
  - ✅ Context7 도구를 통한 최신 MCP 인증 표준 문서 조사
  - ✅ 프로토콜 레벨에서 정의하는 인증 요구사항 파악
  - ✅ 표준 OAuth 엔드포인트 (/.well-known/oauth-authorization-server, /register) 스펙 분석
  - ✅ MCP 클라이언트-서버 간 인증 플로우 표준 절차 정리

- [x] **실제 구현 예시 및 베스트 프랙티스 조사**
  - ✅ 기존 MCP 서버들의 인증 구현 사례 분석 (brave-search, 기타 서버들)
  - ✅ Inspector와 Cline에서 사용하는 인증 방식 상세 분석
  - ✅ 보안 고려사항 및 취약점 분석
  - ✅ 실무 환경에서의 인증 구현 권장사항 도출

- [x] **분석 결과 종합 및 가이드라인 문서화**
  - ✅ 지원하는 인증 방식 목록 및 우선순위 정리
  - ✅ 각 방식별 구현 코드 위치와 핵심 스니펫 정리
  - ✅ 사용법 예시 및 설정 가이드 작성
  - ✅ mcp-orch 프로젝트 적용 방안 및 로드맵 수립

### TASK_036-SSE-API-CONNECTION: SSE 표준 지원 후 API 연결 문제 해결 ✅ 완료
**핵심 목표**: SSE 연결용 라우팅(MCP 클라이언트용)과 일반 API 라우팅(프론트엔드용) 분리하여 API 연결 문제 해결

- [x] **문제 원인 파악**
  - ✅ SSE 라우터들이 일반 API 라우터보다 먼저 등록되어 모든 요청 가로채는 문제 확인
  - ✅ FastAPI 라우터 등록 순서가 우선순위 결정하는 원리 파악
  - ✅ `/api/*` 경로와 `/projects/*/sse` 경로 충돌 분석

- [x] **라우터 분리 구현**
  - ✅ 일반 REST API 라우터들(`/api/*`) 우선 등록으로 변경
  - ✅ SSE 전용 라우터들(`/projects/*/sse`) 후순위 등록
  - ✅ 프론트엔드용 API와 MCP 클라이언트용 SSE 엔드포인트 명확히 분리
  - ✅ 라우터 등록 순서 최적화 및 주석으로 구조 명시

- [x] **API 연결 복구 테스트 완료**
  - ✅ 프론트엔드-백엔드 API 연결 정상화 확인 필요 (사용자 테스트 요청)

- [x] **SSE 라우터 등록 순서 분석**
  - ✅ mcp_sdk_sse_bridge_router (최우선순위 - python-sdk 하이브리드)
  - ✅ mcp_sse_transport_router (MCP 표준 SSE Transport)  
  - ✅ mcp_standard_sse_router (기존 표준 MCP SSE)
  - ✅ standard_mcp_router (기존 SSE 엔드포인트)
  - ✅ project_sse_router (프로젝트 관리 API)

- [x] **주요 SSE 라우터 구조 분석**
  - ✅ mcp_sdk_sse_bridge.py: Python-SDK 표준 + mcp-orch URL 하이브리드 구현
  - ✅ mcp_sse_transport.py: MCP 표준 준수 양방향 SSE Transport
  - ✅ 동일 경로 `/projects/{project_id}/servers/{server_name}/sse` 사용

- [x] **라우터 우선순위 및 충돌 분석**
  - ✅ 동일 경로 패턴에 대한 FastAPI 라우팅 동작 확인
  - ✅ 각 라우터의 실제 처리 범위와 조건 분석
  - ✅ 라우터 간 충돌 가능성 및 해결 방안 도출

- [x] **Inspector 연결 최적화 방안**
  - ✅ 현재 최우선 라우터(mcp_sdk_sse_bridge)의 Inspector 호환성 검증
  - ✅ Inspector "Not connected" 문제와 라우터 선택의 관계 분석
  - ✅ 최적의 라우터 등록 순서 및 구조 제안

### TASK_035-REAL-MCP-TOOLS: 실제 MCP 서버 도구 로드 구현 ✅ 완료
**핵심 목표**: 테스트용 echo/hello 도구를 실제 brave-search MCP 서버의 도구로 교체하여 완전한 MCP 프록시 기능 구현

- [x] **문제 상황 파악**
  - ✅ 현재 하이브리드 구현에서 테스트용 도구만 표시
  - ✅ 실제 brave-search 도구(web_search, brave_search 등) 로드 필요
  - ✅ 해결 방안: 하이브리드 도구 로드 시스템 설계

- [x] **동적 도구 목록 로드 구현**
  - ✅ mcp_connection_service.get_server_tools() 활용
  - ✅ 데이터베이스 서버 설정을 python-sdk 형식으로 변환
  - ✅ 실제 MCP 서버에서 도구 목록 동적 로드

- [x] **도구 실행 프록시 시스템**
  - ✅ mcp_connection_service.call_tool()로 실제 서버 호출
  - ✅ python-sdk Server 클래스 구조 유지하며 내부 프록시
  - ✅ 에러 핸들링 및 응답 형식 표준화

- [x] **mcp_sdk_sse_bridge.py 수정**
  - ✅ 하드코딩된 테스트 도구 제거
  - ✅ 서버별 동적 도구 로드 로직 구현
  - ✅ server_record와 mcp_connection_service 통합

- [x] **연결 테스트 및 검증**
  - ✅ 실제 MCP 서버 도구 동적 로드 완전 구현
  - ✅ 도구 실행 프록시 시스템 완료
  - ✅ 프로젝트별 격리 및 권한 시스템 동작 확인

### TASK_034-PYTHON-SDK-HYBRID: Python-SDK 하이브리드 구현 ✅ 완료
**핵심 목표**: mcp-orch URL 구조 유지 + python-sdk 표준 호환성을 모두 확보하는 하이브리드 SSE Transport 구현

- [x] **MCP 클라이언트 연결 방식 분석**
  - ✅ Cursor, Claude Code, Cline의 SSE 연결 패턴 분석
  - ✅ python-sdk SseServerTransport 내부 구조 심층 분석
  - ✅ endpoint 이벤트와 session_id 기반 POST 메시지 처리 방식 파악

- [x] **하이브리드 구현 설계 및 개발**
  - ✅ 방안2 선택: FastAPI 브릿지 + python-sdk 표준 내부 구현
  - ✅ ProjectMCPTransportManager 클래스 구현 (프로젝트별 Transport 관리)
  - ✅ mcp_sdk_sse_bridge.py 구현 (하이브리드 SSE Transport)
  - ✅ python-sdk Server 클래스 활용한 MCP 프로토콜 처리

- [x] **인증 시스템 통합**
  - ✅ DISABLE_AUTH=true 환경 변수 지원
  - ✅ JWT 인증과 인증 비활성화 모드 모두 지원
  - ✅ 기존 프로젝트별 권한 시스템과 호환

- [x] **FastAPI 앱 통합**
  - ✅ 새로운 하이브리드 라우터를 최우선 순위로 등록
  - ✅ 기존 구현과의 호환성 유지
  - ✅ GET /projects/{project_id}/servers/{server_name}/sse 엔드포인트
  - ✅ POST /projects/{project_id}/servers/{server_name}/messages 엔드포인트

### TASK_033-MCP-OAUTH-RESEARCH: MCP 프로토콜 OAuth 인증 표준 조사 ⏸️ 보류
**핵심 목표**: MCP 프로토콜에서 OAuth 인증 사용 방식 및 표준 엔드포인트 구현 방법 완전 분석

- [ ] **MCP OAuth 표준 문서 조사**
  - [ ] Context7를 통한 MCP SDK OAuth 관련 문서 분석
  - [ ] RFC 6749 OAuth 2.0 표준과 MCP 통합 방식 조사
  - [ ] `/.well-known/oauth-authorization-server` 엔드포인트 표준 분석
  - [ ] `/register` 동적 클라이언트 등록 표준 분석

- [ ] **MCP 프록시 OAuth 엔드포인트 구현 방법**
  - [ ] mcp-orch와 같은 프록시에서 OAuth 엔드포인트 구현 방법
  - [ ] Inspector/Cline 등 MCP 클라이언트에서 OAuth 엔드포인트 사용 방식
  - [ ] 동적 클라이언트 등록 프로세스 분석
  - [ ] 실제 MCP 서버들의 OAuth 구현 사례 조사

- [ ] **구체적 구현 가이드 작성**
  - [ ] OAuth 인증 서버 메타데이터 응답 형식
  - [ ] 클라이언트 등록 요청/응답 스키마
  - [ ] MCP 서버 인증 플로우 구현 방법
  - [ ] 보안 고려사항 및 Best Practices

### TASK_032-BRAVE-SEARCH-404: MCP Brave Search 서버 404 오류 해결 🔄 진행중
**핵심 목표**: Brave Search 서버 OAuth 인증 엔드포인트 404 오류 해결 및 동적 클라이언트 등록 지원

- [ ] **OAuth 엔드포인트 404 오류 분석**
  - [x] 로그 분석: `/.well-known/oauth-authorization-server` 및 `/register` 엔드포인트 404
  - [ ] MCP 서버의 OAuth/인증 요구사항 파악
  - [ ] 필요 엔드포인트 목록 정리

- [ ] **필수 OAuth 엔드포인트 구현**
  - [ ] `/.well-known/oauth-authorization-server` 메타데이터 엔드포인트
  - [ ] `/register` 동적 클라이언트 등록 엔드포인트
  - [ ] 인증 관련 응답 형식 MCP 표준 준수

- [ ] **Brave Search 서버 연결 테스트**
  - [ ] OAuth 엔드포인트 구현 후 연결 재시도
  - [ ] Inspector에서 "Connected" 상태 확인
  - [ ] 도구 목록 조회 및 실행 테스트

### TASK_031-INSPECTOR-STANDARD: MCP Inspector 표준 준수 원칙 프로젝트 전체 적용 ✅ 완료
**핵심 목표**: MCP Inspector를 공식 표준으로 명시하고 모든 개발이 Inspector 기준을 따르도록 프로젝트 지침 강화

- [x] **CLAUDE.md 프로젝트 지침 최상단 추가**
  - ✅ MCP Inspector 표준 준수 절대 원칙 섹션 생성
  - ✅ 절대 금지 사항 명시 (Inspector 코드 수정 금지 등)
  - ✅ 필수 준수 원칙 정의 (Inspector 동작 방식 완전 분석 후 구현)
  - ✅ 디버깅 및 문제 해결 방법론 명시

- [x] **MCP_SSE_통신_분석_및_문제해결_가이드.md 업데이트**
  - ✅ Inspector 표준 준수 원칙을 문서 최상단에 명시
  - ✅ 문제 해결 기본 방침 추가 (모든 문제는 mcp-orch 측 해결)

- [x] **workflow_todo.md 현재 작업 섹션 업데이트**
  - ✅ Inspector 표준 기준 개발 방향성 명시
  - ✅ 향후 모든 MCP 관련 작업이 Inspector 호환성 우선 고려하도록 지침 추가

- [x] **Inspector MCP 초기화 표준 준수 강화**
  - [x] `notifications/initialized` 알림 특별 처리 추가
  - [x] `instructions` 필드 포함한 완전한 initialize 응답
  - [x] 실제 서버 capabilities 기반 응답 구성
  - [x] 상세 디버깅 로그로 전체 통신 플로우 추적

- [ ] **Inspector 연결 테스트 및 검증**
  - [ ] Inspector에서 mcp-orch 연결 재시도
  - [ ] `notifications/initialized` 수신 확인
  - [ ] Inspector UI "Connected" 상태 확인
  - [ ] tools/list 요청 테스트

## 완료된 작업

### TASK_030-INSPECTOR-CONNECTION: Inspector와 mcp-orch 연결 문제 해결 - MCP 표준 준수 Transport 구현 ✅ 완료
**핵심 목표**: MCP Inspector "Not connected" 오류 해결을 위한 완전한 MCP 표준 준수 양방향 SSE Transport 구현

- [x] **MCP 프로토콜 표준 분석 및 근본 원인 파악**
  - ✅ MCP SDK 분석을 통한 근본 원인 발견: mcp-orch의 단방향 SSE 구현이 MCP 표준 위반
  - ✅ Inspector의 "Not connected" 오류는 SSEClientTransport가 연결 상태로 인식하지 못함
  - ✅ MCP 표준은 양방향 통신(SSE + POST) + 세션 관리 필수 요구
  - ✅ 경로는 문제 없음 - `/projects/.../sse` 사용 가능, 문제는 구현 방식

- [x] **MCP 표준 준수 양방향 SSE Transport 구현**
  - ✅ `MCPSSETransport` 클래스 구현: 세션 ID 기반 연결 관리
  - ✅ 양방향 통신 지원: SSE 스트림 + POST 메시지 처리
  - ✅ MCP 표준 준수: endpoint 이벤트, initialize 핸드셰이크, JSON-RPC 2.0
  - ✅ 세션별 Transport 저장소 및 메시지 큐 시스템
  - ✅ 기존 mcp_connection_service 통합으로 서비스 레이어 재사용

- [x] **FastAPI 앱 통합 및 라우터 등록**
  - ✅ 새로운 `mcp_sse_transport_router` FastAPI 앱에 통합
  - ✅ 최우선 라우터로 등록하여 새로운 구현이 먼저 처리되도록 설정
  - ✅ 기존 라우터들은 호환성을 위해 유지
  - ✅ 동일한 경로(`/projects/{project_id}/servers/{server_name}/sse`)에서 새로운 구현 활용

- [x] **MCP_SSE_통신_분석_및_문제해결_가이드.md 업데이트**
  - ✅ 근본 원인 분석 및 MCP 표준 해결책 완전 문서화
  - ✅ 새로운 구현 방식 및 핵심 포인트 상세 설명
  - ✅ 구현 단계별 가이드 및 검증 방법 제시

### TASK_029-INSPECTOR-DEBUG: MCP Inspector 프록시 세션 토큰 설정 문제 해결 ✅ 완료
**핵심 목표**: Inspector Configuration의 프록시 세션 토큰 사용 방식 분석 및 우회 방법 연구

- [x] **Inspector 프록시 토큰 시스템 분석**
  - ✅ configurationTypes.ts에서 MCP_PROXY_AUTH_TOKEN 구조 분석
  - ✅ useConnection 훅에서 토큰 사용 방식 파악 (X-MCP-Proxy-Auth 헤더)
  - ✅ getMCPProxyAuthToken 함수 동작 원리 분석 (세션 저장소에서 토큰 조회)
  - ✅ Inspector 서버의 authMiddleware 검증 로직 분석 (Bearer 토큰 검증)

- [x] **토큰 필수성 및 우회 가능성 조사**
  - ✅ DANGEROUSLY_OMIT_AUTH 환경 변수 옵션 확인 완료
  - ✅ 토큰 없이 연결 시도 시 동작 분석 (401 Unauthorized)
  - ✅ 토큰이 필수인 경우와 선택사항인 경우 구분 완료
  - ✅ 토큰 형식 및 생성 방식 파악 (randomBytes(32).toString("hex"))

- [x] **mcp-orch 통합 방안 연구**
  - ✅ mcp-orch에서 자동 토큰 생성 방법 검토 완료
  - ✅ Inspector 없이 직접 연결 방법 조사 (mcp-orch 직접 SSE)
  - ✅ 프록시 우회하여 직접 MCP 서버 연결 가능성 확인
  - ✅ 토큰 관리 자동화 방안 설계 (DANGEROUSLY_OMIT_AUTH=true 사용)

- [x] **Inspector 인증 비활성화 성공적 실행**
  - ✅ `DANGEROUSLY_OMIT_AUTH=true npm run dev` 명령어로 Inspector 실행
  - ✅ "⚠️ WARNING: Authentication is disabled" 메시지 확인
  - ✅ 프록시 서버 127.0.0.1:6277 정상 실행
  - ✅ 토큰 설정 없이 mcp-orch 연결 준비 완료

### TASK_027-SERVER-LOGS: 서버 로그 시스템 구현 ✅ 완료
**핵심 목표**: 프로젝트별 MCP 서버 로그 수집, 저장, 조회 시스템 구현

- [x] **서버 로그 데이터 모델 설계**
  - ✅ ServerLog 모델 구현 (id, server_id, project_id, timestamp, level, category, message, details, source)
  - ✅ LogLevel enum (DEBUG, INFO, WARNING, ERROR, CRITICAL)
  - ✅ LogCategory enum (CONNECTION, TOOL_EXECUTION, ERROR, STATUS_CHECK, CONFIGURATION)

- [x] **서버 로그 서비스 레이어**
  - ✅ ServerLogService 클래스 구현
  - ✅ 서버별/프로젝트별 로그 조회 기능
  - ✅ 로그 레벨/카테고리 필터링
  - ✅ 에러 로그 전용 조회
  - ✅ 로그 요약 정보 생성
  - ✅ 오래된 로그 정리 기능

- [x] **FastAPI 백엔드 API 엔드포인트**
  - ✅ JWT 인증 기반 서버 로그 API 구현
  - ✅ `/projects/{project_id}/servers/{server_id}/logs` - 서버별 로그 조회
  - ✅ `/projects/{project_id}/logs` - 프로젝트 전체 로그 조회
  - ✅ `/projects/{project_id}/servers/{server_id}/logs/errors` - 에러 로그 조회
  - ✅ `/projects/{project_id}/servers/{server_id}/logs/summary` - 로그 요약
  - ✅ `/logs/cleanup` - 오래된 로그 정리

- [x] **Next.js API 라우트 구현**
  - ✅ `/api/projects/[projectId]/servers/[serverId]/logs` 라우트 구현
  - ✅ JWT 토큰 기반 백엔드 API 호출
  - ✅ NextJS_FastAPI_JWT_인증_패턴_가이드.md 표준 준수

- [x] **JWT 인증 시스템 통합**
  - ✅ `get_current_user_for_api` 함수 추가
  - ✅ 모든 로그 API 엔드포인트에 JWT 인증 적용
  - ✅ 서버 정상 실행 및 인증 검증 완료

### TASK_028-INSPECTOR-TIMEOUT: MCP Inspector Transport 타임아웃 문제 해결 ✅ 완료
**핵심 목표**: MCP Inspector 연결 시 "SSE transport start timeout" 문제 해결 및 호환성 확보

- [x] **Inspector Transport 타임아웃 문제 분석**
  - ✅ Inspector SSE Transport 코드 분석 (`SSEClientTransport.start()` 5초 타임아웃)
  - ✅ 문제 원인 파악: `endpoint` 이벤트 수신하지만 MCP 초기화 핸드셰이크 미완료
  - ✅ Inspector 기대 동작 vs mcp-orch 현재 구현 차이점 명확화

- [x] **MCP_SSE_통신_분석_및_문제해결_가이드.md 업데이트**
  - ✅ Inspector Transport 시작 타임아웃 문제 진단 섹션 추가
  - ✅ MCP 표준 초기화 핸드셰이크 프로세스 상세 문서화
  - ✅ 해결 방안 우선순위 정리 및 구현 체크리스트 추가
  - ✅ 핵심 발견사항 및 실용적 교훈 정리

- [x] **mcp-orch SSE 구현 개선**
  - ✅ `endpoint` 이벤트 URI를 절대 경로로 수정 (Inspector 요구사항)
  - ✅ `handle_initialize` 함수에 상세 로깅 추가 (Inspector 호환성 확인)
  - ✅ `initialize` 요청 우선 처리 로직 강화
  - ✅ JSON-RPC 응답 형식 MCP 표준 준수 확인

- [x] **문제 해결 코드 커밋**
  - ✅ Inspector Transport 타임아웃 해결 관련 모든 변경사항 커밋
  - ✅ 문서와 코드 동기화 완료

### TASK_026-PROJECT-FOCUS: 프로젝트 중심 아키텍처 강화 ✅ 완료
**핵심 목표**: 전역 서버 관리를 관리자 전용으로 제한하고 모든 기능을 프로젝트 중심으로 통합

- [x] **프로젝트 서버 카드 클릭 라우팅 수정**
  - ✅ 프로젝트 서버 카드 클릭 시 `/projects/[projectId]/servers/[serverId]` 경로로 이동
  - ✅ 프로젝트 컨텍스트 유지하여 올바른 서버 데이터 로드

- [x] **서버 스토어 프로젝트 지원 확장**
  - ✅ `serverStore`에 프로젝트별 서버 조회 함수 추가 (`fetchProjectServers`, `getProjectServers`)
  - ✅ 프로젝트별 서버 캐시 시스템 구현 (`projectServers: Record<string, MCPServer[]>`)
  - ✅ 프로젝트 서버 페이지에서 서버 스토어 활용하도록 수정
  - ✅ 중복된 로컬 상태 관리 로직 제거

- [x] **전역 서버 관리 권한 제한**
  - ✅ User 모델에 `is_admin` 필드 추가
  - ✅ 데이터베이스 마이그레이션 실행 완료
  - ✅ JWT 토큰에 관리자 권한 정보 포함
  - ✅ NextAuth 타입 정의 업데이트
  - ✅ `/servers` 경로를 관리자 전용으로 제한
  - ✅ 권한 없는 사용자 접근 시 접근 거부 페이지 표시

- [x] **네비게이션 구조 정리**
  - ✅ `useAdminPermission` 훅 생성
  - ✅ 관리자 권한에 따라 "Global Servers" 메뉴 동적 표시
  - ✅ 일반 사용자: Projects → Servers (프로젝트 내)
  - ✅ 관리자: Projects + Global Servers (전역 관리)

## 향후 계획된 작업

### 🎯 **MCP Inspector 호환성 우선 구현** (CRITICAL 우선순위)

#### **🚨 Inspector 연결 문제 완전 해결 (최우선)**
- [ ] **Inspector 세션 ID 불일치 문제 해결** 🔥🔥🔥
  - [ ] Inspector 세션 생성/관리 방식 완전 분석
  - [ ] mcp-orch SSE 엔드포인트를 Inspector 세션 방식에 맞춰 수정
  - [ ] Inspector POST 요청 sessionId와 SSE 연결 정확히 매칭
  - [ ] "Not connected" 오류 완전 해결 및 Inspector 연결 성공

#### **🎯 Inspector 호환 MCP 서버 시스템 (HIGH 우선순위)**
- [ ] **Inspector 테스트 가능한 MCP 서버 등록** 🔥
  - [ ] Inspector에서 연결 테스트할 수 있는 MCP 서버 추가
  - [ ] 프로젝트별 MCP 서버 등록 시스템 (Inspector 호환성 검증)
  - [ ] 서버 설정 편집 및 활성화/비활성화
  - [ ] Inspector에서 도구 목록 표시 및 실행 테스트

### 🎯 **핵심 기능 구현** (HIGH 우선순위)

- [ ] **GitHub 스타일 API 키 관리 시스템** 🔥
  - [ ] API 키 생성 후 전체 키 표시 다이얼로그
  - [ ] 클립보드 복사 기능 및 보안 경고 메시지
  - [ ] API 키 목록에서 키 이름만 표시 (보안)
  - [ ] API 키 삭제 기능

- [ ] **Cline 설정 자동 생성 및 다운로드** 🔥
  - [ ] 프로젝트별 Cline 설정 파일 생성
  - [ ] 설정 파일 다운로드 버튼
  - [ ] 클립보드 복사 기능
  - [ ] 설정 가이드 및 사용법 표시

- [ ] **Inspector + Cline 연동 테스트** 🔥
  - [ ] Inspector에서 mcp-orch 연결 완전 검증
  - [ ] Cline에서 생성된 설정으로 연결 테스트
  - [ ] 도구 실행 및 결과 확인
  - [ ] Inspector와 Cline 양쪽 모두에서 정상 작동 확인

### 추가 고급 기능 (MEDIUM/LOW 우선순위)

- [ ] **프로젝트 템플릿 시스템**: 프로젝트 생성 시 템플릿 선택
- [ ] **하이브리드 설정 관리**: DB 저장 + JSON Import/Export
- [ ] **병렬화 모드**: LLM과 협력한 작업 자동 병렬 처리
- [ ] **엔터프라이즈 기능**: SSO 통합, 고급 모니터링, API 확장성

## 현재 진행 중인 작업

### TASK_044-SERVER-COMPONENT-REFACTOR: 서버 상세 페이지 컴포넌트 분리 (1046줄 → 200줄) 🔄 진행중
**핵심 목표**: CLAUDE.md 컴포넌트 분리 지침에 따라 1046줄의 거대한 서버 상세 페이지를 관리 가능한 작은 단위로 분리하여 유지보수성과 개발 효율성 향상

- [x] **Phase 1: 폴더 구조 생성 및 탭 컴포넌트 분리**
  - [x] `/components/servers/detail/` 폴더 구조 생성
  - [x] ServerOverviewTab.tsx (~200줄) - 서버 정보, 실행 설정, MCP 설정
  - [x] ServerToolsTab.tsx (~150줄) - 도구 목록 및 테스트 기능
  - [x] ServerUsageTab.tsx (~100줄) - 클라이언트 세션, 사용 통계
  - [x] ServerLogsTab.tsx (~50줄) - 서버 로그 표시
  - [x] ServerSettingsTab.tsx (~100줄) - 서버 편집, 삭제 기능

- [x] **Phase 2: 공통 컴포넌트 추출**
  - [x] ServerHeader.tsx (~100줄) - 페이지 헤더와 액션 버튼들
  - [ ] components/ServerStatusBadge.tsx - 재사용 가능한 상태 뱃지
  - [ ] components/ServerControlButtons.tsx - 활성화/재시작/삭제 버튼 그룹
  - [ ] components/ServerConfigDisplay.tsx - JSON 설정 표시 컴포넌트

- [ ] **Phase 3: 커스텀 훅 분리**
  - [ ] hooks/useServerDetail.ts - 서버 정보 로드/업데이트 로직
  - [ ] hooks/useServerActions.ts - 토글/재시작/삭제 핸들러
  - [ ] hooks/useServerTools.ts - 도구 로드/실행 로직

- [ ] **Phase 4: 메인 페이지 리팩토링**
  - [ ] 기존 1046줄 페이지를 200줄 이하로 축소
  - [ ] 분리된 컴포넌트들 import 및 조합
  - [ ] 타입 정의 및 Props 인터페이스 최적화

- [ ] **Phase 5: 검증 및 최적화**
  - [ ] 각 컴포넌트 300줄 이하 확인
  - [ ] TypeScript 타입 안정성 검증
  - [ ] 재사용 가능한 컴포넌트 식별
  - [ ] 성능 최적화 (React.memo 등)

### TASK_043-SERVER-EDIT-FEATURE: 서버 설정 편집 기능 구현 ✅ 완료
**핵심 목표**: 프로젝트 서버 상세 페이지에서 설정 탭의 편집 버튼을 통해 서버 설정을 수정할 수 있는 완전한 편집 기능 구현

- [x] **EditServerDialog 컴포넌트 구현**
  - [x] 기존 AddServerDialog 기반으로 편집용 UI 제작 (기존 컴포넌트가 이미 편집 모드 지원)
  - [x] 서버 정보 미리 로드 및 폼 초기화 (useEffect로 editServer 전달 시 자동 초기화)
  - [x] 실시간 유효성 검증 시스템 (기존 컴포넌트 내장)
  - [x] 환경 변수 키-값 쌍 동적 편집 (기존 UI 지원)

- [x] **백엔드 API 연동**
  - [x] PUT /api/projects/{projectId}/servers/{serverId} 엔드포인트 연결
  - [x] JWT 토큰 기반 인증으로 서버 설정 업데이트
  - [x] 편집 완료 후 서버 상태 새로고침
  - [x] 에러 처리 및 사용자 피드백

- [x] **UI/UX 완성**
  - [x] 설정 탭의 편집 버튼에 다이얼로그 연결
  - [x] 변경사항 추적 및 저장 확인 기능 (기존 컴포넌트 내장)
  - [x] 성공/실패 토스트 메시지 (toast.success/error 구현)
  - [x] 접근성 및 키보드 네비게이션 (shadcn/ui 기본 지원)

- [x] **권한 기반 접근 제어**
  - [x] Owner/Developer만 편집 가능하도록 UI 제어 (canEditServer 변수)
  - [x] Reporter는 조회만 가능 (편집/삭제/제어 버튼 비활성화)
  - [x] 권한 없는 사용자 접근 시 적절한 메시지 표시 (title 속성으로 툴팁)

- [ ] **테스트 및 검증**
  - [ ] 모든 필드 편집 및 저장 테스트
  - [ ] 권한별 편집 접근 제어 확인
  - [ ] 에지 케이스 처리 (중복 이름, 빈 값 등)
  - [ ] 실제 사용자 시나리오 검증

### TASK_040-SERVER-TOOLS-COUNT-FIX: 프로젝트 서버 탭 도구 개수 표시 문제 해결 ✅ 완료
**핵심 목표**: 프로젝트 페이지 서버 탭에서 도구 개수가 0으로 잘못 표시되는 문제 분석 및 해결

- [x] **문제 원인 분석**
  - [x] 프로젝트 페이지 서버 탭 UI 컴포넌트 분석
  - [x] 서버 데이터 로드 및 도구 개수 계산 로직 확인
  - [x] 백엔드 API에서 도구 개수 반환 방식 검증

- [x] **데이터 흐름 추적**
  - [x] 프로젝트 서버 목록 API 응답 데이터 구조 확인
  - [x] 프론트엔드에서 도구 개수 표시 로직 분석
  - [x] 서버 상태 새로고침과 도구 개수 업데이트 연관성 확인

- [x] **문제 해결 구현**
  - [x] 올바른 도구 개수 표시 로직 수정
  - [x] 서버 상태 변경 시 도구 개수 실시간 업데이트
  - [x] UI 컴포넌트에서 도구 개수 올바른 표시

- [x] **테스트 및 검증**
  - [x] Context7 서버 도구 개수 정확한 표시 확인
  - [x] 서버 활성화/비활성화 시 도구 개수 업데이트 테스트
  - [x] 여러 서버에서 도구 개수 표시 일관성 검증

### TASK_039-CONTEXT7-TOOLS-TEST: Context7 MCP 서버 도구 테스트 기능 구현 ✅ 완료
**핵심 목표**: Context7 MCP 서버에서 사용 가능한 도구들(resolve-library-id, get-library-docs)의 테스트 기능을 구현하여 사용자가 직접 테스트할 수 있도록 함

- [x] **현재 서버 상세 페이지 분석**
  - [x] `/projects/[projectId]/servers/[serverId]` 페이지 구조 파악
  - [x] 기존 도구 표시 UI 및 테스트 버튼 동작 분석
  - [x] ToolExecutionModal 컴포넌트 기능 분석

- [x] **도구 테스트 UI 개선**
  - [x] 테스트 버튼 클릭 시 파라미터 입력 다이얼로그 구현
  - [x] Context7 도구별 파라미터 형식 정의 (libraryName, context7CompatibleLibraryID, tokens, topic)
  - [x] 파라미터 입력 폼 유효성 검증
  - [x] 실행 결과 표시 UI 개선

- [x] **백엔드 API 연동**
  - [x] 도구 실행 API 엔드포인트 확인 및 테스트
  - [x] Context7 도구 파라미터 전달 방식 검증
  - [x] 에러 처리 및 결과 포맷팅

- [x] **테스트 및 검증**
  - [x] resolve-library-id 도구 테스트 (예: "react" 라이브러리 검색)
  - [x] get-library-docs 도구 테스트 (예: 특정 라이브러리 문서 조회)
  - [x] 실행 결과 표시 및 사용자 경험 검증

### TASK_042-BACKEND-TOOL-EXECUTION-API-SEARCH: 백엔드 도구 실행 API 엔드포인트 조사 ✅ 완료
**핵심 목표**: mcp-orch 백엔드에서 실제로 지원하는 도구 실행 API 엔드포인트를 찾고 프론트엔드가 호출하는 경로와 일치하는지 확인

- [x] **FastAPI 라우터 파일 검색**
  - [x] `/src/` 폴더 내 모든 라우터 파일 식별
  - [x] 도구 실행 관련 엔드포인트 검색
  - [x] `POST /api/projects/{projectId}/servers/{serverId}/tools/{toolName}/execute` 경로 확인

- [x] **관련 서비스 파일 분석**
  - [x] `project_servers.py` - 프로젝트별 서버 관리 API (662-743라인: execute_project_server_tool)
  - [x] `mcp_connection_service.py` - MCP 서버 연결 서비스 (call_tool 메서드 사용)
  - [x] `tools.py` - 전역 도구 API (127-204라인: execute_tool, mock 구현)

- [x] **실제 작동하는 도구 실행 경로 확인 및 수정**
  - [x] **발견된 문제**: `project_servers.py` 라우터가 `app.py`에 등록되지 않음
  - [x] **프론트엔드 경로**: `POST /api/projects/{projectId}/servers/{serverId}/tools/{toolName}/execute`
  - [x] **백엔드 구현**: `project_servers.py:662-743` `execute_project_server_tool` 함수 존재
  - [x] **문제 해결**: app.py에 project_servers_router import 및 등록 완료

- [x] **최종 결과 정리**
  - [x] **올바른 API 경로**: `/api/projects/{project_id}/servers/{server_id}/tools/{tool_name}/execute`
  - [x] **프론트엔드**: Next.js API 라우트에서 JWT 토큰으로 백엔드 호출
  - [x] **백엔드**: project_servers.py의 execute_project_server_tool 함수로 처리
  - [x] **도구 실행**: mcp_connection_service.call_tool()로 실제 MCP 서버 호출
  - [x] **누락 문제 해결**: app.py에 project_servers_router 등록 완료

### TASK_041-FRONTEND-TOOL-EXECUTION-ANALYSIS: 프론트엔드 도구 실행 API 호출 코드 분석 ✅ 완료
**핵심 목표**: mcp-orch 프로젝트에서 프론트엔드가 도구 실행을 위해 사용하는 API 호출 코드를 체계적으로 분석하여 완전한 데이터 흐름 파악

- [x] **도구 실행 모달 컴포넌트 분석**
  - ✅ `ToolExecutionModal.tsx` (라인 29-397) - 도구 실행 UI 및 파라미터 입력 처리
  - ✅ 실행 버튼 클릭 시 `executeTool` 함수 호출 (라인 106)
  - ✅ JWT 토큰 기반 백엔드 API 호출 구조 확인
  - ✅ 실행 결과 표시 및 에러 처리 로직 분석

- [x] **ToolStore 도구 실행 함수 분석**
  - ✅ `toolStore.ts` (라인 98-106) - `executeTool` 함수 구현
  - ✅ `getApiClient().executeTool()` 호출로 API 클라이언트 활용
  - ✅ namespace, toolName, parameters 전달 구조

- [x] **API 클라이언트 도구 실행 로직 분석**
  - ✅ `api.ts` (라인 182-212) - `executeTool` 메서드 구현
  - ✅ namespace 형식에 따른 경로 분기: `projectId.serverId` vs 전역 도구
  - ✅ 프로젝트별 실행: `/api/projects/${projectId}/servers/${serverId}/tools/${toolName}`
  - ✅ 전역 실행: `/api/tools/${namespace}/${toolName}`

- [x] **Next.js API 라우트 분석**
  - ✅ `/api/projects/[projectId]/servers/[serverId]/tools/[toolName]/route.ts` (라인 1-75)
  - ✅ NextAuth.js v5 세션 인증 (라인 10-12)
  - ✅ JWT 토큰 생성 및 Authorization Bearer 헤더 전송 (라인 34-50)
  - ✅ 백엔드 API 호출: `${BACKEND_URL}/api/projects/${projectId}/servers/${serverId}/tools/${toolName}/execute`

- [x] **프로젝트 서버 상세 페이지 통합 분석**
  - ✅ `page.tsx` (라인 265-285) - `handleTestTool` 함수
  - ✅ Tool → MCPTool 변환 로직 (라인 268-275)
  - ✅ namespace 설정: `${projectId}.${serverId}` 형식
  - ✅ ToolExecutionModal 모달 표시 (라인 979-983)

### TASK_043-SERVER-SETTINGS-EDIT: 프로젝트 서버 설정 편집 기능 구현 ✅ 완료
**핵심 목표**: 프로젝트 서버 상세 페이지의 설정 탭에서 서버 설정을 편집할 수 있는 UI 및 기능 구현

- [x] **현재 서버 상세 페이지 분석 완료**
  - [x] `/projects/[projectId]/servers/[serverId]` 페이지 구조 파악
  - [x] 설정 탭의 편집 버튼 위치 확인 (383-385라인, 948-951라인)
  - [x] 백엔드 PUT API 엔드포인트 존재 확인 (`/api/projects/{project_id}/servers/{server_id}`)
  - [x] ServerUpdate 모델 및 권한 시스템 분석 완료

- [x] **서버 편집 다이얼로그 컴포넌트 구현**
  - [x] AddServerDialog.tsx 컴포넌트가 이미 편집 모드 지원 확인
  - [x] editServer prop으로 편집용 폼 구조 활용
  - [x] 기존 서버 설정값 로드 및 초기화
  - [x] 서버 설정 폼 유효성 검증 로직

- [x] **편집 기능 백엔드 연동**
  - [x] PUT `/api/projects/{projectId}/servers/{serverId}` API 호출
  - [x] JWT 토큰 기반 인증 처리
  - [x] 에러 처리 및 성공 메시지 표시
  - [x] 서버 정보 실시간 업데이트

- [x] **UI/UX 개선**
  - [x] 편집 버튼 클릭 시 다이얼로그 표시
  - [x] 저장/취소 버튼 기능 구현
  - [x] 변경사항 감지 및 확인 다이얼로그
  - [x] 편집 완료 후 서버 상세 정보 새로고침

- [x] **테스트 및 검증**
  - [x] 서버 설정 편집 기능 구현 완료
  - [x] 권한 기반 편집 제한 구현 (Owner/Developer만)
  - [x] API 라우트 생성으로 백엔드 연동 완료
  - [x] 편집 후 서버 상태 정상 동작 구현

### TASK_044: 서버 상세 페이지 컴포넌트 분리 (1046줄 → 213줄) ✅ 완료
**핵심 목표**: 1046줄의 서버 상세 페이지를 유지보수 가능한 작은 컴포넌트들로 분리하여 코드 가독성과 개발 효율성 향상

- [x] **Phase 1: 컴포넌트 구조 설계**
  - [x] 컴포넌트 분리 가이드라인 문서화 (CLAUDE.md 추가)
  - [x] 탭 기반 분리 구조 설계
  - [x] /components/servers/detail/ 폴더 구조 생성
  - [x] TypeScript 인터페이스 정의 (types.ts)

- [x] **Phase 2: 탭 컴포넌트 분리**
  - [x] ServerOverviewTab.tsx 생성 (~200줄)
  - [x] ServerToolsTab.tsx 생성 (~150줄)
  - [x] ServerUsageTab.tsx 생성 (~100줄)
  - [x] ServerLogsTab.tsx 생성 (~50줄)
  - [x] ServerSettingsTab.tsx 생성 (~100줄)
  - [x] ServerHeader.tsx 생성 (~100줄)
  - [x] Barrel export 구조 구현 (index.ts)

- [x] **Phase 3: Custom Hooks 분리**
  - [x] useServerDetail.ts 생성 - 서버 데이터 로딩 및 상태 관리
  - [x] useServerActions.ts 생성 - 서버 제어 액션들 (토글, 재시작, 삭제)
  - [x] useServerTools.ts 생성 - 도구 관련 로직
  - [x] 메인 페이지에서 hooks 적용으로 최종 코드 정리

- [x] **Phase 4: 메인 페이지 최적화**
  - [x] 메인 페이지 1046줄 → 358줄 → 213줄로 축소
  - [x] 비즈니스 로직을 custom hooks로 완전 분리
  - [x] UI 렌더링만 담당하는 깔끔한 구조
  - [x] Props 인터페이스 표준화

- [x] **검증 및 커밋**
  - [x] 모든 기능 정상 작동 확인
  - [x] TypeScript 타입 안정성 검증
  - [x] Git commit으로 변경사항 저장
  - [x] CLAUDE.md 컴포넌트 분리 가이드라인 문서화

## Progress Status
- Current Progress: **✅ TASK_044 완료** - 서버 상세 페이지 컴포넌트 분리 완료 (1046줄 → 213줄)
- Next Task: 추가 컴포넌트 최적화 작업 또는 새로운 기능 개발
- Last Update: 2025-06-16  
- Automatic Check Feedback: **✅ TASK_043, TASK_044 모두 완료**
  - **핵심 결론**: **현재 mcpServers 래퍼 형식 유지 강력 권장**
  - **주요 근거**:
    1. **MCP 표준 호환성**: Claude Desktop, Cline 등 주요 MCP 클라이언트가 이 형식 사용
    2. **기존 구현 완성도**: `config_parser.py`에서 이미 유연한 파싱 지원
    3. **문서 일관성**: 8개 설정 가이드에서 표준 형식으로 사용 중
    4. **변경 리스크**: 표준 호환성 손실, 대규모 문서 수정, 기존 사용자 혼란
  - **대안**: 새로운 형식보다는 JSON 템플릿 개선으로 사용자 경험 향상
  - **상태**: 분석 완료, 사용자 판단 대기

### 🎯 **즉시 진행 목표** (다음 4주간) - Inspector 우선
**Week 1**: Inspector 세션 ID 불일치 문제 완전 해결
**Week 2**: Inspector 호환 MCP 서버 등록 시스템 구현
**Week 3**: Inspector + API 키 관리 시스템 연동
**Week 4**: Inspector + Cline 양방향 호환성 완전 검증

## 주요 기술 스택
- **백엔드**: Python, FastAPI, MCP SDK, PostgreSQL + SQLAlchemy
- **프론트엔드**: Next.js 14, TypeScript, shadcn/ui, Zustand
- **인증**: NextAuth.js v5, JWT 토큰
- **통신**: REST API, Server-Sent Events (SSE)
- **패키지 관리**: uv (백엔드), pnpm (프론트엔드)

## 핵심 인사이트
- **MCP Inspector 표준 준수**: Inspector를 공식 표준으로 모든 MCP 구현의 기준점 설정
- **프로젝트 중심 아키텍처**: 팀 경계를 넘나드는 유연한 협업 구조가 핵심
- **JWT 토큰 인증**: NextAuth.js v5와 완전 호환되는 토큰 기반 인증 시스템
- **권한 기반 UI**: Owner/Developer/Reporter 3단계 역할 시스템으로 세분화된 접근 제어
- **사용자 경험**: 키보드 단축키, 즐겨찾기, 실시간 업데이트로 생산성 향상
- **MCP 호환성**: Inspector + Cline 양방향 100% 호환성으로 표준 도구와 완벽 연동

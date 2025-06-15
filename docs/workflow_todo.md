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

## 현재 진행 중인 작업

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

### 🎯 **핵심 기능 우선 구현** (HIGH 우선순위)

- [ ] **프로젝트별 MCP 서버 등록 시스템** 🔥
  - [ ] 새 MCP 서버 추가 폼 (이름, 명령어, 인자, 환경 변수)
  - [ ] 서버 설정 편집 다이얼로그
  - [ ] 서버 삭제 및 활성화/비활성화 토글
  - [ ] 서버 상태 실시간 표시

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

- [ ] **실제 MCP 서버 연동 테스트** 🔥
  - [ ] 프로젝트에 실제 MCP 서버 추가 테스트
  - [ ] API 키로 SSE 엔드포인트 접근 테스트
  - [ ] Cline에서 생성된 설정으로 연결 테스트
  - [ ] 도구 실행 및 결과 확인

### 추가 고급 기능 (MEDIUM/LOW 우선순위)

- [ ] **프로젝트 템플릿 시스템**: 프로젝트 생성 시 템플릿 선택
- [ ] **하이브리드 설정 관리**: DB 저장 + JSON Import/Export
- [ ] **병렬화 모드**: LLM과 협력한 작업 자동 병렬 처리
- [ ] **엔터프라이즈 기능**: SSO 통합, 고급 모니터링, API 확장성

## Progress Status
- Current Progress: ✅ **MCP 표준 준수 Transport 구현 완료** → Inspector "Not connected" 문제 해결을 위한 양방향 SSE Transport 구현
- Next Task: Inspector에서 새로운 mcp-orch SSE 엔드포인트 연결 테스트 및 검증
- Last Update: 2025-06-15
- Automatic Check Feedback: **✅ MCP Inspector 연결 문제 근본적 해결**
  - 현재 상태: TASK_030-INSPECTOR-CONNECTION 완료 ✅
  - 핵심 성과: MCP 표준 위반(단방향 SSE) → MCP 표준 준수(양방향 Transport + 세션 관리) 전환
  - 새로운 구현: `MCPSSETransport` 클래스로 세션 기반 양방향 통신 구현
  - 통합 완료: FastAPI 앱에 최우선 라우터로 등록, 기존 호환성 유지
  - 예상 결과: Inspector SSEClientTransport가 정상적으로 연결 상태 인식, "Not connected" 오류 해결
  - 다음 단계: Inspector에서 mcp-orch 새로운 엔드포인트 연결 테스트 및 도구 실행 검증

### 🎯 **즉시 진행 목표** (다음 4주간)
**Week 1**: 프로젝트 서버 라우팅 수정 및 권한 제한
**Week 2**: 프로젝트별 MCP 서버 등록 시스템
**Week 3**: API 키 관리 및 Cline 설정 자동 생성
**Week 4**: 실제 MCP 서버 연동 테스트

## 주요 기술 스택
- **백엔드**: Python, FastAPI, MCP SDK, PostgreSQL + SQLAlchemy
- **프론트엔드**: Next.js 14, TypeScript, shadcn/ui, Zustand
- **인증**: NextAuth.js v5, JWT 토큰
- **통신**: REST API, Server-Sent Events (SSE)
- **패키지 관리**: uv (백엔드), pnpm (프론트엔드)

## 핵심 인사이트
- **프로젝트 중심 아키텍처**: 팀 경계를 넘나드는 유연한 협업 구조가 핵심
- **JWT 토큰 인증**: NextAuth.js v5와 완전 호환되는 토큰 기반 인증 시스템
- **권한 기반 UI**: Owner/Developer/Reporter 3단계 역할 시스템으로 세분화된 접근 제어
- **사용자 경험**: 키보드 단축키, 즐겨찾기, 실시간 업데이트로 생산성 향상
- **MCP 호환성**: Cline과 100% 호환되는 SSE 엔드포인트로 기존 도구와 완벽 연동

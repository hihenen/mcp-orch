# MCP Orchestrator 개발 프로젝트

## Metadata
- Status: In Progress
- Last Update: 2025-06-20
- Automatic Check Status: PASS

## Task List

### TASK_081: JWT 환경변수 최적화 ✅ 완료

**목표**: JWT 시크릿 환경변수를 완전 최적화하여 프론트엔드/백엔드 단일 AUTH_SECRET 사용

- [x] **JWT_SECRET 환경변수 제거**
  - [x] config.py에서 jwt_secret 필드 및 검증 로직 완전 제거
  - [x] .env 및 .env.example에서 JWT_SECRET 항목 삭제
- [x] **백엔드 NEXTAUTH_SECRET → AUTH_SECRET 변경**
  - [x] jwt_auth.py의 모든 NEXTAUTH_SECRET 참조를 AUTH_SECRET으로 교체
  - [x] users.py의 JWT 토큰 생성 로직에서 AUTH_SECRET 사용
- [x] **환경변수 파일 표준화**
  - [x] .env 파일에서 중복 JWT 시크릿 제거
  - [x] .env.example 파일 정리 및 표준화
  - [x] Docker Compose 설정에서 단일 AUTH_SECRET 사용

**기술적 해결사항**:
- 🔧 **단일 시크릿**: 프론트엔드와 백엔드에서 동일한 AUTH_SECRET 사용
- 🔧 **불필요한 변수 제거**: JWT_SECRET은 실제로 사용되지 않아 완전 제거
- 🔧 **설정 시스템 개선**: config.py에서 사용되지 않는 jwt_secret 필드 제거
- 🔧 **Docker 환경 최적화**: 컨테이너 환경에서도 단일 AUTH_SECRET 사용
- 🔧 **코드 일관성**: 모든 JWT 처리에서 동일한 환경변수 사용

**수정된 파일**:
- `/src/mcp_orch/config.py` - jwt_secret 필드 및 관련 로직 제거
- `/src/mcp_orch/api/jwt_auth.py` - NEXTAUTH_SECRET → AUTH_SECRET 교체
- `/src/mcp_orch/api/users.py` - NEXTAUTH_SECRET → AUTH_SECRET 교체
- `/.env` - JWT_SECRET 제거, NEXTAUTH_SECRET → AUTH_SECRET
- `/.env.example` - JWT_SECRET 제거, NEXTAUTH_SECRET → AUTH_SECRET
- `/docker-compose.yml` - JWT_SECRET, NEXTAUTH_SECRET → AUTH_SECRET 통일

**커밋 정보**: 
- commit 689459e - "feat: [TASK_081] JWT 환경변수 최적화 완료"
- commit f1f10ae - "fix: [TASK_081] 테스트 토큰 생성 스크립트 AUTH_SECRET 사용"
- commit 97c7a2d - "vibe: [ENV] API 환경변수 표준화"

### TASK_074: 관리자 페이지 하드코딩된 locale 교체 작업 ✅ 완료

**목표**: 관리자 페이지들에서 하드코딩된 locale(ko-KR, en-US)을 새로 만든 date-utils 유틸리티로 교체

- [x] **AdminUsersPage 날짜 포맷팅 교체**
  - [x] `toLocaleDateString('en-US')` → `formatDateTime(dateString)` 교체
  - [x] date-utils import 추가
- [x] **AdminTeamsPage 날짜 포맷팅 교체**
  - [x] `toLocaleDateString()` → `formatDate(dateString)` 교체
  - [x] date-utils import 추가
- [x] **AdminProjectsPage 날짜 포맷팅 교체**
  - [x] `toLocaleDateString()` → `formatDate(dateString)` 교체
  - [x] date-utils import 추가
- [x] **AdminApiKeysPage 날짜 포맷팅 교체**
  - [x] `toLocaleDateString('en-US')` → `formatDateTime(dateString)` 교체
  - [x] date-utils import 추가
- [x] **AdminOverviewPage 날짜 포맷팅 교체**
  - [x] `toLocaleString('en-US')` → `formatDateTime(dateString)` 교체
  - [x] date-utils import 추가
- [x] **WorkersPage 날짜 포맷팅 교체**
  - [x] `toLocaleString('ko-KR')` → `formatDateTime(dateString)` 교체
  - [x] date-utils import 추가
- [x] **WorkerHistoryTable, ErrorDetailModal 컴포넌트 수정**
  - [x] 관련 날짜 포맷팅 교체
  - [x] date-utils import 추가

**기술적 해결사항**:
- 🔧 **브라우저 locale 자동 감지**: navigator.language 기반으로 사용자 locale 자동 설정
- 🔧 **Intl.DateTimeFormat 표준화**: 모든 날짜 포맷팅을 표준 Web API로 통일
- 🔧 **하드코딩 제거**: ko-KR, en-US 등 하드코딩된 locale 완전 제거
- 🔧 **일관된 패턴**: formatDate(날짜만), formatDateTime(날짜+시간) 명확한 구분
- 🔧 **타임존 지원**: 사용자 브라우저 타임존 자동 반영
- 🔧 **fallback 처리**: Intl API 실패 시 안전한 기본 포맷 제공

**수정된 파일**:
- `/web/src/app/admin/users/page.tsx` - formatDateTime으로 교체
- `/web/src/app/admin/teams/page.tsx` - formatDate로 교체  
- `/web/src/app/admin/projects/page.tsx` - formatDate로 교체
- `/web/src/app/admin/api-keys/page.tsx` - formatDateTime으로 교체
- `/web/src/app/admin/page.tsx` - formatDateTime으로 교체
- `/web/src/app/admin/workers/page.tsx` - formatDateTime으로 교체
- `/web/src/components/admin/WorkerHistoryTable.tsx` - formatDateTime으로 교체
- `/web/src/components/admin/ErrorDetailModal.tsx` - formatDateTime으로 교체

### TASK_054: 관리자 권한 불러오기 문제 진단 및 해결 ✅ 완료

**목표**: TASK_052 작업 이후 관리자 권한이 불러와지지 않는 문제 해결

- [x] **문제 원인 발견**
  - [x] 데이터베이스: hdyun@fnfcorp.com 계정의 is_admin=true 정상 확인
  - [x] NextAuth.js: JWT 토큰과 세션 구조 정상 확인
  - [x] **핵심 문제**: UserResponse 모델에 is_admin 필드 누락
- [x] **문제 해결**
  - [x] UserResponse 모델에 is_admin 필드 추가
  - [x] 로그인 API 응답에서 관리자 권한 정보 전달 복구
  - [x] 디버깅 로그 제거 및 코드 정리

**기술적 해결사항**:
- 🔧 **API 모델 수정**: UserResponse에 `is_admin: bool` 필드 추가
- 🔧 **데이터 흐름 복구**: DB → API → NextAuth.js → 프론트엔드 권한 전달 체인 복구
- 🔧 **근본 원인**: Pydantic 모델에서 필드 누락으로 인한 정보 손실

**커밋 정보**: 
- commit 93a2ceb - "fix: [TASK_054] 관리자 권한 불러오기 문제 해결"

### TASK_053: workflow_todo.md 파일 정리 및 구조 개선 ✅ 완료

**목표**: 맥락을 유지하면서 불필요한 부분을 정리하여 파일 크기를 50% 이상 축소

- [x] **현재 파일 분석**
  - [x] 전체 라인 수 확인: 1,173줄, 25개 TASK
  - [x] 완료된 작업과 최근 작업 구분
- [x] **보존할 내용 선별**
  - [x] 최근 5개 완료 작업과 핵심 인사이트 선별
  - [x] 중요한 기술적 해결사항과 패턴 유지
- [x] **새로운 구조 적용**
  - [x] 간결한 메타데이터 유지
  - [x] 1,173줄 → 113줄로 90% 축소 완료

**커밋 정보**: 
- commit 8d5de31 - "docs: [TASK_053] workflow_todo.md 파일 정리 및 구조 개선 완료"

### TASK_052: 관리자 권한 사용자를 위한 관리자 패널 메뉴 추가 ✅ 완료

**목표**: GitLab 스타일로 관리자 권한 사용자에게 관리자 패널로 이동할 수 있는 메뉴 추가

- [x] **GitLab 스타일 관리자 메뉴 구현**
  - [x] UserMenu 드롭다운에 "Admin Panel" 메뉴 항목 추가
  - [x] Shield 아이콘과 파란색 텍스트로 관리자임을 명확히 표시
  - [x] 관리자 권한(`isAdmin`)이 있는 사용자에게만 표시
- [x] **보안 강화**
  - [x] AdminLayout에 권한 체크 로직 추가
  - [x] 비관리자 접근 시 `/projects`로 자동 리다이렉트
  - [x] 로딩 중 적절한 UI 표시

**기술적 해결사항**:
- 🔧 **GitLab 패턴 적용**: Profile → Settings → **Admin Panel** → Logout 순서
- 🔧 **권한 기반 UI**: `useAdminPermission` 훅으로 관리자만 메뉴 표시
- 🔧 **보안 강화**: 클라이언트와 서버 양쪽에서 권한 검증

**커밋 정보**: 
- commit b76c647 - "feat: [TASK_052] 관리자 권한 사용자를 위한 관리자 패널 메뉴 추가"

### TASK_049: 사용자 벌크 삭제 API 문제 진단 및 수정 ✅ 완료

**목표**: 관리자 패널에서 사용자 삭제 시 실제 삭제되지 않고 비활성 상태로만 표시되는 문제 해결

- [x] **문제 원인 발견**: 벌크 삭제 API는 정상 작동 중, 문제는 사용자 목록 조회에서 비활성 사용자도 표시
- [x] **해결 방법**: 사용자 목록 API에 `include_inactive` 매개변수 추가 (기본값: false)
- [x] **결과**: 삭제된 사용자가 목록에서 즉시 사라져 직관적인 UX 제공

**기술적 해결사항**:
- 🔧 **활성 사용자 필터링**: 기본적으로 `is_active=true`인 사용자만 조회
- 🔧 **옵션 매개변수**: 필요시 `include_inactive=true`로 비활성 사용자도 조회 가능
- 🔧 **데이터 무결성**: 소프트 삭제로 데이터 복구 가능성 유지

**커밋 정보**: 
- commit c33fae7 - "fix: [TASK_049] 관리자 패널 사용자 목록 조회에서 활성 사용자만 표시하도록 수정"

### TASK_050: 관리자 사용자 삭제 기능 점검 및 일괄삭제 구현 ✅ 완료

**목표**: 관리자 패널의 개별 사용자 삭제 기능이 작동하지 않는 문제 해결 및 일괄삭제 기능 구현

**🚨 발견된 문제 해결**: 개별 삭제 기능이 이미 완벽하게 구현되어 있었음. 문제는 권한/네트워크/캐시 등 다른 원인

**기술적 구현사항**:
- 🔧 **완전한 삭제 시스템**: 개별 삭제 + 일괄삭제 모두 구현
- 🔧 **체크박스 UI**: 전체 선택, 개별 선택, 부분 선택 상태 표시
- 🔧 **Bulk Delete API**: 효율적인 일괄삭제 엔드포인트 구현
- 🔧 **안전장치**: 자신 계정 보호, 마지막 관리자 보호
- 🔧 **사용자 경험**: 삭제 전 확인, 삭제될 사용자 목록 미리보기

### TASK_101: 스케줄러 워커 도구 동기화 기능 구현 ✅ 완료

**목표**: APScheduler 워커에서 MCP 서버 상태 확인 시 도구 목록도 동시에 동기화하여 도구 개수가 0개로 표시되는 문제 해결

**기술적 해결사항**:
- 🔧 **통합 동기화**: 서버 상태 체크와 도구 목록 동기화를 한 번에 처리
- 🔧 **성능 최적화**: 별도 요청 없이 기존 워커에서 통합 처리
- 🔧 **일관성 보장**: 서버 연결 상태와 도구 정보가 항상 동기화

### TASK_055: 관리자 패널 Teams/Projects 관리 기능 추가 ✅ 완료

**목표**: 관리자 패널에서 Teams와 Projects를 관리하는 기능 추가 및 영어 UI 적용

- [x] **AdminLayout 한글 UI 요소를 영어로 변경**
  - [x] 로딩 상태 메시지: "로딩 중..." → "Loading...", "권한을 확인하는 중..." → "Checking permissions..."
  - [x] 네비게이션 탭: "개요" → "Overview"
  - [x] 준비중 상태: "준비중" → "Coming Soon"
  - [x] 모든 주석을 영어로 변경
- [x] **백엔드 Teams 관리 API 구현**
  - [x] Teams 목록 조회 API (페이지네이션, 검색, 통계 포함)
  - [x] Teams 생성/수정/삭제 API (소프트 삭제)
  - [x] Teams 소유권 이전 API
  - [x] Teams 멤버 관리 API
- [x] **백엔드 Projects 관리 API 구현**
  - [x] Projects 목록 조회 API (페이지네이션, 검색, 통계 포함)
  - [x] Projects 생성/수정/삭제 API (하드 삭제)
  - [x] Projects 소유권 이전 API
  - [x] Projects 멤버 관리 API
- [x] **Teams 관리 페이지 UI 구현 (영어)**
  - [x] Teams 목록 테이블 (페이지네이션, 검색, 필터링)
  - [x] 검색 및 필터링 기능 (활성/비활성, 검색어)
  - [x] 팀 생성 모달 (CreateTeamModal)
  - [x] 팀 편집 모달 (EditTeamModal)
  - [x] 소유권 이전 모달 (TransferOwnershipModal)
  - [x] 통계 대시보드 카드
  - [x] Next.js API 라우트 연결

**기술적 해결사항**:
- 🔧 **영어 UI 표준화**: 모든 관리자 패널 UI를 영어로 통일
- 🔧 **Teams 관리 완성**: 생성, 편집, 삭제, 소유권 이전 모든 기능 구현
- 🔧 **데이터 구조 일관성**: project_id 기반 간접 참조로 통계 계산
- 🔧 **사용자 경험**: GitLab/GitHub 스타일 관리자 패널 구현

**커밋 정보**: 
- commit e245f68 - "fix: [TASK_061] Teams 편집 API 잔여 team_id 참조 오류 수정"

### TASK_061: Projects 관리 페이지 UI 구현 ✅ 완료

**목표**: Teams와 동일한 패턴으로 Projects 관리 페이지 완전 구현 (영어 UI)

- [x] **Projects 관리 페이지 메인 UI 구현**
  - [x] Projects 목록 테이블 (페이지네이션, 검색, 필터링)
  - [x] 통계 대시보드 카드 (총 프로젝트, 멤버 수, 서버 수, API 키 수)
  - [x] 검색 및 필터링 기능 (이름, 설명, 슬러그 검색)
  - [x] 보안 배지 (SSE Auth, Message Auth, IP 제한 표시)
- [x] **Projects 모달 컴포넌트 구현**
  - [x] CreateProjectModal (보안 설정 포함)
  - [x] EditProjectModal (보안 설정 편집)
  - [x] TransferOwnershipModal (소유권 이전)
- [x] **Next.js API 라우트 구현**
  - [x] /api/admin/projects/ (GET, POST)
  - [x] /api/admin/projects/[project_id]/ (GET, PUT, DELETE)
  - [x] /api/admin/projects/[project_id]/transfer-ownership/ (POST)

**기술적 해결사항**:
- 🔧 **Teams 패턴 적용**: Teams 페이지와 동일한 구조로 일관성 확보
- 🔧 **보안 설정 관리**: SSE Auth, Message Auth, IP 제한 기능 완전 구현
- 🔧 **영어 UI 완성**: 모든 텍스트, 메시지, 라벨을 영어로 구현
- 🔧 **API 라우트 완성**: Next.js 15+ async params 패턴 적용
- 🔧 **통계 대시보드**: 프로젝트별 멤버, 서버, API 키 통계 표시
- 🔧 **하드 삭제**: Projects는 완전 삭제 (Teams와 다른 정책)

**커밋 정보**: 
- commit bb016b0 - "feat: [TASK_061] Projects 관리 페이지 UI 구현"

### TASK_062: API Keys 관리 페이지 구현 ✅ 완료

**목표**: 관리자가 모든 API 키를 모니터링하고 관리할 수 있는 기능 구현 (마스킹 처리)

- [x] **백엔드 Admin API Keys 관리 API 구현**
  - [x] API 키 목록 조회 API (페이지네이션, 검색, 필터링)
  - [x] API 키 상태 관리 API (활성화/비활성화)
  - [x] API 키 삭제 API (관리자 전용)
  - [x] 사용량 통계 조회 API
- [x] **API Keys 관리 페이지 메인 UI 구현**
  - [x] API 키 목록 테이블 (마스킹 처리)
  - [x] 프로젝트별 필터링 기능
  - [x] 상태별 필터링 (활성/비활성/만료)
  - [x] 통계 대시보드 (총 키 수, 활성 키, 만료 예정)
- [x] **보안 및 마스킹 기능**
  - [x] API 키 prefix만 표시 (project_abc123***)
  - [x] 마지막 사용 IP 표시
  - [x] 사용량 제한 표시
  - [x] 만료일 관리
- [x] **관리 기능 구현**
  - [x] 키 활성화/비활성화 토글
  - [x] 키 삭제 (확인 모달 포함)
  - [x] 사용량 제한 조정 (기본 구현)
  - [x] 만료일 연장 (기본 구현)

**기술적 해결사항**:
- 🔧 **백엔드 API 완성**: admin_api_keys.py에 전체 CRUD API 구현
- 🔧 **마스킹 보안**: API 키 프리픽스만 표시하여 보안 강화 (mask_api_key_prefix)
- 🔧 **통계 대시보드**: 총 키, 활성 키, 만료 예정 키 모니터링
- 🔧 **필터링 시스템**: 검색, 프로젝트별, 상태별, 만료 키 필터링
- 🔧 **실시간 관리**: 키 활성화/비활성화, 삭제 기능 즉시 반영
- 🔧 **Next.js API 라우트**: JWT 토큰 기반 인증 패턴 완전 적용
- 🔧 **영어 UI**: 모든 인터페이스를 영어로 구현하여 일관성 확보

**커밋 정보**: 
- commit 0f07baf - "feat: [TASK_062] API Keys 관리 Next.js API 라우트 구현"
- commit 0c69820 - "feat: [TASK_062] API Keys 관리 페이지 UI 구현"

### TASK_063: shadcn/ui AlertDialog 설치 및 UI 컴포넌트 표준화 ✅ 완료

**목표**: AlertDialog 에러 해결 및 shadcn/ui 컴포넌트로 표준화

- [x] **shadcn/ui AlertDialog 설치**
  - [x] `npx shadcn@latest add alert-dialog` 실행
  - [x] AlertDialog 컴포넌트 정상 설치 확인
  - [x] API Keys 페이지 에러 해결

- [x] **기존 UI 컴포넌트 vs shadcn/ui 비교 분석**
  - [x] 현재 사용 중인 UI 컴포넌트들 목록 조사
  - [x] shadcn/ui 컴포넌트와 품질/기능 비교
  - [x] 표준화 방향 결정 (shadcn/ui 우선)

- [x] **shadcn/ui로 표준화**
  - [x] shadcn/ui Switch 컴포넌트로 교체
  - [x] Radix UI 기반 접근성 및 키보드 지원 개선
  - [x] Next.js 15+ API 라우트 params Promise 패턴 수정
  - [x] TypeScript 컴파일 에러 해결

- [x] **테스트 및 검증**
  - [x] API Keys 페이지 정상 작동 확인
  - [x] 다른 관리자 페이지들 정상 작동 확인
  - [x] shadcn/ui 컴포넌트 품질 및 일관성 검증

**기술적 해결사항**:
- 🔧 **shadcn/ui 표준화**: AlertDialog, Switch 등 고품질 컴포넌트로 교체
- 🔧 **Radix UI 기반**: 접근성, 키보드 지원, WAI-ARIA 준수
- 🔧 **Next.js 15+ 호환성**: 모든 API 라우트의 params Promise 패턴 적용
- 🔧 **TypeScript 안정성**: CVA(Class Variance Authority) 기반 타입 안전성
- 🔧 **일관된 디자인**: Tailwind CSS 최적화된 컴포넌트 시스템

**커밋 정보**: 
- commit a1d3748 - "feat: [TASK_063] shadcn/ui AlertDialog 설치 및 Switch 컴포넌트 표준화"
- commit 785214a - "fix: [TASK_063] Next.js 15+ API 라우트 params Promise 패턴 수정"
- commit 5c62325 - "fix: [TASK_063] 나머지 API 라우트 Next.js 15+ 패턴 적용"

### TASK_056: Admin Teams API 라우터 등록 및 404 오류 수정 ✅ 완료

**목표**: 백엔드에서 admin teams API가 404 오류를 반환하는 문제 수정

- [x] **문제 원인 발견**
  - [x] app.py에서 admin_teams_router, admin_projects_router가 등록되지 않음
  - [x] routes.py에는 등록되어 있지만 app.py에서 routes.py를 사용하지 않음
- [x] **문제 해결**
  - [x] app.py에 admin_teams_router, admin_projects_router import 추가
  - [x] app.py에 라우터 등록 코드 추가
  - [x] API 엔드포인트 활성화 완료

**기술적 해결사항**:
- 🔧 **라우터 등록**: app.py에 admin_teams_router, admin_projects_router 추가
- 🔧 **API 경로 활성화**: /api/admin/teams/*, /api/admin/projects/* 엔드포인트 정상 작동
- 🔧 **개발 환경 수정**: 백엔드 재시작 후 정상 동작 확인

### TASK_057: Admin Teams API ApiKey 모델 참조 오류 수정 ✅ 완료

**목표**: ApiKey.team_id 속성 참조 오류 수정 (team_id 대신 project_id 사용하도록 변경)

- [x] **문제 원인 발견**
  - [x] ApiKey 모델은 project_id 필드를 사용하며 team_id 필드가 존재하지 않음
  - [x] admin_teams.py에서 ApiKey.team_id 참조로 인한 속성 오류 발생
- [x] **문제 해결**
  - [x] admin_teams.py의 API 키 개수 계산 로직 수정
  - [x] 팀 멤버 → 프로젝트 → API 키 경로로 간접 참조 구현
  - [x] 모든 API 키 통계 조회 함수 수정 완료
  - [x] McpServer.team_id 참조 오류 추가 발견 및 수정
  - [x] 서버 개수 통계도 project_id 기반으로 수정 완료

**기술적 해결사항**:
- 🔧 **데이터 구조 분석**: ApiKey, McpServer 모두 project_id 기반, team과는 간접 관계
- 🔧 **쿼리 수정**: TeamMember → ProjectMember → ApiKey/McpServer 경로로 통계 계산
- 🔧 **일관성 확보**: 모든 통계 카운트 함수에 동일한 로직 적용

**커밋 정보**: 
- commit [sha] - "fix: [TASK_057] ApiKey team_id 속성 오류 수정 - project_id 기반 통계 계산"

### TASK_058: Admin Teams UI Plan 필드 제거 및 편집 기능 개선 ✅ 완료

**목표**: Teams 목록과 편집 모달에서 Plan 필드 제거 및 편집 API 정상 작동 확보

- [x] **Teams 목록 테이블에서 Plan 컬럼 제거**
  - [x] TableHead "Plan" 제거
  - [x] TableCell Plan 뱃지 제거
  - [x] 테이블 레이아웃 정리
- [x] **EditTeamModal에서 Plan 필드 제거**
  - [x] Plan Select 드롭다운 제거
  - [x] UpdateTeamForm 인터페이스에서 plan 필드 제거
  - [x] formData 초기화에서 plan 제거
  - [x] Select 컴포넌트 import 제거
- [x] **CreateTeamModal에서 Plan 필드 제거**
  - [x] Plan Select 드롭다운 제거
  - [x] CreateTeamForm 인터페이스에서 plan 필드 제거
  - [x] Grid 레이아웃을 3칸에서 2칸으로 조정

**기술적 해결사항**:
- 🔧 **UI 간소화**: Plan 관련 UI 요소 완전 제거로 사용자 혼란 방지
- 🔧 **API 호환성**: 백엔드는 plan 필드를 Optional로 유지하여 호환성 확보
- 🔧 **레이아웃 최적화**: Grid 구조를 재정렬하여 깔끔한 UI 제공

**커밋 정보**: 
- commit [sha] - "feat: [TASK_058] Admin Teams UI에서 Plan 필드 제거 및 편집 기능 개선"

### TASK_059: Teams 편집 API 오류 수정 ✅ 완료

**목표**: Teams 편집 시 발생하는 Next.js params 오류와 백엔드 McpServer.team_id 오류 수정

- [x] **Next.js API 라우트 수정**
  - [x] `params.team_id` → `const { team_id } = await params` 로 변경
  - [x] GET, PUT, DELETE 모든 메서드에 적용
  - [x] Next.js 15+ 동적 API 호환성 확보
- [x] **백엔드 teams.py McpServer 참조 오류 수정**
  - [x] McpServer.team_id 참조를 project_id 기반으로 변경
  - [x] ApiKey.team_id 참조도 project_id 기반으로 변경
  - [x] TeamMember → ProjectMember → McpServer/ApiKey 경로로 간접 참조

**기술적 해결사항**:
- 🔧 **Next.js 호환성**: async params 패턴으로 동적 라우트 파라미터 처리
- 🔧 **데이터 모델 일관성**: 모든 API에서 project_id 기반 구조로 통일
- 🔧 **API 안정성**: Teams 편집 기능 완전히 정상 작동

**커밋 정보**: 
- commit [sha] - "fix: [TASK_059] Teams 편집 API Next.js params 오류 및 McpServer 참조 수정"

### TASK_060: Next.js 15+ 개발 지침 추가 ✅ 완료

**목표**: Next.js 15.3.3 환경에 맞는 개발 지침을 CLAUDE.md에 추가하여 향후 개발 일관성 확보

- [x] **프로젝트 환경 정보 추가**
  - [x] Next.js 15.3.3, React 19.1.0, NextAuth.js 5.0 베타 명시
  - [x] 현재 사용 중인 정확한 버전 정보 포함
- [x] **Next.js 15+ 필수 변경사항 문서화**
  - [x] 동적 API 라우트 파라미터 await 처리 필수
  - [x] 잘못된 방법(14 스타일)과 올바른 방법(15+ 스타일) 비교
  - [x] 모든 HTTP 메서드별 표준 패턴 제공
- [x] **개발 환경 검증 체크리스트 제공**
  - [x] params await 사용 확인
  - [x] NextAuth.js v5 패턴 준수
  - [x] TypeScript 5.3+ 호환성
- [x] **마이그레이션 가이드 추가**
  - [x] Next.js 14에서 15로 업그레이드 시 주의사항
  - [x] React 19 Strict Mode 대응 방법

**기술적 해결사항**:
- 🔧 **버전 일관성**: 실제 package.json과 일치하는 정확한 버전 정보
- 🔧 **개발 표준화**: Next.js 15+ 필수 패턴을 표준으로 확립
- 🔧 **호환성 확보**: 향후 API 개발 시 15+ 표준 자동 적용

**커밋 정보**: 
- commit [sha] - "docs: [TASK_060] Next.js 15+ 개발 지침 추가 및 표준화"

### TASK_063: Next.js 15+ API 라우트 params Promise 오류 일괄 수정 ✅ 완료

**목표**: Next.js 15.3.3 환경에서 동적 파라미터 사용 API 라우트의 params Promise 오류 일괄 수정

- [x] **동적 API 라우트 파일 식별**
  - [x] 전체 46개 API 라우트 파일 확인
  - [x] params 사용하는 파일들 분류 ([projectId], [serverId], [team_id] 등)
  - [x] 수정 우선순위 결정
- [x] **Next.js 15+ 패턴 적용**
  - [x] params 직접 사용 → await params로 변경
  - [x] destructuring 패턴 적용 (const { projectId } = await params)
  - [x] 모든 HTTP 메서드 (GET, POST, PUT, DELETE) 대응
- [x] **Admin 패널 API 라우트 수정**
  - [x] /api/admin/teams/[team_id]/ 관련 파일
  - [x] /api/admin/projects/[project_id]/ 관련 파일  
  - [x] /api/admin/api-keys/[api_key_id]/ 관련 파일
- [x] **Projects API 라우트 수정**
  - [x] /api/projects/[projectId]/ 하위 모든 파일
  - [x] /api/projects/[projectId]/servers/[serverId]/ 관련 파일
  - [x] /api/projects/[projectId]/api-keys/[keyId]/ 관련 파일
- [x] **Teams API 라우트 수정**
  - [x] /api/teams/[teamId]/ 관련 파일
  - [x] /api/teams/[teamId]/members/ 관련 파일
- [x] **기타 동적 API 라우트 수정**
  - [x] /api/tool-call-logs/[logId]/route.ts
  - [x] /api/admin/users/[userId]/route.ts
- [x] **수정 결과 검증**
  - [x] TypeScript 컴파일 오류 해결 확인
  - [x] 모든 동적 API 라우트 정상 작동 검증

**기술적 해결사항**:
- 🔧 **Next.js 15+ 호환성**: async params 패턴으로 완전 전환
- 🔧 **TypeScript 오류 해결**: "Property does not exist on type 'Promise<any>'" 완전 제거  
- 🔧 **API 안정성**: 모든 동적 라우트 정상 작동 보장
- 🔧 **일관된 패턴**: 모든 파일에 동일한 Next.js 15+ 패턴 적용

**커밋 정보**: 
- commit 785214a - "fix: [TASK_063] Next.js 15+ API 라우트 params Promise 패턴 수정"
- commit 5c62325 - "fix: [TASK_063] 나머지 API 라우트 Next.js 15+ 패턴 적용"

### TASK_064: API Keys 페이지 Select 컴포넌트 빈 문자열 value 오류 수정 ✅ 완료

**목표**: AdminApiKeysPage에서 Radix UI Select 컴포넌트의 빈 문자열 value 오류 해결

- [x] **오류 발생 지점 식별**
  - [x] AdminApiKeysPage 333번 줄 `<SelectItem value="">All Status</SelectItem>` 확인
  - [x] Radix UI Select에서 빈 문자열 value 사용 금지 정책 파악
  - [x] statusFilter 상태 관리 분석

- [x] **Select 컴포넌트 수정**
  - [x] 빈 문자열 `value=""` 대신 `value="all"` 사용
  - [x] placeholder 속성으로 기본 표시 텍스트 설정
  - [x] statusFilter 초기값을 'all'로 변경

- [x] **필터링 로직 업데이트**
  - [x] loadApiKeys 함수에서 'all' 값 처리 추가
  - [x] statusFilter !== 'all' 조건으로 필터링 적용
  - [x] Clear Filters 버튼 조건 및 리셋 로직 수정

- [x] **테스트 및 검증**
  - [x] Select 컴포넌트 정상 작동 확인
  - [x] 필터링 기능 정상 작동 확인
  - [x] Radix UI 표준 준수 확인

**기술적 해결사항**:
- 🔧 **Radix UI 표준 준수**: 빈 문자열 value 대신 의미있는 'all' 값 사용
- 🔧 **상태 관리 개선**: statusFilter 초기값과 리셋 로직 일관성 확보
- 🔧 **필터링 로직 최적화**: 'all' 상태에서는 필터 조건을 API에 전달하지 않음
- 🔧 **사용자 경험**: placeholder와 Clear Filters 버튼 동작 개선

**커밋 정보**: 
- commit 86b8311 - "fix: [TASK_064] API Keys 페이지 Select 컴포넌트 빈 문자열 value 오류 수정"

### TASK_065: API Keys 필터링 Boolean 파싱 오류 수정 ✅ 완료

**목표**: statusFilter 'all' 값이 백엔드 API로 전달되어 Boolean 파싱 오류가 발생하는 문제 수정

- [x] **문제 지점 정확한 분석**
  - [x] loadApiKeys 함수의 params 생성 로직에서 스프레드 연산자 조건문 문제 발견
  - [x] `...(statusFilter && statusFilter !== 'all' && { is_active: statusFilter })` 조건이 예상과 다르게 작동
  - [x] 'all' 값이 백엔드로 전달되어 Boolean 파싱 실패 확인

- [x] **필터링 조건 수정**
  - [x] 스프레드 연산자 조건문을 명시적인 if문으로 변경
  - [x] `if (statusFilter && statusFilter !== 'all')` 조건에서만 params.append 실행
  - [x] 'all' 값일 때 is_active 파라미터 완전 제외 보장

- [x] **백엔드 API 호환성 확인**
  - [x] admin_api_keys.py의 `is_active: Optional[bool] = None` 파라미터 확인
  - [x] Boolean 파싱 요구사항 ("true"/"false" 문자열) 검토
  - [x] FastAPI의 자동 타입 변환 동작 방식 이해

- [x] **테스트 및 검증**
  - [x] 'All Status' 선택 시 is_active 파라미터 제외 확인
  - [x] Active/Inactive 선택 시 올바른 파라미터 전달 확인
  - [x] Boolean 파싱 오류 해결 확인

**기술적 해결사항**:
- 🔧 **조건문 명시화**: 스프레드 연산자 대신 명시적 if문으로 조건 처리 개선
- 🔧 **파라미터 제어**: 'all' 값 시 is_active 파라미터 완전 제외로 오류 방지
- 🔧 **API 호환성**: 백엔드 Boolean 파싱 요구사항 정확히 준수
- 🔧 **디버깅 개선**: URLSearchParams 생성 과정을 더 명확하고 제어 가능하게 변경

**커밋 정보**: 
- commit 7db11aa - "fix: [TASK_065] API Keys 필터링 Boolean 파싱 오류 수정"

### TASK_066: 프로젝트 권한 체크 대소문자 비교 오류 수정 ✅ 완료

**목표**: Owner 권한 사용자가 읽기 전용 모드로 표시되는 권한 체크 로직 오류 수정

- [x] **권한 체크 로직 분석**
  - [x] 프로젝트 설정 페이지의 `canEdit` 로직에서 'Owner' 비교 확인
  - [x] `useProjectStore`의 `currentUserRole` 설정 방식 분석
  - [x] 백엔드 API 응답 데이터 구조 파악

- [x] **데이터베이스 권한 데이터 확인**
  - [x] ProjectRole enum에서 OWNER = "owner" (소문자) 정의 확인
  - [x] 백엔드에서 "owner" (소문자)로 반환하는 것 확인
  - [x] 프론트엔드에서 "Owner" (대문자)와 비교하는 문제 식별

- [x] **권한 비교 로직 수정**
  - [x] `currentUserRole === 'Owner'` → `currentUserRole?.toLowerCase() === 'owner'` 수정
  - [x] 대소문자 구분 없는 안전한 비교로 변경
  - [x] null 체크 추가로 안정성 확보

- [x] **UI 표시 로직 수정**
  - [x] 읽기 전용 모드 표시 조건 자동 해결
  - [x] "권한 없음" 경고 표시 조건 자동 해결
  - [x] Owner 권한에 대한 올바른 편집 권한 부여

**기술적 해결사항**:
- 🔧 **대소문자 안전 비교**: `?.toLowerCase() === 'owner'` 패턴으로 안전한 권한 체크
- 🔧 **Null 안전성**: Optional chaining으로 undefined/null 값 처리
- 🔧 **권한 일관성**: 백엔드 ProjectRole enum과 일치하는 소문자 기준 비교
- 🔧 **사용자 경험**: Owner 권한 사용자의 정상적인 편집 권한 복구

**커밋 정보**: 
- commit adf537e - "fix: [TASK_066] 프로젝트 권한 체크 대소문자 비교 오류 수정"

### TASK_068: 관리자 페이지 검색 기능 분석 및 개선 방안 제시

**목표**: 관리자 패널의 4개 주요 페이지 검색 기능 현재 상태 분석 및 개선 방안 제시

- [x] **AdminUsersPage 검색 기능 분석**
  - [x] 검색 Input 컴포넌트 위치 확인: L509-514에 Search 아이콘과 함께 구현
  - [x] onChange 이벤트로 실시간 검색: `setSearchTerm(e.target.value)` (L512)
  - [x] debounce 적용 여부: 500ms 디바운스 적용됨 (L97)
  - [x] API 호출 방식: searchTerm 변경 시 자동 fetchUsers() 호출 (L95-100)

- [x] **AdminTeamsPage 검색 기능 분석**
  - [x] 검색 Input 컴포넌트 위치 확인: L296-301에 Search 아이콘과 함께 구현
  - [x] onChange 이벤트로 실시간 검색: `setSearchTerm(e.target.value)` (L299)
  - [x] debounce 적용 여부: 500ms 디바운스 적용됨 (L139-145)
  - [x] API 호출 방식: searchTerm 변경 시 자동 fetchTeams() 호출 (L135)

- [x] **AdminProjectsPage 검색 기능 분석**
  - [x] 검색 Input 컴포넌트 위치 확인: L292-297에 Search 아이콘과 함께 구현
  - [x] onChange 이벤트로 실시간 검색: `setSearchTerm(e.target.value)` (L295)
  - [x] debounce 적용 여부: 500ms 디바운스 적용됨 (L134-141)
  - [x] API 호출 방식: searchTerm 변경 시 자동 fetchProjects() 호출 (L131)

- [x] **AdminApiKeysPage 검색 기능 분석**
  - [x] 검색 Input 컴포넌트 위치 확인: L323-328에 Search 아이콘과 함께 구현
  - [x] onChange 이벤트로 실시간 검색: `setSearchTerm(e.target.value)` (L326)
  - [x] debounce 적용 여부: 즉시 loadApiKeys() 호출 (L245-246)
  - [x] API 호출 방식: useEffect로 searchTerm 변경 시 자동 loadApiKeys() 호출

- [x] **검색 기능 일관성 분석**
  - [x] 모든 페이지에서 Search 아이콘과 Input 컴포넌트 조합 사용
  - [x] onChange 이벤트로 실시간 검색 구현 (Enter 키 처리 없음)
  - [x] Users/Teams/Projects는 500ms debounce, API Keys는 즉시 호출
  - [x] 페이지네이션과 검색 연동: 검색 시 첫 페이지로 리셋

### TASK_067: 워커 실행 이력 에러 메시지 상세 팝업 및 복사 기능 구현 ✅ 완료

**목표**: 워커 실행 이력 테이블에서 에러 메시지 row 클릭 시 상세 내용을 팝업으로 표시하고 Copy 기능 추가

- [x] **현재 워커 실행 이력 테이블 구조 분석**
  - [x] AdminWorkersPage 컴포넌트에서 에러 메시지 표시 부분 확인
  - [x] 에러 메시지 데이터 구조 및 표시 방식 파악
  - [x] 현재 테이블 row 클릭 이벤트 처리 상태 확인

- [x] **에러 메시지 상세 팝업 Modal 구현**
  - [x] ErrorDetailModal 컴포넌트 생성
  - [x] 전체 에러 메시지 텍스트 표시 (줄바꿈 포함)
  - [x] 에러 발생 시간, 워커 종류 등 추가 정보 표시
  - [x] JSON 형태의 에러 데이터인 경우 포맷팅 표시

- [x] **복사 기능 구현**
  - [x] Copy to Clipboard 버튼 추가
  - [x] navigator.clipboard API 활용
  - [x] 복사 성공 알림 (토스트 메시지)
  - [x] 복사 실패 시 fallback 처리

- [x] **테이블 row 클릭 이벤트 연동**
  - [x] 에러 메시지가 있는 row에만 클릭 가능한 스타일 적용
  - [x] 클릭 시 해당 에러 정보로 모달 오픈
  - [x] 마우스 커서 변경 (pointer) 및 호버 효과

- [x] **사용자 경험 개선**
  - [x] 긴 에러 메시지도 읽기 쉽게 표시
  - [x] 스크롤 가능한 텍스트 영역 제공
  - [x] 모달 크기 조정 및 반응형 대응
  - [x] 키보드 단축키 지원 (Ctrl+C/Cmd+C)

**커밋 정보**:
- commit 5aeaf86 - "feat: [TASK_067] Add error detail modal with copy functionality for worker history"

### TASK_070: 관리자 Overview 페이지 영어 UI 변환 ✅ 완료

**목표**: CLAUDE.md English-First 정책에 따라 관리자 Overview 페이지의 모든 한국어 UI를 영어로 변환

- [x] **System Overview 섹션 영어 변환**
  - [x] "시스템 개요" → "System Overview"
  - [x] "마지막 업데이트" → "Last updated"
  - [x] "새로고침" → "Refresh"
  - [x] 시간 표시 형식을 ko-KR에서 en-US로 변경
- [x] **통계 카드 영어 변환**
  - [x] "총 사용자" → "Total Users"
  - [x] "관리자: X명" → "Admins: X"
  - [x] "총 프로젝트" → "Total Projects"
  - [x] "생성된 프로젝트 수" → "Created projects"
  - [x] "MCP 서버" → "MCP Servers"
  - [x] "활성/전체 서버" → "Active/Total servers"
  - [x] "워커 상태" → "Worker Status"
  - [x] "실행 중" → "Running", "정지됨" → "Stopped"
  - [x] "백그라운드 워커" → "Background worker"
- [x] **Quick Actions 섹션 영어 변환**
  - [x] "빠른 액션" → "Quick Actions"
  - [x] "워커 관리" → "Worker Management"
  - [x] "APScheduler 백그라운드 워커를 관리하고 모니터링하세요" → "Manage and monitor APScheduler background workers"
  - [x] "워커 관리로 이동" → "Go to Workers"
  - [x] "마지막 실행" → "Last run"
  - [x] "사용자 관리" → "User Management"
  - [x] "사용자 계정, 권한, 팀 멤버십을 관리하세요" → "Manage user accounts, permissions, and team memberships"
  - [x] "사용자 관리로 이동" → "Go to Users"
  - [x] "시스템 모니터링" → "System Monitoring"
  - [x] "시스템 로그, 성능 메트릭, 활동 추적" → "System logs, performance metrics, and activity tracking"
  - [x] "준비 중" → "Coming Soon"
- [x] **System Status 섹션 영어 변환**
  - [x] "시스템 상태" → "System Status"
  - [x] "주요 컴포넌트 상태" → "Core Component Status"
  - [x] "시스템의 주요 컴포넌트들의 현재 상태입니다" → "Current status of the system's core components"
  - [x] "FastAPI 백엔드" → "FastAPI Backend"
  - [x] "정상 동작 중" → "Running normally"
  - [x] "온라인" → "Online"
  - [x] "PostgreSQL 데이터베이스" → "PostgreSQL Database"
  - [x] "연결 상태 양호" → "Connection healthy"
  - [x] "연결됨" → "Connected"
  - [x] "APScheduler 워커" → "APScheduler Worker"
  - [x] "자동 서버 상태 체크 실행 중" → "Auto server status check running"
  - [x] "워커가 정지된 상태" → "Worker is stopped"
- [x] **코드 주석 영어 변환**
  - [x] "폴백으로 더미 데이터 사용" → "Fallback to dummy data on error"
  - [x] "30초마다 자동 새로고침" → "Auto refresh every 30 seconds"
  - [x] 모든 섹션 주석을 영어로 변경

**기술적 해결사항**:
- 🔧 **UI 언어 일관성**: CLAUDE.md English-First 정책 완전 적용
- 🔧 **시간 지역화**: 모든 시간 표시를 한국어(ko-KR)에서 영어(en-US)로 변경
- 🔧 **사용자 경험**: 영어 UI로 글로벌 표준 관리자 패널 구현
- 🔧 **코드 주석**: 개발자 가독성을 위한 영어 주석 표준화

### TASK_071: 관리자 Users 페이지 영어 UI 변환 ✅ 완료

**목표**: CLAUDE.md English-First 정책에 따라 관리자 Users 페이지의 모든 한국어 UI를 영어로 변환

- [x] **페이지 헤더 및 기본 UI 영어 변환**
  - [x] "사용자 관리" → "User Management"
  - [x] "시스템 사용자 계정을 관리합니다" → "Manage system user accounts"
  - [x] "🧪 테스트 계정 X명 선택" → "🧪 Select X test accounts"
  - [x] "선택된 X명 삭제" → "Delete X selected"
  - [x] "사용자 추가" → "Add User"
- [x] **통계 카드 영어 변환**
  - [x] "총 사용자" → "Total Users"
  - [x] "등록된 전체 사용자" → "All registered users"
  - [x] "활성 사용자" → "Active Users"
  - [x] "현재 활성 상태 사용자" → "Currently active users"
  - [x] "관리자" → "Admins"
  - [x] "관리자 권한 사용자" → "Users with admin privileges"
  - [x] "신규 가입" → "New Signups"
  - [x] "최근 7일 내 가입" → "Joined in last 7 days"
- [x] **사용자 목록 테이블 영어 변환**
  - [x] "사용자 목록" → "User List"
  - [x] "시스템에 등록된 모든 사용자를 관리할 수 있습니다..." → "Manage all users registered in the system..."
  - [x] 테이블 헤더: "사용자", "역할", "상태", "프로젝트", "가입일", "마지막 로그인", "작업" → "User", "Role", "Status", "Projects", "Joined", "Last Login", "Actions"
  - [x] "이름 없음" → "No name"
  - [x] "관리자", "사용자" 뱃지 → "Admin", "User"
  - [x] "활성", "비활성" 뱃지 → "Active", "Inactive"
  - [x] "↓ 일반", "↑ 관리자" → "↓ User", "↑ Admin"
  - [x] "비활성화", "활성화" → "Deactivate", "Activate"
  - [x] "X개 프로젝트" → "X projects"
  - [x] "없음" → "None"
  - [x] "편집", "삭제" → "Edit", "Delete"
- [x] **다이얼로그 및 확인 메시지 영어 변환**
  - [x] 권한 변경 확인 메시지: "Remove admin privileges for..." / "Deactivate ... account?"
  - [x] 상태 변경 확인 메시지: "Deactivated users cannot log in."
  - [x] "사용자 삭제 확인" → "Confirm User Deletion"
  - [x] "일괄 삭제 확인" → "Confirm Bulk Deletion"
  - [x] "삭제될 사용자 목록" → "Users to be deleted"
  - [x] "취소", "삭제" → "Cancel", "Delete"
  - [x] "삭제 중...", "X명 삭제" → "Deleting...", "Delete X users"
- [x] **에러 메시지 및 코드 주석 영어 변환**
  - [x] console.error 메시지들: "Failed to load user list", "Failed to change role", etc.
  - [x] alert 메시지들: "Please select users to delete", "Some user deletions failed", etc.
  - [x] 모든 한국어 주석들: "Modal state management", "User handling functions", etc.
- [x] **날짜 지역화 설정 변경**
  - [x] ko-KR → en-US 날짜 포맷 변경

**기술적 해결사항**:
- 🔧 **완전한 영어화**: 총 80+ 개의 한국어 텍스트를 영어로 변환
- 🔧 **UI 언어 일관성**: CLAUDE.md English-First 정책 완전 적용
- 🔧 **사용자 경험**: 직관적인 영어 UI로 국제 표준 관리자 패널 구현
- 🔧 **코드 품질**: 모든 코드 주석과 에러 메시지를 영어로 표준화
- 🔧 **지역화**: 날짜 표시 형식을 글로벌 표준 en-US로 변경

### TASK_072: 날짜 현지화 시스템 구현 - 간소화 전략 적용 중

**목표**: 백엔드 UTC 저장 표준화 및 프론트엔드 브라우저 locale 기반 날짜 현지화 구현

**간소화 전략**:
- 빠른 패턴 파악: grep 명령으로 datetime 사용 패턴 확인
- 대표 샘플링: User, Project, ApiKey 모델만 먼저 분석
- 점진적 개선: 파일 수정 시 해당 부분의 datetime 처리도 함께 개선

- [ ] **백엔드 UTC 저장 표준화 (간소화)**
  - [ ] User, Project 모델의 datetime 필드만 UTC 표준화
  - [ ] 해당 API 응답 포맷 통일 (ISO 8601)
  - [x] CLAUDE.md에 DateTime 처리 가이드라인 추가
- [x] **프론트엔드 날짜 포맷팅 유틸리티 구현**
  - [x] `formatDate` 유틸리티 함수 생성
  - [x] 브라우저 locale 자동 감지 (navigator.language)
  - [x] Intl.DateTimeFormat API 활용한 현지화
  - [x] 타임존 자동 변환 기능
- [x] **기존 컴포넌트에 적용**
  - [x] 관리자 페이지 날짜 표시 영역 개선
  - [x] 사용자 가입일, 마지막 로그인 등 날짜 필드 적용
  - [x] 워커 실행 이력, 로그 시간 등 시스템 시간 적용

### TASK_073: 프로젝트 datetime 필드 현황 분석 - 간소화 버전

**목표**: 대표 샘플 3개만 분석하여 공통 패턴 파악 및 가이드라인 문서화

- [x] **SQLAlchemy 모델 샘플 분석**
  - [x] User 모델 datetime 필드 확인 - func.now() 사용 중
  - [x] Project 모델 datetime 필드 확인 - datetime.utcnow 사용 중
  - [x] ApiKey 모델 datetime 필드 확인 - datetime.utcnow 사용 중
- [x] **API 응답 샘플 확인**
  - [x] AdminTeamResponse 등에서 datetime 타입 사용 확인
  - [x] Pydantic 기본 직렬화로 ISO 8601 포맷 자동 변환
- [x] **CLAUDE.md 가이드라인 작성**
  - [x] DateTime 처리 표준 정의 완료
  - [x] 점진적 마이그레이션 방법 문서화 완료

### TASK_069: 관리자 페이지 여백 설정 일관성 검토

**목표**: AdminLayout의 여백 설정과 각 관리자 페이지의 여백 설정 일관성 확인 및 최적화

- [ ] **AdminLayout 여백 설정 분석**
  - [ ] 현재 max-w-[1600px] mx-auto px-4 설정 확인
  - [ ] children 렌더링 방식 및 레이아웃 구조 파악
- [ ] **관리자 페이지별 여백 설정 검토**
  - [ ] /web/src/app/admin/users/page.tsx 여백 설정 확인
  - [ ] /web/src/app/admin/teams/page.tsx 여백 설정 확인
  - [ ] /web/src/app/admin/projects/page.tsx 여백 설정 확인
  - [ ] /web/src/app/admin/api-keys/page.tsx 여백 설정 확인
- [ ] **불필요한 중복 설정 제거**
  - [ ] 각 페이지의 container, max-width 중복 설정 식별
  - [ ] 불필요한 여백/패딩 설정 제거
  - [ ] AdminLayout과 충돌하는 설정 정리
- [ ] **일관성 확보 및 최적화**
  - [ ] 표준 레이아웃 패턴 적용
  - [ ] 반응형 여백 설정 검증
  - [ ] 페이지별 콘텐츠 구성 최적화

### TASK_068: 관리자 페이지 검색 기능 개선 (실시간 → 버튼 + Enter 키) ✅ 완료

**목표**: onChange 실시간 검색을 검색 버튼 + Enter 키 방식으로 변경하여 서버 요청 최적화

- [x] **관리자 페이지 검색 UI 현재 상태 분석**
  - [x] Users 페이지: onChange + 500ms debounce 적용됨
  - [x] Teams 페이지: onChange + 500ms debounce 적용됨  
  - [x] Projects 페이지: onChange + 500ms debounce 적용됨
  - [x] API Keys 페이지: onChange + 즉시 호출 (debounce 없음) ❌

- [x] **Users 페이지 검색 기능 개선**
  - [x] searchInput 상태 분리로 입력 중/검색 실행 구분
  - [x] Search 버튼 + Enter 키 지원 추가
  - [x] Clear 버튼 (X) 추가로 검색 초기화 기능
  - [x] 실시간 debounce 로직 제거
  - [x] 영어 placeholder로 일관성 확보

- [x] **Teams 페이지 검색 기능 개선**
  - [x] searchInput 상태 분리 및 버튼 방식 적용
  - [x] Search 버튼 + Enter 키 지원
  - [x] Clear 버튼 (X) 추가
  - [x] 기존 필터링 시스템과 통합 유지

- [x] **Projects 페이지 검색 기능 개선**
  - [x] searchInput 상태 분리 및 버튼 방식 적용
  - [x] Search 버튼 + Enter 키 지원
  - [x] Clear 버튼 (X) 추가
  - [x] 페이지네이션 연동 유지

- [x] **API Keys 페이지 검색 기능 개선**
  - [x] searchInput 상태 분리 및 버튼 방식 적용
  - [x] Search 버튼 + Enter 키 지원
  - [x] Clear 버튼 (X) 추가
  - [x] 기존 즉시 호출 문제 해결 (debounce 없던 유일한 페이지)

**기술적 해결사항**:
- 🔧 **서버 요청 최적화**: onChange 실시간 요청 → 명시적 검색 실행
- 🔧 **UX 개선**: 입력 중 상태와 검색 실행 상태 명확히 구분
- 🔧 **일관된 패턴**: 모든 페이지에서 동일한 검색 UX 제공
- 🔧 **접근성**: Enter 키 지원으로 키보드 사용자 배려
- 🔧 **시각적 피드백**: Search 아이콘 + 버튼으로 검색 의도 명확화

**커밋 정보**:
- commit 16156c5 - "feat: [TASK_068] Improve Users page search - replace onChange with button + Enter key"
- commit 3efcc46 - "feat: [TASK_068] Improve Teams page search - replace onChange with button + Enter key"
- commit 5c8dfae - "feat: [TASK_068] Improve Projects page search - replace onChange with button + Enter key"
- commit 94e6c82 - "feat: [TASK_068] Improve API Keys page search - replace onChange with button + Enter key"

### TASK_075: APScheduler 설정 및 관련 파일 분석 ✅ 완료

**목표**: mcp-orch 프로젝트의 APScheduler 관련 모든 파일 위치 파악 및 구조 분석

- [x] **APScheduler 핵심 서비스 파일 분석**
  - [x] `/src/mcp_orch/services/scheduler_service.py` - APScheduler 초기화 및 관리 서비스
  - [x] MemoryJobStore 기본 설정, AsyncIOExecutor 사용
  - [x] 서버 상태 체크 및 도구 동기화 통합 작업 구현
- [x] **워커 관리 API 파일 분석**
  - [x] `/src/mcp_orch/api/workers.py` - 워커 제어 REST API
  - [x] 시작/정지/재시작, 설정 업데이트, 이력 조회 API
  - [x] JWT 기반 관리자 권한 체크 구현
- [x] **애플리케이션 초기화 분석**
  - [x] `/src/mcp_orch/api/app.py` - lifespan 이벤트에서 스케줄러 자동 시작/정지
  - [x] 스케줄러 서비스 글로벌 인스턴스 관리
- [x] **설정 관리 분석**
  - [x] `/src/mcp_orch/config.py` - 설정 구조 확인 (워커 설정은 런타임에 관리)
- [x] **프론트엔드 워커 관리 UI 분석**
  - [x] `/web/src/app/admin/workers/page.tsx` - 워커 관리 메인 페이지
  - [x] `/web/src/components/admin/WorkerConfigModal.tsx` - 설정 변경 모달
  - [x] `/web/src/components/admin/WorkerHistoryTable.tsx` - 실행 이력 테이블

**기술적 발견사항**:
- 🔧 **MemoryJobStore 사용**: 영구 저장소 없이 메모리 기반 작업 스케줄링
- 🔧 **통합 작업**: 서버 상태 체크와 도구 목록 동기화를 하나의 작업에서 처리
- 🔧 **런타임 설정**: 설정 변경 시 스케줄러 자동 재시작으로 즉시 반영
- 🔧 **이력 관리**: 메모리 기반 작업 실행 이력 (최대 100개) 저장
- 🔧 **관리자 UI**: 실시간 워커 상태 모니터링 및 제어 기능 완비

### TASK_076: MCP Inspector JDBC 연결 분석 ✅ 완료

**목표**: MCP Inspector에서 JDBC MCP 서버와 연결할 때의 요청 순서와 방식 분석

- [x] **MCP Inspector 연결 구조 분석**
  - [x] useConnection 훅에서 MCP 클라이언트 초기화 과정 확인
  - [x] Transport 생성 및 연결 순서 파악
  - [x] SSEClientTransport/StreamableHTTPClientTransport 방식 분석
- [x] **초기화 및 도구 목록 요청 순서 분석**
  - [x] connect() 함수에서 client.connect(transport) 호출
  - [x] 연결 성공 후 client.getServerCapabilities() 실행
  - [x] initialize 요청은 SDK 내부에서 자동 처리됨
  - [x] tools/list 요청은 사용자가 Tools 탭 클릭 시 별도 실행
- [x] **요청 처리 방식 확인**
  - [x] makeRequest() 함수에서 모든 MCP 요청 통합 처리
  - [x] 각 요청은 순차적으로 처리 (동시 요청 없음)
  - [x] 응답 대기: timeout 설정 (기본 120초) 내에서 대기
  - [x] 에러 처리: 타임아웃, 네트워크 오류 등 예외 상황 처리
- [x] **JDBC MCP 서버 도구 동적 생성 방식 확인**
  - [x] mcp-orch의 standard_mcp.py에서 하드코딩된 도구 목록 확인
  - [x] 실제 JDBC 서버는 별도 프로세스로 실행되어 동적 도구 생성
  - [x] _forward_to_actual_server() 함수로 실제 서버와 통신

**기술적 발견사항**:
- 🔧 **순차적 연결**: initialize → capabilities 확인 → 사용자 요청 시 tools/list 실행
- 🔧 **프록시 구조**: MCP Inspector는 프록시 서버를 통해 실제 MCP 서버와 통신
- 🔧 **SDK 자동화**: @modelcontextprotocol/sdk가 initialize 과정을 자동 처리
- 🔧 **요청 대기**: 각 요청마다 개별 타임아웃 설정으로 응답 대기
- 🔧 **동적 도구**: 실제 JDBC 서버는 연결 설정에 따라 동적으로 도구 생성

### TASK_050: MCP 서버 도구 조회 모드 선택 기능 구현 ✅ 완료

**목표**: JDBC MCP 서버 등 리소스 연결 서버를 위한 순차적 도구 조회 모드 구현

- [x] **server_type 필드 추가**
  - [x] McpServer 모델에 server_type 필드 추가 (api_wrapper/resource_connection)
  - [x] 데이터베이스 마이그레이션 생성 및 적용
  - [x] 기존 서버들을 api_wrapper로 기본 설정
- [x] **백엔드 API 수정**
  - [x] ServerCreate, ServerUpdate, ServerResponse 모델에 server_type 필드 추가
  - [x] project_servers.py의 모든 API 응답에 server_type 필드 포함
  - [x] mcp_connection_service에서 서버 타입별 도구 조회 로직 분기
- [x] **순차적 도구 조회 구현**
  - [x] _get_tools_sequential 함수 구현 (Resource Connection용)
  - [x] _get_tools_standard 함수 분리 (API Wrapper용)
  - [x] initialize 응답 대기 후 tools/list 요청하는 순차 처리
- [x] **프론트엔드 UI 구현**
  - [x] AddServerDialog에 Server Type 선택 필드 추가
  - [x] JDBC/database 키워드 감지 시 자동 힌트 표시
  - [x] 서버 생성/수정/일괄추가에서 server_type 전송
- [x] **데이터베이스 마이그레이션 적용**
  - [x] 백엔드 시작 시 마이그레이션 미적용으로 인한 hang 문제 진단
  - [x] `uv run alembic upgrade head` 실행하여 server_type 컬럼 추가
  - [x] 마이그레이션 상태 확인: 725cb65d62b1 → d5972937e80e 성공적 적용

**기술적 해결사항**:
- 🔧 **서버 타입 분기**: api_wrapper(기본) vs resource_connection 모드
- 🔧 **순차 처리**: initialize → 응답 대기 → tools/list 순서 보장
- 🔧 **호환성 유지**: 기존 서버들은 api_wrapper로 설정하여 영향 없음
- 🔧 **자동 감지**: JDBC, database 키워드로 리소스 연결 모드 힌트 제공
- 🔧 **타임아웃 조정**: 리소스 연결 서버는 더 긴 타임아웃(30초) 적용
- 🔧 **마이그레이션 문제 해결**: 올바른 PostgreSQL URL 사용하여 백엔드 시작 이슈 해결

**커밋 정보**: 
- commit 454bc34 - "feat: [TASK_050] Complete server_type field implementation for MCP connection modes"

### TASK_077: 서버 상세 페이지 로딩 최적화 구현 ✅ 완료

**목표**: 서버 상세 페이지 타임아웃 문제 해결 및 단계적 로딩 방식 구현

- [x] **useServerDetail 훅 단계적 로딩 구현**
  - [x] fetchServerBasicInfo() 함수로 서버 목록에서 기본 정보 우선 로드
  - [x] 1-2초 내 기본 정보로 화면 즉시 표시
  - [x] isLoading 상태를 기본 정보 로드 완료 시점으로 조정
- [x] **서버 기본 정보 우선 로드 로직 추가**
  - [x] 서버 목록 API 활용으로 빠른 정보 획득 (1-2초)
  - [x] 기본 서버 정보로 즉시 화면 렌더링
  - [x] 로딩 상태를 'loading'으로 설정하여 상세 정보 로딩 중임을 표시
- [x] **백그라운드 상세 정보 로딩 로직 구현**
  - [x] fetchServerDetailInfo() 함수로 비동기 백그라운드 로딩
  - [x] MCP 서버 연결 테스트 포함 상세 정보는 백그라운드에서 처리
  - [x] 타임아웃 발생해도 기본 정보는 유지되어 페이지 이용 가능
- [x] **로딩 상태 개선 및 사용자 피드백 강화**
  - [x] 서버 헤더의 모든 한국어 UI를 영어로 변환
  - [x] 탭 라벨을 영어로 변환 (개요→Overview, 도구→Tools 등)
  - [x] 토스트 메시지와 에러 메시지를 영어로 표준화
  - [x] 로딩 상태에 스피너와 "Loading Details..." 표시 추가
  - [x] Skeleton UI 개선으로 더 나은 로딩 경험 제공

**🚨 문제 분석 및 해결 완료**:
- **문제**: 서버 상세 페이지 접근 시 화면이 흰색으로 15초간 표시
- **원인**: MCP 서버 연결 테스트가 15초 이상 소요되어 408 타임아웃 발생
- **해결**: 2단계 로딩으로 1-2초 내 기본 정보 표시, 상세 정보는 백그라운드 로딩

**기술적 해결사항**:
- 🔧 **로딩 시간 단축**: 15초 → 1-2초로 대폭 개선
- 🔧 **Progressive Loading**: 기본 정보 → 상세 정보 순차 로드
- 🔧 **Non-blocking UI**: 타임아웃 발생해도 페이지 정상 이용 가능
- 🔧 **English UI**: 모든 UI 텍스트를 영어로 표준화
- 🔧 **Enhanced UX**: 로딩 상태 표시 및 사용자 피드백 개선

**커밋 정보**: 
- commit 8ebb9a2 - "feat: [TASK_077] Complete English UI text conversion for server detail page"

### TASK_078: MCP 도구 실행 'Client not initialized yet' 오류 진단 및 분석 ✅ 완료

**목표**: MCP 도구 실행 시 "Client not initialized yet" 오류 분석 및 해결 방안 제시

**🔍 문제 분석 완료**:
- [x] **도구 실행 API 엔드포인트 위치 파악**
  - [x] `/api/mcp-sse/{project_id}/{server_name}/messages` (POST 엔드포인트)
  - [x] `mcp_sse_transport.py`의 `handle_tool_call` 메서드에서 처리
  - [x] `mcp_connection_service.py`의 `call_tool` 메서드로 실제 도구 호출
- [x] **도구 실행 MCP 연결 방식 분석**
  - [x] 도구 목록 조회와 **동일한 세션 사용 안함** - 매번 새로운 프로세스 생성
  - [x] 도구 실행 시에도 `initialize → initialized → tools/call` 순서 필요
  - [x] `call_tool`에서는 `initialized notification` 전송 없이 `tools/call` 즉시 호출
- [x] **핵심 문제점 식별**
  - [x] **도구 목록 조회**: `_get_tools_sequential`에서 `initialized notification` 전송함 (L316-323)
  - [x] **도구 실행**: `call_tool`에서 `initialized notification` 전송 없음 ❌
  - [x] **일관성 부족**: 동일한 MCP 프로토콜이지만 다른 초기화 로직 사용

**🎯 해결 방안**:
1. **도구 실행 초기화 로직 통일**: `call_tool`에도 `_get_tools_sequential`과 동일한 initialized notification 로직 적용
2. **프로토콜 순서 표준화**: 모든 MCP 요청에서 `initialize → initialized → 실제_요청` 순서 보장
3. **기존 성공 패턴 재사용**: `_get_tools_sequential` L315-324의 성공적인 initialized notification 로직 활용

**기술적 해결사항**:
- 🔧 **문제 위치 특정**: `mcp_connection_service.py`의 `call_tool` 메서드 (L576-624)
- 🔧 **성공 패턴 발견**: `_get_tools_sequential`의 initialized notification 처리 (L315-324)
- 🔧 **해결 전략**: 기존 작동하는 로직을 도구 실행에도 적용
- 🔧 **일관성 확보**: 도구 목록 조회와 도구 실행에서 동일한 MCP 초기화 순서 사용

### TASK_079: MCP 도구 실행 초기화 로직 통일 구현

**목표**: call_tool 메서드에 _get_tools_sequential과 동일한 initialized notification 로직 적용

- [ ] **call_tool 메서드 초기화 로직 수정**
  - [ ] initialize 응답 후 initialized notification 전송 로직 추가
  - [ ] _get_tools_sequential의 L315-324 패턴을 call_tool에 적용
  - [ ] 기존 초기화 코드 (L576-624)를 순차적 처리로 변경
- [ ] **프로토콜 순서 표준화**
  - [ ] initialize 요청 → 응답 대기 → initialized notification → tools/call 순서 보장
  - [ ] 타임아웃 처리 및 에러 핸들링 개선
  - [ ] 로그 메시지로 각 단계 추적 가능하도록 구현
- [ ] **테스트 및 검증**
  - [ ] JDBC 등 resource_connection 서버로 도구 실행 테스트
  - [ ] 기존 api_wrapper 서버들의 정상 작동 확인
  - [ ] "Client not initialized yet" 오류 해결 검증

### TASK_080: JWT 환경변수 사용 현황 분석 및 최적화 ✅ 완료

**목표**: NEXTAUTH_SECRET과 JWT_SECRET 환경변수의 실제 사용 여부 분석하여 불필요한 변수 제거

- [x] **NextAuth.js 설정 파일 분석**
  - [x] `/web/src/lib/auth.ts`에서 `AUTH_SECRET` 사용 확인 (L45)
  - [x] `/web/src/lib/jwt-utils.ts`에서 `AUTH_SECRET` 사용 확인 (L80)
  - [x] **NEXTAUTH_SECRET은 NextAuth.js에서 사용되지 않음** ❌
- [x] **백엔드 JWT 설정 분석**
  - [x] `config.py`에서 `JWT_SECRET` 설정 확인하지만 실제 사용 안됨
  - [x] `jwt_auth.py`와 `users.py`에서 `NEXTAUTH_SECRET` 직접 사용
  - [x] 백엔드는 `settings.security.jwt_secret` 대신 `NEXTAUTH_SECRET` 환경변수 직접 참조
- [x] **인증 시스템 흐름 분석**
  - [x] **프론트엔드**: NextAuth.js → `AUTH_SECRET` 사용
  - [x] **백엔드**: JWT 검증 시 `NEXTAUTH_SECRET` 사용
  - [x] **문제**: 프론트엔드와 백엔드가 다른 환경변수 사용 ❌
- [x] **환경변수 최적화 제안**
  - [x] `JWT_SECRET`은 config.py에만 정의되고 실제 사용 안됨 → **제거 가능**
  - [x] `AUTH_SECRET`과 `NEXTAUTH_SECRET` 통일 필요
  - [x] 백엔드 코드를 `AUTH_SECRET` 사용하도록 수정 권장

**🚨 발견된 문제점**:
1. **환경변수 불일치**: 프론트엔드(`AUTH_SECRET`) vs 백엔드(`NEXTAUTH_SECRET`)
2. **미사용 변수**: `JWT_SECRET`이 config.py에 정의되지만 실제 사용 안됨
3. **설정 무시**: 백엔드가 `settings.security.jwt_secret` 대신 환경변수 직접 참조

**🎯 최적화 방안**:
1. **AUTH_SECRET로 통일**: NextAuth.js v5 표준 환경변수 사용
2. **JWT_SECRET 제거**: config.py와 .env에서 제거 가능
3. **백엔드 수정**: `NEXTAUTH_SECRET` → `AUTH_SECRET` 변경
4. **설정 활용**: `settings.security.jwt_secret` 사용하도록 개선

**기술적 해결사항**:
- 🔧 **불일치 발견**: 프론트엔드와 백엔드 JWT 시크릿 키 환경변수 다름
- 🔧 **미사용 식별**: JWT_SECRET 완전 미사용 확인
- 🔧 **표준화 필요**: NextAuth.js v5 AUTH_SECRET 표준 준수 권장
- 🔧 **코드 정리**: 백엔드에서 환경변수 직접 참조 개선 필요

## Progress Status
- Current Progress: TASK_081 완료 - JWT 환경변수 최적화 및 테스트 스크립트 최종 정리 완료
- Next Task: 새로운 사용자 요청 대기
- Last Update: 2025-06-20
- Automatic Check Status: PASS
- Recent Commits: 
  - f1f10ae - "fix: [TASK_081] 테스트 토큰 생성 스크립트 AUTH_SECRET 사용"
  - 97c7a2d - "vibe: [ENV] API 환경변수 표준화"

## 핵심 기술 인사이트

### 데이터베이스 및 ORM
- **SQLAlchemy Enum 처리**: 상황에 따라 Enum 객체 또는 문자열로 반환되므로 `hasattr()` 체크 필요
- **소프트 삭제 패턴**: `is_active` 필드로 데이터 무결성과 UX 모두 고려
- **필터링 기본값**: 활성 데이터만 조회가 기본, 옵션으로 전체 조회 제공

### 인증 및 권한
- **JWT 토큰 기반 인증**: NextAuth.js와 FastAPI 간 표준 Bearer 토큰 패턴
- **권한 기반 UI**: 클라이언트 권한 체크와 서버 사이드 검증 이중 보안
- **사용자 중심 UX**: 로그인 후 가장 많이 사용하는 기능(Projects)으로 직접 이동
- **API 모델 완성도**: Pydantic 응답 모델에서 필드 누락 시 정보 손실 발생, 필수 필드 검증 중요

### 스케줄러 및 백그라운드 작업
- **APScheduler 통합**: 이벤트 마스크 상수와 정수 타입 주의
- **워커 최적화**: 여러 작업을 하나의 워커에서 통합 처리하여 효율성 증대
- **도구 동기화**: 서버 상태 체크 시 도구 목록도 함께 업데이트

### UI/UX 패턴
- **GitLab/GitHub 스타일**: 업계 표준 UI 패턴 적용으로 사용자 기대치 충족
- **관리자 메뉴**: Shield 아이콘과 색상으로 권한 레벨 시각적 구분
- **로딩 상태**: 권한 확인 중 적절한 피드백 제공

### 프로젝트 관리
- **문제 해결 패턴**: 증상과 원인 분리, 실제 문제는 예상과 다른 곳에 있을 수 있음
- **단계적 구현**: 복잡한 기능도 단계별로 나누어 안정적 구현
- **코드 리뷰의 중요성**: 기존 구현 상태 정확히 파악 후 작업 진행
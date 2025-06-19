# MCP Orchestrator 개발 프로젝트

## Metadata
- Status: In Progress
- Last Update: 2025-06-19
- Automatic Check Status: PASS

## Task List

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

### TASK_067: 워커 실행 이력 에러 메시지 상세 팝업 및 복사 기능 구현

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

## Progress Status
- Current Progress: TASK_067 완료 - 워커 실행 이력 에러 메시지 상세 팝업 및 복사 기능 구현 완료
- Next Task: 사용자 요청 대기 - 새로운 기능 요청이나 버그 리포트 대기 중
- Last Update: 2025-06-19
- Automatic Check Status: PASS

**커밋 정보**:
- commit 5aeaf86 - "feat: [TASK_067] Add error detail modal with copy functionality for worker history"

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
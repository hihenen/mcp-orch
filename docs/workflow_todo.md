# MCP Orchestrator 개발 프로젝트

## Metadata
- Status: In Progress
- Last Update: 2025-06-17
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

### 팀 관리 시스템 현재 구현 상태 분석 (TASK_049) ✅ 완료
**핵심 성과**: 팀(Team) 관리 시스템의 완전한 구현 상태 확인
- **데이터베이스 모델**: Team, TeamMember 모델 완전 구현, 3-tier 역할 시스템 (Owner/Developer/Reporter)
- **백엔드 API**: 팀 생성/관리, 멤버 초대/관리, API 키 생성, 서버/도구 관리 완전 구현
- **프론트엔드 UI**: 팀 목록, 팀 상세 페이지 (8개 탭), 멤버 관리, API 키 관리 UI 완전 구현
- **권한 시스템**: 역할 기반 접근 제어, 팀-프로젝트 독립적 구조
- **Cline 통합**: 팀 API 키를 사용한 Cline 설정 생성 기능

## Task List

### TASK_049: 팀 관리 시스템 현재 구현 상태 분석 ✅ 완료

**목표**: mcp-orch 프로젝트의 팀(Team) 관리 시스템 현재 구현 상태를 체계적으로 분석

- [x] **데이터베이스 모델 분석**
  - [x] Team 모델 확인 (`src/mcp_orch/models/team.py`)
  - [x] TeamMember 모델 확인 (사용자-팀 관계)
  - [x] TeamRole enum 확인 (OWNER/DEVELOPER/REPORTER 3-tier 시스템)
  - [x] 팀 설정 (is_personal, max_api_keys, max_members 등)

- [x] **백엔드 API 엔드포인트 분석**
  - [x] 팀 관리 API (`src/mcp_orch/api/teams.py`) - 17개 엔드포인트 완전 구현
  - [x] 팀 CRUD 작업: 생성, 조회, 수정, 삭제
  - [x] 멤버 관리: 초대, 역할 변경, 제거
  - [x] 서버/도구 관리: 팀별 MCP 서버 및 도구 목록
  - [x] API 키 관리: 생성, 조회, 삭제
  - [x] 활동 피드: 팀 활동 추적
  - [x] Cline 설정: 팀 API 키 기반 설정 생성

- [x] **프론트엔드 UI 구현 분석**
  - [x] Next.js API 라우트 (`web/src/app/api/teams/route.ts`) - JWT 토큰 기반 인증
  - [x] 팀 목록 페이지 (`web/src/app/teams/page.tsx`) - 팀 생성, 목록 표시
  - [x] 팀 상세 페이지 (`web/src/app/teams/[teamId]/page.tsx`) - 8개 탭 완전 구현
    - Overview: 팀 통계 및 정보
    - Projects: 프로젝트 관리 (팀-프로젝트 연동)
    - Members: 팀원 관리 및 초대
    - Servers: MCP 서버 목록
    - Tools: 사용 가능한 도구 목록
    - Activity: 팀 활동 피드
    - Settings: 팀 설정 (Owner만)
    - API Keys: API 키 관리 (Developer 이상)

- [x] **권한 시스템 확인**
  - [x] 역할 기반 접근 제어 (canAccess 함수)
  - [x] 팀 멤버십 검증 (get_team_and_verify_access)
  - [x] JWT 토큰 기반 인증 (get_user_from_jwt_token)

- [x] **팀-프로젝트 관계 분석**
  - [x] 프로젝트는 팀과 독립적인 구조
  - [x] 팀 멤버들이 프로젝트에 초대될 수 있는 크로스팀 멤버십
  - [x] 프로젝트별 독립적인 MCP 서버 및 API 키 관리

### TASK_050: 프로젝트 멤버 관리 UI 분석 ✅ 완료

**목표**: mcp-orch 프로젝트의 현재 프로젝트 멤버 관리 UI 구현 상태를 체계적으로 분석

- [x] **프로젝트 멤버 관리 컴포넌트 분석**
  - [x] 프로젝트 상세 페이지 구조 확인 (`web/src/app/projects/[projectId]/page.tsx`)
  - [x] Members 탭 UI 구현 상태 분석 (GitLab 스타일 구현)
  - [x] 멤버 테이블 및 검색/정렬 기능 확인

- [x] **멤버 초대 모달/다이얼로그 분석**
  - [x] "멤버 초대" 버튼 및 다이얼로그 구현 확인
  - [x] 초대 폼 필드 분석: 이메일, 역할, 초대 경로, 메시지
  - [x] 초대 경로 옵션: individual/team_member/external

- [x] **개별 사용자 초대 기능 분석**
  - [x] 이메일 기반 개별 초대 기능 완전 구현됨
  - [x] 역할 선택 (Owner/Developer/Reporter) 지원
  - [x] 초대 메시지 및 초대 경로 설정 기능

- [x] **팀 초대 기능 구현 여부 분석**
  - [x] "다른 프로젝트에서 가져오기", "그룹 초대" 버튼 UI 존재
  - [x] 현재 팀을 프로젝트에 초대하는 기능은 미구현 상태
  - [x] 백엔드 API에서 팀 일괄 초대 엔드포인트 부재

- [x] **백엔드 API 분석**
  - [x] 개별 멤버 초대 API 완전 구현 (`/api/projects/{project_id}/members`)
  - [x] 멤버 역할 변경, 제거 기능 구현
  - [x] 팀 기반 일괄 초대 API 미구현

### TASK_059: 프로젝트 팀 일괄 초대 기능 구현 (GitLab 스타일 통합형 UI) ✅ 완료

**목표**: 프로젝트에 팀을 일괄 초대하는 기능을 GitLab 스타일 통합형 UI로 구현하여 사용자 경험 개선

- [x] **1단계: 백엔드 API 구현**
  - [x] 팀 일괄 초대 엔드포인트 구현 (`POST /api/projects/{project_id}/teams`)
  - [x] 팀의 모든 멤버를 프로젝트에 추가하는 로직 구현
  - [x] 역할 매핑 및 중복 멤버 처리 로직
  - [x] JWT 토큰 기반 인증 및 권한 검증
  - [x] 초대 가능한 팀 목록 조회 API (`GET /api/projects/{project_id}/available-teams`)

- [x] **2단계: 프론트엔드 UI 통합**
  - [x] 기존 "멤버 초대" 버튼을 "멤버/팀 초대"로 변경
  - [x] 모달 내 탭 구조 구현 (개별 멤버 vs 팀 초대)
  - [x] 팀 선택 인터페이스 구현
  - [x] 역할 설정 및 초대 확인 UI
  - [x] 팀 정보 미리보기 기능 구현

- [x] **3단계: 기존 시스템 통합**
  - [x] 프로젝트 Store 함수 확장 (팀 초대 관련)
  - [x] API 라우트 추가 (`/api/projects/[projectId]/teams`)
  - [x] 가능한 팀 목록 조회 API 라우트 추가 (`/api/projects/[projectId]/available-teams`)
  - [x] 에러 처리 및 성공 피드백 구현

- [x] **4단계: 사용자 경험 최적화**
  - [x] 팀 멤버 미리보기 기능
  - [x] 중복 멤버 안내 및 처리 (백엔드에서 자동 처리 후 결과 표시)
  - [x] 일괄 초대 진행 상황 표시 (성공/스킵 멤버 수 토스트로 표시)

### TASK_062: 팀 Members UI를 프로젝트 Members 테이블 스타일로 변경 ✅ 완료

**목표**: 팀 멤버 관리 UI를 프로젝트 멤버 관리와 동일한 테이블 형태로 변경하여 일관된 사용자 경험 제공

- [x] **TASK_062_01: 팀 Members 탭 UI를 프로젝트 Members 스타일로 변경**
  - [x] 프로젝트 Members 테이블 구조 분석
  - [x] 팀 Members 카드 UI를 테이블 형태로 변경
  - [x] 테이블 헤더 구현 (계정, 출처, 역할, 가입일, 활동)
  - [x] 아바타 및 사용자 정보 테이블 셀 구현

- [x] **TASK_062_02: 테이블 형태로 멤버 목록 표시**
  - [x] 멤버 데이터를 테이블 행으로 렌더링
  - [x] 현재 사용자 식별 뱃지 ("It's you") 추가
  - [x] 가입일 및 활동 정보 표시

- [x] **TASK_062_03: 멤버 검색 및 정렬 기능 추가**
  - [x] 멤버 검색 입력창 추가
  - [x] 이름/이메일 기반 필터링 구현
  - [x] 정렬 옵션 추가 (이름, 역할, 가입일)

- [x] **TASK_062_04: 역할 변경 드롭다운 기능 추가**
  - [x] Select 컴포넌트로 역할 선택기 구현
  - [x] Owner/Developer/Reporter 역할 아이콘 추가
  - [x] 역할 변경 API 호출 구현

- [x] **TASK_062_05: 멤버 제거 기능 추가**
  - [x] 더보기 메뉴 (DropdownMenu) 구현
  - [x] 멤버 제거 기능 구현
  - [x] 마지막 Owner 제거 방지 로직

### TASK_064: 팀 초대 탭 클릭 시 loadAvailableTeams 호출 문제 해결 ✅ 완료

**목표**: 프로젝트 멤버 초대 모달에서 "팀 초대" 탭 클릭 시 loadAvailableTeams 함수가 자동 호출되도록 수정

**문제 분석**:
- 현재 loadAvailableTeams는 프로젝트 로드 시에만 한 번 호출됨 (useEffect)
- 팀 초대 탭 클릭 시에는 새로고침되지 않아 팀 목록이 비어있음
- 사용자가 "팀 초대" 탭을 클릭할 때마다 최신 팀 목록을 불러와야 함

- [x] **TASK_064_01: 탭 변경 핸들러 추가**
  - [x] handleInviteTabChange 함수 생성
  - [x] 팀 탭 선택 시 loadAvailableTeams 호출 로직 추가
  - [x] Tabs 컴포넌트의 onValueChange 핸들러 교체
  - [x] 디버깅 로그 추가 및 커밋 완료

- [x] **TASK_064_02: available-teams API 라우트 Next.js 15 호환성 수정**
  - [x] req.params → await params 방식으로 변경
  - [x] 함수 시그니처에 { params } 매개변수 추가
  - [x] resolvedParams = await params 처리 방식 적용

- [x] **TASK_064_03: 화면 깜빡임 문제 해결**
  - [x] projectStore에 isLoadingAvailableTeams 별도 로딩 상태 추가
  - [x] loadAvailableTeams에서 전체 페이지 로딩 대신 별도 로딩 사용
  - [x] 팀 선택 드롭다운에 로딩 상태 표시 추가

- [x] **TASK_064_04: 팀 초대 실행 API Next.js 15 호환성 수정**
  - [x] /api/projects/[projectId]/teams/route.ts POST 메서드 수정
  - [x] req.params → await params 방식으로 변경
  - [x] 팀 초대 실행 시 500 에러 해결

- [x] **TASK_064_05: 백엔드 enum 타입 문제 수정**
  - [x] projects.py:1791 라인에서 role.value → role 수정
  - [x] AttributeError: 'str' object has no attribute 'value' 해결
  - [x] 팀 초대 실행 시 백엔드 에러 완전 해결

### TASK_065: 프로젝트 멤버 뷰 섹션 그룹핑 개선 ✅ 완료

**목표**: 프로젝트 멤버 조회 화면을 "직접 초대된 멤버"와 "팀별 멤버"로 구분하여 표시하는 섹션 그룹핑 UI 구현

- [x] **TASK_065_01: 멤버 데이터 분류 로직 구현**
  - [x] 멤버를 개별/팀 초대로 분류하는 로직 추가
  - [x] InviteSource 기반 데이터 그룹핑
  - [x] 팀별 멤버 그룹 생성 로직

- [x] **TASK_065_02: 섹션 그룹핑 UI 구현**
  - [x] "직접 초대된 멤버" 섹션 구현
  - [x] "팀별 멤버" 섹션 구현 (팀별로 하위 그룹)
  - [x] 각 섹션별 멤버 수 표시

- [ ] **TASK_065_03: 팀별 접기/펼치기 기능 (선택사항)**
  - [ ] 팀별 섹션 토글 상태 관리
  - [ ] 접기/펼치기 애니메이션 구현
  - [ ] 기본 펼쳐진 상태로 설정

- [ ] **TASK_065_04: 팀 레벨 관리 기능 (선택사항)**
  - [ ] 팀 단위 역할 일괄 변경 기능
  - [ ] 팀 단위 제거 기능 (확인 다이얼로그)
  - [ ] 팀 정보 표시 (팀 이름, 초대자)

### TASK_066: MCP 서버 연결 실패 예외 처리 개선 ✅ 완료

**목표**: 개별 MCP 서버 연결 실패가 전체 시스템 시작을 막지 않도록 개선

- [x] **TASK_066_01: Registry 클래스 예외 처리 개선**
  - [x] `_connect_server` 메서드에서 예외 발생 시 계속 진행
  - [x] 실패한 서버를 별도로 추적
  - [x] 연결 성공/실패 통계 로깅

- [ ] **TASK_066_02: 연결 재시도 로직 추가 (선택사항)**
  - [ ] 실패한 서버에 대한 백그라운드 재연결 시도
  - [ ] 재연결 성공 시 자동으로 서버 풀에 추가

- [ ] **TASK_066_03: 서버 상태 모니터링 개선 (선택사항)**
  - [ ] 서버별 연결 상태 추적
  - [ ] API에서 서버 상태 확인 가능하도록 개선

### TASK_067: MCP 서버 통신 타임아웃 및 자동 비활성화 시스템

**목표**: MCP 서버 통신 에러 시 빠른 실패 처리 및 자동 비활성화로 시스템 시작 지연 최소화

- [x] **TASK_067_01: MCPServer 타임아웃 설정 개선**
  - [x] read loop에서 빠른 실패 감지 및 pending requests 정리
  - [x] stdio 통신 에러 시 즉시 중단
  - [x] 세분화된 타임아웃 옵션 추가

- [x] **TASK_067_03: 실패한 MCP 서버 자동 비활성화 시스템**
  - [x] Registry에 자동 비활성화 로직 추가
  - [x] `_connect_server` 실패 시 데이터베이스 업데이트
  - [x] McpServer.is_enabled = False 설정
  - [x] 실패 이유와 시간 기록
  - [x] 관리자 API 추가 (/api/admin/mcp-servers)

- [ ] **TASK_067_04: 웹 UI 관리 기능 (선택사항)**
  - [ ] 서버 상태 표시 (활성/비활성/실패)
  - [ ] 비활성화된 서버 재활성화 버튼
  - [ ] 실패 이유 및 시간 표시

### TASK_068: 프론트엔드 MCP 연결 테스트 타임아웃 개선

**목표**: MCP 서버 연결 테스트 시 프론트엔드에서 적절한 타임아웃과 에러 처리 추가

- [x] **TASK_068_01: 프론트엔드 API 호출 타임아웃 설정**
  - [x] 서버 상세 페이지 API 호출에 15초 타임아웃 설정
  - [x] 타임아웃 시 적절한 에러 메시지 표시 (408 상태 코드)
  - [x] 재시도 버튼 추가 (timeout 상태일 때만 표시)
  - [x] ServerDetail 타입에 'timeout' 상태 추가

- [ ] **TASK_068_02: 백엔드 MCP 연결 테스트 타임아웃 단축 (선택사항)**
  - [ ] MCP 서버 테스트 타임아웃을 30초에서 10-15초로 단축
  - [ ] 연결 실패 시 더 빠른 응답 제공

- [ ] **TASK_068_03: 로딩 상태 개선 (선택사항)**
  - [ ] 연결 테스트 중임을 명시하는 메시지 표시
  - [ ] 진행률 표시 또는 취소 버튼 추가

### TASK_069: 프로젝트 서버 카드 드롭다운 메뉴 및 확인 다이얼로그 구현 ✅ 완료

**목표**: 프로젝트 서버 카드에 ... 드롭다운 메뉴 추가 및 삭제 확인 다이얼로그 구현

- [x] **TASK_069_01: 서버 카드 ... 드롭다운 메뉴 구현**
  - [x] 기존 개별 버튼들을 DropdownMenu로 통합
  - [x] Edit, Remove 옵션 추가
  - [x] 기존 개별 버튼들 제거 (토글 버튼은 유지)

- [x] **TASK_069_02: 삭제 확인 다이얼로그 구현**
  - [x] MCP 서버 이름 정확히 입력해야 하는 확인 다이얼로그
  - [x] 프론트엔드에서 이름 일치 검증
  - [x] 삭제 실행 시 기존 API 호출

- [x] **TASK_069_03: 편집 기능 연동**
  - [x] 기존 `AddServerDialog` 편집 모드 연동
  - [x] 드롭다운에서 편집 클릭 시 기존 핸들러 호출

### TASK_070: 프로젝트 페이지 구조를 GitLab/GitHub 스타일 독립 페이지로 리팩토링 ✅ 완료

**목표**: 프로젝트 상세 페이지의 탭 기반 구조를 GitLab/GitHub 스타일의 독립 페이지들로 분리하여 사용자 경험 개선

- [x] **TASK_070_01: 프로젝트 페이지 구조를 GitLab/GitHub 스타일 독립 페이지로 리팩토링**
  - [x] 기존 탭 기반 구조 분석 및 백업 파일 생성
  - [x] 독립 페이지 구조 설계 (Overview, Members, Servers, Tools, API Keys, Activity, Settings)
  - [x] 프로젝트 네비게이션 구조 개선

- [x] **TASK_070_02: 서버 페이지 ProjectLayout 닫기 완료**
  - [x] 기존 서버 페이지가 이미 ProjectLayout으로 올바르게 구현됨 확인
  - [x] 서버 페이지 구조 검증 완료

- [x] **TASK_070_03: Members 독립 페이지 생성**
  - [x] 백업 파일에서 Members 탭 내용 추출
  - [x] `/projects/[projectId]/members/page.tsx` 독립 페이지 생성
  - [x] ProjectLayout 래퍼 적용 및 전체 기능 보존
  - [x] 멤버 초대, 역할 관리, 섹션 그룹핑 기능 완전 보존

- [x] **TASK_070_04: Tools 독립 페이지 업데이트**
  - [x] 기존 Tools 페이지 ProjectLayout 적용
  - [x] 백업 파일 참조하여 기능 개선
  - [x] 서버별 도구 그룹핑, 검색/필터링, 통계 카드 추가
  - [x] 도구 실행 모달 연동 및 새로고침 기능 추가

- [x] **TASK_070_05: API Keys 독립 페이지 생성**
  - [x] 백업 파일에서 API Keys 탭 내용 추출
  - [x] `/projects/[projectId]/api-keys/page.tsx` 독립 페이지 생성
  - [x] ProjectLayout 래퍼 적용 및 전체 기능 보존
  - [x] API 키 생성, 삭제, Cline 설정 다운로드 기능 완전 구현
  - [x] 만료 상태 표시 및 통계 카드 추가

- [x] **TASK_070_06: Activity 독립 페이지 생성**
  - [x] 백업 파일에서 Activity 탭 내용 추출
  - [x] `/projects/[projectId]/activity/page.tsx` 독립 페이지 생성
  - [x] ProjectLayout 래퍼 적용 및 활동 기록 표시 기능 구현
  - [x] 활동 유형별 아이콘 및 색상 구분, 검색/필터링 기능
  - [x] 모의 데이터와 통계 카드 구현 (추후 실제 API 연동 예정)

- [x] **TASK_070_07: Settings 독립 페이지 생성**
  - [x] 백업 파일에서 Settings 관련 내용 추출
  - [x] `/projects/[projectId]/settings/page.tsx` 독립 페이지 생성
  - [x] ProjectLayout 래퍼 적용 및 기본 정보 설정 기능
  - [x] 보안 설정 섹션 연동, 위험 구역 (프로젝트 삭제) 구현
  - [x] Owner 권한 기반 편집 제어 및 확인 다이얼로그

- [x] **TASK_070_08: 프로젝트 상세 페이지 탭 구조 제거 및 정리**
  - [x] 기존 프로젝트 상세 페이지를 Overview로 리다이렉트하도록 설정
  - [x] Overview 독립 페이지 생성 및 개선
  - [x] 헤더 섹션과 빠른 액션 카드를 통한 독립 페이지 네비게이션 구현
  - [x] 프로젝트 정보, 서버 상태, 팀 멤버 통계 카드 구현

- [x] **TASK_070_09: 네비게이션 및 라우팅 최종 검증**
  - [x] Overview 페이지에서 모든 독립 페이지로의 링크 추가
  - [x] 빠른 액션 카드를 통한 직관적인 네비게이션 구현
  - [x] ProjectLayout 기반 일관된 네비게이션 구조 확인

- [x] **TASK_070_10: Overview 페이지 undefined 배열 접근 오류 수정**
  - [x] `projectServers`, `projectTools`, `projectMembers` 배열에 null-safe 체크 추가
  - [x] undefined 상태에서 `.length` 및 `.slice()` 메서드 접근 방지
  - [x] 모든 배열 조건부 렌더링을 안전하게 변경
  - [x] TypeError: Cannot read properties of undefined 런타임 오류 완전 해결

- [x] **TASK_070_11: Tools 페이지 undefined 배열 접근 오류 수정**
  - [x] `projectTools.filter()` undefined 접근 방지
  - [x] `projectTools.map()` 및 `projectTools.length` null-safe 체크 추가
  - [x] `uniqueServers` 배열 생성 시 null-safe 처리
  - [x] 통계 카드 렌더링에서 안전한 배열 접근 보장

- [x] **TASK_070_12: projectStore에 projectTools 지원 완전 구현**
  - [x] `projectStore` 인터페이스에 `projectTools: Tool[]` 속성 추가
  - [x] `loadProjectTools(projectId)` 함수 구현: 프로젝트의 모든 활성 서버 도구 로드
  - [x] Tool 타입 import 및 초기 상태 설정
  - [x] Overview/Tools 페이지에서 `loadProjectTools` 호출 추가
  - [x] API 응답 구조 처리 개선: `{tools: [...]}` 형태 대응

## Progress Status
- Current Progress: TASK_070 완료 및 데이터 로딩 문제 해결 완료 - GitLab/GitHub 스타일 독립 페이지 구조 리팩토링 및 projectTools 지원 완전 구현
- Next Task: 추가 요청 대기 중  
- Last Update: 2025-06-17
- Automatic Check Feedback: 프로젝트 페이지 구조 완전 개편 성공 및 데이터 로딩 문제 해결 완료 - 탭 기반에서 독립 페이지 구조로 전환, Overview/Members/Tools/API Keys/Activity/Settings 모든 페이지 완성, projectTools 누락 문제 해결, 런타임 안정성 확보

## Lessons Learned and Insights

### 팀 관리 시스템 구현 현황 (TASK_049)
- **완전한 구현**: 팀 관리 시스템이 이미 완전하게 구현되어 있음
- **3-tier 역할 시스템**: GitLab 스타일의 OWNER/DEVELOPER/REPORTER 권한 구조
- **JWT 인증 통합**: NextAuth.js v5와 완전 호환되는 JWT 토큰 기반 인증
- **독립적 구조**: 팀과 프로젝트가 독립적으로 운영되는 유연한 협업 구조
- **Cline 통합**: 팀 API 키를 사용한 Cline MCP 설정 자동 생성 기능
- **UI 완성도**: 8개 탭으로 구성된 완전한 팀 관리 인터페이스 구현

### 프로젝트 멤버 관리 UI 분석 결과 (TASK_050)
- **개별 초대 완성**: 이메일 기반 개별 사용자 초대 기능이 완전히 구현됨
- **GitLab 스타일 UI**: 멤버 테이블, 검색/정렬 기능이 포함된 고급 UI 구현
- **역할 관리**: Owner/Developer/Reporter 3단계 역할 시스템과 실시간 역할 변경 기능
- **초대 경로 추적**: individual/team_member/external 구분으로 초대 출처 관리
- **팀 초대 기능 부재**: "그룹 초대" 버튼은 있지만 실제 팀 일괄 초대 기능 미구현
- **확장 가능한 구조**: 기존 개별 초대 시스템을 확장하여 팀 초대 기능 추가 가능

### 프로젝트 멤버 관리 기능 요약
1. **개별 멤버 초대**: 이메일 기반 완전 구현 ✅
2. **역할 관리**: 실시간 역할 변경 및 권한 제어 ✅
3. **멤버 제거**: Owner 권한 기반 멤버 제거 기능 ✅
4. **초대 경로 추적**: 개인/팀/외부 구분 관리 ✅
5. **팀 일괄 초대**: 미구현 상태 (UI 준비됨) ❌
6. **검색/정렬**: 멤버 목록 관리 기능 완전 구현 ✅
7. **권한 검증**: JWT 토큰 기반 완전한 보안 구조 ✅
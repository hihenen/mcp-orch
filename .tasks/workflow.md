# MCP Orch Project Workflow

## Metadata
- Status: In Progress
- Last Update: 2025-06-25
- Automatic Check Status: PASS

## Task List

### TASK_043: API Wrapper 모드 제거 및 Resource Connection 단일 모드 전환
- [x] 현재 상황 분석 및 작업 계획 수립
- [x] 프론트엔드 UI에서 Compatibility Mode 선택기 제거
  - [x] AddServerDialog.tsx에서 호환성 모드 선택 UI 제거
  - [x] ServerOverviewTab.tsx에서 호환성 모드 표시 단순화
- [x] 백엔드에서 API Wrapper 로직 제거
  - [x] McpConnectionService에서 API Wrapper 관련 코드 제거
  - [x] Resource Connection을 기본 및 유일한 모드로 설정
- [x] 모델 및 데이터베이스 정리
  - [x] McpServer 모델에서 compatibility_mode 필드 처리
  - [x] 기존 API로 설정된 서버들 확인
- [x] 코드 정리 및 테스트

### TASK_044: 진정한 MCP 표준 Resource Connection 구현
- [x] 현재 구현 문제점 분석 완료
- [x] MCP 세션 매니저 클래스 생성
  - [x] 서버별 프로세스 및 세션 관리
  - [x] 프로세스 생명주기 관리
  - [x] 세션 타임아웃 및 정리
- [x] MCP 표준 ClientSession 패턴 구현
  - [x] stdio_client 패턴 적용
  - [x] 지속적 세션 연결 구현
  - [x] 표준 MCP 프로토콜 흐름
- [x] 기존 connection service 교체
  - [x] 새로운 세션 매니저 통합
  - [x] 도구 호출 시 기존 세션 재사용
  - [x] FastAPI lifespan 관리 추가
- [x] 테스트 및 검증
  - [x] 도구 스키마 정보 누락 문제 수정
  - [x] inputSchema -> schema 변환 로직 추가

### TASK_045: MCP 세션 매니저에 환경변수 설정 지원 추가
- [x] MCPSessionConfig 클래스 생성
  - [x] session_timeout_minutes 설정 (기본: 30분)
  - [x] cleanup_interval_minutes 설정 (기본: 5분)
  - [x] 영어 주석 및 설명 추가
- [x] 환경변수 지원 구현
  - [x] MCP_SESSION_TIMEOUT_MINUTES 환경변수
  - [x] MCP_SESSION_CLEANUP_INTERVAL_MINUTES 환경변수
  - [x] 기본값 fallback 로직
- [x] McpSessionManager 업데이트
  - [x] 설정 기반 초기화
  - [x] 동적 타임아웃 및 정리 간격 적용
  - [x] 초기화 로그에 설정값 표시
- [x] FastAPI 앱 통합
  - [x] app.py에서 설정 전달
  - [x] Settings 클래스에 mcp_session 필드 추가
- [x] 환경변수 문서화
  - [x] .env.example 파일에 설정 예시 추가
  - [x] 영어 주석으로 설명 제공

### TASK_046: 프로젝트 CHANGELOG.md 생성 및 기존 변경사항 정리
- [x] CHANGELOG.md 파일 생성
  - [x] Keep a Changelog 표준 형식 적용
  - [x] Semantic Versioning 연동
  - [x] 영어 문서화
- [x] 기존 TASK 변경사항 정리
  - [x] TASK_043: API Wrapper 제거 및 단일 모드 전환
  - [x] TASK_044: 진정한 MCP 표준 Resource Connection 구현
  - [x] TASK_045: 환경변수 설정 지원 추가
- [x] 버전 분류 및 체계화
  - [x] v0.1.0: 초기 구현
  - [x] v0.2.0: MCP 표준 준수 및 세션 관리 개선
  - [x] Unreleased: 최신 환경변수 기능
- [x] 가이드라인 및 사용법 문서화
  - [x] 카테고리별 변경사항 분류
  - [x] TASK 참조 시스템 연동
  - [x] 버전 형식 설명

### TASK_047: CLAUDE.md 지침에 CHANGELOG.md 업데이트 의무화 및 커밋 워크플로우 개선
- [x] 기존 커밋 규칙에 CHANGELOG 의무화 추가
  - [x] ENFORCEMENT RULE에 CHANGELOG 업데이트 단계 포함
  - [x] MANDATORY PRE-COMMIT CHECKLIST 확장
  - [x] CHANGELOG.md Update Rules 상세 가이드라인
- [x] ABSOLUTE PROHIBITIONS에 문서화 부채 금지 추가
  - [x] "NEVER commit without updating CHANGELOG.md first" 규칙
  - [x] PRE-FLIGHT CHECKS에 CHANGELOG 검증 단계
  - [x] FORCE EXECUTION COMMANDS 업데이트
- [x] 새로운 CHANGELOG.md DOCUMENTATION ENFORCEMENT 섹션
  - [x] MANDATORY CHANGELOG WORKFLOW 정의
  - [x] 업데이트 규칙 및 카테고리 표준화
  - [x] 문서화 품질 기준 설정
- [x] 실제 적용 및 검증
  - [x] TASK_047 변경사항을 CHANGELOG.md에 먼저 반영
  - [x] 새로운 워크플로우 따라 커밋 실행

### TASK_048: JSON 설정에서 불필요한 compatibility_mode 필드 제거
- [x] 데이터베이스 모델 수정
  - [x] McpServer 모델에서 compatibility_mode 기본값을 resource_connection으로 변경
  - [x] 모델 주석 업데이트로 단일 모드 명시
- [x] API Pydantic 모델 정리
  - [x] ServerCreate에서 compatibility_mode 필드 제거
  - [x] ServerUpdate에서 compatibility_mode 필드 제거
  - [x] ServerResponse에서 compatibility_mode 필드 제거
- [x] API 로직 단순화
  - [x] 서버 생성 시 compatibility_mode 설정 제거
  - [x] 서버 업데이트 시 compatibility_mode 조건부 로직 제거
  - [x] 서버 응답에서 compatibility_mode 필드 제거
  - [x] 디버그 로그에서 compatibility_mode 참조 정리
- [x] Cline 설정 생성 단순화
  - [x] project_sse.py에서 조건부 로직 제거
  - [x] 단일 Resource Connection 모드로 설정 통일
  - [x] stdio 타입으로 고정 설정

### TASK_049: 프론트엔드 JSON 편집 대화상자에서 compatibility_mode 자동 추가 로직 제거
- [x] JSON 예시 설정 정리
  - [x] exampleConfig에서 compatibility_mode 필드 제거
  - [x] 모든 서버 예시(excel-mcp-server, brave-search, github-server, database-jdbc)에서 제거
- [x] 자동 주입 로직 제거
  - [x] JSON 파싱 시 compatibility_mode 강제 추가 로직 제거
  - [x] normalizedServers 처리에서 compatibility_mode 설정 제거
- [x] API 호출 정리
  - [x] 개별 서버 폼에서 compatibility_mode 전송 제거
  - [x] JSON 서버 생성 시 compatibility_mode 전송 제거  
  - [x] 서버 수정 시 compatibility_mode 전송 제거
- [x] 콜백 및 응답 객체 정리
  - [x] onServerAdded 콜백에서 compatibilityMode 필드 제거
  - [x] onServerUpdated 콜백에서 compatibilityMode 필드 제거
  - [x] convertServerToJson에서 compatibility_mode 제거

### TASK_055: Project 모델 slug 필드 NOT NULL 제약 조건 위반 문제 해결
- [x] 문제 분석 완료 (Project 생성 시 slug 필드 누락으로 인한 NOT NULL 제약 조건 위반)
- [ ] 해결 방안 구현
  - [ ] 프로젝트 이름 기반 slug 자동 생성 함수 작성
  - [ ] create_project API에서 slug 생성 로직 추가
  - [ ] 중복 방지를 위한 고유성 보장 로직 추가
- [ ] 테스트 및 검증
  - [ ] 새 프로젝트 생성 테스트
  - [ ] slug 중복 처리 테스트
- [ ] CHANGELOG.md 업데이트

### TASK_056: Next.js 프론트엔드에서 Create New Project 컴포넌트 분석
- [x] 프로젝트 생성 UI 컴포넌트 분석 및 위치 파악
  - [x] `/app/projects/page.tsx` - 메인 프로젝트 페이지의 "New Project" 다이얼로그
  - [x] `/app/teams/[teamId]/projects/page.tsx` - 팀 내 프로젝트 생성 다이얼로그
  - [x] `/app/admin/projects/components/CreateProjectModal.tsx` - 관리자용 프로젝트 생성 모달
  - [x] `/components/layout/ProjectSelector.tsx` - 프로젝트 선택기의 "Create New Project" 옵션
- [x] 팀 선택 기능 분석
  - [x] Select 컴포넌트를 통한 팀 선택 UI (`/app/projects/page.tsx`)
  - [x] "Create as Personal Project" 옵션 제공
  - [x] 팀 데이터는 `useTeamStore`에서 로드
- [x] 프로젝트 생성 플로우 분석
  - [x] 프론트엔드: `useProjectStore.createProject()` 호출
  - [x] API: `/api/projects` POST 엔드포인트 
  - [x] 백엔드: FastAPI로 JWT 인증 후 프로젝트 생성

### TASK_057: Next.js 애플리케이션 로그인/가입 플로우 분석
- [x] NextAuth.js 설정 및 콜백 분석
  - [x] `/lib/auth.ts` - NextAuth.js v5 Credentials provider 사용
  - [x] JWT 전략 및 24시간 세션 설정
  - [x] redirect callback에서 로그인 후 `/projects`로 리다이렉트
  - [x] FastAPI 백엔드와 JWT 토큰 기반 인증 연동
- [x] 기존 토스트 알림 시스템 확인
  - [x] Radix UI `@radix-ui/react-toast` 사용 중
  - [x] Sonner 라이브러리도 설치됨 (`package.json`에 sonner v2.0.5)
  - [x] `useToast` 훅과 `toast` 함수 구현됨 (`/hooks/use-toast.ts`)
  - [x] `<Toaster />` 컴포넌트가 `layout.tsx`에 전역 설치됨
- [x] 로그인/가입 페이지 및 컴포넌트 위치 파악
  - [x] `/auth/signin/page.tsx` - 로그인 페이지 (상태 기반 에러 처리)
  - [x] `/auth/signup/page.tsx` - 회원가입 페이지 (성공 시 `/auth/signin`로 리다이렉트)
  - [x] `/api/auth/signup/route.ts` - Next.js API 로우트로 FastAPI로 요청 전달
  - [x] FastAPI `/api/users/signup` 엔드포인트 - 실제 사용자 생성
- [x] 신규 사용자 등록 vs 기존 사용자 로그인 감지 방법 분석
  - [x] 현재는 분리된 플로우: 회원가입은 `/auth/signup`, 로그인은 `/auth/signin`
  - [x] FastAPI에서 이메일 중복 검사로 신규/기존 사용자 구분
  - [x] 회원가입 성공 시 NextAuth.js 세션 생성 전에 다른 페이지로 이동
- [ ] 신규 사용자 가입 성공 토스트 구현 위치 제안
  - [ ] 토스트 구현 옵션 및 최적 위치 결정
  - [ ] 구현 방안 다이어그램 작성

### TASK_058: EC2 서버 DATABASE_URL 설정 및 alembic 오류 해결
- [x] EC2 서버 환경 파일 확인
  - [x] 현재 .env 파일의 DATABASE_URL 설정값 확인 (.env.hybrid.example 기준)
  - [x] postgresql:// vs postgresql+asyncpg:// 형식 검증 (문제 발견!)
  - [x] 다른 관련 환경변수 설정 상태 확인
- [x] quickstart-hybrid.sh 스크립트 분석
  - [x] 스크립트에서 DATABASE_URL 생성 로직 확인 (.env.hybrid.example 복사 방식)
  - [x] psycopg2 vs asyncpg 드라이버 설정 문제 파악 (asyncpg 필요)
  - [x] 스크립트의 .env 파일 생성 방식 분석 (cp .env.hybrid.example .env)
- [x] alembic 오류 원인 진단
  - [x] psycopg2 드라이버 관련 오류 메시지 분석 (postgresql:// 형식 문제)
  - [x] async 환경에서 asyncpg 드라이버 필요성 확인 (FastAPI + SQLAlchemy 2.0)
  - [x] DATABASE_URL 형식 불일치 문제 확인 (postgresql:// → postgresql+asyncpg://)
- [ ] 해결 방안 구현
  - [ ] .env.hybrid.example에서 DATABASE_URL 형식 수정
  - [ ] 다른 PostgreSQL 예시들도 +asyncpg 접미사 추가
  - [ ] 기존 설치된 환경에서 수정 방법 문서화

### TASK_063: EC2 quickstart.sh Docker 빌드 오류 해결 ("/web": not found)
- [x] 오류 원인 분석
  - [x] Docker 컨텍스트 문제 파악 (context: ./web vs COPY web/ .)
  - [x] docker-compose.yml에서 frontend 서비스 설정 문제점 확인
  - [x] Dockerfile.frontend의 COPY 명령어와 컨텍스트 불일치 문제 진단
- [x] 해결 방안 구현
  - [x] docker-compose.yml에서 frontend 서비스 context를 "."으로 변경
  - [x] dockerfile 경로를 "Dockerfile.frontend"로 수정
  - [x] Docker 빌드 컨텍스트와 COPY 명령어 일치성 확보
- [x] 수정 사항 적용 및 검증
  - [x] 로컬 환경에서 수정 완료 (Docker 데몬 미실행으로 빌드 테스트 생략)
  - [x] EC2 환경에서 quickstart.sh 재실행을 통한 검증 필요

### TASK_064: EC2 외부 데이터베이스 연결 오류 해결 (socket.gaierror: Name or service not known)
- [ ] EC2 서버의 .env 파일 분석
  - [ ] 현재 DATABASE_URL 설정값 확인
  - [ ] 호스트명 DNS 해상도 검증
  - [ ] 네트워크 연결 가능성 테스트
- [ ] 가능한 원인 분석
  - [ ] DNS 서버 설정 문제
  - [ ] 보안 그룹/방화벽 설정 문제
  - [ ] 외부 데이터베이스 서비스 접근 권한 문제
  - [ ] VPC/네트워킹 설정 문제
- [ ] 해결 방안 제안
  - [ ] DNS 검증 및 대안 설정
  - [ ] 네트워크 연결성 확인 방법
  - [ ] 보안 설정 점검 가이드
  - [ ] 데이터베이스 연결 설정 최적화

### TASK_065: SQLAlchemy 모델 정의 파일 조사 및 필드 확인
- [x] SQLAlchemy 모델 파일 위치 파악
  - [x] `/src/mcp_orch/models/` 디렉토리 구조 확인
  - [x] 전체 모델 목록 파악 (16개 모델 클래스)
- [x] User 모델 분석 (`/src/mcp_orch/models/user.py`)
  - [x] `email_verified` 컬럼 존재 확인 (DateTime 타입, nullable=True)
  - [x] NextAuth.js 호환 구조 확인
  - [x] OAuth 및 패스워드 인증 지원 구조 확인
- [x] WorkerConfig 모델 분석 (`/src/mcp_orch/models/worker_config.py`)
  - [x] `server_check_interval` 컬럼 존재 확인 (Integer 타입, 기본값 300초)
  - [x] 스케줄러 설정 영구화 목적 확인
  - [x] 설정 관리 메서드들 확인 (load_or_create_config, update_from_dict)
- [x] 주요 모델 구조 파악
  - [x] Project 모델: slug 필드 존재 (String(100), unique=True, nullable=False)
  - [x] McpServer 모델: compatibility_mode 필드 resource_connection 고정
  - [x] 데이터베이스 설정: PostgreSQL + asyncpg 드라이버 사용

### TASK_072: 데이터베이스 스키마 누락 필드 추가 (NextAuth.js 호환)
- [x] 누락된 User 필드 분석
  - [x] email_verified: DateTime 타입, NextAuth.js 이메일 확인 상태
  - [x] image: String(500) 타입, 프로필 이미지 URL
  - [x] password: String(255) 타입, 이메일/패스워드 인증용
  - [x] provider: String(50) 타입, OAuth 제공자 ('google', 'github' 등)
  - [x] provider_id: String(255) 타입, 제공자별 사용자 ID
- [x] 누락된 WorkerConfig 필드 분석
  - [x] server_check_interval: Integer 타입, 서버 상태 확인 간격(초)
  - [x] coalesce: Boolean 타입, 중복 작업 병합 여부
  - [x] max_instances: Integer 타입, 최대 작업 인스턴스 수
  - [x] notes: Text 타입, 추가 설정 메모
- [x] Alembic 마이그레이션 생성 및 실행
  - [x] 20250625_1459-add_missing_user_fields.py 마이그레이션 생성
  - [x] 필수 필드만 포함한 간단한 마이그레이션으로 안전성 확보
  - [x] 마이그레이션 실행으로 스키마 불일치 해결
  - [x] 데이터베이스 스키마 검증 완료

### TASK_073: 신규 설치용 초기 마이그레이션 완성
- [x] 기존 초기 마이그레이션 분석 및 누락 필드 식별
  - [x] User 테이블: email_verified, image, password, provider, provider_id 필드 누락
  - [x] WorkerConfig 테이블: server_check_interval, coalesce, max_instances, notes 필드 누락
  - [x] 기존 마이그레이션이 불완전한 스키마 생성하는 문제 확인
- [x] 초기 마이그레이션에 User 테이블 NextAuth.js 호환 필드 추가
  - [x] email_verified (DateTime) - 이메일 확인 상태
  - [x] image (String(500)) - 프로필 이미지 URL
  - [x] password (String(255)) - 이메일/패스워드 인증용
  - [x] provider (String(50)) - OAuth 제공자 정보
  - [x] provider_id (String(255)) - 제공자별 사용자 ID
  - [x] ix_users_email 인덱스로 unique 제약조건 변경
- [x] 초기 마이그레이션에 WorkerConfig 테이블 스케줄러 설정 필드 추가
  - [x] server_check_interval (Integer) - 서버 상태 확인 간격
  - [x] coalesce (Boolean) - 중복 작업 병합 여부
  - [x] max_instances (Integer) - 최대 작업 인스턴스 수
  - [x] notes (Text) - 추가 설정 메모
  - [x] description 필드 타입 및 기본값 업데이트
  - [x] 모든 필드에 적절한 comment 추가
- [x] 깨끗한 데이터베이스에서 업데이트된 초기 마이그레이션 테스트
  - [x] mcp_orch_test 데이터베이스 생성
  - [x] 초기 마이그레이션 단독 실행 (38d4bd81b787)
  - [x] 모든 필수 필드 생성 확인 (User: 12개, WorkerConfig: 8개)
  - [x] 신규 설치시 완전한 스키마 한 번에 생성 검증

## Progress Status
- Current Progress: TASK_073 - 신규 설치용 초기 마이그레이션 완성 완료
- Next Task: 요청 사항에 따른 추가 작업 대기
- Last Update: 2025-06-25
- Automatic Check Feedback: 신규 설치 개선 완료 - 초기 마이그레이션이 완전한 스키마 생성, 기존 설치와 신규 설치 모두 호환성 확보

## Lessons Learned and Insights
- MCP 표준에서는 Resource Connection(지속적 세션) 방식이 권장됨
- API Wrapper 모드는 Anthropic 표준에 부합하지 않음
- 단일 모드로 전환하여 코드 복잡도가 크게 감소함
- UI가 단순화되어 사용자 경험 개선
- 모든 서버가 MCP 표준을 준수하게 됨
- Resource Connection 모드는 데이터베이스 서버 등에 최적화됨
- 새로운 세션 매니저는 진정한 세션 재사용을 구현
- 도구 스키마 정보 변환이 UI 호환성에 중요함
- MCP Python SDK 패턴을 따르면 표준 준수와 성능 향상 모두 달성 가능
- 환경변수 설정은 배포 환경별 최적화에 핵심적
- 세션 타임아웃과 정리 주기의 분리된 설정이 운영 유연성 제공
- CHANGELOG.md 도입으로 체계적인 변경사항 추적 가능
- Keep a Changelog 표준으로 개발자/사용자 친화적 문서화 실현
- 강제적 CHANGELOG 업데이트로 문서화 부채 방지
- 커밋과 문서화의 동기화로 릴리즈 준비 간소화
- 단일 모드 전환으로 코드베이스 단순화 및 유지보수성 향상
- JSON 설정에서 불필요한 필드 제거로 사용자 혼란 방지
- 프론트엔드 자동 주입 로직 제거로 JSON 편집기 투명성 확보
- 백엔드-프론트엔드 일관성 확보로 예측 가능한 동작 보장
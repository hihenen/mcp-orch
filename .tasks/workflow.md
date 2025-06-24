# MCP Orch Project Workflow

## Metadata
- Status: In Progress
- Last Update: 2025-06-24
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

## Progress Status
- Current Progress: TASK_053 - .claude/workflow를 .tasks/로 이름 변경 및 단일 파일로 관리 완료
- Next Task: 대기 중
- Last Update: 2025-06-24
- Automatic Check Feedback: 플랫폼 중립적 워크플로우 관리 시스템으로 전환 완료

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
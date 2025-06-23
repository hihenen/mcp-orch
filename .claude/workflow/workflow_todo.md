# MCP Orch Project Workflow

## Metadata
- Status: In Progress
- Last Update: 2025-01-23
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
- [ ] 테스트 및 검증

## Progress Status
- Current Progress: TASK_044 - 진정한 MCP 표준 Resource Connection 구현 진행 중
- Next Task: 테스트 및 검증
- Last Update: 2025-01-23
- Automatic Check Feedback: 새로운 세션 매니저 구현 완료, 테스트 필요

## Lessons Learned and Insights
- MCP 표준에서는 Resource Connection(지속적 세션) 방식이 권장됨
- API Wrapper 모드는 Anthropic 표준에 부합하지 않음
- 단일 모드로 전환하여 코드 복잡도가 크게 감소함
- UI가 단순화되어 사용자 경험 개선
- 모든 서버가 MCP 표준을 준수하게 됨
- Resource Connection 모드는 데이터베이스 서버 등에 최적화됨
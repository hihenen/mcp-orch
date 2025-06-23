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
- [ ] 코드 정리 및 테스트

## Progress Status
- Current Progress: TASK_043 - API Wrapper 모드 제거 작업 거의 완료
- Next Task: 코드 정리 및 테스트
- Last Update: 2025-01-23
- Automatic Check Feedback: 주요 변경사항 완료, 정리 작업 필요

## Lessons Learned and Insights
- MCP 표준에서는 Resource Connection(지속적 세션) 방식이 권장됨
- API Wrapper 모드는 Anthropic 표준에 부합하지 않음
- 단일 모드로 전환하면 코드 복잡도가 크게 감소할 것으로 예상
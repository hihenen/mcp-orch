# MCP-Orch Standard MCP Router 분석 프로젝트

## Metadata
- Status: In Progress
- Last Update: 2025-06-29
- Automatic Check Status: PASS

## Task List

### TASK_051: Standard MCP Router 사용처 및 MCP 규약 준수 분석 (완료)
- [x] standard_mcp_router 구현 내용 분석
  - [x] src/mcp_orch/api/standard_mcp.py 파일 분석
  - [x] MCP 프로토콜 규약 준수 여부 확인
  - [x] 구현된 기능들 파악
- [x] Context7에서 해당 엔드포인트 사용 여부 확인
  - [x] Context7 관련 설정 파일 검색
  - [x] MCP 클라이언트 설정에서 /legacy/sse 경로 사용 여부
  - [x] 실제 연결 로그나 설정에서 해당 경로 참조 확인
- [x] 다른 MCP 클라이언트에서의 사용 현황 조사
  - [x] Inspector, Cline, Cursor 등에서 /legacy/sse 사용 여부
  - [x] 실제 MCP 표준 문서와 비교하여 규약 준수성 평가
- [x] 코드베이스에서 standard_mcp_router 참조 검색
  - [x] import 및 사용하는 파일들 식별
  - [x] 테스트 파일이나 설정 파일에서의 언급 확인
- [x] 분석 결과 종합 및 권고사항 도출
  - [x] 라우터 필요성 판단
  - [x] 레거시 코드 여부 결정
  - [x] 향후 처리 방안 제시

### TASK_052: Activity 기능 구현 상태 분석 및 평가 (완료)
- [x] 프론트엔드 Activity 페이지 구현 상태 분석
  - [x] /web/src/app/projects/[projectId]/activity/page.tsx 확인
  - [x] Activity 관련 컴포넌트 및 타입 정의 검토
  - [x] API 호출 패턴 및 데이터 구조 분석
- [x] 백엔드 Activity API 구현 상태 분석
  - [x] /src/mcp_orch/models/activity.py 모델 구조 확인
  - [x] /src/mcp_orch/services/activity_logger.py 로깅 서비스 확인
  - [x] /src/mcp_orch/api/project_activities.py API 엔드포인트 확인
- [x] Activity 로깅 실제 작동 상태 확인
  - [x] 서버 추가/삭제 시 Activity 기록 여부 확인
  - [x] 프로젝트 관련 이벤트 로깅 구현 상태 확인
  - [x] ActivityLogger 사용 패턴 분석
- [x] 구현 완성도 평가 및 권고사항 제시
  - [x] 완전 구현 vs 부분 구현 vs 미구현 판단 (85% 완성 - 대부분 구현됨)
  - [x] Activity 기능 임시 숨김 vs 빠른 구현 방안 제시 (빠른 수정 추천)
  - [x] 사용자 경험 개선을 위한 우선순위 제안 (30-60분 수정으로 완전 구현 가능)

### TASK_053: MCP 서버 SSE 호출 JWT Authentication 오류 분석
- [ ] 문제 상황 파악 및 현재 설정 확인
  - [ ] 개별 MCP 서버의 JWT Authentication Disabled 설정 확인
  - [ ] SSE 호출 시 Bearer token 헤더 포함 여부 확인
  - [ ] "MCP error -32602: Invalid request parameters" 오류 상세 분석
- [ ] 관련 코드 분석
  - [ ] SSE 클라이언트 헤더 전송 로직 분석
  - [ ] 서버측 JWT 검증 로직 분석
  - [ ] MCP 서버별 JWT 설정 처리 로직 분석
- [ ] 오류 원인 구체적 파악
  - [ ] JWT Disabled 서버에 Bearer token 전송 시 처리 방식 확인
  - [ ] MCP 프로토콜 레벨 인증 처리 방식 분석
  - [ ] 헤더 파싱 오류 가능성 검토
- [ ] 해결 방안 제시 및 구현
  - [ ] 클라이언트에서 JWT 설정에 따른 헤더 조건부 전송 방안
  - [ ] 서버에서 JWT 토큰 무시 처리 방안
  - [ ] 기타 적절한 수정 방안 도출 및 구현

### TASK_054: API 키 prefix 변경으로 인한 SSE 인증 실패 문제 분석
- [ ] API 키 prefix 관련 코드 분석
  - [ ] API 키 생성 로직에서 prefix 설정 (`mch_` → `sk_`) 확인
  - [ ] JWT 토큰 검증 시 prefix 체크 로직 분석
  - [ ] Bearer token 파싱 로직에서 prefix 의존성 확인
- [ ] 인증 검증 로직 상세 분석
  - [ ] `mch_` prefix 하드코딩 여부 확인
  - [ ] API 키 형식 검증 규칙 분석
  - [ ] SSE 엔드포인트에서의 토큰 처리 로직 분석
- [ ] 관련 파일 및 코드 검색
  - [ ] JWT 인증 관련 파일들 검색 및 분석
  - [ ] API 키 모델 및 서비스 코드 분석
  - [ ] SSE transport 파일들에서 인증 처리 분석
  - [ ] 인증 미들웨어에서 prefix 처리 확인
- [ ] 구체적 오류 원인 파악
  - [ ] `sk_` prefix로 인한 토큰 검증 실패 지점 식별
  - [ ] 어떤 검증 단계에서 실패하는지 분석
  - [ ] 에러 메시지 및 로그에서 구체적 실패 원인 파악
- [ ] 수정 방안 제시 및 구현
  - [ ] prefix 하드코딩 제거 방안
  - [ ] 유연한 API 키 형식 지원 구현
  - [ ] 기존 `mch_` 키와의 호환성 유지 방안

### TASK_055: Projects Teams API 404 오류 조사 및 해결 (완료)
- [x] app.py에서 teams 관련 라우터 등록 상태 확인
  - [x] teams_modular_router 정상 등록 확인 (/api/teams prefix)
  - [x] projects/__init__.py에서 teams_router 정상 등록 확인 (/api prefix)
- [x] projects/teams.py 파일에서 POST 엔드포인트 구현 여부 확인
  - [x] POST /api/projects/{project_id}/teams/invite 구현됨
  - [x] GET /api/projects/{project_id}/available-teams 구현됨
  - [x] DELETE /api/projects/{project_id}/teams/{team_id}/members 구현됨
- [x] 경로 매핑이 올바른지 확인
  - [x] 모든 라우터가 정상 등록되어 있음
  - [x] **핵심 문제 발견**: POST /api/projects/{project_id}/teams 엔드포인트 누락
- [x] 리팩토링 과정에서 누락된 라우터나 엔드포인트가 있는지 확인
  - [x] POST /api/projects/{project_id}/teams 엔드포인트가 완전히 누락됨
  - [x] 대신 POST /api/projects/{project_id}/teams/invite만 구현되어 있음
- [x] 기존 projects.py (모놀리식)과 새로운 projects/ 모듈 구조 간의 차이점 분석
  - [x] 기존 모놀리식에서도 해당 엔드포인트를 찾지 못함
  - [x] 리팩토링 시 누락된 것으로 판단됨

## Progress Status
- Current Progress: TASK_055 완료 - Projects Teams API 404 오류 조사 완료 (핵심 원인 파악)
- Next Task: TASK_055_06 - 해결방안 제시 및 구현
- Last Update: 2025-06-30
- Automatic Check Feedback: POST /api/projects/{project_id}/teams 엔드포인트 누락 확인, 해결방안 제시 필요

## Lessons Learned and Insights
- MCP 프로토콜 표준 준수가 중요한 분석 포인트
- 실제 사용처 파악을 통한 코드 정리 필요성 확인
- Context7 도구를 활용한 최신 문서 참조의 중요성
- Activity 기능은 이미 대부분 구현되어 있으며 고품질 코드로 작성됨
- 프론트엔드 UI가 매우 완성도 높게 구현되어 있음
- ActivityLogger 서비스가 확장성 있는 구조로 잘 설계되어 있음
- 일부 placeholder 값들만 수정하면 완전히 작동하는 기능으로 완성 가능
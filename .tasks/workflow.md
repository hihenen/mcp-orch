# MCP Orch Project Workflow

## Metadata
- Status: In Progress  
- Last Update: 2025-06-27
- Automatic Check Status: PASS

## Task List

### TASK_119: MCP 도구 호출 시 여러 심각한 오류 해결 ✅
- [x] 모델 필드 오류 수정
  - [x] ToolCallLog.input_data property setter 문제 해결
  - [x] LogCategory.TOOL_EXECUTION 없는 문제 해결
  - [x] CallStatus.FAILED 없는 문제 해결
- [x] MCP 세션 처리 오류 수정
  - [x] "Separator is not found, chunk exceed limit" 오류 해결 (100MB 메시지 크기 지원)
  - [x] SSE 연결 안정성 개선 (커스텀 청크 방식)
- [x] ASGI 예외 처리 개선
  - [x] TaskGroup 예외 처리 개선 (타임아웃 60초 증가)
  - [x] HTTP response body assertion 오류 해결

### TASK_101: MCP 메시지 읽기 최적화 완료 ✅
- [x] MCP 공식 SDK 패턴 분석 및 적용
- [x] 청크 기반 메시지 읽기 구현 (8KB 청크)
- [x] 버퍼 관리 시스템 구현 (불완전한 라인 처리)
- [x] 100MB+ 대용량 메시지 지원 확보
- [x] "Failed to receive initialization response" 오류 해결
- [x] "Separator is not found, chunk exceed limit" 오류 해결
- [x] Python 버전 호환성 확보 (limit 매개변수 미사용)

### TASK_102: MCP 도구 호출 추가 오류 해결 ✅
- [x] "Invalid tool call response" 오류 분석
  - [x] MCP 응답 메시지 구조 검증 디버깅 로그 추가
  - [x] 메시지 ID 일치성 확인 로그 추가
  - [x] JSON 파싱 오류 처리 개선
- [x] CallStatus enum 오류 해결
  - [x] FAILED 값이 CallStatus enum에 이미 정의되어 있음 확인
  - [x] models.py에서 CallStatus enum 정의 확인 완료
- [x] ToolCallLog property 오류 해결
  - [x] execution_time property setter 구현 완료
  - [x] ServerLog 모델에서 project_id 인수 오류 원인 파악

### TASK_118: 데이터베이스 마이그레이션 미적용 문제 해결 ✅
- [x] 마이그레이션 상태 확인
  - [x] alembic current 명령어로 현재 마이그레이션 버전 확인
  - [x] alembic history 명령어로 마이그레이션 내역 확인
- [x] 마이그레이션 실행
  - [x] alembic upgrade head 명령어 실행
  - [x] unified_mcp_enabled 컬럼 생성 확인
- [x] 데이터베이스 스키마 검증
  - [x] projects 테이블 스키마 확인
  - [x] 프로젝트 생성 테스트

### TASK_117: JWT 토큰 생성 실패 디버깅 및 수정 ✅
- [x] JWT 토큰 생성 실패 로깅 강화
  - [x] getServerJwtToken 함수에 상세 디버깅 로그 추가
  - [x] NextAuth.js 토큰 상태 확인 로깅
  - [x] 환경변수 검증 로깅 구현
- [x] 환경변수 및 설정 검증
  - [x] AUTH_SECRET 환경변수 일치성 확인 (모든 시크릿 동일 확인)
  - [x] NextAuth.js 설정 파일 검토 (올바른 설정 확인)
  - [x] JWT 생성 로직 검증 (코드 로직 정상 확인)
- [x] 개발환경 테스트
  - [x] 개발환경에서 JWT 토큰 생성 상태 확인 (문제 발견)
  - [x] 에러 재현 및 로그 분석 (NextAuth getToken() null 반환)
  - [x] API 엔드포인트 테스트 (500 에러 확인)
- [x] 문제 해결 및 수정
  - [x] 근본 원인 파악: NextAuth.js HTTPS 경우 쿠키 도메인 불일치
  - [x] 환경별 설정 최적화: secureCookie 및 cookieName 옵션 추가
  - [x] 에러 처리 개선: __Secure- 접두사 쿠키 올바른 처리

### TASK_089: mcp_session_manager.py 구문 오류 해결 ✅
- [x] mcp_session_manager.py 파일 오류 확인 및 분석
- [x] 442번째 줄의 continue 문 위치 확인
- [x] 잘못된 continue 문 수정
- [ ] 서버 시작 테스트 및 검증
- [ ] 변경사항 커밋

### TASK_090: MCP Client에게 제공하는 Tool 목록에서 inputSchema 누락 문제 해결
- [ ] MCP 서버 응답에서 inputSchema 누락 문제 분석
- [ ] mcp-orch MCP 서버 구현부에서 tools/list 응답 확인
- [ ] MCP SSE Transport와 Unified Transport에서 inputSchema 처리 확인
- [ ] tools/list 응답에 inputSchema 정보 포함하도록 수정
- [ ] Claude Cline/Inspector에서 parameter 정보 확인 테스트
- [ ] 변경사항 커밋

### TASK_090: MCP Client에게 제공하는 Tool 목록에서 inputSchema 누락 문제 해결 ❌
- [x] MCP 서버 응답에서 inputSchema 누락 문제 분석
- [x] mcp-orch MCP 서버 구현부에서 tools/list 응답 확인
- [x] MCP SSE Transport와 Unified Transport에서 inputSchema 처리 확인
- [x] tools/list 응답에 inputSchema 정보 포함하도록 수정
- [x] Claude Cline/Inspector에서 parameter 정보 확인 테스트 (실제로는 문제 있음 발견)
- [x] 변경사항 커밋

### TASK_091: mcp-orch SSE Transport에서 MCP 클라이언트 inputSchema 미표시 문제 해결 ✅
- [x] mcp-orch SSE Transport와 MCP 클라이언트 간 inputSchema 문제 분석
- [x] MCP Inspector와 Cline에서 사용하는 실제 SSE 요청 형식 확인
- [x] mcp-orch가 실제 MCP 서버에서 도구 정보를 가져올 때 inputSchema properties 손실 문제 확인
- [x] mcp_session_manager에서 inputSchema->schema 변환과 SSE transport에서 inputSchema 참조 불일치 수정
- [x] MCP Inspector와 Cline에서 parameter 정보 표시 확인 테스트
- [x] 변경사항 커밋

### TASK_092: Message ID mismatch 오류 해결
- [x] Message ID mismatch 오류 분석 및 해결
- [x] MCP 메시지 ID 동기화 문제 근본 원인 파악
- [x] ID 기반 메시지 매칭 시스템 구현
- [ ] 변경사항 테스트
- [ ] 변경사항 커밋

### TASK_121: 서버 상태 "Error" 표시 문제 해결 ✅
- [x] 문제 분석: 백엔드에서 "error" 상태 전송하나 프론트엔드에서 미처리
- [x] 프론트엔드 상태 매핑에 "error" 케이스 추가
- [x] 백엔드 실시간 상태 확인 로깅 강화
- [x] 변경사항 커밋
- [x] 근본 원인 발견: 백엔드 "online" vs 프론트엔드 "active" 불일치
- [x] 프론트엔드를 백엔드 상태 체계로 통일 (online/offline/error/disabled)
- [x] 변경사항 커밋

### TASK_122: 시간 표시 오류 문제 해결 ✅
- [x] 문제 분석: 백엔드 datetime에 timezone 정보 누락으로 JavaScript 잘못 해석
- [x] 영향도 분석: 최소 변경으로 최대 효과 가능한 안전한 해결책 확인
- [x] Pydantic JSON encoder 추가하여 datetime에 UTC timezone 정보 포함
- [x] 영어 문서 작성: docs/timezone-handling.md
- [x] 변경사항 커밋

### TASK_120: MCP Tool Filtering System 구현 완료 ✅
- [x] Phase 1: Database Layer and Core Services (2일)
  - [x] ToolPreference 데이터베이스 모델 구현
  - [x] ToolFilteringService 핵심 서비스 구현 
  - [x] CacheInvalidationService 구현
  - [x] 데이터베이스 마이그레이션 생성
- [x] Phase 2: Transport Layer Integration (2일)
  - [x] MCP Session Manager에 실시간 필터링 적용
  - [x] Scheduler Service에 캐시 무효화 연동
  - [x] Unified/Individual MCP Transport 로깅 업데이트
  - [x] Tool Preferences REST API 구현 (GET/PUT/DELETE)
  - [x] FastAPI 애플리케이션에 API 라우터 등록
  - [x] ToolPreference 모델 Base 클래스 수정 및 Primary Key 추가
  - [x] 서버 시작 import 오류 해결 (BaseModel → Base 수정)
- [ ] Phase 3: Real-time UI Integration (2일)
- [ ] Phase 4: Testing and Optimization (1일)

### TASK_124: Pydantic V2 datetime 직렬화 수정으로 'Z' 접미사 누락 문제 해결 ✅
- [x] Context7을 통한 Pydantic V2에서 json_encoders deprecated 확인
- [x] ServerResponse 모델에 @field_serializer 데코레이터로 datetime 필드 직렬화 수정
  - [x] last_connected, created_at, updated_at 필드에 적용
  - [x] UTC timezone 정보 포함한 'Z' 접미사 추가 로직 구현
  - [x] None 값 처리 및 timezone 정보 유무에 따른 적절한 변환
- [x] CHANGELOG.md 업데이트 및 변경사항 문서화

### TASK_123: 시간 표시 오류 디버깅을 위한 포괄적 로깅 추가 ✅
- [x] loadProjectServers 함수에 날짜/시간 API 응답 디버깅 로그 추가
  - [x] 실제 API 응답 타임스탬프 값 확인 로그
  - [x] JavaScript Date 파싱 테스트 및 한국 시간 변환 로그  
  - [x] timezone 정보 포함 여부 확인 로그
- [x] 프론트엔드 날짜 포맷팅 디버깅 로그 추가
  - [x] formatDateTime 함수 호출 시 원본/포맷 결과 로그
  - [x] 브라우저 timezone 감지 및 현재 시간 비교 로그
  - [x] 개발자 콘솔에서 실시간 모니터링 가능하도록 구현
- [x] CHANGELOG.md 업데이트 및 변경사항 문서화

### TASK_122: 코드베이스 datetime 필드 및 날짜 파싱 분석
- [ ] FastAPI 응답 모델의 datetime 필드 검색
  - [ ] *.py 파일에서 datetime 필드가 포함된 Pydantic 모델 찾기
  - [ ] datetime, date, time 타입 사용 현황 분석
- [ ] 프론트엔드 날짜 파싱 코드 검색
  - [ ] *.ts, *.tsx 파일에서 날짜 문자열 파싱 코드 찾기
  - [ ] Date 객체 생성 및 포맷팅 코드 분석
- [ ] 타임존 처리 및 날짜 포맷팅 유틸리티 검색
  - [ ] 기존 날짜 처리 유틸리티 함수 확인
  - [ ] 타임존 변환 로직 분석
- [ ] 검색 결과 종합 및 리포트 작성
  - [ ] 파일명과 라인 번호를 포함한 상세 리스트 작성
  - [ ] 현재 datetime 처리 패턴 분석

## Progress Status  
- Current Progress: TASK_124 - Pydantic V2 datetime 직렬화 수정 완료
- Next Task: 서버 재시작 후 브라우저에서 'Z' 접미사 포함 확인
- Last Update: 2025-06-27
- Automatic Check Feedback: Pydantic V2 호환 @field_serializer로 datetime 직렬화 수정 완료. json_encoders 대신 현대적인 방식으로 UTC timezone 정보 포함

## Lessons Learned and Insights
- MCP 메시지 크기 제한은 대용량 데이터베이스 쿼리 결과에 중요한 영향
- Enum 클래스에서 누락된 값들이 런타임 오류의 주요 원인
- Property setter 누락으로 인한 모델 필드 할당 오류 주의 필요
- 커스텀 메시지 읽기 구현으로 안정성 대폭 향상
- 데이터베이스 drop 후 재생성 시 마이그레이션을 수동 실행해야 함
- Alembic 마이그레이션은 자동으로 실행되지 않음
- 새로운 컬럼 추가 시 기존 데이터베이스에 마이그레이션 적용 필수
- JWT 토큰 생성은 NextAuth.js getToken() 함수에 의존적
- 환경변수 불일치로 인한 토큰 생성 실패 가능성
- 개발환경과 운영환경의 설정 차이점 주의 필요
- 디버깅 로깅 부족으로 실패 원인 파악 어려움
- MCP 공식 SDK 패턴 적용으로 대용량 메시지 처리 및 호환성 문제 해결
- "Invalid tool call response" 오류는 응답 메시지 구조나 ID 불일치에서 발생
- CallStatus enum과 model property 정의 불일치로 런타임 오류 발생
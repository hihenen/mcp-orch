# MCP Orchestrator PRD (Product Requirements Document)

## 1. 제품 개요

### 1.1 제품명
**MCP Orchestrator** - 프로젝트 중심 MCP 서버 협업 플랫폼

### 1.2 비전
MCP(Model Context Protocol) 생태계에서 **프로젝트 중심의 팀 협업**을 통해 MCP 서버를 효율적으로 관리하고 공유할 수 있는 통합 플랫폼

### 1.3 핵심 가치 제안
- **프로젝트 중심 협업**: 팀 경계를 넘나드는 유연한 프로젝트 단위 협업
- **독립적인 프로젝트 환경**: 각 프로젝트별로 격리된 MCP 서버 환경 제공
- **크로스팀 멤버십**: 사용자가 여러 팀과 프로젝트에 동시 참여 가능
- **완전한 Cline 호환성**: 기존 MCP 클라이언트와 100% 호환되는 SSE 엔드포인트
- **JWT 기반 보안**: 최신 인증 시스템으로 안전한 API 접근 제어

### 1.4 현재 구현 상태 (2025년 6월 기준)
- ✅ **프로젝트 중심 아키텍처 완료**: 독립적인 프로젝트 단위 협업 시스템
- ✅ **JWT 토큰 기반 인증 완료**: NextAuth.js v5 기반 최신 인증
- ✅ **프로젝트 관리 UI 완료**: 6개 탭 (Overview, Members, Servers, Tools, Activity, Settings)
- ✅ **크로스팀 멤버십 지원**: 사용자가 여러 팀/프로젝트 참여 가능
- ✅ **완전한 SSE 호환성**: Cline과 100% 호환되는 프로젝트별 엔드포인트
- ✅ **서버 상세 모달 완료**: 서버 카드 클릭 시 상세 정보 표시 모달 구현

## 2. 핵심 아키텍처

### 2.1 프로젝트 중심 구조
```
Organization (Team)
├── Project A
│   ├── Members (Cross-team)
│   ├── MCP Servers
│   └── API Keys
├── Project B
└── Project C
```

### 2.2 URL 구조
#### 프로젝트별 SSE 엔드포인트
```
http://localhost:8000/projects/{project_id}/servers/{server_name}/sse
http://localhost:8000/projects/{project_id}/servers/{server_name}/messages
```

#### Cline 설정 예시
```json
{
  "mcpServers": {
    "github-server": {
      "transport": "sse",
      "url": "http://localhost:8000/projects/550e8400-e29b-41d4-a716-446655440000/servers/github-server/sse",
      "headers": {
        "Authorization": "Bearer mcp_proj_abc123xyz..."
      }
    }
  }
}
```

## 3. 핵심 기능

### 3.1 프로젝트 관리 시스템
- **프로젝트 생명주기 관리**: 생성, 멤버 관리, 권한 관리, 아카이브
- **크로스팀 협업**: Team Member, Individual, External 초대 방식
- **권한 관리**: Owner, Developer, Reporter 3단계 역할 시스템

### 3.2 MCP 서버 관리
- **프로젝트별 서버 격리**: 각 프로젝트마다 독립된 MCP 서버 구성
- **동적 서버 관리**: 프로젝트별 서버 설정 및 환경 변수 관리

### 3.3 인증 및 보안 시스템
- **NextAuth.js v5**: 최신 Auth.js 기반 인증 시스템
- **JWT 토큰**: 상태 없는 토큰 기반 인증
- **프로젝트별 API 키**: 프로젝트별 독립 API 키 발급

### 3.4 웹 기반 관리 대시보드
- **프로젝트 상세 페이지**: 6개 탭 (Overview, Members, Servers, Tools, Activity, Settings)
- **이중 네비게이션 구조**: Teams 메뉴 + My Projects 메뉴

## 4. 기술 스택

### 4.1 Backend
- **언어**: Python 3.11+, **패키지 관리**: uv
- **프레임워크**: FastAPI, **데이터베이스**: PostgreSQL + SQLAlchemy
- **인증**: JWT 토큰 검증, NextAuth.js 토큰 호환

### 4.2 Frontend
- **프레임워크**: Next.js 14 (App Router), **패키지 관리**: pnpm
- **UI 라이브러리**: shadcn/ui + Tailwind CSS
- **상태 관리**: Zustand, **인증**: NextAuth.js v5

### 4.3 프로토콜 지원
- **SSE**: Cline 호환 실시간 통신
- **REST API**: 웹 UI 및 관리 인터페이스
- **JSON-RPC 2.0**: MCP 표준 프로토콜

## 5. API 설계

### 5.1 프로젝트 관리 API
```python
# 프로젝트 CRUD
GET    /api/projects                    # 사용자 참여 프로젝트 목록
POST   /api/projects                    # 새 프로젝트 생성  
GET    /api/projects/{project_id}       # 프로젝트 상세 정보
PUT    /api/projects/{project_id}       # 프로젝트 정보 수정
DELETE /api/projects/{project_id}       # 프로젝트 삭제

# 프로젝트 멤버 관리
GET    /api/projects/{project_id}/members           # 멤버 목록
POST   /api/projects/{project_id}/members           # 멤버 추가
PUT    /api/projects/{project_id}/members/{user_id} # 멤버 역할 변경
DELETE /api/projects/{project_id}/members/{user_id} # 멤버 제거

# 프로젝트 서버 관리
GET    /api/projects/{project_id}/servers    # 서버 목록
POST   /api/projects/{project_id}/servers    # 서버 추가
PUT    /api/projects/{project_id}/servers    # 서버 설정 수정
DELETE /api/projects/{project_id}/servers    # 서버 제거
```

### 5.2 프로젝트별 SSE 엔드포인트
```python
# 프로젝트별 MCP 서버 SSE 엔드포인트
GET /projects/{project_id}/servers/{server_name}/sse      # SSE 연결
POST /projects/{project_id}/servers/{server_name}/messages # 메시지 전송

# 프로젝트 리소스 관리
GET /projects/{project_id}/api-keys              # API 키 목록
POST /projects/{project_id}/api-keys             # API 키 생성
GET /projects/{project_id}/cline-config          # Cline 설정 자동 생성
GET /projects/{project_id}/.well-known/mcp-servers # Discovery 엔드포인트
```

## 6. 구현 로드맵

### Phase 1: 프로젝트 중심 MVP ✅ 완료 (2025년 6월)
- [x] 프로젝트 중심 데이터베이스 모델 설계
- [x] 프로젝트 관리 API 구현 (CRUD)
- [x] 프로젝트별 SSE 엔드포인트 구현
- [x] 프론트엔드 프로젝트 관리 UI 완료
- [x] JWT 기반 인증 시스템 구현
- [x] NextAuth.js v5 업그레이드 완료
- [x] 멤버 데이터 표시 오류 수정 완료

### Phase 2: 프로젝트 중심 아키텍처 강화 🔥 (진행 중)
- [ ] 프로젝트 서버 카드 클릭 라우팅 수정
- [ ] 서버 스토어 프로젝트 지원 확장
- [ ] 전역 서버 관리 권한 제한
- [ ] 네비게이션 구조 정리

### Phase 3: 고급 프로젝트 기능 (2-3주)
- [ ] 프로젝트 템플릿 시스템
- [ ] 프로젝트 아카이브 및 복구
- [ ] 고급 멤버 관리

### Phase 4: 자동화 및 지능화 (3-4주)
- [ ] 프로젝트 자동화
- [ ] 지능형 추천 시스템
- [ ] 배치 처리 모드

### Phase 5: 엔터프라이즈 확장 (4-6주)
- [ ] SSO 통합
- [ ] 고급 모니터링
- [ ] API 확장성

## 7. 성공 지표

### 7.1 사용성 지표
- **프로젝트 생성 시간**: 평균 2분 이내 완료
- **멤버 초대 성공률**: 95% 이상
- **SSE 연결 안정성**: 99.9% 이상

### 7.2 성능 지표
- **API 응답 시간**: 95% 요청이 200ms 이내
- **동시 사용자**: 1000명 이상 지원
- **프로젝트 규모**: 프로젝트당 100개 이상 MCP 서버 지원

## 8. 보안 및 컴플라이언스

### 8.1 데이터 보안
- **프로젝트 격리**: 프로젝트별 완전한 데이터 격리
- **API 키 암호화**: 저장 시 AES-256 암호화
- **감사 로그**: 모든 중요 작업에 대한 완전한 감사 추적

## 9. 결론

MCP Orchestrator는 **프로젝트 중심의 유연한 협업 플랫폼**으로 진화했습니다.

### 9.1 핵심 차별화 요소
1. **프로젝트 중심 아키텍처**: 팀 경계를 넘나드는 유연한 협업 구조
2. **크로스팀 멤버십**: 사용자가 여러 팀과 프로젝트에 동시 참여
3. **완전한 MCP 호환성**: 기존 Cline 등 MCP 클라이언트와 100% 호환
4. **최신 인증 시스템**: NextAuth.js v5 기반 JWT 토큰 인증
5. **독립적인 프로젝트 환경**: 각 프로젝트별 격리된 MCP 서버 관리

### 9.2 향후 비전
MCP Orchestrator는 단순한 MCP 서버 관리 도구를 넘어서, **AI 협업의 새로운 패러다임**을 제시하는 플랫폼으로 발전할 것입니다.

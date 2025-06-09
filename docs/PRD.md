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

### 1.4 타겟 사용자
- **개발팀**: 여러 프로젝트에서 MCP 도구를 공유하고 협업하는 팀
- **프로젝트 매니저**: 프로젝트별 도구 접근 권한을 관리하는 관리자
- **크로스펑셔널 팀**: 여러 팀에 걸쳐 프로젝트를 진행하는 조직
- **개인 개발자**: 여러 개인 프로젝트를 독립적으로 관리하려는 개발자

### 1.5 현재 구현 상태 (2025년 6월 기준)
- ✅ **프로젝트 중심 아키텍처 완료**: 독립적인 프로젝트 단위 협업 시스템
- ✅ **JWT 토큰 기반 인증 완료**: NextAuth.js v5 기반 최신 인증
- ✅ **프로젝트 관리 UI 완료**: 6개 탭 (Overview, Members, Servers, Tools, Activity, Settings)
- ✅ **크로스팀 멤버십 지원**: 사용자가 여러 팀/프로젝트 참여 가능
- ✅ **완전한 SSE 호환성**: Cline과 100% 호환되는 프로젝트별 엔드포인트

## 2. 핵심 아키텍처

### 2.1 프로젝트 중심 구조

```
Organization (Team)
├── Project A
│   ├── Members (Cross-team)
│   ├── MCP Servers
│   │   ├── github-server
│   │   ├── notion-server
│   │   └── excel-server
│   └── API Keys
├── Project B
│   ├── Members (Cross-team)
│   ├── MCP Servers
│   └── API Keys
└── Project C
    ├── Members (Cross-team)
    ├── MCP Servers
    └── API Keys
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
    },
    "notion-server": {
      "transport": "sse", 
      "url": "http://localhost:8000/projects/550e8400-e29b-41d4-a716-446655440000/servers/notion-server/sse",
      "headers": {
        "Authorization": "Bearer mcp_proj_abc123xyz..."
      }
    }
  }
}
```

### 2.3 핵심 데이터 모델

#### Project 모델
```python
class Project(Base):
    id: UUID = Field(primary_key=True)
    name: str = Field(max_length=255)
    description: Optional[str] = None
    slug: str = Field(max_length=100, unique=True)  # URL-friendly
    created_by: UUID = Field(foreign_key="users.id")
    created_at: datetime
    updated_at: datetime
```

#### ProjectMember 모델 (크로스팀 멤버십)
```python
class ProjectMember(Base):
    id: UUID = Field(primary_key=True)
    project_id: UUID = Field(foreign_key="projects.id")
    user_id: UUID = Field(foreign_key="users.id")
    role: ProjectRole = Field(default=ProjectRole.DEVELOPER)
    
    # 초대 경로 추적
    invited_as: str = Field()  # "team_member", "individual", "external"
    invited_by: UUID = Field(foreign_key="users.id")
    joined_at: datetime
```

## 3. 핵심 기능

### 3.1 프로젝트 관리 시스템

#### 3.1.1 프로젝트 생명주기 관리
- **프로젝트 생성**: 이름, 설명, 슬러그를 통한 프로젝트 생성
- **멤버 관리**: 팀 경계를 넘나드는 유연한 멤버 초대 시스템
- **권한 관리**: Owner, Developer, Reporter 3단계 역할 시스템
- **프로젝트 아카이브**: 완료된 프로젝트의 안전한 보관

#### 3.1.2 크로스팀 협업
- **멤버 초대 방식**:
  - Team Member: 기존 팀 멤버를 프로젝트에 초대
  - Individual: 개별 사용자를 직접 초대
  - External: 외부 협력업체 멤버 초대
- **권한 상속**: 팀 권한과 프로젝트 권한의 유연한 조합
- **활동 추적**: 프로젝트별 멤버 활동 로그 및 기여도 추적

### 3.2 MCP 서버 관리

#### 3.2.1 프로젝트별 서버 격리
- **독립적인 서버 환경**: 각 프로젝트마다 독립된 MCP 서버 구성
- **서버 공유**: 팀 내 여러 프로젝트 간 서버 템플릿 공유
- **버전 관리**: 프로젝트별 서버 설정 버전 추적
- **환경 분리**: 개발/스테이징/프로덕션 환경별 서버 설정

#### 3.2.2 동적 서버 관리
```python
# 프로젝트별 서버 설정
{
  "project_id": "550e8400-e29b-41d4-a716-446655440000",
  "servers": {
    "github-server": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-github"],
      "env": {
        "GITHUB_TOKEN": "${PROJECT_GITHUB_TOKEN}"
      },
      "disabled": false
    },
    "notion-server": {
      "command": "node",
      "args": ["/path/to/notion-server"],
      "env": {
        "NOTION_API_KEY": "${PROJECT_NOTION_KEY}"
      },
      "disabled": false
    }
  }
}
```

### 3.3 인증 및 보안 시스템

#### 3.3.1 JWT 기반 인증 (구현 완료)
- **NextAuth.js v5**: 최신 Auth.js 기반 인증 시스템
- **JWT 토큰**: 상태 없는 토큰 기반 인증
- **쿠키 기반 세션**: 자동 토큰 갱신 및 관리
- **OAuth 지원**: Google, GitHub 등 소셜 로그인 지원

#### 3.3.2 프로젝트별 API 키 시스템
- **Project API Keys**: 프로젝트별 독립 API 키 발급
- **권한 스코프**: API 키별 세분화된 권한 설정
- **사용량 추적**: 키별 사용량 모니터링 및 제한
- **키 로테이션**: 주기적 키 갱신 정책

### 3.4 웹 기반 관리 대시보드 (구현 완료)

#### 3.4.1 프로젝트 상세 페이지 (6개 탭)
1. **Overview**: 프로젝트 정보, 통계, 최근 활동
2. **Members**: 멤버 관리, 역할 변경, 초대 시스템
3. **Servers**: MCP 서버 목록, 상태 모니터링, 설정 관리
4. **Tools**: 프로젝트 도구 목록, 검색, 실행 인터페이스
5. **Activity**: 프로젝트 활동 피드, 변경 이력
6. **Settings**: 프로젝트 설정, 삭제, 아카이브

#### 3.4.2 이중 네비게이션 구조
- **Teams 메뉴**: 팀 중심 뷰 (Teams → Projects → Servers)
- **My Projects 메뉴**: 개인 프로젝트 뷰 (My Projects → Servers)
- **실시간 동기화**: 팀/프로젝트 전환 시 데이터 자동 새로고침

## 4. 기술 스택

### 4.1 Backend
- **언어**: Python 3.11+
- **패키지 관리**: uv (고속 Python 패키지 관리)
- **프레임워크**: FastAPI
- **데이터베이스**: PostgreSQL + SQLAlchemy
- **인증**: JWT 토큰 검증, NextAuth.js 토큰 호환
- **비동기 처리**: asyncio, aiohttp

### 4.2 Frontend
- **프레임워크**: Next.js 14 (App Router)
- **패키지 관리**: pnpm
- **UI 라이브러리**: shadcn/ui + Tailwind CSS
- **상태 관리**: Zustand
- **인증**: NextAuth.js v5 (Auth.js)
- **API 통신**: REST API (fetch 기반)

### 4.3 프로토콜 지원
- **SSE (Server-Sent Events)**: Cline 호환 실시간 통신
- **REST API**: 웹 UI 및 관리 인터페이스
- **JSON-RPC 2.0**: MCP 표준 프로토콜
- **stdio**: 기존 MCP 서버와의 호환성

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

## 6. UI/UX 설계

### 6.1 프로젝트 상세 페이지 UI

```tsx
// 프로젝트 헤더
<div className="flex items-start justify-between">
  <div>
    <h1 className="text-3xl font-bold">{project.name}</h1>
    <p className="text-muted-foreground">{project.description}</p>
    <div className="flex items-center gap-4 mt-3">
      <Badge><Users className="h-3 w-3" />{memberCount} members</Badge>
      <Badge><Server className="h-3 w-3" />{serverCount} servers</Badge>
      <Badge>{toolCount} tools</Badge>
    </div>
  </div>
  <DropdownMenu>
    <DropdownMenuTrigger asChild>
      <Button variant="outline" size="sm">
        <MoreHorizontal className="h-4 w-4" />
      </Button>
    </DropdownMenuTrigger>
  </DropdownMenu>
</div>

// 6개 탭 네비게이션
<Tabs value={activeTab} onValueChange={setActiveTab}>
  <TabsList className="grid w-full grid-cols-6">
    <TabsTrigger value="overview">Overview</TabsTrigger>
    <TabsTrigger value="members">Members</TabsTrigger>
    <TabsTrigger value="servers">Servers</TabsTrigger>
    <TabsTrigger value="tools">Tools</TabsTrigger>
    <TabsTrigger value="activity">Activity</TabsTrigger>
    <TabsTrigger value="settings">Settings</TabsTrigger>
  </TabsList>
</Tabs>
```

### 6.2 멤버 관리 UI (GitLab 스타일)

```tsx
// 멤버 테이블
<Table>
  <TableHeader>
    <TableRow>
      <TableHead>계정</TableHead>
      <TableHead>출처</TableHead>
      <TableHead>역할</TableHead>
      <TableHead>만료일</TableHead>
      <TableHead>활동</TableHead>
      <TableHead></TableHead>
    </TableRow>
  </TableHeader>
  <TableBody>
    {members.map((member) => (
      <TableRow key={member.id}>
        <TableCell>
          <div className="flex items-center gap-3">
            <Avatar className="h-10 w-10">
              <AvatarFallback>{getInitials(member.user_name)}</AvatarFallback>
            </Avatar>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-medium">{member.user_name}</span>
                {member.is_current_user && (
                  <Badge variant="outline">It's you</Badge>
                )}
              </div>
              <p className="text-sm text-muted-foreground">{member.user_email}</p>
            </div>
          </div>
        </TableCell>
        <TableCell>
          {member.invited_as === 'team_member' ? '팀에서 상속됨' : '직접 초대'}
        </TableCell>
        <TableCell>
          <Select value={member.role} onValueChange={handleRoleChange}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="owner">Owner</SelectItem>
              <SelectItem value="developer">Developer</SelectItem>
              <SelectItem value="reporter">Reporter</SelectItem>
            </SelectContent>
          </Select>
        </TableCell>
      </TableRow>
    ))}
  </TableBody>
</Table>
```

## 7. 구현 로드맵

### Phase 1: 프로젝트 중심 MVP ✅ 완료 (2025년 6월)
- [x] 프로젝트 중심 데이터베이스 모델 설계
- [x] 프로젝트 관리 API 구현 (CRUD)
- [x] 프로젝트별 SSE 엔드포인트 구현
- [x] 프론트엔드 프로젝트 관리 UI 완료
- [x] JWT 기반 인증 시스템 구현
- [x] NextAuth.js v5 업그레이드 완료
- [x] 멤버 데이터 표시 오류 수정 완료

### Phase 2: 고급 프로젝트 기능 (2-3주)
- [ ] **프로젝트 템플릿 시스템**
  - 프로젝트 생성 시 템플릿 선택 (Frontend, Backend, Full-stack)
  - 템플릿별 기본 MCP 서버 자동 설정
  - 커스텀 템플릿 생성 및 공유
- [ ] **프로젝트 아카이브 및 복구**
  - 완료된 프로젝트 아카이브 기능
  - 아카이브된 프로젝트 복구 기능
  - 프로젝트 복제 (Fork) 기능
- [ ] **고급 멤버 관리**
  - 멤버 초대 승인 워크플로우
  - 멤버 활동 분석 및 기여도 측정
  - 멤버 온보딩 가이드 자동 생성

### Phase 3: 팀 통합 및 권한 고도화 (2-3주)
- [ ] **팀-프로젝트 연동 강화**
  - 팀별 프로젝트 템플릿 관리
  - 팀 정책 기반 프로젝트 자동 설정
  - 팀 리소스 풀 및 프로젝트 할당
- [ ] **고급 권한 시스템**
  - 세분화된 권한 매트릭스 (도구별, 서버별)
  - 임시 권한 부여 (시간 제한)
  - 권한 변경 감사 로그
- [ ] **조직 거버넌스**
  - 프로젝트 생성 정책 설정
  - 리소스 사용량 제한 및 모니터링
  - 컴플라이언스 리포팅

### Phase 4: 자동화 및 지능화 (3-4주)
- [ ] **프로젝트 자동화**
  - 프로젝트 라이프사이클 자동화
  - 멤버 활동 기반 권한 자동 조정
  - 프로젝트 상태 기반 알림 시스템
- [ ] **지능형 추천 시스템**
  - 프로젝트별 추천 MCP 서버
  - 유사 프로젝트 기반 멤버 추천
  - 프로젝트 성과 예측 및 최적화 제안
- [ ] **배치 처리 모드** (기존 PRD의 병렬화 모드)
  - LLM 기반 작업 분석 및 병렬 처리
  - 프로젝트별 워크플로우 자동화
  - Azure AI Foundry / AWS Bedrock 통합

### Phase 5: 엔터프라이즈 확장 (4-6주)
- [ ] **SSO 통합**
  - SAML, OIDC 프로토콜 지원
  - Okta, Auth0, Keycloak 연동
  - 조직 계층 구조 자동 동기화
- [ ] **고급 모니터링**
  - 프로젝트별 성능 메트릭
  - 사용량 분석 및 최적화 제안
  - 비용 추적 및 예산 관리
- [ ] **API 확장성**
  - GraphQL API 제공
  - Webhook 시스템
  - 써드파티 통합 API

## 8. 성공 지표

### 8.1 사용성 지표
- **프로젝트 생성 시간**: 평균 2분 이내 완료
- **멤버 초대 성공률**: 95% 이상
- **SSE 연결 안정성**: 99.9% 이상
- **사용자 만족도**: 4.5/5 이상

### 8.2 성능 지표
- **API 응답 시간**: 95% 요청이 200ms 이내
- **동시 사용자**: 1000명 이상 지원
- **프로젝트 규모**: 프로젝트당 100개 이상 MCP 서버 지원
- **데이터 처리량**: 초당 1000개 이상 MCP 메시지 처리

### 8.3 비즈니스 지표
- **월간 활성 프로젝트**: 신규 생성 프로젝트의 80% 이상이 1개월 이상 활성 상태
- **팀 협업 증진**: 크로스팀 프로젝트 비율 30% 이상
- **리소스 효율성**: 팀별 MCP 서버 중복 사용 50% 감소

## 9. 보안 및 컴플라이언스

### 9.1 데이터 보안
- **프로젝트 격리**: 프로젝트별 완전한 데이터 격리
- **API 키 암호화**: 저장 시 AES-256 암호화
- **감사 로그**: 모든 중요 작업에 대한 완전한 감사 추적
- **접근 제어**: 최소 권한 원칙 적용

### 9.2 컴플라이언스
- **GDPR 준수**: EU 개인정보보호법 준수
- **SOC 2 Type II**: 보안 통제 프레임워크 준수
- **데이터 주권**: 지역별 데이터 저장 정책 지원

## 10. 결론

MCP Orchestrator는 기존의 조직/팀 중심 구조를 넘어서 **프로젝트 중심의 유연한 협업 플랫폼**으로 진화했습니다. 

### 10.1 핵심 차별화 요소
1. **프로젝트 중심 아키텍처**: 팀 경계를 넘나드는 유연한 협업 구조
2. **크로스팀 멤버십**: 사용자가 여러 팀과 프로젝트에 동시 참여
3. **완전한 MCP 호환성**: 기존 Cline 등 MCP 클라이언트와 100% 호환
4. **최신 인증 시스템**: NextAuth.js v5 기반 JWT 토큰 인증
5. **독립적인 프로젝트 환경**: 각 프로젝트별 격리된 MCP 서버 관리

### 10.2 향후 비전
MCP Orchestrator는 단순한 MCP 서버 관리 도구를 넘어서, **AI 협업의 새로운 패러다임**을 제시하는 플랫폼으로 발전할 것입니다. 프로젝트 중심의 협업 구조를 통해 조직의 AI 도구 활용 효율성을 극대화하고, 팀 간 지식 공유와 협업을 촉진하여 전체 조직의 생산성 향상에 기여할 것입니다.

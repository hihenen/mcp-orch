# MCP Batch Proxy/Orchestration 도구 PRD (Product Requirements Document)

## 1. 제품 개요

### 1.1 제품명
**MCP Orch** - 하이브리드 MCP 프록시 및 병렬화 오케스트레이션 도구

### 1.2 비전
MCP(Model Context Protocol) 생태계에서 두 가지 핵심 기능을 제공하는 통합 솔루션:
1. **프록시 모드**: 여러 MCP 서버를 통합하여 서버별 개별 엔드포인트로 제공
2. **병렬화 모드**: LLM과 협력하여 작업을 자동으로 병렬 처리

### 1.3 목표
- 여러 MCP 서버의 도구들을 하나의 통합 인터페이스로 관리
- Cursor, Cline 등에서 직접 사용 가능한 REST API 엔드포인트 제공
- LLM이 작업을 분석하여 자동으로 병렬/순차 실행 결정
- 토큰 사용량과 실행 시간을 대폭 감소

### 1.4 타겟 사용자
- MCP를 사용하는 개발자 및 DevOps 엔지니어
- 여러 MCP 도구를 통합하여 사용하려는 팀
- AI 에이전트를 활용한 자동화를 구축하려는 조직

## 2. 핵심 기능

### 2.1 듀얼 모드 운영

#### 모드 1: 프록시 모드 (Proxy Mode)
- **목적**: Cursor, Cline 등에서 직접 사용 가능한 통합 MCP 서버
- **기능**:
  - 여러 MCP 서버를 중앙에서 관리하면서 서버별 개별 SSE 엔드포인트 제공
  - 모든 도구를 네임스페이스로 구분하여 제공 (예: `github.create_issue`, `notion.create_page`)
  - 기존 MCP 클라이언트와 100% 호환
  - **서버별 독립적인 SSE 연결 지원**
- **사용 예시**:
  ```json
  // Cline MCP 설정 - 서버별 개별 엔드포인트
  {
    "mcpServers": {
      "brave-search": {
        "transport": "sse",
        "url": "http://localhost:8000/sse/brave-search"
      },
      "notion": {
        "transport": "sse",
        "url": "http://localhost:8000/sse/notion"
      },
      "github": {
        "transport": "sse",
        "url": "http://localhost:8000/sse/github"
      }
    }
  }
  ```

#### 모드 2: 병렬화 모드 (Batch Mode)
- **목적**: LLM과 협력하여 작업을 자동으로 병렬 처리
- **기능**:
  - 특별한 도구 `batch_execute`를 통해 병렬 실행 요청
  - LLM이 작업을 분석하여 최적의 실행 계획 생성
  - 병렬/순차 실행을 자동으로 결정
- **사용 예시**:
  ```
  사용자: "GitHub 이슈들을 분석하고 Notion에 주간 리포트를 작성해줘"
  LLM: batch_execute를 사용하여 병렬로 처리하겠습니다...
  ```

### 2.2 통합 도구 레지스트리
- **기능**: 연결된 모든 MCP 서버의 도구를 자동으로 발견하고 등록
- **세부사항**:
  - 도구 메타데이터 자동 수집 (이름, 설명, 파라미터 스키마)
  - 동적 도구 추가/제거 지원
  - 도구 네임스페이스 관리
  - 프록시 모드와 병렬화 모드 모두에서 사용
  - **JSON 설정 파일 지원**:
    - `mcp-config.json` 파일로 MCP 서버 목록 관리
    - 각 서버별 설정 (command, args, env, timeout, autoApprove, transportType, disabled 등)
    - 런타임 중 설정 파일 리로드 지원
    - 설정 파일 예시:
      ```json
      {
        "mcpServers": {
          "github-server": {
            "command": "npx",
            "args": ["-y", "@modelcontextprotocol/server-github"],
            "env": {
              "GITHUB_TOKEN": "your-token"
            },
            "timeout": 60,
            "autoApprove": ["list_issues", "create_issue"],
            "transportType": "stdio",
            "disabled": false
          },
          "notion-server": {
            "command": "node",
            "args": ["/path/to/notion-server"],
            "env": {
              "NOTION_API_KEY": "your-key"
            },
            "transportType": "stdio",
            "disabled": true
          }
        }
      }
      ```

### 2.3 스마트 실행 플래너
- **기능**: LLM을 활용한 지능형 작업 분석 및 계획
- **세부사항**:
  - 작업 간 의존성 자동 파악
  - 병렬 실행 가능한 작업 식별
  - 데이터 흐름 분석 및 파라미터 매핑
  - 실행 계획 최적화

### 2.4 고성능 실행 엔진
- **기능**: 프록시 모드와 병렬화 모드를 모두 지원하는 통합 엔진
- **세부사항**:
  - **프록시 모드**: 1:1 도구 호출 전달
  - **병렬화 모드**: 다중 작업 동시 실행
  - 작업 큐 및 워커 풀 관리
  - 진행 상황 추적 (REST API 기반 상태 조회)

### 2.5 프로토콜 어댑터
- **기능**: 다양한 프로토콜 간 원활한 변환
- **세부사항**:
  - stdio ↔ HTTP/SSE 양방향 변환
  - 서버별 독립적인 SSE 스트림 관리
  - 프로토콜별 최적화
  - 연결 풀링 및 재사용
  - 에러 처리 및 재연결 메커니즘

### 2.6 웹 기반 관리 대시보드
- **기능**: 시각적 도구 관리 및 모니터링
- **세부사항**:
  - 작업 상태 모니터링 (REST API 기반 데이터 조회, 필요시 주기적 폴링)
  - 도구 설정 및 관리
  - 실행 로그 및 성능 지표
  - 모드별 사용 통계

## 3. 기술 아키텍처

### 3.1 시스템 구성도

#### 전체 아키텍처
```
┌─────────────────────────────────────────────────┐
│              Web UI (shadcn/ui)                  │
│  - 도구 관리    - 작업 모니터링                 │
│  - 로그 뷰어    - 성능 분석                     │
└─────────────────┬───────────────────────────────┘
                  │ REST API (HTTP/JSON)
┌─────────────────▼───────────────────────────────┐
│         MCP Orch Server (localhost:8000)         │
│  ┌─────────────────────────────────────────┐   │
│  │   듀얼 모드 컨트롤러                    │   │
│  │   - 프록시 모드 / 병렬화 모드 전환     │   │
│  │   - 모드별 라우팅                       │   │
│  └─────────────────────────────────────────┘   │
│  ┌─────────────────────────────────────────┐   │
│  │   통합 도구 레지스트리                  │   │
│  │   - 도구 발견 및 등록                   │   │
│  │   - 메타데이터 관리                     │   │
│  └─────────────────────────────────────────┘   │
│  ┌─────────────────────────────────────────┐   │
│  │   서버별 SSE 핸들러                     │   │
│  │   - /sse/brave-search                   │   │
│  │   - /sse/notion                         │   │
│  │   - /sse/github                         │   │
│  └─────────────────────────────────────────┘   │
│  ┌─────────────────────────────────────────┐   │
│  │   프로토콜 어댑터                       │   │
│  │   - stdio ↔ HTTP/SSE 변환              │   │
│  │   - 연결 관리                           │   │
│  └─────────────────────────────────────────┘   │
└─────────────────┬───────────────────────────────┘
                  │ stdio
┌─────────────────▼───────────────────────────────┐
│            MCP Server Pool                       │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐     │
│  │ GitHub   │  │ Notion   │  │ Brave    │     │
│  │ MCP      │  │ MCP      │  │ Search   │     │
│  └──────────┘  └──────────┘  └──────────┘     │
└─────────────────────────────────────────────────┘
```

#### Cline 연동 구조
```
Cline
  ├─ brave-search (SSE) ──→ localhost:8000/sse/brave-search
  │                          └─→ ServerSpecificSSEHandler
  │                               └─→ brave-search MCP process
  ├─ notion (SSE) ────────→ localhost:8000/sse/notion
  │                          └─→ ServerSpecificSSEHandler
  │                               └─→ notion MCP process
  └─ github (SSE) ────────→ localhost:8000/sse/github
                             └─→ ServerSpecificSSEHandler
                                  └─→ github MCP process
```

### 3.2 기술 스택

#### Backend
- **언어**: Python 3.11+
- **패키지 관리**: uv (빠른 Python 패키지 관리자)
- **프레임워크**: FastAPI
- **비동기 처리**: asyncio, aiohttp
- **LLM 통합**: **Azure AI Foundry / AWS Bedrock 기반 우선 개발** (OpenAI API, Anthropic API 등은 옵션으로 확장 지원)
- **프로토콜**: JSON-RPC 2.0, REST API (HTTP/JSON), SSE (Server-Sent Events)
- **데이터베이스**: SQLite (도구 메타데이터 캐싱)

#### Frontend
- **프레임워크**: Next.js 14 (App Router)
- **UI 라이브러리**: shadcn/ui
- **CSS 프레임워크**: Tailwind CSS
- **상태 관리**: Zustand
- **API 통신**: REST API (fetch/axios 등)
- **차트**: Recharts

### 3.3 핵심 컴포넌트

#### 3.3.1 듀얼 모드 컨트롤러
```python
class DualModeController:
    def __init__(self, mode: str = "proxy"):
        self.mode = mode
        
    async def handle_request(self, request):
        if self.mode == "proxy":
            return await self.proxy_handler(request)
        else:
            return await self.batch_handler(request)
```

#### 3.3.2 도구 레지스트리
```python
class ToolRegistry:
    async def discover_tools(self, server_config):
        """MCP 서버에서 도구 자동 발견"""
        
    async def register_tool(self, server_name, tool_info):
        """도구 등록 및 메타데이터 저장"""
        
    def get_tool(self, tool_name):
        """도구 정보 조회"""
```

#### 3.3.3 실행 플래너
```python
class ExecutionPlanner:
    async def create_plan(self, user_request, available_tools):
        """LLM을 사용하여 실행 계획 생성"""
        
    def analyze_dependencies(self, tasks):
        """작업 간 의존성 분석"""
        
    def identify_parallel_tasks(self, tasks):
        """병렬 실행 가능한 작업 식별"""
```

#### 3.3.4 병렬 실행 엔진
```python
class ParallelExecutor:
    async def execute_plan(self, execution_plan):
        """실행 계획에 따라 작업 수행"""
        
    async def execute_parallel_phase(self, tasks):
        """병렬 작업 실행"""
        
    async def execute_sequential_task(self, task, context):
        """순차 작업 실행"""
```

## 4. UI/UX 설계

### 4.1 주요 화면

#### 4.1.1 대시보드
- **모드 선택**: 프록시/병렬화 모드 전환
- **서버 상태**: 연결된 MCP 서버들의 상태 표시
- **도구 목록**: 사용 가능한 모든 도구 표시
- **실행 통계**: 실행 횟수, 성공률, 평균 실행 시간

#### 4.1.2 작업 실행
- **자연어 입력**: 작업 요청 입력 필드
- **실행 계획 미리보기**: LLM이 생성한 실행 계획 표시
- **작업 진행 상황**: 각 작업의 실행 상태 표시 (REST API 기반 데이터 조회, 필요시 수동 새로고침/주기적 폴링)

#### 4.1.3 로그 뷰어
- **실행 히스토리**: 과거 실행 기록
- **상세 로그**: 각 작업의 입출력 데이터
- **에러 추적**: 실패한 작업의 상세 정보

### 4.2 UI 컴포넌트 (shadcn/ui)

```tsx
// 모드 선택기
<Tabs defaultValue="proxy" className="w-full">
  <TabsList className="grid w-full grid-cols-2">
    <TabsTrigger value="proxy">프록시 모드</TabsTrigger>
    <TabsTrigger value="batch">병렬화 모드</TabsTrigger>
  </TabsList>
  <TabsContent value="proxy">
    <Card>
      <CardHeader>
        <CardTitle>프록시 모드</CardTitle>
        <CardDescription>
          여러 MCP 서버를 하나의 엔드포인트로 통합
        </CardDescription>
      </CardHeader>
    </Card>
  </TabsContent>
  <TabsContent value="batch">
    <Card>
      <CardHeader>
        <CardTitle>병렬화 모드</CardTitle>
        <CardDescription>
          LLM과 협력하여 작업을 자동으로 병렬 처리
        </CardDescription>
      </CardHeader>
    </Card>
  </TabsContent>
</Tabs>

// 서버 상태 카드
<Card>
  <CardHeader>
    <CardTitle>GitHub MCP Server</CardTitle>
    <Badge variant="default">Online</Badge>
  </CardHeader>
  <CardContent>
    <div className="space-y-2">
      <div className="text-sm text-muted-foreground">
        Available Tools: 12
      </div>
      <Progress value={85} className="h-2" />
      <div className="text-xs">CPU: 85%</div>
    </div>
  </CardContent>
</Card>

// 작업 실행 인터페이스
<div className="space-y-4">
  <Textarea
    placeholder="무엇을 도와드릴까요? 예: GitHub 이슈를 분석해서 주간 리포트 만들어줘"
    className="min-h-[100px]"
  />
  <Button size="lg" className="w-full">
    <Play className="mr-2 h-4 w-4" />
    실행
  </Button>
</div>

// 실행 계획 표시
<Accordion type="single" collapsible>
  <AccordionItem value="phase-1">
    <AccordionTrigger>
      Phase 1: 데이터 수집 (병렬 실행)
    </AccordionTrigger>
    <AccordionContent>
      <div className="space-y-2">
        <TaskItem 
          name="github.fetch_issues" 
          status="running" 
        />
        <TaskItem 
          name="jira.get_tickets" 
          status="pending" 
        />
      </div>
    </AccordionContent>
  </AccordionItem>
</Accordion>
```

## 5. 구현 로드맵

### Phase 1: MVP - 프록시 모드 (2-3주) 
**권장 개발 모드: 일반 모드 (빠른 구현)**
- [x] 기본 프록시 서버 구현
- [x] stdio ↔ REST API/SSE 프로토콜 변환
- [x] 다중 MCP 서버 연결 및 관리
- [x] 도구 네임스페이스 구현
- [x] CLI 인터페이스
- [x] **서버별 개별 SSE 엔드포인트 구현**
- **추론 모드 필요 부분**: 듀얼 모드 컨트롤러의 아키텍처 설계 시에만

### Phase 2: 병렬화 모드 기초 (2-3주)
**권장 개발 모드: 일반 모드 (표준 패턴 활용)**
- [ ] batch_execute 도구 구현
- [ ] 간단한 병렬 실행 엔진
- [ ] 기본적인 작업 스케줄링
- [ ] 결과 집계 메커니즘

### Phase 3: LLM 통합 (3-4주)
**권장 개발 모드: 추론 모드 (복잡한 로직 설계)**
- [ ] **Azure AI Foundry / AWS Bedrock 기반 LLM 통합 우선 개발**
  - LLM 실행 플래너 구현
    - **Azure AI Foundry / AWS Bedrock API 연동**
    - 작업 분석 알고리즘 설계
    - 의존성 그래프 생성 로직
- [ ] 자연어 작업 요청 처리
- [ ] 의존성 분석 및 자동 스케줄링
  - 병렬/순차 실행 결정 알고리즘
- [ ] 실행 계획 최적화
- [ ] (옵션) OpenAI, Anthropic 등 타 LLM 서비스 확장 지원

### Phase 4: 웹 UI (3-4주)
**권장 개발 모드: 일반 모드 (컴포넌트 조립)**
- [ ] Next.js + shadcn/ui 기반 웹 UI
- [ ] 작업 모니터링 대시보드 (REST API 기반)
- [ ] 도구 관리 인터페이스
- [ ] 로그 및 분석 기능

### Phase 5: 고급 기능 (4-6주)
**권장 개발 모드: 하이브리드**
- [ ] HTTP 프로토콜 지원 추가 (일반 모드)
- [ ] 고급 에러 처리 및 재시도
  - **추론 모드**: 분산 시스템 에러 복구 전략
- [ ] 성능 최적화 (캐싱, 연결 풀링)
  - **추론 모드**: 최적화 전략 설계
- [ ] 플러그인 시스템 (일반 모드)

## 6. 성공 지표

### 6.1 성능 지표
- 병렬 실행으로 인한 실행 시간 50% 이상 단축
- 토큰 사용량 30% 이상 감소
- 99% 이상의 가용성

### 6.2 사용성 지표
- 자연어 요청의 90% 이상 정확한 실행 계획 생성
- 평균 3분 이내 신규 MCP 서버 통합
- 사용자 만족도 4.5/5 이상

### 6.3 확장성 지표
- 100개 이상의 도구 동시 관리
- 초당 1000개 이상의 작업 처리
- 10개 이상의 MCP 서버 동시 연결

## 7. 위험 요소 및 대응 방안

### 7.1 기술적 위험
- **위험**: 다양한 MCP 구현체와의 호환성 문제
- **대응**: 프로토콜 어댑터 패턴으로 추상화, 광범위한 테스트

### 7.2 성능 위험
- **위험**: LLM 호출로 인한 지연
- **대응**: 실행 계획 캐싱, 경량 모델 사용 옵션

### 7.3 보안 위험
- **위험**: 민감한 데이터 노출
- **대응**: 엔드투엔드 암호화, 접근 제어 구현

### 7.4 인증 및 인가 계획
- **Bearer 토큰 인증**:
  - REST API 엔드포인트 접근 시 Authorization 헤더에 Bearer 토큰 필수
  - 토큰 발급 및 관리 시스템 구현
  - 토큰 만료 및 갱신 메커니즘
- **API 키 관리**:
  - 각 클라이언트별 고유 API 키 발급
  - 키 로테이션 정책 (주기적 갱신)
  - 키별 사용량 제한 및 모니터링
- **권한 관리**:
  - 역할 기반 접근 제어 (RBAC)
  - 도구별 세분화된 권한 설정
  - 감사 로그 기록

## 8. AI 개발 가이드

### 8.1 LLM 모드 사용 규칙
- **규칙**: 개발 단계에 따라 적절한 LLM 모드를 사용해야 함
- **자동 확인**: "현재 단계에 추론 모드가 필요한데 일반 모드를 사용 중이라면, 추론 모드를 활성화해주세요"라고 요청

### 8.2 모드별 개발 가이드
```
Phase 1-2: 일반 모드 사용
- 빠른 프로토타이핑
- 표준 패턴 구현

Phase 3 (LLM 통합): 추론 모드 필수
- 복잡한 알고리즘 설계
- 의존성 분석 로직
- 병렬화 전략 수립

Phase 4: 일반 모드 사용
- UI 컴포넌트 조립
- 표준 CRUD 구현

Phase 5: 상황에 따라 전환
- 최적화 전략: 추론 모드
- 기본 구현: 일반 모드
```

### 8.3 개발 시 체크리스트
- [ ] 현재 개발 단계 확인
- [ ] 권장 모드 확인
- [ ] 필요시 모드 전환 요청
- [ ] 복잡한 로직은 추론 모드로
- [ ] 단순 구현은 일반 모드로

## 9. 개발 환경 설정

### 9.1 uv를 사용한 개발 환경
MCP Orch는 빠른 Python 패키지 관리를 위해 uv를 사용합니다:

```bash
# uv 설치 (아직 설치하지 않은 경우)
curl -LsSf https://astral.sh/uv/install.sh | sh

# 프로젝트 의존성 설치
cd mcp-orch
uv pip install -e .

# 개발 의존성 포함 설치
uv pip install -e ".[dev]"

# 서버 실행
uv run mcp-orch serve --mode proxy

# 또는 uvx를 사용한 직접 실행
uvx --from . mcp-orch serve --mode proxy
```

### 9.2 개발 워크플로우
```bash
# 테스트 실행
uv run pytest

# 코드 포맷팅
uv run black src/
uv run isort src/

# 타입 체크
uv run mypy src/
```

## 10. 결론

MCP Orch는 현재 MCP 생태계의 중요한 공백을 메우는 혁신적인 도구입니다. 프록시 모드를 통해 여러 MCP 서버를 통합 관리할 수 있고, 병렬화 모드를 통해 LLM의 지능을 활용하여 복잡한 워크플로우 정의 없이도 자동으로 작업을 최적화할 수 있습니다.  
특히, LLM 통합은 **Azure AI Foundry / AWS Bedrock 기반을 우선적으로 지원**하며, 필요에 따라 OpenAI, Anthropic 등 타 LLM 서비스로의 확장도 용이하도록 설계됩니다.  
이를 통해 개발자들은 더 빠르고 효율적으로 작업을 수행할 수 있으며, AI 에이전트의 활용도를 크게 향상시킬 수 있습니다.

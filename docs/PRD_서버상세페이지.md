# MCP Orch - 서버 상세 페이지 PRD 추가 제안서

## 1. 개요

### 1.1 배경
- 현재 대시보드에서 MCP 서버 카드를 표시하고 있으나, 클릭 시 동작이 정의되지 않음
- 사용자는 각 서버가 제공하는 도구와 상태를 상세히 확인하고 관리할 필요가 있음
- 효율적인 도구 실행과 서버 관리를 위한 통합 인터페이스 필요

### 1.2 목표
- 서버별 상세 정보와 도구 목록을 직관적으로 표시
- 도구 실행과 서버 관리 기능을 한 곳에서 제공
- 향후 SaaS 전환 시 유료 기능 확장이 용이한 구조 설계

## 2. UI/UX 설계

### 2.1 서버 상세 페이지 구조

```
/[locale]/servers/[serverId]
```

#### 2.1.1 페이지 레이아웃
```
┌─────────────────────────────────────────────────────┐
│ 🔙 Back to Dashboard     Server: GitHub MCP         │
├─────────────────────────────────────────────────────┤
│ ┌─────────────────────┐ ┌─────────────────────────┐│
│ │ Server Overview      │ │ Quick Actions          ││
│ │ • Status: 🟢 Online │ │ [Restart] [Configure]  ││
│ │ • Uptime: 2h 34m    │ │ [View Logs] [Disable]  ││
│ │ • CPU: 45%          │ └─────────────────────────┘│
│ │ • Memory: 512MB     │                             │
│ │ • Total Tools: 12   │ ┌─────────────────────────┐│
│ │ • Executions: 234   │ │ Connection Info        ││
│ └─────────────────────┘ │ • Type: SSE            ││
│                         │ • URL: /sse/github      ││
│                         │ • Timeout: 60s          ││
│                         └─────────────────────────┘│
├─────────────────────────────────────────────────────┤
│ Available Tools                          [Search]   │
├─────────────────────────────────────────────────────┤
│ ┌─────────────────────────────────────────────────┐│
│ │ 📦 create_issue                    [Execute ▶]  ││
│ │ Creates a new issue in a GitHub repository      ││
│ │ Last used: 10 minutes ago • Success rate: 98%   ││
│ ├─────────────────────────────────────────────────┤│
│ │ 📋 list_issues                     [Execute ▶]  ││
│ │ Lists issues from a GitHub repository           ││
│ │ Last used: 1 hour ago • Success rate: 100%      ││
│ ├─────────────────────────────────────────────────┤│
│ │ 🔄 create_pull_request             [Execute ▶]  ││
│ │ Creates a new pull request                      ││
│ │ Last used: 2 days ago • Success rate: 95%       ││
│ └─────────────────────────────────────────────────┘│
├─────────────────────────────────────────────────────┤
│ Recent Executions                      [View All]   │
├─────────────────────────────────────────────────────┤
│ [Execution history timeline...]                     │
└─────────────────────────────────────────────────────┘
```

### 2.2 핵심 컴포넌트

#### 2.2.1 서버 오버뷰 카드
```tsx
interface ServerOverviewProps {
  server: MCPServer;
  stats: ServerStats;
}

<Card>
  <CardHeader>
    <CardTitle>Server Overview</CardTitle>
  </CardHeader>
  <CardContent className="space-y-4">
    <div className="flex items-center justify-between">
      <span className="text-sm font-medium">Status</span>
      <Badge variant={getStatusVariant(server.status)}>
        {server.status}
      </Badge>
    </div>
    <div className="space-y-2">
      <div className="flex justify-between text-sm">
        <span>CPU Usage</span>
        <span>{server.cpu}%</span>
      </div>
      <Progress value={server.cpu} className="h-2" />
    </div>
    {/* Memory, Uptime, etc. */}
  </CardContent>
</Card>
```

#### 2.2.2 도구 카드 컴포넌트
```tsx
interface ToolCardProps {
  tool: MCPTool;
  serverName: string;
  onExecute: (tool: MCPTool) => void;
}

<Card className="hover:shadow-md transition-shadow cursor-pointer">
  <CardContent className="p-4">
    <div className="flex items-start justify-between">
      <div className="flex-1">
        <div className="flex items-center gap-2 mb-2">
          <ToolIcon type={tool.category} />
          <h3 className="font-semibold">{tool.name}</h3>
        </div>
        <p className="text-sm text-muted-foreground mb-3">
          {tool.description}
        </p>
        <div className="flex items-center gap-4 text-xs text-muted-foreground">
          <span>Last used: {formatRelativeTime(tool.lastUsed)}</span>
          <span>Success rate: {tool.successRate}%</span>
        </div>
      </div>
      <Button 
        size="sm" 
        onClick={() => onExecute(tool)}
        className="ml-4"
      >
        <Play className="w-4 h-4 mr-1" />
        Execute
      </Button>
    </div>
  </CardContent>
</Card>
```

#### 2.2.3 빠른 실행 모달
```tsx
<Dialog open={isExecuteModalOpen} onOpenChange={setIsExecuteModalOpen}>
  <DialogContent className="max-w-2xl">
    <DialogHeader>
      <DialogTitle>Execute: {selectedTool.name}</DialogTitle>
      <DialogDescription>
        {selectedTool.description}
      </DialogDescription>
    </DialogHeader>
    
    <div className="space-y-4 py-4">
      {/* Dynamic form based on tool parameters */}
      {selectedTool.parameters.map((param) => (
        <div key={param.name} className="space-y-2">
          <Label htmlFor={param.name}>
            {param.name} {param.required && <span className="text-red-500">*</span>}
          </Label>
          {renderParameterInput(param)}
          <p className="text-xs text-muted-foreground">
            {param.description}
          </p>
        </div>
      ))}
    </div>
    
    <DialogFooter>
      <Button variant="outline" onClick={() => setIsExecuteModalOpen(false)}>
        Cancel
      </Button>
      <Button onClick={handleExecute}>
        <Play className="w-4 h-4 mr-2" />
        Execute
      </Button>
    </DialogFooter>
  </DialogContent>
</Dialog>
```

### 2.3 주요 기능

#### 2.3.1 실시간 서버 모니터링
- 서버 상태, CPU, 메모리 사용량 실시간 업데이트
- 연결 상태 변경 시 즉시 반영
- 에러 발생 시 알림 표시

#### 2.3.2 도구 검색 및 필터링
- 도구 이름, 설명으로 검색
- 카테고리별 필터링 (데이터 조회, 생성, 수정, 삭제 등)
- 사용 빈도, 성공률 기준 정렬

#### 2.3.3 도구 실행 인터페이스
- 파라미터 타입에 따른 동적 입력 폼 생성
- 입력값 검증 및 자동 완성
- 실행 결과 실시간 표시
- 실행 히스토리 저장

#### 2.3.4 서버 관리 기능
- 서버 재시작
- 설정 변경 (환경 변수, 타임아웃 등)
- 로그 조회
- 서버 활성화/비활성화

## 3. 데이터 모델

### 3.1 확장된 타입 정의
```typescript
// 도구 카테고리
export type ToolCategory = 'query' | 'create' | 'update' | 'delete' | 'analyze' | 'other';

// 파라미터 타입
export type ParameterType = 'string' | 'number' | 'boolean' | 'object' | 'array';

// 도구 파라미터
export interface ToolParameter {
  name: string;
  type: ParameterType;
  description?: string;
  required: boolean;
  default?: any;
  enum?: string[];  // 선택 가능한 값들
  pattern?: string; // 정규식 패턴
}

// 도구 정보
export interface MCPTool {
  id: string;
  name: string;
  serverName: string;
  description: string;
  category: ToolCategory;
  parameters: ToolParameter[];
  examples?: ToolExample[];
  lastUsed?: Date;
  executionCount: number;
  successRate: number;
  averageExecutionTime: number; // ms
}

// 도구 실행 예시
export interface ToolExample {
  description: string;
  parameters: Record<string, any>;
  result?: any;
}

// 서버 통계
export interface ServerStats {
  totalExecutions: number;
  successfulExecutions: number;
  failedExecutions: number;
  averageResponseTime: number;
  uptime: number; // seconds
  lastError?: {
    timestamp: Date;
    message: string;
    toolName?: string;
  };
}
```

### 3.2 API 엔드포인트 추가
```typescript
// 서버 상세 정보 조회
GET /api/servers/{serverId}
Response: {
  server: MCPServer,
  stats: ServerStats,
  tools: MCPTool[]
}

// 서버의 도구 목록 조회
GET /api/servers/{serverId}/tools
Query: {
  search?: string,
  category?: ToolCategory,
  sortBy?: 'name' | 'usage' | 'success_rate',
  limit?: number,
  offset?: number
}

// 도구 실행
POST /api/servers/{serverId}/tools/{toolName}/execute
Body: {
  parameters: Record<string, any>
}
Response: {
  executionId: string,
  status: 'pending' | 'running' | 'completed' | 'failed',
  result?: any,
  error?: string
}

// 실행 상태 조회
GET /api/executions/{executionId}

// 서버 관리 액션
POST /api/servers/{serverId}/restart
POST /api/servers/{serverId}/configure
Body: { config: Partial<ServerConfig> }
```

## 4. 구현 우선순위

### Phase 1: 기본 서버 상세 페이지 (1주)
- [ ] 서버 상세 페이지 라우팅 구현
- [ ] 서버 정보 표시 (오버뷰, 연결 정보)
- [ ] 도구 목록 표시
- [ ] 기본 검색/필터 기능

### Phase 2: 도구 실행 인터페이스 (1-2주)
- [ ] 도구 실행 모달 구현
- [ ] 동적 파라미터 폼 생성
- [ ] 실행 결과 표시
- [ ] 실행 히스토리

### Phase 3: 서버 관리 기능 (1주)
- [ ] 서버 재시작 기능
- [ ] 설정 변경 UI
- [ ] 로그 뷰어
- [ ] 서버 활성화/비활성화

### Phase 4: 고급 기능 (2주)
- [ ] 실시간 모니터링 (WebSocket/SSE)
- [ ] 도구 즐겨찾기
- [ ] 실행 템플릿 저장
- [ ] 배치 실행 지원

## 5. 사업성 고려사항

### 5.1 무료 vs 유료 기능 구분
**무료 (Community)**
- 기본 서버 정보 조회
- 도구 목록 확인
- 간단한 도구 실행 (일일 한도)
- 기본 검색/필터

**유료 (Pro/Enterprise)**
- 무제한 도구 실행
- 고급 모니터링 및 분석
- 실행 템플릿 및 자동화
- 팀 협업 기능
- API 액세스
- 우선 지원

### 5.2 확장 가능한 기능
- **도구 마켓플레이스**: 커뮤니티가 만든 도구 공유
- **워크플로우 빌더**: 여러 도구를 연결한 워크플로우 생성
- **AI 추천**: 사용 패턴 기반 도구 추천
- **팀 대시보드**: 팀 전체의 사용 현황 분석

### 5.3 성능 및 확장성
- 도구 실행 결과 캐싱
- 파라미터 자동 완성을 위한 히스토리 저장
- 대용량 로그 처리를 위한 페이지네이션
- 서버 상태 정보 캐싱 (Redis 등)

## 6. 기술적 고려사항

### 6.1 상태 관리
```typescript
// Zustand store for server detail
interface ServerDetailStore {
  server: MCPServer | null;
  stats: ServerStats | null;
  tools: MCPTool[];
  loading: boolean;
  error: string | null;
  
  // Actions
  fetchServerDetail: (serverId: string) => Promise<void>;
  executeTool: (toolName: string, parameters: any) => Promise<void>;
  updateServerConfig: (config: Partial<ServerConfig>) => Promise<void>;
  restartServer: () => Promise<void>;
}
```

### 6.2 실시간 업데이트
- 서버 상태는 SSE/WebSocket으로 실시간 업데이트
- 도구 실행 상태는 폴링 또는 SSE로 추적
- 낙관적 업데이트로 빠른 UI 반응

### 6.3 에러 처리
- 서버 연결 실패 시 재연결 시도
- 도구 실행 실패 시 상세 에러 메시지
- 타임아웃 처리 및 사용자 알림

## 7. 예상 효과

### 7.1 사용자 경험 향상
- 직관적인 도구 탐색 및 실행
- 서버 상태를 한눈에 파악
- 빠른 도구 실행으로 생산성 향상

### 7.2 비즈니스 가치
- 도구 사용 패턴 분석을 통한 인사이트
- 유료 전환을 위한 기능 차별화
- 확장 가능한 플랫폼 구조

### 7.3 기술적 이점
- 모듈화된 구조로 유지보수 용이
- 확장 가능한 API 설계
- 성능 최적화를 위한 기반 마련

## 8. 결론

서버 상세 페이지는 MCP Orch의 핵심 사용자 경험을 제공하는 중요한 기능입니다. 
단순히 도구 목록을 보여주는 것을 넘어, 서버 관리와 도구 실행을 통합한 
강력한 인터페이스를 제공함으로써 사용자의 생산성을 크게 향상시킬 수 있습니다.

또한 향후 SaaS 전환 시 유료 기능으로 확장할 수 있는 기반을 마련하여,
지속 가능한 비즈니스 모델을 구축할 수 있습니다.

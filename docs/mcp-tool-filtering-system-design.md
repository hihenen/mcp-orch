# MCP Tool Filtering System - 웹 UI 기반 툴 사용함/사용안함 제어 설계서

## 1. 개요

### 1.1 목적
mcp-orch에서 MCP 서버들을 SSE 방식으로 연결할 때, 웹 UI에서 개별 툴의 사용함/사용안함을 제어하여 SSE 클라이언트에게 전달되는 툴 목록을 동적으로 필터링하는 시스템을 설계합니다.

### 1.2 기술적 가능성 분석 결과
✅ **기술적으로 완전히 구현 가능함**

현재 mcp-orch 아키텍처에서 다음과 같은 기반 시스템들이 이미 구축되어 있음:
- Unified MCP Transport 시스템
- SSE 기반 MCP 클라이언트 통신
- 웹 UI 툴 관리 페이지
- 데이터베이스 기반 설정 관리

## 2. 현재 시스템 분석

### 2.1 MCP SSE 연결 구조
```
MCP Client (Cline/Cursor/Inspector)
    ↓ SSE Connection
Unified MCP Transport (/projects/{id}/unified/sse)
    ↓ handle_tools_list()
Multiple MCP Servers (individual tools collection)
    ↓ Combined Tool List  
SSE Response to Client
```

### 2.2 핵심 컴포넌트 분석

#### 2.2.1 툴 리스트 생성 (백엔드)
**파일**: `src/mcp_orch/api/unified_mcp_transport.py`
**메서드**: `handle_tools_list()` (라인 687-818)

```python
# 현재 구현 로직
for server in active_servers:
    tools = await mcp_connection_service.get_server_tools(str(server.id), server_config)
    for tool in tools:
        # 네임스페이스 적용
        processed_tool = tool.copy()
        if legacy_mode:
            pass  # 원본 도구명 그대로 사용
        else:
            processed_tool['name'] = create_namespaced_name(namespace_name, tool['name'])
        
        all_tools.append(processed_tool)
```

#### 2.2.2 웹 UI 툴 관리
**파일**: `web/src/app/projects/[projectId]/tools/page.tsx`
- 현재 프로젝트의 모든 툴을 표시
- 서버별 필터링 기능 존재
- 개별 툴 실행 기능 제공

**파일**: `web/src/stores/projectStore.ts`
**메서드**: `loadProjectTools()` (라인 603-659)
- `/api/projects/${projectId}/servers/${server.id}/tools` API 호출
- 모든 활성 서버의 툴을 수집하여 `projectTools` 상태로 관리

#### 2.2.3 데이터베이스 구조
**테이블**: `mcp_servers`
- 서버별 활성화/비활성화 (`is_enabled`)
- 서버 설정 및 메타데이터

## 3. 제안하는 툴 필터링 시스템 설계

### 3.1 시스템 아키텍처

```
[웹 UI] 툴 사용함/사용안함 설정
    ↓ API 호출
[Backend] 툴 설정 저장 (새 테이블: tool_preferences)
    ↓ 설정 참조 (공통 ToolFilteringService)
[Unified MCP Transport] ───┐
                          ├─── handle_tools_list() 필터링 로직
[Individual MCP Transport] ─┘
    ↓ 필터링된 툴 목록
[SSE Client] 허용된 툴만 수신
```

**✨ 핵심 특징**: Unified MCP Transport와 개별 MCP Transport 모두에 동일한 필터링 시스템 적용

### 3.2 데이터베이스 설계

#### 3.2.1 새 테이블: `tool_preferences`
```sql
CREATE TABLE tool_preferences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    server_id UUID NOT NULL REFERENCES mcp_servers(id) ON DELETE CASCADE,
    tool_name VARCHAR(255) NOT NULL,
    is_enabled BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(project_id, server_id, tool_name)
);

CREATE INDEX idx_tool_preferences_project_server 
ON tool_preferences(project_id, server_id);
```

#### 3.2.2 모델 클래스 추가
```python
# src/mcp_orch/models/tool_preference.py
from sqlalchemy import Column, String, Boolean, ForeignKey, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID
from .base import BaseModel

class ToolPreference(BaseModel):
    __tablename__ = "tool_preferences"
    
    project_id = Column(UUID(as_uuid=True), ForeignKey("projects.id"), nullable=False)
    server_id = Column(UUID(as_uuid=True), ForeignKey("mcp_servers.id"), nullable=False)
    tool_name = Column(String(255), nullable=False)
    is_enabled = Column(Boolean, nullable=False, default=True)
    
    __table_args__ = (
        UniqueConstraint('project_id', 'server_id', 'tool_name'),
    )
```

### 3.3 공통 툴 필터링 서비스 설계

#### 3.3.1 ToolFilteringService 구현
```python
# 새 파일: src/mcp_orch/services/tool_filtering_service.py

import logging
from typing import List, Dict, Any
from uuid import UUID
from sqlalchemy.orm import Session
from sqlalchemy import and_

from ..models.tool_preference import ToolPreference

logger = logging.getLogger(__name__)

class ToolFilteringService:
    """공통 툴 필터링 서비스 - Unified/Individual MCP Transport 모두 사용"""
    
    @staticmethod
    async def filter_tools_by_preferences(
        project_id: UUID,
        server_id: UUID,
        tools: List[Dict],
        db: Session
    ) -> List[Dict]:
        """
        프로젝트 툴 설정에 따라 툴 목록 필터링
        
        Args:
            project_id: 프로젝트 ID
            server_id: MCP 서버 ID
            tools: 원본 툴 목록
            db: 데이터베이스 세션
            
        Returns:
            필터링된 툴 목록
        """
        try:
            # 툴 설정 조회 (배치 쿼리)
            tool_preferences = db.query(ToolPreference).filter(
                and_(
                    ToolPreference.project_id == project_id,
                    ToolPreference.server_id == server_id
                )
            ).all()
            
            # 빠른 조회를 위한 설정 맵 생성
            preference_map = {
                pref.tool_name: pref.is_enabled
                for pref in tool_preferences
            }
            
            # 필터링 적용
            filtered_tools = []
            filtered_count = 0
            
            for tool in tools:
                tool_name = tool.get('name', '')
                is_enabled = preference_map.get(tool_name, True)  # 기본값: 사용함
                
                if is_enabled:
                    filtered_tools.append(tool)
                else:
                    filtered_count += 1
                    logger.debug(f"🚫 Tool filtered: {tool_name} from server {server_id}")
            
            # 필터링 통계 로깅
            if filtered_count > 0:
                logger.info(f"🎯 Filtered {filtered_count}/{len(tools)} tools for server {server_id}")
            
            return filtered_tools
            
        except Exception as e:
            logger.error(f"❌ Error filtering tools for server {server_id}: {e}")
            # 에러 시 원본 툴 목록 반환 (안전장치)
            return tools
    
    @staticmethod
    async def get_project_tool_preferences(
        project_id: UUID,
        db: Session
    ) -> Dict[str, Dict[str, bool]]:
        """
        프로젝트의 전체 툴 설정 조회 (캐싱용)
        
        Returns:
            {server_id: {tool_name: is_enabled}}
        """
        try:
            preferences = db.query(ToolPreference).filter(
                ToolPreference.project_id == project_id
            ).all()
            
            result = {}
            for pref in preferences:
                server_key = str(pref.server_id)
                if server_key not in result:
                    result[server_key] = {}
                result[server_key][pref.tool_name] = pref.is_enabled
            
            return result
            
        except Exception as e:
            logger.error(f"❌ Error loading project tool preferences: {e}")
            return {}
```

### 3.4 백엔드 API 설계

#### 3.4.1 툴 설정 관리 API
```python
# 새 파일: src/mcp_orch/api/tool_preferences.py

@router.get("/projects/{project_id}/tool-preferences")
async def get_tool_preferences(project_id: UUID, current_user: User = Depends(...)):
    """프로젝트의 툴 사용 설정 조회"""
    
@router.put("/projects/{project_id}/tool-preferences")  
async def update_tool_preferences(
    project_id: UUID, 
    preferences: List[ToolPreferenceUpdate],
    current_user: User = Depends(...)
):
    """툴 사용 설정 일괄 업데이트"""

class ToolPreferenceUpdate(BaseModel):
    server_id: UUID
    tool_name: str
    is_enabled: bool
```

#### 3.4.2 Unified MCP Transport 적용
```python
# src/mcp_orch/api/unified_mcp_transport.py
# handle_tools_list() 메서드 내 필터링 로직 추가

async def handle_tools_list(self, message: Dict[str, Any]) -> JSONResponse:
    """모든 활성 서버의 툴을 네임스페이스와 함께 반환 (필터링 적용)"""
    all_tools = []
    failed_servers = []
    active_servers = [s for s in self.project_servers if s.is_enabled]
    
    # DB 세션 가져오기
    from ..database import SessionLocal
    db = SessionLocal()
    
    try:
        logger.info(f"📋 Listing unified tools from {len(active_servers)} servers with filtering")
        
        # 각 서버에서 툴 수집 및 필터링
        for server in active_servers:
            try:
                # 서버에서 툴 목록 가져오기
                server_config = self._build_server_config_for_server(server)
                if not server_config:
                    failed_servers.append(server.name)
                    continue
                
                tools = await mcp_connection_service.get_server_tools(
                    str(server.id), server_config
                )
                
                if tools is None:
                    failed_servers.append(server.name)
                    continue
                
                # 🆕 툴 필터링 적용
                from ..services.tool_filtering_service import ToolFilteringService
                filtered_tools = await ToolFilteringService.filter_tools_by_preferences(
                    project_id=self.project_id,
                    server_id=server.id,
                    tools=tools,
                    db=db
                )
                
                # 네임스페이스 적용 (필터링된 툴만)
                namespace_name = self.namespace_registry.get_original_name(server.name)
                if not namespace_name:
                    namespace_name = self.namespace_registry.register_server(server.name)
                
                for tool in filtered_tools:
                    try:
                        processed_tool = tool.copy()
                        
                        # MCP 표준 스키마 필드명 통일
                        if 'schema' in processed_tool and 'inputSchema' not in processed_tool:
                            processed_tool['inputSchema'] = processed_tool.pop('schema')
                        
                        if not legacy_mode:
                            # 네임스페이스 적용
                            processed_tool['name'] = create_namespaced_name(
                                namespace_name, tool['name']
                            )
                            processed_tool['_source_server'] = server.name
                            processed_tool['_original_name'] = tool['name']
                            processed_tool['_namespace'] = namespace_name
                        
                        all_tools.append(processed_tool)
                        
                    except Exception as e:
                        logger.error(f"Error processing tool {tool.get('name', 'unknown')}: {e}")
                
                # 서버 성공 기록
                self._record_server_success(server.name, len(filtered_tools))
                logger.info(f"✅ Collected {len(filtered_tools)}/{len(tools)} tools from {server.name} (after filtering)")
                
            except Exception as e:
                logger.error(f"❌ Failed to get tools from server {server.name}: {e}")
                self._record_server_failure(server.name, e)
                failed_servers.append(server.name)
        
        # 응답 구성
        response_data = {
            "jsonrpc": "2.0",
            "id": message.get("id"),
            "result": {
                "tools": all_tools
            }
        }
        
        # 메타 정보 추가 (필터링 통계 포함)
        if not legacy_mode:
            response_data["result"]["_meta"] = {
                "total_servers": len(self.project_servers),
                "active_servers": len(active_servers),
                "successful_servers": len(active_servers) - len(failed_servers),
                "failed_servers": failed_servers,
                "total_tools": len(all_tools),
                "filtering_applied": True
            }
        
        # SSE를 통해 응답 전송
        await self.message_queue.put(response_data)
        
        logger.info(f"📋 Unified tools list complete: {len(all_tools)} tools (filtered)")
        return JSONResponse(content={"status": "processing"}, status_code=202)
        
    finally:
        db.close()
```

#### 3.6.1 개별 MCP Transport 적용
```python
# src/mcp_orch/api/mcp_sse_transport.py
# handle_tools_list() 메서드 내 필터링 로직 추가

async def handle_tools_list(self, message: Dict[str, Any]) -> JSONResponse:
    """개별 서버의 툴 목록 반환 (필터링 적용)"""
    try:
        request_id = message.get("id")
        
        # 서버 설정 구성
        server_config = self._build_server_config()
        if not server_config:
            raise ValueError("Server configuration not available")
        
        # 서버에서 툴 목록 가져오기
        tools = await mcp_connection_service.get_server_tools(
            str(self.server.id), server_config
        )
        
        if tools is None:
            tools = []
        
        # DB 세션 가져오기
        from ..database import SessionLocal
        db = SessionLocal()
        
        try:
            # 🆕 툴 필터링 적용
            from ..services.tool_filtering_service import ToolFilteringService
            filtered_tools = await ToolFilteringService.filter_tools_by_preferences(
                project_id=self.project_id,
                server_id=self.server.id,
                tools=tools,
                db=db
            )
            
            logger.info(f"📋 Individual server tools: {len(filtered_tools)}/{len(tools)} tools (after filtering)")
            
        finally:
            db.close()
        
        # 응답 구성
        response_data = {
            "jsonrpc": "2.0",
            "id": request_id,
            "result": {
                "tools": filtered_tools
            }
        }
        
        return JSONResponse(content=response_data)
        
    except Exception as e:
        logger.error(f"❌ Individual tools list error: {e}")
        
        error_response = {
            "jsonrpc": "2.0",
            "id": message.get("id"),
            "error": {
                "code": -32000,
                "message": f"Tools list failed: {str(e)}"
            }
        }
        return JSONResponse(content=error_response)
```

### 3.4 데이터 플로우 및 동작 방식

#### 3.4.1 Unified MCP Transport vs Individual MCP Transport 비교

**공통 ToolFilteringService 사용**:
```python
# 두 Transport 모두 동일한 서비스 사용
from ..services.tool_filtering_service import ToolFilteringService

# Unified MCP Transport에서
filtered_tools = await ToolFilteringService.filter_tools_by_preferences(
    project_id=self.project_id,
    server_id=server.id,
    tools=tools,
    db=db
)

# Individual MCP Transport에서
filtered_tools = await ToolFilteringService.filter_tools_by_preferences(
    project_id=self.project_id,
    server_id=self.server.id,
    tools=tools,
    db=db
)
```

**동작 방식 차이점**:

| 구분 | Unified MCP Transport | Individual MCP Transport |
|------|----------------------|-------------------------|
| 엔드포인트 | `/projects/{id}/unified/sse` | `/projects/{id}/servers/{server_id}/sse` |
| 처리 범위 | 프로젝트 내 모든 활성 서버 | 특정 서버 하나만 |
| 필터링 적용 | 서버별 개별 필터링 후 통합 | 해당 서버 툴만 필터링 |
| 네임스페이스 | 서버명 기반 네임스페이스 적용 | 원본 툴명 그대로 사용 |
| DB 세션 관리 | 단일 세션으로 모든 서버 처리 | 서버별 독립 세션 |

#### 3.4.2 DB 세션 관리 패턴

**Unified Transport 패턴**:
```python
# 단일 DB 세션으로 모든 서버 처리
from ..database import SessionLocal
db = SessionLocal()

try:
    for server in active_servers:
        # 같은 DB 세션 재사용
        filtered_tools = await ToolFilteringService.filter_tools_by_preferences(
            project_id=self.project_id,
            server_id=server.id,
            tools=tools,
            db=db  # 동일한 세션 사용
        )
finally:
    db.close()
```

**Individual Transport 패턴**:
```python
# 서버별 독립 DB 세션
from ..database import SessionLocal
db = SessionLocal()

try:
    # 단일 서버만 처리
    filtered_tools = await ToolFilteringService.filter_tools_by_preferences(
        project_id=self.project_id,
        server_id=self.server.id,
        tools=tools,
        db=db
    )
finally:
    db.close()
```

#### 3.4.3 일관성 보장 메커니즘

**설정 동기화**:
- 두 Transport 모두 동일한 `tool_preferences` 테이블 참조
- 실시간 설정 변경 시 양쪽 모두 즉시 반영
- 캐싱 전략도 공통 적용

**에러 처리 일관성**:
```python
# 공통 에러 처리 패턴
try:
    filtered_tools = await ToolFilteringService.filter_tools_by_preferences(...)
except Exception as e:
    logger.error(f"❌ Error filtering tools: {e}")
    # 안전장치: 원본 툴 목록 반환
    return original_tools
```

### 3.5 웹 UI 설계

#### 3.4.1 툴 설정 페이지 개선
**파일**: `web/src/app/projects/[projectId]/tools/page.tsx`

추가할 기능:
1. 각 툴별 사용함/사용안함 토글 스위치
2. 일괄 설정 변경 기능
3. 서버별 전체 활성화/비활성화
4. 설정 변경 사항 자동 저장

```tsx
// 추가할 컴포넌트 예시
const ToolToggleSwitch = ({ tool, isEnabled, onToggle }) => (
  <Switch
    checked={isEnabled}
    onCheckedChange={(enabled) => onToggle(tool.serverId, tool.name, enabled)}
    className="ml-auto"
  />
);

// 툴 목록 렌더링 부분 수정
{tools.map((tool) => (
  <div key={`${tool.serverId}-${tool.name}`} className="flex items-center justify-between p-4">
    <div className="flex-1">
      <h4 className="font-medium">{tool.name}</h4>
      <p className="text-sm text-muted-foreground">{tool.description}</p>
    </div>
    <div className="flex items-center gap-2">
      <ToolToggleSwitch
        tool={tool}
        isEnabled={toolPreferences[`${tool.serverId}:${tool.name}`] ?? true}
        onToggle={handleToolToggle}
      />
      <Button variant="outline" size="sm" onClick={() => handleExecuteTool(tool)}>
        <Play className="h-4 w-4 mr-1" />
        Execute
      </Button>
    </div>
  </div>
))}
```

#### 3.4.2 상태 관리 확장
**파일**: `web/src/stores/projectStore.ts`

```typescript
interface ProjectStore {
  // 기존 상태...
  toolPreferences: Record<string, boolean>; // "serverId:toolName" -> boolean
  
  // 새 메서드들
  loadToolPreferences: (projectId: string) => Promise<void>;
  updateToolPreference: (projectId: string, serverId: string, toolName: string, enabled: boolean) => Promise<void>;
  updateToolPreferences: (projectId: string, preferences: ToolPreferenceUpdate[]) => Promise<void>;
}
```

### 3.7 API 라우트 추가
**새 파일**: `web/src/app/api/projects/[projectId]/tool-preferences/route.ts`

```typescript
export const GET = auth(async function GET(req) {
  // JWT 토큰 확인 후 백엔드 API 호출
  const response = await fetch(`${BACKEND_URL}/api/projects/${projectId}/tool-preferences`, {
    headers: { 'Authorization': `Bearer ${jwtToken}` }
  });
  return NextResponse.json(await response.json());
});

export const PUT = auth(async function PUT(req) {
  const body = await req.json();
  const response = await fetch(`${BACKEND_URL}/api/projects/${projectId}/tool-preferences`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${jwtToken}`
    },
    body: JSON.stringify(body)
  });
  return NextResponse.json(await response.json());
});
```

## 4. 구현 단계별 계획

### Phase 1: 데이터베이스 및 백엔드 API
1. ✅ ToolPreference 모델 생성 및 마이그레이션
2. ✅ tool_preferences API 엔드포인트 구현
3. ✅ Unified MCP Transport 필터링 로직 추가

### Phase 2: 웹 UI 구현
1. ✅ 툴 설정 상태 관리 확장
2. ✅ 툴 페이지에 토글 스위치 추가
3. ✅ API 연동 및 실시간 업데이트

### Phase 3: 통합 테스트 및 최적화
1. ✅ SSE 클라이언트 연동 테스트
2. ✅ 성능 최적화 (캐싱 등)
3. ✅ 에러 처리 및 사용자 피드백

## 5. 영향도 및 위험도 분석

### 5.1 기술적 영향도: **중간**

#### 긍정적 영향
- ✅ 기존 시스템과 완전 호환
- ✅ Unified MCP Transport 활용으로 구현 복잡도 낮음
- ✅ 점진적 구현 가능 (기존 기능 유지)

#### 주의사항
- ⚠️ handle_tools_list() 메서드 성능 영향 (DB 조회 추가)
- ⚠️ 툴 설정 캐싱 전략 필요
- ⚠️ 대량 툴 환경에서의 UI 성능

### 5.2 기술적 위험도: **낮음**

#### 위험 요소
1. **성능 저하**: 툴 목록 조회 시 추가 DB 쿼리
   - **해결방안**: Redis 캐싱, 배치 쿼리 최적화

2. **메모리 사용량 증가**: 툴 설정 캐시
   - **해결방안**: LRU 캐시, 프로젝트별 캐시 분리

3. **동시성 이슈**: 여러 사용자가 동시에 설정 변경
   - **해결방안**: 낙관적 잠금, 마지막 업데이트 승리

#### 완화 전략
```python
# 성능 최적화 예시: 캐싱 레이어
class ToolPreferenceCache:
    def __init__(self):
        self._cache = {}
        self._last_updated = {}
    
    async def get_preferences(self, project_id: UUID) -> Dict[str, bool]:
        cache_key = str(project_id)
        
        # 캐시 유효성 검사 (30초)
        if (cache_key in self._cache and 
            time.time() - self._last_updated.get(cache_key, 0) < 30):
            return self._cache[cache_key]
        
        # DB에서 최신 데이터 조회
        preferences = await self._load_from_db(project_id)
        self._cache[cache_key] = preferences
        self._last_updated[cache_key] = time.time()
        
        return preferences
```

### 5.3 사용자 경험 영향: **매우 긍정적**

#### 기대 효과
- 🎯 **정밀한 툴 제어**: 필요한 툴만 노출하여 UI 깔끔함
- 🚀 **개발 효율성 증대**: 불필요한 툴 숨김으로 집중도 향상
- 🔧 **프로젝트별 맞춤화**: 프로젝트 성격에 맞는 툴 세트 구성
- 📊 **관리 편의성**: 웹 UI에서 직관적인 설정 관리

## 6. 구현 상세 설계

### 6.1 데이터 플로우

```
1. 웹 UI에서 툴 사용함/사용안함 설정
   ↓
2. PUT /api/projects/{id}/tool-preferences
   ↓  
3. 백엔드에서 tool_preferences 테이블 업데이트
   ↓
4. MCP 클라이언트가 tools/list 요청 (SSE)
   ↓
5. handle_tools_list()에서 tool_preferences 조회
   ↓
6. 설정에 따라 툴 목록 필터링
   ↓
7. 필터링된 툴 목록을 SSE로 클라이언트에 전달
```

### 6.2 캐싱 전략

```python
# Redis 기반 캐싱 (선택적)
class ToolPreferenceService:
    def __init__(self, redis_client=None):
        self.redis = redis_client
        self.cache_ttl = 300  # 5분
    
    async def get_project_tool_preferences(self, project_id: UUID) -> Dict[str, bool]:
        cache_key = f"tool_prefs:{project_id}"
        
        # Redis 캐시 확인
        if self.redis:
            cached = await self.redis.get(cache_key)
            if cached:
                return json.loads(cached)
        
        # DB에서 조회
        preferences = self._load_from_database(project_id)
        
        # 캐시에 저장
        if self.redis:
            await self.redis.setex(
                cache_key, 
                self.cache_ttl, 
                json.dumps(preferences)
            )
        
        return preferences
```

### 6.3 UI/UX 개선 사항

#### 6.3.1 필터링 상태 표시
```tsx
// 툴 개수 표시 개선
<div className="flex items-center gap-4">
  <Badge variant="outline">
    전체: {totalTools}개
  </Badge>
  <Badge variant="secondary">
    활성: {enabledTools}개
  </Badge>
  <Badge variant="destructive">
    비활성: {disabledTools}개
  </Badge>
</div>
```

#### 6.3.2 일괄 설정 기능
```tsx
<div className="flex gap-2">
  <Button 
    variant="outline" 
    size="sm"
    onClick={() => setAllToolsEnabled(true)}
  >
    전체 활성화
  </Button>
  <Button 
    variant="outline" 
    size="sm"
    onClick={() => setAllToolsEnabled(false)}
  >
    전체 비활성화
  </Button>
  <Button 
    variant="outline" 
    size="sm" 
    onClick={() => resetToDefaults()}
  >
    기본값 복원
  </Button>
</div>
```

## 7. 모니터링 및 로깅

### 7.1 필터링 로그
```python
# unified_mcp_transport.py에서 필터링 통계 로깅
logger.info(f"🎯 Tool filtering complete for project {self.project_id}")
logger.info(f"   Total tools collected: {total_tools}")
logger.info(f"   Filtered out: {filtered_out_count}")
logger.info(f"   Sent to client: {len(all_tools)}")
logger.info(f"   Filtering rules applied: {len(preference_map)}")
```

### 7.2 성능 메트릭
```python
# 성능 측정
start_time = time.time()
# ... 필터링 로직 ...
filtering_time = time.time() - start_time

logger.info(f"⏱️ Tool filtering performance: {filtering_time:.3f}s for {len(active_servers)} servers")

if filtering_time > 1.0:  # 1초 이상이면 경고
    logger.warning(f"⚠️ Slow tool filtering detected: {filtering_time:.3f}s")
```

## 8. 결론

### 8.1 기술적 실현 가능성: **100%**
현재 mcp-orch 아키텍처에서 완벽하게 구현 가능한 기능입니다.

### 8.2 구현 복잡도: **중간**
기존 시스템을 크게 변경하지 않고 점진적으로 추가할 수 있는 수준입니다.

### 8.3 예상 개발 기간
- **Phase 1** (백엔드): 2-3일
- **Phase 2** (웹 UI): 2-3일  
- **Phase 3** (테스트/최적화): 1-2일
- **총 예상 기간**: 5-8일

### 8.4 권장사항
1. **점진적 구현**: 기본 기능부터 시작하여 단계별로 고도화
2. **성능 모니터링**: 초기부터 성능 메트릭 수집 체계 구축
3. **사용자 피드백**: 베타 사용자 그룹을 통한 UI/UX 검증
4. **캐싱 전략**: 트래픽 증가에 대비한 캐싱 시스템 사전 준비

이 설계서를 바탕으로 구현하면 mcp-orch 사용자들이 더욱 정밀하고 효율적으로 MCP 툴을 관리할 수 있게 될 것입니다.
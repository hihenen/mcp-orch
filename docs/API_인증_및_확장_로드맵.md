# MCP Orch API 인증 및 확장 로드맵

## 현재 상황 분석

### ✅ 해결된 문제
- Dashboard API 401 인증 오류 해결
- 환경변수 기반 API URL/Token 관리
- 시스템 관리자용 통합 토큰 (`test1234`) 사용

### 현재 아키텍처
```
Frontend (Next.js) 
  ↓ Bearer test1234
Backend API (FastAPI)
  ↓ 직접 연결
MCP Servers (brave-search, excel-mcp-server)
```

## 점진적 확장 로드맵

### Phase 1: 현재 시스템 안정화 (1-2주)

**목표**: 현재 시스템을 안정적으로 운영

**작업 항목**:
1. **API 클라이언트 모듈화**
   ```typescript
   // src/lib/api-client.ts
   class MCPApiClient {
     private baseURL: string;
     private token: string;
     
     async getServers() { ... }
     async getTools() { ... }
     // 모든 API 호출을 중앙화
   }
   ```

2. **오류 처리 개선**
   - API 실패 시 사용자 친화적 메시지
   - Retry 로직 구현
   - 로딩 상태 관리

3. **테스트 추가**
   - API 클라이언트 단위 테스트
   - E2E 테스트 (Dashboard, Servers 페이지)

**현실성**: ⭐⭐⭐⭐⭐ (매우 높음)

### Phase 2: 사용자 인증 시스템 (2-3주)

**목표**: NextAuth 기반 사용자 로그인 구현

**작업 항목**:
1. **NextAuth 설정 완료**
   - Google/GitHub OAuth 활성화
   - 세션 관리
   - 보호된 라우트 구현

2. **백엔드 JWT 인증**
   ```python
   # 백엔드에서 NextAuth JWT 토큰 검증
   @app.middleware("http")
   async def verify_jwt_token(request: Request, call_next):
       # NextAuth JWT 토큰 검증 로직
   ```

3. **사용자별 데이터 분리**
   - 사용자 ID 기반 데이터 필터링
   - 기본 권한 설정

**현실성**: ⭐⭐⭐⭐ (높음)

### Phase 3: 조직/팀 기능 (3-4주)

**목표**: 팀별 MCP 서버 관리

**데이터베이스 스키마**:
```sql
-- 조직 테이블
CREATE TABLE organizations (
  id UUID PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- 사용자-조직 관계
CREATE TABLE user_organizations (
  user_id UUID REFERENCES users(id),
  organization_id UUID REFERENCES organizations(id),
  role VARCHAR(50) DEFAULT 'member', -- admin, member
  PRIMARY KEY (user_id, organization_id)
);

-- MCP 서버 (조직별)
CREATE TABLE mcp_servers (
  id UUID PRIMARY KEY,
  organization_id UUID REFERENCES organizations(id),
  name VARCHAR(255) NOT NULL,
  config JSONB NOT NULL,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW()
);
```

**API 변경**:
```python
# 조직별 서버 목록
GET /api/organizations/{org_id}/servers
# 조직별 서버 추가
POST /api/organizations/{org_id}/servers
```

**현실성**: ⭐⭐⭐ (보통) - 데이터베이스 설계 복잡성

### Phase 4: 사용자별 API 키 관리 (4-5주)

**목표**: 사용자별 API 키 발급 및 Cline 설정 자동화

**작업 항목**:
1. **API 키 관리 시스템**
   ```python
   # API 키 생성/관리
   class APIKeyManager:
       def generate_user_api_key(user_id: str) -> str
       def validate_api_key(api_key: str) -> User
       def revoke_api_key(api_key: str) -> bool
   ```

2. **Cline 설정 생성기**
   ```typescript
   // 사용자별 Cline MCP 설정 자동 생성
   function generateClineConfig(userId: string) {
     return {
       "excel-proxy-test": {
         "disabled": false,
         "timeout": 30,
         "url": `${API_URL}/servers/excel-mcp-server/sse`,
         "transportType": "sse",
         "headers": {
           "Authorization": `Bearer ${userApiKey}`
         }
       }
     };
   }
   ```

3. **권한 기반 서버 접근 제어**
   - 사용자별 접근 가능한 MCP 서버 제한
   - 팀별 서버 공유 설정

**현실성**: ⭐⭐ (낮음) - 복잡한 권한 관리 시스템

## 권장 접근 방식

### 즉시 구현 (현재 ~ 2주)
```typescript
// 1. API 클라이언트 모듈화
export class MCPApiClient {
  constructor(private config: {
    baseURL: string;
    token: string;
  }) {}
  
  private async request<T>(
    endpoint: string, 
    options?: RequestInit
  ): Promise<T> {
    const response = await fetch(`${this.config.baseURL}${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.config.token}`,
        ...options?.headers
      }
    });
    
    if (!response.ok) {
      throw new ApiError(`API Error: ${response.status}`);
    }
    
    return response.json();
  }
  
  async getServers() { return this.request<MCPServer[]>('/servers'); }
  async getTools() { return this.request<Tool[]>('/tools'); }
}
```

### 단계별 구현 (2-12주)
1. **Phase 1**: 현재 시스템 안정화 ✅
2. **Phase 2**: 사용자 인증 (이미 기반 코드 존재)
3. **Phase 3**: 조직 기능 (선택적)
4. **Phase 4**: 사용자별 API 키 (선택적)

## 결론 및 권장사항

### 현실적인 접근
1. **현재 시스템으로 충분한 경우**: Phase 1만 구현
2. **팀 사용이 필요한 경우**: Phase 2까지 구현
3. **대규모 조직 사용**: Phase 3까지 구현
4. **완전한 멀티테넌트**: Phase 4까지 구현

### 우선순위
1. 🔥 **High**: API 클라이언트 모듈화, 오류 처리
2. 🔶 **Medium**: NextAuth 기반 사용자 인증
3. 🔵 **Low**: 조직/팀 기능
4. ⚪ **Optional**: 사용자별 API 키

현재 상황에서는 **Phase 1-2**까지 구현하는 것이 가장 현실적이며, 실제 사용 패턴을 보고 추가 기능을 결정하는 것을 권장합니다.

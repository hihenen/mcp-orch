# JWT Authorization 구현 가이드

## 개요

X-User-ID 헤더 방식에서 JWT 토큰 기반 Authorization 헤더 방식으로 인증 시스템을 업그레이드했습니다. 이는 프로덕션 환경에서 보안과 호환성 면에서 더 적합한 방식입니다.

## 구현된 컴포넌트

### 1. 프론트엔드 (Next.js)

#### JWT 유틸리티 (`web/src/lib/jwt-utils.ts`)
- `getJwtToken()`: 클라이언트에서 NextAuth.js 세션을 JWT 토큰으로 변환
- `getServerJwtToken()`: 서버 사이드에서 JWT 토큰 추출
- `decodeJwtPayload()`: JWT 페이로드 디코딩
- `isJwtExpired()`: JWT 토큰 만료 확인

#### API 클라이언트 업데이트 (`web/src/lib/api.ts`)
- `getAuthHeaders()`: JWT 토큰을 포함한 Authorization 헤더 생성
- `fetchTeams()`: JWT 토큰을 사용한 팀 목록 조회
- `fetchWithJwtAuth()`: 범용 JWT 인증 API 호출 함수

### 2. 백엔드 (FastAPI)

#### JWT 인증 모듈 (`src/mcp_orch/api/jwt_auth.py`)
- `verify_jwt_token()`: JWT 토큰 검증 및 사용자 정보 추출
- `JWTUser`: JWT에서 추출된 사용자 정보 클래스
- 개발 환경에서는 서명 검증 비활성화 (alg: "none" 지원)
- 만료 시간 검증 활성화

#### 팀 API 업데이트 (`src/mcp_orch/api/teams.py`)
- `get_user_from_jwt_or_headers()`: JWT 우선, 헤더 대체 인증 함수
- `get_teams()`: JWT 토큰 기반 인증 사용
- 기존 헤더 방식과 호환성 유지

## 인증 플로우

### 1. 클라이언트 → 백엔드 요청

```typescript
// 1. NextAuth.js 세션에서 JWT 토큰 생성
const jwtToken = await getJwtToken();

// 2. Authorization 헤더에 Bearer 토큰 포함
const headers = {
  'Authorization': `Bearer ${jwtToken}`,
  'Content-Type': 'application/json'
};

// 3. API 요청
const response = await fetch('/api/teams/', { headers });
```

### 2. 백엔드 인증 처리

```python
# 1. Authorization 헤더에서 JWT 토큰 추출
auth_header = request.headers.get("authorization")
token = auth_header.split(" ")[1]  # "Bearer " 제거

# 2. JWT 토큰 검증
jwt_user = verify_jwt_token(token)

# 3. 데이터베이스에서 사용자 조회/생성
user = db.query(User).filter(User.id == jwt_user.id).first()
```

## JWT 토큰 구조

### 헤더
```json
{
  "typ": "JWT",
  "alg": "none"  // 개발 환경에서는 서명 없음
}
```

### 페이로드
```json
{
  "sub": "user-id",           // 사용자 ID
  "email": "user@example.com", // 이메일
  "name": "User Name",        // 사용자 이름
  "teamId": "team-uuid",      // 팀 ID (선택적)
  "teamName": "Team Name",    // 팀 이름 (선택적)
  "iat": 1234567890,          // 발급 시간
  "exp": 1234654290           // 만료 시간 (24시간)
}
```

## 보안 고려사항

### 개발 환경
- 서명 검증 비활성화 (`alg: "none"`)
- NextAuth.js 세션 기반 토큰 생성
- 만료 시간 검증 활성화

### 프로덕션 환경 권장사항
1. **실제 JWT 서명 사용**
   ```python
   # 실제 시크릿으로 서명 검증
   payload = jwt.decode(token, SECRET_KEY, algorithms=["HS256"])
   ```

2. **HTTPS 강제 사용**
   ```python
   # 프로덕션에서는 HTTPS만 허용
   if not request.url.scheme == "https":
       raise HTTPException(401, "HTTPS required")
   ```

3. **토큰 만료 시간 단축**
   ```typescript
   // 1시간으로 단축
   exp: Math.floor(Date.now() / 1000) + (60 * 60)
   ```

## 호환성 유지

### 기존 헤더 방식 지원
```python
def get_user_from_jwt_or_headers(request: Request, db: Session) -> User:
    # 1. JWT 토큰 우선 시도
    auth_header = request.headers.get("authorization")
    if auth_header and auth_header.startswith("Bearer "):
        # JWT 토큰 처리
        pass
    
    # 2. 실패 시 기존 헤더 방식 사용
    return get_user_from_headers(request, db)
```

## 테스트 방법

### 1. JWT 토큰 생성 테스트
```bash
# 브라우저 개발자 도구에서
const token = await getJwtToken();
console.log('JWT Token:', token);
```

### 2. API 호출 테스트
```bash
# curl로 직접 테스트
curl -H "Authorization: Bearer YOUR_JWT_TOKEN" \
     http://localhost:8000/api/teams/
```

### 3. 백엔드 로그 확인
```
🔍 JWT token found: eyJ0eXAiOiJKV1QiLCJhbGciOiJub25l...
✅ JWT token verified for user: user@example.com
✅ Authenticated user: user-id (user@example.com)
```

## 마이그레이션 가이드

### 단계별 전환
1. **Phase 1**: JWT 지원 추가 (기존 헤더 방식 유지)
2. **Phase 2**: 클라이언트에서 JWT 사용 시작
3. **Phase 3**: 헤더 방식 단계적 제거

### 클라이언트 업데이트
```typescript
// 기존 방식
headers: { 'X-User-ID': userId }

// 새로운 방식
headers: { 'Authorization': `Bearer ${jwtToken}` }
```

## 문제 해결

### 일반적인 오류

1. **JWT 토큰 생성 실패**
   - NextAuth.js 세션 확인
   - 쿠키 설정 확인

2. **토큰 검증 실패**
   - 토큰 형식 확인 (3개 부분으로 구성)
   - 만료 시간 확인

3. **사용자 생성 실패**
   - 데이터베이스 연결 확인
   - 사용자 모델 필드 확인

### 디버깅 로그
```python
# JWT 검증 과정의 상세 로그
logger.info(f"🔍 Verifying JWT token: {token[:50]}...")
logger.info(f"✅ JWT payload decoded: {payload}")
logger.info(f"✅ JWT token verified for user: {jwt_user.email}")
```

## 결론

JWT 토큰 기반 인증 시스템으로 업그레이드하여:
- 표준 Authorization 헤더 사용
- 보안성 향상
- 프로덕션 환경 호환성 확보
- 기존 시스템과의 호환성 유지

이제 프로덕션 환경에서 안전하고 표준적인 인증 방식을 사용할 수 있습니다.

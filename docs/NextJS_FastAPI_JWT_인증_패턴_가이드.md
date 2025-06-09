# Next.js + FastAPI JWT 인증 패턴 가이드

## 개요
이 문서는 Next.js 프론트엔드와 FastAPI 백엔드 간의 JWT 기반 인증 시스템 구현 패턴을 정의합니다. NextAuth.js v5와 FastAPI의 JWT 검증을 통한 안전한 API 통신을 보장합니다.

## 핵심 원칙

### 1. JWT 토큰 기반 인증 필수
- 모든 백엔드 API 호출은 JWT 토큰을 통한 인증 필수
- X-User-ID 헤더나 기타 방식 대신 표준 JWT Bearer 토큰 사용
- NextAuth.js 세션에서 JWT 토큰 생성 후 백엔드로 전달

### 2. Next.js API 라우트 패턴

#### 기본 구조
```typescript
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getServerJwtToken } from '@/lib/jwt-utils';

const BACKEND_URL = process.env.NEXT_PUBLIC_MCP_API_URL || 'http://localhost:8000';

export const GET = auth(async function GET(req) {
  try {
    // 1. NextAuth.js v5 세션 확인
    if (!req.auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 2. JWT 토큰 생성 (필수)
    const jwtToken = await getServerJwtToken(req as any);
    
    if (!jwtToken) {
      console.error('❌ Failed to generate JWT token');
      return NextResponse.json({ error: 'Failed to generate authentication token' }, { status: 500 });
    }

    console.log('✅ Using JWT token for backend request');

    // 3. 백엔드 API 호출
    const response = await fetch(`${BACKEND_URL}/api/endpoint`, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${jwtToken}`,
      },
    });

    if (!response.ok) {
      const error = await response.text();
      return NextResponse.json({ error }, { status: response.status });
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
});
```

#### POST 요청 패턴
```typescript
export const POST = auth(async function POST(req) {
  try {
    if (!req.auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const jwtToken = await getServerJwtToken(req as any);
    
    if (!jwtToken) {
      console.error('❌ Failed to generate JWT token for POST');
      return NextResponse.json({ error: 'Failed to generate authentication token' }, { status: 500 });
    }

    const response = await fetch(`${BACKEND_URL}/api/endpoint`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${jwtToken}`,
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const error = await response.text();
      return NextResponse.json({ error }, { status: response.status });
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
});
```

### 3. FastAPI 백엔드 패턴

#### JWT 인증 함수
```python
async def get_user_from_jwt_token(request: Request, db: Session) -> Optional[User]:
    """
    Request에서 JWT 토큰을 추출하고 검증한 후 데이터베이스 User 객체를 반환합니다.
    """
    try:
        # Authorization 헤더에서 JWT 토큰 추출
        auth_header = request.headers.get("authorization")
        if not auth_header or not auth_header.startswith("Bearer "):
            logger.warning("No valid Authorization header found")
            return None
        
        token = auth_header.split(" ")[1]
        
        # JWT 토큰 검증
        jwt_user = verify_jwt_token(token)
        if not jwt_user:
            logger.warning("JWT token verification failed")
            return None
        
        # 데이터베이스에서 사용자 찾기 또는 생성
        user = db.query(User).filter(User.id == jwt_user.id).first()
        if not user:
            # NextAuth.js 통합: 사용자가 존재하지 않으면 생성
            user = User(
                id=jwt_user.id,
                email=jwt_user.email,
                name=jwt_user.name or jwt_user.email
            )
            db.add(user)
            db.commit()
            db.refresh(user)
            logger.info(f"Created new user from JWT: {user.email}")
        
        return user
        
    except Exception as e:
        logger.error(f"Error getting user from JWT token: {e}")
        return None
```

#### API 엔드포인트 패턴
```python
async def get_current_user_for_api(
    request: Request,
    db: Session = Depends(get_db)
) -> User:
    """API용 사용자 인증 함수"""
    user = await get_user_from_jwt_token(request, db)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required"
        )
    return user

@router.get("/api/endpoint", response_model=List[ResponseModel])
async def list_resources(
    current_user: User = Depends(get_current_user_for_api),
    db: Session = Depends(get_db)
):
    """리소스 목록 조회"""
    # 비즈니스 로직 구현
    pass
```

## 필수 구성 요소

### 1. NextAuth.js 설정
- JWT 전략 사용
- 사용자 정보를 JWT 토큰에 포함
- `getServerJwtToken` 유틸리티 함수 구현

### 2. FastAPI JWT 검증
- `verify_jwt_token` 함수로 토큰 검증
- NextAuth.js 토큰 구조에 맞는 페이로드 파싱
- 사용자 자동 생성 (NextAuth.js 통합)

### 3. 환경 변수
```env
# Next.js
NEXT_PUBLIC_MCP_API_URL=http://localhost:8000
AUTH_SECRET=your-secret-key

# FastAPI
NEXTAUTH_SECRET=your-secret-key
JWT_ALGORITHM=HS256
```

## 보안 고려사항

### 1. 토큰 검증
- 토큰 만료 시간 확인
- 서명 검증 (프로덕션 환경)
- 토큰 구조 유효성 검사

### 2. 에러 처리
- 인증 실패 시 적절한 HTTP 상태 코드 반환
- 민감한 정보 노출 방지
- 로깅을 통한 보안 이벤트 추적

### 3. CORS 설정
- 적절한 CORS 정책 설정
- 프로덕션 환경에서 도메인 제한

## 구현 체크리스트

### Next.js API 라우트
- [ ] `auth()` 래퍼 함수 사용
- [ ] `req.auth` 세션 확인
- [ ] `getServerJwtToken()` 토큰 생성
- [ ] Bearer 토큰으로 백엔드 호출
- [ ] 적절한 에러 처리

### FastAPI 백엔드
- [ ] JWT 토큰 추출 및 검증
- [ ] 사용자 인증 dependency 함수
- [ ] 데이터베이스 사용자 조회/생성
- [ ] 적절한 HTTP 상태 코드 반환

### 공통
- [ ] 환경 변수 설정
- [ ] 로깅 구현
- [ ] 에러 처리 표준화
- [ ] 보안 헤더 설정

## 예제 참조
- Teams API: `mcp-orch/web/src/app/api/teams/route.ts`
- Projects API: `mcp-orch/web/src/app/api/projects/route.ts`
- JWT Auth: `mcp-orch/src/mcp_orch/api/jwt_auth.py`
- Projects Backend: `mcp-orch/src/mcp_orch/api/projects.py`

이 패턴을 따라 새로운 API 엔드포인트를 구현하면 일관된 인증 시스템을 유지할 수 있습니다.

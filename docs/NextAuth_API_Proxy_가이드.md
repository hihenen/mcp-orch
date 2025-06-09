# NextAuth.js API 프록시 시스템 가이드

## 개요

하드코딩된 JWT 토큰 문제를 해결하기 위해 NextAuth.js 세션 기반 인증과 Next.js API Route 프록시 시스템을 구현했습니다.

## 구현된 구조

### 1. 인증 흐름
```
프론트엔드 → NextAuth.js 세션 → Next.js API Route → 백엔드 API
```

### 2. 주요 구성 요소

#### A. 헤더 기반 인증 (백엔드)
- **파일**: `src/mcp_orch/api/header_auth.py`
- **기능**: NextAuth.js 세션 정보를 헤더에서 추출하여 사용자 인증
- **헤더**: 
  - `X-User-Id`: 사용자 ID
  - `X-User-Email`: 사용자 이메일
  - `X-User-Name`: 사용자 이름

#### B. API 프록시 (프론트엔드)
- **파일**: `web/src/app/api/teams/route.ts`, `web/src/app/api/servers/route.ts`
- **기능**: NextAuth.js 세션을 확인하고 백엔드로 요청 전달
- **인증**: 세션 기반 자동 인증

#### C. API 클라이언트 업데이트
- **파일**: `web/src/lib/api.ts`
- **변경사항**:
  - 직접 백엔드 호출 → Next.js API Route 호출
  - Bearer 토큰 제거 → NextAuth.js 세션 기반 인증
  - 새로운 Teams API 메서드 추가

## 구현된 API 프록시

### 1. Teams API
- `GET /api/teams` - 팀 목록 조회
- `POST /api/teams` - 팀 생성
- `GET /api/teams/{teamId}/members` - 팀 멤버 조회
- `POST /api/teams/{teamId}/members/invite` - 멤버 초대
- `PUT /api/teams/{teamId}/members/{userId}/role` - 역할 변경
- `DELETE /api/teams/{teamId}/members/{userId}` - 멤버 제거
- `GET /api/teams/{teamId}/api-keys` - API 키 조회
- `POST /api/teams/{teamId}/api-keys` - API 키 생성
- `DELETE /api/teams/{teamId}/api-keys/{keyId}` - API 키 삭제

### 2. Servers API
- `GET /api/servers` - 서버 목록 조회
- `POST /api/servers` - 서버 생성

## 백엔드 수정사항

### Teams API 업데이트
- **파일**: `src/mcp_orch/api/teams.py`
- **변경사항**:
  - 헤더 기반 인증 지원 추가
  - JWT 토큰과 헤더 인증 모두 지원 (하위 호환성)
  - 사용자 자동 생성 기능

### 인증 처리 로직
```python
# 헤더 기반 인증 우선 시도
current_user = get_user_from_headers(request, db)

if not current_user:
    # JWT 토큰 인증으로 폴백
    jwt_user = get_current_user(credentials)
    current_user = db.query(User).filter(User.id == jwt_user.id).first()
```

## 사용 방법

### 1. 프론트엔드에서 API 호출
```typescript
import { api } from '@/lib/api';

// 팀 목록 조회
const teamsResponse = await api.getTeams();
if (teamsResponse.success) {
  console.log(teamsResponse.data);
}

// 팀 생성
const createResponse = await api.createTeam({ name: "새 팀" });
```

### 2. 인증 상태 확인
```typescript
import { useSession } from 'next-auth/react';

function MyComponent() {
  const { data: session, status } = useSession();
  
  if (status === "loading") return <p>Loading...</p>;
  if (status === "unauthenticated") return <p>Access Denied</p>;
  
  return <p>Welcome {session.user.email}!</p>;
}
```

## 보안 개선사항

1. **하드코딩된 JWT 토큰 제거**: 모든 하드코딩된 토큰을 제거하고 세션 기반 인증으로 전환
2. **자동 사용자 관리**: 헤더 정보를 기반으로 사용자 자동 생성 및 업데이트
3. **세션 기반 보안**: NextAuth.js의 안전한 세션 관리 활용
4. **API 프록시**: 직접 백엔드 노출 방지

## 다음 단계

1. **추가 API 프록시 구현**: 나머지 API 엔드포인트들도 프록시로 전환
2. **에러 처리 개선**: 더 세밀한 에러 처리 및 사용자 피드백
3. **테스트 작성**: API 프록시 및 인증 로직 테스트
4. **성능 최적화**: 캐싱 및 요청 최적화

## 문제 해결

### 일반적인 문제들

1. **세션이 없음**: NextAuth.js 설정 확인
2. **CORS 에러**: Next.js API Route가 자동으로 처리
3. **인증 실패**: 헤더 정보 확인 및 사용자 생성 로직 점검

### 디버깅 팁

1. 브라우저 개발자 도구에서 네트워크 탭 확인
2. Next.js 서버 로그 확인
3. 백엔드 API 로그 확인

이제 JWT 토큰 하드코딩 문제가 해결되고, 안전한 세션 기반 인증 시스템이 구축되었습니다.

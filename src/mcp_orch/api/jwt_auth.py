"""
JWT 토큰 검증 미들웨어
NextAuth.js에서 발급된 JWT 토큰을 검증하고 사용자 정보를 추출합니다.
"""

import os
import logging
from typing import Optional, Dict, Any
from datetime import datetime, timezone, timedelta
from jose import JWTError, jwt
from fastapi import HTTPException, status, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi import Request
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import JSONResponse
from sqlalchemy.orm import Session

# User 모델 import 추가
from ..models.user import User
from ..database import get_db
from ..config import settings

logger = logging.getLogger(__name__)

# NextAuth.js JWT 설정
NEXTAUTH_SECRET = os.getenv("NEXTAUTH_SECRET", "your-secret-key-here-change-in-production")
ALGORITHM = "HS256"

security = HTTPBearer()

class JWTUser:
    """JWT에서 추출된 사용자 정보"""
    def __init__(self, user_id: str, email: str, name: str, 
                 team_id: Optional[str] = None, 
                 team_name: Optional[str] = None):
        self.id = user_id
        self.email = email
        self.name = name
        self.team_id = team_id
        self.team_name = team_name

def verify_jwt_token(token: str) -> Optional[JWTUser]:
    """
    JWT 토큰을 검증하고 사용자 정보를 반환합니다.
    
    Args:
        token: NextAuth.js에서 생성된 JWT 토큰 문자열
        
    Returns:
        JWTUser 객체 또는 None (검증 실패 시)
    """
    try:
        logger.info(f"🔍 Verifying JWT token: {token[:50]}...")
        
        # 토큰이 3개 부분으로 구성되어 있는지 확인
        parts = token.split('.')
        if len(parts) != 3:
            logger.warning(f"❌ Invalid JWT token format: expected 3 parts, got {len(parts)}")
            return None
        
        # JWT 토큰 검증 (개발/프로덕션 환경 모두 지원)
        try:
            # 설정에서 JWT 시크릿 가져오기
            jwt_secret = settings.security.jwt_secret if settings else NEXTAUTH_SECRET
            
            # JWT 토큰 디코딩 (서명 검증 포함)
            payload = jwt.decode(
                token,
                key=jwt_secret,
                algorithms=[ALGORITHM],
                options={
                    "verify_signature": True,   # 서명 검증 활성화
                    "verify_exp": True,         # 만료 시간 검증 활성화
                    "verify_aud": False,        # audience 검증 비활성화
                    "verify_iss": False         # issuer 검증 비활성화
                }
            )
            logger.info(f"✅ JWT payload decoded: {payload}")
            
        except jwt.ExpiredSignatureError:
            logger.warning("❌ JWT token expired")
            return None
        except JWTError as e:
            logger.warning(f"❌ JWT decoding failed: {e}")
            return None
        
        # NextAuth.js 토큰 구조에 맞게 필드 추출
        # NextAuth.js는 sub 필드에 사용자 ID를 저장
        user_id = payload.get("sub") or payload.get("id")
        email = payload.get("email")
        name = payload.get("name")
        
        if not user_id or not email:
            logger.warning(f"❌ JWT token missing required fields. user_id: {user_id}, email: {email}")
            logger.warning(f"Full payload: {payload}")
            return None
        
        # 팀 정보 추출 (선택적)
        team_id = payload.get("teamId")
        team_name = payload.get("teamName")
        
        logger.info(f"✅ JWT token verified for user: {email} (ID: {user_id})")
        if team_id:
            logger.info(f"✅ Team info: {team_name} (ID: {team_id})")
        
        return JWTUser(
            user_id=user_id,
            email=email,
            name=name,
            team_id=team_id,
            team_name=team_name
        )
        
    except Exception as e:
        logger.error(f"❌ Unexpected error during JWT verification: {e}")
        logger.error(f"Token: {token[:100]}...")
        return None

def get_current_user(credentials: HTTPAuthorizationCredentials, db: Session = Depends(lambda: None)) -> 'User':
    """
    HTTP Authorization 헤더에서 JWT 토큰을 추출하고 검증한 후 데이터베이스 User 객체를 반환합니다.
    FastAPI dependency로 사용됩니다.
    
    Args:
        credentials: HTTP Bearer 토큰
        db: 데이터베이스 세션 (teams.py에서 직접 전달)
        
    Returns:
        User 객체 (데이터베이스 모델)
        
    Raises:
        HTTPException: 토큰이 유효하지 않은 경우
    """
    jwt_user = verify_jwt_token(credentials.credentials)
    if not jwt_user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # teams.py에서 직접 데이터베이스 세션을 전달받아 사용
    # 이 함수는 teams.py에서만 사용되므로 db는 항상 전달됨
    if db is None:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Database session not available"
        )
    
    # 데이터베이스에서 사용자 찾기 또는 생성
    user = db.query(User).filter(User.id == jwt_user.id).first()
    if not user:
        # 사용자가 존재하지 않으면 생성 (NextAuth.js 통합)
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

class JWTAuthMiddleware(BaseHTTPMiddleware):
    """
    통합 인증 미들웨어
    JWT 토큰과 API 키 인증을 모두 지원합니다.
    """
    
    def __init__(self, app, settings=None):
        super().__init__(app)
        self.settings = settings
        
        # API 키 설정 (설정이 있는 경우)
        self.api_keys = {}
        if settings and hasattr(settings, 'security') and settings.security.api_keys:
            self.api_keys = {
                key_info["key"]: key_info
                for key_info in settings.security.api_keys
            }
            logger.info(f"Loaded {len(self.api_keys)} API keys: {list(self.api_keys.keys())}")
        
        # 보호된 경로 설정 (기본값)
        self.protected_paths = [
            "/api/users",
            "/api/profile"
        ]
        
        # 공개 경로 (인증 불필요)
        self.public_paths = [
            "/api/auth",
            "/api/teams",         # 팀 API는 헤더 기반 인증 사용
            "/api/users/signup",  # 회원가입은 공개
            "/api/users/login",   # 로그인도 공개
            "/api/users/test",    # 테스트 엔드포인트
            "/api/users/test-db", # DB 테스트 엔드포인트
            "/api/status",
            "/api/health",
            "/sse",
            "/docs",
            "/openapi.json",
            "/redoc",
            "/",                  # 루트 경로
            "/favicon.ico"        # 파비콘
        ]
    
    async def dispatch(self, request: Request, call_next):
        # 디버깅을 위한 로그 추가
        print(f"\n🔍 JWT Middleware - Processing request: {request.method} {request.url}")
        
        # 모든 헤더 출력
        print(f"🔍 All request headers:")
        for key, value in request.headers.items():
            if key.lower() == 'authorization':
                print(f"  {key}: {value[:50]}..." if len(value) > 50 else f"  {key}: {value}")
            else:
                print(f"  {key}: {value}")
        
        # Authorization 헤더 확인
        auth_header = request.headers.get("authorization")
        print(f"🔍 Authorization header present: {bool(auth_header)}")
        
        if auth_header and auth_header.startswith("Bearer "):
            token = auth_header.split(" ")[1]
            print(f"🔍 Extracted token (first 20 chars): {token[:20]}...")
            
            try:
                # JWT 설정 확인
                jwt_secret = self.settings.security.jwt_secret if self.settings else NEXTAUTH_SECRET
                print(f"🔍 JWT secret exists: {bool(jwt_secret)}")
                print(f"🔍 JWT_ALGORITHM: {ALGORITHM}")
                
                # JWT 토큰 디코딩 시도
                payload = jwt.decode(
                    token, 
                    jwt_secret, 
                    algorithms=[ALGORITHM]
                )
                print(f"✅ JWT payload decoded successfully: {payload}")
                
                user_id = payload.get("sub")
                if user_id:
                    print(f"✅ User ID from token: {user_id}")
                    
                    # 데이터베이스에서 사용자 조회
                    db = next(get_db())
                    try:
                        user = db.query(User).filter(User.id == user_id).first()
                        
                        if user:
                            print(f"✅ User found in database: {user.email}")
                            request.state.user = user
                        else:
                            print(f"❌ User not found in database for ID: {user_id}")
                            request.state.user = None
                    finally:
                        db.close()
                else:
                    print("❌ No user ID (sub) in JWT payload")
                    request.state.user = None
                    
            except jwt.ExpiredSignatureError:
                print("❌ JWT token expired")
                request.state.user = None
            except JWTError as e:
                print(f"❌ Invalid JWT token: {e}")
                request.state.user = None
            except Exception as e:
                print(f"❌ Unexpected error processing JWT: {e}")
                request.state.user = None
        else:
            print("❌ No valid Authorization header found")
            request.state.user = None
        
        print(f"🔍 Final request.state.user: {getattr(request.state, 'user', 'Not set')}")
        
        response = await call_next(request)
        print(f"🔍 Response status: {response.status_code}")
        return response

def get_current_user_from_request(request: Request) -> Optional[JWTUser]:
    """
    Request 객체에서 현재 사용자 정보를 가져옵니다.
    미들웨어에서 설정된 사용자 정보를 반환합니다.
    
    Args:
        request: FastAPI Request 객체
        
    Returns:
        JWTUser 객체 또는 None
    """
    return getattr(request.state, 'user', None)

async def get_current_user(request: Request) -> Optional[User]:
    """Get current user from request state"""
    print(f"🔍 get_current_user called")
    print(f"🔍 Request state attributes: {dir(request.state)}")
    
    user = getattr(request.state, 'user', None)
    print(f"🔍 User from request.state: {user}")
    
    if user:
        print(f"✅ Returning user: {user.id} ({user.email})")
    else:
        print("❌ No user found in request state")
    
    return user

async def get_user_from_jwt_token(request: Request, db: Session) -> Optional[User]:
    """
    Request에서 JWT 토큰을 추출하고 검증한 후 데이터베이스 User 객체를 반환합니다.
    프로젝트 API에서 사용됩니다.
    
    Args:
        request: FastAPI Request 객체
        db: 데이터베이스 세션
        
    Returns:
        User 객체 또는 None
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
            # 사용자가 존재하지 않으면 생성 (NextAuth.js 통합)
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

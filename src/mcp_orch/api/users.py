from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, EmailStr
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
import bcrypt
from typing import Optional
import os
from datetime import datetime, timezone, timedelta
from jose import jwt

from ..database import get_db
from ..models.user import User

# JWT 설정
NEXTAUTH_SECRET = os.getenv("NEXTAUTH_SECRET", "your-secret-key-here-change-in-production")
ALGORITHM = "HS256"

router = APIRouter(prefix="/api/users", tags=["users"])

@router.get("/test")
def test_endpoint():
    """테스트 엔드포인트"""
    import logging
    logger = logging.getLogger(__name__)
    logger.info("Test endpoint called")
    return {"message": "Test endpoint working"}

@router.get("/test-db")
def test_db_endpoint(db: Session = Depends(get_db)):
    """데이터베이스 연결 테스트 엔드포인트"""
    import logging
    logger = logging.getLogger(__name__)
    logger.info("Test DB endpoint called")
    try:
        # 간단한 쿼리 실행
        result = db.execute("SELECT 1 as test").fetchone()
        logger.info(f"DB query result: {result}")
        return {"message": "Database connection working", "result": result[0] if result else None}
    except Exception as e:
        logger.error(f"Database error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")

class SignupRequest(BaseModel):
    name: str
    email: EmailStr
    password: str
    organization_name: Optional[str] = None

from uuid import UUID

class UserResponse(BaseModel):
    id: UUID
    name: str
    email: EmailStr

    class Config:
        from_attributes = True

class OrganizationResponse(BaseModel):
    id: UUID
    name: str
    slug: str

    class Config:
        from_attributes = True

class OrganizationMemberResponse(BaseModel):
    id: UUID
    user_id: UUID
    organization_id: UUID
    role: str
    is_default: bool

    class Config:
        from_attributes = True

class SignupResponse(BaseModel):
    message: str
    user: UserResponse

@router.post("/signup", response_model=SignupResponse)
def signup(request: SignupRequest, db: Session = Depends(get_db)):
    """사용자 회원가입"""
    import logging
    logger = logging.getLogger(__name__)
    logger.info(f"Signup request received: {request.email}")
    
    try:
        # 입력 검증
        if len(request.password) < 8:
            raise HTTPException(
                status_code=400,
                detail="비밀번호는 최소 8자 이상이어야 합니다."
            )

        # 이메일 중복 확인
        existing_user = db.query(User).filter(User.email == request.email).first()
        if existing_user:
            raise HTTPException(
                status_code=400,
                detail="이미 사용 중인 이메일입니다."
            )

        # 비밀번호 해시화
        hashed_password = bcrypt.hashpw(
            request.password.encode('utf-8'), 
            bcrypt.gensalt()
        ).decode('utf-8')

        # 사용자 생성
        user = User(
            name=request.name,
            email=request.email,
            password=hashed_password
        )
        db.add(user)
        db.flush()  # ID를 얻기 위해 flush

        # 커밋하여 사용자 생성 완료
        db.commit()

        return {
            "message": "회원가입이 완료되었습니다. 팀을 생성하여 MCP 서버를 관리해보세요.",
            "user": UserResponse.model_validate(user)
        }

    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=400,
            detail="이미 사용 중인 이메일입니다."
        )
    except Exception as e:
        db.rollback()
        import traceback
        import logging
        logger = logging.getLogger(__name__)
        logger.error(f"Signup error: {str(e)}")
        logger.error(f"Traceback: {traceback.format_exc()}")
        raise HTTPException(
            status_code=500,
            detail=f"서버 오류가 발생했습니다: {str(e)}"
        )

class LoginRequest(BaseModel):
    email: EmailStr
    password: str

class LoginResponse(BaseModel):
    message: str
    user: UserResponse
    organization: Optional[OrganizationResponse] = None
    membership: Optional[OrganizationMemberResponse] = None
    token: str  # JWT 토큰 추가

@router.post("/login", response_model=LoginResponse)
def login(request: LoginRequest, db: Session = Depends(get_db)):
    """사용자 로그인"""
    try:
        # 사용자 조회
        user = db.query(User).filter(User.email == request.email).first()
        if not user:
            raise HTTPException(
                status_code=401,
                detail="이메일 또는 비밀번호가 올바르지 않습니다."
            )

        # 비밀번호 확인
        if not bcrypt.checkpw(request.password.encode('utf-8'), user.password.encode('utf-8')):
            raise HTTPException(
                status_code=401,
                detail="이메일 또는 비밀번호가 올바르지 않습니다."
            )

        # 임시로 조직 정보 없이 로그인 처리
        organization = None
        membership = None

        # JWT 토큰 생성
        token_payload = {
            "id": str(user.id),
            "email": user.email,
            "name": user.name,
            "is_admin": user.is_admin,  # 관리자 권한 정보 추가
            "exp": datetime.now(timezone.utc) + timedelta(hours=24),  # 24시간 만료
            "iat": datetime.now(timezone.utc)
        }
        
        # 조직 정보가 있으면 토큰에 포함
        if organization and membership:
            # 역할 처리 - enum 값이나 문자열 모두 처리
            role_value = None
            if hasattr(membership.role, 'value'):
                role_value = membership.role.value
            elif isinstance(membership.role, str):
                role_value = membership.role.upper()
            else:
                role_value = str(membership.role)
                
            token_payload.update({
                "organizationId": str(organization.id),
                "organizationName": organization.name,
                "organizationRole": role_value
            })
        
        # JWT 토큰 생성
        token = jwt.encode(token_payload, NEXTAUTH_SECRET, algorithm=ALGORITHM)

        # 기존 스키마와 호환성을 위한 임시 응답 구조
        class TempOrgResponse:
            def __init__(self, org):
                self.id = org.id
                self.name = org.name
                self.slug = f"{user.email.split('@')[0]}-{str(user.id)}"  # 임시 slug
        
        class TempMemberResponse:
            def __init__(self, member):
                self.id = member.id
                self.user_id = member.user_id
                self.organization_id = member.organization_id
                # 역할 처리 - enum 값이나 문자열 모두 처리
                if hasattr(member.role, 'value'):
                    self.role = member.role.value
                elif isinstance(member.role, str):
                    # 문자열인 경우 대문자로 변환하여 enum과 매칭
                    self.role = member.role.upper()
                else:
                    self.role = str(member.role)
                self.is_default = True  # 기본 조직으로 설정

        return LoginResponse(
            message="로그인이 완료되었습니다.",
            user=UserResponse.model_validate(user),
            organization=OrganizationResponse.model_validate(TempOrgResponse(organization)) if organization else None,
            membership=OrganizationMemberResponse.model_validate(TempMemberResponse(membership)) if membership else None,
            token=token
        )

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"서버 오류가 발생했습니다: {str(e)}"
        )

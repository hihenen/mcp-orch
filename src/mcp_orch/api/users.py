from fastapi import APIRouter, HTTPException, Depends, Request, status
from pydantic import BaseModel, EmailStr
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
import bcrypt
from typing import Optional, List
import os
from datetime import datetime, timezone, timedelta
from jose import jwt

from ..database import get_db
from ..models.user import User
from .jwt_auth import get_user_from_jwt_token

# JWT 설정
AUTH_SECRET = os.getenv("AUTH_SECRET", "your-secret-key-here-change-in-production")
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
    is_admin: bool = False  # 관리자 권한 필드 추가

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
        token = jwt.encode(token_payload, AUTH_SECRET, algorithm=ALGORITHM)

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

# 관리자 권한 확인 함수
async def get_current_admin_user(request: Request, db: Session = Depends(get_db)) -> User:
    """관리자 권한을 가진 현재 사용자를 반환합니다."""
    user = await get_user_from_jwt_token(request, db)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required"
        )
    
    if not user.is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin privileges required"
        )
    
    return user

# 사용자 관리용 응답 모델
class AdminUserResponse(BaseModel):
    id: str
    name: Optional[str]
    email: str
    role: str  # 'admin' 또는 'user'
    status: str  # 'active' 또는 'inactive'
    created_at: datetime
    last_login_at: Optional[datetime] = None
    projects_count: int = 0

    class Config:
        from_attributes = True

class AdminUserListResponse(BaseModel):
    users: List[AdminUserResponse]
    total: int

class CreateUserRequest(BaseModel):
    name: str
    email: EmailStr
    password: str
    is_admin: bool = False

class UpdateUserRequest(BaseModel):
    name: Optional[str] = None
    email: Optional[EmailStr] = None
    is_admin: Optional[bool] = None
    is_active: Optional[bool] = None

class BulkDeleteRequest(BaseModel):
    user_ids: List[str]

class BulkDeleteResponse(BaseModel):
    message: str
    successful_deletions: List[str]
    failed_deletions: List[dict]
    total_processed: int

# 관리자용 사용자 관리 API
@router.get("/admin", response_model=AdminUserListResponse)
async def list_users_admin(
    request: Request,
    skip: int = 0,
    limit: int = 100,
    search: Optional[str] = None,
    include_inactive: bool = False,
    current_user: User = Depends(get_current_admin_user),
    db: Session = Depends(get_db)
):
    """관리자용 사용자 목록 조회"""
    try:
        # 기본 쿼리
        query = db.query(User)
        
        # 활성 사용자만 필터링 (기본값)
        if not include_inactive:
            query = query.filter(User.is_active == True)
        
        # 검색 조건 적용
        if search:
            search_term = f"%{search}%"
            query = query.filter(
                (User.name.ilike(search_term)) | 
                (User.email.ilike(search_term))
            )
        
        # 전체 카운트
        total = query.count()
        
        # 페이지네이션 적용
        users = query.offset(skip).limit(limit).all()
        
        # 각 사용자에 대한 프로젝트 수 계산 (향후 구현)
        user_responses = []
        for user in users:
            user_response = AdminUserResponse(
                id=str(user.id),
                name=user.name,
                email=user.email,
                role='admin' if user.is_admin else 'user',
                status='active' if user.is_active else 'inactive',
                created_at=user.created_at,
                last_login_at=None,  # 향후 로그인 추적 기능 구현 시 업데이트
                projects_count=0  # 향후 프로젝트 카운트 기능 구현 시 업데이트
            )
            user_responses.append(user_response)
        
        return AdminUserListResponse(
            users=user_responses,
            total=total
        )
        
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"사용자 목록 조회 중 오류가 발생했습니다: {str(e)}"
        )

@router.post("/admin", response_model=AdminUserResponse)
async def create_user_admin(
    request: Request,
    user_data: CreateUserRequest,
    current_user: User = Depends(get_current_admin_user),
    db: Session = Depends(get_db)
):
    """관리자용 사용자 생성"""
    try:
        # 이메일 중복 확인
        existing_user = db.query(User).filter(User.email == user_data.email).first()
        if existing_user:
            raise HTTPException(
                status_code=400,
                detail="이미 사용 중인 이메일입니다."
            )
        
        # 비밀번호 해시화
        hashed_password = bcrypt.hashpw(
            user_data.password.encode('utf-8'), 
            bcrypt.gensalt()
        ).decode('utf-8')
        
        # 새 사용자 생성
        new_user = User(
            name=user_data.name,
            email=user_data.email,
            password=hashed_password,
            is_admin=user_data.is_admin,
            is_active=True
        )
        
        db.add(new_user)
        db.commit()
        db.refresh(new_user)
        
        return AdminUserResponse(
            id=str(new_user.id),
            name=new_user.name,
            email=new_user.email,
            role='admin' if new_user.is_admin else 'user',
            status='active' if new_user.is_active else 'inactive',
            created_at=new_user.created_at,
            last_login_at=None,
            projects_count=0
        )
        
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=500,
            detail=f"사용자 생성 중 오류가 발생했습니다: {str(e)}"
        )

@router.get("/admin/{user_id}", response_model=AdminUserResponse)
async def get_user_admin(
    request: Request,
    user_id: str,
    current_user: User = Depends(get_current_admin_user),
    db: Session = Depends(get_db)
):
    """관리자용 특정 사용자 조회"""
    try:
        user = db.query(User).filter(User.id == user_id).first()
        if not user:
            raise HTTPException(
                status_code=404,
                detail="사용자를 찾을 수 없습니다."
            )
        
        return AdminUserResponse(
            id=str(user.id),
            name=user.name,
            email=user.email,
            role='admin' if user.is_admin else 'user',
            status='active' if user.is_active else 'inactive',
            created_at=user.created_at,
            last_login_at=None,
            projects_count=0
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"사용자 조회 중 오류가 발생했습니다: {str(e)}"
        )

@router.put("/admin/{user_id}", response_model=AdminUserResponse)
async def update_user_admin(
    request: Request,
    user_id: str,
    user_data: UpdateUserRequest,
    current_user: User = Depends(get_current_admin_user),
    db: Session = Depends(get_db)
):
    """관리자용 사용자 정보 수정"""
    try:
        user = db.query(User).filter(User.id == user_id).first()
        if not user:
            raise HTTPException(
                status_code=404,
                detail="사용자를 찾을 수 없습니다."
            )
        
        # 자기 자신의 관리자 권한은 해제할 수 없도록 제한
        if str(user.id) == str(current_user.id) and user_data.is_admin is False:
            raise HTTPException(
                status_code=400,
                detail="자신의 관리자 권한은 해제할 수 없습니다."
            )
        
        # 마지막 관리자인 경우 권한 해제 방지
        if user_data.is_admin is False and user.is_admin:
            admin_count = db.query(User).filter(User.is_admin == True).count()
            if admin_count <= 1:
                raise HTTPException(
                    status_code=400,
                    detail="마지막 관리자의 권한은 해제할 수 없습니다."
                )
        
        # 이메일 중복 확인 (변경하는 경우)
        if user_data.email and user_data.email != user.email:
            existing_user = db.query(User).filter(User.email == user_data.email).first()
            if existing_user:
                raise HTTPException(
                    status_code=400,
                    detail="이미 사용 중인 이메일입니다."
                )
        
        # 필드 업데이트
        if user_data.name is not None:
            user.name = user_data.name
        if user_data.email is not None:
            user.email = user_data.email
        if user_data.is_admin is not None:
            user.is_admin = user_data.is_admin
        if user_data.is_active is not None:
            user.is_active = user_data.is_active
        
        user.updated_at = datetime.now(timezone.utc)
        
        db.commit()
        db.refresh(user)
        
        return AdminUserResponse(
            id=str(user.id),
            name=user.name,
            email=user.email,
            role='admin' if user.is_admin else 'user',
            status='active' if user.is_active else 'inactive',
            created_at=user.created_at,
            last_login_at=None,
            projects_count=0
        )
        
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=500,
            detail=f"사용자 수정 중 오류가 발생했습니다: {str(e)}"
        )

@router.delete("/admin/{user_id}")
async def delete_user_admin(
    request: Request,
    user_id: str,
    current_user: User = Depends(get_current_admin_user),
    db: Session = Depends(get_db)
):
    """관리자용 사용자 삭제 (소프트 삭제)"""
    try:
        user = db.query(User).filter(User.id == user_id).first()
        if not user:
            raise HTTPException(
                status_code=404,
                detail="사용자를 찾을 수 없습니다."
            )
        
        # 자기 자신은 삭제할 수 없도록 제한
        if str(user.id) == str(current_user.id):
            raise HTTPException(
                status_code=400,
                detail="자신의 계정은 삭제할 수 없습니다."
            )
        
        # 마지막 관리자인 경우 삭제 방지
        if user.is_admin:
            admin_count = db.query(User).filter(User.is_admin == True).count()
            if admin_count <= 1:
                raise HTTPException(
                    status_code=400,
                    detail="마지막 관리자는 삭제할 수 없습니다."
                )
        
        # 소프트 삭제 (비활성화)
        user.is_active = False
        user.updated_at = datetime.now(timezone.utc)
        
        db.commit()
        
        return {"message": "사용자가 성공적으로 비활성화되었습니다."}
        
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=500,
            detail=f"사용자 삭제 중 오류가 발생했습니다: {str(e)}"
        )

@router.post("/admin/bulk-delete", response_model=BulkDeleteResponse)
async def bulk_delete_users_admin(
    request: Request,
    bulk_delete_data: BulkDeleteRequest,
    current_user: User = Depends(get_current_admin_user),
    db: Session = Depends(get_db)
):
    """관리자용 사용자 일괄 삭제 (소프트 삭제)"""
    try:
        user_ids = bulk_delete_data.user_ids
        successful_deletions = []
        failed_deletions = []
        
        if not user_ids:
            raise HTTPException(
                status_code=400,
                detail="삭제할 사용자 ID가 제공되지 않았습니다."
            )
        
        # 현재 관리자 수 확인
        admin_count = db.query(User).filter(User.is_admin == True).count()
        
        for user_id in user_ids:
            try:
                user = db.query(User).filter(User.id == user_id).first()
                if not user:
                    failed_deletions.append({
                        "user_id": user_id,
                        "error": "사용자를 찾을 수 없습니다."
                    })
                    continue
                
                # 자기 자신은 삭제할 수 없도록 제한
                if str(user.id) == str(current_user.id):
                    failed_deletions.append({
                        "user_id": user_id,
                        "user_email": user.email,
                        "error": "자신의 계정은 삭제할 수 없습니다."
                    })
                    continue
                
                # 마지막 관리자인 경우 삭제 방지
                if user.is_admin and admin_count <= 1:
                    failed_deletions.append({
                        "user_id": user_id,
                        "user_email": user.email,
                        "error": "마지막 관리자는 삭제할 수 없습니다."
                    })
                    continue
                
                # 관리자 수 업데이트 (다음 반복을 위해)
                if user.is_admin:
                    admin_count -= 1
                
                # 소프트 삭제 (비활성화)
                user.is_active = False
                user.updated_at = datetime.now(timezone.utc)
                
                successful_deletions.append(user_id)
                
            except Exception as e:
                failed_deletions.append({
                    "user_id": user_id,
                    "error": f"삭제 중 오류 발생: {str(e)}"
                })
        
        # 성공한 변경사항 커밋
        if successful_deletions:
            db.commit()
        
        return BulkDeleteResponse(
            message=f"{len(successful_deletions)}명의 사용자가 성공적으로 비활성화되었습니다.",
            successful_deletions=successful_deletions,
            failed_deletions=failed_deletions,
            total_processed=len(user_ids)
        )
        
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=500,
            detail=f"일괄 삭제 중 오류가 발생했습니다: {str(e)}"
        )

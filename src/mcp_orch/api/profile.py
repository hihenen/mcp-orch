"""User profile management API endpoints."""
import logging
from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Request, status
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session
from passlib.context import CryptContext

from ..database import get_db
from ..models.user import User
from .jwt_auth import get_user_from_jwt_token

# 로깅 설정
logger = logging.getLogger(__name__)

# 비밀번호 해싱 설정
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# 라우터 생성
router = APIRouter(prefix="/api", tags=["profile"])


# Pydantic 모델들
class ProfileResponse(BaseModel):
    """프로필 조회 응답 모델"""
    id: str
    email: str
    name: Optional[str] = None
    image: Optional[str] = None
    created_at: str
    is_admin: bool

    class Config:
        from_attributes = True


class UpdateProfileRequest(BaseModel):
    """프로필 수정 요청 모델"""
    name: str = Field(..., min_length=1, max_length=255, description="사용자 이름")


class ChangePasswordRequest(BaseModel):
    """비밀번호 변경 요청 모델"""
    currentPassword: str = Field(..., min_length=1, description="현재 비밀번호")
    newPassword: str = Field(..., min_length=8, description="새 비밀번호 (최소 8자)")


# 유틸리티 함수들
def verify_password(plain_password: str, hashed_password: str) -> bool:
    """비밀번호 검증"""
    return pwd_context.verify(plain_password, hashed_password)


def get_password_hash(password: str) -> str:
    """비밀번호 해싱"""
    return pwd_context.hash(password)


async def get_current_user_for_profile(
    request: Request,
    db: Session = Depends(get_db)
) -> User:
    """프로필용 사용자 인증 함수"""
    user = await get_user_from_jwt_token(request, db)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required"
        )
    return user


# API 엔드포인트들
@router.get("/profile", response_model=ProfileResponse)
async def get_profile(
    current_user: User = Depends(get_current_user_for_profile),
    db: Session = Depends(get_db)
):
    """현재 사용자의 프로필 정보 조회"""
    logger.info(f"Profile requested for user: {current_user.email}")
    
    return ProfileResponse(
        id=str(current_user.id),
        email=current_user.email,
        name=current_user.name,
        image=current_user.image,
        created_at=current_user.created_at.isoformat() if hasattr(current_user, 'created_at') and current_user.created_at else datetime.now().isoformat(),
        is_admin=current_user.is_admin
    )


@router.put("/profile", response_model=ProfileResponse)
async def update_profile(
    profile_data: UpdateProfileRequest,
    current_user: User = Depends(get_current_user_for_profile),
    db: Session = Depends(get_db)
):
    """사용자 프로필 정보 수정"""
    logger.info(f"Profile update requested for user: {current_user.email}")
    
    try:
        # 사용자 정보 업데이트
        current_user.name = profile_data.name.strip()
        
        # 데이터베이스에 저장
        db.commit()
        db.refresh(current_user)
        
        logger.info(f"Profile updated successfully for user: {current_user.email}")
        
        return ProfileResponse(
            id=str(current_user.id),
            email=current_user.email,
            name=current_user.name,
            image=current_user.image,
            created_at=current_user.created_at.isoformat() if hasattr(current_user, 'created_at') and current_user.created_at else datetime.now().isoformat(),
            is_admin=current_user.is_admin
        )
        
    except Exception as e:
        logger.error(f"Error updating profile for user {current_user.email}: {e}")
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="프로필 업데이트 중 오류가 발생했습니다."
        )


@router.put("/profile/password")
async def change_password(
    password_data: ChangePasswordRequest,
    current_user: User = Depends(get_current_user_for_profile),
    db: Session = Depends(get_db)
):
    """사용자 비밀번호 변경"""
    logger.info(f"Password change requested for user: {current_user.email}")
    
    try:
        # OAuth 사용자는 비밀번호 변경 불가
        if current_user.provider:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"{current_user.provider} 계정은 비밀번호를 변경할 수 없습니다."
            )
        
        # 현재 비밀번호 확인
        if not current_user.password:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="현재 비밀번호가 설정되어 있지 않습니다."
            )
        
        if not verify_password(password_data.currentPassword, current_user.password):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="현재 비밀번호가 올바르지 않습니다."
            )
        
        # 새 비밀번호로 업데이트
        current_user.password = get_password_hash(password_data.newPassword)
        
        # 데이터베이스에 저장
        db.commit()
        
        logger.info(f"Password changed successfully for user: {current_user.email}")
        
        return {"message": "비밀번호가 성공적으로 변경되었습니다."}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error changing password for user {current_user.email}: {e}")
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="비밀번호 변경 중 오류가 발생했습니다."
        )


@router.delete("/profile")
async def delete_account(
    current_user: User = Depends(get_current_user_for_profile),
    db: Session = Depends(get_db)
):
    """계정 삭제 (구현 예정)"""
    logger.warning(f"Account deletion requested for user: {current_user.email}")
    
    # TODO: 계정 삭제 로직 구현
    # - 사용자와 관련된 모든 데이터 삭제
    # - 프로젝트 소유권 이전
    # - 팀 멤버십 정리
    # - 외부 키 제약 조건 처리
    
    raise HTTPException(
        status_code=status.HTTP_501_NOT_IMPLEMENTED,
        detail="계정 삭제 기능은 아직 구현되지 않았습니다."
    )
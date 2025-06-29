"""
프로젝트 API 키 관리 API
API 키 생성, 조회, 삭제, 보안 관리
"""

from typing import List, Optional
from uuid import UUID
from datetime import datetime, timedelta
import logging
import secrets
import string

from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session
from sqlalchemy import and_
from pydantic import BaseModel, Field

from ...database import get_db
from ...models import Project, ProjectMember, User, ApiKey
from ...services.activity_logger import ActivityLogger
from .common import get_current_user_for_projects, verify_project_access

router = APIRouter()
logger = logging.getLogger(__name__)


# Pydantic Models
class ApiKeyCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=255, description="API 키 이름")
    description: Optional[str] = Field(None, max_length=500, description="API 키 설명")
    expires_at: Optional[datetime] = Field(None, description="만료 날짜 (None이면 무제한)")


class ApiKeyResponse(BaseModel):
    id: str
    name: str
    description: Optional[str]
    key_suffix: str
    expires_at: Optional[datetime]
    created_at: datetime
    last_used_at: Optional[datetime]
    
    class Config:
        from_attributes = True


class ApiKeyCreateResponse(BaseModel):
    id: str
    name: str
    description: Optional[str]
    api_key: str  # 전체 키는 생성 시에만 반환
    key_suffix: str
    expires_at: Optional[datetime]
    created_at: datetime
    
    class Config:
        from_attributes = True


# Helper Functions
def generate_api_key() -> tuple[str, str]:
    """
    API 키와 접미사 생성
    
    Returns:
        tuple[str, str]: (전체 API 키, 표시용 접미사)
    """
    # 48자리 랜덤 문자열 생성 (영숫자 + 특수문자 제외)
    alphabet = string.ascii_letters + string.digits
    api_key = ''.join(secrets.choice(alphabet) for _ in range(48))
    
    # sk- 접두사 추가
    full_key = f"sk-{api_key}"
    
    # 마지막 8자리를 접미사로 사용
    suffix = api_key[-8:]
    
    return full_key, suffix


def validate_api_key_name(name: str, project_id: UUID, user: User, db: Session, exclude_key_id: Optional[UUID] = None) -> bool:
    """
    API 키 이름 중복 확인
    
    Args:
        name: 확인할 API 키 이름
        project_id: 프로젝트 ID
        user: 현재 사용자
        db: 데이터베이스 세션
        exclude_key_id: 제외할 API 키 ID (수정 시 사용)
    
    Returns:
        bool: 사용 가능하면 True
    """
    query = db.query(ApiKey).filter(
        and_(
            ApiKey.project_id == project_id,
            ApiKey.created_by_id == user.id,
            ApiKey.name == name
        )
    )
    
    if exclude_key_id:
        query = query.filter(ApiKey.id != exclude_key_id)
    
    existing_key = query.first()
    return existing_key is None


# API Endpoints
@router.get("/projects/{project_id}/api-keys", response_model=List[ApiKeyResponse])
async def list_project_api_keys(
    project_id: UUID,
    current_user: User = Depends(get_current_user_for_projects),
    db: Session = Depends(get_db)
):
    """프로젝트 API 키 목록 조회"""
    
    # 프로젝트 접근 권한 확인
    project, _ = verify_project_access(project_id, current_user, db)
    
    # 사용자가 생성한 API 키 조회
    api_keys = db.query(ApiKey).filter(
        and_(
            ApiKey.project_id == project_id,
            ApiKey.created_by_id == current_user.id
        )
    ).order_by(ApiKey.created_at.desc()).all()
    
    logger.info(f"Retrieved {len(api_keys)} API keys for project {project_id}")
    
    return [
        ApiKeyResponse(
            id=str(key.id),
            name=key.name,
            description=key.description,
            key_suffix=key.key_suffix,
            expires_at=key.expires_at,
            created_at=key.created_at,
            last_used_at=key.last_used_at
        )
        for key in api_keys
    ]


@router.post("/projects/{project_id}/api-keys", response_model=ApiKeyCreateResponse)
async def create_project_api_key(
    project_id: UUID,
    key_data: ApiKeyCreate,
    current_user: User = Depends(get_current_user_for_projects),
    db: Session = Depends(get_db)
):
    """프로젝트 API 키 생성"""
    
    # 프로젝트 접근 권한 확인
    project, _ = verify_project_access(project_id, current_user, db)
    
    # API 키 이름 중복 확인
    if not validate_api_key_name(key_data.name, project_id, current_user, db):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="API key with this name already exists"
        )
    
    # 만료 날짜 검증
    if key_data.expires_at and key_data.expires_at <= datetime.utcnow():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Expiration date must be in the future"
        )
    
    # API 키 생성
    api_key, key_suffix = generate_api_key()
    
    # key_prefix 생성 (앞의 8자리)
    key_prefix = api_key[:8]  # sk- 포함하여 앞 8자리
    
    new_api_key = ApiKey(
        project_id=project_id,
        created_by_id=current_user.id,
        name=key_data.name,
        description=key_data.description,
        key_hash=api_key,  # 실제로는 해시해서 저장해야 함
        key_prefix=key_prefix,
        key_suffix=key_suffix,
        expires_at=key_data.expires_at
    )
    
    db.add(new_api_key)
    db.commit()
    db.refresh(new_api_key)
    
    # 활동 로깅
    try:
        activity_logger = ActivityLogger()
        await activity_logger.log_activity(
            db=db,
            user_id=current_user.id,
            project_id=project_id,
            activity_type="api_key_created",
            description=f"API 키 '{key_data.name}' 생성",
            metadata={
                "api_key_id": str(new_api_key.id),
                "key_suffix": key_suffix,
                "expires_at": key_data.expires_at.isoformat() if key_data.expires_at else None
            }
        )
    except Exception as e:
        logger.warning(f"Failed to log API key creation activity: {e}")
    
    logger.info(f"Created API key '{key_data.name}' for project {project_id}")
    
    return ApiKeyCreateResponse(
        id=str(new_api_key.id),
        name=new_api_key.name,
        description=new_api_key.description,
        api_key=api_key,  # 전체 키는 생성 시에만 반환
        key_suffix=new_api_key.key_suffix,
        expires_at=new_api_key.expires_at,
        created_at=new_api_key.created_at
    )


@router.delete("/projects/{project_id}/api-keys/{key_id}")
async def delete_project_api_key(
    project_id: UUID,
    key_id: UUID,
    current_user: User = Depends(get_current_user_for_projects),
    db: Session = Depends(get_db)
):
    """프로젝트 API 키 삭제"""
    
    # 프로젝트 접근 권한 확인
    project, _ = verify_project_access(project_id, current_user, db)
    
    # API 키 조회 (본인이 생성한 키만)
    api_key = db.query(ApiKey).filter(
        and_(
            ApiKey.id == key_id,
            ApiKey.project_id == project_id,
            ApiKey.created_by_id == current_user.id
        )
    ).first()
    
    if not api_key:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="API key not found"
        )
    
    # API 키 삭제
    key_name = api_key.name
    db.delete(api_key)
    db.commit()
    
    # 활동 로깅
    try:
        activity_logger = ActivityLogger()
        await activity_logger.log_activity(
            db=db,
            user_id=current_user.id,
            project_id=project_id,
            activity_type="api_key_deleted",
            description=f"API 키 '{key_name}' 삭제",
            metadata={
                "api_key_id": str(key_id),
                "key_suffix": api_key.key_suffix
            }
        )
    except Exception as e:
        logger.warning(f"Failed to log API key deletion activity: {e}")
    
    logger.info(f"Deleted API key '{key_name}' for project {project_id}")
    
    return {"message": f"API key '{key_name}' deleted successfully"}
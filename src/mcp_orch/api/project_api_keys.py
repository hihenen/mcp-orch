"""
프로젝트 API 키 관리 API
API 키 생성, 삭제, 조회 등
"""

from typing import List, Optional
from uuid import UUID
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_
from pydantic import BaseModel, Field

from ..database import get_db
from ..models import Project, ProjectMember, User, ApiKey, ProjectRole
from .jwt_auth import get_user_from_jwt_token

router = APIRouter(prefix="/api", tags=["project-api-keys"])


# Pydantic 모델들
class ApiKeyCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    description: Optional[str] = None
    expires_at: Optional[datetime] = None


class ApiKeyResponse(BaseModel):
    id: str
    name: str
    description: Optional[str]
    key_prefix: str
    expires_at: Optional[datetime]
    last_used_at: Optional[datetime]
    last_used_ip: Optional[str]
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True


class ApiKeyCreateResponse(BaseModel):
    id: str
    name: str
    description: Optional[str]
    api_key: str  # 전체 키는 생성 시에만 반환
    key_prefix: str
    expires_at: Optional[datetime]
    created_at: datetime
    
    class Config:
        from_attributes = True


# 사용자 인증 dependency 함수
async def get_current_user_for_project_api_keys(
    request: Request,
    db: Session = Depends(get_db)
) -> User:
    """프로젝트 API 키 API용 사용자 인증 함수"""
    user = await get_user_from_jwt_token(request, db)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required"
        )
    return user


# API 키 관리 API
@router.get("/projects/{project_id}/api-keys", response_model=List[ApiKeyResponse])
async def list_project_api_keys(
    project_id: UUID,
    current_user: User = Depends(get_current_user_for_project_api_keys),
    db: Session = Depends(get_db)
):
    """프로젝트별 API 키 목록 조회"""
    
    # 프로젝트 접근 권한 확인
    project_member = db.query(ProjectMember).filter(
        and_(
            ProjectMember.project_id == project_id,
            ProjectMember.user_id == current_user.id
        )
    ).first()
    
    if not project_member:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project not found or access denied"
        )
    
    # 프로젝트별 API 키 목록 조회
    api_keys = db.query(ApiKey).filter(
        ApiKey.project_id == project_id
    ).order_by(ApiKey.created_at.desc()).all()
    
    result = []
    for api_key in api_keys:
        result.append(ApiKeyResponse(
            id=str(api_key.id),
            name=api_key.name,
            description=api_key.description,
            key_prefix=api_key.key_prefix or "",
            expires_at=api_key.expires_at,
            last_used_at=api_key.last_used_at,
            last_used_ip=api_key.last_used_ip,
            created_at=api_key.created_at,
            updated_at=api_key.updated_at
        ))
    
    return result


@router.post("/projects/{project_id}/api-keys", response_model=ApiKeyCreateResponse)
async def create_project_api_key(
    project_id: UUID,
    api_key_data: ApiKeyCreate,
    current_user: User = Depends(get_current_user_for_project_api_keys),
    db: Session = Depends(get_db)
):
    """프로젝트 API 키 생성 (Owner/Developer만 가능)"""
    
    # 프로젝트 권한 확인 (Owner 또는 Developer)
    project_member = db.query(ProjectMember).filter(
        and_(
            ProjectMember.project_id == project_id,
            ProjectMember.user_id == current_user.id,
            or_(
                ProjectMember.role == ProjectRole.OWNER,
                ProjectMember.role == ProjectRole.DEVELOPER
            )
        )
    ).first()
    
    if not project_member:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only project owners and developers can create API keys"
        )
    
    # API 키 이름 중복 확인 (프로젝트 내에서)
    existing_key = db.query(ApiKey).filter(
        and_(
            ApiKey.project_id == project_id,
            ApiKey.name == api_key_data.name
        )
    ).first()
    
    if existing_key:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="API key name already exists in this project"
        )
    
    # 새 API 키 생성
    import secrets
    import hashlib
    
    # 32바이트 랜덤 키 생성
    raw_key = secrets.token_urlsafe(32)
    full_api_key = f"project_{str(project_id).replace('-', '')[:8]}_{raw_key}"
    
    # 키 해시 생성 (저장용)
    key_hash = hashlib.sha256(full_api_key.encode()).hexdigest()
    key_prefix = full_api_key[:12] + "..."
    
    new_api_key = ApiKey(
        project_id=project_id,
        name=api_key_data.name,
        description=api_key_data.description,
        key_hash=key_hash,
        key_prefix=key_prefix,
        expires_at=api_key_data.expires_at,
        created_by=current_user.id
    )
    
    db.add(new_api_key)
    db.commit()
    db.refresh(new_api_key)
    
    return ApiKeyCreateResponse(
        id=str(new_api_key.id),
        name=new_api_key.name,
        description=new_api_key.description,
        api_key=full_api_key,  # 전체 키는 생성 시에만 반환
        key_prefix=new_api_key.key_prefix or "",
        expires_at=new_api_key.expires_at,
        created_at=new_api_key.created_at
    )


@router.delete("/projects/{project_id}/api-keys/{key_id}")
async def delete_project_api_key(
    project_id: UUID,
    key_id: UUID,
    current_user: User = Depends(get_current_user_for_project_api_keys),
    db: Session = Depends(get_db)
):
    """프로젝트 API 키 삭제 (Owner/Developer만 가능)"""
    
    # 프로젝트 권한 확인 (Owner 또는 Developer)
    project_member = db.query(ProjectMember).filter(
        and_(
            ProjectMember.project_id == project_id,
            ProjectMember.user_id == current_user.id,
            or_(
                ProjectMember.role == ProjectRole.OWNER,
                ProjectMember.role == ProjectRole.DEVELOPER
            )
        )
    ).first()
    
    if not project_member:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only project owners and developers can delete API keys"
        )
    
    # API 키 조회
    api_key = db.query(ApiKey).filter(
        and_(
            ApiKey.id == key_id,
            ApiKey.project_id == project_id
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
    
    return {"message": f"API key '{key_name}' deleted successfully"}

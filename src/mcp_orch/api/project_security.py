"""
프로젝트 보안 설정 API
프로젝트별 SSE/Message 인증 설정 관리
"""

from typing import List
from uuid import UUID
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session
from sqlalchemy import and_
from pydantic import BaseModel

from ..database import get_db
from ..models import Project, ProjectMember, User, ProjectRole
from .jwt_auth import get_user_from_jwt_token

router = APIRouter(prefix="/api", tags=["project-security"])


# Pydantic 모델들
class SecuritySettings(BaseModel):
    jwt_auth_required: bool = True
    allowed_ip_ranges: List[str] = []
    unified_mcp_enabled: bool = True


class SecurityResponse(BaseModel):
    jwt_auth_required: bool
    allowed_ip_ranges: List[str]
    unified_mcp_enabled: bool
    
    class Config:
        from_attributes = True


# 사용자 인증 dependency 함수
async def get_current_user_for_security(
    request: Request,
    db: Session = Depends(get_db)
) -> User:
    """프로젝트 보안 API용 사용자 인증 함수"""
    user = await get_user_from_jwt_token(request, db)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required"
        )
    return user


@router.get("/projects/{project_id}/security", response_model=SecurityResponse)
async def get_project_security_settings(
    project_id: UUID,
    current_user: User = Depends(get_current_user_for_security),
    db: Session = Depends(get_db)
):
    """프로젝트 보안 설정 조회 (Owner/Developer만 가능)"""
    
    # 프로젝트 권한 확인 (Owner 또는 Developer)
    project_member = db.query(ProjectMember).filter(
        and_(
            ProjectMember.project_id == project_id,
            ProjectMember.user_id == current_user.id,
            ProjectMember.role.in_([ProjectRole.OWNER, ProjectRole.DEVELOPER])
        )
    ).first()
    
    if not project_member:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only project owners and developers can view security settings"
        )
    
    # 프로젝트 조회
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project not found"
        )
    
    return SecurityResponse(
        jwt_auth_required=project.jwt_auth_required,
        allowed_ip_ranges=project.allowed_ip_ranges or [],
        unified_mcp_enabled=project.unified_mcp_enabled
    )


@router.put("/projects/{project_id}/security", response_model=SecurityResponse)
async def update_project_security_settings(
    project_id: UUID,
    security_data: SecuritySettings,
    current_user: User = Depends(get_current_user_for_security),
    db: Session = Depends(get_db)
):
    """프로젝트 보안 설정 업데이트 (Owner만 가능)"""
    
    # 프로젝트 Owner 권한 확인
    project_member = db.query(ProjectMember).filter(
        and_(
            ProjectMember.project_id == project_id,
            ProjectMember.user_id == current_user.id,
            ProjectMember.role == ProjectRole.OWNER
        )
    ).first()
    
    if not project_member:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only project owners can update security settings"
        )
    
    # 프로젝트 조회
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project not found"
        )
    
    # 보안 설정 업데이트 (통합된 JWT 인증 사용)
    project.jwt_auth_required = security_data.jwt_auth_required
    project.allowed_ip_ranges = security_data.allowed_ip_ranges
    project.unified_mcp_enabled = security_data.unified_mcp_enabled
    project.updated_at = datetime.utcnow()
    
    db.commit()
    db.refresh(project)
    
    return SecurityResponse(
        jwt_auth_required=project.jwt_auth_required,
        allowed_ip_ranges=project.allowed_ip_ranges or [],
        unified_mcp_enabled=project.unified_mcp_enabled
    )

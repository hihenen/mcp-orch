"""
프로젝트 API 공통 유틸리티
공통 의존성, 인증, 권한 확인 등
"""

from typing import Optional
from uuid import UUID
import logging

from fastapi import Depends, HTTPException, status, Request
from sqlalchemy.orm import Session
from sqlalchemy import and_

from ...database import get_db
from ...models import Project, ProjectMember, User, ProjectRole
from ..jwt_auth import get_user_from_jwt_token

logger = logging.getLogger(__name__)


async def get_current_user_for_projects(request: Request, db: Session = Depends(get_db)) -> User:
    """프로젝트 관리용 사용자 인증 (공통 의존성)"""
    user = await get_user_from_jwt_token(request, db)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required"
        )
    return user


def verify_project_access(
    project_id: UUID, 
    user: User, 
    db: Session,
    required_role: Optional[ProjectRole] = None
) -> tuple[Project, ProjectMember]:
    """
    프로젝트 접근 권한 확인
    
    Args:
        project_id: 프로젝트 ID
        user: 현재 사용자
        db: 데이터베이스 세션
        required_role: 필요한 권한 (None이면 멤버십만 확인)
    
    Returns:
        tuple[Project, ProjectMember]: 프로젝트와 멤버 정보
        
    Raises:
        HTTPException: 권한이 없거나 프로젝트를 찾을 수 없는 경우
    """
    # 프로젝트 멤버십 확인
    project_member = db.query(ProjectMember).filter(
        and_(
            ProjectMember.project_id == project_id,
            ProjectMember.user_id == user.id
        )
    ).first()
    
    if not project_member:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have access to this project"
        )
    
    # 특정 권한이 필요한 경우 확인
    if required_role and project_member.role != required_role:
        if required_role == ProjectRole.OWNER and project_member.role != ProjectRole.OWNER:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only project owners can perform this action"
            )
    
    # 프로젝트 존재 확인
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project not found"
        )
    
    return project, project_member


def verify_project_owner(project_id: UUID, user: User, db: Session) -> tuple[Project, ProjectMember]:
    """프로젝트 소유자 권한 확인"""
    return verify_project_access(project_id, user, db, ProjectRole.OWNER)


def verify_project_member(
    project_id: UUID, 
    user: User, 
    db: Session,
    min_role: ProjectRole = ProjectRole.DEVELOPER
) -> tuple[Project, ProjectMember]:
    """
    프로젝트 멤버 권한 확인 (최소 권한 이상)
    
    Args:
        project_id: 프로젝트 ID
        user: 현재 사용자
        db: 데이터베이스 세션
        min_role: 최소 필요 권한 (기본값: DEVELOPER)
    
    Returns:
        tuple[Project, ProjectMember]: 프로젝트와 멤버 정보
        
    Raises:
        HTTPException: 권한이 없거나 프로젝트를 찾을 수 없는 경우
    """
    # 프로젝트 접근 권한 먼저 확인
    project, project_member = verify_project_access(project_id, user, db)
    
    # 권한 계층: OWNER > DEVELOPER
    role_hierarchy = {
        ProjectRole.DEVELOPER: 1,
        ProjectRole.OWNER: 2
    }
    
    user_role_level = role_hierarchy.get(project_member.role, 0)
    min_role_level = role_hierarchy.get(min_role, 0)
    
    if user_role_level < min_role_level:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Minimum {min_role.value} role required for this action"
        )
    
    return project, project_member


def check_project_name_availability(name: str, user: User, db: Session, exclude_project_id: Optional[UUID] = None) -> bool:
    """
    프로젝트 이름 중복 확인
    
    Args:
        name: 확인할 프로젝트 이름
        user: 현재 사용자
        db: 데이터베이스 세션
        exclude_project_id: 제외할 프로젝트 ID (수정 시 사용)
    
    Returns:
        bool: 사용 가능하면 True
    """
    query = db.query(Project).join(ProjectMember).filter(
        and_(
            ProjectMember.user_id == user.id,
            Project.name == name
        )
    )
    
    if exclude_project_id:
        query = query.filter(Project.id != exclude_project_id)
    
    existing_project = query.first()
    return existing_project is None



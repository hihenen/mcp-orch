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


def generate_project_slug(name: str) -> str:
    """
    프로젝트 이름으로부터 URL-safe한 슬러그 생성
    
    Args:
        name: 프로젝트 이름
        
    Returns:
        str: URL-safe한 슬러그
    """
    import re
    import unicodedata
    
    # 유니코드 정규화 및 소문자 변환
    slug = unicodedata.normalize('NFKD', name).lower()
    
    # 특수문자를 하이픈으로 변경
    slug = re.sub(r'[^\w\s-]', '', slug)
    slug = re.sub(r'[-\s]+', '-', slug)
    
    # 앞뒤 하이픈 제거
    slug = slug.strip('-')
    
    return slug or 'untitled'
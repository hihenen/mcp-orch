"""
프로젝트 멤버 관리 API
프로젝트 멤버 추가, 제거, 역할 변경 등
"""

from typing import List
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_
from pydantic import BaseModel, Field

from ..database import get_db
from ..models import Project, ProjectMember, User, ProjectRole, InviteSource
from .jwt_auth import get_user_from_jwt_token

router = APIRouter(prefix="/api", tags=["project-members"])


# Pydantic 모델들
class ProjectMemberCreate(BaseModel):
    user_id: UUID
    role: ProjectRole = ProjectRole.DEVELOPER
    invited_as: InviteSource = InviteSource.INDIVIDUAL


class ProjectMemberUpdate(BaseModel):
    role: ProjectRole


class ProjectMemberResponse(BaseModel):
    id: str
    user_id: str
    user_name: str
    user_email: str
    role: ProjectRole
    invited_as: InviteSource
    invited_by: str
    joined_at: str
    is_current_user: bool = False
    
    class Config:
        from_attributes = True


# 사용자 인증 dependency 함수
async def get_current_user_for_project_members(
    request: Request,
    db: Session = Depends(get_db)
) -> User:
    """프로젝트 멤버 API용 사용자 인증 함수"""
    user = await get_user_from_jwt_token(request, db)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required"
        )
    return user


# 프로젝트 멤버 관리 API
@router.get("/projects/{project_id}/members", response_model=List[ProjectMemberResponse])
async def list_project_members(
    project_id: UUID,
    current_user: User = Depends(get_current_user_for_project_members),
    db: Session = Depends(get_db)
):
    """프로젝트 멤버 목록 조회"""
    
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
    
    # 멤버 목록 조회
    members_query = db.query(ProjectMember, User).join(
        User, ProjectMember.user_id == User.id
    ).filter(ProjectMember.project_id == project_id)
    
    members = []
    for member, user in members_query:
        members.append(ProjectMemberResponse(
            id=str(member.id),
            user_id=str(member.user_id),
            user_name=user.name,
            user_email=user.email,
            role=member.role,
            invited_as=member.invited_as,
            invited_by=str(member.invited_by),
            joined_at=member.joined_at.isoformat() if member.joined_at else "",
            is_current_user=(member.user_id == current_user.id)
        ))
    
    return members


@router.post("/projects/{project_id}/members", response_model=ProjectMemberResponse)
async def add_project_member(
    project_id: UUID,
    member_data: ProjectMemberCreate,
    current_user: User = Depends(get_current_user_for_project_members),
    db: Session = Depends(get_db)
):
    """프로젝트에 멤버 추가 (Owner/Developer만 가능)"""
    
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
            detail="Only project owners and developers can add members"
        )
    
    # 사용자 존재 확인
    user = db.query(User).filter(User.id == member_data.user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    # 이미 멤버인지 확인
    existing_member = db.query(ProjectMember).filter(
        and_(
            ProjectMember.project_id == project_id,
            ProjectMember.user_id == member_data.user_id
        )
    ).first()
    
    if existing_member:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User is already a member of this project"
        )
    
    # 멤버 추가
    new_member = ProjectMember(
        project_id=project_id,
        user_id=member_data.user_id,
        role=member_data.role,
        invited_as=member_data.invited_as,
        invited_by=current_user.id
    )
    
    db.add(new_member)
    db.commit()
    db.refresh(new_member)
    
    return ProjectMemberResponse(
        id=str(new_member.id),
        user_id=str(new_member.user_id),
        user_name=user.name,
        user_email=user.email,
        role=new_member.role,
        invited_as=new_member.invited_as,
        invited_by=str(new_member.invited_by),
        joined_at=new_member.joined_at.isoformat() if new_member.joined_at else ""
    )


@router.put("/projects/{project_id}/members/{member_id}", response_model=ProjectMemberResponse)
async def update_project_member(
    project_id: UUID,
    member_id: UUID,
    member_data: ProjectMemberUpdate,
    current_user: User = Depends(get_current_user_for_project_members),
    db: Session = Depends(get_db)
):
    """프로젝트 멤버 역할 변경 (Owner만 가능)"""
    
    # 프로젝트 Owner 권한 확인
    project_owner = db.query(ProjectMember).filter(
        and_(
            ProjectMember.project_id == project_id,
            ProjectMember.user_id == current_user.id,
            ProjectMember.role == ProjectRole.OWNER
        )
    ).first()
    
    if not project_owner:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only project owners can update member roles"
        )
    
    # 멤버 조회
    member = db.query(ProjectMember).filter(
        and_(
            ProjectMember.id == member_id,
            ProjectMember.project_id == project_id
        )
    ).first()
    
    if not member:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project member not found"
        )
    
    # 자기 자신의 Owner 권한은 변경할 수 없음
    if member.user_id == current_user.id and member.role == ProjectRole.OWNER:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot change your own owner role"
        )
    
    # 역할 업데이트
    member.role = member_data.role
    db.commit()
    db.refresh(member)
    
    # 사용자 정보 조회
    user = db.query(User).filter(User.id == member.user_id).first()
    
    return ProjectMemberResponse(
        id=str(member.id),
        user_id=str(member.user_id),
        user_name=user.name,
        user_email=user.email,
        role=member.role,
        invited_as=member.invited_as,
        invited_by=str(member.invited_by),
        joined_at=member.joined_at.isoformat() if member.joined_at else ""
    )


@router.delete("/projects/{project_id}/members/{member_id}")
async def remove_project_member(
    project_id: UUID,
    member_id: UUID,
    current_user: User = Depends(get_current_user_for_project_members),
    db: Session = Depends(get_db)
):
    """프로젝트에서 멤버 제거 (Owner만 가능)"""
    
    # 프로젝트 Owner 권한 확인
    project_owner = db.query(ProjectMember).filter(
        and_(
            ProjectMember.project_id == project_id,
            ProjectMember.user_id == current_user.id,
            ProjectMember.role == ProjectRole.OWNER
        )
    ).first()
    
    if not project_owner:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only project owners can remove members"
        )
    
    # 멤버 조회
    member = db.query(ProjectMember).filter(
        and_(
            ProjectMember.id == member_id,
            ProjectMember.project_id == project_id
        )
    ).first()
    
    if not member:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project member not found"
        )
    
    # 자기 자신은 제거할 수 없음
    if member.user_id == current_user.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot remove yourself from the project"
        )
    
    # 멤버 제거
    db.delete(member)
    db.commit()
    
    return {"message": "Member removed successfully"}

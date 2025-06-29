"""
프로젝트 멤버 관리 API
개별 멤버 초대, 권한 관리, 제거 기능
"""

from typing import List, Optional
from uuid import UUID
from datetime import datetime
import logging

from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_
from pydantic import BaseModel, Field

from ...database import get_db
from ...models import Project, ProjectMember, User, ProjectRole, InviteSource
from ...models.team import Team, TeamMember
from ...services.activity_logger import ActivityLogger
from .common import get_current_user_for_projects, verify_project_access, verify_project_owner

router = APIRouter()
logger = logging.getLogger(__name__)


# Pydantic Models
class ProjectMemberCreate(BaseModel):
    email: str = Field(..., description="초대할 사용자의 이메일 주소")
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
    invited_by_name: str
    joined_at: datetime
    is_current_user: bool = False
    
    # 팀 정보 (team_member로 초대된 경우)
    team_id: Optional[str] = None
    team_name: Optional[str] = None
    
    class Config:
        from_attributes = True


# Helper Functions
def get_user_by_email(email: str, db: Session) -> Optional[User]:
    """이메일로 사용자 조회"""
    return db.query(User).filter(User.email == email).first()


def check_existing_membership(project_id: UUID, user_id: UUID, db: Session) -> bool:
    """기존 멤버십 확인"""
    existing_member = db.query(ProjectMember).filter(
        and_(
            ProjectMember.project_id == project_id,
            ProjectMember.user_id == user_id
        )
    ).first()
    return existing_member is not None


# API Endpoints
@router.get("/projects/{project_id}/members", response_model=List[ProjectMemberResponse])
async def list_project_members(
    project_id: UUID,
    current_user: User = Depends(get_current_user_for_projects),
    db: Session = Depends(get_db)
):
    """프로젝트 멤버 목록 조회"""
    
    # 프로젝트 접근 권한 확인
    project, _ = verify_project_access(project_id, current_user, db)
    
    # 프로젝트 멤버들 조회 (팀 정보 포함) - User 테이블 alias 사용
    from sqlalchemy.orm import aliased
    
    invited_by_user = aliased(User)
    
    members_query = db.query(
        ProjectMember,
        User,
        invited_by_user.name.label('invited_by_name')
    ).join(
        User, ProjectMember.user_id == User.id
    ).outerjoin(
        invited_by_user, ProjectMember.invited_by == invited_by_user.id
    ).filter(
        ProjectMember.project_id == project_id
    ).order_by(
        ProjectMember.role,  # Owner -> Developer 순
        ProjectMember.joined_at
    )
    
    results = members_query.all()
    
    # 팀 정보도 함께 조회 (team_member로 초대된 경우)
    team_info_map = {}
    team_member_ids = [
        str(member.user_id) for member, user, invited_by_name in results 
        if member.invited_as == InviteSource.TEAM_MEMBER
    ]
    
    if team_member_ids:
        team_members = db.query(TeamMember, Team).join(
            Team, TeamMember.team_id == Team.id
        ).filter(
            TeamMember.user_id.in_(team_member_ids)
        ).all()
        
        for team_member, team in team_members:
            team_info_map[str(team_member.user_id)] = {
                "team_id": str(team.id),
                "team_name": team.name
            }
    
    logger.info(f"Retrieved {len(results)} members for project {project_id}")
    
    return [
        ProjectMemberResponse(
            id=str(member.id),
            user_id=str(member.user_id),
            user_name=user.name,
            user_email=user.email,
            role=member.role,
            invited_as=member.invited_as,
            invited_by=str(member.invited_by),
            invited_by_name=invited_by_name or "Unknown",
            joined_at=member.joined_at,
            is_current_user=(member.user_id == current_user.id),
            team_id=team_info_map.get(str(member.user_id), {}).get("team_id"),
            team_name=team_info_map.get(str(member.user_id), {}).get("team_name")
        )
        for member, user, invited_by_name in results
    ]


@router.post("/projects/{project_id}/members", response_model=ProjectMemberResponse)
async def invite_project_member(
    project_id: UUID,
    member_data: ProjectMemberCreate,
    current_user: User = Depends(get_current_user_for_projects),
    db: Session = Depends(get_db)
):
    """프로젝트에 개별 멤버 초대"""
    
    # 프로젝트 접근 권한 확인 (Owner만 가능)
    project, _ = verify_project_owner(project_id, current_user, db)
    
    # 초대할 사용자 조회
    invited_user = get_user_by_email(member_data.email, db)
    if not invited_user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"User with email '{member_data.email}' not found"
        )
    
    # 이미 프로젝트 멤버인지 확인
    if check_existing_membership(project_id, invited_user.id, db):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="User is already a member of this project"
        )
    
    # 자기 자신을 초대하려는 경우 확인
    if invited_user.id == current_user.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You cannot invite yourself"
        )
    
    # 새 멤버 추가
    new_member = ProjectMember(
        project_id=project_id,
        user_id=invited_user.id,
        role=member_data.role,
        invited_as=member_data.invited_as,
        invited_by=current_user.id
    )
    
    db.add(new_member)
    db.commit()
    db.refresh(new_member)
    
    # 활동 로깅
    try:
        activity_logger = ActivityLogger()
        await activity_logger.log_activity(
            db=db,
            user_id=current_user.id,
            project_id=project_id,
            activity_type="member_invited",
            description=f"사용자 '{invited_user.name}' 초대 ({member_data.role.value})",
            metadata={
                "invited_user_id": str(invited_user.id),
                "invited_user_email": invited_user.email,
                "role": member_data.role.value,
                "invited_as": member_data.invited_as.value
            }
        )
    except Exception as e:
        logger.warning(f"Failed to log member invitation activity: {e}")
    
    logger.info(f"Invited user '{invited_user.email}' to project {project_id}")
    
    # 초대자 정보 조회
    inviter = db.query(User).filter(User.id == current_user.id).first()
    
    return ProjectMemberResponse(
        id=str(new_member.id),
        user_id=str(new_member.user_id),
        user_name=invited_user.name,
        user_email=invited_user.email,
        role=new_member.role,
        invited_as=new_member.invited_as,
        invited_by=str(new_member.invited_by),
        invited_by_name=inviter.name if inviter else "Unknown",
        joined_at=new_member.joined_at,
        is_current_user=False
    )


@router.put("/projects/{project_id}/members/{member_id}", response_model=ProjectMemberResponse)
async def update_project_member(
    project_id: UUID,
    member_id: UUID,
    member_data: ProjectMemberUpdate,
    current_user: User = Depends(get_current_user_for_projects),
    db: Session = Depends(get_db)
):
    """프로젝트 멤버 권한 수정 (Owner만 가능)"""
    
    # 프로젝트 소유자 권한 확인
    project, _ = verify_project_owner(project_id, current_user, db)
    
    # 수정할 멤버 조회
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
    
    # 자기 자신의 권한을 변경하려는 경우 방지
    if member.user_id == current_user.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You cannot change your own role"
        )
    
    # 권한이 실제로 변경되는지 확인
    if member.role == member_data.role:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Member already has this role"
        )
    
    old_role = member.role
    member.role = member_data.role
    
    db.commit()
    db.refresh(member)
    
    # 멤버 사용자 정보 조회
    user = db.query(User).filter(User.id == member.user_id).first()
    inviter = db.query(User).filter(User.id == member.invited_by).first()
    
    # 활동 로깅
    try:
        activity_logger = ActivityLogger()
        await activity_logger.log_activity(
            db=db,
            user_id=current_user.id,
            project_id=project_id,
            activity_type="member_role_updated",
            description=f"사용자 '{user.name}' 권한 변경: {old_role.value} → {member_data.role.value}",
            metadata={
                "member_user_id": str(member.user_id),
                "old_role": old_role.value,
                "new_role": member_data.role.value
            }
        )
    except Exception as e:
        logger.warning(f"Failed to log member role update activity: {e}")
    
    logger.info(f"Updated member {member_id} role in project {project_id}")
    
    return ProjectMemberResponse(
        id=str(member.id),
        user_id=str(member.user_id),
        user_name=user.name if user else "Unknown",
        user_email=user.email if user else "unknown@example.com",
        role=member.role,
        invited_as=member.invited_as,
        invited_by=str(member.invited_by),
        invited_by_name=inviter.name if inviter else "Unknown",
        joined_at=member.joined_at,
        is_current_user=(member.user_id == current_user.id)
    )


@router.delete("/projects/{project_id}/members/{member_id}")
async def remove_project_member(
    project_id: UUID,
    member_id: UUID,
    current_user: User = Depends(get_current_user_for_projects),
    db: Session = Depends(get_db)
):
    """프로젝트에서 멤버 제거 (Owner만 가능)"""
    
    # 프로젝트 소유자 권한 확인
    project, _ = verify_project_owner(project_id, current_user, db)
    
    # 제거할 멤버 조회
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
    
    # 자기 자신을 제거하려는 경우 방지
    if member.user_id == current_user.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You cannot remove yourself from the project"
        )
    
    # 멤버 사용자 정보 조회 (삭제 전에)
    user = db.query(User).filter(User.id == member.user_id).first()
    
    # 멤버 제거
    db.delete(member)
    db.commit()
    
    # 활동 로깅
    try:
        activity_logger = ActivityLogger()
        await activity_logger.log_activity(
            db=db,
            user_id=current_user.id,
            project_id=project_id,
            activity_type="member_removed",
            description=f"사용자 '{user.name if user else 'Unknown'}' 제거",
            metadata={
                "removed_user_id": str(member.user_id),
                "removed_user_email": user.email if user else "unknown@example.com",
                "role": member.role.value
            }
        )
    except Exception as e:
        logger.warning(f"Failed to log member removal activity: {e}")
    
    logger.info(f"Removed member {member_id} from project {project_id}")
    
    return {"message": "Member removed successfully"}
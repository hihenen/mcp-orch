"""
프로젝트 팀 관리 API
팀 초대, 멤버 관리, 팀 권한 설정 기능
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
from ...models.team import Team, TeamMember, TeamRole
from ...services.activity_logger import ActivityLogger
from .common import get_current_user_for_projects, verify_project_access, verify_project_owner

router = APIRouter()
logger = logging.getLogger(__name__)


# Pydantic Models
class TeamInviteCreate(BaseModel):
    team_id: str = Field(..., description="초대할 팀의 ID")
    role: ProjectRole = ProjectRole.DEVELOPER
    invite_message: Optional[str] = Field(None, description="초대 메시지")


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


class TeamCreateRequest(BaseModel):
    name: str = Field(..., min_length=1, max_length=100, description="팀 이름")
    description: Optional[str] = Field(None, max_length=500, description="팀 설명")
    team_id: Optional[str] = Field(None, description="기존 팀 ID (연결하려는 경우)")


class TeamResponse(BaseModel):
    id: str
    name: str
    description: Optional[str] = None
    member_count: int
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True


class TeamInviteResponse(BaseModel):
    team_id: str
    team_name: str
    added_members: List[ProjectMemberResponse]
    skipped_members: List[dict]  # 이미 존재하는 멤버들
    total_invited: int
    success: bool = True  # 팀 초대 성공 여부 (일부라도 추가되면 성공)
    message: str = ""  # 상세 메시지
    
    class Config:
        from_attributes = True


# Helper Functions
def get_user_teams(user: User, db: Session) -> List[Team]:
    """사용자가 속한 팀들 조회"""
    return db.query(Team).join(TeamMember).filter(
        TeamMember.user_id == user.id
    ).all()


def check_existing_team_membership(project_id: UUID, team_id: UUID, db: Session) -> List[ProjectMember]:
    """프로젝트에 이미 속한 팀 멤버들 조회"""
    team_member_user_ids = db.query(TeamMember.user_id).filter(
        TeamMember.team_id == team_id
    ).subquery()
    
    existing_members = db.query(ProjectMember).filter(
        and_(
            ProjectMember.project_id == project_id,
            ProjectMember.user_id.in_(team_member_user_ids)
        )
    ).all()
    
    return existing_members


# API Endpoints
@router.get("/projects/{project_id}/available-teams")
async def get_available_teams_for_project(
    project_id: UUID,
    current_user: User = Depends(get_current_user_for_projects),
    db: Session = Depends(get_db)
):
    """프로젝트에 초대 가능한 팀 목록 조회 (Owner만 가능)"""
    
    # 프로젝트 소유자 권한 확인
    project, _ = verify_project_owner(project_id, current_user, db)
    
    # 현재 사용자가 속한 팀들 조회
    user_teams = get_user_teams(current_user, db)
    
    # 각 팀의 멤버 수와 프로젝트 참여 여부 확인
    available_teams = []
    for team in user_teams:
        # 팀의 총 멤버 수
        total_members = db.query(TeamMember).filter(TeamMember.team_id == team.id).count()
        
        # 이미 프로젝트에 참여 중인 팀 멤버 수
        existing_members = check_existing_team_membership(project_id, team.id, db)
        participating_members = len(existing_members)
        
        available_teams.append({
            "id": str(team.id),
            "name": team.name,
            "description": team.description,
            "total_members": total_members,
            "participating_members": participating_members,
            "can_invite": total_members > participating_members,
            "is_fully_participating": total_members == participating_members
        })
    
    logger.info(f"Found {len(available_teams)} available teams for project {project_id}")
    
    return available_teams


@router.post("/projects/{project_id}/teams/invite", response_model=TeamInviteResponse)
async def invite_team_to_project(
    project_id: UUID,
    invite_data: TeamInviteCreate,
    current_user: User = Depends(get_current_user_for_projects),
    db: Session = Depends(get_db)
):
    """프로젝트에 팀 초대 (Owner만 가능)"""
    
    # 프로젝트 소유자 권한 확인
    project, _ = verify_project_owner(project_id, current_user, db)
    
    # 팀 존재 확인
    team = db.query(Team).filter(Team.id == UUID(invite_data.team_id)).first()
    if not team:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Team not found"
        )
    
    # 현재 사용자가 해당 팀의 멤버인지 확인
    user_team_membership = db.query(TeamMember).filter(
        and_(
            TeamMember.team_id == team.id,
            TeamMember.user_id == current_user.id
        )
    ).first()
    
    if not user_team_membership:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You are not a member of this team"
        )
    
    # 팀의 모든 멤버 조회
    team_members = db.query(TeamMember, User).join(
        User, TeamMember.user_id == User.id
    ).filter(
        TeamMember.team_id == team.id
    ).all()
    
    if not team_members:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Team has no members"
        )
    
    # 이미 프로젝트에 속한 멤버들 확인
    existing_members = check_existing_team_membership(project_id, team.id, db)
    existing_user_ids = {member.user_id for member in existing_members}
    
    added_members = []
    skipped_members = []
    
    # 각 팀 멤버를 프로젝트에 추가
    for team_member, user in team_members:
        if user.id in existing_user_ids:
            # 이미 프로젝트 멤버인 경우
            skipped_members.append({
                "user_id": str(user.id),
                "user_name": user.name,
                "user_email": user.email,
                "reason": "Already a project member"
            })
            continue
        
        # 새 프로젝트 멤버 추가
        new_member = ProjectMember(
            project_id=project_id,
            user_id=user.id,
            role=invite_data.role,
            invited_as=InviteSource.TEAM_MEMBER,
            invited_by=current_user.id
        )
        
        db.add(new_member)
        db.flush()  # ID 생성을 위해 flush
        
        # 응답용 멤버 정보 생성
        member_response = ProjectMemberResponse(
            id=str(new_member.id),
            user_id=str(new_member.user_id),
            user_name=user.name,
            user_email=user.email,
            role=new_member.role,
            invited_as=new_member.invited_as,
            invited_by=str(new_member.invited_by),
            invited_by_name=current_user.name,
            joined_at=new_member.joined_at,
            is_current_user=(user.id == current_user.id),
            team_id=str(team.id),
            team_name=team.name
        )
        
        added_members.append(member_response)
    
    # 커밋
    db.commit()
    
    # 결과 메시지 생성
    total_invited = len(added_members)
    success = total_invited > 0
    
    if total_invited == 0:
        message = "No new members were added (all team members are already in the project)"
    elif len(skipped_members) == 0:
        message = f"Successfully added all {total_invited} team members to the project"
    else:
        message = f"Added {total_invited} new members, skipped {len(skipped_members)} existing members"
    
    # 활동 로깅
    try:
        ActivityLogger.log_activity(
            db=db,
            user_id=current_user.id,
            project_id=project_id,
            action="team_invited",
            description=f"팀 '{team.name}' 초대 ({total_invited}명 추가)",
            meta_data={
                "team_id": str(team.id),
                "team_name": team.name,
                "role": invite_data.role.value,
                "added_members_count": total_invited,
                "skipped_members_count": len(skipped_members),
                "invite_message": invite_data.invite_message
            }
        )
    except Exception as e:
        logger.warning(f"Failed to log team invitation activity: {e}")
    
    logger.info(f"Invited team '{team.name}' to project {project_id}: {total_invited} added, {len(skipped_members)} skipped")
    
    return TeamInviteResponse(
        team_id=str(team.id),
        team_name=team.name,
        added_members=added_members,
        skipped_members=skipped_members,
        total_invited=total_invited,
        success=success,
        message=message
    )


@router.get("/projects/{project_id}/team-members")
async def get_project_team_members(
    project_id: UUID,
    team_id: Optional[str] = None,
    current_user: User = Depends(get_current_user_for_projects),
    db: Session = Depends(get_db)
):
    """프로젝트 내 팀으로 초대된 멤버들 조회"""
    
    # 프로젝트 접근 권한 확인
    project, _ = verify_project_access(project_id, current_user, db)
    
    # 기본 쿼리: 팀 멤버로 초대된 프로젝트 멤버들
    query = db.query(
        ProjectMember,
        User,
        User.name.label('invited_by_name'),
        Team,
        TeamMember
    ).join(
        User, ProjectMember.user_id == User.id
    ).outerjoin(
        User, ProjectMember.invited_by == User.id  # 초대자 정보
    ).join(
        TeamMember, and_(
            TeamMember.user_id == ProjectMember.user_id,
            ProjectMember.invited_as == InviteSource.TEAM_MEMBER
        )
    ).join(
        Team, TeamMember.team_id == Team.id
    ).filter(
        and_(
            ProjectMember.project_id == project_id,
            ProjectMember.invited_as == InviteSource.TEAM_MEMBER
        )
    )
    
    # 특정 팀 필터
    if team_id:
        query = query.filter(Team.id == UUID(team_id))
    
    query = query.order_by(Team.name, User.name)
    results = query.all()
    
    # 팀별로 그룹화하여 응답 생성
    team_members_map = {}
    for project_member, user, invited_by_name, team, team_member in results:
        team_key = str(team.id)
        
        if team_key not in team_members_map:
            team_members_map[team_key] = {
                "team_id": str(team.id),
                "team_name": team.name,
                "team_description": team.description,
                "members": []
            }
        
        member_info = {
            "id": str(project_member.id),
            "user_id": str(project_member.user_id),
            "user_name": user.name,
            "user_email": user.email,
            "role": project_member.role,
            "invited_as": project_member.invited_as,
            "invited_by": str(project_member.invited_by),
            "invited_by_name": invited_by_name or "Unknown",
            "joined_at": project_member.joined_at,
            "is_current_user": (project_member.user_id == current_user.id),
            "team_role": team_member.role if team_member else None
        }
        
        team_members_map[team_key]["members"].append(member_info)
    
    # 리스트 형태로 변환
    team_members_list = list(team_members_map.values())
    
    logger.info(f"Retrieved team members for project {project_id}: {len(results)} members across {len(team_members_list)} teams")
    
    return team_members_list


@router.delete("/projects/{project_id}/teams/{team_id}/members")
async def remove_team_from_project(
    project_id: UUID,
    team_id: UUID,
    current_user: User = Depends(get_current_user_for_projects),
    db: Session = Depends(get_db)
):
    """프로젝트에서 팀 전체 제거 (Owner만 가능)"""
    
    # 프로젝트 소유자 권한 확인
    project, _ = verify_project_owner(project_id, current_user, db)
    
    # 팀 존재 확인
    team = db.query(Team).filter(Team.id == team_id).first()
    if not team:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Team not found"
        )
    
    # 해당 팀으로 초대된 프로젝트 멤버들 조회
    team_project_members = db.query(ProjectMember).join(
        TeamMember, ProjectMember.user_id == TeamMember.user_id
    ).filter(
        and_(
            ProjectMember.project_id == project_id,
            ProjectMember.invited_as == InviteSource.TEAM_MEMBER,
            TeamMember.team_id == team_id
        )
    ).all()
    
    if not team_project_members:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No team members found in this project"
        )
    
    # 프로젝트 소유자는 제거할 수 없음
    owner_members = [
        member for member in team_project_members 
        if member.role == ProjectRole.OWNER
    ]
    
    if owner_members:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot remove team members with Owner role. Change their role first."
        )
    
    removed_count = len(team_project_members)
    
    # 팀 멤버들 제거
    for member in team_project_members:
        db.delete(member)
    
    db.commit()
    
    # 활동 로깅
    try:
        ActivityLogger.log_activity(
            db=db,
            user_id=current_user.id,
            project_id=project_id,
            action="team_removed",
            description=f"팀 '{team.name}' 제거 ({removed_count}명)",
            meta_data={
                "team_id": str(team.id),
                "team_name": team.name,
                "removed_members_count": removed_count
            }
        )
    except Exception as e:
        logger.warning(f"Failed to log team removal activity: {e}")
    
    logger.info(f"Removed team '{team.name}' from project {project_id}: {removed_count} members removed")
    
    return {
        "message": f"Team '{team.name}' removed from project successfully",
        "removed_members_count": removed_count
    }


@router.post("/projects/{project_id}/teams", response_model=TeamResponse)
async def create_or_connect_team_to_project(
    project_id: UUID,
    team_request: TeamCreateRequest,
    current_user: User = Depends(get_current_user_for_projects),
    db: Session = Depends(get_db)
):
    """
    프로젝트에 새 팀을 생성하거나 기존 팀을 연결합니다.
    
    - team_id가 제공되면 기존 팀을 프로젝트에 연결
    - team_id가 없으면 새 팀을 생성하고 프로젝트에 연결
    """
    # 프로젝트 존재 및 권한 확인
    project = verify_project_access(db, project_id, current_user.id)
    verify_project_owner(project, current_user.id)
    
    if team_request.team_id:
        # 기존 팀을 프로젝트에 연결
        try:
            team_uuid = UUID(team_request.team_id)
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid team ID format"
            )
        
        team = db.query(Team).filter(Team.id == team_uuid).first()
        if not team:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Team not found"
            )
        
        # 사용자가 해당 팀의 멤버인지 확인
        team_membership = db.query(TeamMember).filter(
            and_(
                TeamMember.team_id == team.id,
                TeamMember.user_id == current_user.id
            )
        ).first()
        
        if not team_membership:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You are not a member of this team"
            )
        
        # 팀이 이미 프로젝트에 연결되어 있는지 확인
        existing_connection = db.query(ProjectMember).join(
            TeamMember, and_(
                ProjectMember.user_id == TeamMember.user_id,
                TeamMember.team_id == team.id
            )
        ).filter(
            ProjectMember.project_id == project_id
        ).first()
        
        if existing_connection:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Team is already connected to this project"
            )
        
        action_description = f"기존 팀 '{team.name}' 프로젝트에 연결"
        
    else:
        # 새 팀 생성
        team = Team(
            name=team_request.name,
            slug=team_request.name.lower().replace(' ', '-').replace('_', '-'),
            description=team_request.description,
            max_api_keys=10,  # 기본 제한
            max_members=20    # 기본 제한
        )
        
        db.add(team)
        db.flush()  # 팀 ID 생성
        
        # 생성자를 팀 소유자로 추가
        team_membership = TeamMember(
            user_id=current_user.id,
            team_id=team.id,
            role=TeamRole.OWNER,
            invited_by_id=current_user.id,
            invited_at=datetime.utcnow(),
            joined_at=datetime.utcnow()
        )
        
        db.add(team_membership)
        action_description = f"새 팀 '{team.name}' 생성 및 프로젝트에 연결"
    
    # 팀 멤버들을 프로젝트에 추가
    team_members = db.query(TeamMember).filter(TeamMember.team_id == team.id).all()
    added_members = []
    
    for team_member in team_members:
        # 이미 프로젝트 멤버인지 확인
        existing_member = db.query(ProjectMember).filter(
            and_(
                ProjectMember.project_id == project_id,
                ProjectMember.user_id == team_member.user_id
            )
        ).first()
        
        if not existing_member:
            # 팀 역할을 프로젝트 역할로 매핑
            if team_member.role == TeamRole.OWNER:
                project_role = ProjectRole.OWNER
            elif team_member.role == TeamRole.ADMIN:
                project_role = ProjectRole.ADMIN
            else:
                project_role = ProjectRole.DEVELOPER
            
            project_member = ProjectMember(
                project_id=project_id,
                user_id=team_member.user_id,
                role=project_role,
                invited_as=InviteSource.TEAM_MEMBER,
                invited_by=current_user.id,
                joined_at=datetime.utcnow()
            )
            
            db.add(project_member)
            added_members.append(team_member.user_id)
    
    db.commit()
    db.refresh(team)
    
    # 멤버 수 계산
    member_count = db.query(TeamMember).filter(TeamMember.team_id == team.id).count()
    
    # 활동 로깅
    try:
        ActivityLogger.log_activity(
            db=db,
            user_id=current_user.id,
            project_id=project_id,
            action="team_connected" if team_request.team_id else "team_created",
            description=action_description,
            meta_data={
                "team_id": str(team.id),
                "team_name": team.name,
                "added_members_count": len(added_members),
                "is_new_team": not bool(team_request.team_id)
            }
        )
    except Exception as e:
        logger.warning(f"Failed to log team creation/connection activity: {e}")
    
    logger.info(f"{action_description} - {len(added_members)}명 추가됨")
    
    return TeamResponse(
        id=str(team.id),
        name=team.name,
        description=team.description,
        member_count=member_count,
        created_at=team.created_at,
        updated_at=team.updated_at
    )
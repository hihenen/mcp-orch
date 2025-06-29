"""Team management API endpoints."""
from datetime import datetime
from typing import List, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status, Request
from pydantic import BaseModel, Field
from sqlalchemy import and_, func, desc, asc
from sqlalchemy.orm import Session, joinedload

from ..database import get_db
from ..models.team import Team, TeamMember, TeamRole
from ..models.user import User
from ..models.api_key import ApiKey
from ..models.mcp_server import McpServer
from ..models import Project, ProjectMember, ProjectRole, InviteSource
from ..models.activity import Activity, ActivityType, ActivitySeverity
from ..services.activity_logger import ActivityLogger
from .header_auth import get_user_from_headers
from .jwt_auth import get_current_user, verify_jwt_token, get_user_from_jwt_token

router = APIRouter(prefix="/api/teams", tags=["teams"])


# Pydantic models for API
class TeamResponse(BaseModel):
    """Team information."""
    id: str
    name: str
    created_at: datetime
    updated_at: datetime
    member_count: int = 0
    user_role: str = "member"

    class Config:
        from_attributes = True


class CreateTeamRequest(BaseModel):
    """Request to create a new team."""
    name: str = Field(..., description="Name of the team")


class TeamMemberResponse(BaseModel):
    """Team member information."""
    id: str
    user_id: str
    name: str
    email: str
    role: TeamRole
    joined_at: Optional[datetime]
    avatar_url: Optional[str] = None
    is_current_user: bool = False

    class Config:
        from_attributes = True




class TeamApiKeyResponse(BaseModel):
    """Team API key information."""
    id: str
    name: str
    key_prefix: str
    is_active: bool
    expires_at: Optional[datetime]
    created_at: datetime
    last_used_at: Optional[datetime]

    class Config:
        from_attributes = True


class TeamActivityResponse(BaseModel):
    """Team activity information."""
    id: str
    type: str
    description: str
    user_name: str
    timestamp: datetime

    class Config:
        from_attributes = True


class InviteMemberRequest(BaseModel):
    """Request to invite a team member."""
    email: str = Field(..., description="Email address of the user to invite")
    role: TeamRole = Field(default=TeamRole.DEVELOPER, description="Role to assign")


class CreateApiKeyRequest(BaseModel):
    """Request to create a new API key."""
    name: str = Field(..., description="Name for the API key")


class UpdateMemberRoleRequest(BaseModel):
    """Request to update member role."""
    role: TeamRole = Field(..., description="New role to assign")


def get_user_from_jwt_token(request: Request, db: Session) -> User:
    """
    JWT 토큰에서만 사용자 정보를 가져옵니다.
    Authorization 헤더의 Bearer 토큰만 지원합니다.
    """
    # Authorization 헤더에서 JWT 토큰 확인
    auth_header = request.headers.get("authorization")
    if not auth_header or not auth_header.startswith("Bearer "):
        print("❌ No Authorization header or invalid format")
        return None
    
    token = auth_header.split(" ")[1]
    print(f"🔍 JWT token found: {token[:30]}...")
    
    jwt_user = verify_jwt_token(token)
    if not jwt_user:
        print("❌ JWT token verification failed")
        return None
    
    print(f"✅ JWT token verified for user: {jwt_user.email}")
    
    # 데이터베이스에서 사용자 찾기 또는 생성
    user = db.query(User).filter(User.id == jwt_user.id).first()
    if not user:
        # 사용자가 존재하지 않으면 생성 (NextAuth.js 통합)
        user = User(
            id=jwt_user.id,
            email=jwt_user.email,
            name=jwt_user.name or jwt_user.email
        )
        db.add(user)
        db.commit()
        db.refresh(user)
        print(f"✅ Created new user from JWT: {user.email}")
    
    return user


def get_team_and_verify_access(
    team_id: str,
    current_user: User,
    db: Session,
    required_role: TeamRole = TeamRole.REPORTER
) -> tuple[Team, TeamMember]:
    """Get team and verify user has required access level."""
    try:
        team_uuid = UUID(team_id)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid team ID format"
        )
    
    # Get team and user's membership
    team = db.query(Team).filter(Team.id == team_uuid).first()
    if not team:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Team not found"
        )
    
    membership = db.query(TeamMember).filter(
        and_(
            TeamMember.team_id == team_uuid,
            TeamMember.user_id == current_user.id
        )
    ).first()
    
    if not membership:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You are not a member of this team"
        )
    
    # Check role hierarchy
    role_hierarchy = {
        TeamRole.REPORTER: 1,
        TeamRole.DEVELOPER: 2,
        TeamRole.OWNER: 3
    }
    
    if role_hierarchy[membership.role] < role_hierarchy[required_role]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Insufficient permissions. Required: {required_role.value}"
        )
    
    return team, membership


@router.get("/", response_model=List[TeamResponse])
async def get_teams(
    request: Request,
    db: Session = Depends(get_db)
):
    """Get teams for the current user"""
    
    # JWT 미들웨어에서 이미 인증된 사용자 가져오기
    current_user = getattr(request.state, 'user', None)
    
    # 디버깅 정보 출력
    print(f"🔍 Teams API - Request headers: {dict(request.headers)}")
    print(f"🔍 Teams API - Current user: {current_user}")
    
    if not current_user:
        print("❌ No authenticated user found")
        raise HTTPException(status_code=401, detail="Authentication required")
    
    print(f"✅ Authenticated user: {current_user.id} ({current_user.email})")
    
    try:
        # 사용자가 속한 팀과 멤버십 정보를 함께 조회
        teams_with_membership = (
            db.query(Team, TeamMember)
            .join(TeamMember, Team.id == TeamMember.team_id)
            .filter(TeamMember.user_id == current_user.id)
            .all()
        )
        
        print(f"✅ Found {len(teams_with_membership)} teams for user {current_user.id}")
        
        result = []
        for team, membership in teams_with_membership:
            # 각 팀의 멤버 수 계산
            member_count = db.query(TeamMember).filter(
                TeamMember.team_id == team.id
            ).count()
            
            result.append(TeamResponse(
                id=str(team.id),
                name=team.name,
                created_at=team.created_at,
                updated_at=team.updated_at,
                member_count=member_count,
                user_role=membership.role.value
            ))
        
        return result
        
    except Exception as e:
        print(f"❌ Database error in get_teams: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Database error: {str(e)}"
        )


@router.get("/{team_id}", response_model=TeamResponse)
async def get_team_detail(
    team_id: str,
    request: Request,
    db: Session = Depends(get_db)
):
    """Get detailed information about a specific team."""
    current_user = getattr(request.state, 'user', None)
    
    if not current_user:
        raise HTTPException(status_code=401, detail="Authentication required")
    
    team, membership = get_team_and_verify_access(team_id, current_user, db)
    
    # Get member count
    member_count = db.query(TeamMember).filter(
        TeamMember.team_id == team.id
    ).count()
    
    return TeamResponse(
        id=str(team.id),
        name=team.name,
        created_at=team.created_at,
        updated_at=team.updated_at,
        member_count=member_count,
        user_role=membership.role.value
    )


@router.post("/", response_model=TeamResponse)
async def create_team(
    team_request: CreateTeamRequest,
    request: Request,
    db: Session = Depends(get_db)
):
    """Create a new team."""
    # JWT 토큰 전용 인증
    current_user = getattr(request.state, 'user', None)
    
    if not current_user:
        print("❌ No authenticated user found for team creation")
        raise HTTPException(status_code=401, detail="Authentication required")
    
    # Create team
    team = Team(
        name=team_request.name,
        slug=team_request.name.lower().replace(' ', '-'),  # Generate slug from name
        max_api_keys=10,  # Default limit
        max_members=20    # Default limit
    )
    
    db.add(team)
    db.flush()  # Get the team ID
    
    # Add creator as owner
    membership = TeamMember(
        user_id=current_user.id,
        team_id=team.id,
        role=TeamRole.OWNER,
        invited_by_id=current_user.id,
        invited_at=datetime.utcnow(),
        joined_at=datetime.utcnow()
    )
    
    db.add(membership)
    db.commit()
    db.refresh(team)
    
    # 팀 생성 활동 로깅
    ActivityLogger.log_team_created(
        team_id=team.id,
        user_id=current_user.id,
        team_name=team.name,
        db=db
    )
    
    return TeamResponse(
        id=str(team.id),
        name=team.name,
        created_at=team.created_at,
        updated_at=team.updated_at,
        member_count=1,
        user_role=TeamRole.OWNER.value
    )


@router.get("/{team_id}/members", response_model=List[TeamMemberResponse])
async def get_team_members(
    team_id: str,
    request: Request,
    db: Session = Depends(get_db)
):
    """Get all members of a team."""
    current_user = getattr(request.state, 'user', None)
    
    if not current_user:
        raise HTTPException(status_code=401, detail="Authentication required")
    team, _ = get_team_and_verify_access(team_id, current_user, db)
    
    members = db.query(TeamMember).options(
        joinedload(TeamMember.user)
    ).filter(
        TeamMember.team_id == team.id
    ).all()
    
    return [
        TeamMemberResponse(
            id=str(member.id),
            user_id=str(member.user_id),
            name=member.user.name,
            email=member.user.email,
            role=member.role,
            joined_at=member.joined_at,
            avatar_url=None,  # TODO: Add avatar support
            is_current_user=(member.user_id == current_user.id)
        )
        for member in members
    ]


@router.post("/{team_id}/members/invite")
async def invite_team_member(
    team_id: str,
    invite_request: InviteMemberRequest,
    request: Request,
    db: Session = Depends(get_db)
):
    """Invite a new member to the team."""
    current_user = getattr(request.state, 'user', None)
    
    if not current_user:
        raise HTTPException(status_code=401, detail="Authentication required")
    team, _ = get_team_and_verify_access(team_id, current_user, db, TeamRole.OWNER)
    
    # Check if user exists
    user = db.query(User).filter(User.email == invite_request.email).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User with this email not found"
        )
    
    # Check if user is already a member
    existing_membership = db.query(TeamMember).filter(
        and_(
            TeamMember.team_id == team.id,
            TeamMember.user_id == user.id
        )
    ).first()
    
    if existing_membership:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User is already a member of this team"
        )
    
    # Create membership
    membership = TeamMember(
        user_id=user.id,
        team_id=team.id,
        role=invite_request.role,
        invited_by_id=current_user.id,
        invited_at=datetime.utcnow(),
        joined_at=datetime.utcnow()  # Auto-join for now
    )
    
    db.add(membership)
    db.commit()
    
    # 멤버 초대 활동 로깅
    ActivityLogger.log_team_member_joined(
        team_id=team.id,
        user_id=user.id,
        team_name=team.name,
        user_name=user.name,
        role=invite_request.role.value,
        db=db
    )
    
    return {"message": "Member invited successfully"}


@router.put("/{team_id}/members/{user_id}/role")
async def update_member_role(
    team_id: str,
    user_id: str,
    role_request: UpdateMemberRoleRequest,
    request: Request,
    db: Session = Depends(get_db)
):
    """Update a team member's role."""
    current_user = getattr(request.state, 'user', None)
    
    if not current_user:
        raise HTTPException(status_code=401, detail="Authentication required")
    team, _ = get_team_and_verify_access(team_id, current_user, db, TeamRole.OWNER)
    
    try:
        user_uuid = UUID(user_id)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid user ID format"
        )
    
    # Get the membership to update
    membership = db.query(TeamMember).filter(
        and_(
            TeamMember.team_id == team.id,
            TeamMember.user_id == user_uuid
        )
    ).first()
    
    if not membership:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Member not found in this team"
        )
    
    # Prevent changing owner role if it's the last owner
    if membership.role == TeamRole.OWNER and role_request.role != TeamRole.OWNER:
        owner_count = db.query(TeamMember).filter(
            and_(
                TeamMember.team_id == team.id,
                TeamMember.role == TeamRole.OWNER
            )
        ).count()
        
        if owner_count <= 1:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot remove the last owner from the team"
            )
    
    membership.role = role_request.role
    db.commit()
    
    return {"message": "Member role updated successfully"}


@router.delete("/{team_id}/members/{user_id}")
async def remove_team_member(
    team_id: str,
    user_id: str,
    request: Request,
    db: Session = Depends(get_db)
):
    """Remove a member from the team."""
    current_user = getattr(request.state, 'user', None)
    
    if not current_user:
        raise HTTPException(status_code=401, detail="Authentication required")
    team, _ = get_team_and_verify_access(team_id, current_user, db, TeamRole.OWNER)
    
    try:
        user_uuid = UUID(user_id)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid user ID format"
        )
    
    # Get the membership to remove
    membership = db.query(TeamMember).filter(
        and_(
            TeamMember.team_id == team.id,
            TeamMember.user_id == user_uuid
        )
    ).first()
    
    if not membership:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Member not found in this team"
        )
    
    # Prevent removing the last owner
    if membership.role == TeamRole.OWNER:
        owner_count = db.query(TeamMember).filter(
            and_(
                TeamMember.team_id == team.id,
                TeamMember.role == TeamRole.OWNER
            )
        ).count()
        
        if owner_count <= 1:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot remove the last owner from the team"
            )
    
    db.delete(membership)
    db.commit()
    
    return {"message": "Member removed successfully"}






@router.get("/{team_id}/api-keys", response_model=List[TeamApiKeyResponse])
async def get_team_api_keys(
    team_id: str,
    request: Request,
    db: Session = Depends(get_db)
):
    """Get all API keys for a team."""
    current_user = getattr(request.state, 'user', None)
    
    if not current_user:
        raise HTTPException(status_code=401, detail="Authentication required")
    team, _ = get_team_and_verify_access(team_id, current_user, db, TeamRole.DEVELOPER)
    
    # Get team's API keys (through projects owned by team members)
    team_member_ids = db.query(TeamMember.user_id).filter(
        TeamMember.team_id == team.id
    ).subquery()
    
    team_project_ids = db.query(ProjectMember.project_id).filter(
        ProjectMember.user_id.in_(
            db.query(team_member_ids.c.user_id)
        )
    ).distinct().subquery()
    
    api_keys = db.query(ApiKey).filter(
        ApiKey.project_id.in_(
            db.query(team_project_ids.c.project_id)
        )
    ).all()
    
    return [
        TeamApiKeyResponse(
            id=str(key.id),
            name=key.name,
            key_prefix=key.key_prefix + "...",  # Use stored prefix
            is_active=key.is_active,
            expires_at=key.expires_at,
            created_at=key.created_at,
            last_used_at=key.last_used_at
        )
        for key in api_keys
    ]


@router.post("/{team_id}/api-keys")
async def create_team_api_key(
    team_id: str,
    key_request: CreateApiKeyRequest,
    request: Request,
    db: Session = Depends(get_db)
):
    """Create a new API key for the team."""
    current_user = getattr(request.state, 'user', None)
    
    if not current_user:
        raise HTTPException(status_code=401, detail="Authentication required")
    team, _ = get_team_and_verify_access(team_id, current_user, db, TeamRole.OWNER)
    
    # Check API key limit (through projects owned by team members)
    team_member_ids = db.query(TeamMember.user_id).filter(
        TeamMember.team_id == team.id
    ).subquery()
    
    team_project_ids = db.query(ProjectMember.project_id).filter(
        ProjectMember.user_id.in_(
            db.query(team_member_ids.c.user_id)
        )
    ).distinct().subquery()
    
    existing_keys = db.query(ApiKey).filter(
        ApiKey.project_id.in_(
            db.query(team_project_ids.c.project_id)
        )
    ).count()
    
    if existing_keys >= team.max_api_keys:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Maximum number of API keys ({team.max_api_keys}) reached"
        )
    
    # Generate API key
    import secrets
    import hashlib
    api_key = f"mcp_{secrets.token_urlsafe(32)}"
    key_hash = hashlib.sha256(api_key.encode()).hexdigest()
    
    # Create API key record
    key_record = ApiKey(
        name=key_request.name,
        key_hash=key_hash,
        key_prefix=api_key[:10],
        team_id=team.id,
        created_by_id=current_user.id,
        is_active=True
    )
    
    db.add(key_record)
    db.commit()
    db.refresh(key_record)
    
    # API 키 생성 활동 로깅
    ActivityLogger.log_team_api_key_created(
        team_id=team.id,
        user_id=current_user.id,
        team_name=team.name,
        api_key_name=key_record.name,
        api_key_id=str(key_record.id),
        db=db
    )
    
    return {
        "id": str(key_record.id),
        "name": key_record.name,
        "api_key": api_key,  # Return full key only on creation
        "message": "API key created successfully"
    }


@router.delete("/{team_id}/api-keys/{key_id}")
async def delete_team_api_key(
    team_id: str,
    key_id: str,
    request: Request,
    db: Session = Depends(get_db)
):
    """Delete an API key."""
    current_user = getattr(request.state, 'user', None)
    
    if not current_user:
        raise HTTPException(status_code=401, detail="Authentication required")
    team, _ = get_team_and_verify_access(team_id, current_user, db, TeamRole.OWNER)
    
    try:
        key_uuid = UUID(key_id)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid API key ID format"
        )
    
    # Find API key through projects owned by team members
    team_member_ids = db.query(TeamMember.user_id).filter(
        TeamMember.team_id == team.id
    ).subquery()
    
    team_project_ids = db.query(ProjectMember.project_id).filter(
        ProjectMember.user_id.in_(
            db.query(team_member_ids.c.user_id)
        )
    ).distinct().subquery()
    
    api_key = db.query(ApiKey).filter(
        and_(
            ApiKey.id == key_uuid,
            ApiKey.project_id.in_(
                db.query(team_project_ids.c.project_id)
            )
        )
    ).first()
    
    if not api_key:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="API key not found"
        )
    
    db.delete(api_key)
    db.commit()
    
    return {"message": "API key deleted successfully"}


@router.get("/{team_id}/activity", response_model=List[TeamActivityResponse])
async def get_team_activity(
    team_id: str,
    request: Request,
    db: Session = Depends(get_db),
    action_filter: Optional[str] = None,
    severity_filter: Optional[str] = None,
    limit: int = 50,
    offset: int = 0
):
    """Get team activity feed."""
    # JWT 미들웨어에서 이미 인증된 사용자 가져오기
    current_user = getattr(request.state, 'user', None)
    
    if not current_user:
        raise HTTPException(status_code=401, detail="Authentication required")
    
    team, _ = get_team_and_verify_access(team_id, current_user, db)
    
    # 실제 팀 활동 데이터 조회 (User relationship 포함)
    query = db.query(Activity).options(joinedload(Activity.user)).filter(Activity.team_id == team_id)
    
    # 필터링 적용
    if action_filter:
        query = query.filter(Activity.action == action_filter)
    if severity_filter:
        query = query.filter(Activity.severity == severity_filter)
    
    # 최신순 정렬 및 페이지네이션
    activities = query.order_by(Activity.created_at.desc()).offset(offset).limit(limit).all()
    
    # 응답 형식으로 변환
    activity_responses = []
    for activity in activities:
        activity_responses.append(TeamActivityResponse(
            id=str(activity.id),
            type=activity.action.value,
            description=activity.description,
            user_name=activity.user.name if activity.user else 'System',
            timestamp=activity.created_at
        ))
    
    return activity_responses


@router.get("/{team_id}/projects", response_model=List[dict])
async def get_team_projects(
    team_id: str,
    request: Request,
    db: Session = Depends(get_db)
):
    """팀에서 접근 가능한 프로젝트 목록 조회"""
    current_user = getattr(request.state, 'user', None)
    
    if not current_user:
        raise HTTPException(status_code=401, detail="Authentication required")
    
    team, membership = get_team_and_verify_access(team_id, current_user, db)
    
    # 팀으로 명시적으로 초대된 프로젝트만 조회
    # InviteSource.TEAM_MEMBER로 초대된 프로젝트만 표시하여 개인 프로젝트는 제외
    
    # 팀의 모든 멤버 ID 조회
    team_member_ids = db.query(TeamMember.user_id).filter(
        TeamMember.team_id == team.id
    ).all()
    team_member_ids = [member_id[0] for member_id in team_member_ids]
    
    # 팀으로 명시적으로 초대된 프로젝트만 조회 (개인 프로젝트 제외)
    projects_query = db.query(
        Project.id,
        Project.name, 
        Project.description,
        Project.created_by,
        Project.created_at,
        Project.updated_at
    ).join(ProjectMember).filter(
        and_(
            ProjectMember.user_id.in_(team_member_ids),
            ProjectMember.invited_as == InviteSource.TEAM_MEMBER  # 팀으로 초대된 경우만
        )
    ).distinct()
    
    project_rows = projects_query.all()
    
    # 프로젝트 ID들을 별도로 조회하여 전체 객체 가져오기
    if project_rows:
        project_ids = [row.id for row in project_rows]
        projects = db.query(Project).filter(Project.id.in_(project_ids)).all()
    else:
        projects = []
    
    result = []
    for project in projects:
        # 프로젝트별 통계 계산
        member_count = db.query(ProjectMember).filter(
            ProjectMember.project_id == project.id
        ).count()
        
        server_count = db.query(McpServer).filter(
            McpServer.project_id == project.id
        ).count()
        
        # 현재 사용자의 이 프로젝트에서의 역할 확인
        user_project_member = db.query(ProjectMember).filter(
            and_(
                ProjectMember.project_id == project.id,
                ProjectMember.user_id == current_user.id
            )
        ).first()
        
        # 현재 사용자가 이 프로젝트에 접근할 수 있는지 확인
        if user_project_member:
            # Enum 속성 안전 접근 - 이미 문자열인 경우와 Enum 객체인 경우 모두 처리
            user_role = user_project_member.role.value if hasattr(user_project_member.role, 'value') else user_project_member.role
            invited_as = user_project_member.invited_as.value if hasattr(user_project_member.invited_as, 'value') else user_project_member.invited_as
            
            result.append({
                "id": str(project.id),
                "name": project.name,
                "description": project.description,
                "created_at": project.created_at.isoformat(),
                "member_count": member_count,
                "server_count": server_count,
                "user_role": user_role,
                "invited_as": invited_as
            })
    
    return result


@router.post("/{team_id}/projects", response_model=dict)
async def create_team_project(
    team_id: str,
    project_data: dict,
    request: Request,
    db: Session = Depends(get_db)
):
    """팀에서 새 프로젝트 생성"""
    current_user = getattr(request.state, 'user', None)
    
    if not current_user:
        raise HTTPException(status_code=401, detail="Authentication required")
    
    team, membership = get_team_and_verify_access(team_id, current_user, db, TeamRole.DEVELOPER)
    
    # 프로젝트 생성
    
    project = Project(
        name=project_data.get('name'),
        description=project_data.get('description'),
        created_by=current_user.id
    )
    
    db.add(project)
    db.flush()  # ID 생성을 위해 flush
    
    # 생성자를 Owner로 자동 추가
    project_member = ProjectMember(
        project_id=project.id,
        user_id=current_user.id,
        role=ProjectRole.OWNER,
        invited_as=InviteSource.INDIVIDUAL,
        invited_by=current_user.id
    )
    
    db.add(project_member)
    db.commit()
    db.refresh(project)
    
    return {
        "id": str(project.id),
        "name": project.name,
        "description": project.description,
        "created_at": project.created_at.isoformat(),
        "member_count": 1,
        "server_count": 0,
        "user_role": ProjectRole.OWNER.value,
        "invited_as": InviteSource.INDIVIDUAL.value
    }


@router.get("/{team_id}/cline-config")
async def get_team_cline_config(
    team_id: str,
    request: Request,
    unified: bool = False,
    db: Session = Depends(get_db)
):
    """Generate Cline configuration for the team.
    
    Args:
        unified: True일 경우 통합 MCP 서버 엔드포인트 사용, False일 경우 개별 서버 설정
    """
    current_user = getattr(request.state, 'user', None)
    
    if not current_user:
        raise HTTPException(status_code=401, detail="Authentication required")
    team, _ = get_team_and_verify_access(team_id, current_user, db, TeamRole.DEVELOPER)
    
    # Get team's active servers (through projects owned by team members)
    team_member_ids = db.query(TeamMember.user_id).filter(
        TeamMember.team_id == team.id
    ).subquery()
    
    team_project_ids = db.query(ProjectMember.project_id).filter(
        ProjectMember.user_id.in_(
            db.query(team_member_ids.c.user_id)
        )
    ).distinct().subquery()
    
    # 프로젝트별로 서버 그룹화
    from sqlalchemy.orm import joinedload
    projects_with_servers = db.query(Project).options(
        joinedload(Project.servers)
    ).filter(
        and_(
            Project.id.in_(db.query(team_project_ids.c.project_id)),
        )
    ).all()
    
    servers = db.query(McpServer).filter(
        and_(
            McpServer.project_id.in_(
                db.query(team_project_ids.c.project_id)
            ),
            McpServer.is_enabled == True
        )
    ).all()
    
    # Get team's API keys (through projects owned by team members)
    api_keys = db.query(ApiKey).filter(
        and_(
            ApiKey.project_id.in_(
                db.query(team_project_ids.c.project_id)
            ),
            ApiKey.is_active == True
        )
    ).first()
    
    if not api_keys:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No active API keys found for this team"
        )
    
    # 동적 base URL 확인
    from ..config import get_mcp_server_base_url
    base_url = get_mcp_server_base_url()
    
    # Generate configuration
    mcp_servers = {}
    
    if unified:
        # 통합 모드: 프로젝트별로 통합 엔드포인트 생성
        project_servers_map = {}
        for server in servers:
            project_id = server.project_id
            if project_id not in project_servers_map:
                project_servers_map[project_id] = []
            project_servers_map[project_id].append(server)
        
        for project_id, project_servers in project_servers_map.items():
            project = next((p for p in projects_with_servers if p.id == project_id), None)
            project_name = project.name if project else f"project-{project_id}"
            
            server_key = f"team-{team_id}-{project_name}-unified"
            
            # 프로젝트의 JWT 인증 설정 확인
            requires_jwt = any(server.get_effective_jwt_auth_required() for server in project_servers)
            
            server_config = {
                "type": "sse",
                "url": f"{base_url}/projects/{project_id}/unified/sse",
                "timeout": 60,
                "disabled": False
            }
            
            # JWT 인증이 필요한 경우 헤더에 API 키 설정
            if requires_jwt:
                server_config["headers"] = {
                    "Authorization": f"Bearer {api_keys.key_prefix}..."
                }
            
            mcp_servers[server_key] = server_config
        
        instructions = [
            "🚀 TEAM UNIFIED MCP SERVER CONFIGURATION",
            "1. Save this configuration as 'mcp_settings.json' in your project root",
            "2. Configure Claude Desktop, Cursor, or other MCP clients to use this settings file",
            "3. Replace placeholder API keys with your actual full API key where needed",
            "4. This unified endpoint provides access to ALL team project servers through single connections per project",
            f"5. Tools are namespaced with format: 'server_name.tool_name' (separator: '.')",
            f"6. Access {len(servers)} servers across {len(project_servers_map)} projects through unified endpoints",
            "7. Error isolation: individual server failures won't affect other servers",
            "8. Health monitoring and recovery tools available through 'orchestrator.*' meta tools"
        ]
        
    else:
        # 개별 서버 모드 (기존 방식과 유사하지만 올바른 엔드포인트 사용)
        for server in servers:
            project_id = server.project_id
            server_key = f"team-{team_id}-{server.name}"
            
            # 서버별 JWT 인증 설정 확인
            jwt_auth_required = server.get_effective_jwt_auth_required()
            
            # Individual server SSE connection
            server_config = {
                "type": "sse",
                "url": f"{base_url}/projects/{project_id}/servers/{server.name}/sse",
                "timeout": 60,
                "disabled": False
            }
            
            # JWT 인증이 필요한 경우 헤더에 API 키 설정
            if jwt_auth_required:
                server_config["headers"] = {
                    "Authorization": f"Bearer {api_keys.key_prefix}..."
                }
            
            mcp_servers[server_key] = server_config
        
        instructions = [
            "📋 TEAM INDIVIDUAL SERVERS CONFIGURATION",
            "1. Save this configuration as 'mcp_settings.json' in your project root",
            "2. Configure Claude Desktop, Cursor, or other MCP clients to use this settings file",
            "3. Replace placeholder API keys with your actual full API key where needed",
            "4. Each server uses individual SSE connections for direct access",
            f"5. Your team has access to {len(servers)} MCP servers across multiple projects"
        ]
    
    config = {
        "team_id": team_id,
        "team_name": team.name,
        "config": {
            "mcpServers": mcp_servers
        },
        "servers_count": len(servers),
        "api_key_prefix": api_keys.key_prefix,
        "mode": "unified" if unified else "individual",
        "instructions": instructions,
        "api_key_note": "The API key shown is truncated for security. Use the full key provided during creation."
    }
    
    return config

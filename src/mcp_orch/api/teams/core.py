"""
팀 기본 CRUD API
팀 생성, 조회, 수정 등 핵심 기능
"""

from datetime import datetime
from typing import List
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session
from sqlalchemy import func

from ...database import get_db
from ...models.team import Team, TeamMember, TeamRole
from ...services.activity_logger import ActivityLogger
from .common import (
    TeamResponse, 
    CreateTeamRequest, 
    get_current_user_for_teams,
    get_team_and_verify_access
)

router = APIRouter()


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
    team_id: UUID,
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
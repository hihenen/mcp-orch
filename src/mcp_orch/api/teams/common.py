"""
Teams API 공통 구성 요소
공통 Pydantic 모델, 헬퍼 함수, 인증 유틸리티
"""

from datetime import datetime
from typing import List, Optional
from uuid import UUID

from fastapi import HTTPException, status, Request
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from ...database import get_db
from ...models.team import Team, TeamMember, TeamRole
from ...models.user import User
from ...models.api_key import ApiKey
from ...models.activity import Activity, ActivityType, ActivitySeverity
from ...services.activity_logger import ActivityLogger
from ..jwt_auth import get_current_user, verify_jwt_token, get_user_from_jwt_token


# Pydantic Models for API
class TeamResponse(BaseModel):
    """Team information."""
    id: str
    name: str
    created_at: datetime
    updated_at: datetime
    member_count: int = 0
    user_role: str = "developer"

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
    joined_at: datetime

    class Config:
        from_attributes = True


class TeamApiKeyResponse(BaseModel):
    """Team API key information."""
    id: str
    name: str
    key_prefix: str
    key_suffix: str
    created_at: datetime
    last_used_at: Optional[datetime] = None
    is_active: bool

    class Config:
        from_attributes = True


class TeamActivityResponse(BaseModel):
    """Team activity information."""
    id: str
    user_name: str
    activity_type: ActivityType
    description: str
    created_at: datetime
    severity: ActivitySeverity

    class Config:
        from_attributes = True


class InviteMemberRequest(BaseModel):
    """Request to invite a team member."""
    email: str = Field(..., description="Email of the user to invite")
    role: TeamRole = Field(default=TeamRole.DEVELOPER, description="Role for the new member")


class CreateApiKeyRequest(BaseModel):
    """Request to create an API key."""
    name: str = Field(..., description="Name for the API key")


class UpdateMemberRoleRequest(BaseModel):
    """Request to update member role."""
    role: TeamRole = Field(..., description="New role for the member")


class TeamServerResponse(BaseModel):
    """Team server information."""
    id: str
    name: str
    description: Optional[str]
    command: str
    args: List[str]
    env: dict
    disabled: bool
    status: str

    class Config:
        from_attributes = True


class TeamToolResponse(BaseModel):
    """Team tool information."""
    id: str
    name: str
    server_name: str
    description: Optional[str]
    usage_count: int = 0

    class Config:
        from_attributes = True


# Helper Functions
async def get_user_from_jwt_token(request: Request, db: Session) -> Optional[User]:
    """
    Request에서 JWT 토큰을 추출하고 검증한 후 데이터베이스 User 객체를 반환합니다.
    """
    try:
        # Authorization 헤더에서 JWT 토큰 추출
        auth_header = request.headers.get("authorization")
        if not auth_header or not auth_header.startswith("Bearer "):
            return None
        
        token = auth_header.split(" ")[1]
        
        # JWT 토큰 검증
        jwt_user = verify_jwt_token(token)
        if not jwt_user:
            return None
        
        # 데이터베이스에서 사용자 찾기
        user = db.query(User).filter(User.id == jwt_user.id).first()
        if not user:
            # NextAuth.js 통합: 사용자가 존재하지 않으면 생성
            user = User(
                id=jwt_user.id,
                email=jwt_user.email,
                name=jwt_user.name or jwt_user.email
            )
            db.add(user)
            db.commit()
            db.refresh(user)
        
        return user
        
    except Exception as e:
        print(f"Error getting user from JWT token: {e}")
        return None


def get_team_and_verify_access(team_id: UUID, user: User, db: Session, required_role: TeamRole = None) -> tuple[Team, TeamMember]:
    """
    팀 존재 여부와 사용자의 팀 접근 권한을 확인합니다.
    
    Args:
        team_id: 확인할 팀 ID
        user: 현재 사용자
        db: 데이터베이스 세션
        required_role: 필요한 최소 권한 (None이면 멤버 여부만 확인)
    
    Returns:
        tuple[Team, TeamMember]: 팀 객체와 팀 멤버 객체
        
    Raises:
        HTTPException: 팀이 존재하지 않거나 접근 권한이 없는 경우
    """
    # 팀 존재 여부 확인
    team = db.query(Team).filter(Team.id == team_id).first()
    if not team:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Team not found"
        )
    
    # 사용자의 팀 멤버십 확인
    team_member = db.query(TeamMember).filter(
        TeamMember.team_id == team_id,
        TeamMember.user_id == user.id
    ).first()
    
    if not team_member:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You are not a member of this team"
        )
    
    # 특정 권한이 필요한 경우 권한 확인
    if required_role:
        role_hierarchy = {
            TeamRole.REPORTER: 0,
            TeamRole.DEVELOPER: 1,
            TeamRole.OWNER: 2
        }
        
        user_role_level = role_hierarchy.get(team_member.role, 0)
        required_role_level = role_hierarchy.get(required_role, 0)
        
        if user_role_level < required_role_level:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"This action requires {required_role.value} role or higher"
            )
    
    return team, team_member


# 공통 의존성 함수
async def get_current_user_for_teams(request: Request, db: Session = None) -> User:
    """팀 API용 사용자 인증 함수"""
    if hasattr(request.state, 'user') and request.state.user:
        return request.state.user
    
    if db is None:
        from ...database import get_db
        db = next(get_db())
    
    user = await get_user_from_jwt_token(request, db)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required"
        )
    return user
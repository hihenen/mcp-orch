"""
팀 멤버 관리 API
멤버 초대, 권한 변경, 제거 기능
"""

from datetime import datetime
from typing import List
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import and_

from ...database import get_db
from ...models.team import Team, TeamMember, TeamRole
from ...models.user import User
from ...services.activity_logger import ActivityLogger
from .common import (
    TeamMemberResponse,
    InviteMemberRequest,
    UpdateMemberRoleRequest,
    get_current_user_for_teams,
    get_team_and_verify_access
)

router = APIRouter()


@router.get("/{team_id}/members", response_model=List[TeamMemberResponse])
async def get_team_members(
    team_id: UUID,
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
            joined_at=member.joined_at
        )
        for member in members
    ]


@router.post("/{team_id}/members/invite")
async def invite_team_member(
    team_id: UUID,
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
    team_id: UUID,
    user_id: UUID,
    role_request: UpdateMemberRoleRequest,
    request: Request,
    db: Session = Depends(get_db)
):
    """Update a team member's role."""
    current_user = getattr(request.state, 'user', None)
    
    if not current_user:
        raise HTTPException(status_code=401, detail="Authentication required")
    team, _ = get_team_and_verify_access(team_id, current_user, db, TeamRole.OWNER)
    
    # Get the membership to update
    membership = db.query(TeamMember).filter(
        and_(
            TeamMember.team_id == team.id,
            TeamMember.user_id == user_id
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
    team_id: UUID,
    user_id: UUID,
    request: Request,
    db: Session = Depends(get_db)
):
    """Remove a member from the team."""
    current_user = getattr(request.state, 'user', None)
    
    if not current_user:
        raise HTTPException(status_code=401, detail="Authentication required")
    team, _ = get_team_and_verify_access(team_id, current_user, db, TeamRole.OWNER)
    
    # Get the membership to remove
    membership = db.query(TeamMember).filter(
        and_(
            TeamMember.team_id == team.id,
            TeamMember.user_id == user_id
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
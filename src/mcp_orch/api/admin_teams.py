"""Admin Teams management API endpoints."""
from datetime import datetime
from typing import List, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status, Request
from pydantic import BaseModel, Field
from sqlalchemy import and_, func, desc
from sqlalchemy.orm import Session, joinedload

from ..database import get_db
from ..models.team import Team, TeamMember, TeamRole
from ..models.user import User
from ..models.api_key import ApiKey
from ..models.mcp_server import McpServer
from ..models import Project, ProjectMember
from .users import get_current_admin_user

router = APIRouter(prefix="/api/admin/teams", tags=["admin-teams"])


# Pydantic models for Admin API
class AdminTeamResponse(BaseModel):
    """Admin team information."""
    id: str
    name: str
    slug: str
    description: Optional[str] = None
    is_personal: bool
    is_active: bool
    plan: str
    max_api_keys: int
    max_members: int
    created_at: datetime
    updated_at: datetime
    
    # Statistics
    member_count: int = 0
    project_count: int = 0
    api_key_count: int = 0
    server_count: int = 0
    
    # Owner information
    owner_name: Optional[str] = None
    owner_email: Optional[str] = None

    class Config:
        from_attributes = True


class AdminTeamListResponse(BaseModel):
    """Admin team list response."""
    teams: List[AdminTeamResponse]
    total: int
    page: int
    per_page: int


class AdminCreateTeamRequest(BaseModel):
    """Admin request to create a new team."""
    name: str = Field(..., description="Team name")
    description: Optional[str] = Field(None, description="Team description")
    owner_email: str = Field(..., description="Email of the team owner")
    is_personal: bool = Field(False, description="Whether this is a personal team")
    plan: str = Field("free", description="Team plan")
    max_api_keys: int = Field(5, description="Maximum API keys allowed")
    max_members: int = Field(10, description="Maximum members allowed")


class AdminUpdateTeamRequest(BaseModel):
    """Admin request to update team information."""
    name: Optional[str] = None
    description: Optional[str] = None
    is_active: Optional[bool] = None
    plan: Optional[str] = None
    max_api_keys: Optional[int] = None
    max_members: Optional[int] = None


class AdminTeamMemberResponse(BaseModel):
    """Admin team member information."""
    id: str
    user_id: str
    user_name: str
    user_email: str
    role: str
    invited_by_id: Optional[str] = None
    invited_by_name: Optional[str] = None
    invited_at: Optional[datetime] = None
    joined_at: Optional[datetime] = None
    is_default: bool

    class Config:
        from_attributes = True


class AdminTransferOwnershipRequest(BaseModel):
    """Admin request to transfer team ownership."""
    new_owner_email: str = Field(..., description="Email of the new owner")


@router.get("/", response_model=AdminTeamListResponse)
async def list_teams_admin(
    request: Request,
    skip: int = 0,
    limit: int = 100,
    search: Optional[str] = None,
    include_inactive: bool = False,
    current_user: User = Depends(get_current_admin_user),
    db: Session = Depends(get_db)
):
    """Admin endpoint to list all teams."""
    try:
        # Base query
        query = db.query(Team)
        
        # Filter active teams only (default)
        if not include_inactive:
            query = query.filter(Team.is_active == True)
        
        # Search condition
        if search:
            search_term = f"%{search}%"
            query = query.filter(
                (Team.name.ilike(search_term)) |
                (Team.slug.ilike(search_term)) |
                (Team.description.ilike(search_term))
            )
        
        # Total count
        total = query.count()
        
        # Apply pagination and ordering
        teams = query.order_by(desc(Team.created_at)).offset(skip).limit(limit).all()
        
        # Build response with statistics
        team_responses = []
        for team in teams:
            # Get member count
            member_count = db.query(TeamMember).filter(
                TeamMember.team_id == team.id
            ).count()
            
            # Get project count (projects where team members participate)
            team_member_ids = db.query(TeamMember.user_id).filter(
                TeamMember.team_id == team.id
            ).subquery()
            
            project_count = db.query(ProjectMember).filter(
                ProjectMember.user_id.in_(
                    db.query(team_member_ids.c.user_id)
                )
            ).distinct(ProjectMember.project_id).count()
            
            # Get API key count (through projects owned by team members)
            team_project_ids = db.query(ProjectMember.project_id).filter(
                ProjectMember.user_id.in_(
                    db.query(TeamMember.user_id).filter(TeamMember.team_id == team.id)
                )
            ).distinct().subquery()
            
            api_key_count = db.query(ApiKey).filter(
                ApiKey.project_id.in_(
                    db.query(team_project_ids.c.project_id)
                )
            ).count()
            
            # Get server count (through projects owned by team members)
            server_count = db.query(McpServer).filter(
                McpServer.project_id.in_(
                    db.query(team_project_ids.c.project_id)
                )
            ).count()
            
            # Get owner information
            owner_membership = db.query(TeamMember).options(
                joinedload(TeamMember.user)
            ).filter(
                and_(
                    TeamMember.team_id == team.id,
                    TeamMember.role == TeamRole.OWNER
                )
            ).first()
            
            owner_name = owner_membership.user.name if owner_membership else None
            owner_email = owner_membership.user.email if owner_membership else None
            
            team_response = AdminTeamResponse(
                id=str(team.id),
                name=team.name,
                slug=team.slug,
                description=team.description,
                is_personal=team.is_personal,
                is_active=team.is_active,
                plan=team.plan,
                max_api_keys=team.max_api_keys,
                max_members=team.max_members,
                created_at=team.created_at,
                updated_at=team.updated_at,
                member_count=member_count,
                project_count=project_count,
                api_key_count=api_key_count,
                server_count=server_count,
                owner_name=owner_name,
                owner_email=owner_email
            )
            team_responses.append(team_response)
        
        return AdminTeamListResponse(
            teams=team_responses,
            total=total,
            page=(skip // limit) + 1 if limit > 0 else 1,
            per_page=limit
        )
        
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error retrieving teams: {str(e)}"
        )


@router.get("/{team_id}", response_model=AdminTeamResponse)
async def get_team_admin(
    request: Request,
    team_id: str,
    current_user: User = Depends(get_current_admin_user),
    db: Session = Depends(get_db)
):
    """Admin endpoint to get detailed team information."""
    try:
        team = db.query(Team).filter(Team.id == team_id).first()
        if not team:
            raise HTTPException(
                status_code=404,
                detail="Team not found"
            )
        
        # Calculate statistics (same as in list endpoint)
        member_count = db.query(TeamMember).filter(
            TeamMember.team_id == team.id
        ).count()
        
        team_member_ids = db.query(TeamMember.user_id).filter(
            TeamMember.team_id == team.id
        ).subquery()
        
        project_count = db.query(ProjectMember).filter(
            ProjectMember.user_id.in_(
                db.query(team_member_ids.c.user_id)
            )
        ).distinct(ProjectMember.project_id).count()
        
        # Get API key count (through projects owned by team members)
        team_project_ids = db.query(ProjectMember.project_id).filter(
            ProjectMember.user_id.in_(
                db.query(TeamMember.user_id).filter(TeamMember.team_id == team.id)
            )
        ).distinct().subquery()
        
        api_key_count = db.query(ApiKey).filter(
            ApiKey.project_id.in_(
                db.query(team_project_ids.c.project_id)
            )
        ).count()
        
        server_count = db.query(McpServer).filter(
            McpServer.team_id == team.id
        ).count()
        
        # Get owner information
        owner_membership = db.query(TeamMember).options(
            joinedload(TeamMember.user)
        ).filter(
            and_(
                TeamMember.team_id == team.id,
                TeamMember.role == TeamRole.OWNER
            )
        ).first()
        
        owner_name = owner_membership.user.name if owner_membership else None
        owner_email = owner_membership.user.email if owner_membership else None
        
        return AdminTeamResponse(
            id=str(team.id),
            name=team.name,
            slug=team.slug,
            description=team.description,
            is_personal=team.is_personal,
            is_active=team.is_active,
            plan=team.plan,
            max_api_keys=team.max_api_keys,
            max_members=team.max_members,
            created_at=team.created_at,
            updated_at=team.updated_at,
            member_count=member_count,
            project_count=project_count,
            api_key_count=api_key_count,
            server_count=server_count,
            owner_name=owner_name,
            owner_email=owner_email
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error retrieving team: {str(e)}"
        )


@router.post("/", response_model=AdminTeamResponse)
async def create_team_admin(
    request: Request,
    team_data: AdminCreateTeamRequest,
    current_user: User = Depends(get_current_admin_user),
    db: Session = Depends(get_db)
):
    """Admin endpoint to create a new team."""
    try:
        # Check if owner user exists
        owner_user = db.query(User).filter(User.email == team_data.owner_email).first()
        if not owner_user:
            raise HTTPException(
                status_code=400,
                detail="Owner user not found"
            )
        
        # Generate slug from name
        slug = team_data.name.lower().replace(' ', '-').replace('_', '-')
        
        # Check if slug is unique
        existing_team = db.query(Team).filter(Team.slug == slug).first()
        if existing_team:
            slug = f"{slug}-{int(datetime.utcnow().timestamp())}"
        
        # Create team
        new_team = Team(
            name=team_data.name,
            slug=slug,
            description=team_data.description,
            is_personal=team_data.is_personal,
            is_active=True,
            plan=team_data.plan,
            max_api_keys=team_data.max_api_keys,
            max_members=team_data.max_members
        )
        
        db.add(new_team)
        db.flush()  # Get the team ID
        
        # Add owner membership
        owner_membership = TeamMember(
            user_id=owner_user.id,
            team_id=new_team.id,
            role=TeamRole.OWNER,
            invited_by_id=current_user.id,
            invited_at=datetime.utcnow(),
            joined_at=datetime.utcnow(),
            is_default=team_data.is_personal
        )
        
        db.add(owner_membership)
        db.commit()
        db.refresh(new_team)
        
        return AdminTeamResponse(
            id=str(new_team.id),
            name=new_team.name,
            slug=new_team.slug,
            description=new_team.description,
            is_personal=new_team.is_personal,
            is_active=new_team.is_active,
            plan=new_team.plan,
            max_api_keys=new_team.max_api_keys,
            max_members=new_team.max_members,
            created_at=new_team.created_at,
            updated_at=new_team.updated_at,
            member_count=1,
            project_count=0,
            api_key_count=0,
            server_count=0,
            owner_name=owner_user.name,
            owner_email=owner_user.email
        )
        
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=500,
            detail=f"Error creating team: {str(e)}"
        )


@router.put("/{team_id}", response_model=AdminTeamResponse)
async def update_team_admin(
    request: Request,
    team_id: str,
    team_data: AdminUpdateTeamRequest,
    current_user: User = Depends(get_current_admin_user),
    db: Session = Depends(get_db)
):
    """Admin endpoint to update team information."""
    try:
        team = db.query(Team).filter(Team.id == team_id).first()
        if not team:
            raise HTTPException(
                status_code=404,
                detail="Team not found"
            )
        
        # Update fields
        if team_data.name is not None:
            team.name = team_data.name
            # Update slug when name changes
            team.slug = team_data.name.lower().replace(' ', '-').replace('_', '-')
        if team_data.description is not None:
            team.description = team_data.description
        if team_data.is_active is not None:
            team.is_active = team_data.is_active
        if team_data.plan is not None:
            team.plan = team_data.plan
        if team_data.max_api_keys is not None:
            team.max_api_keys = team_data.max_api_keys
        if team_data.max_members is not None:
            team.max_members = team_data.max_members
        
        team.updated_at = datetime.utcnow()
        
        db.commit()
        db.refresh(team)
        
        # Get updated statistics
        member_count = db.query(TeamMember).filter(
            TeamMember.team_id == team.id
        ).count()
        
        team_member_ids = db.query(TeamMember.user_id).filter(
            TeamMember.team_id == team.id
        ).subquery()
        
        project_count = db.query(ProjectMember).filter(
            ProjectMember.user_id.in_(
                db.query(team_member_ids.c.user_id)
            )
        ).distinct(ProjectMember.project_id).count()
        
        # Get API key count (through projects owned by team members)
        team_project_ids = db.query(ProjectMember.project_id).filter(
            ProjectMember.user_id.in_(
                db.query(TeamMember.user_id).filter(TeamMember.team_id == team.id)
            )
        ).distinct().subquery()
        
        api_key_count = db.query(ApiKey).filter(
            ApiKey.project_id.in_(
                db.query(team_project_ids.c.project_id)
            )
        ).count()
        
        server_count = db.query(McpServer).filter(
            McpServer.team_id == team.id
        ).count()
        
        owner_membership = db.query(TeamMember).options(
            joinedload(TeamMember.user)
        ).filter(
            and_(
                TeamMember.team_id == team.id,
                TeamMember.role == TeamRole.OWNER
            )
        ).first()
        
        owner_name = owner_membership.user.name if owner_membership else None
        owner_email = owner_membership.user.email if owner_membership else None
        
        return AdminTeamResponse(
            id=str(team.id),
            name=team.name,
            slug=team.slug,
            description=team.description,
            is_personal=team.is_personal,
            is_active=team.is_active,
            plan=team.plan,
            max_api_keys=team.max_api_keys,
            max_members=team.max_members,
            created_at=team.created_at,
            updated_at=team.updated_at,
            member_count=member_count,
            project_count=project_count,
            api_key_count=api_key_count,
            server_count=server_count,
            owner_name=owner_name,
            owner_email=owner_email
        )
        
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=500,
            detail=f"Error updating team: {str(e)}"
        )


@router.delete("/{team_id}")
async def delete_team_admin(
    request: Request,
    team_id: str,
    current_user: User = Depends(get_current_admin_user),
    db: Session = Depends(get_db)
):
    """Admin endpoint to delete a team (soft delete)."""
    try:
        team = db.query(Team).filter(Team.id == team_id).first()
        if not team:
            raise HTTPException(
                status_code=404,
                detail="Team not found"
            )
        
        # Soft delete - set is_active to False
        team.is_active = False
        team.updated_at = datetime.utcnow()
        
        db.commit()
        
        return {"message": "Team deactivated successfully"}
        
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=500,
            detail=f"Error deleting team: {str(e)}"
        )


@router.get("/{team_id}/members", response_model=List[AdminTeamMemberResponse])
async def get_team_members_admin(
    request: Request,
    team_id: str,
    current_user: User = Depends(get_current_admin_user),
    db: Session = Depends(get_db)
):
    """Admin endpoint to get team members."""
    try:
        team = db.query(Team).filter(Team.id == team_id).first()
        if not team:
            raise HTTPException(
                status_code=404,
                detail="Team not found"
            )
        
        members = db.query(TeamMember).options(
            joinedload(TeamMember.user),
            joinedload(TeamMember.invited_by)
        ).filter(
            TeamMember.team_id == team.id
        ).all()
        
        return [
            AdminTeamMemberResponse(
                id=str(member.id),
                user_id=str(member.user_id),
                user_name=member.user.name,
                user_email=member.user.email,
                role=member.role.value if hasattr(member.role, 'value') else member.role,
                invited_by_id=str(member.invited_by_id) if member.invited_by_id else None,
                invited_by_name=member.invited_by.name if member.invited_by else None,
                invited_at=member.invited_at,
                joined_at=member.joined_at,
                is_default=member.is_default
            )
            for member in members
        ]
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error retrieving team members: {str(e)}"
        )


@router.post("/{team_id}/transfer-ownership")
async def transfer_team_ownership_admin(
    request: Request,
    team_id: str,
    transfer_data: AdminTransferOwnershipRequest,
    current_user: User = Depends(get_current_admin_user),
    db: Session = Depends(get_db)
):
    """Admin endpoint to transfer team ownership."""
    try:
        team = db.query(Team).filter(Team.id == team_id).first()
        if not team:
            raise HTTPException(
                status_code=404,
                detail="Team not found"
            )
        
        # Find new owner user
        new_owner = db.query(User).filter(User.email == transfer_data.new_owner_email).first()
        if not new_owner:
            raise HTTPException(
                status_code=400,
                detail="New owner user not found"
            )
        
        # Check if new owner is already a team member
        existing_membership = db.query(TeamMember).filter(
            and_(
                TeamMember.team_id == team.id,
                TeamMember.user_id == new_owner.id
            )
        ).first()
        
        if existing_membership:
            # Update existing membership to OWNER
            existing_membership.role = TeamRole.OWNER
        else:
            # Add new owner as member
            new_membership = TeamMember(
                user_id=new_owner.id,
                team_id=team.id,
                role=TeamRole.OWNER,
                invited_by_id=current_user.id,
                invited_at=datetime.utcnow(),
                joined_at=datetime.utcnow(),
                is_default=False
            )
            db.add(new_membership)
        
        # Demote current owner(s) to DEVELOPER
        current_owners = db.query(TeamMember).filter(
            and_(
                TeamMember.team_id == team.id,
                TeamMember.role == TeamRole.OWNER,
                TeamMember.user_id != new_owner.id
            )
        ).all()
        
        for owner in current_owners:
            owner.role = TeamRole.DEVELOPER
        
        db.commit()
        
        return {"message": f"Team ownership transferred to {transfer_data.new_owner_email}"}
        
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=500,
            detail=f"Error transferring ownership: {str(e)}"
        )
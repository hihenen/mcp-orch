"""Admin Projects management API endpoints."""
from datetime import datetime
from typing import List, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status, Request
from pydantic import BaseModel, Field
from sqlalchemy import and_, func, desc
from sqlalchemy.orm import Session, joinedload

from ..database import get_db
from ..models import Project, ProjectMember, ProjectRole, InviteSource
from ..models.user import User
from ..models.api_key import ApiKey
from ..models.mcp_server import McpServer
from ..models.team import Team, TeamMember
from .users import get_current_admin_user

router = APIRouter(prefix="/api/admin/projects", tags=["admin-projects"])


# Pydantic models for Admin API
class AdminProjectResponse(BaseModel):
    """Admin project information."""
    id: str
    name: str
    description: Optional[str] = None
    slug: str
    created_by: str
    created_at: datetime
    updated_at: datetime
    
    # Security settings
    sse_auth_required: bool
    message_auth_required: bool
    allowed_ip_ranges: Optional[List[str]] = None
    
    # Statistics
    member_count: int = 0
    server_count: int = 0
    api_key_count: int = 0
    
    # Creator information
    creator_name: Optional[str] = None
    creator_email: Optional[str] = None
    
    # Owner information (current project owner)
    owner_name: Optional[str] = None
    owner_email: Optional[str] = None

    class Config:
        from_attributes = True


class AdminProjectListResponse(BaseModel):
    """Admin project list response."""
    projects: List[AdminProjectResponse]
    total: int
    page: int
    per_page: int


class AdminCreateProjectRequest(BaseModel):
    """Admin request to create a new project."""
    name: str = Field(..., description="Project name")
    description: Optional[str] = Field(None, description="Project description")
    owner_email: str = Field(..., description="Email of the project owner")
    sse_auth_required: bool = Field(False, description="Require SSE authentication")
    message_auth_required: bool = Field(True, description="Require message authentication")
    allowed_ip_ranges: Optional[List[str]] = Field(None, description="Allowed IP ranges")


class AdminUpdateProjectRequest(BaseModel):
    """Admin request to update project information."""
    name: Optional[str] = None
    description: Optional[str] = None
    sse_auth_required: Optional[bool] = None
    message_auth_required: Optional[bool] = None
    allowed_ip_ranges: Optional[List[str]] = None


class AdminProjectMemberResponse(BaseModel):
    """Admin project member information."""
    id: str
    user_id: str
    user_name: str
    user_email: str
    role: str
    invited_as: str
    invited_by_id: str
    invited_by_name: str
    joined_at: datetime
    
    # Team information if invited as team member
    team_id: Optional[str] = None
    team_name: Optional[str] = None

    class Config:
        from_attributes = True


class AdminTransferOwnershipRequest(BaseModel):
    """Admin request to transfer project ownership."""
    new_owner_email: str = Field(..., description="Email of the new owner")


@router.get("/", response_model=AdminProjectListResponse)
async def list_projects_admin(
    request: Request,
    skip: int = 0,
    limit: int = 100,
    search: Optional[str] = None,
    current_user: User = Depends(get_current_admin_user),
    db: Session = Depends(get_db)
):
    """Admin endpoint to list all projects."""
    try:
        # Base query
        query = db.query(Project)
        
        # Search condition
        if search:
            search_term = f"%{search}%"
            query = query.filter(
                (Project.name.ilike(search_term)) |
                (Project.description.ilike(search_term)) |
                (Project.slug.ilike(search_term))
            )
        
        # Total count
        total = query.count()
        
        # Apply pagination and ordering
        projects = query.order_by(desc(Project.created_at)).offset(skip).limit(limit).all()
        
        # Build response with statistics
        project_responses = []
        for project in projects:
            # Get member count
            member_count = db.query(ProjectMember).filter(
                ProjectMember.project_id == project.id
            ).count()
            
            # Get server count
            server_count = db.query(McpServer).filter(
                McpServer.project_id == project.id
            ).count()
            
            # Get API key count
            api_key_count = db.query(ApiKey).filter(
                ApiKey.project_id == project.id
            ).count()
            
            # Get creator information
            creator = db.query(User).filter(User.id == project.created_by).first()
            creator_name = creator.name if creator else None
            creator_email = creator.email if creator else None
            
            # Get owner information (current project owner)
            owner_membership = db.query(ProjectMember).options(
                joinedload(ProjectMember.user)
            ).filter(
                and_(
                    ProjectMember.project_id == project.id,
                    ProjectMember.role == ProjectRole.OWNER
                )
            ).first()
            
            owner_name = owner_membership.user.name if owner_membership else None
            owner_email = owner_membership.user.email if owner_membership else None
            
            project_response = AdminProjectResponse(
                id=str(project.id),
                name=project.name,
                description=project.description,
                slug=project.slug,
                created_by=str(project.created_by),
                created_at=project.created_at,
                updated_at=project.updated_at,
                sse_auth_required=project.sse_auth_required,
                message_auth_required=project.message_auth_required,
                allowed_ip_ranges=project.allowed_ip_ranges or [],
                member_count=member_count,
                server_count=server_count,
                api_key_count=api_key_count,
                creator_name=creator_name,
                creator_email=creator_email,
                owner_name=owner_name,
                owner_email=owner_email
            )
            project_responses.append(project_response)
        
        return AdminProjectListResponse(
            projects=project_responses,
            total=total,
            page=(skip // limit) + 1 if limit > 0 else 1,
            per_page=limit
        )
        
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error retrieving projects: {str(e)}"
        )


@router.get("/{project_id}", response_model=AdminProjectResponse)
async def get_project_admin(
    request: Request,
    project_id: str,
    current_user: User = Depends(get_current_admin_user),
    db: Session = Depends(get_db)
):
    """Admin endpoint to get detailed project information."""
    try:
        project = db.query(Project).filter(Project.id == project_id).first()
        if not project:
            raise HTTPException(
                status_code=404,
                detail="Project not found"
            )
        
        # Calculate statistics
        member_count = db.query(ProjectMember).filter(
            ProjectMember.project_id == project.id
        ).count()
        
        server_count = db.query(McpServer).filter(
            McpServer.project_id == project.id
        ).count()
        
        api_key_count = db.query(ApiKey).filter(
            ApiKey.project_id == project.id
        ).count()
        
        # Get creator information
        creator = db.query(User).filter(User.id == project.created_by).first()
        creator_name = creator.name if creator else None
        creator_email = creator.email if creator else None
        
        # Get owner information
        owner_membership = db.query(ProjectMember).options(
            joinedload(ProjectMember.user)
        ).filter(
            and_(
                ProjectMember.project_id == project.id,
                ProjectMember.role == ProjectRole.OWNER
            )
        ).first()
        
        owner_name = owner_membership.user.name if owner_membership else None
        owner_email = owner_membership.user.email if owner_membership else None
        
        return AdminProjectResponse(
            id=str(project.id),
            name=project.name,
            description=project.description,
            slug=project.slug,
            created_by=str(project.created_by),
            created_at=project.created_at,
            updated_at=project.updated_at,
            sse_auth_required=project.sse_auth_required,
            message_auth_required=project.message_auth_required,
            allowed_ip_ranges=project.allowed_ip_ranges or [],
            member_count=member_count,
            server_count=server_count,
            api_key_count=api_key_count,
            creator_name=creator_name,
            creator_email=creator_email,
            owner_name=owner_name,
            owner_email=owner_email
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error retrieving project: {str(e)}"
        )


@router.post("/", response_model=AdminProjectResponse)
async def create_project_admin(
    request: Request,
    project_data: AdminCreateProjectRequest,
    current_user: User = Depends(get_current_admin_user),
    db: Session = Depends(get_db)
):
    """Admin endpoint to create a new project."""
    try:
        # Check if owner user exists
        owner_user = db.query(User).filter(User.email == project_data.owner_email).first()
        if not owner_user:
            raise HTTPException(
                status_code=400,
                detail="Owner user not found"
            )
        
        # Generate slug from name
        slug = project_data.name.lower().replace(' ', '-').replace('_', '-')
        
        # Check if slug is unique
        existing_project = db.query(Project).filter(Project.slug == slug).first()
        if existing_project:
            slug = f"{slug}-{int(datetime.utcnow().timestamp())}"
        
        # Create project
        new_project = Project(
            name=project_data.name,
            description=project_data.description,
            slug=slug,
            created_by=owner_user.id,
            sse_auth_required=project_data.sse_auth_required,
            message_auth_required=project_data.message_auth_required,
            allowed_ip_ranges=project_data.allowed_ip_ranges or []
        )
        
        db.add(new_project)
        db.flush()  # Get the project ID
        
        # Add owner membership
        owner_membership = ProjectMember(
            project_id=new_project.id,
            user_id=owner_user.id,
            role=ProjectRole.OWNER,
            invited_as=InviteSource.INDIVIDUAL,
            invited_by=current_user.id,
            joined_at=datetime.utcnow()
        )
        
        db.add(owner_membership)
        db.commit()
        db.refresh(new_project)
        
        return AdminProjectResponse(
            id=str(new_project.id),
            name=new_project.name,
            description=new_project.description,
            slug=new_project.slug,
            created_by=str(new_project.created_by),
            created_at=new_project.created_at,
            updated_at=new_project.updated_at,
            sse_auth_required=new_project.sse_auth_required,
            message_auth_required=new_project.message_auth_required,
            allowed_ip_ranges=new_project.allowed_ip_ranges or [],
            member_count=1,
            server_count=0,
            api_key_count=0,
            creator_name=owner_user.name,
            creator_email=owner_user.email,
            owner_name=owner_user.name,
            owner_email=owner_user.email
        )
        
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=500,
            detail=f"Error creating project: {str(e)}"
        )


@router.put("/{project_id}", response_model=AdminProjectResponse)
async def update_project_admin(
    request: Request,
    project_id: str,
    project_data: AdminUpdateProjectRequest,
    current_user: User = Depends(get_current_admin_user),
    db: Session = Depends(get_db)
):
    """Admin endpoint to update project information."""
    try:
        project = db.query(Project).filter(Project.id == project_id).first()
        if not project:
            raise HTTPException(
                status_code=404,
                detail="Project not found"
            )
        
        # Update fields
        if project_data.name is not None:
            project.name = project_data.name
            # Update slug when name changes
            project.slug = project_data.name.lower().replace(' ', '-').replace('_', '-')
        if project_data.description is not None:
            project.description = project_data.description
        if project_data.sse_auth_required is not None:
            project.sse_auth_required = project_data.sse_auth_required
        if project_data.message_auth_required is not None:
            project.message_auth_required = project_data.message_auth_required
        if project_data.allowed_ip_ranges is not None:
            project.allowed_ip_ranges = project_data.allowed_ip_ranges
        
        project.updated_at = datetime.utcnow()
        
        db.commit()
        db.refresh(project)
        
        # Get updated statistics
        member_count = db.query(ProjectMember).filter(
            ProjectMember.project_id == project.id
        ).count()
        
        server_count = db.query(McpServer).filter(
            McpServer.project_id == project.id
        ).count()
        
        api_key_count = db.query(ApiKey).filter(
            ApiKey.project_id == project.id
        ).count()
        
        creator = db.query(User).filter(User.id == project.created_by).first()
        creator_name = creator.name if creator else None
        creator_email = creator.email if creator else None
        
        owner_membership = db.query(ProjectMember).options(
            joinedload(ProjectMember.user)
        ).filter(
            and_(
                ProjectMember.project_id == project.id,
                ProjectMember.role == ProjectRole.OWNER
            )
        ).first()
        
        owner_name = owner_membership.user.name if owner_membership else None
        owner_email = owner_membership.user.email if owner_membership else None
        
        return AdminProjectResponse(
            id=str(project.id),
            name=project.name,
            description=project.description,
            slug=project.slug,
            created_by=str(project.created_by),
            created_at=project.created_at,
            updated_at=project.updated_at,
            sse_auth_required=project.sse_auth_required,
            message_auth_required=project.message_auth_required,
            allowed_ip_ranges=project.allowed_ip_ranges or [],
            member_count=member_count,
            server_count=server_count,
            api_key_count=api_key_count,
            creator_name=creator_name,
            creator_email=creator_email,
            owner_name=owner_name,
            owner_email=owner_email
        )
        
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=500,
            detail=f"Error updating project: {str(e)}"
        )


@router.delete("/{project_id}")
async def delete_project_admin(
    request: Request,
    project_id: str,
    current_user: User = Depends(get_current_admin_user),
    db: Session = Depends(get_db)
):
    """Admin endpoint to delete a project (hard delete)."""
    try:
        project = db.query(Project).filter(Project.id == project_id).first()
        if not project:
            raise HTTPException(
                status_code=404,
                detail="Project not found"
            )
        
        # Hard delete the project (cascading relationships will be handled by SQLAlchemy)
        db.delete(project)
        db.commit()
        
        return {"message": "Project deleted successfully"}
        
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=500,
            detail=f"Error deleting project: {str(e)}"
        )


@router.get("/{project_id}/members", response_model=List[AdminProjectMemberResponse])
async def get_project_members_admin(
    request: Request,
    project_id: str,
    current_user: User = Depends(get_current_admin_user),
    db: Session = Depends(get_db)
):
    """Admin endpoint to get project members."""
    try:
        project = db.query(Project).filter(Project.id == project_id).first()
        if not project:
            raise HTTPException(
                status_code=404,
                detail="Project not found"
            )
        
        members = db.query(ProjectMember).options(
            joinedload(ProjectMember.user),
            joinedload(ProjectMember.inviter)
        ).filter(
            ProjectMember.project_id == project.id
        ).all()
        
        member_responses = []
        for member in members:
            # Get team information if invited as team member
            team_id = None
            team_name = None
            
            if member.invited_as == InviteSource.TEAM_MEMBER:
                # Find the team through team membership
                team_membership = db.query(TeamMember).options(
                    joinedload(TeamMember.team)
                ).filter(
                    TeamMember.user_id == member.user_id
                ).first()
                
                if team_membership:
                    team_id = str(team_membership.team_id)
                    team_name = team_membership.team.name
            
            member_response = AdminProjectMemberResponse(
                id=str(member.id),
                user_id=str(member.user_id),
                user_name=member.user.name,
                user_email=member.user.email,
                role=member.role.value if hasattr(member.role, 'value') else member.role,
                invited_as=member.invited_as.value if hasattr(member.invited_as, 'value') else member.invited_as,
                invited_by_id=str(member.invited_by),
                invited_by_name=member.inviter.name if member.inviter else "Unknown",
                joined_at=member.joined_at,
                team_id=team_id,
                team_name=team_name
            )
            member_responses.append(member_response)
        
        return member_responses
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error retrieving project members: {str(e)}"
        )


@router.post("/{project_id}/transfer-ownership")
async def transfer_project_ownership_admin(
    request: Request,
    project_id: str,
    transfer_data: AdminTransferOwnershipRequest,
    current_user: User = Depends(get_current_admin_user),
    db: Session = Depends(get_db)
):
    """Admin endpoint to transfer project ownership."""
    try:
        project = db.query(Project).filter(Project.id == project_id).first()
        if not project:
            raise HTTPException(
                status_code=404,
                detail="Project not found"
            )
        
        # Find new owner user
        new_owner = db.query(User).filter(User.email == transfer_data.new_owner_email).first()
        if not new_owner:
            raise HTTPException(
                status_code=400,
                detail="New owner user not found"
            )
        
        # Check if new owner is already a project member
        existing_membership = db.query(ProjectMember).filter(
            and_(
                ProjectMember.project_id == project.id,
                ProjectMember.user_id == new_owner.id
            )
        ).first()
        
        if existing_membership:
            # Update existing membership to OWNER
            existing_membership.role = ProjectRole.OWNER
        else:
            # Add new owner as member
            new_membership = ProjectMember(
                project_id=project.id,
                user_id=new_owner.id,
                role=ProjectRole.OWNER,
                invited_as=InviteSource.INDIVIDUAL,
                invited_by=current_user.id,
                joined_at=datetime.utcnow()
            )
            db.add(new_membership)
        
        # Demote current owner(s) to DEVELOPER
        current_owners = db.query(ProjectMember).filter(
            and_(
                ProjectMember.project_id == project.id,
                ProjectMember.role == ProjectRole.OWNER,
                ProjectMember.user_id != new_owner.id
            )
        ).all()
        
        for owner in current_owners:
            owner.role = ProjectRole.DEVELOPER
        
        # Update project created_by if different
        if project.created_by != new_owner.id:
            project.created_by = new_owner.id
            project.updated_at = datetime.utcnow()
        
        db.commit()
        
        return {"message": f"Project ownership transferred to {transfer_data.new_owner_email}"}
        
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=500,
            detail=f"Error transferring ownership: {str(e)}"
        )
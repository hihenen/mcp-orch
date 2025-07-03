"""
팀 서버 관리 API 엔드포인트
"""

from typing import List
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session
from sqlalchemy import and_

from ...database import get_db
from ...models.team import Team, TeamMember, TeamRole
from ...models.mcp_server import McpServer
from ...models import ProjectMember
from .common import get_team_and_verify_access, TeamServerResponse

router = APIRouter()


@router.get("/{team_id}/servers", response_model=List[TeamServerResponse])
async def get_team_servers(
    team_id: str,
    request: Request,
    db: Session = Depends(get_db)
):
    """Get all servers accessible by the team."""
    current_user = getattr(request.state, 'user', None)
    
    if not current_user:
        raise HTTPException(status_code=401, detail="Authentication required")
    
    team, _ = get_team_and_verify_access(team_id, current_user, db)
    
    # Get team's servers (through projects owned by team members)
    team_member_ids = db.query(TeamMember.user_id).filter(
        TeamMember.team_id == team.id
    ).subquery()
    
    team_project_ids = db.query(ProjectMember.project_id).filter(
        ProjectMember.user_id.in_(
            db.query(team_member_ids.c.user_id)
        )
    ).distinct().subquery()
    
    servers = db.query(McpServer).filter(
        McpServer.project_id.in_(
            db.query(team_project_ids.c.project_id)
        )
    ).all()
    
    return [
        TeamServerResponse(
            id=str(server.id),
            name=server.name,
            description=server.description,
            command=server.command,
            args=server.args or [],
            env=server.env or {},
            disabled=not server.is_enabled,
            status="active" if server.is_enabled else "disabled"
        )
        for server in servers
    ]


@router.post("/{team_id}/servers")
async def create_team_server(
    team_id: str,
    server_data: dict,
    request: Request,
    db: Session = Depends(get_db)
):
    """Create a new server for the team (requires a specific project)."""
    current_user = getattr(request.state, 'user', None)
    
    if not current_user:
        raise HTTPException(status_code=401, detail="Authentication required")
    
    team, _ = get_team_and_verify_access(team_id, current_user, db, TeamRole.DEVELOPER)
    
    # This endpoint requires project_id to be specified
    project_id = server_data.get('project_id')
    if not project_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="project_id is required to create a team server"
        )
    
    # Verify project access through team membership
    try:
        project_uuid = UUID(project_id)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid project ID format"
        )
    
    # Check if user has access to this project through team membership
    team_member_ids = db.query(TeamMember.user_id).filter(
        TeamMember.team_id == team.id
    ).subquery()
    
    project_access = db.query(ProjectMember).filter(
        and_(
            ProjectMember.project_id == project_uuid,
            ProjectMember.user_id.in_(
                db.query(team_member_ids.c.user_id)
            )
        )
    ).first()
    
    if not project_access:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No team member has access to this project"
        )
    
    return {
        "message": "Server creation should be done through the project servers API",
        "redirect": f"/api/projects/{project_id}/servers"
    }
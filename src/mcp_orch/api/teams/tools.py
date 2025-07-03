"""
팀 도구 관리 API 엔드포인트
"""

from typing import List
from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session
from sqlalchemy import and_, func

from ...database import get_db
from ...models.team import Team, TeamMember, TeamRole
from ...models.mcp_server import McpServer
from ...models import ProjectMember
from ...models.tool_call_log import ToolCallLog
from .common import get_team_and_verify_access, TeamToolResponse

router = APIRouter()


@router.get("/{team_id}/tools", response_model=List[TeamToolResponse])
async def get_team_tools(
    team_id: str,
    request: Request,
    db: Session = Depends(get_db)
):
    """Get all tools accessible by the team."""
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
        and_(
            McpServer.project_id.in_(
                db.query(team_project_ids.c.project_id)
            ),
            McpServer.is_enabled == True
        )
    ).all()
    
    # Get tool usage statistics
    tools = []
    for server in servers:
        # Get tool usage count from ToolCallLog
        usage_count = db.query(func.count(ToolCallLog.id)).filter(
            and_(
                ToolCallLog.project_id == server.project_id,
                ToolCallLog.server_name == server.name
            )
        ).scalar() or 0
        
        # For now, we'll create synthetic tool entries based on server
        # In a real implementation, you might have a tools table or fetch from the actual MCP server
        tools.append(TeamToolResponse(
            id=f"{server.id}-tools",
            name=f"{server.name} Tools",
            server_name=server.name,
            description=f"Tools provided by {server.name} server",
            usage_count=usage_count
        ))
    
    return tools


@router.post("/{team_id}/tools")
async def create_team_tool(
    team_id: str,
    tool_data: dict,
    request: Request,
    db: Session = Depends(get_db)
):
    """Tools are managed through MCP servers, not created directly."""
    current_user = getattr(request.state, 'user', None)
    
    if not current_user:
        raise HTTPException(status_code=401, detail="Authentication required")
    
    team, _ = get_team_and_verify_access(team_id, current_user, db, TeamRole.DEVELOPER)
    
    return {
        "message": "Tools are automatically discovered from MCP servers. Create or configure servers to add tools.",
        "available_endpoints": [
            f"GET /api/teams/{team_id}/servers - View available servers",
            f"POST /api/teams/{team_id}/servers - Add new server (redirects to project endpoint)",
            f"GET /api/teams/{team_id}/tools - View tools from all team servers"
        ]
    }
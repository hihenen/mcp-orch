"""
팀 설정 관리 API
Cline 설정 생성 등 팀 관련 설정 기능
"""

from typing import Dict, Any
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import and_

from ...database import get_db
from ...models.team import TeamMember, TeamRole
from ...models.api_key import ApiKey
from ...models.mcp_server import McpServer
from ...models import Project, ProjectMember
from .common import get_team_and_verify_access

router = APIRouter()


@router.get("/{team_id}/cline-config")
async def get_team_cline_config(
    team_id: UUID,
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
        "team_id": str(team_id),
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
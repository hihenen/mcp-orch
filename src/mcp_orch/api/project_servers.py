"""
프로젝트 서버 관리 API
MCP 서버 CRUD, 상태 관리, 토글 기능
"""

from typing import List, Optional
from uuid import UUID
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_
from pydantic import BaseModel, Field

from ..database import get_db
from ..models import Project, ProjectMember, User, McpServer, ProjectRole
from .jwt_auth import get_user_from_jwt_token
from ..services.mcp_connection_service import mcp_connection_service

router = APIRouter(prefix="/api", tags=["project-servers"])


# Pydantic 모델들
class ServerCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    description: Optional[str] = None
    transport: str = Field(default="stdio")
    command: str = Field(..., min_length=1)
    args: List[str] = Field(default_factory=list)
    env: dict = Field(default_factory=dict)
    cwd: Optional[str] = None


class ServerUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=255)
    description: Optional[str] = None
    transport: Optional[str] = None
    command: Optional[str] = None
    args: Optional[List[str]] = None
    env: Optional[dict] = None
    cwd: Optional[str] = None


class ServerResponse(BaseModel):
    id: str
    name: str
    description: Optional[str]
    transport_type: str
    command: str
    args: List[str]
    env: dict
    cwd: Optional[str]
    disabled: bool
    status: str = "offline"
    tools_count: int = 0
    tools: List[dict] = []
    last_connected: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True


# 사용자 인증 dependency 함수
async def get_current_user_for_project_servers(
    request: Request,
    db: Session = Depends(get_db)
) -> User:
    """프로젝트 서버 API용 사용자 인증 함수"""
    user = await get_user_from_jwt_token(request, db)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required"
        )
    return user


# 프로젝트별 서버 관리 API
@router.get("/projects/{project_id}/servers", response_model=List[ServerResponse])
async def list_project_servers(
    project_id: UUID,
    current_user: User = Depends(get_current_user_for_project_servers),
    db: Session = Depends(get_db)
):
    """프로젝트별 MCP 서버 목록 조회"""
    
    # 프로젝트 접근 권한 확인
    project_member = db.query(ProjectMember).filter(
        and_(
            ProjectMember.project_id == project_id,
            ProjectMember.user_id == current_user.id
        )
    ).first()
    
    if not project_member:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project not found or access denied"
        )
    
    # 프로젝트별 서버 목록 조회
    servers = db.query(McpServer).filter(
        McpServer.project_id == project_id
    ).all()
    
    result = []
    for server in servers:
        # DB 기반으로 서버 상태 확인
        server_status = "offline"
        tools_count = 0
        
        # 서버가 비활성화된 경우
        if not server.is_enabled:
            server_status = "disabled"
        else:
            # 캐시된 상태 사용
            server_status = mcp_connection_service.get_cached_status(str(server.id))
            tools_count = mcp_connection_service.get_cached_tools_count(str(server.id))
            
            # 캐시된 상태가 없으면 기본값 사용
            if server_status == "unknown":
                server_status = "offline"
        
        result.append(ServerResponse(
            id=str(server.id),
            name=server.name,
            description=server.description,
            transport_type=server.transport_type or "stdio",
            command=server.command or "",
            args=server.args or [],
            env=server.env or {},
            cwd=server.cwd,
            disabled=not server.is_enabled,
            status=server_status,
            tools_count=tools_count,
            last_connected=server.last_used_at,
            created_at=server.created_at,
            updated_at=server.updated_at
        ))
    
    return result


@router.get("/projects/{project_id}/servers/{server_id}", response_model=ServerResponse)
async def get_project_server_detail(
    project_id: UUID,
    server_id: UUID,
    current_user: User = Depends(get_current_user_for_project_servers),
    db: Session = Depends(get_db)
):
    """프로젝트별 MCP 서버 상세 정보 조회"""
    
    # 프로젝트 접근 권한 확인
    project_member = db.query(ProjectMember).filter(
        and_(
            ProjectMember.project_id == project_id,
            ProjectMember.user_id == current_user.id
        )
    ).first()
    
    if not project_member:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project not found or access denied"
        )
    
    # 서버 조회
    server = db.query(McpServer).filter(
        and_(
            McpServer.id == server_id,
            McpServer.project_id == project_id
        )
    ).first()
    
    if not server:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Server not found"
        )
    
    # DB 기반으로 서버 상태 확인
    server_status = "offline"
    tools_count = 0
    
    # 서버가 비활성화된 경우
    if not server.is_enabled:
        server_status = "disabled"
    else:
        # 실시간 상태 확인
        tools = []
        try:
            server_config = mcp_connection_service._build_server_config_from_db(server)
            if server_config:
                # 프로젝트별 고유 서버 식별자 생성
                unique_server_id = mcp_connection_service._generate_unique_server_id(server)
                server_status = await mcp_connection_service.check_server_status(unique_server_id, server_config)
                if server_status == "online":
                    tools = await mcp_connection_service.get_server_tools(unique_server_id, server_config)
                    tools_count = len(tools)
                    print(f"✅ Retrieved {tools_count} tools for server {server.name}")
        except Exception as e:
            print(f"Error checking server status: {e}")
            server_status = "error"
    
    return {
        "id": str(server.id),
        "name": server.name,
        "description": server.description,
        "transport_type": server.transport_type or "stdio",
        "command": server.command or "",
        "args": server.args or [],
        "env": server.env or {},
        "cwd": server.cwd,
        "disabled": not server.is_enabled,
        "status": server_status,
        "tools_count": tools_count,
        "tools": tools if server_status == "online" else [],
        "last_connected": server.last_used_at,
        "created_at": server.created_at,
        "updated_at": server.updated_at
    }


@router.post("/projects/{project_id}/servers", response_model=ServerResponse)
async def create_project_server(
    project_id: UUID,
    server_data: ServerCreate,
    current_user: User = Depends(get_current_user_for_project_servers),
    db: Session = Depends(get_db)
):
    """프로젝트에 새 MCP 서버 추가 (Owner/Developer만 가능)"""
    
    # 프로젝트 권한 확인 (Owner 또는 Developer)
    project_member = db.query(ProjectMember).filter(
        and_(
            ProjectMember.project_id == project_id,
            ProjectMember.user_id == current_user.id,
            or_(
                ProjectMember.role == ProjectRole.OWNER,
                ProjectMember.role == ProjectRole.DEVELOPER
            )
        )
    ).first()
    
    if not project_member:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only project owners and developers can add servers"
        )
    
    # 서버 이름 중복 확인 (프로젝트 내에서)
    existing_server = db.query(McpServer).filter(
        and_(
            McpServer.project_id == project_id,
            McpServer.name == server_data.name
        )
    ).first()
    
    if existing_server:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Server name already exists in this project"
        )
    
    # 새 서버 생성
    new_server = McpServer(
        project_id=project_id,
        name=server_data.name,
        description=server_data.description,
        transport_type=server_data.transport,
        command=server_data.command,
        args=server_data.args,
        env=server_data.env,
        cwd=server_data.cwd,
        created_by_id=current_user.id
    )
    
    db.add(new_server)
    db.commit()
    db.refresh(new_server)
    
    return ServerResponse(
        id=str(new_server.id),
        name=new_server.name,
        description=new_server.description,
        transport_type=new_server.transport_type or "stdio",
        command=new_server.command or "",
        args=new_server.args or [],
        env=new_server.env or {},
        cwd=new_server.cwd,
        disabled=not new_server.is_enabled,
        status="offline",
        tools_count=0,
        last_connected=new_server.last_used_at,
        created_at=new_server.created_at,
        updated_at=new_server.updated_at
    )


@router.put("/projects/{project_id}/servers/{server_id}", response_model=ServerResponse)
async def update_project_server(
    project_id: UUID,
    server_id: UUID,
    server_data: ServerUpdate,
    current_user: User = Depends(get_current_user_for_project_servers),
    db: Session = Depends(get_db)
):
    """프로젝트 서버 정보 수정 (Owner/Developer만 가능)"""
    
    # 프로젝트 권한 확인 (Owner 또는 Developer)
    project_member = db.query(ProjectMember).filter(
        and_(
            ProjectMember.project_id == project_id,
            ProjectMember.user_id == current_user.id,
            or_(
                ProjectMember.role == ProjectRole.OWNER,
                ProjectMember.role == ProjectRole.DEVELOPER
            )
        )
    ).first()
    
    if not project_member:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only project owners and developers can update servers"
        )
    
    # 서버 조회
    server = db.query(McpServer).filter(
        and_(
            McpServer.id == server_id,
            McpServer.project_id == project_id
        )
    ).first()
    
    if not server:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Server not found"
        )
    
    # 서버 이름 중복 확인 (다른 서버와)
    if server_data.name and server_data.name != server.name:
        existing_server = db.query(McpServer).filter(
            and_(
                McpServer.project_id == project_id,
                McpServer.name == server_data.name,
                McpServer.id != server_id
            )
        ).first()
        
        if existing_server:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Server name already exists in this project"
            )
    
    # 서버 정보 업데이트
    if server_data.name is not None:
        server.name = server_data.name
    if server_data.description is not None:
        server.description = server_data.description
    if server_data.transport is not None:
        server.transport_type = server_data.transport
    if server_data.command is not None:
        server.command = server_data.command
    if server_data.args is not None:
        server.args = server_data.args
    if server_data.env is not None:
        server.env = server_data.env
    if server_data.cwd is not None:
        server.cwd = server_data.cwd
    
    server.updated_at = datetime.utcnow()
    
    db.commit()
    db.refresh(server)
    
    return ServerResponse(
        id=str(server.id),
        name=server.name,
        description=server.description,
        transport_type=server.transport_type or "stdio",
        command=server.command or "",
        args=server.args or [],
        env=server.env or {},
        cwd=server.cwd,
        disabled=not server.is_enabled,
        status="offline",
        tools_count=0,
        last_connected=server.last_used_at,
        created_at=server.created_at,
        updated_at=server.updated_at
    )


@router.delete("/projects/{project_id}/servers/{server_id}")
async def delete_project_server(
    project_id: UUID,
    server_id: UUID,
    current_user: User = Depends(get_current_user_for_project_servers),
    db: Session = Depends(get_db)
):
    """프로젝트에서 서버 삭제 (Owner/Developer만 가능)"""
    
    # 프로젝트 권한 확인 (Owner 또는 Developer)
    project_member = db.query(ProjectMember).filter(
        and_(
            ProjectMember.project_id == project_id,
            ProjectMember.user_id == current_user.id,
            or_(
                ProjectMember.role == ProjectRole.OWNER,
                ProjectMember.role == ProjectRole.DEVELOPER
            )
        )
    ).first()
    
    if not project_member:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only project owners and developers can delete servers"
        )
    
    # 서버 조회
    server = db.query(McpServer).filter(
        and_(
            McpServer.id == server_id,
            McpServer.project_id == project_id
        )
    ).first()
    
    if not server:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Server not found"
        )
    
    # 서버 삭제
    server_name = server.name
    db.delete(server)
    db.commit()
    
    return {"message": f"Server '{server_name}' deleted successfully"}


@router.post("/projects/{project_id}/servers/{server_id}/toggle")
async def toggle_project_server(
    project_id: UUID,
    server_id: UUID,
    current_user: User = Depends(get_current_user_for_project_servers),
    db: Session = Depends(get_db)
):
    """프로젝트 서버 활성화/비활성화 토글 (Owner/Developer만 가능)"""
    
    # 프로젝트 권한 확인 (Owner 또는 Developer)
    project_member = db.query(ProjectMember).filter(
        and_(
            ProjectMember.project_id == project_id,
            ProjectMember.user_id == current_user.id,
            or_(
                ProjectMember.role == ProjectRole.OWNER,
                ProjectMember.role == ProjectRole.DEVELOPER
            )
        )
    ).first()
    
    if not project_member:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only project owners and developers can toggle servers"
        )
    
    # 서버 조회
    server = db.query(McpServer).filter(
        and_(
            McpServer.id == server_id,
            McpServer.project_id == project_id
        )
    ).first()
    
    if not server:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Server not found"
        )
    
    # 서버 상태 토글
    server.is_enabled = not server.is_enabled
    server.updated_at = datetime.utcnow()
    
    db.commit()
    db.refresh(server)
    
    status_text = "비활성화" if not server.is_enabled else "활성화"
    return {
        "message": f"서버 '{server.name}'가 {status_text}되었습니다.",
        "disabled": not server.is_enabled
    }


# MCP 서버 상태 관리 API
@router.post("/projects/{project_id}/servers/refresh-status")
async def refresh_project_servers_status(
    project_id: UUID,
    current_user: User = Depends(get_current_user_for_project_servers),
    db: Session = Depends(get_db)
):
    """프로젝트 내 모든 MCP 서버 상태 새로고침"""
    
    # 프로젝트 접근 권한 확인
    project_member = db.query(ProjectMember).filter(
        and_(
            ProjectMember.project_id == project_id,
            ProjectMember.user_id == current_user.id
        )
    ).first()
    
    if not project_member:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project not found or access denied"
        )
    
    try:
        # 모든 서버 상태 새로고침
        server_results = await mcp_connection_service.refresh_all_servers(db)
        
        # 프로젝트별 서버만 필터링
        project_servers = db.query(McpServer).filter(
            McpServer.project_id == project_id
        ).all()
        
        project_results = {}
        for server in project_servers:
            server_id = str(server.id)
            if server_id in server_results:
                project_results[server_id] = server_results[server_id]
            else:
                project_results[server_id] = {
                    'status': 'not_configured',
                    'tools_count': 0,
                    'tools': []
                }
        
        return {
            "message": "Server status refreshed successfully",
            "servers": project_results,
            "refreshed_at": datetime.utcnow().isoformat()
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to refresh server status: {str(e)}"
        )


@router.post("/projects/{project_id}/servers/{server_id}/refresh-status")
async def refresh_project_server_status(
    project_id: UUID,
    server_id: UUID,
    current_user: User = Depends(get_current_user_for_project_servers),
    db: Session = Depends(get_db)
):
    """특정 MCP 서버 상태 새로고침"""
    
    # 프로젝트 접근 권한 확인
    project_member = db.query(ProjectMember).filter(
        and_(
            ProjectMember.project_id == project_id,
            ProjectMember.user_id == current_user.id
        )
    ).first()
    
    if not project_member:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project not found or access denied"
        )
    
    # 서버 조회
    server = db.query(McpServer).filter(
        and_(
            McpServer.id == server_id,
            McpServer.project_id == project_id
        )
    ).first()
    
    if not server:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Server not found"
        )
    
    try:
        # 데이터베이스에서 서버 설정 구성
        server_config = mcp_connection_service._build_server_config_from_db(server)
        if not server_config:
            return {
                "message": f"Server '{server.name}' configuration is incomplete",
                "status": "not_configured",
                "tools_count": 0,
                "tools": []
            }
        
        # 서버 상태 확인
        status_result = await mcp_connection_service.check_server_status(server.name, server_config)
        
        # 도구 목록 조회 (온라인인 경우에만)
        tools = []
        if status_result == "online":
            tools = await mcp_connection_service.get_server_tools(server.name, server_config)
            # 데이터베이스 업데이트
            server.last_used_at = datetime.utcnow()
            db.commit()
        
        return {
            "message": f"Server '{server.name}' status refreshed successfully",
            "status": status_result,
            "tools_count": len(tools),
            "tools": tools,
            "refreshed_at": datetime.utcnow().isoformat()
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to refresh server status: {str(e)}"
        )

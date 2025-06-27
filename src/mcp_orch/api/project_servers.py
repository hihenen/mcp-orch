"""
프로젝트 서버 관리 API
MCP 서버 CRUD, 상태 관리, 토글 기능
"""

from typing import List, Optional, Union, Dict, Any
from uuid import UUID
from datetime import datetime, timedelta
import logging

from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_
from pydantic import BaseModel, Field

from ..database import get_db
from ..models import Project, ProjectMember, User, McpServer, ProjectRole, ServerLog, LogLevel, LogCategory
from ..models.mcp_server import McpServerStatus
from ..models.tool_call_log import CallStatus
from .jwt_auth import get_user_from_jwt_token
from ..services.mcp_connection_service import mcp_connection_service, ToolExecutionError

router = APIRouter(prefix="/api", tags=["project-servers"])
logger = logging.getLogger(__name__)


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
    live_check: bool = False,
    current_user: User = Depends(get_current_user_for_project_servers),
    db: Session = Depends(get_db)
):
    """프로젝트별 MCP 서버 목록 조회
    
    Args:
        live_check: True일 경우 실시간 서버 상태 확인 (성능 저하 가능성)
    """
    
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
        # 서버가 비활성화된 경우
        if not server.is_enabled:
            server_status = "disabled"
            tools_count = 0
        elif live_check:
            # 실시간 상태 확인 (성능 저하 가능성)
            server_status = "offline"
            tools_count = 0
            try:
                server_config = mcp_connection_service._build_server_config_from_db(server)
                if server_config:
                    # 프로젝트별 고유 서버 식별자 생성
                    unique_server_id = mcp_connection_service._generate_unique_server_id(server)
                    server_status = await mcp_connection_service.check_server_status(unique_server_id, server_config)
                    if server_status == "online":
                        tools = await mcp_connection_service.get_server_tools(unique_server_id, server_config, db, str(server.project_id))
                        tools_count = len(tools)
                        logger.info(f"✅ Live check: Retrieved {tools_count} tools for server {server.name}")
            except Exception as e:
                logger.error(f"Error in live check for server {server.name}: {e}")
                server_status = "error"
        else:
            # DB에 저장된 상태 정보 사용 (기본값)
            server_status = "offline"
            tools_count = 0
            
            # 데이터베이스에서 마지막 알려진 상태 사용
            if hasattr(server, 'status') and server.status:
                # McpServerStatus enum을 문자열로 변환
                if hasattr(server.status, 'value'):
                    db_status = server.status.value
                else:
                    db_status = str(server.status)
                
                # 상태 매핑
                if db_status == "active":
                    server_status = "online"
                elif db_status == "inactive":
                    server_status = "offline"
                elif db_status == "error":
                    server_status = "error"
                else:
                    server_status = "offline"
            else:
                server_status = "unknown"
            
            # 도구 개수는 데이터베이스의 tools 관계에서 조회
            tools_count = len(server.tools) if server.tools else 0
            
            logger.info(f"Server {server.name} using cached status: {server_status}, tools: {tools_count}")
        
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
                    tools = await mcp_connection_service.get_server_tools(unique_server_id, server_config, db, str(server.project_id))
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
    
    logger.info(f"🔥 UPDATE_PROJECT_SERVER FUNCTION CALLED! project_id={project_id}, server_id={server_id}")
    logger.info(f"🔥 Request user: {current_user.email if current_user else 'None'}")
    logger.info(f"🔥 Server data received: {server_data}")
    
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
        logger.error(f"🔥 Permission denied for user {current_user.email}")
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
        logger.error(f"🔥 Server not found: {server_id}")
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Server not found"
        )
    
    logger.info(f"🔥 Found server: {server.name} for update")
    
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
    logger.info(f"🔧 Updating server {server.name} with data: {server_data}")
    if server_data.name is not None:
        logger.info(f"🔥 Updating name: {server.name} -> {server_data.name}")
        server.name = server_data.name
    if server_data.description is not None:
        logger.info(f"🔥 Updating description: {server.description} -> {server_data.description}")
        server.description = server_data.description
    if server_data.transport is not None:
        logger.info(f"🔥 Updating transport: {server.transport_type} -> {server_data.transport}")
        server.transport_type = server_data.transport
    if server_data.command is not None:
        logger.info(f"🔥 Updating command: {server.command} -> {server_data.command}")
        server.command = server_data.command
    if server_data.args is not None:
        logger.info(f"🔥 Updating args: {server.args} -> {server_data.args}")
        server.args = server_data.args
    if server_data.env is not None:
        logger.info(f"🔥 Updating env: {server.env} -> {server_data.env}")
        server.env = server_data.env
    if server_data.cwd is not None:
        logger.info(f"🔥 Updating cwd: {server.cwd} -> {server_data.cwd}")
        server.cwd = server_data.cwd
    
    server.updated_at = datetime.utcnow()
    
    logger.info(f"🔥 Committing server updates to database")
    db.commit()
    logger.info(f"🔥 Server updates committed successfully")
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
        # 프로젝트별 서버만 조회
        project_servers = db.query(McpServer).filter(
            McpServer.project_id == project_id
        ).all()
        
        project_results = {}
        updated_count = 0
        
        for server in project_servers:
            try:
                # 서버 설정 구성
                server_config = mcp_connection_service._build_server_config_from_db(server)
                if not server_config:
                    server.status = McpServerStatus.ERROR
                    server.last_error = "Server configuration is incomplete"
                    project_results[str(server.id)] = {
                        'status': 'not_configured',
                        'tools_count': 0,
                        'tools': []
                    }
                    continue
                
                # 고유 서버 ID 생성
                unique_server_id = mcp_connection_service._generate_unique_server_id(server)
                
                # 서버 상태 확인
                status_result = await mcp_connection_service.check_server_status(unique_server_id, server_config)
                
                # 도구 목록 조회 (온라인인 경우에만)
                tools = []
                if status_result == "online":
                    tools = await mcp_connection_service.get_server_tools(unique_server_id, server_config, db, str(server.project_id))
                    server.status = McpServerStatus.ACTIVE
                    server.last_used_at = datetime.utcnow()
                    server.last_error = None
                elif status_result == "offline":
                    server.status = McpServerStatus.INACTIVE
                else:  # error
                    server.status = McpServerStatus.ERROR
                    server.last_error = f"Connection failed: {status_result}"
                
                project_results[str(server.id)] = {
                    'status': status_result,
                    'tools_count': len(tools),
                    'tools': tools
                }
                updated_count += 1
                
            except Exception as e:
                logger.error(f"Error refreshing server {server.name}: {e}")
                server.status = McpServerStatus.ERROR
                server.last_error = str(e)
                project_results[str(server.id)] = {
                    'status': 'error',
                    'tools_count': 0,
                    'tools': []
                }
        
        # 모든 변경사항 한 번에 커밋
        db.commit()
        
        return {
            "message": f"Refreshed {updated_count}/{len(project_servers)} servers successfully",
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
            # 설정 불완전 상태로 DB 업데이트
            server.status = McpServerStatus.ERROR
            server.last_error = "Server configuration is incomplete"
            db.commit()
            return {
                "message": f"Server '{server.name}' configuration is incomplete",
                "status": "not_configured",
                "tools_count": 0,
                "tools": []
            }
        
        # 고유 서버 ID 생성
        unique_server_id = mcp_connection_service._generate_unique_server_id(server)
        
        # 서버 상태 확인
        status_result = await mcp_connection_service.check_server_status(unique_server_id, server_config)
        
        # 도구 목록 조회 (온라인인 경우에만)
        tools = []
        if status_result == "online":
            tools = await mcp_connection_service.get_server_tools(unique_server_id, server_config, db, str(server.project_id))
            # 상태를 active로 업데이트
            server.status = McpServerStatus.ACTIVE
            server.last_used_at = datetime.utcnow()
            server.last_error = None
        elif status_result == "offline":
            server.status = McpServerStatus.INACTIVE
        else:  # error
            server.status = McpServerStatus.ERROR
            server.last_error = f"Connection failed: {status_result}"
        
        # 데이터베이스 업데이트
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


class ToolExecuteRequest(BaseModel):
    arguments: dict = Field(default_factory=dict, description="Tool arguments")


class ToolExecuteResponse(BaseModel):
    success: bool
    result: Optional[Union[dict, str]] = None
    error: Optional[str] = None
    executed_at: str


@router.post("/projects/{project_id}/servers/{server_id}/tools/{tool_name}/execute", 
             response_model=ToolExecuteResponse)
async def execute_project_server_tool(
    project_id: UUID,
    server_id: UUID,
    tool_name: str,
    request: ToolExecuteRequest,
    current_user: User = Depends(get_current_user_for_project_servers),
    db: Session = Depends(get_db)
):
    """프로젝트 서버의 특정 도구 실행"""
    
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
    
    if not server.is_enabled:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Server is disabled"
        )
    
    try:
        # 서버 설정 구성
        server_config = mcp_connection_service._build_server_config_from_db(server)
        if not server_config:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Server configuration is incomplete"
            )
        
        # 도구 실행
        logger.info(f"Executing tool '{tool_name}' on server '{server.name}' with arguments: {request.arguments}")
        
        result = await mcp_connection_service.call_tool(
            str(server.id),  # UUID를 문자열로 변환하여 전달
            server_config, 
            tool_name, 
            request.arguments,
            project_id=project_id,  # 프로젝트 ID 전달
            db=db  # 데이터베이스 세션 전달
        )
        
        # 서버 사용 시간 업데이트
        server.last_used_at = datetime.utcnow()
        db.commit()
        
        return ToolExecuteResponse(
            success=True,
            result=result,
            executed_at=datetime.utcnow().isoformat()
        )
        
    except ToolExecutionError as e:
        logger.error(f"Tool execution failed: {e.message} (Code: {e.error_code})")
        return ToolExecuteResponse(
            success=False,
            error=f"{e.message} (Error Code: {e.error_code})",
            executed_at=datetime.utcnow().isoformat()
        )
    except Exception as e:
        logger.error(f"Tool execution failed: {str(e)}")
        return ToolExecuteResponse(
            success=False,
            error=str(e),
            executed_at=datetime.utcnow().isoformat()
        )


# 로그 관련 Pydantic 모델
class ServerLogResponse(BaseModel):
    """서버 로그 응답 모델"""
    id: str
    level: str
    category: str
    message: str
    details: Optional[Dict[str, Any]] = None  # JSON 타입으로 변경하여 dict 데이터 허용
    timestamp: datetime
    source: Optional[str] = None

    class Config:
        from_attributes = True
        json_encoders = {
            datetime: lambda v: v.isoformat() + 'Z' if v else None  # UTC timezone 명시
        }


@router.get("/projects/{project_id}/servers/{server_id}/logs", response_model=List[ServerLogResponse])
async def get_server_logs(
    project_id: UUID,
    server_id: UUID,
    request: Request,
    level: Optional[str] = None,
    category: Optional[str] = None,
    limit: int = 100,
    db: Session = Depends(get_db)
):
    """서버 연결 로그 조회"""
    current_user = await get_user_from_jwt_token(request, db)
    
    # 프로젝트 권한 확인
    project_member = db.query(ProjectMember).filter(
        and_(
            ProjectMember.project_id == project_id,
            ProjectMember.user_id == current_user.id
        )
    ).first()
    
    if not project_member:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied to this project"
        )
    
    # 서버 존재 확인
    server = db.query(McpServer).filter(
        and_(
            McpServer.id == server_id,
            McpServer.project_id == project_id,
            McpServer.is_enabled == True
        )
    ).first()
    
    if not server:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Server not found"
        )
    
    # 로그 쿼리 구성 (server_id로만 필터링, project_id는 이미 위에서 검증됨)
    query = db.query(ServerLog).filter(ServerLog.server_id == server_id)
    
    # 필터링 적용
    if level:
        try:
            log_level = LogLevel(level.lower())
            query = query.filter(ServerLog.level == log_level)
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid log level: {level}"
            )
    
    if category:
        try:
            log_category = LogCategory(category.lower())
            query = query.filter(ServerLog.category == log_category)
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid log category: {category}"
            )
    
    # 최신순으로 정렬하고 제한
    logs = query.order_by(ServerLog.timestamp.desc()).limit(limit).all()
    
    return [
        ServerLogResponse(
            id=str(log.id),
            level=log.level.value,
            category=log.category.value,
            message=log.message,
            details=log.details,
            timestamp=log.timestamp,
            source=getattr(log, 'source', None)  # ServerLog 모델에 source 필드가 없으므로 기본값 None 사용
        )
        for log in logs
    ]


# Usage Statistics API Endpoints

class UsageSession(BaseModel):
    """Usage session response model"""
    id: str
    client_name: str
    status: str  # 'active' or 'inactive'
    last_activity: str
    created_at: str

class UsageStats(BaseModel):
    """Usage statistics response model"""
    total_calls: int
    successful_calls: int
    failed_calls: int
    average_response_time: float

class ToolCall(BaseModel):
    """Tool call response model"""
    id: str
    tool_name: str
    client_name: str
    status: str  # 'success' or 'error'
    response_time: float
    called_at: str
    error_message: Optional[str] = None


@router.get("/projects/{project_id}/servers/{server_id}/sessions", response_model=List[UsageSession])
async def get_server_sessions(
    project_id: UUID,
    server_id: UUID,
    current_user: User = Depends(get_current_user_for_project_servers),
    db: Session = Depends(get_db)
):
    """Get active client sessions for a server"""
    
    # Project access check
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
    
    # Server existence check
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
    
    # For now, return mock data. In real implementation, this would query session tracking tables
    mock_sessions = [
        {
            "id": "session_1",
            "client_name": "Cline",
            "status": "active",
            "last_activity": (datetime.utcnow() - timedelta(minutes=2)).isoformat(),
            "created_at": (datetime.utcnow() - timedelta(hours=1)).isoformat()
        },
        {
            "id": "session_2", 
            "client_name": "Cursor",
            "status": "inactive",
            "last_activity": (datetime.utcnow() - timedelta(hours=1)).isoformat(),
            "created_at": (datetime.utcnow() - timedelta(hours=2)).isoformat()
        }
    ]
    
    return [UsageSession(**session) for session in mock_sessions]


@router.get("/projects/{project_id}/servers/{server_id}/stats", response_model=UsageStats)
async def get_server_stats(
    project_id: UUID,
    server_id: UUID,
    current_user: User = Depends(get_current_user_for_project_servers),
    db: Session = Depends(get_db)
):
    """Get usage statistics for a server"""
    
    # Project access check
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
    
    # Server existence check
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
    
    # For now, return mock statistics. In real implementation, this would query tool call logs
    from ..models.tool_call_log import ToolCallLog
    
    # Get tool call statistics from the database
    try:
        # Total calls
        total_calls = db.query(ToolCallLog).filter(
            and_(
                ToolCallLog.server_id == server_id,
                ToolCallLog.project_id == project_id
            )
        ).count()
        
        # Successful calls
        successful_calls = db.query(ToolCallLog).filter(
            and_(
                ToolCallLog.server_id == server_id,
                ToolCallLog.project_id == project_id,
                ToolCallLog.status == CallStatus.SUCCESS
            )
        ).count()
        
        # Failed calls
        failed_calls = total_calls - successful_calls
        
        # Average response time
        avg_response_time = 0.0
        if total_calls > 0:
            response_times = db.query(ToolCallLog.execution_time_ms).filter(
                and_(
                    ToolCallLog.server_id == server_id,
                    ToolCallLog.project_id == project_id,
                    ToolCallLog.execution_time_ms.isnot(None)
                )
            ).all()
            
            if response_times:
                avg_response_time = sum(rt[0] / 1000.0 for rt in response_times if rt[0]) / len(response_times)
        
        return UsageStats(
            total_calls=total_calls,
            successful_calls=successful_calls,
            failed_calls=failed_calls,
            average_response_time=round(avg_response_time, 2)
        )
        
    except Exception as e:
        logger.error(f"Error getting server stats: {e}")
        # Return default stats if there's an error
        return UsageStats(
            total_calls=0,
            successful_calls=0,
            failed_calls=0,
            average_response_time=0.0
        )


@router.get("/projects/{project_id}/servers/{server_id}/calls", response_model=List[ToolCall])
async def get_server_tool_calls(
    project_id: UUID,
    server_id: UUID,
    limit: int = 10,
    current_user: User = Depends(get_current_user_for_project_servers),
    db: Session = Depends(get_db)
):
    """Get recent tool calls for a server"""
    
    # Project access check
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
    
    # Server existence check
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
    
    # Get recent tool calls from the database
    try:
        from ..models.tool_call_log import ToolCallLog, CallStatus
        
        tool_calls = db.query(ToolCallLog).filter(
            and_(
                ToolCallLog.server_id == server_id,
                ToolCallLog.project_id == project_id
            )
        ).order_by(ToolCallLog.timestamp.desc()).limit(limit).all()
        
        return [
            ToolCall(
                id=str(call.id),
                tool_name=call.tool_name,
                client_name="Unknown",  # ToolCallLog doesn't have client_name
                status=call.status.value if call.status else "unknown",
                response_time=call.execution_time or 0.0,
                called_at=call.timestamp.isoformat() if call.timestamp else datetime.utcnow().isoformat(),
                error_message=call.error_message if call.status != CallStatus.SUCCESS else None
            )
            for call in tool_calls
        ]
        
    except Exception as e:
        logger.error(f"Error getting server tool calls: {e}")
        # Return empty list if there's an error
        return []

"""
프로젝트 서버 관리 API
MCP 서버 CRUD, 상태 관리, 테스트 연결 기능
"""

from typing import List, Optional, Dict, Any
from uuid import UUID
from datetime import datetime
import logging
import json

from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session
from sqlalchemy import and_, func
from pydantic import BaseModel, Field

from ...database import get_db
from ...models import Project, ProjectMember, User, McpServer, ProjectRole
from ...services.mcp_connection_service import mcp_connection_service
from ...services.activity_logger import ActivityLogger
from .common import get_current_user_for_projects, verify_project_access, verify_project_member

router = APIRouter()
logger = logging.getLogger(__name__)


# Pydantic Models
class McpServerCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=255, description="서버 이름")
    command: str = Field(..., min_length=1, description="실행 명령어")
    args: Optional[List[str]] = Field(default_factory=list, description="명령어 인수")
    env: Optional[Dict[str, str]] = Field(default_factory=dict, description="환경변수")
    timeout: Optional[int] = Field(30, gt=0, le=300, description="연결 타임아웃 (초)")
    is_enabled: bool = Field(True, description="서버 활성화 상태")


class McpServerUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=255, description="서버 이름")
    command: Optional[str] = Field(None, min_length=1, description="실행 명령어")
    args: Optional[List[str]] = Field(None, description="명령어 인수")
    env: Optional[Dict[str, str]] = Field(None, description="환경변수")
    timeout: Optional[int] = Field(None, gt=0, le=300, description="연결 타임아웃 (초)")
    is_enabled: Optional[bool] = Field(None, description="서버 활성화 상태")
    jwt_auth_required: Optional[bool] = Field(None, description="JWT 인증 필요 여부")


class McpServerResponse(BaseModel):
    id: str
    name: str
    command: str
    args: List[str]
    env: Dict[str, str]
    timeout: int
    is_enabled: bool
    project_id: str
    created_at: datetime
    updated_at: datetime
    last_used_at: Optional[datetime] = None
    
    # Authentication settings
    jwt_auth_required: bool
    
    # 상태 정보 (서버 목록에서도 표시)
    status: str = "unknown"  # online, offline, error, disabled
    tools_count: int = 0
    
    class Config:
        from_attributes = True


class McpServerDetailResponse(BaseModel):
    id: str
    name: str
    command: str
    args: List[str]
    env: Dict[str, str]
    timeout: int
    is_enabled: bool
    project_id: str
    created_at: datetime
    updated_at: datetime
    last_used_at: Optional[datetime] = None
    
    # Authentication settings
    jwt_auth_required: bool
    
    # 추가 정보
    status: str = "unknown"  # online, offline, error, disabled
    tools_count: int = 0
    tools: List[Dict[str, Any]] = Field(default_factory=list)  # 툴 목록 추가
    
    class Config:
        from_attributes = True


class McpServerStatusResponse(BaseModel):
    server_id: str
    status: str  # online, offline, error, testing
    last_checked: datetime
    tools: List[Dict[str, Any]] = Field(default_factory=list)
    error_message: Optional[str] = None
    response_time_ms: Optional[float] = None


class McpServerTestRequest(BaseModel):
    command: str = Field(..., min_length=1, description="테스트할 명령어")
    args: Optional[List[str]] = Field(default_factory=list, description="명령어 인수")
    env: Optional[Dict[str, str]] = Field(default_factory=dict, description="환경변수")
    timeout: Optional[int] = Field(30, gt=0, le=60, description="테스트 타임아웃 (초)")


# Helper Functions
def check_server_name_availability(name: str, project_id: UUID, db: Session, exclude_server_id: UUID = None) -> bool:
    """프로젝트 내 서버 이름 중복 확인"""
    query = db.query(McpServer).filter(
        and_(
            McpServer.project_id == project_id,
            McpServer.name == name
        )
    )
    
    if exclude_server_id:
        query = query.filter(McpServer.id != exclude_server_id)
    
    return query.first() is None


async def get_server_status(server: McpServer) -> Dict[str, Any]:
    """서버 상태 조회"""
    try:
        if not server.is_enabled:
            return {
                "status": "disabled",
                "last_checked": datetime.utcnow(),
                "tools": [],
                "error_message": None,
                "response_time_ms": None
            }
        
        # 서버 설정 준비
        server_config = {
            "command": server.command,
            "args": server.args or [],
            "env": server.env or {},
            "timeout": server.timeout,
            "is_enabled": server.is_enabled
        }
        
        start_time = datetime.utcnow()
        
        # MCP 연결 서비스를 통한 상태 확인
        status = await mcp_connection_service.check_server_status(str(server.id), server_config)
        
        # 응답 시간 계산
        response_time = (datetime.utcnow() - start_time).total_seconds() * 1000
        
        # 온라인 상태일 때만 도구 목록 가져오기
        tools = []
        error_message = None
        
        if status == "online":
            try:
                tools = await mcp_connection_service.get_server_tools(str(server.id), server_config)
                logger.debug(f"✅ Retrieved {len(tools)} tools for server {server.id}")
            except Exception as tool_error:
                logger.warning(f"⚠️ Could not retrieve tools for server {server.id}: {tool_error}")
                error_message = f"Status online but tools unavailable: {str(tool_error)}"
        elif status == "error":
            error_message = "Server connection failed"
        
        return {
            "status": status,
            "last_checked": datetime.utcnow(),
            "tools": tools,
            "error_message": error_message,
            "response_time_ms": response_time
        }
        
    except Exception as e:
        logger.error(f"Error checking server status for {server.id}: {e}")
        return {
            "status": "error",
            "last_checked": datetime.utcnow(),
            "tools": [],
            "error_message": str(e),
            "response_time_ms": None
        }


async def test_server_connection(test_request: McpServerTestRequest) -> Dict[str, Any]:
    """서버 연결 테스트"""
    try:
        # 임시 서버 설정 생성
        temp_config = {
            "command": test_request.command,
            "args": test_request.args,
            "env": test_request.env,
            "timeout": test_request.timeout
        }
        
        # MCP 연결 테스트
        test_result = await mcp_connection_service.test_connection(temp_config)
        
        return {
            "success": test_result.get("success", False),
            "status": test_result.get("status", "error"),
            "tools": test_result.get("tools", []),
            "error_message": test_result.get("error"),
            "response_time_ms": test_result.get("response_time"),
            "server_info": test_result.get("server_info", {})
        }
        
    except Exception as e:
        logger.error(f"Error testing server connection: {e}")
        return {
            "success": False,
            "status": "error",
            "tools": [],
            "error_message": str(e),
            "response_time_ms": None,
            "server_info": {}
        }


# API Endpoints
@router.get("/projects/{project_id}/servers", response_model=List[McpServerResponse])
async def list_project_servers(
    project_id: UUID,
    current_user: User = Depends(get_current_user_for_projects),
    db: Session = Depends(get_db)
):
    """프로젝트 내 MCP 서버 목록 조회"""
    
    # 프로젝트 접근 권한 확인
    project, _ = verify_project_access(project_id, current_user, db)
    
    # 프로젝트의 서버들 조회
    servers = db.query(McpServer).filter(
        McpServer.project_id == project_id
    ).order_by(
        McpServer.name
    ).all()
    
    logger.info(f"Retrieved {len(servers)} servers for project {project_id}")
    
    # 각 서버의 상태 정보를 병렬로 가져오기
    server_responses = []
    for server in servers:
        try:
            # 각 서버의 상태 정보 조회
            status_info = await get_server_status(server)
            
            server_responses.append(McpServerResponse(
                id=str(server.id),
                name=server.name,
                command=server.command,
                args=server.args or [],
                env=server.env or {},
                timeout=server.timeout,
                is_enabled=server.is_enabled,
                project_id=str(server.project_id),
                created_at=server.created_at,
                updated_at=server.updated_at,
                last_used_at=server.last_used_at,
                jwt_auth_required=server.get_effective_jwt_auth_required(),
                status=status_info["status"],
                tools_count=len(status_info["tools"])
            ))
        except Exception as e:
            logger.warning(f"⚠️ Failed to get status for server {server.id}: {e}")
            # 상태 조회 실패 시 기본값으로 응답
            server_responses.append(McpServerResponse(
                id=str(server.id),
                name=server.name,
                command=server.command,
                args=server.args or [],
                env=server.env or {},
                timeout=server.timeout,
                is_enabled=server.is_enabled,
                project_id=str(server.project_id),
                created_at=server.created_at,
                updated_at=server.updated_at,
                last_used_at=server.last_used_at,
                jwt_auth_required=server.get_effective_jwt_auth_required(),
                status="unknown",
                tools_count=0
            ))
    
    return server_responses


@router.post("/projects/{project_id}/servers", response_model=McpServerResponse)
async def create_project_server(
    project_id: UUID,
    server_data: McpServerCreate,
    current_user: User = Depends(get_current_user_for_projects),
    db: Session = Depends(get_db)
):
    """프로젝트에 새 MCP 서버 추가 (Developer 이상 가능)"""
    
    # 프로젝트 멤버 권한 확인 (Developer 이상)
    project, project_member = verify_project_member(project_id, current_user, db, min_role=ProjectRole.DEVELOPER)
    
    # 서버 이름 중복 확인
    if not check_server_name_availability(server_data.name, project_id, db):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Server with name '{server_data.name}' already exists in this project"
        )
    
    # 새 서버 생성
    new_server = McpServer(
        name=server_data.name,
        command=server_data.command,
        args=server_data.args or [],
        env=server_data.env or {},
        timeout=server_data.timeout,
        is_enabled=server_data.is_enabled,
        project_id=project_id,
        created_by_id=current_user.id
    )
    
    db.add(new_server)
    db.commit()
    db.refresh(new_server)
    
    # 활동 로깅
    try:
        ActivityLogger.log_activity(
            db=db,
            user_id=current_user.id,
            project_id=project_id,
            action="server_created",
            description=f"MCP 서버 '{server_data.name}' 생성",
            meta_data={
                "server_id": str(new_server.id),
                "server_name": server_data.name,
                "command": server_data.command
            }
        )
    except Exception as e:
        logger.warning(f"Failed to log server creation activity: {e}")
    
    logger.info(f"Created server '{server_data.name}' in project {project_id}")
    
    # 새로 생성된 서버의 상태 정보 조회
    try:
        status_info = await get_server_status(new_server)
    except Exception as e:
        logger.warning(f"⚠️ Failed to get status for newly created server: {e}")
        status_info = {"status": "unknown", "tools": []}
    
    return McpServerResponse(
        id=str(new_server.id),
        name=new_server.name,
        command=new_server.command,
        args=new_server.args or [],
        env=new_server.env or {},
        timeout=new_server.timeout,
        is_enabled=new_server.is_enabled,
        project_id=str(new_server.project_id),
        created_at=new_server.created_at,
        updated_at=new_server.updated_at,
        last_used_at=new_server.last_used_at,
        jwt_auth_required=new_server.get_effective_jwt_auth_required(),
        status=status_info["status"],
        tools_count=len(status_info["tools"])
    )


@router.get("/projects/{project_id}/servers/{server_id}", response_model=McpServerDetailResponse)
async def get_project_server_detail(
    project_id: UUID,
    server_id: UUID,
    current_user: User = Depends(get_current_user_for_projects),
    db: Session = Depends(get_db)
):
    """프로젝트 내 MCP 서버 상세 정보 조회"""
    
    # 프로젝트 접근 권한 확인
    project, _ = verify_project_access(project_id, current_user, db)
    
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
    
    # 서버 상태 조회
    status_info = await get_server_status(server)
    
    logger.info(f"Retrieved server details for {server_id}")
    
    return McpServerDetailResponse(
        id=str(server.id),
        name=server.name,
        command=server.command,
        args=server.args or [],
        env=server.env or {},
        timeout=server.timeout,
        is_enabled=server.is_enabled,
        project_id=str(server.project_id),
        created_at=server.created_at,
        updated_at=server.updated_at,
        last_used_at=server.last_used_at,
        jwt_auth_required=server.get_effective_jwt_auth_required(),
        status=status_info["status"],
        tools_count=len(status_info["tools"]),
        tools=status_info["tools"]  # 툴 목록도 포함
    )


@router.put("/projects/{project_id}/servers/{server_id}", response_model=McpServerResponse)
async def update_project_server(
    project_id: UUID,
    server_id: UUID,
    server_data: McpServerUpdate,
    current_user: User = Depends(get_current_user_for_projects),
    db: Session = Depends(get_db)
):
    """프로젝트 내 MCP 서버 정보 수정 (Developer 이상 가능)"""
    
    # 프로젝트 멤버 권한 확인 (Developer 이상)
    project, project_member = verify_project_member(project_id, current_user, db, min_role=ProjectRole.DEVELOPER)
    
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
    
    # 업데이트할 필드가 있는지 확인
    update_data = server_data.dict(exclude_unset=True)
    if not update_data:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="At least one field must be provided for update"
        )
    
    # 서버 이름 변경 시 중복 확인
    if server_data.name and server_data.name != server.name:
        if not check_server_name_availability(server_data.name, project_id, db, server_id):
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Server with name '{server_data.name}' already exists in this project"
            )
    
    # 필드 업데이트
    old_values = {}
    for field, value in update_data.items():
        if hasattr(server, field):
            old_values[field] = getattr(server, field)
            setattr(server, field, value)
    
    server.updated_at = datetime.utcnow()
    
    db.commit()
    db.refresh(server)
    
    # 활동 로깅
    try:
        ActivityLogger.log_activity(
            db=db,
            user_id=current_user.id,
            project_id=project_id,
            action="server_updated",
            description=f"MCP 서버 '{server.name}' 설정 수정",
            meta_data={
                "server_id": str(server.id),
                "server_name": server.name,
                "updated_fields": update_data,
                "old_values": old_values
            }
        )
    except Exception as e:
        logger.warning(f"Failed to log server update activity: {e}")
    
    logger.info(f"Updated server {server_id} in project {project_id}")
    
    # 업데이트된 서버의 상태 정보 조회
    try:
        status_info = await get_server_status(server)
    except Exception as e:
        logger.warning(f"⚠️ Failed to get status for updated server: {e}")
        status_info = {"status": "unknown", "tools": []}
    
    return McpServerResponse(
        id=str(server.id),
        name=server.name,
        command=server.command,
        args=server.args or [],
        env=server.env or {},
        timeout=server.timeout,
        is_enabled=server.is_enabled,
        project_id=str(server.project_id),
        created_at=server.created_at,
        updated_at=server.updated_at,
        last_used_at=server.last_used_at,
        jwt_auth_required=server.get_effective_jwt_auth_required(),
        status=status_info["status"],
        tools_count=len(status_info["tools"])
    )


@router.delete("/projects/{project_id}/servers/{server_id}")
async def delete_project_server(
    project_id: UUID,
    server_id: UUID,
    current_user: User = Depends(get_current_user_for_projects),
    db: Session = Depends(get_db)
):
    """프로젝트에서 MCP 서버 삭제 (Developer 이상 가능)"""
    
    # 프로젝트 멤버 권한 확인 (Developer 이상)
    project, project_member = verify_project_member(project_id, current_user, db, min_role=ProjectRole.DEVELOPER)
    
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
    
    server_name = server.name
    
    # 서버 삭제
    db.delete(server)
    db.commit()
    
    # 활동 로깅
    try:
        ActivityLogger.log_activity(
            db=db,
            user_id=current_user.id,
            project_id=project_id,
            action="server_deleted",
            description=f"MCP 서버 '{server_name}' 삭제",
            meta_data={
                "deleted_server_id": str(server_id),
                "server_name": server_name,
                "command": server.command
            }
        )
    except Exception as e:
        logger.warning(f"Failed to log server deletion activity: {e}")
    
    logger.info(f"Deleted server '{server_name}' (ID: {server_id}) from project {project_id}")
    
    return {"message": "Server deleted successfully"}


@router.get("/projects/{project_id}/servers/{server_id}/status", response_model=McpServerStatusResponse)
async def get_project_server_status(
    project_id: UUID,
    server_id: UUID,
    current_user: User = Depends(get_current_user_for_projects),
    db: Session = Depends(get_db)
):
    """프로젝트 내 MCP 서버 실시간 상태 조회"""
    
    # 프로젝트 접근 권한 확인
    project, _ = verify_project_access(project_id, current_user, db)
    
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
    
    # 실시간 상태 조회
    status_info = await get_server_status(server)
    
    logger.info(f"Retrieved status for server {server_id}: {status_info['status']}")
    
    return McpServerStatusResponse(
        server_id=str(server.id),
        status=status_info["status"],
        last_checked=status_info["last_checked"],
        tools=status_info["tools"],
        error_message=status_info["error_message"],
        response_time_ms=status_info["response_time_ms"]
    )


@router.post("/projects/{project_id}/servers/test-connection")
async def test_project_server_connection(
    project_id: UUID,
    test_request: McpServerTestRequest,
    current_user: User = Depends(get_current_user_for_projects),
    db: Session = Depends(get_db)
):
    """프로젝트 내 MCP 서버 연결 테스트 (Developer 이상 가능)"""
    
    # 프로젝트 멤버 권한 확인 (Developer 이상)
    project, project_member = verify_project_member(project_id, current_user, db, min_role=ProjectRole.DEVELOPER)
    
    # 연결 테스트 실행
    test_result = await test_server_connection(test_request)
    
    # 활동 로깅 (테스트이므로 선택적)
    try:
        ActivityLogger.log_activity(
            db=db,
            user_id=current_user.id,
            project_id=project_id,
            action="server_connection_tested",
            description=f"MCP 서버 연결 테스트",
            meta_data={
                "command": test_request.command,
                "test_success": test_result["success"],
                "error_message": test_result.get("error_message")
            }
        )
    except Exception as e:
        logger.warning(f"Failed to log server test activity: {e}")
    
    logger.info(f"Tested server connection in project {project_id}: {test_result['success']}")
    
    return test_result


@router.post("/projects/{project_id}/servers/{server_id}/toggle")
async def toggle_project_server_status(
    project_id: UUID,
    server_id: UUID,
    current_user: User = Depends(get_current_user_for_projects),
    db: Session = Depends(get_db)
):
    """프로젝트 내 MCP 서버 활성화/비활성화 토글 (Developer 이상 가능)"""
    
    # 프로젝트 멤버 권한 확인 (Developer 이상)
    project, project_member = verify_project_member(project_id, current_user, db, min_role=ProjectRole.DEVELOPER)
    
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
    
    # 상태 토글
    old_status = server.is_enabled
    server.is_enabled = not server.is_enabled
    server.updated_at = datetime.utcnow()
    
    db.commit()
    db.refresh(server)
    
    # 활동 로깅
    try:
        ActivityLogger.log_activity(
            db=db,
            user_id=current_user.id,
            project_id=project_id,
            action="server_status_toggled",
            description=f"MCP 서버 '{server.name}' {'활성화' if server.is_enabled else '비활성화'}",
            meta_data={
                "server_id": str(server.id),
                "server_name": server.name,
                "old_status": old_status,
                "new_status": server.is_enabled
            }
        )
    except Exception as e:
        logger.warning(f"Failed to log server toggle activity: {e}")
    
    action = "enabled" if server.is_enabled else "disabled"
    logger.info(f"Server {server_id} {action} in project {project_id}")
    
    return {
        "message": f"Server {'enabled' if server.is_enabled else 'disabled'} successfully",
        "is_enabled": server.is_enabled
    }
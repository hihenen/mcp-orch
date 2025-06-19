"""
관리자 API
MCP 서버 관리 및 시스템 관리 기능
"""

from typing import List, Optional
from datetime import datetime
import logging

from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session
from pydantic import BaseModel

from ..database import get_db
from ..models import McpServer, User, Project, ProjectServer
from .jwt_auth import get_user_from_jwt_token

router = APIRouter(prefix="/api/admin", tags=["admin"])
logger = logging.getLogger(__name__)


# Pydantic 모델들
class McpServerStatus(BaseModel):
    """MCP 서버 상태"""
    id: str
    name: str
    description: Optional[str]
    command: str
    is_enabled: bool
    created_at: datetime
    updated_at: datetime
    metadata: Optional[dict] = None
    
    class Config:
        from_attributes = True


class McpServerUpdate(BaseModel):
    """MCP 서버 업데이트"""
    is_enabled: bool
    reason: Optional[str] = None


class SystemStats(BaseModel):
    """시스템 통계"""
    total_users: int
    active_users: int
    admin_users: int
    total_projects: int
    total_servers: int
    active_servers: int
    worker_status: str
    last_worker_run: Optional[str] = None
    
    class Config:
        from_attributes = True


async def get_admin_user(request: Request, db: Session = Depends(get_db)):
    """관리자 권한 확인"""
    user = await get_user_from_jwt_token(request, db)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required"
        )
    
    # TODO: 실제 프로덕션에서는 관리자 권한 체크 로직 추가
    # if not user.is_admin:
    #     raise HTTPException(
    #         status_code=status.HTTP_403_FORBIDDEN,
    #         detail="Admin privileges required"
    #     )
    
    return user


@router.get("/mcp-servers", response_model=List[McpServerStatus])
async def list_mcp_servers(
    current_user = Depends(get_admin_user),
    db: Session = Depends(get_db)
):
    """모든 MCP 서버 상태 조회"""
    try:
        servers = db.query(McpServer).all()
        return servers
    except Exception as e:
        logger.error(f"Error listing MCP servers: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve MCP servers"
        )


@router.get("/mcp-servers/{server_name}", response_model=McpServerStatus)
async def get_mcp_server(
    server_name: str,
    current_user = Depends(get_admin_user),
    db: Session = Depends(get_db)
):
    """특정 MCP 서버 상태 조회"""
    try:
        server = db.query(McpServer).filter(McpServer.name == server_name).first()
        if not server:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"MCP server '{server_name}' not found"
            )
        return server
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error retrieving MCP server {server_name}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve MCP server"
        )


@router.post("/mcp-servers/{server_name}/enable")
async def enable_mcp_server(
    server_name: str,
    update_data: McpServerUpdate,
    current_user = Depends(get_admin_user),
    db: Session = Depends(get_db)
):
    """MCP 서버 활성화"""
    try:
        server = db.query(McpServer).filter(McpServer.name == server_name).first()
        if not server:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"MCP server '{server_name}' not found"
            )
        
        server.is_enabled = True
        server.updated_at = datetime.utcnow()
        
        # 메타데이터에 활성화 정보 기록
        metadata = server.metadata or {}
        metadata['last_enabled'] = {
            'timestamp': datetime.utcnow().isoformat(),
            'by_user': current_user.email,
            'reason': update_data.reason or 'Manual enable'
        }
        # 자동 비활성화 기록이 있다면 클리어
        if 'last_failure' in metadata:
            metadata['last_failure_cleared'] = metadata.pop('last_failure')
        
        server.metadata = metadata
        db.commit()
        
        logger.info(f"MCP server '{server_name}' enabled by {current_user.email}")
        
        return {
            "message": f"MCP server '{server_name}' has been enabled",
            "server_name": server_name,
            "is_enabled": True,
            "note": "Server will be loaded on next restart"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error enabling MCP server {server_name}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to enable MCP server"
        )


@router.post("/mcp-servers/{server_name}/disable")
async def disable_mcp_server(
    server_name: str,
    update_data: McpServerUpdate,
    current_user = Depends(get_admin_user),
    db: Session = Depends(get_db)
):
    """MCP 서버 비활성화"""
    try:
        server = db.query(McpServer).filter(McpServer.name == server_name).first()
        if not server:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"MCP server '{server_name}' not found"
            )
        
        server.is_enabled = False
        server.updated_at = datetime.utcnow()
        
        # 메타데이터에 비활성화 정보 기록
        metadata = server.metadata or {}
        metadata['last_disabled'] = {
            'timestamp': datetime.utcnow().isoformat(),
            'by_user': current_user.email,
            'reason': update_data.reason or 'Manual disable',
            'manual': True
        }
        server.metadata = metadata
        db.commit()
        
        logger.info(f"MCP server '{server_name}' disabled by {current_user.email}")
        
        return {
            "message": f"MCP server '{server_name}' has been disabled",
            "server_name": server_name,
            "is_enabled": False,
            "note": "Server will not be loaded on next restart"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error disabling MCP server {server_name}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to disable MCP server"
        )


@router.get("/system/status")
async def get_system_status(
    current_user = Depends(get_admin_user),
    db: Session = Depends(get_db)
):
    """시스템 전체 상태 조회"""
    try:
        # MCP 서버 통계
        total_servers = db.query(McpServer).count()
        enabled_servers = db.query(McpServer).filter(McpServer.is_enabled == True).count()
        disabled_servers = total_servers - enabled_servers
        
        # 최근 실패한 서버들
        servers_with_failures = db.query(McpServer).filter(
            McpServer.metadata.op('?')('last_failure')
        ).all()
        
        recent_failures = []
        for server in servers_with_failures:
            if server.metadata and 'last_failure' in server.metadata:
                failure_info = server.metadata['last_failure']
                recent_failures.append({
                    'server_name': server.name,
                    'error': failure_info.get('error'),
                    'timestamp': failure_info.get('timestamp'),
                    'auto_disabled': failure_info.get('auto_disabled', False)
                })
        
        return {
            "mcp_servers": {
                "total": total_servers,
                "enabled": enabled_servers,
                "disabled": disabled_servers
            },
            "recent_failures": recent_failures,
            "system_health": "healthy" if disabled_servers == 0 else "degraded"
        }
        
    except Exception as e:
        logger.error(f"Error retrieving system status: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve system status"
        )


@router.get("/stats", response_model=SystemStats)
async def get_system_stats(
    current_user = Depends(get_admin_user),
    db: Session = Depends(get_db)
):
    """관리자 대시보드용 시스템 통계"""
    try:
        # 사용자 통계
        total_users = db.query(User).count()
        active_users = db.query(User).filter(User.is_active == True).count()
        admin_users = db.query(User).filter(User.is_admin == True).count()
        
        # 프로젝트 통계
        total_projects = db.query(Project).count()
        
        # MCP 서버 통계 (전체 서버와 프로젝트 서버 모두 포함)
        total_mcp_servers = db.query(McpServer).count()
        active_mcp_servers = db.query(McpServer).filter(McpServer.is_enabled == True).count()
        
        total_project_servers = db.query(ProjectServer).count()
        active_project_servers = db.query(ProjectServer).filter(ProjectServer.is_enabled == True).count()
        
        total_servers = total_mcp_servers + total_project_servers
        active_servers = active_mcp_servers + active_project_servers
        
        # TODO: 실제 워커 상태 체크 로직 구현
        # 현재는 기본값으로 실행 중으로 설정
        worker_status = "running"
        last_worker_run = datetime.utcnow().isoformat()
        
        return SystemStats(
            total_users=total_users,
            active_users=active_users,
            admin_users=admin_users,
            total_projects=total_projects,
            total_servers=total_servers,
            active_servers=active_servers,
            worker_status=worker_status,
            last_worker_run=last_worker_run
        )
        
    except Exception as e:
        logger.error(f"Error retrieving system stats: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve system statistics"
        )
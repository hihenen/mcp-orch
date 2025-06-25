"""
관리자 API
MCP 서버 관리 및 시스템 관리 기능
"""

from typing import List, Optional
from datetime import datetime, timedelta
import logging

from fastapi import APIRouter, Depends, HTTPException, status, Request, Query
from sqlalchemy.orm import Session
from sqlalchemy import desc, and_, or_
from pydantic import BaseModel, Field

from ..database import get_db
from ..models import McpServer, User, Project, ServerLog, LogLevel, LogCategory
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
    total_users: int  # 활성 사용자만 카운트 (삭제된 사용자 제외)
    admin_users: int
    total_projects: int
    total_servers: int
    active_servers: int


class AdminLogEntry(BaseModel):
    """관리자용 로그 항목"""
    id: str
    server_id: str
    project_id: str
    level: str
    category: str
    message: str
    details: Optional[str] = None
    timestamp: datetime
    source: Optional[str] = None
    
    # 관련 정보
    server_name: Optional[str] = None
    project_name: Optional[str] = None
    
    class Config:
        from_attributes = True
        json_encoders = {
            datetime: lambda v: v.isoformat() + 'Z' if v else None  # UTC timezone 명시
        }


class AdminLogFilter(BaseModel):
    """관리자 로그 필터"""
    level: Optional[List[str]] = None
    category: Optional[List[str]] = None
    project_id: Optional[str] = None
    server_id: Optional[str] = None
    start_time: Optional[datetime] = None
    end_time: Optional[datetime] = None
    search: Optional[str] = None


class AdminLogResponse(BaseModel):
    """관리자 로그 응답"""
    logs: List[AdminLogEntry]
    total_count: int
    page: int
    page_size: int
    has_more: bool


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
        # 사용자 통계 (활성 사용자만 카운트, 삭제된 사용자 제외)
        total_users = db.query(User).filter(User.is_active == True).count()
        admin_users = db.query(User).filter(User.is_admin == True, User.is_active == True).count()
        
        # 프로젝트 통계
        total_projects = db.query(Project).count()
        
        # MCP 서버 통계 (프로젝트별 서버들)
        total_servers = db.query(McpServer).count()
        active_servers = db.query(McpServer).filter(McpServer.is_enabled == True).count()
        
        # TODO: 실제 워커 상태 체크 로직 구현
        # 현재는 기본값으로 실행 중으로 설정
        worker_status = "running"
        last_worker_run = datetime.utcnow().isoformat()
        
        return SystemStats(
            total_users=total_users,
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


@router.get("/logs", response_model=AdminLogResponse)
async def get_system_logs(
    current_user = Depends(get_admin_user),
    db: Session = Depends(get_db),
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(50, ge=1, le=200, description="Items per page (max 200)"),
    level: Optional[List[str]] = Query(None, description="Filter by log levels"),
    category: Optional[List[str]] = Query(None, description="Filter by categories"), 
    project_id: Optional[str] = Query(None, description="Filter by project ID"),
    server_id: Optional[str] = Query(None, description="Filter by server ID"),
    start_time: Optional[datetime] = Query(None, description="Start time filter"),
    end_time: Optional[datetime] = Query(None, description="End time filter"),
    search: Optional[str] = Query(None, description="Search in message content")
):
    """
    관리자용 전체 시스템 로그 조회 (성능 최적화)
    
    Features:
    - 페이지네이션 (기본 50개, 최대 200개)
    - 날짜 범위 필터링
    - 로그 레벨/카테고리 필터링
    - 프로젝트/서버별 필터링
    - 메시지 내용 검색
    - 성능 최적화된 쿼리
    """
    try:
        # 기본 쿼리 구성 (JOIN으로 서버/프로젝트 정보 포함)
        query = db.query(
            ServerLog.id,
            ServerLog.server_id,
            McpServer.project_id.label('project_id'),
            ServerLog.level,
            ServerLog.category,
            ServerLog.message,
            ServerLog.details,
            ServerLog.timestamp,
            McpServer.name.label('server_name'),
            Project.name.label('project_name')
        ).join(
            McpServer, ServerLog.server_id == McpServer.id
        ).join(
            Project, McpServer.project_id == Project.id
        )
        
        # 기본 날짜 범위 제한 (성능을 위해 기본 최근 24시간)
        if not start_time and not end_time:
            start_time = datetime.utcnow() - timedelta(hours=24)
        
        # 날짜 범위 필터링
        if start_time:
            query = query.filter(ServerLog.timestamp >= start_time)
        if end_time:
            query = query.filter(ServerLog.timestamp <= end_time)
        
        # 로그 레벨 필터링
        if level:
            valid_levels = []
            for lvl in level:
                try:
                    # 문자열을 LogLevel enum으로 변환
                    log_level_enum = LogLevel(lvl)
                    valid_levels.append(log_level_enum)
                except ValueError:
                    # 유효하지 않은 레벨은 무시
                    logger.warning(f"Invalid log level: {lvl}")
            
            if valid_levels:
                query = query.filter(ServerLog.level.in_(valid_levels))
        
        # 카테고리 필터링
        if category:
            valid_categories = []
            for cat in category:
                try:
                    # 문자열을 LogCategory enum으로 변환
                    log_category_enum = LogCategory(cat)
                    valid_categories.append(log_category_enum)
                except ValueError:
                    # 유효하지 않은 카테고리는 무시
                    logger.warning(f"Invalid log category: {cat}")
            
            if valid_categories:
                query = query.filter(ServerLog.category.in_(valid_categories))
        
        # 프로젝트 ID 필터링
        if project_id:
            try:
                from uuid import UUID
                project_uuid = UUID(project_id)
                query = query.filter(McpServer.project_id == project_uuid)
            except ValueError:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Invalid project_id format"
                )
        
        # 서버 ID 필터링
        if server_id:
            try:
                from uuid import UUID
                server_uuid = UUID(server_id)
                query = query.filter(ServerLog.server_id == server_uuid)
            except ValueError:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Invalid server_id format"
                )
        
        # 메시지 검색 (PostgreSQL ILIKE 사용)
        if search:
            search_term = f"%{search}%"
            query = query.filter(
                or_(
                    ServerLog.message.ilike(search_term),
                    ServerLog.details.ilike(search_term),
                    McpServer.name.ilike(search_term),
                    Project.name.ilike(search_term)
                )
            )
        
        # 총 개수 계산 (성능을 위해 COUNT 쿼리 분리)
        total_count = query.count()
        
        # 정렬 및 페이지네이션 (최신 순)
        offset = (page - 1) * page_size
        logs_data = query.order_by(desc(ServerLog.timestamp)).offset(offset).limit(page_size).all()
        
        # 응답 데이터 구성
        logs = []
        for log_data in logs_data:
            log_entry = AdminLogEntry(
                id=str(log_data.id),
                server_id=str(log_data.server_id),
                project_id=str(log_data.project_id),
                level=log_data.level.value if hasattr(log_data.level, 'value') else str(log_data.level),
                category=log_data.category.value if hasattr(log_data.category, 'value') else str(log_data.category),
                message=log_data.message,
                details=log_data.details,
                timestamp=log_data.timestamp,
                source="server_log",  # ServerLog 모델에 source 필드가 없으므로 기본값 사용
                server_name=log_data.server_name,
                project_name=log_data.project_name
            )
            logs.append(log_entry)
        
        # 다음 페이지 존재 여부
        has_more = (offset + page_size) < total_count
        
        logger.info(f"Admin logs query: page={page}, size={page_size}, total={total_count}, filters={level or []}, search='{search or ''}'")
        
        return AdminLogResponse(
            logs=logs,
            total_count=total_count,
            page=page,
            page_size=page_size,
            has_more=has_more
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error retrieving admin logs: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve system logs"
        )
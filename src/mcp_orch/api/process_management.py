"""
Process Management API 엔드포인트
"""
from fastapi import APIRouter, HTTPException, Depends
from typing import List, Dict, Optional
from pydantic import BaseModel
from datetime import datetime

from ..services.process_manager import get_process_manager, ProcessManager
from .jwt_auth import get_current_user
from ..models.user import User

router = APIRouter(prefix="/api/process", tags=["process-management"])


# Pydantic 모델들
class ServerStartRequest(BaseModel):
    server_ids: List[str]
    force: bool = False


class ServerStopRequest(BaseModel):
    server_ids: List[str]
    graceful: bool = True


class ServerRestartRequest(BaseModel):
    server_ids: List[str]
    force: bool = False


class AutoRestartConfigRequest(BaseModel):
    enabled: bool


class ProcessStatusResponse(BaseModel):
    id: str
    name: str
    status: str
    is_enabled: bool
    is_running: bool
    process_id: Optional[int]
    last_health_check: Optional[datetime]
    health_check_failures: int
    last_started_at: Optional[datetime]
    restart_count: int
    last_error: Optional[str]
    memory_mb: int
    cpu_percent: float
    is_healthy: bool
    needs_restart: bool


class ProcessMetricsResponse(BaseModel):
    total_servers: int
    active_servers: int
    inactive_servers: int
    error_servers: int
    total_memory_mb: int
    total_cpu_percent: float
    health_check_failures: int


@router.get("/status", response_model=List[ProcessStatusResponse])
async def get_all_process_status(
    current_user: User = Depends(get_current_user),
    process_manager: ProcessManager = Depends(get_process_manager)
):
    """모든 MCP 서버 프로세스 상태 조회"""
    try:
        statuses = await process_manager.get_all_status()
        return [ProcessStatusResponse(**status) for status in statuses]
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"프로세스 상태 조회 실패: {str(e)}")


@router.get("/status/{server_id}", response_model=ProcessStatusResponse)
async def get_process_status(
    server_id: str,
    current_user: User = Depends(get_current_user),
    process_manager: ProcessManager = Depends(get_process_manager)
):
    """특정 서버 프로세스 상태 조회"""
    try:
        status = await process_manager.get_server_status(server_id)
        if not status:
            raise HTTPException(status_code=404, detail="서버를 찾을 수 없습니다")
        
        return ProcessStatusResponse(**status)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"프로세스 상태 조회 실패: {str(e)}")


@router.post("/start")
async def start_servers(
    request: ServerStartRequest,
    current_user: User = Depends(get_current_user),
    process_manager: ProcessManager = Depends(get_process_manager)
):
    """MCP 서버들 시작"""
    results = {}
    
    for server_id in request.server_ids:
        try:
            success = await process_manager.start_server(server_id)
            results[server_id] = {
                "success": success,
                "message": "시작 성공" if success else "시작 실패"
            }
        except Exception as e:
            results[server_id] = {
                "success": False,
                "message": f"시작 중 오류: {str(e)}"
            }
    
    return {
        "message": f"{len(request.server_ids)}개 서버 시작 요청 처리 완료",
        "results": results
    }


@router.post("/stop")
async def stop_servers(
    request: ServerStopRequest,
    current_user: User = Depends(get_current_user),
    process_manager: ProcessManager = Depends(get_process_manager)
):
    """MCP 서버들 중지"""
    results = {}
    
    for server_id in request.server_ids:
        try:
            success = await process_manager.stop_server(server_id)
            results[server_id] = {
                "success": success,
                "message": "중지 성공" if success else "중지 실패"
            }
        except Exception as e:
            results[server_id] = {
                "success": False,
                "message": f"중지 중 오류: {str(e)}"
            }
    
    return {
        "message": f"{len(request.server_ids)}개 서버 중지 요청 처리 완료",
        "results": results
    }


@router.post("/restart")
async def restart_servers(
    request: ServerRestartRequest,
    current_user: User = Depends(get_current_user),
    process_manager: ProcessManager = Depends(get_process_manager)
):
    """MCP 서버들 재시작"""
    results = {}
    
    for server_id in request.server_ids:
        try:
            success = await process_manager.restart_server(server_id)
            results[server_id] = {
                "success": success,
                "message": "재시작 성공" if success else "재시작 실패"
            }
        except Exception as e:
            results[server_id] = {
                "success": False,
                "message": f"재시작 중 오류: {str(e)}"
            }
    
    return {
        "message": f"{len(request.server_ids)}개 서버 재시작 요청 처리 완료",
        "results": results
    }


@router.get("/health")
async def get_health_status(
    current_user: User = Depends(get_current_user),
    process_manager: ProcessManager = Depends(get_process_manager)
):
    """전체 헬스체크 상태 조회"""
    try:
        statuses = await process_manager.get_all_status()
        
        healthy_count = sum(1 for s in statuses if s.get("is_healthy", False))
        total_count = len(statuses)
        
        return {
            "overall_health": "healthy" if healthy_count == total_count else "unhealthy",
            "healthy_servers": healthy_count,
            "total_servers": total_count,
            "unhealthy_servers": total_count - healthy_count,
            "last_check": datetime.utcnow(),
            "details": [
                {
                    "server_id": s["id"],
                    "name": s["name"],
                    "is_healthy": s.get("is_healthy", False),
                    "last_health_check": s.get("last_health_check"),
                    "failures": s.get("health_check_failures", 0)
                }
                for s in statuses
            ]
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"헬스체크 상태 조회 실패: {str(e)}")


@router.post("/health/check")
async def trigger_health_check(
    current_user: User = Depends(get_current_user),
    process_manager: ProcessManager = Depends(get_process_manager)
):
    """수동 헬스체크 실행"""
    try:
        await process_manager.health_check_all()
        return {
            "message": "헬스체크 실행 완료",
            "timestamp": datetime.utcnow()
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"헬스체크 실행 실패: {str(e)}")


@router.put("/config/{server_id}/auto-restart")
async def update_auto_restart_config(
    server_id: str,
    request: AutoRestartConfigRequest,
    current_user: User = Depends(get_current_user)
):
    """서버 자동 재시작 설정 변경"""
    from ..database import get_db_session
    from ..models.mcp_server import McpServer
    
    try:
        async with get_db_session() as db:
            server = await db.get(McpServer, server_id)
            if not server:
                raise HTTPException(status_code=404, detail="서버를 찾을 수 없습니다")
            
            server.is_auto_restart_enabled = request.enabled
            await db.commit()
            
            return {
                "message": f"서버 {server.name} 자동 재시작 설정 변경 완료",
                "server_id": server_id,
                "auto_restart_enabled": request.enabled
            }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"설정 변경 실패: {str(e)}")


@router.get("/metrics", response_model=ProcessMetricsResponse)
async def get_process_metrics(
    current_user: User = Depends(get_current_user),
    process_manager: ProcessManager = Depends(get_process_manager)
):
    """프로세스 메트릭 조회"""
    try:
        statuses = await process_manager.get_all_status()
        
        total_servers = len(statuses)
        active_servers = sum(1 for s in statuses if s.get("status") == "active")
        inactive_servers = sum(1 for s in statuses if s.get("status") == "inactive")
        error_servers = sum(1 for s in statuses if s.get("status") == "error")
        
        total_memory_mb = sum(s.get("memory_mb", 0) for s in statuses)
        total_cpu_percent = sum(s.get("cpu_percent", 0) for s in statuses)
        health_check_failures = sum(s.get("health_check_failures", 0) for s in statuses)
        
        return ProcessMetricsResponse(
            total_servers=total_servers,
            active_servers=active_servers,
            inactive_servers=inactive_servers,
            error_servers=error_servers,
            total_memory_mb=total_memory_mb,
            total_cpu_percent=total_cpu_percent,
            health_check_failures=health_check_failures
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"메트릭 조회 실패: {str(e)}")


@router.get("/logs/{server_id}")
async def get_server_logs(
    server_id: str,
    limit: int = 100,
    offset: int = 0,
    current_user: User = Depends(get_current_user)
):
    """서버 로그 조회"""
    from ..database import get_db_session
    from ..models.mcp_server import McpServer
    from sqlalchemy import select, desc
    import logging
    
    try:
        async with get_db_session() as db:
            server = await db.get(McpServer, server_id)
            if not server:
                raise HTTPException(status_code=404, detail="서버를 찾을 수 없습니다")
            
            # 로그 조회 (실제 구현에서는 ServerLog 모델 사용)
            # 여기서는 기본적인 서버 정보만 반환
            logs = [
                {
                    "timestamp": server.last_started_at or server.created_at,
                    "level": "ERROR" if server.last_error else "INFO",
                    "message": server.last_error or f"서버 {server.name} 상태: {server.status.value}",
                    "server_name": server.name,
                    "process_id": server.process_id
                }
            ]
            
            return {
                "server_id": server_id,
                "server_name": server.name,
                "total_logs": len(logs),
                "logs": logs[offset:offset + limit]
            }
            
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"로그 조회 실패: {str(e)}")


# 시스템 정보 엔드포인트
@router.get("/system/info")
async def get_system_info(
    current_user: User = Depends(get_current_user)
):
    """시스템 정보 조회"""
    import platform
    import psutil
    
    try:
        # 시스템 리소스 정보
        memory = psutil.virtual_memory()
        disk = psutil.disk_usage('/')
        cpu_count = psutil.cpu_count()
        
        return {
            "system": {
                "platform": platform.system(),
                "platform_version": platform.version(),
                "python_version": platform.python_version(),
                "cpu_count": cpu_count,
                "cpu_percent": psutil.cpu_percent(interval=1)
            },
            "memory": {
                "total_gb": round(memory.total / (1024**3), 2),
                "available_gb": round(memory.available / (1024**3), 2),
                "used_percent": memory.percent
            },
            "disk": {
                "total_gb": round(disk.total / (1024**3), 2),
                "free_gb": round(disk.free / (1024**3), 2),
                "used_percent": round((disk.used / disk.total) * 100, 1)
            },
            "process_manager": {
                "health_check_interval": 300,
                "max_restart_attempts": 3,
                "failure_threshold": 5
            }
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"시스템 정보 조회 실패: {str(e)}")
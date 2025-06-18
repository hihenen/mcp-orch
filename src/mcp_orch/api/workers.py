"""
워커 관리 API

APScheduler 기반 백그라운드 워커 제어 및 모니터링
"""

from typing import List, Dict, Optional
import logging

from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session
from pydantic import BaseModel, Field

from ..database import get_db
from ..models import User
from .jwt_auth import get_user_from_jwt_token
from ..services.scheduler_service import scheduler_service

router = APIRouter(prefix="/api", tags=["workers"])
logger = logging.getLogger(__name__)


# Pydantic 모델들
class WorkerConfigUpdate(BaseModel):
    server_check_interval: Optional[int] = Field(None, ge=60, le=3600, description="서버 체크 간격 (초, 60-3600)")
    max_workers: Optional[int] = Field(None, ge=1, le=10, description="최대 워커 수 (1-10)")
    coalesce: Optional[bool] = Field(None, description="중복 작업 병합 여부")
    max_instances: Optional[int] = Field(None, ge=1, le=5, description="최대 작업 인스턴스 수")


class WorkerStatus(BaseModel):
    running: bool
    jobs: List[Dict]
    config: Dict
    last_execution: Optional[str]
    job_history_count: int
    
    class Config:
        from_attributes = True


class JobHistoryEntry(BaseModel):
    timestamp: str
    duration: float
    status: str
    checked_count: Optional[int] = None
    updated_count: Optional[int] = None
    error_count: Optional[int] = None
    error: Optional[str] = None
    
    class Config:
        from_attributes = True


async def get_admin_user(request: Request, db: Session = Depends(get_db)) -> User:
    """관리자 권한 확인"""
    user = await get_user_from_jwt_token(request, db)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required"
        )
    
    # 관리자 권한 확인 (실제 구현에서는 User 모델에 is_admin 필드 등을 사용)
    # 현재는 모든 인증된 사용자에게 권한 부여
    return user


@router.get("/workers/status", response_model=WorkerStatus)
async def get_worker_status(
    current_user: User = Depends(get_admin_user)
):
    """워커 상태 조회"""
    try:
        worker_status = scheduler_service.get_status()
        return WorkerStatus(**worker_status)
    except Exception as e:
        logger.error(f"Error getting worker status: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to get worker status"
        )


@router.post("/workers/start")
async def start_worker(
    current_user: User = Depends(get_admin_user)
):
    """워커 시작"""
    try:
        await scheduler_service.start()
        return {"message": "Worker started successfully"}
    except Exception as e:
        logger.error(f"Error starting worker: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to start worker: {str(e)}"
        )


@router.post("/workers/stop")
async def stop_worker(
    current_user: User = Depends(get_admin_user)
):
    """워커 정지"""
    try:
        await scheduler_service.stop()
        return {"message": "Worker stopped successfully"}
    except Exception as e:
        logger.error(f"Error stopping worker: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to stop worker: {str(e)}"
        )


@router.post("/workers/restart")
async def restart_worker(
    current_user: User = Depends(get_admin_user)
):
    """워커 재시작"""
    try:
        await scheduler_service.restart()
        return {"message": "Worker restarted successfully"}
    except Exception as e:
        logger.error(f"Error restarting worker: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to restart worker: {str(e)}"
        )


@router.put("/workers/config")
async def update_worker_config(
    config: WorkerConfigUpdate,
    current_user: User = Depends(get_admin_user)
):
    """워커 설정 업데이트"""
    try:
        # None이 아닌 값들만 업데이트
        update_data = {k: v for k, v in config.dict().items() if v is not None}
        
        if not update_data:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="No configuration provided"
            )
        
        scheduler_service.update_config(update_data)
        
        logger.info(f"Worker config updated by {current_user.email}: {update_data}")
        
        return {
            "message": "Worker configuration updated successfully",
            "updated_config": update_data
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating worker config: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to update worker config: {str(e)}"
        )


@router.get("/workers/history", response_model=List[JobHistoryEntry])
async def get_worker_history(
    limit: int = 50,
    current_user: User = Depends(get_admin_user)
):
    """워커 실행 이력 조회"""
    try:
        if limit < 1 or limit > 200:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Limit must be between 1 and 200"
            )
        
        history = scheduler_service.get_job_history(limit)
        return [JobHistoryEntry(**entry) for entry in history]
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting worker history: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to get worker history"
        )


@router.post("/workers/check-now")
async def trigger_immediate_check(
    current_user: User = Depends(get_admin_user)
):
    """즉시 서버 상태 체크 실행"""
    try:
        # 백그라운드에서 즉시 실행
        import asyncio
        asyncio.create_task(scheduler_service._check_all_servers_status())
        
        return {"message": "Immediate server status check triggered"}
    except Exception as e:
        logger.error(f"Error triggering immediate check: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to trigger immediate check: {str(e)}"
        )
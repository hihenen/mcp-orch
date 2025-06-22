"""
서버 로그 API 엔드포인트
"""

from typing import List, Optional
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, Query, Request
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import ServerLog, LogLevel, LogCategory, User
from ..services.server_log_service import ServerLogService
from .jwt_auth import get_current_user_for_api

router = APIRouter()


@router.get("/projects/{project_id}/servers/{server_id}/logs")
async def get_server_logs(
    project_id: UUID,
    server_id: UUID,
    level: Optional[str] = Query(None, description="로그 레벨 필터"),
    category: Optional[str] = Query(None, description="로그 카테고리 필터"),
    limit: int = Query(100, ge=1, le=1000, description="최대 결과 수"),
    offset: int = Query(0, ge=0, description="오프셋"),
    hours: Optional[int] = Query(None, ge=1, le=168, description="최근 N시간 내 로그"),
    current_user: User = Depends(get_current_user_for_api),
    db: Session = Depends(get_db)
):
    """
    서버 로그 조회
    
    Args:
        project_id: 프로젝트 ID
        server_id: 서버 ID
        level: 로그 레벨 필터 (debug, info, warning, error, critical)
        category: 로그 카테고리 필터 (connection, tool_execution, error, status_check, configuration)
        limit: 최대 결과 수
        offset: 오프셋
        hours: 최근 N시간 내 로그만 조회
        
    Returns:
        서버 로그 목록과 요약 정보
    """
    try:
        log_service = ServerLogService(db)
        
        # 로그 레벨 변환
        log_level = None
        if level:
            try:
                log_level = LogLevel(level.lower())
            except ValueError:
                raise HTTPException(status_code=400, detail=f"Invalid log level: {level}")
        
        # 로그 카테고리 변환
        log_category = None
        if category:
            try:
                log_category = LogCategory(category.lower())
            except ValueError:
                raise HTTPException(status_code=400, detail=f"Invalid log category: {category}")
        
        # 서버 로그 조회
        logs = log_service.get_server_logs(
            server_id=server_id,
            project_id=project_id,
            level=log_level,
            category=log_category,
            limit=limit,
            offset=offset,
            hours=hours
        )
        
        # 로그 요약 정보 조회
        summary = log_service.get_log_summary(
            server_id=server_id,
            project_id=project_id,
            hours=hours or 24
        )
        
        # 응답 데이터 구성
        log_entries = []
        for log in logs:
            log_entry = {
                "id": str(log.id),
                "timestamp": log.timestamp.isoformat(),
                "level": log.level.value,
                "category": log.category.value,
                "message": log.message,
                "details": log.details,
                "source": log.source
            }
            log_entries.append(log_entry)
        
        return {
            "logs": log_entries,
            "total": len(log_entries),
            "summary": summary
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to retrieve server logs: {str(e)}")


@router.get("/projects/{project_id}/logs")
async def get_project_logs(
    project_id: UUID,
    level: Optional[str] = Query(None, description="로그 레벨 필터"),
    category: Optional[str] = Query(None, description="로그 카테고리 필터"),
    limit: int = Query(100, ge=1, le=1000, description="최대 결과 수"),
    offset: int = Query(0, ge=0, description="오프셋"),
    hours: Optional[int] = Query(None, ge=1, le=168, description="최근 N시간 내 로그"),
    current_user: User = Depends(get_current_user_for_api),
    db: Session = Depends(get_db)
):
    """
    프로젝트의 모든 서버 로그 조회
    
    Args:
        project_id: 프로젝트 ID
        level: 로그 레벨 필터
        category: 로그 카테고리 필터
        limit: 최대 결과 수
        offset: 오프셋
        hours: 최근 N시간 내 로그만 조회
        
    Returns:
        프로젝트 로그 목록과 요약 정보
    """
    try:
        log_service = ServerLogService(db)
        
        # 로그 레벨 변환
        log_level = None
        if level:
            try:
                log_level = LogLevel(level.lower())
            except ValueError:
                raise HTTPException(status_code=400, detail=f"Invalid log level: {level}")
        
        # 로그 카테고리 변환
        log_category = None
        if category:
            try:
                log_category = LogCategory(category.lower())
            except ValueError:
                raise HTTPException(status_code=400, detail=f"Invalid log category: {category}")
        
        # 프로젝트 로그 조회
        logs = log_service.get_project_logs(
            project_id=project_id,
            level=log_level,
            category=log_category,
            limit=limit,
            offset=offset,
            hours=hours
        )
        
        # 로그 요약 정보 조회
        summary = log_service.get_log_summary(
            project_id=project_id,
            hours=hours or 24
        )
        
        # 응답 데이터 구성
        log_entries = []
        for log in logs:
            log_entry = {
                "id": str(log.id),
                "timestamp": log.timestamp.isoformat(),
                "level": log.level.value,
                "category": log.category.value,
                "message": log.message,
                "details": log.details,
                "source": log.source,
                "server_id": str(log.server_id)
            }
            log_entries.append(log_entry)
        
        return {
            "logs": log_entries,
            "total": len(log_entries),
            "summary": summary
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to retrieve project logs: {str(e)}")


@router.get("/projects/{project_id}/servers/{server_id}/logs/errors")
async def get_server_error_logs(
    project_id: UUID,
    server_id: UUID,
    limit: int = Query(50, ge=1, le=500, description="최대 결과 수"),
    hours: int = Query(24, ge=1, le=168, description="최근 N시간 내 로그"),
    current_user: User = Depends(get_current_user_for_api),
    db: Session = Depends(get_db)
):
    """
    서버 에러 로그만 조회
    
    Args:
        project_id: 프로젝트 ID
        server_id: 서버 ID
        limit: 최대 결과 수
        hours: 최근 N시간 내 로그
        
    Returns:
        에러 로그 목록
    """
    try:
        log_service = ServerLogService(db)
        
        # 에러 로그 조회
        error_logs = log_service.get_error_logs(
            server_id=server_id,
            project_id=project_id,
            limit=limit,
            hours=hours
        )
        
        # 응답 데이터 구성
        log_entries = []
        for log in error_logs:
            log_entry = {
                "id": str(log.id),
                "timestamp": log.timestamp.isoformat(),
                "level": log.level.value,
                "category": log.category.value,
                "message": log.message,
                "details": log.details,
                "source": log.source
            }
            log_entries.append(log_entry)
        
        return {
            "logs": log_entries,
            "total": len(log_entries)
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to retrieve error logs: {str(e)}")


@router.get("/projects/{project_id}/servers/{server_id}/logs/summary")
async def get_server_log_summary(
    project_id: UUID,
    server_id: UUID,
    hours: int = Query(24, ge=1, le=168, description="분석 기간 (시간)"),
    current_user: User = Depends(get_current_user_for_api),
    db: Session = Depends(get_db)
):
    """
    서버 로그 요약 정보 조회
    
    Args:
        project_id: 프로젝트 ID
        server_id: 서버 ID
        hours: 분석 기간 (시간)
        
    Returns:
        로그 요약 정보
    """
    try:
        log_service = ServerLogService(db)
        
        summary = log_service.get_log_summary(
            server_id=server_id,
            project_id=project_id,
            hours=hours
        )
        
        return summary
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to retrieve log summary: {str(e)}")


@router.delete("/logs/cleanup")
async def cleanup_old_logs(
    days: int = Query(30, ge=1, le=365, description="보관 기간 (일)"),
    current_user: User = Depends(get_current_user_for_api),
    db: Session = Depends(get_db)
):
    """
    오래된 로그 정리
    
    Args:
        days: 보관 기간 (일)
        
    Returns:
        삭제된 로그 수
    """
    try:
        log_service = ServerLogService(db)
        
        deleted_count = log_service.cleanup_old_logs(days=days)
        
        return {
            "message": f"Successfully cleaned up {deleted_count} old logs",
            "deleted_count": deleted_count,
            "retention_days": days
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to cleanup old logs: {str(e)}")

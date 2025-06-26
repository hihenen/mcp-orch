"""
ToolCallLog 조회 API
Datadog/Sentry 스타일의 로그 조회 시스템
"""

import logging
from datetime import datetime, timedelta
from typing import List, Optional, Dict, Any
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from sqlalchemy.orm import Session
from sqlalchemy import desc, and_, or_, text, func, case
from pydantic import BaseModel, Field

from ..database import get_db
from ..models import ToolCallLog, CallStatus, User, ClientSession
from .jwt_auth import get_user_from_jwt_token

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/tool-call-logs", tags=["tool-call-logs"])


class ToolCallLogFilter(BaseModel):
    """로그 필터 조건"""
    project_id: Optional[UUID] = None
    server_id: Optional[str] = None
    tool_name: Optional[str] = None
    status: Optional[List[CallStatus]] = None
    session_id: Optional[str] = None
    start_time: Optional[datetime] = None
    end_time: Optional[datetime] = None
    search_text: Optional[str] = None
    min_execution_time: Optional[float] = None
    max_execution_time: Optional[float] = None


class ToolCallLogResponse(BaseModel):
    """로그 응답 모델"""
    id: int
    session_id: str
    server_id: UUID
    project_id: UUID
    tool_name: str
    tool_namespace: Optional[str]
    execution_time: Optional[float]
    status: CallStatus
    error_message: Optional[str]
    error_code: Optional[str]
    timestamp: datetime
    user_agent: Optional[str]
    ip_address: Optional[str]
    input_data: Optional[Dict[str, Any]]
    output_data: Optional[Dict[str, Any]]
    
    # 추가 계산된 필드
    duration_ms: Optional[int]
    client_type: Optional[str]
    
    class Config:
        from_attributes = True


class ToolCallLogListResponse(BaseModel):
    """로그 리스트 응답"""
    logs: List[ToolCallLogResponse]
    total_count: int
    page: int
    page_size: int
    has_next: bool
    has_prev: bool


class ToolCallLogMetrics(BaseModel):
    """로그 메트릭"""
    total_calls: int
    successful_calls: int
    error_calls: int
    timeout_calls: int
    success_rate: float
    average_execution_time: float
    median_execution_time: float
    p95_execution_time: float
    calls_per_minute: float
    unique_tools: int
    unique_sessions: int


async def get_current_user_for_tool_logs(
    request: Request,
    db: Session = Depends(get_db)
) -> Optional[User]:
    """도구 로그 API용 사용자 인증"""
    import os
    
    # DISABLE_AUTH 환경 변수 확인
    disable_auth = os.getenv("DISABLE_AUTH", "").lower() == "true"
    
    if disable_auth:
        logger.info("⚠️ Authentication disabled for tool logs API")
        return None
    
    # JWT 인증 시도
    user = await get_user_from_jwt_token(request, db)
    if not user:
        raise HTTPException(
            status_code=401,
            detail="Authentication required"
        )
    
    return user


@router.get("/", response_model=ToolCallLogListResponse)
async def list_tool_call_logs(
    project_id: UUID,
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=500),
    server_id: Optional[str] = Query(None),
    tool_name: Optional[str] = Query(None),
    status: Optional[List[CallStatus]] = Query(None),
    session_id: Optional[str] = Query(None),
    time_range: str = Query("30m", description="시간 범위: 15m, 30m, 1h, 6h, 24h, 7d"),
    start_time: Optional[datetime] = Query(None),
    end_time: Optional[datetime] = Query(None),
    search_text: Optional[str] = Query(None),
    min_execution_time: Optional[float] = Query(None, ge=0),
    max_execution_time: Optional[float] = Query(None, ge=0),
    current_user: Optional[User] = Depends(get_current_user_for_tool_logs),
    db: Session = Depends(get_db)
):
    """
    ToolCallLog 목록 조회
    
    Args:
        project_id: 프로젝트 ID (필수)
        page: 페이지 번호 (기본값: 1)
        page_size: 페이지 크기 (기본값: 50)
        server_id: 서버 ID 필터
        tool_name: 도구명 필터
        status: 상태 필터 (SUCCESS, ERROR, TIMEOUT 등)
        session_id: 세션 ID 필터
        time_range: 시간 범위 (15m, 30m, 1h, 6h, 24h, 7d)
        start_time: 시작 시간 (커스텀 범위)
        end_time: 종료 시간 (커스텀 범위)
        search_text: 검색 텍스트 (input_data, output_data에서 검색)
        min_execution_time: 최소 실행 시간 필터
        max_execution_time: 최대 실행 시간 필터
    """
    
    try:
        # 시간 범위 계산
        if start_time and end_time:
            # 커스텀 시간 범위 사용
            pass
        else:
            # 미리 정의된 시간 범위 사용
            now = datetime.utcnow()
            time_deltas = {
                "15m": timedelta(minutes=15),
                "30m": timedelta(minutes=30),
                "1h": timedelta(hours=1),
                "6h": timedelta(hours=6),
                "24h": timedelta(hours=24),
                "7d": timedelta(days=7)
            }
            
            delta = time_deltas.get(time_range, timedelta(minutes=30))
            start_time = now - delta
            end_time = now
        
        # 기본 쿼리 구성
        query = db.query(ToolCallLog).filter(
            ToolCallLog.project_id == project_id,
            ToolCallLog.timestamp >= start_time,
            ToolCallLog.timestamp <= end_time
        )
        
        # 필터 적용
        if server_id:
            query = query.filter(ToolCallLog.server_id == server_id)
        
        if tool_name:
            query = query.filter(ToolCallLog.tool_name.ilike(f"%{tool_name}%"))
        
        if status:
            query = query.filter(ToolCallLog.status.in_(status))
        
        if session_id:
            query = query.filter(ToolCallLog.session_id == session_id)
        
        if min_execution_time is not None:
            query = query.filter(ToolCallLog.execution_time_ms >= min_execution_time * 1000)
        
        if max_execution_time is not None:
            query = query.filter(ToolCallLog.execution_time_ms <= max_execution_time * 1000)
        
        # 텍스트 검색 (JSONB 필드에서 검색)
        if search_text:
            search_condition = or_(
                ToolCallLog.input_data.astext.ilike(f"%{search_text}%"),
                ToolCallLog.output_data.astext.ilike(f"%{search_text}%"),
                ToolCallLog.error_message.ilike(f"%{search_text}%"),
                ToolCallLog.tool_name.ilike(f"%{search_text}%")
            )
            query = query.filter(search_condition)
        
        # 전체 개수 계산
        total_count = query.count()
        
        # 정렬 및 페이지네이션
        offset = (page - 1) * page_size
        logs = query.order_by(desc(ToolCallLog.timestamp))\
                   .offset(offset)\
                   .limit(page_size)\
                   .all()
        
        # 응답 데이터 구성
        log_responses = []
        for log in logs:
            # 클라이언트 타입 추출
            client_type = "unknown"
            if log.user_agent:
                user_agent_lower = log.user_agent.lower()
                if "cline" in user_agent_lower:
                    client_type = "cline"
                elif "cursor" in user_agent_lower:
                    client_type = "cursor"
                elif "vscode" in user_agent_lower:
                    client_type = "vscode"
            
            log_response = ToolCallLogResponse(
                id=log.id,
                session_id=log.session_id,
                server_id=log.server_id,
                project_id=log.project_id,
                tool_name=log.tool_name,
                tool_namespace=log.tool_namespace,
                execution_time=log.execution_time,
                status=log.status,
                error_message=log.error_message,
                error_code=log.error_code,
                timestamp=log.timestamp,
                user_agent=log.user_agent,
                ip_address=log.ip_address,
                input_data=log.input_data,
                output_data=log.output_data,
                duration_ms=log.duration_ms,
                client_type=client_type
            )
            log_responses.append(log_response)
        
        # 페이지네이션 정보
        has_next = (offset + page_size) < total_count
        has_prev = page > 1
        
        return ToolCallLogListResponse(
            logs=log_responses,
            total_count=total_count,
            page=page,
            page_size=page_size,
            has_next=has_next,
            has_prev=has_prev
        )
        
    except Exception as e:
        logger.error(f"Error listing tool call logs: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to list tool call logs: {str(e)}"
        )


@router.get("/metrics", response_model=ToolCallLogMetrics)
async def get_tool_call_metrics(
    project_id: UUID,
    server_id: Optional[str] = Query(None),
    time_range: str = Query("30m", description="시간 범위: 15m, 30m, 1h, 6h, 24h, 7d"),
    start_time: Optional[datetime] = Query(None),
    end_time: Optional[datetime] = Query(None),
    current_user: Optional[User] = Depends(get_current_user_for_tool_logs),
    db: Session = Depends(get_db)
):
    """
    ToolCallLog 메트릭 조회
    
    성공률, 평균 응답시간, 호출량 등의 집계 데이터를 반환합니다.
    """
    
    try:
        # 시간 범위 계산
        if start_time and end_time:
            pass
        else:
            now = datetime.utcnow()
            time_deltas = {
                "15m": timedelta(minutes=15),
                "30m": timedelta(minutes=30),
                "1h": timedelta(hours=1),
                "6h": timedelta(hours=6),
                "24h": timedelta(hours=24),
                "7d": timedelta(days=7)
            }
            
            delta = time_deltas.get(time_range, timedelta(minutes=30))
            start_time = now - delta
            end_time = now
        
        # 기본 필터
        base_filter = and_(
            ToolCallLog.project_id == project_id,
            ToolCallLog.timestamp >= start_time,
            ToolCallLog.timestamp <= end_time
        )
        
        if server_id:
            base_filter = and_(base_filter, ToolCallLog.server_id == server_id)
        
        # 집계 쿼리
        metrics_query = db.query(
            func.count(ToolCallLog.id).label('total_calls'),
            func.sum(case((ToolCallLog.status == CallStatus.SUCCESS, 1), else_=0)).label('successful_calls'),
            func.sum(case((ToolCallLog.status == CallStatus.ERROR, 1), else_=0)).label('error_calls'),
            func.sum(case((ToolCallLog.status == CallStatus.TIMEOUT, 1), else_=0)).label('timeout_calls'),
            func.avg(ToolCallLog.execution_time_ms / 1000.0).label('avg_execution_time'),
            func.percentile_cont(0.5).within_group(ToolCallLog.execution_time_ms / 1000.0).label('median_execution_time'),
            func.percentile_cont(0.95).within_group(ToolCallLog.execution_time_ms / 1000.0).label('p95_execution_time'),
            func.count(func.distinct(ToolCallLog.tool_name)).label('unique_tools'),
            func.count(func.distinct(ToolCallLog.session_id)).label('unique_sessions')
        ).filter(base_filter).first()
        
        # 기본값 설정
        total_calls = metrics_query.total_calls or 0
        successful_calls = metrics_query.successful_calls or 0
        error_calls = metrics_query.error_calls or 0
        timeout_calls = metrics_query.timeout_calls or 0
        avg_execution_time = float(metrics_query.avg_execution_time or 0)
        median_execution_time = float(metrics_query.median_execution_time or 0)
        p95_execution_time = float(metrics_query.p95_execution_time or 0)
        unique_tools = metrics_query.unique_tools or 0
        unique_sessions = metrics_query.unique_sessions or 0
        
        # 성공률 계산
        success_rate = (successful_calls / total_calls * 100) if total_calls > 0 else 0
        
        # 분당 호출 수 계산
        time_diff_minutes = (end_time - start_time).total_seconds() / 60
        calls_per_minute = total_calls / time_diff_minutes if time_diff_minutes > 0 else 0
        
        return ToolCallLogMetrics(
            total_calls=total_calls,
            successful_calls=successful_calls,
            error_calls=error_calls,
            timeout_calls=timeout_calls,
            success_rate=round(success_rate, 2),
            average_execution_time=round(avg_execution_time, 3),
            median_execution_time=round(median_execution_time, 3),
            p95_execution_time=round(p95_execution_time, 3),
            calls_per_minute=round(calls_per_minute, 2),
            unique_tools=unique_tools,
            unique_sessions=unique_sessions
        )
        
    except Exception as e:
        logger.error(f"Error getting tool call metrics: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to get tool call metrics: {str(e)}"
        )


@router.get("/{log_id}", response_model=ToolCallLogResponse)
async def get_tool_call_log(
    log_id: int,
    project_id: UUID,
    current_user: Optional[User] = Depends(get_current_user_for_tool_logs),
    db: Session = Depends(get_db)
):
    """특정 ToolCallLog 상세 조회"""
    
    try:
        log = db.query(ToolCallLog).filter(
            ToolCallLog.id == log_id,
            ToolCallLog.project_id == project_id
        ).first()
        
        if not log:
            raise HTTPException(
                status_code=404,
                detail="Tool call log not found"
            )
        
        # 클라이언트 타입 추출
        client_type = "unknown"
        if log.user_agent:
            user_agent_lower = log.user_agent.lower()
            if "cline" in user_agent_lower:
                client_type = "cline"
            elif "cursor" in user_agent_lower:
                client_type = "cursor"
            elif "vscode" in user_agent_lower:
                client_type = "vscode"
        
        return ToolCallLogResponse(
            id=log.id,
            session_id=log.session_id,
            server_id=log.server_id,
            project_id=log.project_id,
            tool_name=log.tool_name,
            tool_namespace=log.tool_namespace,
            execution_time=log.execution_time,
            status=log.status,
            error_message=log.error_message,
            error_code=log.error_code,
            timestamp=log.timestamp,
            user_agent=log.user_agent,
            ip_address=log.ip_address,
            input_data=log.input_data,
            output_data=log.output_data,
            duration_ms=log.duration_ms,
            client_type=client_type
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting tool call log {log_id}: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to get tool call log: {str(e)}"
        )
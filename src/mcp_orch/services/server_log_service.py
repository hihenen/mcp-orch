"""
서버 로그 서비스
MCP 서버의 로그를 수집, 저장, 조회하는 서비스
"""

import json
import logging
from datetime import datetime, timedelta
from typing import List, Optional, Dict, Any
from uuid import UUID

from sqlalchemy.orm import Session
from sqlalchemy import desc, and_, or_

from ..database import get_db
from ..models import ServerLog, LogLevel, LogCategory, McpServer, Project

logger = logging.getLogger(__name__)


class ServerLogService:
    """서버 로그 관리 서비스"""
    
    def __init__(self, db: Session = None):
        self.db = db or next(get_db())
    
    def add_log(
        self,
        server_id: UUID,
        project_id: UUID,
        level: LogLevel,
        category: LogCategory,
        message: str,
        details: Optional[Dict[str, Any]] = None,
        source: Optional[str] = None
    ) -> ServerLog:
        """
        서버 로그 추가
        
        Args:
            server_id: 서버 ID
            project_id: 프로젝트 ID
            level: 로그 레벨
            category: 로그 카테고리
            message: 로그 메시지
            details: 상세 정보 (JSON)
            source: 로그 발생 소스
            
        Returns:
            생성된 ServerLog 객체
        """
        try:
            log_entry = ServerLog(
                server_id=server_id,
                project_id=project_id,
                level=level,
                category=category,
                message=message,
                details=json.dumps(details) if details else None,
                source=source,
                timestamp=datetime.utcnow()
            )
            
            self.db.add(log_entry)
            self.db.commit()
            self.db.refresh(log_entry)
            
            logger.debug(f"Added log for server {server_id}: {level.value} - {message}")
            return log_entry
            
        except Exception as e:
            logger.error(f"Error adding server log: {e}")
            self.db.rollback()
            raise
    
    def get_server_logs(
        self,
        server_id: UUID,
        project_id: Optional[UUID] = None,
        level: Optional[LogLevel] = None,
        category: Optional[LogCategory] = None,
        limit: int = 100,
        offset: int = 0,
        hours: Optional[int] = None
    ) -> List[ServerLog]:
        """
        서버 로그 조회
        
        Args:
            server_id: 서버 ID
            project_id: 프로젝트 ID (선택)
            level: 로그 레벨 필터 (선택)
            category: 로그 카테고리 필터 (선택)
            limit: 최대 결과 수
            offset: 오프셋
            hours: 최근 N시간 내 로그만 조회 (선택)
            
        Returns:
            ServerLog 객체 리스트
        """
        try:
            query = self.db.query(ServerLog).filter(ServerLog.server_id == server_id)
            
            if project_id:
                query = query.filter(ServerLog.project_id == project_id)
            
            if level:
                query = query.filter(ServerLog.level == level)
            
            if category:
                query = query.filter(ServerLog.category == category)
            
            if hours:
                since = datetime.utcnow() - timedelta(hours=hours)
                query = query.filter(ServerLog.timestamp >= since)
            
            logs = query.order_by(desc(ServerLog.timestamp)).offset(offset).limit(limit).all()
            
            logger.debug(f"Retrieved {len(logs)} logs for server {server_id}")
            return logs
            
        except Exception as e:
            logger.error(f"Error retrieving server logs: {e}")
            return []
    
    def get_project_logs(
        self,
        project_id: UUID,
        level: Optional[LogLevel] = None,
        category: Optional[LogCategory] = None,
        limit: int = 100,
        offset: int = 0,
        hours: Optional[int] = None
    ) -> List[ServerLog]:
        """
        프로젝트의 모든 서버 로그 조회
        
        Args:
            project_id: 프로젝트 ID
            level: 로그 레벨 필터 (선택)
            category: 로그 카테고리 필터 (선택)
            limit: 최대 결과 수
            offset: 오프셋
            hours: 최근 N시간 내 로그만 조회 (선택)
            
        Returns:
            ServerLog 객체 리스트
        """
        try:
            query = self.db.query(ServerLog).filter(ServerLog.project_id == project_id)
            
            if level:
                query = query.filter(ServerLog.level == level)
            
            if category:
                query = query.filter(ServerLog.category == category)
            
            if hours:
                since = datetime.utcnow() - timedelta(hours=hours)
                query = query.filter(ServerLog.timestamp >= since)
            
            logs = query.order_by(desc(ServerLog.timestamp)).offset(offset).limit(limit).all()
            
            logger.debug(f"Retrieved {len(logs)} logs for project {project_id}")
            return logs
            
        except Exception as e:
            logger.error(f"Error retrieving project logs: {e}")
            return []
    
    def get_error_logs(
        self,
        server_id: Optional[UUID] = None,
        project_id: Optional[UUID] = None,
        limit: int = 50,
        hours: int = 24
    ) -> List[ServerLog]:
        """
        에러 로그만 조회
        
        Args:
            server_id: 서버 ID (선택)
            project_id: 프로젝트 ID (선택)
            limit: 최대 결과 수
            hours: 최근 N시간 내 로그만 조회
            
        Returns:
            에러 레벨 ServerLog 객체 리스트
        """
        try:
            query = self.db.query(ServerLog).filter(
                or_(
                    ServerLog.level == LogLevel.ERROR,
                    ServerLog.level == LogLevel.CRITICAL
                )
            )
            
            if server_id:
                query = query.filter(ServerLog.server_id == server_id)
            
            if project_id:
                query = query.filter(ServerLog.project_id == project_id)
            
            since = datetime.utcnow() - timedelta(hours=hours)
            query = query.filter(ServerLog.timestamp >= since)
            
            logs = query.order_by(desc(ServerLog.timestamp)).limit(limit).all()
            
            logger.debug(f"Retrieved {len(logs)} error logs")
            return logs
            
        except Exception as e:
            logger.error(f"Error retrieving error logs: {e}")
            return []
    
    def cleanup_old_logs(self, days: int = 30) -> int:
        """
        오래된 로그 정리
        
        Args:
            days: 보관 기간 (일)
            
        Returns:
            삭제된 로그 수
        """
        try:
            cutoff_date = datetime.utcnow() - timedelta(days=days)
            
            deleted_count = self.db.query(ServerLog).filter(
                ServerLog.timestamp < cutoff_date
            ).delete()
            
            self.db.commit()
            
            logger.info(f"Cleaned up {deleted_count} old logs (older than {days} days)")
            return deleted_count
            
        except Exception as e:
            logger.error(f"Error cleaning up old logs: {e}")
            self.db.rollback()
            return 0
    
    def get_log_summary(
        self,
        server_id: Optional[UUID] = None,
        project_id: Optional[UUID] = None,
        hours: int = 24
    ) -> Dict[str, Any]:
        """
        로그 요약 정보 조회
        
        Args:
            server_id: 서버 ID (선택)
            project_id: 프로젝트 ID (선택)
            hours: 최근 N시간 내 로그 분석
            
        Returns:
            로그 요약 정보
        """
        try:
            since = datetime.utcnow() - timedelta(hours=hours)
            
            base_query = self.db.query(ServerLog).filter(ServerLog.timestamp >= since)
            
            if server_id:
                base_query = base_query.filter(ServerLog.server_id == server_id)
            
            if project_id:
                base_query = base_query.filter(ServerLog.project_id == project_id)
            
            # 레벨별 카운트
            level_counts = {}
            for level in LogLevel:
                count = base_query.filter(ServerLog.level == level).count()
                level_counts[level.value] = count
            
            # 카테고리별 카운트
            category_counts = {}
            for category in LogCategory:
                count = base_query.filter(ServerLog.category == category).count()
                category_counts[category.value] = count
            
            # 최근 에러
            recent_errors = base_query.filter(
                or_(
                    ServerLog.level == LogLevel.ERROR,
                    ServerLog.level == LogLevel.CRITICAL
                )
            ).order_by(desc(ServerLog.timestamp)).limit(5).all()
            
            summary = {
                "period_hours": hours,
                "total_logs": base_query.count(),
                "level_counts": level_counts,
                "category_counts": category_counts,
                "recent_errors": [
                    {
                        "id": str(log.id),
                        "timestamp": log.timestamp.isoformat(),
                        "level": log.level.value,
                        "category": log.category.value,
                        "message": log.message,
                        "server_id": str(log.server_id)
                    }
                    for log in recent_errors
                ]
            }
            
            logger.debug(f"Generated log summary: {summary['total_logs']} total logs")
            return summary
            
        except Exception as e:
            logger.error(f"Error generating log summary: {e}")
            return {
                "period_hours": hours,
                "total_logs": 0,
                "level_counts": {},
                "category_counts": {},
                "recent_errors": []
            }
    
    def log_connection_event(
        self,
        server_id: UUID,
        project_id: UUID,
        event_type: str,
        success: bool,
        details: Optional[Dict[str, Any]] = None
    ):
        """
        연결 이벤트 로그 기록
        
        Args:
            server_id: 서버 ID
            project_id: 프로젝트 ID
            event_type: 이벤트 타입 (connect, disconnect, reconnect 등)
            success: 성공 여부
            details: 상세 정보
        """
        level = LogLevel.INFO if success else LogLevel.ERROR
        message = f"Server {event_type} {'successful' if success else 'failed'}"
        
        self.add_log(
            server_id=server_id,
            project_id=project_id,
            level=level,
            category=LogCategory.CONNECTION,
            message=message,
            details=details,
            source="mcp_connection_service"
        )
    
    def log_tool_execution(
        self,
        server_id: UUID,
        project_id: UUID,
        tool_name: str,
        success: bool,
        execution_time: Optional[float] = None,
        error_message: Optional[str] = None
    ):
        """
        도구 실행 로그 기록
        
        Args:
            server_id: 서버 ID
            project_id: 프로젝트 ID
            tool_name: 도구 이름
            success: 성공 여부
            execution_time: 실행 시간 (초)
            error_message: 에러 메시지 (실패 시)
        """
        level = LogLevel.INFO if success else LogLevel.ERROR
        message = f"Tool '{tool_name}' execution {'successful' if success else 'failed'}"
        
        details = {"tool_name": tool_name}
        if execution_time is not None:
            details["execution_time"] = execution_time
        if error_message:
            details["error"] = error_message
        
        self.add_log(
            server_id=server_id,
            project_id=project_id,
            level=level,
            category=LogCategory.TOOL_EXECUTION,
            message=message,
            details=details,
            source="tool_executor"
        )


# 전역 로그 서비스 인스턴스
_log_service = None

def get_log_service() -> ServerLogService:
    """로그 서비스 인스턴스 반환"""
    global _log_service
    if _log_service is None:
        _log_service = ServerLogService()
    return _log_service

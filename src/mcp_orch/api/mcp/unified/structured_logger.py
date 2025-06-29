"""
Structured Logger for Unified MCP Transport

Provides structured logging capabilities for better observability
in production environments.
"""

import json
import logging
from datetime import datetime
from typing import Any
from uuid import UUID


logger = logging.getLogger(__name__)


class StructuredLogger:
    """통합 MCP 서버용 구조화된 로깅 클래스"""
    
    def __init__(self, session_id: str, project_id: UUID):
        self.session_id = session_id
        self.project_id = str(project_id)
        self.logger = logger
    
    def _log_structured(self, level: str, event: str, **kwargs):
        """구조화된 로그 생성"""
        log_data = {
            "timestamp": datetime.now().isoformat(),
            "level": level,
            "event": event,
            "session_id": self.session_id,
            "project_id": self.project_id,
            **kwargs
        }
        
        # JSON 형태로 로깅 (운영환경에서 파싱 용이)
        log_message = json.dumps(log_data, ensure_ascii=False)
        
        # 레벨에 따라 적절한 로거 메서드 호출
        if level == "error":
            self.logger.error(log_message)
        elif level == "warning":
            self.logger.warning(log_message)
        elif level == "info":
            self.logger.info(log_message)
        else:
            self.logger.debug(log_message)
    
    def server_success(self, server_name: str, tools_count: int = 0, **kwargs):
        """서버 성공 로그"""
        self._log_structured(
            "info", "server_success",
            server_name=server_name,
            tools_count=tools_count,
            **kwargs
        )
    
    def server_failure(self, server_name: str, error_type: str, error_message: str, 
                      consecutive_failures: int = 0, **kwargs):
        """서버 실패 로그"""
        self._log_structured(
            "error", "server_failure",
            server_name=server_name,
            error_type=error_type,
            error_message=error_message,
            consecutive_failures=consecutive_failures,
            **kwargs
        )
    
    def tool_call_start(self, tool_name: str, server_name: str, namespace: str, **kwargs):
        """툴 호출 시작 로그"""
        self._log_structured(
            "info", "tool_call_start",
            tool_name=tool_name,
            server_name=server_name,
            namespace=namespace,
            **kwargs
        )
    
    def tool_call_success(self, tool_name: str, server_name: str, namespace: str, 
                         execution_time_ms: float, **kwargs):
        """툴 호출 성공 로그"""
        self._log_structured(
            "info", "tool_call_success",
            tool_name=tool_name,
            server_name=server_name,
            namespace=namespace,
            execution_time_ms=execution_time_ms,
            **kwargs
        )
    
    def tool_call_failure(self, tool_name: str, server_name: str, namespace: str,
                         error_type: str, error_message: str, **kwargs):
        """툴 호출 실패 로그"""
        self._log_structured(
            "error", "tool_call_failure",
            tool_name=tool_name,
            server_name=server_name,
            namespace=namespace,
            error_type=error_type,
            error_message=error_message,
            **kwargs
        )
    
    def session_event(self, event_type: str, **kwargs):
        """세션 관련 이벤트 로그"""
        self._log_structured(
            "info", "session_event",
            event_type=event_type,
            **kwargs
        )
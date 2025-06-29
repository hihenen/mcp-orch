"""
Server Health Monitoring for Unified MCP Transport

Tracks server health status, error types, and recovery attempts.
"""

from datetime import datetime, timedelta
from enum import Enum
from typing import Dict, Any, Optional


class ServerErrorType(Enum):
    """서버 에러 타입 분류"""
    CONNECTION_FAILED = "connection_failed"
    TIMEOUT = "timeout"
    PROTOCOL_ERROR = "protocol_error"
    INITIALIZATION_FAILED = "initialization_failed"
    TOOL_EXECUTION_FAILED = "tool_execution_failed"
    UNKNOWN = "unknown"


class ServerStatus(Enum):
    """서버 상태"""
    HEALTHY = "healthy"
    DEGRADED = "degraded"
    FAILED = "failed"
    RECOVERING = "recovering"


class ServerHealthInfo:
    """서버별 헬스 정보 추적"""
    
    def __init__(self, server_name: str):
        self.server_name = server_name
        self.status = ServerStatus.HEALTHY
        self.last_success_time = datetime.now()
        self.last_failure_time: Optional[datetime] = None
        self.consecutive_failures = 0
        self.recovery_attempts = 0
        self.last_error_type: Optional[ServerErrorType] = None
        self.last_error_message: Optional[str] = None
        self.tools_available = 0
        self.tools_failed = set()  # 실패한 툴 이름들
        
    def record_success(self):
        """성공 기록"""
        self.last_success_time = datetime.now()
        self.status = ServerStatus.HEALTHY
        self.consecutive_failures = 0
        self.recovery_attempts = 0
        self.last_error_type = None
        self.last_error_message = None
        
    def record_failure(self, error_type: ServerErrorType, error_message: str):
        """실패 기록"""
        self.last_failure_time = datetime.now()
        self.consecutive_failures += 1
        self.last_error_type = error_type
        self.last_error_message = error_message
        
        # 연속 실패에 따른 상태 변경
        if self.consecutive_failures >= 5:
            self.status = ServerStatus.FAILED
        elif self.consecutive_failures >= 3:
            self.status = ServerStatus.DEGRADED
            
    def start_recovery(self):
        """복구 시도 시작"""
        self.status = ServerStatus.RECOVERING
        self.recovery_attempts += 1
        
    def is_failed(self) -> bool:
        """서버가 실패 상태인지 확인"""
        return self.status == ServerStatus.FAILED
        
    def should_retry(self) -> bool:
        """재시도 가능 여부 확인"""
        if self.status == ServerStatus.FAILED:
            # 실패 상태에서는 일정 시간 후에만 재시도
            if self.last_failure_time:
                time_since_failure = datetime.now() - self.last_failure_time
                # 5분 후 재시도 허용
                return time_since_failure > timedelta(minutes=5)
        return True
        
    def get_health_summary(self) -> Dict[str, Any]:
        """헬스 정보 요약"""
        return {
            "server_name": self.server_name,
            "status": self.status.value,
            "last_success_time": self.last_success_time.isoformat() if self.last_success_time else None,
            "last_failure_time": self.last_failure_time.isoformat() if self.last_failure_time else None,
            "consecutive_failures": self.consecutive_failures,
            "last_error_type": self.last_error_type.value if self.last_error_type else None,
            "last_error_message": self.last_error_message,
            "recovery_attempts": self.recovery_attempts,
            "tools_available": self.tools_available,
            "tools_failed": list(self.tools_failed)
        }


def classify_error(error: Exception) -> ServerErrorType:
    """에러를 분류하여 타입 반환"""
    error_message = str(error).lower()
    
    if "connection" in error_message or "network" in error_message:
        return ServerErrorType.CONNECTION_FAILED
    elif "timeout" in error_message:
        return ServerErrorType.TIMEOUT
    elif "protocol" in error_message or "invalid message" in error_message:
        return ServerErrorType.PROTOCOL_ERROR
    elif "initialization" in error_message or "initialize" in error_message:
        return ServerErrorType.INITIALIZATION_FAILED
    elif "tool" in error_message:
        return ServerErrorType.TOOL_EXECUTION_FAILED
    else:
        return ServerErrorType.UNKNOWN
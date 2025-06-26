"""도구 호출 로그 모델"""
from datetime import datetime
from enum import Enum
from sqlalchemy import Column, Integer, String, DateTime, Float, Text, JSON, ForeignKey, Enum as SQLEnum, Numeric
from sqlalchemy.dialects.postgresql import UUID as PGUUID
from sqlalchemy.orm import relationship
from .base import Base


class CallStatus(Enum):
    """도구 호출 상태"""
    SUCCESS = "success"
    ERROR = "error"
    TIMEOUT = "timeout"
    CANCELLED = "cancelled"


class ToolCallLog(Base):
    """도구 호출 로그를 저장하는 모델"""
    __tablename__ = "tool_call_logs"
    
    id = Column(Integer, primary_key=True)
    
    # 실제 DB 스키마에 맞는 필드들
    request_id = Column(String, index=True)
    session_id = Column(String, nullable=True, index=True)  # ForeignKey 제거 - 실제 DB에서 nullable
    tool_id = Column(PGUUID(as_uuid=True), nullable=True)
    project_id = Column(PGUUID(as_uuid=True), nullable=True, index=True)
    api_key_id = Column(PGUUID(as_uuid=True), nullable=True)
    server_id = Column(PGUUID(as_uuid=True), nullable=False, index=True)
    tool_name = Column(String, nullable=False, index=True)
    tool_namespace = Column(String, nullable=True)  # 도구 네임스페이스 (server_id.tool_name 형식)
    
    # 호출 데이터 (실제 DB 필드명 사용)
    arguments = Column(JSON)  # 입력 파라미터
    result = Column(JSON)  # 출력 결과
    
    # 토큰 및 비용 정보
    input_tokens = Column(Integer)
    output_tokens = Column(Integer)
    total_cost = Column(Numeric)
    
    # 실행 정보
    priority = Column(String, nullable=False, default="normal")
    retry_count = Column(Integer, nullable=False, default=0)
    status = Column(SQLEnum(CallStatus), nullable=False, index=True)
    error_message = Column(Text)
    error_code = Column(String)
    execution_time_ms = Column(Integer)  # 실제 DB에서는 Integer
    queue_time_ms = Column(Integer)
    
    # 사용자 정보
    called_by_user_id = Column(PGUUID(as_uuid=True), nullable=True)
    user_agent = Column(String, nullable=True)  # 클라이언트 User-Agent
    ip_address = Column(String, nullable=True)  # 클라이언트 IP 주소
    
    # 타임스탬프
    timestamp = Column(DateTime, default=datetime.utcnow, nullable=False, index=True)
    started_at = Column(DateTime, nullable=True)
    completed_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
    
    # 관계 제거 (ForeignKey가 없으므로)
    # session = relationship("ClientSession", back_populates="tool_calls")
    # project = relationship("Project", back_populates="tool_call_logs")
    
    def __repr__(self):
        return f"<ToolCallLog(id={self.id}, tool_name={self.tool_name}, status={self.status.value})>"
    
    def to_dict(self):
        return {
            "id": self.id,
            "request_id": self.request_id,
            "session_id": self.session_id,
            "tool_id": str(self.tool_id) if self.tool_id else None,
            "project_id": str(self.project_id) if self.project_id else None,
            "api_key_id": str(self.api_key_id) if self.api_key_id else None,
            "server_id": str(self.server_id) if self.server_id else None,
            "tool_name": self.tool_name,
            "tool_namespace": self.tool_namespace,
            "arguments": self.arguments,
            "result": self.result,
            "input_tokens": self.input_tokens,
            "output_tokens": self.output_tokens,
            "total_cost": float(self.total_cost) if self.total_cost else None,
            "priority": self.priority,
            "retry_count": self.retry_count,
            "status": self.status.value if self.status else None,
            "error_message": self.error_message,
            "error_code": self.error_code,
            "execution_time": self.execution_time,
            "execution_time_ms": self.execution_time_ms,
            "queue_time_ms": self.queue_time_ms,
            "called_by_user_id": str(self.called_by_user_id) if self.called_by_user_id else None,
            "user_agent": self.user_agent,
            "ip_address": self.ip_address,
            "timestamp": self.timestamp.isoformat() if self.timestamp else None,
            "started_at": self.started_at.isoformat() if self.started_at else None,
            "completed_at": self.completed_at.isoformat() if self.completed_at else None,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None
        }
    
    @property
    def is_successful(self):
        """호출이 성공했는지 확인"""
        return self.status == CallStatus.SUCCESS
    
    @property
    def execution_time(self):
        """실행 시간을 초 단위로 반환 (호환성을 위해)"""
        return (self.execution_time_ms / 1000.0) if self.execution_time_ms else None
    
    @property
    def duration_ms(self):
        """실행 시간을 밀리초로 반환"""
        return int(self.execution_time_ms) if self.execution_time_ms else None
    
    # 호환성을 위한 별칭들
    @property
    def input_data(self):
        """호환성을 위한 별칭"""
        return self.arguments
    
    @property
    def output_data(self):
        """호환성을 위한 별칭"""
        return self.result

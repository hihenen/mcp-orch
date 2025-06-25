"""도구 호출 로그 모델"""
from datetime import datetime
from enum import Enum
from sqlalchemy import Column, Integer, String, DateTime, Float, Text, JSON, ForeignKey, Enum as SQLEnum
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
    
    # 세션 및 서버 정보
    session_id = Column(String, ForeignKey('client_sessions.id'), nullable=False, index=True)
    server_id = Column(String, nullable=False, index=True)
    project_id = Column(PGUUID(as_uuid=True), ForeignKey('projects.id'), nullable=False, index=True)
    
    # 도구 정보
    tool_name = Column(String, nullable=False, index=True)
    tool_namespace = Column(String, index=True)  # 서버명.도구명 형태
    
    # 호출 데이터
    input_data = Column(JSON)  # 입력 파라미터
    output_data = Column(JSON)  # 출력 결과
    
    # 실행 정보
    execution_time_ms = Column("execution_time_ms", Float)  # 실행 시간 (밀리초)
    status = Column(SQLEnum(CallStatus), nullable=False, index=True)
    error_message = Column(Text)
    error_code = Column(String)
    
    # 메타데이터
    timestamp = Column(DateTime, default=datetime.utcnow, nullable=False, index=True)
    request_id = Column(String, index=True)  # 요청 추적용 ID
    user_agent = Column(String)
    ip_address = Column(String)
    
    # 관계
    session = relationship("ClientSession", back_populates="tool_calls")
    project = relationship("Project", back_populates="tool_call_logs")
    
    def __repr__(self):
        return f"<ToolCallLog(id={self.id}, tool_name={self.tool_name}, status={self.status.value})>"
    
    def to_dict(self):
        return {
            "id": self.id,
            "session_id": self.session_id,
            "server_id": self.server_id,
            "project_id": self.project_id,
            "tool_name": self.tool_name,
            "tool_namespace": self.tool_namespace,
            "input_data": self.input_data,
            "output_data": self.output_data,
            "execution_time": self.execution_time,
            "status": self.status.value if self.status else None,
            "error_message": self.error_message,
            "error_code": self.error_code,
            "timestamp": self.timestamp.isoformat() if self.timestamp else None,
            "request_id": self.request_id,
            "user_agent": self.user_agent,
            "ip_address": self.ip_address
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

"""
서버 로그 모델
MCP 서버의 연결, 오류, 실행 로그를 저장
"""

from sqlalchemy import Column, String, Text, DateTime, Enum, ForeignKey, Index, JSON
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from datetime import datetime
import uuid
import enum

from .base import Base


class LogLevel(enum.Enum):
    """로그 레벨"""
    DEBUG = "debug"
    INFO = "info"
    WARNING = "warning"
    ERROR = "error"
    CRITICAL = "critical"


class LogCategory(enum.Enum):
    """로그 카테고리"""
    STARTUP = "startup"
    SHUTDOWN = "shutdown"
    TOOL_CALL = "tool_call"
    TOOL_EXECUTION = "tool_execution"  # 도구 실행 로그 카테고리 추가
    ERROR = "error"
    CONNECTION = "connection"
    SYSTEM = "system"


class ServerLog(Base):
    """서버 로그 테이블"""
    __tablename__ = "server_logs"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    server_id = Column(UUID(as_uuid=True), ForeignKey("mcp_servers.id", ondelete="CASCADE"), nullable=False)
    
    # 실제 DB 스키마에 맞는 필드들
    session_id = Column(String(100), nullable=True)
    request_id = Column(String(100), nullable=True)
    
    # 로그 정보
    level = Column(Enum(LogLevel), nullable=False, default=LogLevel.INFO)
    category = Column(Enum(LogCategory), nullable=False, default=LogCategory.CONNECTION)
    message = Column(Text, nullable=False)
    details = Column(JSON, nullable=True)  # 실제 DB에서는 JSON 타입
    
    # 메타데이터
    timestamp = Column(DateTime, nullable=False, default=datetime.utcnow)
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    updated_at = Column(DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # 관계
    server = relationship("McpServer", back_populates="logs")
    
    # 인덱스
    __table_args__ = (
        Index('idx_server_logs_server_timestamp', 'server_id', 'timestamp'),
        Index('idx_server_logs_level_timestamp', 'level', 'timestamp'),
        Index('idx_server_logs_category_timestamp', 'category', 'timestamp'),
    )

    def __repr__(self):
        return f"<ServerLog(id={self.id}, server_id={self.server_id}, level={self.level.value}, message='{self.message[:50]}...')>"

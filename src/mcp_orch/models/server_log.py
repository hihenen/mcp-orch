"""
서버 로그 모델
MCP 서버의 연결, 오류, 실행 로그를 저장
"""

from sqlalchemy import Column, String, Text, DateTime, Enum, ForeignKey, Index
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
    CONNECTION = "connection"
    TOOL_EXECUTION = "tool_execution"
    ERROR = "error"
    STATUS_CHECK = "status_check"
    CONFIGURATION = "configuration"


class ServerLog(Base):
    """서버 로그 테이블"""
    __tablename__ = "server_logs"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    server_id = Column(UUID(as_uuid=True), ForeignKey("mcp_servers.id", ondelete="CASCADE"), nullable=False)
    project_id = Column(UUID(as_uuid=True), ForeignKey("projects.id", ondelete="CASCADE"), nullable=False)
    
    # 로그 정보
    level = Column(Enum(LogLevel), nullable=False, default=LogLevel.INFO)
    category = Column(Enum(LogCategory), nullable=False, default=LogCategory.CONNECTION)
    message = Column(Text, nullable=False)
    details = Column(Text, nullable=True)  # JSON 형태의 상세 정보
    
    # 메타데이터
    timestamp = Column(DateTime, nullable=False, default=datetime.utcnow)
    source = Column(String(100), nullable=True)  # 로그 발생 소스 (예: mcp_connection_service)
    
    # 관계
    server = relationship("McpServer", back_populates="logs")
    project = relationship("Project")
    
    # 인덱스
    __table_args__ = (
        Index('idx_server_logs_server_timestamp', 'server_id', 'timestamp'),
        Index('idx_server_logs_project_timestamp', 'project_id', 'timestamp'),
        Index('idx_server_logs_level_timestamp', 'level', 'timestamp'),
        Index('idx_server_logs_category_timestamp', 'category', 'timestamp'),
    )

    def __repr__(self):
        return f"<ServerLog(id={self.id}, server_id={self.server_id}, level={self.level.value}, message='{self.message[:50]}...')>"

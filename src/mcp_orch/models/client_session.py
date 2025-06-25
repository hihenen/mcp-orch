"""클라이언트 세션 모델"""
from datetime import datetime
from uuid import UUID, uuid4
from sqlalchemy import Column, Integer, String, DateTime, Boolean, JSON, ForeignKey
from sqlalchemy.dialects.postgresql import UUID as PGUUID
from sqlalchemy.orm import relationship
from .base import Base


class ClientSession(Base):
    """클라이언트 세션 정보를 저장하는 모델"""
    __tablename__ = "client_sessions"
    
    id = Column(String, primary_key=True)  # 세션 ID (UUID)
    client_type = Column(String, nullable=False)  # cline, cursor, etc.
    client_version = Column(String)  # 클라이언트 버전
    server_id = Column(String, nullable=False, index=True)  # MCP 서버 ID
    project_id = Column(PGUUID(as_uuid=True), ForeignKey('projects.id'), nullable=False, index=True)
    
    # 연결 정보
    connected_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    last_activity = Column(DateTime, default=datetime.utcnow, nullable=False)
    disconnected_at = Column(DateTime)
    is_active = Column(Boolean, default=True, nullable=False)
    
    # 통계 정보
    total_calls = Column(Integer, default=0)
    successful_calls = Column(Integer, default=0)
    failed_calls = Column(Integer, default=0)
    
    # 메타데이터
    client_metadata = Column(JSON)  # 추가 클라이언트 정보
    user_agent = Column(String)
    ip_address = Column(String)
    
    # 관계
    project = relationship("Project", back_populates="client_sessions")
    # ToolCallLog 관계는 ForeignKey가 없으므로 주석 처리
    # tool_calls = relationship("ToolCallLog", back_populates="session", cascade="all, delete-orphan")
    
    def __repr__(self):
        return f"<ClientSession(id={self.id}, client_type={self.client_type}, server_id={self.server_id})>"
    
    def to_dict(self):
        return {
            "id": self.id,
            "client_type": self.client_type,
            "client_version": self.client_version,
            "server_id": self.server_id,
            "project_id": self.project_id,
            "connected_at": self.connected_at.isoformat() if self.connected_at else None,
            "last_activity": self.last_activity.isoformat() if self.last_activity else None,
            "disconnected_at": self.disconnected_at.isoformat() if self.disconnected_at else None,
            "is_active": self.is_active,
            "total_calls": self.total_calls,
            "successful_calls": self.successful_calls,
            "failed_calls": self.failed_calls,
            "metadata": self.client_metadata,
            "user_agent": self.user_agent,
            "ip_address": self.ip_address
        }

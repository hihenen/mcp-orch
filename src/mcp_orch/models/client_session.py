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
    
    id = Column(PGUUID(as_uuid=True), primary_key=True, default=uuid4)  # 세션 ID (UUID)
    session_token = Column(String(255), nullable=False, unique=True)  # 세션 토큰
    user_id = Column(PGUUID(as_uuid=True), ForeignKey('users.id'))  # 사용자 ID
    project_id = Column(PGUUID(as_uuid=True), ForeignKey('projects.id'))  # 프로젝트 ID
    server_id = Column(PGUUID(as_uuid=True), ForeignKey('mcp_servers.id'), nullable=False)  # MCP 서버 ID
    client_name = Column(String(255), nullable=False)  # cline, cursor, etc.
    client_version = Column(String(50))  # 클라이언트 버전
    ip_address = Column(String(45))  # IP 주소
    user_agent = Column(String)  # User Agent
    session_data = Column(JSON)  # 세션 데이터
    capabilities = Column(JSON)  # 클라이언트 능력
    protocol_version = Column(String(20))  # 프로토콜 버전
    status = Column(String(20), nullable=False, default='active')  # 상태
    last_activity_type = Column(String(50))  # 마지막 활동 유형
    connection_count = Column(Integer, nullable=False, default=0)  # 연결 수
    total_requests = Column(Integer, nullable=False, default=0)  # 총 요청 수
    failed_requests = Column(Integer, nullable=False, default=0)  # 실패한 요청 수
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)  # 생성일
    updated_at = Column(DateTime, nullable=False, default=datetime.utcnow)  # 수정일
    last_accessed_at = Column(DateTime, nullable=False, default=datetime.utcnow)  # 마지막 접근일
    expires_at = Column(DateTime, nullable=False)  # 만료일
    
    # 관계
    project = relationship("Project", back_populates="client_sessions")
    # ToolCallLog 관계는 ForeignKey가 없으므로 주석 처리
    # tool_calls = relationship("ToolCallLog", back_populates="session", cascade="all, delete-orphan")
    
    def __repr__(self):
        return f"<ClientSession(id={self.id}, client_name={self.client_name}, server_id={self.server_id})>"
    
    def to_dict(self):
        return {
            "id": str(self.id),
            "session_token": self.session_token,
            "user_id": str(self.user_id) if self.user_id else None,
            "project_id": str(self.project_id) if self.project_id else None,
            "server_id": str(self.server_id),
            "client_name": self.client_name,
            "client_version": self.client_version,
            "ip_address": self.ip_address,
            "user_agent": self.user_agent,
            "session_data": self.session_data,
            "capabilities": self.capabilities,
            "protocol_version": self.protocol_version,
            "status": self.status,
            "last_activity_type": self.last_activity_type,
            "connection_count": self.connection_count,
            "total_requests": self.total_requests,
            "failed_requests": self.failed_requests,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
            "last_accessed_at": self.last_accessed_at.isoformat() if self.last_accessed_at else None,
            "expires_at": self.expires_at.isoformat() if self.expires_at else None
        }
    
    # 호환성을 위한 프로퍼티들
    @property
    def client_type(self):
        """호환성을 위한 client_type 프로퍼티"""
        return self.client_name
    
    @client_type.setter
    def client_type(self, value):
        """호환성을 위한 client_type setter"""
        self.client_name = value
    
    @property
    def is_active(self):
        """호환성을 위한 is_active 프로퍼티"""
        return self.status == 'active'
    
    @property
    def connected_at(self):
        """호환성을 위한 connected_at 프로퍼티"""
        return self.created_at
    
    @property
    def last_activity(self):
        """호환성을 위한 last_activity 프로퍼티"""
        return self.last_accessed_at

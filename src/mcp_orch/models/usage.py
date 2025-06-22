"""API Usage tracking model."""
from uuid import uuid4
from datetime import datetime

from sqlalchemy import Column, String, Integer, Float, DateTime, ForeignKey, Index
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from .base import Base


class ApiUsage(Base):
    """API Usage tracking model for analytics and billing."""
    
    __tablename__ = "api_usage"
    __table_args__ = (
        Index("idx_usage_api_key", "api_key_id"),
        Index("idx_usage_timestamp", "timestamp"),
        Index("idx_usage_team_date", "team_id", "timestamp"),
    )
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid4)
    api_key_id = Column(UUID(as_uuid=True), ForeignKey("api_keys.id"), nullable=False)
    team_id = Column(UUID(as_uuid=True), ForeignKey("teams.id"), nullable=False)
    
    # Request information
    timestamp = Column(DateTime, default=datetime.utcnow, nullable=False, index=True)
    endpoint = Column(String(255), nullable=False)
    method = Column(String(10), nullable=False)  # GET, POST, etc.
    
    # Tool usage (for MCP tool calls)
    tool_name = Column(String(255), nullable=True)
    server_name = Column(String(255), nullable=True)
    
    # Response information
    status_code = Column(Integer, nullable=False)
    response_time_ms = Column(Integer, nullable=False)
    
    # Usage metrics
    tokens_used = Column(Integer, default=0, nullable=False)
    bytes_transferred = Column(Integer, default=0, nullable=False)
    
    # Cost tracking (for future billing)
    cost_credits = Column(Float, default=0.0, nullable=False)
    
    # Request metadata
    ip_address = Column(String(45), nullable=True)  # IPv4 or IPv6
    user_agent = Column(String(500), nullable=True)
    
    # Error tracking
    error_message = Column(String(500), nullable=True)
    
    # Relationships
    api_key = relationship("ApiKey", back_populates="usage_logs")
    team = relationship("Team")
    
    def __repr__(self) -> str:
        return f"<ApiUsage(id={self.id}, endpoint={self.endpoint}, timestamp={self.timestamp})>"

"""API Key model for project-based authentication."""
import secrets
from uuid import uuid4
from datetime import datetime

from sqlalchemy import Column, String, Boolean, Integer, DateTime, ForeignKey, Index, JSON
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from .base import Base


def generate_api_key() -> str:
    """Generate a secure API key."""
    return f"project_{secrets.token_urlsafe(32)}"


class ApiKey(Base):
    """API Key model for project-based authentication."""
    
    __tablename__ = "api_keys"
    __table_args__ = (
        Index("idx_api_key_hash", "key_hash"),
        Index("idx_api_key_project", "project_id"),
    )
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid4)
    project_id = Column(UUID(as_uuid=True), ForeignKey("projects.id"), nullable=False)
    
    # Key information
    name = Column(String(255), nullable=False)
    description = Column(String(1000), nullable=True)  # Optional description
    key_hash = Column(String(255), unique=True, nullable=False)  # Store hashed version
    key_prefix = Column(String(50), nullable=False)  # First chars for identification (expanded from 10)
    key_suffix = Column(String(10), nullable=False)  # Last chars for preview display
    
    # Key settings
    is_active = Column(Boolean, default=True, nullable=False)
    expires_at = Column(DateTime, nullable=True)
    
    # Usage limits
    rate_limit_per_minute = Column(Integer, default=60, nullable=False)
    rate_limit_per_day = Column(Integer, default=10000, nullable=False)
    
    # Tracking
    created_by_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    last_used_at = Column(DateTime, nullable=True)
    last_used_ip = Column(String(45), nullable=True)  # IPv4 or IPv6
    
    # Permissions (JSON field for flexibility)
    permissions = Column(JSON, default=dict, nullable=False)
    
    # Relationships
    project = relationship("Project", back_populates="api_keys")
    created_by = relationship("User")
    usage_logs = relationship(
        "ApiUsage",
        back_populates="api_key",
        cascade="all, delete-orphan"
    )
    
    def __repr__(self) -> str:
        return f"<ApiKey(id={self.id}, name={self.name}, project_id={self.project_id})>"

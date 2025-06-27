"""
Tool Preference Model - 프로젝트별 툴 사용 설정 관리
"""

from sqlalchemy import Column, String, Boolean, ForeignKey, UniqueConstraint, DateTime
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from datetime import datetime

from .base import BaseModel


class ToolPreference(BaseModel):
    """프로젝트별 툴 사용 설정"""
    __tablename__ = "tool_preferences"
    
    project_id = Column(UUID(as_uuid=True), ForeignKey("projects.id", ondelete="CASCADE"), nullable=False)
    server_id = Column(UUID(as_uuid=True), ForeignKey("mcp_servers.id", ondelete="CASCADE"), nullable=False)
    tool_name = Column(String(255), nullable=False)
    is_enabled = Column(Boolean, nullable=False, default=True)
    
    # 관계 설정
    project = relationship("Project", back_populates="tool_preferences")
    server = relationship("McpServer", back_populates="tool_preferences")
    
    # 복합 유니크 제약조건
    __table_args__ = (
        UniqueConstraint('project_id', 'server_id', 'tool_name', name='uq_tool_preference'),
    )

    def __repr__(self):
        return f"<ToolPreference(project_id={self.project_id}, server_id={self.server_id}, tool_name='{self.tool_name}', enabled={self.is_enabled})>"
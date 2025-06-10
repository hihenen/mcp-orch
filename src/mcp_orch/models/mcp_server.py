"""MCP Server model for project-based server management."""
from uuid import uuid4
from datetime import datetime
from enum import Enum

from sqlalchemy import Column, String, Boolean, Integer, DateTime, ForeignKey, JSON, Enum as SQLEnum
from sqlalchemy.dialects.postgresql import UUID, ARRAY
from sqlalchemy.orm import relationship

from .base import Base


class McpServerStatus(str, Enum):
    """MCP Server status enum."""
    ACTIVE = "active"
    INACTIVE = "inactive"
    ERROR = "error"
    STARTING = "starting"
    STOPPING = "stopping"


class McpServer(Base):
    """MCP Server model for project-based server management."""
    
    __tablename__ = "mcp_servers"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid4)
    project_id = Column(UUID(as_uuid=True), ForeignKey("projects.id"), nullable=False)
    
    # Server identification
    name = Column(String(255), nullable=False)  # Unique within project
    display_name = Column(String(255), nullable=True)
    description = Column(String(1000), nullable=True)
    
    # Server configuration
    command = Column(String(500), nullable=False)
    args = Column(JSON, default=list, nullable=False)  # Command arguments
    env = Column(JSON, default=dict, nullable=False)   # Environment variables
    cwd = Column(String(500), nullable=True)  # Working directory
    
    # Server settings
    timeout = Column(Integer, default=60, nullable=False)
    auto_approve = Column(JSON, default=list, nullable=False)  # Auto-approved tools
    transport_type = Column(String(50), default="stdio", nullable=False)
    
    # Status and control
    status = Column(SQLEnum(McpServerStatus), default=McpServerStatus.INACTIVE, nullable=False)
    is_enabled = Column(Boolean, default=True, nullable=False)
    
    # Tracking
    created_by_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
    
    # Process tracking
    process_id = Column(Integer, nullable=True)  # OS process ID when running
    last_started_at = Column(DateTime, nullable=True)
    last_error = Column(String(1000), nullable=True)
    
    # Usage statistics
    total_tool_calls = Column(Integer, default=0, nullable=False)
    last_used_at = Column(DateTime, nullable=True)
    
    # Relationships
    project = relationship("Project", back_populates="servers")
    created_by = relationship("User")
    tools = relationship(
        "McpTool",
        back_populates="server",
        cascade="all, delete-orphan"
    )
    
    def __repr__(self) -> str:
        return f"<McpServer(id={self.id}, name={self.name}, project_id={self.project_id})>"
    
    @property
    def is_running(self) -> bool:
        """Check if server is currently running."""
        return self.status == McpServerStatus.ACTIVE
    
    @property
    def config_dict(self) -> dict:
        """Get server configuration as dictionary for mcp-config.json."""
        return {
            "command": self.command,
            "args": self.args,
            "env": self.env,
            "timeout": self.timeout,
            "autoApprove": self.auto_approve,
            "transportType": self.transport_type,
            "disabled": not self.is_enabled
        }


class McpTool(Base):
    """MCP Tool model for tracking available tools per server."""
    
    __tablename__ = "mcp_tools"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid4)
    server_id = Column(UUID(as_uuid=True), ForeignKey("mcp_servers.id"), nullable=False)
    
    # Tool identification
    name = Column(String(255), nullable=False)
    display_name = Column(String(255), nullable=True)
    description = Column(String(1000), nullable=True)
    
    # Tool schema
    input_schema = Column(JSON, nullable=True)
    
    # Usage tracking
    call_count = Column(Integer, default=0, nullable=False)
    last_called_at = Column(DateTime, nullable=True)
    average_execution_time = Column(Integer, nullable=True)  # milliseconds
    
    # Discovery tracking
    discovered_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    last_seen_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    
    # Relationships
    server = relationship("McpServer", back_populates="tools")
    
    def __repr__(self) -> str:
        return f"<McpTool(id={self.id}, name={self.name}, server_id={self.server_id})>"

"""MCP Server model for project-based server management."""
from uuid import uuid4
from datetime import datetime
from enum import Enum
from typing import List, Dict, Any, Optional

from sqlalchemy import Column, String, Boolean, Integer, DateTime, ForeignKey, JSON, Enum as SQLEnum, Text
from sqlalchemy.dialects.postgresql import UUID, ARRAY
from sqlalchemy.orm import relationship
from sqlalchemy.ext.hybrid import hybrid_property

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
    
    # Legacy plaintext fields (for migration compatibility)
    _args_legacy = Column("args", JSON, default=list, nullable=True)
    _env_legacy = Column("env", JSON, default=dict, nullable=True)
    
    # New encrypted fields
    _args_encrypted = Column(Text, nullable=True, comment="Encrypted JSON of command arguments")
    _env_encrypted = Column(Text, nullable=True, comment="Encrypted JSON of environment variables")
    
    cwd = Column(String(500), nullable=True)  # Working directory
    
    # Server settings
    timeout = Column(Integer, default=60, nullable=False)
    auto_approve = Column(JSON, default=list, nullable=False)  # Auto-approved tools
    transport_type = Column(String(50), default="stdio", nullable=False)
    compatibility_mode = Column(String(50), default="resource_connection", nullable=False, comment="MCP compatibility mode: resource_connection (single mode)")
    
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
    logs = relationship(
        "ServerLog",
        back_populates="server",
        cascade="all, delete-orphan"
    )
    
    def __repr__(self) -> str:
        return f"<McpServer(id={self.id}, name={self.name}, project_id={self.project_id})>"
    
    @property
    def is_running(self) -> bool:
        """Check if server is currently running."""
        return self.status == McpServerStatus.ACTIVE
    
    def _get_secret_manager(self):
        """Get secret manager instance for encryption/decryption."""
        from ..security import SecretManager
        return SecretManager()
    
    @hybrid_property
    def args(self) -> List[str]:
        """Get command arguments (with automatic decryption)."""
        # Try encrypted field first (new data)
        if self._args_encrypted:
            try:
                secret_manager = self._get_secret_manager()
                return secret_manager.backend.decrypt_json(self._args_encrypted)
            except Exception:
                # If decryption fails, fall back to legacy field
                pass
        
        # Fall back to legacy plaintext field (old data)
        return self._args_legacy or []
    
    @args.setter
    def args(self, value: List[str]):
        """Set command arguments (with automatic encryption)."""
        if value is None:
            value = []
        
        # Encrypt and store in new field
        try:
            secret_manager = self._get_secret_manager()
            self._args_encrypted = secret_manager.backend.encrypt_json(value)
            # Clear legacy field to indicate migration
            self._args_legacy = None
        except Exception:
            # If encryption fails, store in legacy field as fallback
            self._args_legacy = value
    
    @hybrid_property
    def env(self) -> Dict[str, str]:
        """Get environment variables (with automatic decryption)."""
        # Try encrypted field first (new data)
        if self._env_encrypted:
            try:
                secret_manager = self._get_secret_manager()
                return secret_manager.backend.decrypt_json(self._env_encrypted)
            except Exception:
                # If decryption fails, fall back to legacy field
                pass
        
        # Fall back to legacy plaintext field (old data)
        return self._env_legacy or {}
    
    @env.setter
    def env(self, value: Dict[str, str]):
        """Set environment variables (with automatic encryption)."""
        if value is None:
            value = {}
        
        # Encrypt and store in new field
        try:
            secret_manager = self._get_secret_manager()
            self._env_encrypted = secret_manager.backend.encrypt_json(value)
            # Clear legacy field to indicate migration
            self._env_legacy = None
        except Exception:
            # If encryption fails, store in legacy field as fallback
            self._env_legacy = value
    
    @property
    def is_encrypted(self) -> bool:
        """Check if server data is encrypted."""
        return bool(self._args_encrypted or self._env_encrypted)
    
    @property
    def encryption_status(self) -> Dict[str, Any]:
        """Get detailed encryption status."""
        return {
            "args_encrypted": bool(self._args_encrypted),
            "env_encrypted": bool(self._env_encrypted), 
            "has_legacy_args": bool(self._args_legacy),
            "has_legacy_env": bool(self._env_legacy),
            "is_fully_migrated": bool(
                self._args_encrypted and 
                self._env_encrypted and 
                not self._args_legacy and 
                not self._env_legacy
            ),
        }
    
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
            "serverType": "resource_connection",
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
    description = Column(Text, nullable=True)  # Changed from String(1000) to Text for longer descriptions
    
    # Tool schema
    input_schema = Column(JSON, nullable=True)
    
    # Usage tracking
    call_count = Column(Integer, default=0, nullable=False)
    last_called_at = Column(DateTime, nullable=True)
    average_execution_time = Column(Integer, nullable=True)  # milliseconds
    
    # Discovery tracking
    discovered_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    last_seen_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    
    # Standard timestamps
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
    
    # Relationships
    server = relationship("McpServer", back_populates="tools")
    
    def __repr__(self) -> str:
        return f"<McpTool(id={self.id}, name={self.name}, server_id={self.server_id})>"

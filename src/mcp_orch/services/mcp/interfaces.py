"""
MCP Service Interfaces

Abstract interfaces for MCP service components to ensure loose coupling
and enable dependency inversion principle.
"""

from abc import ABC, abstractmethod
from typing import Dict, List, Optional, Any, Union
from datetime import datetime
from uuid import UUID

# Import types that may not be available at runtime
try:
    from sqlalchemy.orm import Session
except ImportError:
    Session = Any  # Fallback for environments without SQLAlchemy

try:
    from ...models import ServerLog, LogLevel, LogCategory
except ImportError:
    # Fallback types for testing environments
    ServerLog = Any
    LogLevel = Any
    LogCategory = Any


class IMcpConnectionManager(ABC):
    """Interface for MCP server connection management"""
    
    @abstractmethod
    async def connect(self, server_config: Dict) -> Any:
        """Establish connection to MCP server"""
        pass
    
    @abstractmethod
    async def disconnect(self, connection: Any) -> None:
        """Close connection to MCP server"""
        pass
    
    @abstractmethod
    async def test_connection(self, server_config: Dict) -> bool:
        """Test if connection to server is possible"""
        pass
    
    @abstractmethod
    async def is_connection_alive(self, connection: Any) -> bool:
        """Check if existing connection is still alive"""
        pass


class IMcpToolExecutor(ABC):
    """Interface for MCP tool execution"""
    
    @abstractmethod
    async def execute_tool(
        self, 
        connection: Any, 
        tool_name: str, 
        arguments: Dict, 
        db: Optional[Session] = None,
        project_id: Optional[str] = None,
        server_id: Optional[str] = None
    ) -> Any:
        """Execute a tool on MCP server"""
        pass
    
    @abstractmethod
    async def get_available_tools(self, connection: Any) -> List[Dict]:
        """Get list of available tools from MCP server"""
        pass
    
    @abstractmethod
    def validate_tool_arguments(self, tool_schema: Dict, arguments: Dict) -> bool:
        """Validate tool arguments against schema"""
        pass


class IMcpStatusChecker(ABC):
    """Interface for MCP server status monitoring"""
    
    @abstractmethod
    async def check_server_status(self, server_id: str, server_config: Dict) -> str:
        """Check real-time status of MCP server"""
        pass
    
    @abstractmethod
    async def validate_server_config(self, server_config: Dict) -> bool:
        """Validate server configuration"""
        pass
    
    @abstractmethod
    async def get_server_health(self, server_id: str) -> Dict:
        """Get detailed health information for server"""
        pass


class IMcpConfigManager(ABC):
    """Interface for MCP configuration management"""
    
    @abstractmethod
    def build_config_from_db(self, db_server) -> Dict:
        """Build server configuration from database model"""
        pass
    
    @abstractmethod
    def generate_unique_server_id(self, db_server) -> str:
        """Generate unique server ID for project scope"""
        pass
    
    @abstractmethod
    def validate_config(self, config: Dict) -> Dict:
        """Validate and normalize configuration"""
        pass
    
    @abstractmethod
    def merge_environment_config(self, base_config: Dict, env_config: Dict) -> Dict:
        """Merge base configuration with environment-specific settings"""
        pass


class IMcpLogger(ABC):
    """Interface for MCP-specific logging"""
    
    @abstractmethod
    async def log_connection_event(
        self,
        db: Session,
        server_id: str,
        project_id: str,
        level: LogLevel,
        category: LogCategory,
        message: str,
        details: Optional[str] = None
    ) -> None:
        """Log connection-related events"""
        pass
    
    @abstractmethod
    async def log_tool_execution(
        self,
        db: Session,
        server_id: str,
        project_id: str,
        tool_name: str,
        execution_time: float,
        success: bool,
        error_message: Optional[str] = None,
        details: Optional[Dict] = None
    ) -> None:
        """Log tool execution events"""
        pass
    
    @abstractmethod
    async def log_server_status_change(
        self,
        db: Session,
        server_id: str,
        project_id: str,
        old_status: str,
        new_status: str,
        details: Optional[str] = None
    ) -> None:
        """Log server status changes"""
        pass


class IMcpErrorHandler(ABC):
    """Interface for MCP error handling and classification"""
    
    @abstractmethod
    def extract_meaningful_error(self, stderr_text: str) -> str:
        """Extract meaningful error message from stderr"""
        pass
    
    @abstractmethod
    def classify_error(self, error: Exception) -> str:
        """Classify error type for appropriate handling"""
        pass
    
    @abstractmethod
    def create_error_response(self, error: Exception, context: Optional[Dict] = None) -> Dict:
        """Create standardized error response"""
        pass
    
    @abstractmethod
    def should_retry(self, error: Exception, attempt_count: int) -> bool:
        """Determine if operation should be retried based on error type"""
        pass


class ToolExecutionError(Exception):
    """Enhanced exception for tool execution errors"""
    
    def __init__(self, message: str, error_code: str = "UNKNOWN", details: Optional[Dict] = None):
        super().__init__(message)
        self.error_code = error_code
        self.details = details or {}
        self.message = message
        self.timestamp = datetime.now()
    
    def to_dict(self) -> Dict:
        """Convert exception to dictionary for serialization"""
        return {
            "message": self.message,
            "error_code": self.error_code,
            "details": self.details,
            "timestamp": self.timestamp.isoformat()
        }
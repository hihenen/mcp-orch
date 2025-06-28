"""
MCP (Model Context Protocol) Service Components

This package contains refactored MCP service components that follow SOLID principles:
- Single Responsibility: Each service has one clear purpose
- Open/Closed: Extensible without modification
- Interface Segregation: Focused interfaces
- Dependency Inversion: Depend on abstractions

Components:
- connection_manager: MCP server connection management
- tool_executor: Tool execution and orchestration  
- status_checker: Server status monitoring
- config_manager: Configuration management
- logger: MCP-specific logging
- error_handler: Error processing and classification
- orchestrator: Unified facade for backward compatibility
"""

from .interfaces import (
    IMcpConnectionManager,
    IMcpToolExecutor,
    IMcpStatusChecker,
    IMcpConfigManager,
    IMcpLogger,
    IMcpErrorHandler,
    ToolExecutionError
)

from .connection_manager import McpConnectionManager
from .tool_executor import McpToolExecutor
from .status_checker import McpStatusChecker
from .config_manager import McpConfigManager
from .logger import McpLogger
from .error_handler import McpErrorHandler

# Import orchestrator components without circular dependency
def get_orchestrator():
    """Factory function to get orchestrator instance"""
    from .orchestrator import McpOrchestrator
    return McpOrchestrator()

def get_connection_service():
    """Factory function to get connection service for backward compatibility"""
    from .orchestrator import McpConnectionService
    return McpConnectionService()

__all__ = [
    'IMcpConnectionManager',
    'IMcpToolExecutor', 
    'IMcpStatusChecker',
    'IMcpConfigManager',
    'IMcpLogger',
    'IMcpErrorHandler',
    'ToolExecutionError',
    'McpConnectionManager',
    'McpToolExecutor',
    'McpStatusChecker',
    'McpConfigManager',
    'McpLogger',
    'McpErrorHandler',
    'get_orchestrator',
    'get_connection_service'
]
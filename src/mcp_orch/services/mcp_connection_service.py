"""
MCP 서버 연결 및 상태 관리 서비스

REFACTORED: This file now imports from the new modular service components
while maintaining complete backward compatibility.

The original 1531-line monolithic implementation has been split into:
- McpConnectionManager: Connection management
- McpToolExecutor: Tool execution  
- McpStatusChecker: Status monitoring
- McpConfigManager: Configuration management
- McpLogger: Logging operations
- McpErrorHandler: Error processing
- McpOrchestrator: Unified facade

For new code, consider using the individual services directly:
from ..services.mcp import McpOrchestrator, McpConnectionManager, etc.

This file maintains the original interface for backward compatibility.
"""

# Import refactored components
from .mcp_connection_service_refactored import (
    McpConnectionService,
    mcp_connection_service,
    ToolExecutionError
)

import logging
logger = logging.getLogger(__name__)

# Re-export for backward compatibility
__all__ = ['McpConnectionService', 'mcp_connection_service', 'ToolExecutionError']

# Log the successful refactoring
logger.info("🔄 MCP Connection Service now using refactored modular components")
logger.info("📦 Original 1531-line file split into 6 focused service components")
logger.info("🔧 Backward compatibility maintained via Facade pattern")
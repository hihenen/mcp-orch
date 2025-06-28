"""
MCP Connection Service - Refactored Implementation

This file provides backward compatibility by importing and re-exporting
the new refactored MCP service components.

MIGRATION GUIDE:
================

Old usage:
```python
from ..services.mcp_connection_service import mcp_connection_service
result = await mcp_connection_service.call_tool(...)
```

New usage (recommended):
```python
from ..services.mcp import McpOrchestrator
orchestrator = McpOrchestrator()
result = await orchestrator.call_tool(...)
```

The old usage will continue to work unchanged, but the new usage
provides access to individual service components for better testing
and modularity.

REFACTORED COMPONENTS:
======================

Individual services (for advanced usage):
- McpConnectionManager: Connection lifecycle management
- McpToolExecutor: Tool execution and validation
- McpStatusChecker: Server status monitoring
- McpConfigManager: Configuration management
- McpLogger: Structured logging
- McpErrorHandler: Error processing and classification

Unified facade (for backward compatibility):
- McpOrchestrator: Combines all services with original interface
- McpConnectionService: Exact drop-in replacement
"""

# Import the refactored components with factory functions to avoid circular imports
from .mcp import (
    McpConnectionManager,
    McpToolExecutor,
    McpStatusChecker,
    McpConfigManager,
    McpLogger,
    McpErrorHandler,
    ToolExecutionError,
    get_orchestrator,
    get_connection_service
)

# Create instances using factory functions
mcp_orchestrator = get_orchestrator()
mcp_connection_service = get_connection_service()

# Import classes directly from orchestrator module
from .mcp.orchestrator import McpOrchestrator, McpConnectionService

# For backward compatibility, re-export with original names
McpConnectionService = McpConnectionService  # Class alias
mcp_connection_service = mcp_connection_service  # Instance alias
ToolExecutionError = ToolExecutionError  # Exception alias

__all__ = [
    # Backward compatibility exports
    'McpConnectionService',
    'mcp_connection_service',
    'ToolExecutionError',
    
    # New service components
    'McpOrchestrator',
    'McpConnectionManager',
    'McpToolExecutor',
    'McpStatusChecker',
    'McpConfigManager',
    'McpLogger',
    'McpErrorHandler',
    'mcp_orchestrator'
]
"""
Unified MCP Transport - Refactored

This file now imports from the new modular structure while maintaining
backward compatibility. The original 1,328-line implementation has been
split into focused modules following SOLID principles.

REFACTORED: Moved to api/mcp/unified/ package:
- transport.py: Core UnifiedMCPTransport class (500 lines)
- protocol_handler.py: MCP protocol handling (300 lines)
- health_monitor.py: Server health monitoring (200 lines)
- structured_logger.py: Structured logging (150 lines)
- auth.py: Authentication (100 lines)
- routes.py: HTTP endpoints (150 lines)

For new code, import directly from the modules:
```python
from ..api.mcp.unified import UnifiedMCPTransport, router
from ..api.mcp.unified.health_monitor import ServerHealthInfo
```

This file maintains the original interface for backward compatibility.
"""

import logging

# Re-export everything from the new modular structure
from .mcp.unified import (
    router,
    UnifiedMCPTransport,
    ServerHealthInfo,
    ServerStatus,
    ServerErrorType,
    StructuredLogger
)

# Import routes to ensure they're registered
from .mcp.unified.routes import (
    unified_mcp_endpoint,
    unified_mcp_messages_endpoint
)

# Import auth function for backward compatibility
from .mcp.unified.auth import get_current_user_for_unified_mcp

# Re-export SSE transports from the original location
from .mcp_sse_transport import sse_transports

logger = logging.getLogger(__name__)

# Log the successful refactoring
logger.info("🔄 Unified MCP Transport now using refactored modular components")
logger.info("📦 Original 1,328-line file split into 6 focused modules")
logger.info("🔧 Backward compatibility maintained via re-exports")

__all__ = [
    'router',
    'UnifiedMCPTransport',
    'ServerHealthInfo',
    'ServerStatus',
    'ServerErrorType',
    'StructuredLogger',
    'unified_mcp_endpoint',
    'unified_mcp_messages_endpoint',
    'get_current_user_for_unified_mcp',
    'sse_transports'
]
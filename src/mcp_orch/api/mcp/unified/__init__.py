"""
Unified MCP Transport Module

This module provides a unified interface for accessing multiple MCP servers
through a single endpoint, maintaining full compatibility with individual
server functionality while adding namespace-based routing.

Components:
- transport.py: Core UnifiedMCPTransport class
- protocol_handler.py: MCP protocol message handling
- health_monitor.py: Server health tracking
- structured_logger.py: Structured logging for observability
- auth.py: JWT authentication
- routes.py: FastAPI HTTP endpoints
"""

from .routes import router
from .transport import UnifiedMCPTransport
from .health_monitor import ServerHealthInfo, ServerStatus, ServerErrorType
from .structured_logger import StructuredLogger

__all__ = [
    'router',
    'UnifiedMCPTransport',
    'ServerHealthInfo',
    'ServerStatus', 
    'ServerErrorType',
    'StructuredLogger'
]
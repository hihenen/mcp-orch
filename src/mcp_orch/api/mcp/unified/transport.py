"""
Unified MCP Transport Core

Main transport class that extends MCPSSETransport to support
multiple MCP servers with namespace-based routing.
"""

import asyncio
import json
import logging
from typing import Dict, Any, Optional, List, AsyncGenerator
from uuid import UUID
from urllib.parse import urlparse

from fastapi import Request
from fastapi.responses import JSONResponse

from ...mcp_sse_transport import MCPSSETransport
from ....models import McpServer
from ....utils.namespace import (
    NamespaceRegistry, UnifiedToolNaming, NAMESPACE_SEPARATOR
)
from .structured_logger import StructuredLogger
from .health_monitor import ServerHealthInfo, classify_error
from .protocol_handler import UnifiedProtocolHandler


logger = logging.getLogger(__name__)


class UnifiedMCPTransport(MCPSSETransport):
    """
    Unified MCP Transport - Extends MCPSSETransport
    
    Maintains 100% compatibility with individual server functionality
    while adding multi-server routing capabilities:
    - Namespace-based tool management
    - Error isolation (individual server failures don't affect others)
    - Orchestrator meta-tools
    - Dynamic namespace separator configuration
    """
    
    def __init__(self, session_id: str, message_endpoint: str, 
                 project_servers: List[McpServer], project_id: UUID):
        
        # Initialize base MCPSSETransport with first server or dummy
        primary_server = project_servers[0] if project_servers else None
        if not primary_server:
            # Create dummy server if none available
            from ....models.mcp_server import McpServer as McpServerModel
            primary_server = McpServerModel(
                name="unified-placeholder",
                command="echo",
                args=["Unified MCP Server"],
                project_id=project_id,
                is_enabled=True
            )
        
        super().__init__(session_id, message_endpoint, primary_server, project_id)
        
        # Additional attributes for unified functionality
        self.project_servers = project_servers
        self.namespace_registry = NamespaceRegistry()
        self.server_connections = {}  # Individual server connection cache
        self.server_health = {}  # Server health tracking
        self.structured_logger = StructuredLogger(session_id, project_id)
        self.tool_naming = UnifiedToolNaming()
        self.protocol_handler = UnifiedProtocolHandler(self)
        
        # Legacy mode initialization (default: False)
        self._legacy_mode = False
        
        # Initialize server health info
        for server in project_servers:
            if server.is_enabled:
                self.server_health[server.name] = ServerHealthInfo(server.name)
        
        # Register server namespaces
        self._register_servers()
        
        # Log session creation
        self.structured_logger.session_event(
            "session_created",
            servers_count=len(project_servers),
            enabled_servers_count=len([s for s in project_servers if s.is_enabled]),
            namespace_separator=NAMESPACE_SEPARATOR
        )
        
        logger.info(f"🚀 UnifiedMCPTransport created: session={session_id}, servers={len(project_servers)}, separator='{NAMESPACE_SEPARATOR}'")
    
    async def start_sse_stream(self) -> AsyncGenerator[str, None]:
        """
        Start Unified MCP SSE stream (overrides base class)
        
        Ensures Inspector compatibility while adding unified functionality:
        1. Send Inspector standard endpoint event
        2. Start message queue processing loop
        3. Manage keep-alive
        4. Log unified server status
        """
        try:
            # 1. Send Inspector standard endpoint event
            parsed = urlparse(self.message_endpoint)
            actual_message_endpoint = f"{parsed.path}?sessionId={self.session_id}"
            
            # Inspector standard format: event: endpoint\ndata: URL\n\n
            yield f"event: endpoint\ndata: {actual_message_endpoint}\n\n"
            self.is_connected = True
            logger.info(f"✅ Sent Inspector-compatible endpoint event: {actual_message_endpoint}")
            
            # 2. Initialize unified server logging
            logger.info(f"🎯 Unified MCP initialize: session={self.session_id}, servers={len(self.project_servers)}")
            
            # 3. Connection stabilization wait
            await asyncio.sleep(0.1)
            
            # 4. Message queue processing loop
            logger.info(f"🔄 Starting message queue loop for session {self.session_id}")
            keepalive_count = 0
            
            while self.is_connected:
                try:
                    # Wait for message (30 second timeout)
                    message = await asyncio.wait_for(self.message_queue.get(), timeout=30.0)
                    
                    if message is None:  # Termination signal
                        logger.info(f"📭 Received termination signal for session {self.session_id}")
                        break
                    
                    # Format and send message (Inspector 호환 형식)
                    yield f"data: {json.dumps(message)}\n\n"
                    logger.debug(f"📤 Sent unified message to session {self.session_id}: {message.get('method', 'unknown')}")
                    
                except asyncio.TimeoutError:
                    # Keep-alive 전송 (원본과 동일한 형식)
                    keepalive_count += 1
                    yield f": unified-keepalive-{keepalive_count}\n\n"
                    
                    if keepalive_count % 10 == 0:
                        logger.debug(f"💓 Unified keepalive #{keepalive_count} for session {self.session_id}")
                    
                except Exception as e:
                    logger.error(f"❌ Error in SSE stream for session {self.session_id}: {e}")
                    self.is_connected = False
                    break
            
        except asyncio.CancelledError:
            logger.info(f"🔌 Unified SSE stream cancelled for session {self.session_id}")
            raise
        except Exception as e:
            logger.error(f"❌ Error in unified SSE stream {self.session_id}: {e}")
            # 오류 이벤트 전송 (원본과 동일)
            error_event = {
                "jsonrpc": "2.0",
                "method": "notifications/error",
                "params": {
                    "code": -32000,
                    "message": f"Unified SSE stream error: {str(e)}"
                }
            }
            yield f"data: {json.dumps(error_event)}\n\n"
        finally:
            self.is_connected = False
            logger.info(f"🔚 SSE stream ended for session {self.session_id}")
    
    async def handle_post_message(self, request: Request) -> JSONResponse:
        """
        Handle POST messages to unified endpoint (overrides base class)
        
        Routes messages to appropriate handlers based on method.
        """
        try:
            # Parse request body
            body = await request.body()
            message = json.loads(body) if body else {}
            
            method = message.get("method", "")
            logger.info(f"📨 Unified POST: method={method}, session={self.session_id}")
            
            # Route to appropriate handler
            if method == "initialize":
                return await self.protocol_handler.handle_initialize(message)
            elif method == "tools/list":
                return await self.protocol_handler.handle_tools_list(message)
            elif method == "tools/call":
                return await self.protocol_handler.handle_tool_call(message)
            elif method == "resources/list":
                return await self.protocol_handler.handle_resources_list(message)
            elif method == "resources/templates/list":
                return await self.protocol_handler.handle_resources_templates_list(message)
            elif method == "notifications/initialized":
                return await self.handle_notification(message)
            elif method == "shutdown":
                return await self.handle_shutdown(message)
            else:
                # Unknown method
                logger.warning(f"⚠️ Unknown method in unified transport: {method}")
                error_response = {
                    "jsonrpc": "2.0",
                    "id": message.get("id"),
                    "error": {
                        "code": -32601,
                        "message": f"Method not found: {method}"
                    }
                }
                await self.message_queue.put(error_response)
                return JSONResponse(content={"status": "processing"}, status_code=202)
                
        except json.JSONDecodeError as e:
            logger.error(f"❌ JSON decode error: {e}")
            return JSONResponse(
                content={"error": "Invalid JSON"},
                status_code=400
            )
        except Exception as e:
            logger.error(f"❌ Error handling POST message: {e}")
            return JSONResponse(
                content={"error": str(e)},
                status_code=500
            )
    
    async def handle_notification(self, message: Dict[str, Any]) -> JSONResponse:
        """Handle notification messages"""
        notification_method = message.get("method", "")
        
        if notification_method == "notifications/initialized":
            logger.info(f"✅ Received initialized notification for unified session {self.session_id}")
            self.initialized = True
            # Log server health summary
            health_summary = self._get_server_health_summary()
            logger.info(f"📊 Server health at initialization: {json.dumps(health_summary, indent=2)}")
            
        return JSONResponse(content={"status": "ok"}, status_code=200)
    
    def _register_servers(self):
        """Register namespaces for all servers"""
        for server in self.project_servers:
            if server.is_enabled:
                namespace = self.namespace_registry.register_server(server.name)
                logger.info(f"📝 Registered namespace '{namespace}' for server '{server.name}'")
    
    def _record_server_success(self, server_name: str, tools_count: int = 0):
        """Record successful server operation"""
        if server_name in self.server_health:
            self.server_health[server_name].record_success()
            self.server_health[server_name].tools_available = tools_count
            self.structured_logger.server_success(server_name, tools_count)
    
    def _record_server_failure(self, server_name: str, error: Exception):
        """Record server failure"""
        if server_name in self.server_health:
            error_type = classify_error(error)
            self.server_health[server_name].record_failure(error_type, str(error))
            self.structured_logger.server_failure(
                server_name, 
                error_type.value, 
                str(error),
                self.server_health[server_name].consecutive_failures
            )
    
    def _is_server_available(self, server_name: str) -> bool:
        """Check if server is available for operations"""
        if server_name not in self.server_health:
            return False
        return not self.server_health[server_name].is_failed()
    
    def _get_failed_servers(self) -> List[str]:
        """Get list of failed servers"""
        return [
            name for name, health in self.server_health.items()
            if health.is_failed()
        ]
    
    def _get_server_health_summary(self) -> Dict[str, Any]:
        """Get health summary for all servers"""
        return {
            "total_servers": len(self.project_servers),
            "enabled_servers": len([s for s in self.project_servers if s.is_enabled]),
            "healthy_servers": len([h for h in self.server_health.values() if h.status.value == "healthy"]),
            "failed_servers": self._get_failed_servers(),
            "server_details": {
                name: health.get_health_summary()
                for name, health in self.server_health.items()
            }
        }
    
    def _build_server_config_for_server(self, server: McpServer) -> Optional[Dict[str, Any]]:
        """Build server configuration for MCP connection service"""
        try:
            return {
                "command": server.command,
                "args": server.args or [],
                "env": server.env or {},
                "timeout": server.timeout,
                "is_enabled": server.is_enabled
            }
        except Exception as e:
            logger.error(f"Failed to build config for server {server.name}: {e}")
            return None
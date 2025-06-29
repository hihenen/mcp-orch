"""
MCP Protocol Handler for Unified MCP Transport

Handles MCP protocol messages including initialization, tool listing,
and tool execution across multiple servers.
"""

import logging
from typing import Dict, Any, List, Optional
from uuid import UUID

from fastapi.responses import JSONResponse

from ....services.mcp_connection_service import mcp_connection_service
from ....services.tool_filtering_service import ToolFilteringService
from ....utils.namespace import create_namespaced_name
from .health_monitor import ServerHealthInfo, classify_error


logger = logging.getLogger(__name__)


class UnifiedProtocolHandler:
    """Handles MCP protocol operations for unified transport"""
    
    def __init__(self, transport):
        """
        Initialize protocol handler with reference to transport
        
        Args:
            transport: UnifiedMCPTransport instance
        """
        self.transport = transport
        
    async def handle_initialize(self, message: Dict[str, Any]) -> JSONResponse:
        """
        Handle initialization request for unified server
        
        Queues response through SSE message queue instead of direct return.
        """
        request_id = message.get("id")
        params = message.get("params", {})
        
        logger.info(f"🎯 Unified MCP initialize: session={self.transport.session_id}, servers={len(self.transport.project_servers)}")
        
        # Count active servers
        active_servers = [s for s in self.transport.project_servers if s.is_enabled]
        
        # MCP standard initialization response
        response_data = {
            "jsonrpc": "2.0",
            "id": request_id,
            "result": {
                "protocolVersion": "2025-03-26",
                "capabilities": {
                    "experimental": {},
                    "tools": {
                        "listChanged": False
                    } if active_servers else {},
                    "logging": {},
                    "prompts": {},
                    "resources": {}
                },
                "serverInfo": {
                    "name": f"mcp-orch-unified",
                    "version": "1.9.4"
                },
                "instructions": f"MCP Orchestrator unified proxy for project {self.transport.project_id}. Use tools/list to see available tools."
            }
        }
        
        # Queue response for SSE delivery
        logger.info(f"📤 Queueing initialize response for Unified SSE session {self.transport.session_id}")
        await self.transport.message_queue.put(response_data)
        
        logger.info(f"✅ Unified initialize response queued: session={self.transport.session_id}")
        
        # Return HTTP 202 Accepted (actual response sent via SSE)
        return JSONResponse(content={"status": "processing"}, status_code=202)
    
    async def handle_tools_list(self, message: Dict[str, Any]) -> JSONResponse:
        """
        List tools from all active servers with namespacing and filtering
        """
        all_tools = []
        failed_servers = []
        active_servers = [s for s in self.transport.project_servers if s.is_enabled]
        
        request_id = message.get("id")
        legacy_mode = getattr(self.transport, '_legacy_mode', True)
        
        logger.info(f"📋 Listing unified tools from {len(active_servers)} servers (legacy_mode: {legacy_mode})")
        
        # Collect tools from each server
        for server in active_servers:
            try:
                # Check server health
                if not self.transport._is_server_available(server.name):
                    logger.debug(f"Skipping unavailable server: {server.name}")
                    failed_servers.append(server.name)
                    continue
                
                # Build server config
                server_config = self.transport._build_server_config_for_server(server)
                if not server_config:
                    error_msg = f"Failed to build config for server: {server.name}"
                    logger.warning(error_msg)
                    self.transport._record_server_failure(server.name, Exception(error_msg))
                    failed_servers.append(server.name)
                    continue
                
                # Get tools from server
                tools = await mcp_connection_service.get_server_tools(
                    str(server.id), server_config
                )
                
                if tools is None:
                    error_msg = f"No tools returned from server: {server.name}"
                    logger.warning(error_msg)
                    self.transport._record_server_failure(server.name, Exception(error_msg))
                    failed_servers.append(server.name)
                    continue
                
                # Apply tool filtering
                filtered_tools = await ToolFilteringService.filter_tools_by_preferences(
                    project_id=self.transport.project_id,
                    server_id=server.id,
                    tools=tools,
                    db=None
                )
                
                logger.info(f"🎯 Applied tool filtering for {server.name}: {len(filtered_tools)}/{len(tools)} tools enabled")
                
                # Process tools with namespacing
                for tool in filtered_tools:
                    try:
                        namespaced_tool = self._create_namespaced_tool(tool, server)
                        all_tools.append(namespaced_tool)
                    except Exception as tool_error:
                        logger.error(f"Error processing tool {tool.get('name', 'unknown')}: {tool_error}")
                
                # Record success
                self.transport._record_server_success(server.name, len(filtered_tools))
                
            except Exception as e:
                logger.error(f"❌ Failed to get tools from server {server.name}: {e}")
                failed_servers.append(server.name)
                self.transport._record_server_failure(server.name, e)
        
        # Note: Orchestrator meta-tools removed per user request
        # Only show actual MCP server tools
        
        # Log summary
        logger.info(f"✅ Unified tools collected: {len(all_tools)} tools from {len(active_servers)} servers")
        if failed_servers:
            logger.warning(f"⚠️ Failed servers: {failed_servers}")
        
        # Prepare response
        response_data = {
            "jsonrpc": "2.0",
            "id": request_id,
            "result": {
                "tools": all_tools
            }
        }
        
        # Queue response
        await self.transport.message_queue.put(response_data)
        
        return JSONResponse(content={"status": "processing"}, status_code=202)
    
    async def handle_tool_call(self, message: Dict[str, Any]) -> JSONResponse:
        """
        Execute tool call on appropriate server
        """
        request_id = message.get("id")
        params = message.get("params", {})
        tool_name = params.get("name")
        arguments = params.get("arguments", {})
        
        if not tool_name:
            error_response = {
                "jsonrpc": "2.0",
                "id": request_id,
                "error": {
                    "code": -32602,
                    "message": "Invalid params: 'name' is required"
                }
            }
            await self.transport.message_queue.put(error_response)
            return JSONResponse(content={"status": "processing"}, status_code=202)
        
        # Note: Orchestrator meta-tools removed per user request
        
        # Parse namespace and route to server
        namespace_info = self.transport.tool_naming.parse_tool_name(tool_name)
        server_name = namespace_info.get("server_name")
        
        if not server_name:
            error_response = {
                "jsonrpc": "2.0",
                "id": request_id,
                "error": {
                    "code": -32601,
                    "message": f"Tool not found: {tool_name}"
                }
            }
            await self.transport.message_queue.put(error_response)
            return JSONResponse(content={"status": "processing"}, status_code=202)
        
        # Execute tool on target server
        try:
            result = await self._execute_tool_on_server(
                server_name, namespace_info["original_name"], arguments
            )
            
            response_data = {
                "jsonrpc": "2.0",
                "id": request_id,
                "result": result
            }
            
        except Exception as e:
            logger.error(f"Tool execution failed: {e}")
            response_data = {
                "jsonrpc": "2.0",
                "id": request_id,
                "error": {
                    "code": -32603,
                    "message": str(e)
                }
            }
        
        await self.transport.message_queue.put(response_data)
        return JSONResponse(content={"status": "processing"}, status_code=202)
    
    def _create_namespaced_tool(self, tool: Dict[str, Any], server) -> Dict[str, Any]:
        """Create namespaced version of tool"""
        original_name = tool.get("name", "")
        namespace = self.transport.namespace_registry.get_namespace(server.name)
        
        # Use legacy mode setting from transport
        legacy_mode = getattr(self.transport, '_legacy_mode', True)
        
        if legacy_mode:
            # Legacy mode - use simple dot notation
            namespaced_name = f"{namespace}.{original_name}"
        else:
            # Standard mode - use proper namespace format
            namespaced_name = create_namespaced_name(namespace, original_name)
        
        return {
            "name": namespaced_name,
            "description": tool.get("description", ""),
            "inputSchema": tool.get("inputSchema", {})
        }
    
    
    async def _execute_tool_on_server(self, server_name: str, tool_name: str, arguments: Dict[str, Any]) -> Any:
        """Execute tool on specific server"""
        # Find server by name
        server = next((s for s in self.transport.project_servers if s.name == server_name), None)
        if not server:
            raise Exception(f"Server not found: {server_name}")
        
        # Build server config
        server_config = self.transport._build_server_config_for_server(server)
        if not server_config:
            raise Exception(f"Failed to build config for server: {server_name}")
        
        # Execute tool
        result = await mcp_connection_service.call_tool(
            str(server.id),
            server_config,
            tool_name,
            arguments,
            str(self.transport.project_id)
        )
        
        return result
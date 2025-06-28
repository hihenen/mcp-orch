"""
MCP Tool Executor

Responsible for executing tools on MCP servers:
- Tool execution and orchestration
- Tool discovery and management
- Argument validation and processing
- Execution logging and monitoring

Extracted from mcp_connection_service.py to follow Single Responsibility Principle.
"""

import asyncio
import json
import logging
import time
from typing import Dict, List, Optional, Any, Union
from datetime import datetime
from uuid import UUID

# Conditional imports for optional dependencies
try:
    from sqlalchemy.orm import Session
except ImportError:
    Session = Any

from .interfaces import IMcpToolExecutor, ToolExecutionError
from .connection_manager import McpConnectionManager, McpConnection
from .error_handler import McpErrorHandler

try:
    from ...models import ToolCallLog, CallStatus, ServerLog, LogLevel, LogCategory
except ImportError:
    # Fallback for testing environments
    ToolCallLog = Any
    CallStatus = Any
    ServerLog = Any
    LogLevel = Any
    LogCategory = Any


logger = logging.getLogger(__name__)


class McpToolExecutor(IMcpToolExecutor):
    """
    MCP Tool Executor Implementation
    
    Handles tool execution on MCP servers with proper logging and error handling.
    """
    
    def __init__(
        self,
        connection_manager: Optional[McpConnectionManager] = None,
        error_handler: Optional[McpErrorHandler] = None
    ):
        self.connection_manager = connection_manager or McpConnectionManager()
        self.error_handler = error_handler or McpErrorHandler()
    
    async def execute_tool(
        self,
        connection: McpConnection,
        tool_name: str,
        arguments: Dict,
        db: Optional[Session] = None,
        project_id: Optional[str] = None,
        server_id: Optional[str] = None
    ) -> Any:
        """
        Execute a tool on MCP server
        
        Args:
            connection: Active MCP connection
            tool_name: Name of tool to execute
            arguments: Tool arguments
            db: Database session for logging
            project_id: Project ID for logging
            server_id: Server ID for logging
            
        Returns:
            Any: Tool execution result
            
        Raises:
            ToolExecutionError: If execution fails
        """
        start_time = time.time()
        execution_id = f"{server_id}_{tool_name}_{int(start_time)}"
        
        try:
            logger.info(f"🔧 Executing tool {tool_name} on server {server_id}")
            
            # Validate connection
            if not await self.connection_manager.is_connection_alive(connection):
                raise ToolExecutionError(
                    f"Connection to server {server_id} is not alive",
                    "CONNECTION_DEAD"
                )
            
            # Prepare tool call message
            call_message = {
                "jsonrpc": "2.0",
                "id": int(start_time * 1000),  # Unique ID based on timestamp
                "method": "tools/call",
                "params": {
                    "name": tool_name,
                    "arguments": arguments
                }
            }
            
            # Send message to MCP server
            message_json = json.dumps(call_message) + '\n'
            
            if not connection.process.stdin:
                raise ToolExecutionError(
                    f"No stdin available for server {server_id}",
                    "NO_STDIN"
                )
            
            connection.process.stdin.write(message_json.encode())
            await connection.process.stdin.drain()
            
            logger.debug(f"📤 Sent tool call: {call_message}")
            
            # Read response with timeout
            response = await self._read_tool_response(
                connection, 
                call_message["id"],
                timeout=30
            )
            
            execution_time = time.time() - start_time
            
            # Process response
            if "result" in response:
                logger.info(f"✅ Tool {tool_name} executed successfully in {execution_time:.2f}s")
                
                # Log successful execution
                if db and project_id and server_id:
                    await self._log_tool_execution(
                        db, server_id, project_id, tool_name, arguments,
                        execution_time, True, None, response.get("result")
                    )
                
                return response["result"]
            
            elif "error" in response:
                error_info = response["error"]
                error_message = f"Tool execution failed: {error_info.get('message', 'Unknown error')}"
                
                logger.error(f"❌ Tool {tool_name} failed: {error_message}")
                
                # Log failed execution
                if db and project_id and server_id:
                    await self._log_tool_execution(
                        db, server_id, project_id, tool_name, arguments,
                        execution_time, False, error_message, error_info
                    )
                
                raise ToolExecutionError(
                    error_message,
                    error_info.get("code", "TOOL_EXECUTION_FAILED"),
                    {"original_error": error_info, "tool": tool_name, "arguments": arguments}
                )
            
            else:
                error_message = f"Invalid response from MCP server: {response}"
                logger.error(f"❌ {error_message}")
                
                # Log invalid response
                if db and project_id and server_id:
                    await self._log_tool_execution(
                        db, server_id, project_id, tool_name, arguments,
                        execution_time, False, error_message, response
                    )
                
                raise ToolExecutionError(
                    error_message,
                    "INVALID_RESPONSE",
                    {"response": response, "tool": tool_name}
                )
            
        except ToolExecutionError:
            # Re-raise tool execution errors as-is
            raise
        except Exception as e:
            execution_time = time.time() - start_time
            error_message = f"Unexpected error executing tool {tool_name}: {e}"
            
            logger.error(error_message)
            
            # Log unexpected error
            if db and project_id and server_id:
                await self._log_tool_execution(
                    db, server_id, project_id, tool_name, arguments,
                    execution_time, False, error_message, {"exception": str(e)}
                )
            
            raise ToolExecutionError(
                error_message,
                "UNEXPECTED_ERROR",
                {"exception": str(e), "tool": tool_name, "arguments": arguments}
            )
    
    async def get_available_tools(self, connection: McpConnection) -> List[Dict]:
        """
        Get list of available tools from MCP server
        
        Args:
            connection: Active MCP connection
            
        Returns:
            List[Dict]: List of available tools with their schemas
        """
        try:
            logger.debug(f"🔍 Getting available tools from server {connection.server_id}")
            
            # Validate connection
            if not await self.connection_manager.is_connection_alive(connection):
                logger.warning(f"Connection to {connection.server_id} is not alive")
                return []
            
            # Prepare tools/list message
            tools_message = {
                "jsonrpc": "2.0",
                "id": int(time.time() * 1000),
                "method": "tools/list",
                "params": {}
            }
            
            # Send message
            message_json = json.dumps(tools_message) + '\n'
            
            if not connection.process.stdin:
                logger.warning(f"No stdin available for server {connection.server_id}")
                return []
            
            connection.process.stdin.write(message_json.encode())
            await connection.process.stdin.drain()
            
            logger.debug(f"📤 Sent tools/list request: {tools_message}")
            
            # Read response
            response = await self._read_tool_response(
                connection,
                tools_message["id"],
                timeout=15
            )
            
            if "result" in response:
                tools = response["result"].get("tools", [])
                logger.info(f"📋 Found {len(tools)} tools on server {connection.server_id}")
                return tools
            
            elif "error" in response:
                error_info = response["error"]
                logger.error(f"❌ Failed to get tools: {error_info}")
                return []
            
            else:
                logger.warning(f"⚠️ Invalid tools/list response: {response}")
                return []
            
        except Exception as e:
            logger.error(f"Error getting tools from server {connection.server_id}: {e}")
            return []
    
    def validate_tool_arguments(self, tool_schema: Dict, arguments: Dict) -> bool:
        """
        Validate tool arguments against schema
        
        Args:
            tool_schema: Tool schema definition
            arguments: Arguments to validate
            
        Returns:
            bool: True if arguments are valid
        """
        try:
            # Basic validation - check if required arguments are present
            input_schema = tool_schema.get("inputSchema", {})
            properties = input_schema.get("properties", {})
            required = input_schema.get("required", [])
            
            # Check required arguments
            for req_arg in required:
                if req_arg not in arguments:
                    logger.warning(f"❌ Missing required argument: {req_arg}")
                    return False
            
            # Check argument types (basic validation)
            for arg_name, arg_value in arguments.items():
                if arg_name in properties:
                    expected_type = properties[arg_name].get("type")
                    if expected_type:
                        if not self._validate_argument_type(arg_value, expected_type):
                            logger.warning(f"❌ Invalid type for argument {arg_name}: expected {expected_type}")
                            return False
            
            logger.debug("✅ Tool arguments validation passed")
            return True
            
        except Exception as e:
            logger.error(f"Error validating tool arguments: {e}")
            return False
    
    async def _read_tool_response(
        self,
        connection: McpConnection,
        expected_id: int,
        timeout: int = 30
    ) -> Dict:
        """Read and parse tool response from MCP server"""
        try:
            # Read response with timeout
            response_data = await asyncio.wait_for(
                connection.process.stdout.readline(),
                timeout=timeout
            )
            
            if not response_data:
                raise ToolExecutionError(
                    "No response received from MCP server",
                    "NO_RESPONSE"
                )
            
            # Parse JSON response
            response_text = response_data.decode().strip()
            logger.debug(f"📥 Received response: {response_text}")
            
            response = json.loads(response_text)
            
            # Validate response ID
            if response.get("id") != expected_id:
                logger.warning(f"⚠️ Response ID mismatch: expected {expected_id}, got {response.get('id')}")
            
            return response
            
        except asyncio.TimeoutError:
            raise ToolExecutionError(
                f"Timeout waiting for response from server {connection.server_id}",
                "RESPONSE_TIMEOUT"
            )
        except json.JSONDecodeError as e:
            raise ToolExecutionError(
                f"Invalid JSON response from server {connection.server_id}: {e}",
                "INVALID_JSON"
            )
        except Exception as e:
            raise ToolExecutionError(
                f"Error reading response from server {connection.server_id}: {e}",
                "RESPONSE_ERROR"
            )
    
    def _validate_argument_type(self, value: Any, expected_type: str) -> bool:
        """Basic type validation for tool arguments"""
        type_mapping = {
            "string": str,
            "number": (int, float),
            "integer": int,
            "boolean": bool,
            "array": list,
            "object": dict
        }
        
        expected_python_type = type_mapping.get(expected_type.lower())
        if expected_python_type:
            return isinstance(value, expected_python_type)
        
        return True  # Unknown type, allow it
    
    async def _log_tool_execution(
        self,
        db: Session,
        server_id: str,
        project_id: str,
        tool_name: str,
        arguments: Dict,
        execution_time: float,
        success: bool,
        error_message: Optional[str],
        result_details: Optional[Any]
    ) -> None:
        """Log tool execution to database"""
        try:
            # Create tool call log entry
            log_entry = ToolCallLog(
                server_id=UUID(server_id),
                project_id=UUID(project_id),
                tool_name=tool_name,
                input_data=arguments,
                status=CallStatus.SUCCESS if success else CallStatus.FAILED,
                execution_time=execution_time,
                error_message=error_message,
                output_data=result_details if success else None
            )
            
            db.add(log_entry)
            
            # Also create server log entry
            server_log = ServerLog(
                server_id=UUID(server_id),
                project_id=UUID(project_id),
                level=LogLevel.INFO if success else LogLevel.ERROR,
                category=LogCategory.TOOL_EXECUTION,
                message=f"Tool {tool_name} {'succeeded' if success else 'failed'}",
                details=json.dumps({
                    "tool": tool_name,
                    "execution_time": execution_time,
                    "arguments": arguments,
                    "error": error_message if not success else None
                }),
                source="mcp_tool_executor"
            )
            
            db.add(server_log)
            db.commit()
            
            logger.debug(f"📝 Logged tool execution: {tool_name} ({'success' if success else 'failed'})")
            
        except Exception as e:
            logger.error(f"Failed to log tool execution: {e}")
            db.rollback()
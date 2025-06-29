"""
MCP 서버 연결 관리
실제 MCP 서버 프로세스 연결, 메시지 전달, 응답 처리
"""

import logging
import asyncio
import json
import os
from typing import Dict, Any, Optional, List

from mcp.types import Tool, TextContent

from .common import (
    ServerConfig,
    McpMessage,
    McpResponse,
    McpError,
    DEFAULT_TIMEOUT,
    create_mcp_error_response
)

logger = logging.getLogger(__name__)


class McpServerConnector:
    """MCP 서버 연결 관리"""
    
    def __init__(self):
        self.logger = logger
        self._active_connections = {}  # 활성 연결 캐시
    
    async def forward_message_to_server(
        self, 
        server_config: ServerConfig, 
        message: McpMessage
    ) -> Optional[McpResponse]:
        """실제 MCP 서버로 메시지 전달"""
        try:
            command = server_config.get('command', '')
            args = server_config.get('args', [])
            env = server_config.get('env', {})
            timeout = server_config.get('timeout', DEFAULT_TIMEOUT)
            
            if not command:
                raise McpError("No command specified for MCP server", -32603)
            
            self.logger.info(f"Forwarding message to MCP server: {command}")
            
            # 메시지 타입에 따른 처리
            if message.get("method") == "initialize":
                return await self._handle_initialize_message(server_config, message, timeout)
            else:
                return await self._handle_regular_message(server_config, message, timeout)
                
        except Exception as e:
            self.logger.error(f"Error forwarding message to MCP server: {e}")
            return create_mcp_error_response(
                message.get("id"),
                -32603,
                f"Server communication failed: {str(e)}"
            )
    
    async def _handle_initialize_message(
        self, 
        server_config: ServerConfig, 
        message: McpMessage, 
        timeout: int
    ) -> Optional[McpResponse]:
        """초기화 메시지 처리"""
        try:
            process = await self._start_server_process(server_config)
            
            # 초기화 메시지 전송
            message_json = json.dumps(message) + '\n'
            process.stdin.write(message_json.encode())
            await process.stdin.drain()
            
            # 응답 대기
            response_line = await asyncio.wait_for(
                process.stdout.readline(), 
                timeout=timeout
            )
            
            if response_line:
                response_text = response_line.decode().strip()
                self.logger.info(f"Received initialize response: {response_text}")
                
                try:
                    response_data = json.loads(response_text)
                    return response_data
                except json.JSONDecodeError as e:
                    self.logger.error(f"Invalid JSON in initialize response: {e}")
                    return None
            else:
                self.logger.warning("No initialize response received")
                return None
                
        except asyncio.TimeoutError:
            self.logger.error(f"Initialize timeout after {timeout} seconds")
            return None
        finally:
            # 프로세스 정리
            if 'process' in locals():
                await self._cleanup_process(process)
    
    async def _handle_regular_message(
        self, 
        server_config: ServerConfig, 
        message: McpMessage, 
        timeout: int
    ) -> Optional[McpResponse]:
        """일반 메시지 처리 (초기화 후 메시지 전송)"""
        try:
            process = await self._start_server_process(server_config)
            
            # 먼저 초기화 메시지 전송
            await self._send_initialize_message(process, timeout)
            
            # 실제 메시지 전송
            message_json = json.dumps(message) + '\n'
            self.logger.info(f"Sending message to MCP server: {message}")
            
            process.stdin.write(message_json.encode())
            await process.stdin.drain()
            
            # 응답 대기
            response_line = await asyncio.wait_for(
                process.stdout.readline(), 
                timeout=timeout
            )
            
            if response_line:
                response_text = response_line.decode().strip()
                self.logger.info(f"Received response from MCP server: {response_text}")
                
                try:
                    response_data = json.loads(response_text)
                    return response_data
                except json.JSONDecodeError as e:
                    self.logger.error(f"Invalid JSON response from MCP server: {e}")
                    return None
            else:
                self.logger.warning("No response received from MCP server")
                return None
                
        except asyncio.TimeoutError:
            self.logger.error(f"MCP server response timeout after {timeout} seconds")
            return None
        finally:
            # 프로세스 정리
            if 'process' in locals():
                await self._cleanup_process(process)
    
    async def _start_server_process(self, server_config: ServerConfig):
        """MCP 서버 프로세스 시작"""
        command = server_config['command']
        args = server_config.get('args', [])
        env = server_config.get('env', {})
        
        # 환경변수 설정
        full_env = os.environ.copy()
        full_env.update(env)
        
        self.logger.info(f"Starting MCP server: {command} {' '.join(args)}")
        
        # 프로세스 시작
        process = await asyncio.create_subprocess_exec(
            command, *args,
            stdin=asyncio.subprocess.PIPE,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
            env=full_env
        )
        
        return process
    
    async def _send_initialize_message(self, process, timeout: int):
        """초기화 메시지 전송"""
        init_message = {
            "jsonrpc": "2.0",
            "id": 0,
            "method": "initialize",
            "params": {
                "protocolVersion": "2025-03-26",
                "capabilities": {},
                "clientInfo": {
                    "name": "mcp-orch",
                    "version": "1.0.0"
                }
            }
        }
        
        init_json = json.dumps(init_message) + '\n'
        process.stdin.write(init_json.encode())
        await process.stdin.drain()
        
        # 초기화 응답 읽기 (무시)
        try:
            await asyncio.wait_for(process.stdout.readline(), timeout=10)
        except asyncio.TimeoutError:
            self.logger.warning("Initialize response timeout")
    
    async def _cleanup_process(self, process):
        """프로세스 정리"""
        try:
            if process.stdin and not process.stdin.is_closing():
                process.stdin.close()
                await process.stdin.wait_closed()
            
            # 프로세스 종료 대기 (짧은 타임아웃)
            try:
                await asyncio.wait_for(process.wait(), timeout=5.0)
            except asyncio.TimeoutError:
                # 강제 종료
                self.logger.warning("Force killing MCP server process")
                process.kill()
                await process.wait()
                
        except Exception as cleanup_error:
            self.logger.error(f"Error during MCP server cleanup: {cleanup_error}")
    
    async def test_server_connection(self, server_config: ServerConfig) -> bool:
        """서버 연결 테스트"""
        try:
            test_message = {
                "jsonrpc": "2.0",
                "id": 999,
                "method": "initialize",
                "params": {
                    "protocolVersion": "2025-03-26",
                    "capabilities": {},
                    "clientInfo": {
                        "name": "mcp-orch-test",
                        "version": "1.0.0"
                    }
                }
            }
            
            response = await self.forward_message_to_server(server_config, test_message)
            
            if response and "result" in response:
                self.logger.info("Server connection test successful")
                return True
            else:
                self.logger.warning("Server connection test failed")
                return False
                
        except Exception as e:
            self.logger.error(f"Server connection test error: {e}")
            return False
    
    async def get_server_tools(self, server_config: ServerConfig) -> List[Tool]:
        """서버에서 도구 목록 조회"""
        try:
            tools_message = {
                "jsonrpc": "2.0",
                "id": 1,
                "method": "tools/list",
                "params": {}
            }
            
            response = await self.forward_message_to_server(server_config, tools_message)
            
            if response and "result" in response:
                tools_data = response["result"].get("tools", [])
                tools = []
                
                for tool_data in tools_data:
                    tool = Tool(
                        name=tool_data.get("name", ""),
                        description=tool_data.get("description", ""),
                        inputSchema=tool_data.get("inputSchema")
                    )
                    tools.append(tool)
                
                self.logger.info(f"Retrieved {len(tools)} tools from server")
                return tools
            else:
                self.logger.warning("Failed to retrieve tools from server")
                return []
                
        except Exception as e:
            self.logger.error(f"Error retrieving tools from server: {e}")
            return []
    
    async def call_server_tool(
        self, 
        server_config: ServerConfig, 
        tool_name: str, 
        arguments: Dict[str, Any]
    ) -> List[TextContent]:
        """서버 도구 호출"""
        try:
            tool_call_message = {
                "jsonrpc": "2.0",
                "id": 2,
                "method": "tools/call",
                "params": {
                    "name": tool_name,
                    "arguments": arguments
                }
            }
            
            response = await self.forward_message_to_server(server_config, tool_call_message)
            
            if response and "result" in response:
                content_data = response["result"].get("content", [])
                content = []
                
                for item in content_data:
                    if item.get("type") == "text":
                        content.append(TextContent(
                            type="text",
                            text=item.get("text", "")
                        ))
                
                self.logger.info(f"Tool '{tool_name}' executed successfully")
                return content
            else:
                self.logger.warning(f"Tool '{tool_name}' execution failed")
                return [TextContent(
                    type="text",
                    text=f"Tool execution failed: {response}"
                )]
                
        except Exception as e:
            self.logger.error(f"Error calling server tool '{tool_name}': {e}")
            return [TextContent(
                type="text",
                text=f"Tool execution error: {str(e)}"
            )]
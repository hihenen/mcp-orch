"""
FastMCP 통합
FastMCP 서버 관리 및 도구 통합
"""

import logging
from typing import Dict, Any, Optional, List

try:
    from fastmcp import FastMCP
    FASTMCP_AVAILABLE = True
except ImportError:
    FASTMCP_AVAILABLE = False
    FastMCP = None

from mcp.types import Tool, TextContent

from .common import McpError
from .mcp_tool_manager import McpToolManager

logger = logging.getLogger(__name__)


class FastMcpIntegration:
    """FastMCP 통합"""
    
    def __init__(self):
        self.logger = logger
        self.tool_manager = McpToolManager()
        self._fastmcp_servers = {}  # server_name -> FastMCP instance
        self._available = FASTMCP_AVAILABLE
        
        if not self._available:
            self.logger.warning("FastMCP not available - install fastmcp package for enhanced functionality")
    
    def is_available(self) -> bool:
        """FastMCP 사용 가능 여부 확인"""
        return self._available
    
    def get_or_create_server(self, server_name: str) -> Optional[Any]:
        """FastMCP 서버 가져오기 또는 생성"""
        if not self._available:
            return None
        
        if server_name in self._fastmcp_servers:
            return self._fastmcp_servers[server_name]
        
        try:
            # FastMCP 서버 생성
            fastmcp_server = FastMCP(server_name)
            
            # 하드코딩된 도구들 등록
            self._register_hardcoded_tools(fastmcp_server)
            
            self._fastmcp_servers[server_name] = fastmcp_server
            self.logger.info(f"Created FastMCP server: {server_name}")
            
            return fastmcp_server
            
        except Exception as e:
            self.logger.error(f"Failed to create FastMCP server {server_name}: {e}")
            return None
    
    def _register_hardcoded_tools(self, fastmcp_server):
        """하드코딩된 도구들을 FastMCP 서버에 등록"""
        try:
            # brave_web_search 도구 등록
            @fastmcp_server.tool()
            def brave_web_search(query: str, count: int = 10, offset: int = 0) -> str:
                """Performs a web search using the Brave Search API"""
                return f"Mock web search results for '{query}' (count: {count}, offset: {offset})"
            
            # brave_local_search 도구 등록
            @fastmcp_server.tool()
            def brave_local_search(query: str, count: int = 5) -> str:
                """Searches for local businesses and places using Brave's Local Search API"""
                return f"Mock local search results for '{query}' (count: {count})"
            
            self.logger.info("Registered hardcoded tools to FastMCP server")
            
        except Exception as e:
            self.logger.error(f"Failed to register hardcoded tools: {e}")
    
    async def handle_fastmcp_message(
        self, 
        server_name: str, 
        message: Dict[str, Any]
    ) -> Optional[Dict[str, Any]]:
        """FastMCP 메시지 처리"""
        if not self._available:
            return None
        
        fastmcp_server = self.get_or_create_server(server_name)
        if not fastmcp_server:
            return None
        
        try:
            method = message.get("method")
            message_id = message.get("id")
            
            if method == "tools/list":
                return await self._handle_tools_list(fastmcp_server, message_id)
            elif method == "tools/call":
                params = message.get("params", {})
                return await self._handle_tool_call(fastmcp_server, message_id, params)
            else:
                return None
                
        except Exception as e:
            self.logger.error(f"FastMCP message handling failed: {e}")
            return {
                "jsonrpc": "2.0",
                "id": message.get("id"),
                "error": {
                    "code": -32603,
                    "message": f"FastMCP error: {str(e)}"
                }
            }
    
    async def _handle_tools_list(self, fastmcp_server, message_id: Optional[Any]) -> Dict[str, Any]:
        """FastMCP 도구 목록 처리"""
        try:
            # FastMCP에서 도구 목록 가져오기
            # 실제 구현에서는 fastmcp_server의 도구 목록을 가져와야 함
            tools = self.tool_manager.get_available_tools(use_hardcoded=True)
            
            tools_data = []
            for tool in tools:
                tool_data = {
                    "name": tool.name,
                    "description": tool.description
                }
                
                if hasattr(tool, 'inputSchema') and tool.inputSchema:
                    tool_data["inputSchema"] = tool.inputSchema
                
                tools_data.append(tool_data)
            
            return {
                "jsonrpc": "2.0",
                "id": message_id,
                "result": {
                    "tools": tools_data
                }
            }
            
        except Exception as e:
            self.logger.error(f"FastMCP tools list failed: {e}")
            raise
    
    async def _handle_tool_call(
        self, 
        fastmcp_server, 
        message_id: Optional[Any], 
        params: Dict[str, Any]
    ) -> Dict[str, Any]:
        """FastMCP 도구 호출 처리"""
        try:
            tool_name = params.get("name")
            arguments = params.get("arguments", {})
            
            if not tool_name:
                raise McpError("Missing tool name", -32602)
            
            # 도구 검증
            if not self.tool_manager.validate_tool_exists(tool_name):
                raise McpError(f"Tool '{tool_name}' not found", -32601)
            
            # 인자 검증
            self.tool_manager.validate_tool_arguments(tool_name, arguments)
            
            # 실제로는 FastMCP 서버에서 도구 실행
            # 여기서는 목 응답 생성
            content = self.tool_manager.create_mock_tool_response(tool_name, arguments)
            
            content_data = []
            for item in content:
                content_data.append({
                    "type": item.type,
                    "text": item.text
                })
            
            return {
                "jsonrpc": "2.0",
                "id": message_id,
                "result": {
                    "content": content_data
                }
            }
            
        except McpError:
            raise
        except Exception as e:
            self.logger.error(f"FastMCP tool call failed: {e}")
            raise McpError(f"Tool execution failed: {str(e)}", -32603)
    
    def get_fastmcp_tools(self, server_name: str) -> List[Tool]:
        """FastMCP 서버의 도구 목록 조회"""
        if not self._available:
            return []
        
        fastmcp_server = self.get_or_create_server(server_name)
        if not fastmcp_server:
            return []
        
        try:
            # 실제로는 FastMCP 서버에서 도구 목록을 가져와야 함
            # 여기서는 하드코딩된 도구들을 반환
            return self.tool_manager.get_available_tools(use_hardcoded=True)
            
        except Exception as e:
            self.logger.error(f"Failed to get FastMCP tools: {e}")
            return []
    
    async def call_fastmcp_tool(
        self, 
        server_name: str, 
        tool_name: str, 
        arguments: Dict[str, Any]
    ) -> List[TextContent]:
        """FastMCP 도구 직접 호출"""
        if not self._available:
            raise McpError("FastMCP not available", -32603)
        
        fastmcp_server = self.get_or_create_server(server_name)
        if not fastmcp_server:
            raise McpError("FastMCP server not available", -32603)
        
        try:
            # 실제로는 FastMCP 서버에서 도구 호출
            # 여기서는 목 응답 생성
            content = self.tool_manager.create_mock_tool_response(tool_name, arguments)
            
            self.logger.info(f"FastMCP tool '{tool_name}' executed successfully")
            return content
            
        except Exception as e:
            self.logger.error(f"FastMCP tool call failed: {e}")
            raise McpError(f"Tool execution failed: {str(e)}", -32603)
    
    def cleanup_server(self, server_name: str):
        """FastMCP 서버 정리"""
        if server_name in self._fastmcp_servers:
            try:
                # FastMCP 서버 정리 (실제 구현에서는 서버 종료 로직 필요)
                del self._fastmcp_servers[server_name]
                self.logger.info(f"Cleaned up FastMCP server: {server_name}")
            except Exception as e:
                self.logger.error(f"Failed to cleanup FastMCP server {server_name}: {e}")
    
    def cleanup_all_servers(self):
        """모든 FastMCP 서버 정리"""
        server_names = list(self._fastmcp_servers.keys())
        for server_name in server_names:
            self.cleanup_server(server_name)
    
    def get_server_info(self, server_name: str) -> Optional[Dict[str, Any]]:
        """FastMCP 서버 정보 조회"""
        if server_name not in self._fastmcp_servers:
            return None
        
        try:
            tools = self.get_fastmcp_tools(server_name)
            return {
                "server_name": server_name,
                "available": self._available,
                "tool_count": len(tools),
                "tools": [tool.name for tool in tools]
            }
        except Exception as e:
            self.logger.error(f"Failed to get server info for {server_name}: {e}")
            return None
    
    def get_all_servers_info(self) -> Dict[str, Any]:
        """모든 FastMCP 서버 정보 조회"""
        servers_info = {}
        for server_name in self._fastmcp_servers.keys():
            info = self.get_server_info(server_name)
            if info:
                servers_info[server_name] = info
        
        return {
            "fastmcp_available": self._available,
            "server_count": len(self._fastmcp_servers),
            "servers": servers_info
        }
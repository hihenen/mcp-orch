"""
프록시 핸들러

프록시 모드에서 요청을 처리하고 적절한 MCP 서버로 라우팅
"""

import asyncio
import logging
from typing import Any, Dict, List, Optional

from ..core.registry import ToolRegistry

logger = logging.getLogger(__name__)


class ProxyHandler:
    """
    프록시 핸들러
    
    클라이언트 요청을 받아 적절한 MCP 서버로 전달하고,
    응답을 다시 클라이언트에게 반환합니다.
    """
    
    def __init__(self, tool_registry: ToolRegistry):
        """
        핸들러 초기화
        
        Args:
            tool_registry: 도구 레지스트리
        """
        self.tool_registry = tool_registry
        self._initialized = False
        self._active_requests = {}
        self._request_counter = 0
        self._lock = asyncio.Lock()
        
    async def initialize(self) -> None:
        """핸들러 초기화"""
        logger.info("Initializing ProxyHandler")
        
        # 도구 레지스트리 초기화
        await self.tool_registry.load_configuration()
        await self.tool_registry.connect_servers()
        
        self._initialized = True
        logger.info("ProxyHandler initialized successfully")
        
    async def shutdown(self) -> None:
        """핸들러 종료"""
        logger.info("Shutting down ProxyHandler")
        
        # 활성 요청 대기
        if self._active_requests:
            logger.info(f"Waiting for {len(self._active_requests)} active requests")
            await asyncio.gather(
                *self._active_requests.values(),
                return_exceptions=True
            )
            
        self._initialized = False
        logger.info("ProxyHandler shutdown complete")
        
    async def handle(self, request: Dict[str, Any]) -> Dict[str, Any]:
        """
        요청 처리
        
        Args:
            request: 클라이언트 요청
            
        Returns:
            처리 결과
        """
        if not self._initialized:
            return {
                "error": "ProxyHandler not initialized",
                "status": "error"
            }
            
        request_type = request.get("type")
        
        try:
            if request_type == "list_tools":
                return await self._handle_list_tools(request)
            elif request_type == "call_tool":
                return await self._handle_call_tool(request)
            elif request_type == "list_servers":
                return await self._handle_list_servers(request)
            elif request_type == "server_status":
                return await self._handle_server_status(request)
            else:
                return {
                    "error": f"Unknown request type: {request_type}",
                    "status": "error"
                }
                
        except Exception as e:
            logger.error(f"Error handling request: {e}", exc_info=True)
            return {
                "error": str(e),
                "status": "error"
            }
            
    async def _handle_list_tools(self, request: Dict[str, Any]) -> Dict[str, Any]:
        """도구 목록 조회 처리"""
        server_name = request.get("server_name")
        
        if server_name:
            # 특정 서버의 도구 목록
            tools = self.tool_registry.get_server_tools(server_name)
        else:
            # 모든 도구 목록
            tools = self.tool_registry.get_all_tools()
            
        return {
            "status": "success",
            "tools": [
                {
                    "namespace": tool.namespace,
                    "name": tool.name,
                    "server": tool.server_name,
                    "description": tool.description,
                    "input_schema": tool.input_schema,
                    "output_schema": tool.output_schema
                }
                for tool in tools
            ]
        }
        
    async def _handle_call_tool(self, request: Dict[str, Any]) -> Dict[str, Any]:
        """도구 호출 처리"""
        namespace = request.get("namespace")
        arguments = request.get("arguments", {})
        
        if not namespace:
            return {
                "error": "Tool namespace is required",
                "status": "error"
            }
            
        # 도구 정보 조회
        tool_info = self.tool_registry.get_tool(namespace)
        if not tool_info:
            return {
                "error": f"Tool not found: {namespace}",
                "status": "error"
            }
            
        # 서버 연결 조회
        connection = await self.tool_registry.get_server_connection(tool_info.server_name)
        if not connection:
            return {
                "error": f"Server not connected: {tool_info.server_name}",
                "status": "error"
            }
            
        # 요청 추적
        async with self._lock:
            self._request_counter += 1
            request_id = self._request_counter
            
        try:
            # 비동기 태스크로 도구 호출
            task = asyncio.create_task(
                self._call_tool_async(connection, tool_info.name, arguments)
            )
            self._active_requests[request_id] = task
            
            # 도구 호출 및 결과 대기
            result = await task
            
            # 사용 통계 업데이트
            await self.tool_registry.update_tool_usage(namespace)
            
            return {
                "status": "success",
                "result": result,
                "namespace": namespace,
                "server": tool_info.server_name
            }
            
        except asyncio.TimeoutError:
            return {
                "error": f"Tool call timeout: {namespace}",
                "status": "timeout"
            }
        except Exception as e:
            logger.error(f"Error calling tool {namespace}: {e}", exc_info=True)
            return {
                "error": str(e),
                "status": "error"
            }
        finally:
            # 요청 추적 제거
            async with self._lock:
                self._active_requests.pop(request_id, None)
                
    async def _call_tool_async(self, connection: Any, tool_name: str, arguments: Dict[str, Any]) -> Any:
        """비동기 도구 호출"""
        return await connection.call_tool(tool_name, arguments)
        
    async def _handle_list_servers(self, request: Dict[str, Any]) -> Dict[str, Any]:
        """서버 목록 조회 처리"""
        servers = self.tool_registry.get_servers()
        
        return {
            "status": "success",
            "servers": [
                {
                    "name": server.name,
                    "connected": server.connected,
                    "transport_type": server.transport_type,
                    "tools_count": len(server.tools),
                    "last_connected": server.last_connected.isoformat() if server.last_connected else None,
                    "error": server.error
                }
                for server in servers
            ]
        }
        
    async def _handle_server_status(self, request: Dict[str, Any]) -> Dict[str, Any]:
        """서버 상태 조회 처리"""
        server_name = request.get("server_name")
        
        if not server_name:
            return {
                "error": "Server name is required",
                "status": "error"
            }
            
        server_info = self.tool_registry.get_server(server_name)
        if not server_info:
            return {
                "error": f"Server not found: {server_name}",
                "status": "error"
            }
            
        # 연결 상태 확인
        connection = await self.tool_registry.get_server_connection(server_name)
        is_alive = False
        
        if connection:
            try:
                # 간단한 ping 테스트
                await asyncio.wait_for(
                    connection.list_tools(),
                    timeout=5.0
                )
                is_alive = True
            except:
                is_alive = False
                
        return {
            "status": "success",
            "server": {
                "name": server_info.name,
                "connected": server_info.connected,
                "alive": is_alive,
                "transport_type": server_info.transport_type,
                "command": server_info.command,
                "args": server_info.args,
                "tools": server_info.tools,
                "last_connected": server_info.last_connected.isoformat() if server_info.last_connected else None,
                "error": server_info.error
            }
        }
        
    async def get_status(self) -> Dict[str, Any]:
        """핸들러 상태 조회"""
        stats = self.tool_registry.get_statistics()
        
        return {
            "initialized": self._initialized,
            "active_requests": len(self._active_requests),
            "total_requests": self._request_counter,
            **stats
        }
        
    async def reload_servers(self) -> Dict[str, Any]:
        """서버 설정 리로드"""
        try:
            await self.tool_registry.reload_servers()
            
            return {
                "status": "success",
                "message": "Servers reloaded successfully",
                "servers": len(self.tool_registry.get_servers()),
                "tools": len(self.tool_registry.get_all_tools())
            }
            
        except Exception as e:
            logger.error(f"Error reloading servers: {e}", exc_info=True)
            return {
                "status": "error",
                "error": str(e)
            }

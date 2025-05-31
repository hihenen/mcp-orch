"""
SSE (Server-Sent Events) 지원

MCP 프로토콜을 SSE로 변환하여 제공합니다.
"""

import asyncio
import json
import logging
from typing import AsyncGenerator, Dict, Any, Optional
from datetime import datetime
import uuid

from fastapi import Request
from sse_starlette.sse import EventSourceResponse

logger = logging.getLogger(__name__)


class SSEHandler:
    """SSE 핸들러"""
    
    def __init__(self, proxy_handler):
        self.proxy_handler = proxy_handler
        self.active_connections: Dict[str, Dict[str, Any]] = {}


class ServerSpecificSSEHandler(SSEHandler):
    """서버별 SSE 핸들러"""
    
    def __init__(self, proxy_handler, server_name: str):
        super().__init__(proxy_handler)
        self.server_name = server_name
        
    async def handle_sse_connection(self, request: Request) -> EventSourceResponse:
        """SSE 연결 처리"""
        connection_id = str(uuid.uuid4())
        
        async def event_generator():
            try:
                # MCP 초기화 메시지 전송
                init_message = {
                    "jsonrpc": "2.0",
                    "method": "initialized",
                    "params": {
                        "protocolVersion": "0.1.0",
                        "serverInfo": {
                            "name": f"mcp-orch-{self.server_name}",
                            "version": "0.1.0"
                        },
                        "capabilities": {
                            "tools": {},
                            "resources": {}
                        }
                    }
                }
                yield {
                    "event": "message",
                    "data": json.dumps(init_message)
                }
                
                # 도구 목록 전송
                tools_response = await self.proxy_handler._handle_list_tools({
                    "server_name": self.server_name
                })
                tools = tools_response.get("tools", [])
                
                # MCP 형식으로 변환
                mcp_tools = []
                for tool in tools:
                    # 네임스페이스에서 서버 이름 제거
                    tool_name = tool["namespace"].split(".", 1)[1] if "." in tool["namespace"] else tool["namespace"]
                    mcp_tools.append({
                        "name": tool_name,
                        "description": tool.get("description", ""),
                        "inputSchema": tool.get("input_schema", {})
                    })
                
                # 도구 목록 알림
                tools_notification = {
                    "jsonrpc": "2.0",
                    "method": "tools/list",
                    "params": {
                        "tools": mcp_tools
                    }
                }
                yield {
                    "event": "message",
                    "data": json.dumps(tools_notification)
                }
                
                # 연결 유지
                while True:
                    if await request.is_disconnected():
                        break
                        
                    # 하트비트
                    yield {
                        "event": "heartbeat",
                        "data": json.dumps({
                            "type": "heartbeat",
                            "timestamp": datetime.now().isoformat()
                        })
                    }
                    
                    await asyncio.sleep(30)  # 30초마다 하트비트
                    
            except asyncio.CancelledError:
                logger.info(f"SSE connection {connection_id} cancelled")
            except Exception as e:
                logger.error(f"Error in SSE connection {connection_id}: {e}")
                yield {
                    "event": "error",
                    "data": json.dumps({
                        "type": "error",
                        "error": str(e)
                    })
                }
            finally:
                # 연결 정리
                self.active_connections.pop(connection_id, None)
                logger.info(f"SSE connection {connection_id} closed")
        
        return EventSourceResponse(event_generator())
    
    async def handle_mcp_request(self, request: Dict[str, Any]) -> Dict[str, Any]:
        """MCP 요청 처리 (JSON-RPC 형식)"""
        method = request.get("method")
        params = request.get("params", {})
        request_id = request.get("id")
        
        try:
            if method == "initialize":
                # 초기화 요청
                return {
                    "jsonrpc": "2.0",
                    "id": request_id,
                    "result": {
                        "protocolVersion": "0.1.0",
                        "serverInfo": {
                            "name": "mcp-orch",
                            "version": "0.1.0"
                        },
                        "capabilities": {
                            "tools": {},
                            "resources": {}
                        }
                    }
                }
                
            elif method == "tools/list":
                # 도구 목록 조회 (특정 서버의 도구만)
                tools_response = await self.proxy_handler._handle_list_tools({
                    "server_name": self.server_name
                })
                tools = tools_response.get("tools", [])
                
                # MCP 형식으로 변환 (서버 프리픽스 제거)
                mcp_tools = []
                for tool in tools:
                    # 네임스페이스에서 서버 이름 제거 (예: brave-search.brave_web_search → brave_web_search)
                    tool_name = tool["namespace"].split(".", 1)[1] if "." in tool["namespace"] else tool["namespace"]
                    mcp_tools.append({
                        "name": tool_name,
                        "description": tool.get("description", ""),
                        "inputSchema": tool.get("input_schema", {})
                    })
                
                return {
                    "jsonrpc": "2.0",
                    "id": request_id,
                    "result": {
                        "tools": mcp_tools
                    }
                }
                
            elif method == "tools/call":
                # 도구 호출
                tool_name = params.get("name")
                arguments = params.get("arguments", {})
                
                # 서버 네임스페이스 추가 (예: brave_web_search → brave-search.brave_web_search)
                namespace = f"{self.server_name}.{tool_name}"
                
                # 프록시 핸들러를 통해 도구 호출
                result = await self.proxy_handler._handle_call_tool({
                    "namespace": namespace,
                    "arguments": arguments
                })
                
                if result.get("status") == "success":
                    # 결과를 MCP 형식으로 변환
                    tool_result = result.get("result", {})
                    
                    # MCP 응답 형식
                    return {
                        "jsonrpc": "2.0",
                        "id": request_id,
                        "result": [
                            {
                                "content": [
                                    {
                                        "type": "text",
                                        "text": json.dumps(tool_result)
                                    }
                                ]
                            }
                        ]
                    }
                else:
                    # 오류 응답
                    return {
                        "jsonrpc": "2.0",
                        "id": request_id,
                        "error": {
                            "code": -32603,
                            "message": result.get("error", "Tool call failed")
                        }
                    }
                    
            else:
                # 지원하지 않는 메서드
                return {
                    "jsonrpc": "2.0",
                    "id": request_id,
                    "error": {
                        "code": -32601,
                        "message": f"Method not found: {method}"
                    }
                }
                
        except Exception as e:
            logger.error(f"Error handling MCP request: {e}", exc_info=True)
            return {
                "jsonrpc": "2.0",
                "id": request_id,
                "error": {
                    "code": -32603,
                    "message": str(e)
                }
            }
    
    async def broadcast_event(self, event_type: str, data: Dict[str, Any]) -> None:
        """모든 연결된 클라이언트에 이벤트 브로드캐스트"""
        event_data = {
            "type": event_type,
            "timestamp": datetime.now().isoformat(),
            **data
        }
        
        # 모든 활성 연결에 이벤트 전송
        for connection_id in list(self.active_connections.keys()):
            try:
                # 실제 구현에서는 각 연결의 큐에 이벤트 추가
                logger.debug(f"Broadcasting {event_type} to {connection_id}")
            except Exception as e:
                logger.error(f"Error broadcasting to {connection_id}: {e}")

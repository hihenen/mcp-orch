"""
Cline 호환 SSE 핸들러

Cline이 기대하는 MCP over SSE 프로토콜을 구현합니다.
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


class ClineSSEHandler:
    """Cline 호환 SSE 핸들러"""
    
    def __init__(self, proxy_handler, server_name: str):
        self.proxy_handler = proxy_handler
        self.server_name = server_name
        self.active_connections: Dict[str, Dict[str, Any]] = {}
        self.message_queues: Dict[str, asyncio.Queue] = {}  # 연결별 메시지 큐
        
    async def handle_sse_connection(self, request: Request) -> EventSourceResponse:
        """SSE 연결 처리 (Cline 호환)"""
        connection_id = str(uuid.uuid4())
        
        async def event_generator():
            try:
                # 연결 정보 저장
                self.active_connections[connection_id] = {
                    "connected_at": datetime.now(),
                    "initialized": False
                }
                
                # 메시지 큐 생성
                message_queue = asyncio.Queue()
                self.message_queues[connection_id] = message_queue
                
                logger.info(f"SSE connection established: {connection_id}")
                
                # 연결 성공 이벤트 전송
                yield {
                    "event": "open",
                    "data": json.dumps({"status": "connected"})
                }
                
                # 메인 이벤트 루프
                while True:
                    if await request.is_disconnected():
                        break
                    
                    # 메시지 큐에서 메시지 가져오기 (비블로킹)
                    try:
                        message = await asyncio.wait_for(message_queue.get(), timeout=1.0)
                        yield {
                            "event": "message",
                            "data": json.dumps(message)
                        }
                    except asyncio.TimeoutError:
                        # 타임아웃 시 ping 전송 (연결 유지)
                        yield {
                            "event": "ping",
                            "data": json.dumps({"timestamp": datetime.now().isoformat()})
                        }
                    except Exception as e:
                        logger.error(f"Error in SSE loop (connection {connection_id}): {e}", exc_info=True)
                        yield {
                            "event": "error",
                            "data": json.dumps({
                                "error": str(e)
                            })
                        }
                        await asyncio.sleep(1)
                    
            except Exception as e:
                logger.error(f"Error in SSE connection {connection_id}: {e}", exc_info=True)
                yield {
                    "event": "error",
                    "data": json.dumps({
                        "error": str(e)
                    })
                }
            finally:
                # 연결 정리
                self.active_connections.pop(connection_id, None)
                self.message_queues.pop(connection_id, None)
                logger.info(f"SSE connection {connection_id} closed")
        
        return EventSourceResponse(event_generator())
    
    async def handle_json_rpc_request(self, request: Dict[str, Any], connection_id: Optional[str] = None) -> Dict[str, Any]:
        """JSON-RPC 요청 처리 (POST 엔드포인트용)"""
        method = request.get("method")
        params = request.get("params", {})
        request_id = request.get("id")
        
        try:
            # 응답 생성
            response = None
            
            if method == "initialize":
                # 초기화 요청
                response = {
                    "jsonrpc": "2.0",
                    "id": request_id,
                    "result": {
                        "protocolVersion": "0.1.0",
                        "serverInfo": {
                            "name": f"mcp-orch-{self.server_name}",
                            "version": "0.1.0"
                        },
                        "capabilities": {
                            "tools": {
                                "listChanged": True
                            },
                            "resources": {}
                        }
                    }
                }
                
            elif method == "tools/list":
                # 도구 목록 조회
                tools_response = await self.proxy_handler._handle_list_tools({
                    "server_name": self.server_name
                })
                tools = tools_response.get("tools", [])
                
                # MCP 형식으로 변환
                mcp_tools = []
                for tool in tools:
                    tool_name = tool["namespace"].split(".", 1)[1] if "." in tool["namespace"] else tool["namespace"]
                    mcp_tools.append({
                        "name": tool_name,
                        "description": tool.get("description", ""),
                        "inputSchema": tool.get("input_schema", {})
                    })
                
                response = {
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
                
                # 서버 네임스페이스 추가
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
                    response = {
                        "jsonrpc": "2.0",
                        "id": request_id,
                        "result": {
                            "content": [
                                {
                                    "type": "text",
                                    "text": json.dumps(tool_result) if isinstance(tool_result, dict) else str(tool_result)
                                }
                            ]
                        }
                    }
                else:
                    # 오류 응답
                    response = {
                        "jsonrpc": "2.0",
                        "id": request_id,
                        "error": {
                            "code": -32603,
                            "message": result.get("error", "Tool call failed")
                        }
                    }
                    
            else:
                # 지원하지 않는 메서드
                response = {
                    "jsonrpc": "2.0",
                    "id": request_id,
                    "error": {
                        "code": -32601,
                        "message": f"Method not found: {method}"
                    }
                }
            
            # connection_id가 제공되면 SSE 큐로 전송
            if connection_id and connection_id in self.message_queues:
                await self.message_queues[connection_id].put(response)
                # SSE로 전송할 때는 빈 응답 반환
                return {"jsonrpc": "2.0", "id": request_id, "result": "sent via SSE"}
            else:
                # 일반 POST 응답
                return response
                
        except Exception as e:
            logger.error(f"Error handling JSON-RPC request: {e}", exc_info=True)
            error_response = {
                "jsonrpc": "2.0",
                "id": request_id,
                "error": {
                    "code": -32603,
                    "message": str(e)
                }
            }
            
            if connection_id and connection_id in self.message_queues:
                await self.message_queues[connection_id].put(error_response)
                return {"jsonrpc": "2.0", "id": request_id, "result": "error sent via SSE"}
            else:
                return error_response

"""
MCP Proxy 모드 구현

mcp-proxy와 동일한 방식으로 작동하는 SSE 서버를 구현합니다.
MCP Python SDK의 SseServerTransport를 사용하여 Cline과 완벽히 호환됩니다.
"""

import asyncio
import json
import logging
from typing import Dict, Any, Optional
from contextlib import AsyncExitStack

from fastapi import FastAPI
from starlette.applications import Starlette
from starlette.middleware import Middleware
from starlette.middleware.cors import CORSMiddleware
from starlette.routing import Mount, Route
from starlette.responses import JSONResponse
from starlette.requests import Request

from mcp.server import Server as MCPServer
from mcp.server.sse import SseServerTransport
from mcp.types import (
    InitializeRequest, InitializeResult,
    ListToolsRequest, ListToolsResult, 
    CallToolRequest, CallToolResult,
    Tool, TextContent
)

from ..proxy.handler import ProxyHandler

logger = logging.getLogger(__name__)


class MCPProxyServer:
    """MCP Proxy 스타일 서버"""
    
    def __init__(self, server_name: str, proxy_handler: ProxyHandler):
        self.server_name = server_name
        self.proxy_handler = proxy_handler
        self.mcp_server = MCPServer(name=f"mcp-orch-{server_name}")
        
        # 핸들러 등록
        self._register_handlers()
        
    def _register_handlers(self):
        """MCP 핸들러 등록"""
        
        @self.mcp_server.list_tools()
        async def list_tools() -> list[Tool]:
            """도구 목록 반환"""
            result = await self.proxy_handler._handle_list_tools({
                "server_name": self.server_name
            })
            
            tools = []
            for tool in result.get("tools", []):
                # 네임스페이스에서 도구 이름 추출
                tool_name = tool["namespace"].split(".", 1)[1] if "." in tool["namespace"] else tool["namespace"]
                
                tools.append(Tool(
                    name=tool_name,
                    description=tool.get("description", ""),
                    inputSchema=tool.get("input_schema", {})
                ))
            
            return tools
        
        @self.mcp_server.call_tool()
        async def call_tool(name: str, arguments: Dict[str, Any]) -> list[TextContent]:
            """도구 호출"""
            namespace = f"{self.server_name}.{name}"
            
            result = await self.proxy_handler._handle_call_tool({
                "namespace": namespace,
                "arguments": arguments
            })
            
            if result.get("status") == "success":
                tool_result = result.get("result", {})
                text = json.dumps(tool_result) if isinstance(tool_result, dict) else str(tool_result)
                return [TextContent(type="text", text=text)]
            else:
                error = result.get("error", "Tool call failed")
                return [TextContent(type="text", text=f"Error: {error}")]


async def create_mcp_proxy_app(
    proxy_handler: ProxyHandler,
    port: int = 8000,
    host: str = "127.0.0.1",
    allow_origins: Optional[list[str]] = None
) -> Starlette:
    """MCP Proxy 스타일 앱 생성"""
    
    # 전역 상태
    status_info = {
        "servers": {},
        "last_activity": None
    }
    
    # 상태 엔드포인트
    async def get_status(request: Request):
        return JSONResponse(status_info)
    
    # API 엔드포인트들
    async def get_servers(request: Request):
        """서버 목록 반환"""
        servers_response = await proxy_handler._handle_list_servers({})
        return JSONResponse(servers_response.get("servers", []))
    
    async def get_tools(request: Request):
        """도구 목록 반환"""
        tools_response = await proxy_handler._handle_list_tools({})
        return JSONResponse(tools_response.get("tools", []))
    
    async def get_server_tools(request: Request):
        """특정 서버의 도구 목록 반환"""
        server_name = request.path_params["server_name"]
        tools_response = await proxy_handler._handle_list_tools({"server_name": server_name})
        return JSONResponse(tools_response.get("tools", []))
    
    # 라우트 목록
    routes = [
        Route("/status", endpoint=get_status),
        Route("/servers", endpoint=get_servers),
        Route("/tools", endpoint=get_tools),
        Route("/tools/{server_name}", endpoint=get_server_tools)
    ]
    
    # 서버별 SSE 엔드포인트 생성
    servers_response = await proxy_handler._handle_list_servers({})
    servers = servers_response.get("servers", [])
    
    def create_server_routes(server_name: str, mcp_proxy: MCPProxyServer):
        """서버별 독립적인 라우트 생성 (mcp-proxy와 동일한 구조)"""
        # 각 서버별로 독립적인 SSE 트랜스포트 생성
        # "/messages/"로 시작해야 root_path와 올바르게 연결됨
        sse_transport = SseServerTransport("/messages/")
        
        # SSE 핸들러 생성 (클로저 문제 해결)
        async def handle_sse(request: Request):
            async with sse_transport.connect_sse(
                request.scope,
                request.receive,
                request._send
            ) as (read_stream, write_stream):
                await mcp_proxy.mcp_server.run(
                    read_stream,
                    write_stream,
                    mcp_proxy.mcp_server.create_initialization_options()
                )
        
        # mcp-proxy와 동일한 라우트 구조
        return [
            Route("/sse", endpoint=handle_sse),
            Mount("/messages/", app=sse_transport.handle_post_message),
        ]
    
    for server_info in servers:
        server_name = server_info["name"]
        
        # MCP 서버 인스턴스 생성
        mcp_proxy = MCPProxyServer(server_name, proxy_handler)
        
        # 서버별 라우트 생성
        server_routes = create_server_routes(server_name, mcp_proxy)
        
        # 서버별 마운트 추가
        routes.append(
            Mount(f"/servers/{server_name}", routes=server_routes)
        )
        
        status_info["servers"][server_name] = "ready"
        logger.info(f"Mounted server: {server_name} at /servers/{server_name}/sse")
    
    # 미들웨어 설정
    middleware = []
    if allow_origins:
        middleware.append(
            Middleware(
                CORSMiddleware,
                allow_origins=allow_origins,
                allow_methods=["*"],
                allow_headers=["*"],
            )
        )
    
    # Starlette 앱 생성
    app = Starlette(
        routes=routes,
        middleware=middleware
    )
    
    return app


async def run_mcp_proxy_mode(
    settings,
    host: str = "127.0.0.1", 
    port: int = 8000
):
    """MCP Proxy 모드 실행"""
    import uvicorn
    from ..core.controller import DualModeController
    
    # 컨트롤러 초기화
    controller = DualModeController(settings)
    await controller.initialize()
    
    # Proxy 핸들러 가져오기
    proxy_handler = controller._proxy_handler
    
    # 앱 생성
    app = await create_mcp_proxy_app(
        proxy_handler,
        port=port,
        host=host,
        allow_origins=["*"]  # 개발용
    )
    
    # 서버 URL 출력
    logger.info("MCP Proxy Mode - Serving SSE endpoints:")
    servers_response = await proxy_handler._handle_list_servers({})
    for server in servers_response.get("servers", []):
        logger.info(f"  - http://{host}:{port}/servers/{server['name']}/sse")
    
    # 서버 실행
    config = uvicorn.Config(
        app,
        host=host,
        port=port,
        log_level="info"
    )
    server = uvicorn.Server(config)
    
    try:
        await server.serve()
    finally:
        await controller.shutdown()

"""
MCP SDK 표준 SSE 서버 구현

MCP SDK의 Server와 SseServerTransport를 사용하여 
Cline과 호환되는 표준 SSE 서버를 구현합니다.
"""

import asyncio
import logging
from typing import Dict, Any, Optional
from contextlib import AsyncExitStack

from mcp import server, types
from mcp.server import Server as MCPServer
from mcp.server.sse import SseServerTransport
from mcp.server.streamable_http_manager import StreamableHTTPSessionManager
from mcp.client.session import ClientSession
from mcp.client.stdio import stdio_client, StdioServerParameters
from starlette.applications import Starlette
from starlette.routing import Route, Mount
from starlette.middleware import Middleware
from starlette.middleware.cors import CORSMiddleware
import uvicorn

from ..proxy.handler import ProxyHandler
from ..core.registry import ToolRegistry

logger = logging.getLogger(__name__)


class MCPStandardSSEServer:
    """MCP SDK 표준 SSE 서버"""
    
    def __init__(self, registry: ToolRegistry, config: Dict[str, Any]):
        self.registry = registry
        self.config = config
        self.servers: Dict[str, MCPServer] = {}
        self.exit_stack: Optional[AsyncExitStack] = None
        
    async def create_proxy_server(self, session: ClientSession, server_name: str) -> MCPServer:
        """프록시 서버 생성 (mcp-proxy 방식)"""
        # 초기화 요청
        response = await session.initialize()
        capabilities = response.capabilities
        
        # MCP 서버 인스턴스 생성
        app = MCPServer(name=f"mcp-orch-{server_name}")
        app.capabilities = capabilities
        
        # 도구 핸들러 등록
        if capabilities.tools:
            async def list_tools(_: Any) -> types.ServerResult:
                result = await session.list_tools()
                return types.ServerResult(result)
            
            app.request_handlers[types.ListToolsRequest] = list_tools
            
            async def call_tool(req: types.CallToolRequest) -> types.ServerResult:
                try:
                    result = await session.call_tool(
                        req.params.name,
                        req.params.arguments or {}
                    )
                    return types.ServerResult(result)
                except Exception as e:
                    return types.ServerResult(
                        types.CallToolResult(
                            content=[types.TextContent(type="text", text=str(e))],
                            isError=True
                        )
                    )
            
            app.request_handlers[types.CallToolRequest] = call_tool
        
        # 리소스 핸들러 등록
        if capabilities.resources:
            async def list_resources(_: Any) -> types.ServerResult:
                result = await session.list_resources()
                return types.ServerResult(result)
            
            app.request_handlers[types.ListResourcesRequest] = list_resources
            
            async def read_resource(req: types.ReadResourceRequest) -> types.ServerResult:
                result = await session.read_resource(req.params.uri)
                return types.ServerResult(result)
            
            app.request_handlers[types.ReadResourceRequest] = read_resource
        
        # 프롬프트 핸들러 등록
        if capabilities.prompts:
            async def list_prompts(_: Any) -> types.ServerResult:
                result = await session.list_prompts()
                return types.ServerResult(result)
            
            app.request_handlers[types.ListPromptsRequest] = list_prompts
            
            async def get_prompt(req: types.GetPromptRequest) -> types.ServerResult:
                result = await session.get_prompt(req.params.name, req.params.arguments)
                return types.ServerResult(result)
            
            app.request_handlers[types.GetPromptRequest] = get_prompt
        
        return app
    
    def create_server_routes(self, mcp_server: MCPServer, server_name: str, stateless: bool = False) -> tuple:
        """서버별 라우트 생성"""
        # SSE 전송 계층 생성 - 기본 메시지 경로 사용
        sse_transport = SseServerTransport("/messages/")
        
        # StreamableHTTP 세션 매니저
        http_session_manager = StreamableHTTPSessionManager(
            app=mcp_server,
            event_store=None,
            json_response=True,
            stateless=stateless
        )
        
        async def handle_sse(request):
            """SSE 연결 처리"""
            async with sse_transport.connect_sse(
                request.scope,
                request.receive,
                request._send
            ) as (read_stream, write_stream):
                await mcp_server.run(
                    read_stream,
                    write_stream,
                    mcp_server.create_initialization_options()
                )
        
        async def handle_streamable_http(scope, receive, send):
            """StreamableHTTP 처리"""
            await http_session_manager.handle_request(scope, receive, send)
        
        # 라우트 정의
        routes = [
            Mount("/mcp", app=handle_streamable_http),
            Route("/sse", endpoint=handle_sse),
            Mount("/messages/", app=sse_transport.handle_post_message),
        ]
        
        return routes, http_session_manager
    
    async def start(self, host: str = "0.0.0.0", port: int = 8080, server_name: Optional[str] = None):
        """SSE 서버 시작 (단일 서버 모드)"""
        self.exit_stack = AsyncExitStack()
        all_routes = []
        
        try:
            # 서버 이름 결정
            if server_name is None:
                # 첫 번째 서버를 기본으로 사용
                server_name = list(self.config.keys())[0]
            
            if server_name not in self.config:
                raise ValueError(f"Server '{server_name}' not found in config")
            
            server_config = self.config[server_name]
            logger.info(f"Setting up SSE server for: {server_name}")
            
            # stdio 클라이언트 파라미터 생성
            params = StdioServerParameters(
                command=server_config["command"],
                args=server_config.get("args", []),
                env=server_config.get("env", {})
            )
            
            # stdio 클라이언트 연결
            stdio_streams = await self.exit_stack.enter_async_context(
                stdio_client(params)
            )
            
            # 클라이언트 세션 생성
            session = await self.exit_stack.enter_async_context(
                ClientSession(*stdio_streams)
            )
            
            # 프록시 서버 생성
            proxy_server = await self.create_proxy_server(session, server_name)
            self.servers[server_name] = proxy_server
            
            # 라우트 생성 (루트 경로에 배치)
            routes, http_manager = self.create_server_routes(proxy_server, server_name)
            await self.exit_stack.enter_async_context(http_manager.run())
            
            # 루트 경로에 라우트 추가 (mcp-proxy 방식)
            all_routes.extend(routes)
            
            # /sse/{server_name} 경로도 추가 (Cline 호환성)
            for route in routes:
                if hasattr(route, 'path') and route.path == "/sse":
                    all_routes.append(
                        Route(f"/sse/{server_name}", endpoint=route.endpoint)
                    )
            
            logger.info(f"SSE server ready at: http://{host}:{port}/sse")
            logger.info(f"Also available at: http://{host}:{port}/sse/{server_name}")
            
            # 기본 서버가 있으면 루트에도 마운트
            if "default" in self.config:
                default_server = self.servers["default"]
                default_routes, default_manager = self.create_server_routes(default_server, "default")
                await self.exit_stack.enter_async_context(default_manager.run())
                http_managers.append(default_manager)
                all_routes.extend(default_routes)
                logger.info(f"Default SSE server ready at: http://{host}:{port}/sse")
            
            # CORS 미들웨어
            middleware = [
                Middleware(
                    CORSMiddleware,
                    allow_origins=["*"],
                    allow_methods=["*"],
                    allow_headers=["*"]
                )
            ]
            
            # Starlette 앱 생성
            app = Starlette(
                debug=True,
                routes=all_routes,
                middleware=middleware
            )
            
            # Uvicorn 서버 실행
            config = uvicorn.Config(
                app,
                host=host,
                port=port,
                log_level="info"
            )
            server = uvicorn.Server(config)
            
            logger.info(f"MCP SSE Server running on http://{host}:{port}")
            await server.serve()
            
        finally:
            if self.exit_stack:
                await self.exit_stack.aclose()


async def create_mcp_sse_server(config_path: str = "mcp-config.json") -> MCPStandardSSEServer:
    """MCP SSE 서버 생성"""
    import json
    
    # 설정 파일 로드
    with open(config_path, "r") as f:
        config_data = json.load(f)
    
    servers_config = config_data.get("mcpServers", {})
    
    # 레지스트리 생성 (필요시)
    registry = ToolRegistry(config_path)
    
    # SSE 서버 생성
    sse_server = MCPStandardSSEServer(registry, servers_config)
    
    return sse_server


# CLI 엔트리포인트
if __name__ == "__main__":
    import sys
    
    async def main():
        # 설정 파일 경로
        config_path = sys.argv[1] if len(sys.argv) > 1 else "mcp-config.json"
        
        # SSE 서버 생성 및 실행
        server = await create_mcp_sse_server(config_path)
        await server.start(host="0.0.0.0", port=8080)
    
    asyncio.run(main())

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
    
    # 도구 실행 엔드포인트
    async def execute_tool(request: Request):
        """도구 실행"""
        server_name = request.path_params["server_name"]
        tool_name = request.path_params["tool_name"]
        
        try:
            body = await request.json()
            arguments = body.get("arguments", {})
            
            namespace = f"{server_name}.{tool_name}"
            result = await proxy_handler._handle_call_tool({
                "namespace": namespace,
                "arguments": arguments
            })
            
            return JSONResponse(result)
        except Exception as e:
            return JSONResponse({"error": str(e), "status": "error"}, status_code=500)
    
    # 실행 히스토리 저장소 (임시)
    execution_history = []
    
    # 실행 히스토리 엔드포인트
    async def get_executions(request: Request):
        """실행 히스토리 조회"""
        # 쿼리 파라미터 처리
        limit = int(request.query_params.get("limit", 100))
        server_id = request.query_params.get("server_id")
        
        filtered = execution_history
        if server_id:
            filtered = [e for e in filtered if e.get("serverId") == server_id]
        
        # 최신순 정렬 및 제한
        filtered.sort(key=lambda x: x.get("startTime", ""), reverse=True)
        filtered = filtered[:limit]
        
        # 샘플 데이터 추가 (비어있을 경우)
        if len(filtered) == 0 and not server_id:
            import uuid
            from datetime import datetime, timedelta
            import random
            
            sample_tools = [
                ("brave-search", "brave_web_search", "Search the web"),
                ("excel-mcp-server", "excel_read_sheet", "Read Excel sheet")
            ]
            
            now = datetime.now()
            for i in range(3):
                server, tool, tool_display = random.choice(sample_tools)
                start_time = now - timedelta(hours=i*2, minutes=random.randint(0, 59))
                duration = random.randint(500, 5000)
                status = random.choice(["completed", "completed", "failed"])
                
                execution = {
                    "id": str(uuid.uuid4()),
                    "serverId": server,
                    "toolId": f"{server}.{tool}",
                    "toolName": tool_display,
                    "status": status,
                    "startTime": start_time.isoformat(),
                    "endTime": (start_time + timedelta(milliseconds=duration)).isoformat(),
                    "duration": duration,
                    "parameters": {"query": f"Sample query {i+1}"},
                    "result": {"success": True, "data": f"Sample result"} if status == "completed" else None,
                    "error": "Connection timeout" if status == "failed" else None
                }
                filtered.append(execution)
        
        return JSONResponse(filtered)
    
    async def create_execution(request: Request):
        """실행 기록 생성"""
        try:
            execution = await request.json()
            execution_history.insert(0, execution)
            
            # 최대 1000개 유지
            if len(execution_history) > 1000:
                execution_history.pop()
            
            return JSONResponse(execution)
        except Exception as e:
            return JSONResponse({"error": str(e)}, status_code=500)
    
    async def update_execution(request: Request):
        """실행 상태 업데이트"""
        execution_id = request.path_params["execution_id"]
        
        try:
            updates = await request.json()
            
            # 실행 찾기
            execution = next((e for e in execution_history if e["id"] == execution_id), None)
            if not execution:
                return JSONResponse({"error": "Execution not found"}, status_code=404)
            
            # 업데이트 적용
            execution.update(updates)
            
            # 종료 시간 및 duration 계산
            if updates.get("status") in ["completed", "failed"] and "endTime" not in execution:
                from datetime import datetime
                execution["endTime"] = datetime.now().isoformat()
                
                if "startTime" in execution:
                    start = datetime.fromisoformat(execution["startTime"].replace("Z", "+00:00"))
                    end = datetime.fromisoformat(execution["endTime"].replace("Z", "+00:00"))
                    execution["duration"] = int((end - start).total_seconds() * 1000)
            
            return JSONResponse(execution)
        except Exception as e:
            return JSONResponse({"error": str(e)}, status_code=500)
    
    # 라우트 목록
    routes = [
        Route("/status", endpoint=get_status),
        Route("/servers", endpoint=get_servers),
        Route("/tools", endpoint=get_tools),
        Route("/tools/{server_name}", endpoint=get_server_tools),
        Route("/tools/{server_name}/{tool_name}", endpoint=execute_tool, methods=["POST"]),
        Route("/api/executions", endpoint=get_executions),
        Route("/api/executions", endpoint=create_execution, methods=["POST"]),
        Route("/api/executions/{execution_id}", endpoint=update_execution, methods=["PATCH"])
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

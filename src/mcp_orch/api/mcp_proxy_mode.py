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
from uuid import UUID


from fastapi import FastAPI
from starlette.applications import Starlette
from starlette.middleware import Middleware
from starlette.middleware.cors import CORSMiddleware
from starlette.routing import Mount, Route
import json
from uuid import UUID
from starlette.responses import JSONResponse as StarletteJSONResponse

JSONResponse = StarletteJSONResponse
from starlette.requests import Request
from starlette.middleware.base import BaseHTTPMiddleware

from .jwt_auth import JWTAuthMiddleware

from mcp.server import Server as MCPServer
from mcp.server.sse import SseServerTransport
from mcp.types import (
    InitializeRequest, InitializeResult,
    ListToolsRequest, ListToolsResult, 
    CallToolRequest, CallToolResult,
    Tool, TextContent
)

from ..proxy.handler import ProxyHandler
from .users import router as users_router

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
    settings=None,
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
    
    # Configuration 관련 엔드포인트
    async def get_config(request: Request):
        """설정 파일 조회"""
        import json
        from pathlib import Path
        
        config_path = Path("mcp-config.json")
        if not config_path.exists():
            return JSONResponse({"error": "Configuration file not found"}, status_code=404)
        
        try:
            with open(config_path, "r", encoding="utf-8") as f:
                config = json.load(f)
            return JSONResponse(config)
        except Exception as e:
            return JSONResponse({"error": f"Failed to read configuration: {str(e)}"}, status_code=500)
    
    async def update_config(request: Request):
        """설정 파일 업데이트"""
        import json
        from pathlib import Path
        
        config_path = Path("mcp-config.json")
        
        try:
            # Content-Type 확인
            content_type = request.headers.get("content-type", "")
            if "application/json" not in content_type:
                logger.warning(f"Invalid Content-Type: {content_type}")
            
            # Request body 읽기
            body = await request.body()
            logger.info(f"Received body: {body[:200]}...")  # 처음 200자만 로깅
            
            try:
                config = json.loads(body)
            except json.JSONDecodeError as e:
                logger.error(f"JSON decode error: {e}")
                return JSONResponse({"error": f"Invalid JSON: {str(e)}"}, status_code=400)
            
            # 설정 검증 - mcpServers 또는 servers 키 모두 지원
            if "servers" not in config and "mcpServers" not in config:
                return JSONResponse({"error": "Invalid configuration: 'servers' or 'mcpServers' field is required"}, status_code=400)
            
            # mcpServers를 servers로 정규화 (필요한 경우)
            if "mcpServers" in config and "servers" not in config:
                config["servers"] = config["mcpServers"]
                del config["mcpServers"]
            
            # 백업 생성
            if config_path.exists():
                backup_path = config_path.with_suffix(".json.backup")
                try:
                    import shutil
                    shutil.copy2(config_path, backup_path)
                except Exception as e:
                    logger.warning(f"Failed to create backup: {e}")
            
            # 설정 저장
            with open(config_path, "w", encoding="utf-8") as f:
                json.dump(config, f, indent=2, ensure_ascii=False)
            
            return JSONResponse({"status": "success", "message": "Configuration updated successfully"})
        except Exception as e:
            return JSONResponse({"error": f"Failed to save configuration: {str(e)}"}, status_code=500)
    
    async def reload_config(request: Request):
        """설정 재로드"""
        try:
            # 프록시 핸들러의 설정 재로드
            await proxy_handler.reload_configuration()
            
            return JSONResponse({
                "status": "success",
                "message": "Configuration reloaded successfully",
                "servers": []
            })
        except Exception as e:
            return JSONResponse({"error": f"Failed to reload configuration: {str(e)}"}, status_code=500)
    
    async def validate_config(request: Request):
        """설정 검증"""
        try:
            config = await request.json()
            errors = []
            warnings = []
            
            # 필수 필드 검증 - mcpServers 또는 servers 키 모두 지원
            servers_key = "servers" if "servers" in config else "mcpServers" if "mcpServers" in config else None
            
            if servers_key is None:
                errors.append("Missing required field: 'servers' or 'mcpServers'")
            elif not isinstance(config[servers_key], dict):
                errors.append(f"'{servers_key}' must be an object")
            else:
                # 각 서버 설정 검증
                for server_name, server_config in config[servers_key].items():
                    if "command" not in server_config:
                        errors.append(f"Server '{server_name}': missing required field 'command'")
                    
                    if "args" in server_config and not isinstance(server_config["args"], list):
                        errors.append(f"Server '{server_name}': 'args' must be an array")
                    
                    if "env" in server_config and not isinstance(server_config["env"], dict):
                        errors.append(f"Server '{server_name}': 'env' must be an object")
            
            # 선택적 필드 검증
            if "mode" in config and config["mode"] not in ["proxy", "batch"]:
                warnings.append("'mode' should be either 'proxy' or 'batch'")
            
            return JSONResponse({
                "valid": len(errors) == 0,
                "errors": errors,
                "warnings": warnings
            })
        except Exception as e:
            return JSONResponse({"error": f"Failed to validate configuration: {str(e)}"}, status_code=500)
    
    # 서버 제어 엔드포인트
    async def restart_server(request: Request):
        """서버 재시작"""
        server_name = request.path_params["server_name"]
        
        try:
            # 현재는 전체 서버를 재로드하는 방식으로 구현
            # 개별 서버 재시작은 추후 구현 예정
            await proxy_handler.reload_configuration()
            
            return JSONResponse({
                "status": "success",
                "message": f"Server '{server_name}' restarted successfully"
            })
        except Exception as e:
            import traceback
            tb = traceback.format_exc()
            return JSONResponse({"error": str(e), "traceback": tb}, status_code=500)
    
    async def toggle_server(request: Request):
        """서버 활성화/비활성화 토글"""
        from pathlib import Path
        
        server_name = request.path_params["server_name"]
        
        try:
            # 현재 설정 읽기
            config_path = Path("mcp-config.json")
            with open(config_path, "r", encoding="utf-8") as f:
                config = json.load(f)
            
            # servers 또는 mcpServers 키 찾기
            servers_key = "servers" if "servers" in config else "mcpServers" if "mcpServers" in config else None
            if not servers_key or server_name not in config[servers_key]:
                return JSONResponse({"error": f"Server '{server_name}' not found"}, status_code=404)
            
            # disabled 상태 토글
            current_disabled = config[servers_key][server_name].get("disabled", False)
            config[servers_key][server_name]["disabled"] = not current_disabled

            # 설정 저장
            with open(config_path, "w", encoding="utf-8") as f:
                json.dump(config, f, indent=2, ensure_ascii=False)

            # 서버 재로드
            await proxy_handler.reload_configuration()

            return JSONResponse({
                "status": "success",
                "message": f"Server '{server_name}' {'disabled' if not current_disabled else 'enabled'} successfully",
                "disabled": not current_disabled
            })
        except Exception as e:
            import traceback
            tb = traceback.format_exc()
            return JSONResponse({"error": str(e), "traceback": tb}, status_code=500)
    
    # 사용자 관리 엔드포인트 추가
    async def signup_user(request: Request):
        """사용자 회원가입"""
        try:
            from .users import SignupRequest, SignupResponse, UserResponse, OrganizationResponse, OrganizationMemberResponse
            from ..database import get_db
            from ..models.user import User
            from ..models.organization import Organization, OrganizationMember
            from sqlalchemy.exc import IntegrityError
            import bcrypt
            
            # 요청 데이터 파싱
            body = await request.json()
            signup_request = SignupRequest(**body)

            # 데이터베이스 세션 생성
            db = next(get_db())

            try:
                # 입력 검증
                if len(signup_request.password) < 8:
                    return JSONResponse(
                        {"error": "비밀번호는 최소 8자 이상이어야 합니다."},
                        status_code=400
                    )

                # 이메일 중복 확인
                existing_user = db.query(User).filter(User.email == signup_request.email).first()
                if existing_user:
                    return JSONResponse(
                        {"error": "이미 사용 중인 이메일입니다."},
                        status_code=400
                    )

                # 비밀번호 해시화
                hashed_password = bcrypt.hashpw(
                    signup_request.password.encode('utf-8'),
                    bcrypt.gensalt()
                ).decode('utf-8')

                # 사용자 생성
                user = User(
                    name=signup_request.name,
                    email=signup_request.email,
                    password=hashed_password
                )
                db.add(user)
                db.flush()  # ID를 얻기 위해 flush

                # 조직 생성
                org_name = signup_request.organization_name or f"{signup_request.name}의 조직"
                org_slug = signup_request.email.split('@')[0] + '-' + str(user.id)[:8]  # UUID의 처음 8자만 사용

                organization = Organization(
                    name=org_name,
                    slug=org_slug
                )
                db.add(organization)
                db.flush()  # ID를 얻기 위해 flush

                # 조직 멤버십 생성 (관리자 권한)
                membership = OrganizationMember(
                    user_id=user.id,
                    organization_id=organization.id,
                    role="admin",
                    is_default=True
                )
                db.add(membership)

                db.commit()

                from fastapi.encoders import jsonable_encoder
                return JSONResponse(
                    jsonable_encoder(
                        SignupResponse(
                            message="회원가입이 완료되었습니다.",
                            user=UserResponse.from_orm(user),
                            organization=OrganizationResponse.from_orm(organization),
                            membership=OrganizationMemberResponse.from_orm(membership)
                        )
                    ),
                    status_code=200
                )

            except IntegrityError:
                db.rollback()
                return JSONResponse(
                    {"error": "이미 사용 중인 이메일입니다."},
                    status_code=400
                )
            except Exception as e:
                db.rollback()
                import traceback
                tb = traceback.format_exc()
                return JSONResponse(
                    {"error": f"서버 오류가 발생했습니다: {str(e)}", "traceback": tb},
                    status_code=500
                )
            finally:
                db.close()

        except Exception as e:
            import traceback
            tb = traceback.format_exc()
            return JSONResponse({"error": str(e), "traceback": tb}, status_code=500)
    
    async def login_user(request: Request):
        """사용자 로그인"""
        try:
            from .users import LoginRequest, LoginResponse, UserResponse, OrganizationResponse, OrganizationMemberResponse
            from ..database import get_db
            from ..models.user import User
            from ..models.organization import Organization, OrganizationMember
            import bcrypt
            
            # 요청 데이터 파싱
            body = await request.json()
            login_request = LoginRequest(**body)

            # 데이터베이스 세션 생성
            db = next(get_db())

            try:
                # 사용자 조회
                user = db.query(User).filter(User.email == login_request.email).first()
                if not user:
                    return JSONResponse(
                        {"error": "이메일 또는 비밀번호가 올바르지 않습니다."},
                        status_code=401
                    )

                # 비밀번호 확인
                if not bcrypt.checkpw(login_request.password.encode('utf-8'), user.password.encode('utf-8')):
                    return JSONResponse(
                        {"error": "이메일 또는 비밀번호가 올바르지 않습니다."},
                        status_code=401
                    )

                # 기본 조직 조회
                membership = db.query(OrganizationMember).filter(
                    OrganizationMember.user_id == user.id,
                    OrganizationMember.is_default == True
                ).first()

                organization = None
                if membership:
                    organization = db.query(Organization).filter(
                        Organization.id == membership.organization_id
                    ).first()

                from fastapi.encoders import jsonable_encoder
                from starlette.responses import JSONResponse as StarletteJSONResponse
                return StarletteJSONResponse(
                    jsonable_encoder(
                        LoginResponse(
                            message="로그인이 완료되었습니다.",
                            user=UserResponse.from_orm(user),
                            organization=OrganizationResponse.from_orm(organization) if organization else None,
                            membership=OrganizationMemberResponse.from_orm(membership) if membership else None
                        )
                    ),
                    status_code=200
                )

            except Exception as e:
                return JSONResponse(
                    {"error": f"서버 오류가 발생했습니다: {str(e)}"},
                    status_code=500
                )
            finally:
                db.close()

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
        Route("/api/executions/{execution_id}", endpoint=update_execution, methods=["PATCH"]),
        # Configuration 엔드포인트
        Route("/api/config", endpoint=get_config),
        Route("/api/config", endpoint=update_config, methods=["PUT"]),
        Route("/api/config/reload", endpoint=reload_config, methods=["POST"]),
        Route("/api/config/validate", endpoint=validate_config, methods=["POST"]),
        # 서버 제어 엔드포인트
        Route("/api/servers/{server_name}/restart", endpoint=restart_server, methods=["POST"]),
        Route("/api/servers/{server_name}/toggle", endpoint=toggle_server, methods=["POST"]),
        # 사용자 관리 엔드포인트
        Route("/api/users/signup", endpoint=signup_user, methods=["POST"]),
        Route("/api/users/login", endpoint=login_user, methods=["POST"])
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
    
    # 인증 미들웨어 추가
    middleware.append(Middleware(JWTAuthMiddleware, settings=settings))
    
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
        settings=settings,
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

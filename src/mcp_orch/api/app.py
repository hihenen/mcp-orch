"""
FastAPI 애플리케이션 팩토리

FastAPI 앱 인스턴스를 생성하고 설정합니다.
"""

import logging
import os
from contextlib import asynccontextmanager
from typing import Any, Dict

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from ..config import Settings
from ..core.controller import DualModeController
from .jwt_auth import JWTAuthMiddleware
from .users import router as users_router
# 기존 모놀리식 teams 라우터 임시 비활성화
# from .teams import router as teams_router

# 새로운 모듈화된 teams 라우터 import
from .teams import router as teams_modular_router
# 기존 모놀리식 프로젝트 라우터 임시 비활성화
# from .projects import router as projects_router

# 새로운 모듈화된 프로젝트 라우터 import
from .projects import router as projects_modular_router
from .project_servers import router as project_servers_router
from .project_activities import router as project_activities_router
from .project_sse import router as project_sse_router
# from .standard_mcp import router as standard_mcp_router  # 제거됨: 사용하지 않는 legacy 라우터
from .mcp_standard_sse import router as mcp_standard_sse_router
from .mcp_sse_transport import router as mcp_sse_transport_router
from .mcp_sdk_sse_bridge import router as mcp_sdk_sse_bridge_router
from .unified_mcp_transport import router as unified_mcp_transport_router
from .fastmcp_impl import router as fastmcp_router
from .mcp.unified.fast_routes import router as fast_unified_router
from .servers import router as servers_router
from .server_logs import router as server_logs_router
from .tools import router as tools_router
from .tool_call_logs import router as tool_call_logs_router
from .profile import router as profile_router
from .project_security import router as project_security_router
from .admin import router as admin_router
from .admin_teams import router as admin_teams_router
from .admin_projects import router as admin_projects_router
from .admin_api_keys import router as admin_api_keys_router
from .workers import router as workers_router
from .tool_preferences import router as tool_preferences_router
from starlette.routing import Mount
from mcp.server.sse import SseServerTransport

logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """애플리케이션 생명주기 관리"""
    # 로깅 시스템 초기화
    from ..config import settings
    settings.setup_logging()
    
    # 시작 시
    import time
    logger.info("Starting MCP Orch API server")
    
    # Set application start time for uptime tracking
    app.state.start_time = time.time()
    
    # 컨트롤러 초기화
    controller = app.state.controller
    await controller.initialize()
    
    # Auto-provisioning 설정 상태 로깅
    auto_provision = os.getenv("AUTO_PROVISION", "false").lower() == "true"
    if auto_provision:
        logger.info("✅ Auto-provisioning ENABLED - OAuth users will be automatically created")
    else:
        logger.info("🚫 Auto-provisioning DISABLED - manual account creation required")
    
    # 기존 사용자 관리자 권한 부여 (신규 생성 없음)
    from ..services.admin_init_service import initialize_admin_user
    settings = app.state.settings
    try:
        admin_result = await initialize_admin_user(settings)
        logger.info(f"관리자 초기화 결과: {admin_result}")
    except Exception as e:
        logger.error(f"관리자 초기화 실패: {e}")
    
    # 스케줄러 서비스 초기화 및 시작
    from ..services.scheduler_service import scheduler_service
    try:
        await scheduler_service.initialize()
        await scheduler_service.start()
        logger.info("Scheduler service started")
    except Exception as e:
        logger.error(f"Failed to start scheduler service: {e}")
    
    # MCP 세션 매니저 초기화
    from ..services.mcp_session_manager import get_session_manager
    try:
        # Pass MCP session configuration from app settings
        session_manager = await get_session_manager(settings.mcp_session)
        logger.info("MCP Session Manager started")
    except Exception as e:
        logger.error(f"Failed to start MCP Session Manager: {e}")
    
    yield
    
    # 종료 시
    logger.info("Shutting down MCP Orch API server")
    
    # 스케줄러 정지
    try:
        await scheduler_service.stop()
        logger.info("Scheduler service stopped")
    except Exception as e:
        logger.error(f"Error stopping scheduler service: {e}")
    
    # MCP 세션 매니저 정지
    from ..services.mcp_session_manager import shutdown_session_manager
    try:
        await shutdown_session_manager()
        logger.info("MCP Session Manager stopped")
    except Exception as e:
        logger.error(f"Error stopping MCP Session Manager: {e}")
    
    await controller.shutdown()


def create_app(settings: Settings = None) -> FastAPI:
    """
    FastAPI 애플리케이션 생성
    
    Args:
        settings: 애플리케이션 설정
        
    Returns:
        FastAPI 앱 인스턴스
    """
    if settings is None:
        settings = Settings.from_env()
        
    # FastAPI 앱 생성
    app = FastAPI(
        title="MCP Orch",
        description="하이브리드 MCP 프록시 및 병렬화 오케스트레이션 도구",
        version="0.1.0",
        lifespan=lifespan,
        docs_url="/docs" if settings.server.mode == "proxy" else "/api/docs",
        redoc_url="/redoc" if settings.server.mode == "proxy" else "/api/redoc",
    )
    
    # 설정 및 컨트롤러 저장
    app.state.settings = settings
    app.state.controller = DualModeController(settings)
    
    # CORS 미들웨어
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.security.cors_origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
    
    # 통합 인증 미들웨어 (JWT + API 키 지원)
    app.add_middleware(JWTAuthMiddleware, settings=settings)
    
    # Health check endpoint (인증 불필요)
    @app.get("/health", tags=["System"])
    async def health_check():
        """Comprehensive health check endpoint for monitoring"""
        import datetime
        import time
        import psutil
        import os
        from ..database import get_db
        from sqlalchemy import text
        
        start_time = time.time()
        health_status = {
            "status": "healthy",
            "timestamp": datetime.datetime.utcnow().isoformat(),
            "version": "1.0.0",
            "environment": settings.server.mode,
            "checks": {},
            "metrics": {}
        }
        
        # Database check with performance metrics
        try:
            db_start = time.time()
            db = next(get_db())
            result = db.execute(text("SELECT 1"))
            result.scalar()
            
            # Check database connection count
            conn_result = db.execute(text("SELECT count(*) FROM pg_stat_activity"))
            connection_count = conn_result.scalar()
            
            db.close()
            db_duration = (time.time() - db_start) * 1000
            
            health_status["checks"]["database"] = {
                "status": "ok",
                "response_time_ms": round(db_duration, 2),
                "connections": connection_count
            }
        except Exception as e:
            health_status["status"] = "unhealthy"
            health_status["checks"]["database"] = {
                "status": "error",
                "error": str(e)
            }
        
        # System resources check
        try:
            memory = psutil.virtual_memory()
            disk = psutil.disk_usage('/')
            cpu_percent = psutil.cpu_percent(interval=0.1)
            
            health_status["checks"]["system"] = {
                "status": "ok",
                "cpu_usage_percent": round(cpu_percent, 1),
                "memory_usage_percent": round(memory.percent, 1),
                "disk_usage_percent": round((disk.used / disk.total) * 100, 1),
                "available_memory_mb": round(memory.available / 1024 / 1024, 1)
            }
            
            # Mark as warning if resources are high
            if memory.percent > 90 or cpu_percent > 90 or (disk.used / disk.total) * 100 > 90:
                if health_status["status"] == "healthy":
                    health_status["status"] = "warning"
                health_status["checks"]["system"]["status"] = "warning"
                
        except Exception as e:
            health_status["checks"]["system"] = {
                "status": "error",
                "error": str(e)
            }
        
        # MCP Controller check
        try:
            controller_status = await app.state.controller.get_status()
            health_status["checks"]["mcp_controller"] = {
                "status": "ok" if controller_status.get("is_running") else "error",
                "mode": controller_status.get("mode"),
                "active_servers": len(controller_status.get("servers", {}))
            }
            
            if not controller_status.get("is_running"):
                health_status["status"] = "unhealthy"
                
        except Exception as e:
            health_status["status"] = "unhealthy"
            health_status["checks"]["mcp_controller"] = {
                "status": "error",
                "error": str(e)
            }
        
        # Application metrics
        response_time = (time.time() - start_time) * 1000
        health_status["metrics"] = {
            "response_time_ms": round(response_time, 2),
            "uptime_seconds": round(time.time() - app.state.start_time) if hasattr(app.state, 'start_time') else 0
        }
        
        return health_status
    
    # Detailed health check for specific components
    @app.get("/health/detailed", tags=["System"])
    async def detailed_health_check():
        """Detailed health check with component-specific information"""
        import datetime
        import time
        from ..database import get_db
        from sqlalchemy import text
        
        health_info = {
            "timestamp": datetime.datetime.utcnow().isoformat(),
            "version": "1.0.0",
            "components": {}
        }
        
        # Database detailed check
        try:
            db = next(get_db())
            
            # Database version and settings
            version_result = db.execute(text("SELECT version()"))
            db_version = version_result.scalar()
            
            # Active connections by state
            conn_result = db.execute(text("""
                SELECT state, count(*) as count
                FROM pg_stat_activity 
                WHERE datname = current_database()
                GROUP BY state
            """))
            connections_by_state = {row[0]: row[1] for row in conn_result}
            
            # Database size
            size_result = db.execute(text("""
                SELECT pg_size_pretty(pg_database_size(current_database()))
            """))
            db_size = size_result.scalar()
            
            db.close()
            
            health_info["components"]["database"] = {
                "version": db_version,
                "size": db_size,
                "connections_by_state": connections_by_state
            }
            
        except Exception as e:
            health_info["components"]["database"] = {
                "error": str(e)
            }
        
        # Process information
        try:
            import os
            import psutil
            
            process = psutil.Process(os.getpid())
            health_info["components"]["process"] = {
                "pid": process.pid,
                "cpu_percent": round(process.cpu_percent(), 2),
                "memory_percent": round(process.memory_percent(), 2),
                "memory_mb": round(process.memory_info().rss / 1024 / 1024, 1),
                "threads": process.num_threads(),
                "create_time": datetime.datetime.fromtimestamp(process.create_time()).isoformat()
            }
            
        except Exception as e:
            health_info["components"]["process"] = {
                "error": str(e)
            }
        
        return health_info
        
    # 라우터 등록 (순서 중요: 일반 API 라우터 먼저, SSE 라우터 나중에)
    # 1. 일반 REST API 라우터들 (/api/* 경로) - 프론트엔드용
    app.include_router(users_router)
    # app.include_router(teams_router)  # 기존 모놀리식 라우터 비활성화
    
    # DEBUG: teams 라우터 등록 전 디버그 정보
    logger.info("🔧 DEBUG: Registering teams_modular_router...")
    logger.info(f"🔧 DEBUG: teams_modular_router prefix: {teams_modular_router.prefix}")
    logger.info(f"🔧 DEBUG: teams_modular_router routes count: {len(teams_modular_router.routes)}")
    for route in teams_modular_router.routes:
        if hasattr(route, 'methods') and hasattr(route, 'path'):
            logger.info(f"🔧 DEBUG: Route: {route.methods} {route.path}")
    
    app.include_router(teams_modular_router)  # 새로운 모듈화된 라우터 활성화
    logger.info("✅ DEBUG: teams_modular_router registered successfully")
    # app.include_router(projects_router)  # 기존 모놀리식 라우터 비활성화
    app.include_router(projects_modular_router)  # 새로운 모듈화된 라우터 활성화
    app.include_router(project_servers_router)  # 🔧 프로젝트 서버 관리 API (도구 실행 포함)
    app.include_router(project_activities_router)  # 🔧 프로젝트 활동 추적 API
    app.include_router(servers_router)
    app.include_router(server_logs_router)
    app.include_router(tools_router)
    app.include_router(tool_call_logs_router)  # 🔧 ToolCallLog 조회 API (Datadog/Sentry 스타일)
    app.include_router(profile_router)  # 🔧 프로필 관리 API
    app.include_router(project_security_router)  # 🔧 프로젝트 보안 설정 API
    app.include_router(admin_router)  # 🔧 관리자 API
    app.include_router(admin_teams_router)  # 🔧 관리자 Teams 관리 API
    app.include_router(admin_projects_router)  # 🔧 관리자 Projects 관리 API
    app.include_router(admin_api_keys_router)  # 🔧 관리자 API Keys 관리 API
    app.include_router(workers_router)  # 🔧 워커 관리 API
    app.include_router(tool_preferences_router)  # 🔧 Tool Preferences 관리 API (필터링 시스템)
    app.include_router(fastmcp_router)
    
    # 2. 프로젝트 관리 API (일반 API 라우터)
    app.include_router(project_sse_router)   # 프로젝트 관리 API
    
    # 3. SSE 전용 라우터들 (/projects/*/sse 경로) - MCP 클라이언트용 (Cline, Cursor 등)
    app.include_router(fast_unified_router)  # ⚡ FASTEST: Claude Code 전용 초고속 라우터
    app.include_router(unified_mcp_transport_router)  # 🚀 NEW: 통합 MCP 서버 엔드포인트 (Unified Mode)
    app.include_router(mcp_sdk_sse_bridge_router)  # 🚀 NEW: python-sdk 표준 + mcp-orch URL 하이브리드 (최우선)
    app.include_router(mcp_sse_transport_router)  # 새로운 MCP 표준 준수 SSE Transport (호환성)
    app.include_router(mcp_standard_sse_router)  # 기존 표준 MCP SSE 엔드포인트 (호환성)
    # app.include_router(standard_mcp_router)  # 제거됨: 사용하지 않는 legacy 라우터
    
    # DEBUG: 최종적으로 등록된 모든 라우트 출력
    logger.info("🔧 DEBUG: Final registered routes summary:")
    total_routes = 0
    teams_routes = 0
    for route in app.routes:
        if hasattr(route, 'methods') and hasattr(route, 'path'):
            total_routes += 1
            if '/teams' in route.path:
                teams_routes += 1
                logger.info(f"🔧 DEBUG: Teams route: {route.methods} {route.path}")
    
    logger.info(f"🔧 DEBUG: Total routes registered: {total_routes}")
    logger.info(f"🔧 DEBUG: Teams routes registered: {teams_routes}")
    
    # 전역 예외 핸들러
    @app.exception_handler(Exception)
    async def global_exception_handler(request: Request, exc: Exception):
        """Global exception handler with safe logging"""
        
        # Rich 로깅 대신 기본 로깅 사용하여 재귀 방지
        import logging
        basic_logger = logging.getLogger("mcp_orch.errors")
        basic_logger.setLevel(logging.ERROR)
        
        # 간단한 콘솔 핸들러 사용
        if not basic_logger.handlers:
            handler = logging.StreamHandler()
            formatter = logging.Formatter('%(asctime)s - %(name)s - %(levelname)s - %(message)s')
            handler.setFormatter(formatter)
            basic_logger.addHandler(handler)
        
        # 안전한 로깅
        basic_logger.error(f"Unhandled exception in {request.url}: {str(exc)}")
        
        return JSONResponse(
            status_code=500,
            content={"detail": "Internal server error"}
        )
        
    # 프로젝트별 MCP 메시지 엔드포인트
    @app.post("/projects/{project_id}/servers/{server_name}/messages/", tags=["MCP"])
    async def handle_project_mcp_messages(project_id: str, server_name: str, request: Request):
        """프로젝트별 MCP 메시지 처리 엔드포인트 (실제 MCP 서버 연결)"""
        try:
            import json
            from uuid import UUID
            from ..database import get_db
            from ..models import McpServer
            from ..services.mcp_connection_service import mcp_connection_service
            
            # 세션 ID 추출 (쿼리 파라미터에서)
            session_id = request.query_params.get('session_id')
            
            logger.info(f"Project message: project_id={project_id}, server={server_name}, user={getattr(request.state, 'user', None)}")
            
            # 데이터베이스에서 서버 정보 조회
            db = next(get_db())
            try:
                db_server = db.query(McpServer).filter(
                    McpServer.project_id == UUID(project_id),
                    McpServer.name == server_name
                ).first()
                
                if not db_server:
                    return JSONResponse(
                        {"error": f"Server '{server_name}' not found in project"}, 
                        status_code=404
                    )
                
                # 서버 설정 구성
                server_config = {
                    'command': db_server.command,
                    'args': db_server.args or [],
                    'env': db_server.env or {},
                    'timeout': 30,
                    'is_enabled': db_server.is_enabled
                }
                
                if not server_config.get('is_enabled', True):
                    return JSONResponse(
                        {"error": f"Server '{server_name}' is disabled"}, 
                        status_code=503
                    )
                
                # 요청 본문 읽기
                body = await request.body()
                if not body:
                    return JSONResponse(
                        {"error": "Empty message body"}, 
                        status_code=400
                    )
                
                try:
                    message = json.loads(body)
                    logger.info(f"Received project MCP message: {message} (session: {session_id})")
                    
                    # 실제 MCP 서버로 메시지 전달
                    response_data = await forward_message_to_mcp_server(server_config, message)
                    
                    if response_data:
                        logger.info(f"Received response from MCP server: {response_data}")
                        
                        # SSE 세션이 있으면 응답을 SSE로도 전송
                        if session_id:
                            success = await send_response_to_sse_session(session_id, response_data)
                            if success:
                                logger.info(f"Response sent to SSE session {session_id}")
                                
                                # initialize 응답 후에 initialized 알림 전송 (MCP 프로토콜 준수)
                                if message.get("method") == "initialize":
                                    initialized_notification = {
                                        "jsonrpc": "2.0",
                                        "method": "notifications/initialized"
                                    }
                                    await send_response_to_sse_session(session_id, initialized_notification)
                                    logger.info(f"Sent initialized notification to SSE session {session_id}")
                            else:
                                logger.warning(f"Failed to send response to SSE session {session_id}")
                        
                        return response_data
                    else:
                        # MCP 서버 응답 실패 시 기본 응답
                        error_response = {
                            "jsonrpc": "2.0",
                            "id": message.get("id"),
                            "error": {
                                "code": -32603,
                                "message": f"MCP server '{server_name}' connection failed"
                            }
                        }
                        
                        if session_id:
                            await send_response_to_sse_session(session_id, error_response)
                        
                        return error_response
                    
                except json.JSONDecodeError as e:
                    logger.error(f"Invalid JSON in project message: {e}")
                    return JSONResponse(
                        {"error": "Invalid JSON format"}, 
                        status_code=400
                    )
                    
            finally:
                db.close()
                
        except Exception as e:
            logger.error(f"Error handling project /messages request: {e}")
            return JSONResponse(
                {"error": "Message handling failed"}, 
                status_code=500
            )

    # MCP 메시지 엔드포인트 (직접 라우트) - SSE 세션 기반 라우팅
    @app.post("/messages/", tags=["MCP"])
    async def handle_mcp_messages(request: Request):
        """MCP 메시지 처리 엔드포인트 (SSE 세션 기반 프로젝트 라우팅)"""
        try:
            import json
            from .project_sse import project_server_sse_endpoint
            
            # 세션 ID 추출 (쿼리 파라미터에서)
            session_id = request.query_params.get('session_id')
            
            logger.info(f"Received /messages/ request with session_id: {session_id}")
            
            # 세션 ID가 있으면 SSE 세션에서 프로젝트/서버 정보 조회
            if session_id and hasattr(project_server_sse_endpoint, 'sessions'):
                session_info = project_server_sse_endpoint.sessions.get(session_id)
                if session_info:
                    project_id = session_info.get('project_id')
                    server_name = session_info.get('server_name')
                    
                    logger.info(f"Found session info: project_id={project_id}, server={server_name}")
                    
                    # 프로젝트별 메시지 처리로 리다이렉트
                    return await handle_project_mcp_messages(str(project_id), server_name, request)
            
            # 세션 정보가 없으면 기본 처리
            logger.warning(f"No session info found for session_id: {session_id}")
            
            # 요청 본문 읽기
            body = await request.body()
            if body:
                try:
                    message = json.loads(body)
                    logger.info(f"Received generic MCP message: {message} (session: {session_id})")
                    
                    method = message.get("method")
                    message_id = message.get("id")
                    
                    # 기본 MCP 프로토콜 응답
                    if method == "initialize":
                        response_data = {
                            "jsonrpc": "2.0",
                            "id": message_id,
                            "result": {
                                "protocolVersion": "2025-03-26",
                                "capabilities": {
                                    "tools": {},
                                    "resources": {}
                                },
                                "serverInfo": {
                                    "name": "mcp-orch",
                                    "version": "0.1.0"
                                }
                            }
                        }
                        
                        logger.info("Sending generic initialize response")
                        
                        # SSE 세션이 있으면 응답을 SSE로도 전송
                        if session_id:
                            await send_response_to_sse_session(session_id, response_data)
                        
                        return response_data
                        
                    elif method == "tools/list":
                        response_data = {
                            "jsonrpc": "2.0",
                            "id": message_id,
                            "result": {
                                "tools": []
                            }
                        }
                        
                        logger.info("Sending empty tools list response")
                        return response_data
                        
                    else:
                        # 알 수 없는 메서드
                        response_data = {
                            "jsonrpc": "2.0",
                            "id": message_id,
                            "error": {
                                "code": -32601,
                                "message": f"Method not found: {method}"
                            }
                        }
                        
                        return response_data
                    
                except json.JSONDecodeError as e:
                    logger.error(f"Invalid JSON in message: {e}")
                    return JSONResponse(
                        {"error": "Invalid JSON format"}, 
                        status_code=400
                    )
            else:
                return JSONResponse(
                    {"error": "Empty message body"}, 
                    status_code=400
                )
                
        except Exception as e:
            logger.error(f"Error handling /messages request: {e}")
            return JSONResponse(
                {"error": "Message handling failed"}, 
                status_code=500
            )

    # 헬스체크 엔드포인트
    @app.get("/health", tags=["System"])
    async def health_check():
        """서버 상태 확인"""
        controller_status = await app.state.controller.get_status()
        
        return {
            "status": "healthy" if controller_status["is_running"] else "unhealthy",
            "mode": controller_status["mode"],
            "version": "0.1.0",
            "details": controller_status
        }
        
    # 루트 엔드포인트
    @app.get("/", tags=["System"])
    async def root():
        """API 정보"""
        return {
            "name": "MCP Orch",
            "version": "0.1.0",
            "mode": settings.server.mode,
            "description": "하이브리드 MCP 프록시 및 병렬화 오케스트레이션 도구",
            "docs": "/docs" if settings.server.mode == "proxy" else "/api/docs"
        }
        
    return app


def get_controller(request: Request) -> DualModeController:
    """요청에서 컨트롤러 가져오기"""
    return request.app.state.controller


def get_settings(request: Request) -> Settings:
    """요청에서 설정 가져오기"""
    return request.app.state.settings


async def forward_message_to_mcp_server(server_config: Dict, message: Dict) -> Dict[str, Any]:
    """실제 MCP 서버로 메시지 전달 및 응답 수신 (개선된 버전)"""
    try:
        import asyncio
        import json
        import os
        
        command = server_config.get('command', '')
        args = server_config.get('args', [])
        env = server_config.get('env', {})
        timeout = server_config.get('timeout', 30)
        
        if not command:
            logger.error("No command specified for MCP server")
            return None
        
        # 환경변수 설정
        full_env = os.environ.copy()
        full_env.update(env)
        
        logger.info(f"Starting MCP server: {command} {' '.join(args)}")
        
        # MCP 서버 프로세스 시작
        process = await asyncio.create_subprocess_exec(
            command, *args,
            stdin=asyncio.subprocess.PIPE,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
            env=full_env
        )
        
        try:
            # initialize 메시지인 경우 먼저 초기화 수행
            if message.get("method") == "initialize":
                logger.info("Handling initialize message")
                
                # 초기화 메시지 전송
                init_json = json.dumps(message) + '\n'
                process.stdin.write(init_json.encode())
                await process.stdin.drain()
                
                # 초기화 응답 대기
                response_line = await asyncio.wait_for(
                    process.stdout.readline(), 
                    timeout=timeout
                )
                
                if response_line:
                    response_text = response_line.decode().strip()
                    logger.info(f"Initialize response: {response_text}")
                    
                    try:
                        response_data = json.loads(response_text)
                        return response_data
                    except json.JSONDecodeError as e:
                        logger.error(f"Invalid JSON in initialize response: {e}")
                        return None
                else:
                    logger.warning("No initialize response received")
                    return None
                    
            else:
                # 다른 메시지들의 경우 초기화 후 메시지 전송
                logger.info(f"Handling {message.get('method')} message")
                
                # 먼저 초기화 메시지 전송
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
                await asyncio.wait_for(process.stdout.readline(), timeout=10)
                
                # 실제 메시지 전송
                message_json = json.dumps(message) + '\n'
                logger.info(f"Sending message to MCP server: {message}")
                
                process.stdin.write(message_json.encode())
                await process.stdin.drain()
                
                # 응답 대기
                response_line = await asyncio.wait_for(
                    process.stdout.readline(), 
                    timeout=timeout
                )
                
                if response_line:
                    response_text = response_line.decode().strip()
                    logger.info(f"Received response from MCP server: {response_text}")
                    
                    try:
                        response_data = json.loads(response_text)
                        return response_data
                    except json.JSONDecodeError as e:
                        logger.error(f"Invalid JSON response from MCP server: {e}")
                        return None
                else:
                    logger.warning("No response received from MCP server")
                    return None
                    
        except asyncio.TimeoutError:
            logger.error(f"MCP server response timeout after {timeout} seconds")
            return None
            
        finally:
            # 프로세스 정리
            try:
                if process.stdin and not process.stdin.is_closing():
                    process.stdin.close()
                    await process.stdin.wait_closed()
                
                # 프로세스 종료 대기 (짧은 타임아웃)
                try:
                    await asyncio.wait_for(process.wait(), timeout=5.0)
                except asyncio.TimeoutError:
                    # 강제 종료
                    logger.warning("Force killing MCP server process")
                    process.kill()
                    await process.wait()
                    
            except Exception as cleanup_error:
                logger.error(f"Error during MCP server cleanup: {cleanup_error}")
                
    except Exception as e:
        logger.error(f"Error forwarding message to MCP server: {e}")
        return None


async def send_response_to_sse_session(session_id: str, response_data: Dict[str, Any]):
    """SSE 세션으로 응답 전송"""
    try:
        # project_sse 모듈에서 send_message_to_sse_session 함수 import
        from .project_sse import send_message_to_sse_session
        
        success = await send_message_to_sse_session(session_id, response_data)
        if success:
            logger.info(f"Response sent to SSE session {session_id}")
        else:
            logger.warning(f"Failed to send response to SSE session {session_id}")
    except Exception as e:
        logger.error(f"Error sending response to SSE session {session_id}: {e}")

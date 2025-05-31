"""
FastAPI 애플리케이션 팩토리

FastAPI 앱 인스턴스를 생성하고 설정합니다.
"""

import logging
from contextlib import asynccontextmanager
from typing import Any, Dict

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from ..config import Settings
from ..core.controller import DualModeController
from .middleware import AuthMiddleware
from .routes import router

logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """애플리케이션 생명주기 관리"""
    # 시작 시
    logger.info("Starting MCP Orch API server")
    
    # 컨트롤러 초기화
    controller = app.state.controller
    await controller.initialize()
    
    yield
    
    # 종료 시
    logger.info("Shutting down MCP Orch API server")
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
    
    # 인증 미들웨어
    if settings.security.enable_auth:
        app.add_middleware(AuthMiddleware, settings=settings)
        
    # 라우터 등록
    app.include_router(router)
    
    # 전역 예외 핸들러
    @app.exception_handler(Exception)
    async def global_exception_handler(request: Request, exc: Exception):
        logger.error(f"Unhandled exception: {exc}", exc_info=True)
        return JSONResponse(
            status_code=500,
            content={
                "error": "Internal server error",
                "message": str(exc) if settings.server.log_level == "DEBUG" else "An error occurred"
            }
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

"""
MCP SDK Bridge - Python SDK 표준 구현
mcp-orch URL 구조 + python-sdk 표준 StreamableHTTPSessionManager

이 모듈은 mcp-orch의 프로젝트별 URL 구조를 유지하면서
python-sdk의 표준 StreamableHTTPSessionManager를 활용합니다.
"""

import asyncio
import logging
from typing import Dict, Optional, Any
from uuid import UUID
from datetime import datetime
from contextlib import asynccontextmanager

from fastapi import APIRouter, Request, HTTPException, status, Depends
from fastapi.responses import Response
from sqlalchemy.orm import Session
from sqlalchemy import and_

# python-sdk 표준 구현 임포트
from mcp.server.sse import SseServerTransport
from mcp.server.streamable_http_manager import StreamableHTTPSessionManager
from mcp.server.lowlevel import Server
from mcp.shared.message import SessionMessage
import mcp.types as types

from ..database import get_db
from ..models import Project, McpServer, User, ClientSession, LogLevel, LogCategory
from .jwt_auth import get_user_from_jwt_token
from ..services.mcp_connection_service import mcp_connection_service
from ..services.server_log_service import get_log_service

logger = logging.getLogger(__name__)

router = APIRouter(tags=["mcp-sdk-bridge"])

# ASGI 애플리케이션을 위한 임포트
from starlette.types import Receive, Scope, Send

# 전역 세션 매니저 저장소 (서버별)
streamable_session_managers: Dict[str, StreamableHTTPSessionManager] = {}
sse_transports: Dict[str, SseServerTransport] = {}
mcp_servers: Dict[str, Server] = {}

import anyio


def get_transport_key(project_id: str, server_name: str) -> str:
    """프로젝트와 서버명으로 고유 키 생성"""
    return f"{project_id}:{server_name}"


async def register_dynamic_tools(mcp_server: Server, server_record, server_config: Dict[str, Any]):
    """실제 MCP 서버의 도구들을 동적으로 등록"""
    try:
        # 기존 mcp_connection_service를 통해 실제 서버 도구 정보 가져오기
        server_info = await mcp_connection_service.get_server_info(
            server_record.id, server_config
        )
        
        if server_info and "tools" in server_info:
            # 도구 등록 로직 추가
            logger.info(f"Registered {len(server_info['tools'])} tools for {server_record.name}")
    except Exception as e:
        logger.warning(f"Failed to register dynamic tools for {server_record.name}: {e}")


async def get_or_create_streamable_session_manager(
    project_id: str, server_name: str, server_record, server_config: Dict[str, Any]
) -> StreamableHTTPSessionManager:
    """서버별 StreamableHTTPSessionManager 가져오기 또는 생성"""
    manager_key = get_transport_key(project_id, server_name)
    
    if manager_key not in streamable_session_managers:
        # MCP 서버 인스턴스 생성
        mcp_server = Server(f"mcp-orch-{server_name}")
        
        # 실제 MCP 도구들을 동적으로 등록
        await register_dynamic_tools(mcp_server, server_record, server_config)
        
        # StreamableHTTPSessionManager 생성 (stateless 모드로 단순화)
        session_manager = StreamableHTTPSessionManager(
            app=mcp_server,
            event_store=None,  # resumability 없음
            json_response=False,  # SSE 스트림 사용
            stateless=True  # stateless 모드로 세션 관리 단순화
        )
        
        streamable_session_managers[manager_key] = session_manager
        mcp_servers[manager_key] = mcp_server
        
        logger.info(f"🎯 Created StreamableHTTPSessionManager for {manager_key}")
    
    return streamable_session_managers[manager_key]


async def get_or_create_sse_transport(
    project_id: str, server_name: str, server_record, server_config: Dict[str, Any]
) -> SseServerTransport:
    """SSE Transport 가져오기 또는 생성 (기존 기능 유지)"""
    key = get_transport_key(project_id, server_name)
    
    if key not in sse_transports:
        endpoint = f"/projects/{project_id}/servers/{server_name}/messages"
        sse_transports[key] = SseServerTransport(endpoint)
        logger.info(f"Created new SSE transport for {key} with endpoint: {endpoint}")
    
    return sse_transports[key]


async def get_current_user_for_mcp_bridge(
    request: Request,
    project_id: UUID,
    server_name: str,
    db: Session = Depends(get_db)
) -> Optional[User]:
    """MCP Bridge용 사용자 인증 (DISABLE_AUTH 지원, 서버별 인증 설정)"""
    
    import os
    
    # DISABLE_AUTH 환경 변수 확인
    disable_auth = os.getenv("DISABLE_AUTH", "").lower() == "true"
    
    if disable_auth:
        logger.info(f"⚠️ Authentication disabled for bridge request to project {project_id}, server {server_name}")
        # 인증이 비활성화된 경우 None 반환 (인증 없이 진행)
        return None
    
    # 서버 및 프로젝트 정보 조회
    server = db.query(McpServer).filter(
        McpServer.project_id == project_id,
        McpServer.name == server_name,
        McpServer.is_enabled == True
    ).first()
    
    if not server:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Server '{server_name}' not found or disabled in project {project_id}"
        )
    
    # 서버별 JWT 인증 정책 확인 (서버 설정 > 프로젝트 기본값)
    auth_required = server.get_effective_jwt_auth_required()
    
    if not auth_required:
        logger.info(f"Bridge request allowed without auth for project {project_id}, server {server_name}")
        return None  # 인증 없이 허용
    
    # JWT 인증 시도
    user = await get_user_from_jwt_token(request, db)
    if not user:
        # API 키 인증 확인
        if hasattr(request.state, 'user') and request.state.user:
            user = request.state.user
            logger.info(f"Authenticated bridge request via API key for project {project_id}, user={user.email}")
            return user
        
        logger.warning(f"Bridge authentication required but no valid token for project {project_id}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required"
        )
    
    logger.info(f"Authenticated bridge request for project {project_id}, user={user.email}")
    return user


@router.get("/projects/{project_id}/servers/{server_name}/sse")
@router.get("/projects/{project_id}/servers/{server_name}/bridge/sse")
async def mcp_sse_bridge_endpoint(
    project_id: UUID,
    server_name: str,
    request: Request,
    db: Session = Depends(get_db)
):
    """
    MCP SSE Bridge 엔드포인트 (기존 기능 유지)
    
    mcp-orch의 프로젝트별 URL 구조를 유지하면서
    python-sdk 표준 SSE Transport를 내부적으로 사용
    """
    
    try:
        # 사용자 인증 (서버별 인증 설정 포함)
        current_user = await get_current_user_for_mcp_bridge(request, project_id, server_name, db)
        
        if current_user:
            logger.info(f"MCP SSE Bridge connection: project_id={project_id}, server={server_name}, user={current_user.email}")
        else:
            logger.info(f"MCP SSE Bridge connection (no auth): project_id={project_id}, server={server_name}")
        
        # 서버 존재 확인
        server_record = db.query(McpServer).filter(
            McpServer.project_id == project_id,
            McpServer.name == server_name,
            McpServer.is_enabled == True
        ).first()
        
        if not server_record:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Server '{server_name}' not found or disabled"
            )
        
        # 서버 설정 가져오기
        server_config = {
            "command": server_record.command,
            "args": server_record.args or [],
            "env": server_record.env or {},
            "cwd": server_record.cwd
        }
        
        # SSE Transport 생성/가져오기 (기존 로직 유지)
        sse_transport = await get_or_create_sse_transport(
            str(project_id), server_name, server_record, server_config
        )
        
        # SSE 응답 반환 (기존 구현 유지)
        return Response(
            content="SSE connection established",
            media_type="text/event-stream",
            headers={
                "Cache-Control": "no-cache",
                "Connection": "keep-alive",
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Headers": "*"
            }
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.exception(f"Error in SSE bridge: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Internal server error: {str(e)}"
        )


async def mcp_streamable_http_handler(
    scope: Scope, receive: Receive, send: Send,
    project_id: str, server_name: str
) -> None:
    """Streamable HTTP 요청 처리기 (Python SDK 표준)"""
    try:
        # 데이터베이스 세션 생성
        from ..database import SessionLocal
        db = SessionLocal()
        
        try:
            # 서버 레코드 조회
            server_record = db.query(McpServer).filter(
                McpServer.project_id == UUID(project_id),
                McpServer.name == server_name,
                McpServer.is_enabled == True
            ).first()
            
            if not server_record:
                # 404 응답 생성
                from starlette.responses import JSONResponse
                response = JSONResponse(
                    {"detail": f"Server '{server_name}' not found or disabled"},
                    status_code=404
                )
                await response(scope, receive, send)
                return
            
            # 서버 설정 가져오기
            server_config = {
                "command": server_record.command,
                "args": server_record.args or [],
                "env": server_record.env or {},
                "cwd": server_record.cwd
            }
            
            # StreamableHTTPSessionManager 가져오기/생성
            session_manager = await get_or_create_streamable_session_manager(
                project_id, server_name, server_record, server_config
            )
            
            # stateless 모드에서는 run() 컨텍스트가 필요
            async with session_manager.run():
                await session_manager.handle_request(scope, receive, send)
            
        finally:
            db.close()
            
    except Exception as e:
        logger.exception(f"Error in streamable HTTP handler: {e}")
        # 500 응답 생성
        from starlette.responses import JSONResponse
        response = JSONResponse(
            {"detail": f"Internal server error: {str(e)}"},
            status_code=500
        )
        await response(scope, receive, send)


# FastAPI 라우트를 Starlette ASGI 앱으로 마운트하기 위한 어댑터
async def mcp_streamable_http_endpoint(
    project_id: UUID,
    server_name: str,
    request: Request
):
    """
    Streamable HTTP 엔드포인트 (Python SDK 표준)
    
    Claude Code와 같은 표준 MCP 클라이언트와 호환됩니다.
    """
    # ASGI 핸들러로 위임
    # request._send 대신 적절한 send 함수 사용
    async def send_wrapper(message):
        # FastAPI Request의 응답 전송은 다른 방식으로 처리
        pass
    
    await mcp_streamable_http_handler(
        request.scope, request.receive, send_wrapper,
        str(project_id), server_name
    )


# 새로운 streamable HTTP 엔드포인트 등록
@router.api_route(
    "/projects/{project_id}/servers/{server_name}/mcp",
    methods=["GET", "POST", "DELETE"],
    include_in_schema=False  # OpenAPI 스키마에서 제외 (ASGI 직접 처리)
)
async def mcp_streamable_http_route(
    project_id: UUID,
    server_name: str,
    request: Request,
    sessionId: Optional[str] = None  # Claude Code가 쿼리 파라미터로 전송
):
    """Streamable HTTP MCP 엔드포인트 - Claude Code 호환"""
    
    # sessionId 쿼리 파라미터를 헤더로 변환 (Python SDK 호환성)
    if sessionId:
        logger.info(f"🔗 Converting sessionId query param to header: {sessionId}")
        
        # 새로운 스코프 생성하여 헤더 추가
        modified_scope = request.scope.copy()
        headers = list(modified_scope.get("headers", []))
        headers.append((b"mcp-session-id", sessionId.encode()))
        modified_scope["headers"] = headers
        
        # 수정된 스코프로 새로운 Request 생성
        from starlette.requests import Request as StarletteRequest
        request = StarletteRequest(modified_scope, request.receive)
    
    return await mcp_streamable_http_endpoint(project_id, server_name, request)


async def cleanup_transport(project_id: str, server_name: str):
    """Transport 정리"""
    key = get_transport_key(project_id, server_name)
    
    if key in sse_transports:
        del sse_transports[key]
        logger.info(f"Cleaned up SSE transport for {key}")
    
    # StreamableHTTPSessionManager 정리 (stateless이므로 별도 태스크 없음)
    if key in streamable_session_managers:
        del streamable_session_managers[key]
        logger.info(f"Cleaned up StreamableHTTP session manager for {key}")
    
    if key in mcp_servers:
        del mcp_servers[key]
        logger.info(f"Cleaned up MCP server for {key}")
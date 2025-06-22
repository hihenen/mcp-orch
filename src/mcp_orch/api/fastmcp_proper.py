"""
FastMCP 라이브러리를 올바르게 사용한 MCP 서버 구현
Context7에서 분석한 FastMCP 패턴을 적용
"""

import logging
import asyncio
import os
from typing import Dict, Any, Optional, List
from uuid import UUID

from fastapi import APIRouter, Request, HTTPException, status, Depends
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from sqlalchemy import and_

# FastMCP 라이브러리 임포트 (실제 설치 필요)
try:
    from fastmcp import FastMCP
    FASTMCP_AVAILABLE = True
except ImportError:
    FASTMCP_AVAILABLE = False
    logging.warning("FastMCP library not available. Install with: pip install fastmcp")

from ..database import get_db
from ..models import Project, ProjectMember, User, McpServer, ApiKey
from .jwt_auth import get_user_from_jwt_token

logger = logging.getLogger(__name__)

router = APIRouter(tags=["fastmcp-proper"])


class FastMCPServerManager:
    """FastMCP 서버 관리자"""
    
    def __init__(self):
        self.servers: Dict[str, FastMCP] = {}
        self.server_configs: Dict[str, Dict[str, Any]] = {}
    
    def create_brave_search_server(self, project_id: str, server_name: str) -> FastMCP:
        """Brave Search MCP 서버 생성"""
        if not FASTMCP_AVAILABLE:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="FastMCP library not available"
            )
        
        server_key = f"{project_id}_{server_name}"
        
        if server_key in self.servers:
            return self.servers[server_key]
        
        # FastMCP 서버 생성 (Context7 패턴 적용)
        mcp = FastMCP(name=f"mcp-orch-{server_name}")
        
        @mcp.tool
        def brave_web_search(query: str, count: int = 10, offset: int = 0) -> str:
            """Performs a web search using the Brave Search API, ideal for general queries, news, articles, and online content. Use this for broad information gathering, recent events, or when you need diverse web sources. Supports pagination, content filtering, and freshness controls. Maximum 20 results per request, with offset for pagination."""
            logger.info(f"FastMCP Tool: brave_web_search(query='{query}', count={count}, offset={offset})")
            
            # TODO: 실제 Brave Search API 호출 구현
            return f"Search results for '{query}' (showing {count} results starting from {offset})"
        
        @mcp.tool
        def brave_local_search(query: str, count: int = 5) -> str:
            """Searches for local businesses and places using Brave's Local Search API. Best for queries related to physical locations, businesses, restaurants, services, etc. Returns detailed information including business names and addresses, ratings and review counts, phone numbers and opening hours. Use this when the query implies 'near me' or mentions specific locations. Automatically falls back to web search if no local results are found."""
            logger.info(f"FastMCP Tool: brave_local_search(query='{query}', count={count})")
            
            # TODO: 실제 Brave Local Search API 호출 구현
            return f"Local search results for '{query}' (showing {count} results)"
        
        # 서버 저장
        self.servers[server_key] = mcp
        self.server_configs[server_key] = {
            'project_id': project_id,
            'server_name': server_name,
            'created_at': asyncio.get_event_loop().time()
        }
        
        logger.info(f"Created FastMCP server: {server_key}")
        return mcp
    
    def get_server(self, project_id: str, server_name: str) -> Optional[FastMCP]:
        """서버 조회"""
        server_key = f"{project_id}_{server_name}"
        return self.servers.get(server_key)
    
    def get_server_http_app(self, project_id: str, server_name: str, transport: str = "streamable-http"):
        """FastMCP HTTP 앱 생성 (Context7 패턴)"""
        mcp = self.get_server(project_id, server_name)
        if not mcp:
            mcp = self.create_brave_search_server(project_id, server_name)
        
        # FastMCP HTTP 앱 생성 (Context7에서 확인한 패턴)
        if transport == "sse":
            # SSE 전용 (deprecated but supported)
            return mcp.http_app(path="/mcp", transport="sse")
        else:
            # Streamable HTTP (권장)
            return mcp.http_app(path="/mcp")


# 전역 서버 매니저
server_manager = FastMCPServerManager()


# 유연한 인증 함수
async def get_current_user_for_fastmcp_proper(
    request: Request,
    project_id: UUID,
    db: Session = Depends(get_db)
) -> Optional[User]:
    """FastMCP Proper용 유연한 사용자 인증 함수"""
    
    # 프로젝트 보안 설정 조회
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project not found"
        )
    
    # SSE 연결인지 확인
    is_sse_request = "/sse" in request.url.path
    
    # SSE 연결 시 인증 정책 확인
    if is_sse_request:
        if not project.sse_auth_required:
            logger.info(f"FastMCP Proper SSE connection allowed without auth for project {project_id}")
            return None  # 인증 없이 허용
    else:
        # 메시지 요청 시 인증 정책 확인
        if not project.message_auth_required:
            logger.info(f"FastMCP Proper message request allowed without auth for project {project_id}")
            return None  # 인증 없이 허용
    
    # 인증이 필요한 경우 - JWT 토큰 또는 API 키 확인
    user = await get_user_from_jwt_token(request, db)
    if not user:
        # JWT 인증 실패 시 request.state.user 확인 (API 키 인증 결과)
        if hasattr(request.state, 'user') and request.state.user:
            user = request.state.user
            auth_type = "SSE" if is_sse_request else "Message"
            logger.info(f"Authenticated FastMCP Proper {auth_type} request via API key for project {project_id}, user={user.email}")
            return user
        
        auth_type = "SSE" if is_sse_request else "Message"
        logger.warning(f"FastMCP Proper {auth_type} authentication required but no valid token for project {project_id}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required"
        )
    
    logger.info(f"Authenticated FastMCP Proper {'SSE' if is_sse_request else 'Message'} request for project {project_id}, user={user.email}")
    return user


# FastMCP HTTP 앱 마운트 엔드포인트 (Context7 패턴)
@router.api_route("/projects/{project_id}/servers/{server_name}/fastmcp/{path:path}", methods=["GET", "POST", "OPTIONS"])
async def fastmcp_proper_endpoint(
    project_id: UUID,
    server_name: str,
    path: str,
    request: Request,
    db: Session = Depends(get_db)
):
    """FastMCP HTTP 앱을 통한 완전한 MCP 프로토콜 처리"""
    
    try:
        # 유연한 인증 적용
        current_user = await get_current_user_for_fastmcp_proper(request, project_id, db)
        
        if current_user:
            logger.info(f"FastMCP Proper request: method={request.method}, project_id={project_id}, server={server_name}, path={path}, user={current_user.email}")
        else:
            logger.info(f"FastMCP Proper request (no auth): method={request.method}, project_id={project_id}, server={server_name}, path={path}")
        
        # FastMCP HTTP 앱 가져오기
        try:
            # SSE 요청인지 확인
            transport = "sse" if path.startswith("sse") else "streamable-http"
            http_app = server_manager.get_server_http_app(str(project_id), server_name, transport)
            
            logger.info(f"FastMCP Proper: Using {transport} transport for path: {path}")
            
            # FastMCP HTTP 앱으로 요청 전달
            # 경로 조정: /mcp/sse -> /sse, /mcp -> /
            if path.startswith("mcp/"):
                adjusted_path = "/" + path[4:]  # "mcp/" 제거
            else:
                adjusted_path = "/" + path
            
            # 새로운 요청 객체 생성 (경로 조정)
            from starlette.requests import Request as StarletteRequest
            from starlette.datastructures import URL
            
            # URL 재구성
            new_url = request.url.replace(path=adjusted_path)
            
            # 요청을 FastMCP 앱으로 전달
            scope = request.scope.copy()
            scope['path'] = adjusted_path
            scope['raw_path'] = adjusted_path.encode()
            
            # ASGI 호출
            from starlette.responses import Response
            
            async def receive():
                return await request.receive()
            
            response_started = False
            response_body = b""
            response_status = 200
            response_headers = []
            
            async def send(message):
                nonlocal response_started, response_body, response_status, response_headers
                
                if message["type"] == "http.response.start":
                    response_started = True
                    response_status = message["status"]
                    response_headers = message.get("headers", [])
                elif message["type"] == "http.response.body":
                    response_body += message.get("body", b"")
            
            # FastMCP 앱 실행
            await http_app(scope, receive, send)
            
            # 응답 반환
            headers_dict = {k.decode(): v.decode() for k, v in response_headers}
            
            if "text/event-stream" in headers_dict.get("content-type", ""):
                # SSE 응답인 경우
                async def sse_generator():
                    yield response_body.decode()
                
                return StreamingResponse(
                    sse_generator(),
                    media_type="text/event-stream",
                    headers=headers_dict
                )
            else:
                # 일반 HTTP 응답
                return Response(
                    content=response_body,
                    status_code=response_status,
                    headers=headers_dict
                )
                
        except Exception as app_error:
            logger.error(f"FastMCP app execution error: {app_error}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"FastMCP app execution failed: {str(app_error)}"
            )
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"FastMCP Proper endpoint error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"FastMCP Proper request failed: {str(e)}"
        )


# FastMCP 서버 상태 확인 엔드포인트
@router.get("/projects/{project_id}/servers/{server_name}/fastmcp-status")
async def fastmcp_server_status(
    project_id: UUID,
    server_name: str,
    db: Session = Depends(get_db)
):
    """FastMCP 서버 상태 확인"""
    
    try:
        server = server_manager.get_server(str(project_id), server_name)
        
        if not server:
            return {
                "status": "not_created",
                "project_id": str(project_id),
                "server_name": server_name,
                "fastmcp_available": FASTMCP_AVAILABLE
            }
        
        server_key = f"{project_id}_{server_name}"
        config = server_manager.server_configs.get(server_key, {})
        
        # 도구 목록 가져오기
        tools = []
        try:
            tools_dict = await server.get_tools()
            tools = list(tools_dict.keys())
        except Exception as e:
            logger.warning(f"Failed to get tools from FastMCP server: {e}")
        
        return {
            "status": "active",
            "project_id": str(project_id),
            "server_name": server_name,
            "server_info": {
                "name": server.name,
                "created_at": config.get('created_at'),
                "tools_count": len(tools),
                "tools": tools
            },
            "fastmcp_available": FASTMCP_AVAILABLE,
            "endpoints": {
                "http": f"/projects/{project_id}/servers/{server_name}/fastmcp/mcp",
                "sse": f"/projects/{project_id}/servers/{server_name}/fastmcp/mcp/sse"
            }
        }
        
    except Exception as e:
        logger.error(f"FastMCP server status error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get server status: {str(e)}"
        )


# FastMCP 서버 생성/재시작 엔드포인트
@router.post("/projects/{project_id}/servers/{server_name}/fastmcp-restart")
async def fastmcp_server_restart(
    project_id: UUID,
    server_name: str,
    db: Session = Depends(get_db)
):
    """FastMCP 서버 재시작"""
    
    try:
        # 기존 서버 제거
        server_key = f"{project_id}_{server_name}"
        if server_key in server_manager.servers:
            del server_manager.servers[server_key]
        if server_key in server_manager.server_configs:
            del server_manager.server_configs[server_key]
        
        # 새 서버 생성
        new_server = server_manager.create_brave_search_server(str(project_id), server_name)
        
        # 도구 목록 가져오기
        tools = []
        try:
            tools_dict = await new_server.get_tools()
            tools = list(tools_dict.keys())
        except Exception as e:
            logger.warning(f"Failed to get tools from restarted FastMCP server: {e}")
        
        return {
            "status": "restarted",
            "project_id": str(project_id),
            "server_name": server_name,
            "server_info": {
                "name": new_server.name,
                "tools_count": len(tools),
                "tools": tools
            },
            "endpoints": {
                "http": f"/projects/{project_id}/servers/{server_name}/fastmcp/mcp",
                "sse": f"/projects/{project_id}/servers/{server_name}/fastmcp/mcp/sse"
            }
        }
        
    except Exception as e:
        logger.error(f"FastMCP server restart error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to restart server: {str(e)}"
        )

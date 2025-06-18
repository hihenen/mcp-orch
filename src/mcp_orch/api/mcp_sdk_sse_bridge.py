"""
MCP SDK SSE Bridge - 하이브리드 구현
mcp-orch URL 구조 + python-sdk 표준 내부 구현

이 모듈은 mcp-orch의 프로젝트별 URL 구조를 유지하면서
python-sdk의 표준 SseServerTransport를 내부적으로 활용합니다.
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
from mcp.server.lowlevel import Server
from mcp.shared.message import SessionMessage
import mcp.types as types

from ..database import get_db
from ..models import Project, McpServer, User, ClientSession
from .jwt_auth import get_user_from_jwt_token
from ..services.mcp_connection_service import mcp_connection_service

logger = logging.getLogger(__name__)

router = APIRouter(tags=["mcp-sdk-sse-bridge"])

# Starlette 라우트 등록을 위한 임포트
from starlette.routing import Route, Mount
from starlette.applications import Starlette
from starlette.responses import Response as StarletteResponse


class ProjectMCPTransportManager:
    """프로젝트별 MCP Transport 관리자"""
    
    def __init__(self):
        self.transports: Dict[str, SseServerTransport] = {}
        self.mcp_servers: Dict[str, Server] = {}
    
    def get_transport_key(self, project_id: str, server_name: str) -> str:
        """프로젝트와 서버명으로 고유 키 생성"""
        return f"{project_id}:{server_name}"
    
    def get_transport(self, project_id: str, server_name: str) -> SseServerTransport:
        """프로젝트별 SSE Transport 인스턴스 반환"""
        key = self.get_transport_key(project_id, server_name)
        
        if key not in self.transports:
            # mcp-orch URL 구조 유지: 프로젝트별 메시지 엔드포인트
            endpoint = f"/projects/{project_id}/servers/{server_name}/messages"
            self.transports[key] = SseServerTransport(endpoint)
            logger.info(f"Created new SSE transport for {key} with endpoint: {endpoint}")
        
        return self.transports[key]
    
    def get_mcp_server(self, project_id: str, server_name: str, server_config: Dict[str, Any]) -> Server:
        """프로젝트별 MCP Server 인스턴스 반환"""
        key = self.get_transport_key(project_id, server_name)
        
        if key not in self.mcp_servers:
            # MCP 서버 생성 (이름은 프로젝트:서버명 형식)
            server = Server(f"mcp-orch-{server_name}")
            
            # 실제 MCP 서버의 도구들을 동적으로 등록
            # TODO: 기존 mcp_connection_service와 통합하여 실제 도구 로드
            
            self.mcp_servers[key] = server
            logger.info(f"Created new MCP server instance for {key}")
        
        return self.mcp_servers[key]
    
    def cleanup_transport(self, project_id: str, server_name: str):
        """Transport 정리"""
        key = self.get_transport_key(project_id, server_name)
        
        if key in self.transports:
            del self.transports[key]
            logger.info(f"Cleaned up transport for {key}")
        
        if key in self.mcp_servers:
            del self.mcp_servers[key]
            logger.info(f"Cleaned up MCP server for {key}")


# 전역 Transport Manager 인스턴스
transport_manager = ProjectMCPTransportManager()


async def get_current_user_for_mcp_sse_bridge(
    request: Request,
    project_id: UUID,
    db: Session = Depends(get_db)
) -> Optional[User]:
    """MCP SSE Bridge용 사용자 인증 (DISABLE_AUTH 지원)"""
    
    import os
    
    # DISABLE_AUTH 환경 변수 확인
    disable_auth = os.getenv("DISABLE_AUTH", "").lower() == "true"
    
    if disable_auth:
        logger.info(f"⚠️ Authentication disabled for SSE bridge request to project {project_id}")
        # 인증이 비활성화된 경우 None 반환 (인증 없이 진행)
        return None
    
    # 프로젝트 보안 설정 조회
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project not found"
        )
    
    # SSE 연결인지 확인
    is_sse_request = request.url.path.endswith('/sse')
    
    # SSE 연결 시 프로젝트 인증 정책 확인
    if is_sse_request and not project.sse_auth_required:
        logger.info(f"SSE connection allowed without auth for project {project_id}")
        return None  # 인증 없이 허용
    
    # 메시지 요청 시 프로젝트 인증 정책 확인
    if not is_sse_request and not project.message_auth_required:
        logger.info(f"Message request allowed without auth for project {project_id}")
        return None  # 인증 없이 허용
    
    # JWT 인증 시도
    user = await get_user_from_jwt_token(request, db)
    if not user:
        # API 키 인증 확인
        if hasattr(request.state, 'user') and request.state.user:
            user = request.state.user
            auth_type = "SSE" if is_sse_request else "Message"
            logger.info(f"Authenticated {auth_type} request via API key for project {project_id}, user={user.email}")
            return user
        
        auth_type = "SSE" if is_sse_request else "Message"
        logger.warning(f"{auth_type} authentication required but no valid token for project {project_id}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required"
        )
    
    logger.info(f"Authenticated SSE bridge request for project {project_id}, user={user.email}")
    return user


@router.get("/projects/{project_id}/servers/{server_name}/sse")
async def mcp_sse_bridge_endpoint(
    project_id: UUID,
    server_name: str,
    request: Request,
    db: Session = Depends(get_db)
):
    """
    MCP SSE Bridge 엔드포인트
    
    mcp-orch의 프로젝트별 URL 구조를 유지하면서
    python-sdk 표준 SSE Transport를 내부적으로 사용
    """
    
    try:
        # 사용자 인증
        current_user = await get_current_user_for_mcp_sse_bridge(request, project_id, db)
        
        if current_user:
            logger.info(f"MCP SSE Bridge connection: project_id={project_id}, server={server_name}, user={current_user.email}")
        else:
            logger.info(f"MCP SSE Bridge connection (no auth): project_id={project_id}, server={server_name}")
        
        # 서버 존재 확인
        server_record = db.query(McpServer).filter(
            and_(
                McpServer.project_id == project_id,
                McpServer.name == server_name,
                McpServer.is_enabled == True
            )
        ).first()
        
        if not server_record:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Server '{server_name}' not found or disabled in project {project_id}"
            )
        
        # Transport 가져오기
        transport = transport_manager.get_transport(str(project_id), server_name)
        
        logger.info(f"Starting MCP SSE Bridge for server {server_name} using python-sdk SseServerTransport")
        
        # python-sdk 표준 SSE 연결 사용
        async with transport.connect_sse(
            request.scope, 
            request.receive, 
            request._send
        ) as streams:
            read_stream, write_stream = streams
            
            # MCP 서버 세션 실행
            await run_mcp_bridge_session(
                read_stream, 
                write_stream, 
                project_id, 
                server_name, 
                server_record,
                request
            )
        
        # 빈 응답 반환 (python-sdk 예제에 따라)
        return Response()
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"MCP SSE Bridge error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"MCP SSE Bridge connection failed: {str(e)}"
        )


# POST 메시지 엔드포인트를 위한 ASGI 앱 생성
def create_post_message_handler(project_id: str, server_name: str):
    """프로젝트별 POST 메시지 핸들러 생성"""
    
    transport = transport_manager.get_transport(project_id, server_name)
    
    async def handle_post_message(scope, receive, send):
        """POST 메시지 처리 (python-sdk SseServerTransport 사용)"""
        try:
            await transport.handle_post_message(scope, receive, send)
        except Exception as e:
            logger.error(f"Error in POST message handler for {project_id}:{server_name}: {e}")
            # 에러 응답
            response = StarletteResponse("Internal Server Error", status_code=500)
            await response(scope, receive, send)
    
    return handle_post_message


@router.post("/projects/{project_id}/servers/{server_name}/messages")
async def mcp_bridge_post_messages(
    project_id: UUID,
    server_name: str,
    request: Request,
    db: Session = Depends(get_db)
):
    """
    MCP Bridge POST 메시지 엔드포인트
    
    python-sdk SseServerTransport의 handle_post_message를 활용
    """
    
    try:
        # 사용자 인증
        current_user = await get_current_user_for_mcp_sse_bridge(request, project_id, db)
        
        if current_user:
            logger.info(f"MCP Bridge POST message: project_id={project_id}, server={server_name}, user={current_user.email}")
        else:
            logger.info(f"MCP Bridge POST message (no auth): project_id={project_id}, server={server_name}")
        
        # 서버 존재 확인
        server_record = db.query(McpServer).filter(
            and_(
                McpServer.project_id == project_id,
                McpServer.name == server_name,
                McpServer.is_enabled == True
            )
        ).first()
        
        if not server_record:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Server '{server_name}' not found or disabled in project {project_id}"
            )
        
        # Transport 가져오기
        transport = transport_manager.get_transport(str(project_id), server_name)
        
        # python-sdk 표준 POST 메시지 처리 사용
        await transport.handle_post_message(
            request.scope,
            request.receive,
            request._send
        )
        
        # 응답은 transport가 직접 처리
        return Response(status_code=202)
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"MCP Bridge POST message error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"MCP Bridge POST message failed: {str(e)}"
        )


async def run_mcp_bridge_session(
    read_stream,
    write_stream, 
    project_id: UUID,
    server_name: str,
    server_record: McpServer,
    request: Request = None
):
    """
    MCP Bridge 세션 실행
    
    실제 MCP 서버의 도구를 로드하고 python-sdk Server 클래스로 프록시
    """
    
    logger.info(f"Starting MCP bridge session for {server_name}")
    
    # 클라이언트 세션 생성 및 관리
    from ..database import get_db_session
    from uuid import uuid4
    
    session_id = str(uuid4())
    user_agent = request.headers.get("user-agent") if request else None
    client_ip = None
    
    # IP 주소 추출
    if request:
        # X-Forwarded-For 헤더 확인 (프록시/로드밸런서 사용 시)
        forwarded_for = request.headers.get("x-forwarded-for")
        if forwarded_for:
            client_ip = forwarded_for.split(",")[0].strip()
        else:
            # 직접 연결인 경우 클라이언트 IP
            if hasattr(request, 'client') and request.client:
                client_ip = request.client.host
    
    # 클라이언트 타입 추정
    client_type = "unknown"
    if user_agent:
        if "cline" in user_agent.lower():
            client_type = "cline"
        elif "cursor" in user_agent.lower():
            client_type = "cursor"
        elif "vscode" in user_agent.lower():
            client_type = "vscode"
    
    logger.info(f"🔗 Creating session {session_id} for {client_type} client (IP: {client_ip})")
    
    # 데이터베이스 세션 생성
    db = get_db_session()
    client_session = None
    
    try:
        # ClientSession 생성
        client_session = ClientSession(
            id=session_id,
            client_type=client_type,
            server_id=str(server_record.id),
            project_id=project_id,
            user_agent=user_agent,
            ip_address=client_ip,
            is_active=True
        )
        
        db.add(client_session)
        db.commit()
        
        logger.info(f"✅ ClientSession created: {session_id}")
        
        # 서버 설정 구성
        server_config = _build_server_config_from_db(server_record)
        if not server_config:
            raise ValueError("Failed to build server configuration")
        
        # MCP Server 인스턴스 생성
        mcp_server = Server(f"mcp-orch-{server_name}")
        
        # 실제 MCP 서버에서 도구 목록 동적 로드
        @mcp_server.list_tools()
        async def list_tools():
            try:
                logger.info(f"Loading tools from actual MCP server: {server_name}")
                
                # 실제 MCP 서버에서 도구 목록 가져오기
                tools = await mcp_connection_service.get_server_tools(
                    str(server_record.id), 
                    server_config
                )
                
                if not tools:
                    logger.warning(f"No tools found for server {server_name}")
                    return []
                
                # python-sdk 형식으로 변환
                tool_list = []
                for tool in tools:
                    tool_obj = types.Tool(
                        name=tool.get("name", ""),
                        description=tool.get("description", ""),
                        inputSchema=tool.get("inputSchema", {
                            "type": "object",
                            "properties": {},
                            "required": []
                        })
                    )
                    tool_list.append(tool_obj)
                    logger.info(f"  - Loaded tool: {tool.get('name')}")
                
                logger.info(f"Successfully loaded {len(tool_list)} tools from {server_name}")
                return tool_list
                
            except Exception as e:
                logger.error(f"Error loading tools from {server_name}: {e}")
                # 에러 시 빈 도구 목록 반환
                return []
        
        # 도구 실행을 실제 서버로 프록시
        @mcp_server.call_tool()
        async def call_tool(name: str, arguments: dict):
            try:
                logger.info(f"Proxying tool call to {server_name}: {name} with arguments: {arguments}")
                
                # 도구 호출 로그용 데이터베이스 세션 생성
                tool_log_db = get_db_session()
                
                try:
                    # 세션 활동 업데이트
                    if client_session:
                        client_session.last_activity = datetime.utcnow()
                        client_session.total_calls += 1
                        db.commit()
                    
                    # 실제 MCP 서버로 도구 호출 전달 (ToolCallLog 수집 포함)
                    result = await mcp_connection_service.call_tool(
                        server_id=str(server_record.id),
                        server_config=server_config,
                        tool_name=name,
                        arguments=arguments,
                        session_id=session_id,
                        project_id=project_id,
                        user_agent=user_agent,
                        ip_address=client_ip,
                        db=tool_log_db
                    )
                    
                    # 성공 시 세션 통계 업데이트
                    if client_session:
                        client_session.successful_calls += 1
                        db.commit()
                    
                    logger.info(f"Tool call result from {server_name}: {result}")
                    
                    # 결과를 TextContent 형식으로 변환
                    if result:
                        result_text = str(result) if not isinstance(result, str) else result
                    else:
                        result_text = f"Tool '{name}' executed successfully"
                    
                    return [
                        types.TextContent(
                            type="text",
                            text=result_text
                        )
                    ]
                    
                except Exception as e:
                    # 실패 시 세션 통계 업데이트
                    if client_session:
                        client_session.failed_calls += 1
                        db.commit()
                    raise
                    
                finally:
                    tool_log_db.close()
                
            except Exception as e:
                logger.error(f"Error calling tool {name} on {server_name}: {e}")
                
                # 에러 시 에러 메시지 반환
                return [
                    types.TextContent(
                        type="text",
                        text=f"Error executing tool '{name}': {str(e)}"
                    )
                ]
        
        # MCP 서버 실행
        logger.info(f"Running MCP server for {server_name} with dynamic tool loading")
        await mcp_server.run(
            read_stream,
            write_stream,
            mcp_server.create_initialization_options()
        )
        
    except Exception as e:
        logger.error(f"Error in MCP bridge session: {e}")
        raise
        
    finally:
        # 세션 종료 처리
        if client_session and db:
            try:
                client_session.is_active = False
                client_session.disconnected_at = datetime.utcnow()
                db.commit()
                logger.info(f"🔌 ClientSession {session_id} disconnected")
            except Exception as e:
                logger.error(f"Error updating session on disconnect: {e}")
            finally:
                db.close()


# 이제 python-sdk Server 클래스가 모든 메시지 처리를 담당하므로
# 별도의 메시지 처리 함수는 필요 없음


def _build_server_config_from_db(server: McpServer) -> Optional[Dict[str, Any]]:
    """데이터베이스 서버 모델에서 설정 구성 (기존 로직 재사용)"""
    
    try:
        return {
            'id': server.id,
            'command': server.command,
            'args': server.args or [],
            'env': server.env or {},
            'timeout': server.timeout or 60,
            'transportType': server.transport_type or 'stdio',
            'disabled': not server.is_enabled
        }
    except Exception as e:
        logger.error(f"Error building server config: {e}")
        return None
"""
MCP 표준 SSE Transport 구현

MCP SDK 표준에 맞는 양방향 SSE Transport 구현.
Inspector "Not connected" 오류 해결을 위한 세션 기반 통신.
"""

import asyncio
import json
import logging
import uuid
from datetime import datetime
from typing import Dict, Any, Optional, AsyncGenerator
from uuid import UUID

from fastapi import APIRouter, Request, HTTPException, status, Depends, Query
from fastapi.responses import StreamingResponse, JSONResponse
from sqlalchemy.orm import Session
from sqlalchemy import and_

from ..database import get_db
from ..models import Project, McpServer, User
from .jwt_auth import get_user_from_jwt_token
from ..services.mcp_connection_service import mcp_connection_service

logger = logging.getLogger(__name__)

router = APIRouter(tags=["mcp-sse-transport"])

# 세션별 Transport 저장소 (MCP 표준)
sse_transports: Dict[str, 'MCPSSETransport'] = {}


class MCPSSETransport:
    """
    MCP 표준 SSE Transport 구현
    
    MCP SDK의 SSEServerTransport와 호환되는 양방향 통신 지원:
    - SSE 스트림을 통한 서버 → 클라이언트 통신
    - POST 요청을 통한 클라이언트 → 서버 통신  
    - 세션 ID 기반 연결 관리
    """
    
    def __init__(self, session_id: str, message_endpoint: str, server: McpServer, project_id: UUID):
        self.session_id = session_id
        self.message_endpoint = message_endpoint
        self.server = server
        self.project_id = project_id
        self.is_connected = False
        self.message_queue = asyncio.Queue()
        self.created_at = datetime.utcnow()
        
        logger.info(f"🚀 MCPSSETransport created: session={session_id}, server={server.name}")
        
    async def start_sse_stream(self) -> AsyncGenerator[str, None]:
        """
        SSE 스트림 시작 및 Inspector 표준 호환 endpoint 이벤트 전송
        
        Inspector 표준 시퀀스 (MCP SDK 준수):
        1. endpoint 이벤트 전송 (Inspector 형식: 단순 URL + sessionId)
        2. 메시지 큐 처리 루프 시작
        3. Keep-alive 관리
        """
        try:
            # 1. Inspector 표준 endpoint 이벤트 전송
            # Inspector proxy SSEClientTransport는 절대 URL을 기대함
            # 상대 경로 사용 시 origin 검증 실패로 transport.start() timeout 발생
            from urllib.parse import urlparse, parse_qs
            
            # Inspector proxy가 mcp-orch로 POST 요청을 보낼 실제 엔드포인트
            # mcp-orch의 실제 messages 라우트를 사용해야 함
            parsed = urlparse(self.message_endpoint)
            actual_message_endpoint = f"{parsed.path}?sessionId={self.session_id}"
            
            # Inspector 표준 형식: event: endpoint\ndata: URL\n\n
            yield f"event: endpoint\ndata: {actual_message_endpoint}\n\n"
            self.is_connected = True
            logger.info(f"✅ Sent Inspector-compatible endpoint event: {actual_message_endpoint}")
            logger.info(f"🎯 Inspector proxy will send POST to: {actual_message_endpoint}")
            
            # 2. 연결 안정화 대기
            await asyncio.sleep(0.1)
            
            # 3. 메시지 큐 처리 루프
            logger.info(f"🔄 Starting message queue loop for session {self.session_id}")
            keepalive_count = 0
            
            while self.is_connected:
                try:
                    # 메시지 대기 (30초 타임아웃)
                    message = await asyncio.wait_for(self.message_queue.get(), timeout=30.0)
                    
                    if message is None:  # 종료 신호
                        logger.info(f"📤 Received close signal for session {self.session_id}")
                        break
                        
                    # 메시지 전송
                    yield f"data: {json.dumps(message)}\n\n"
                    logger.debug(f"📤 Sent message to session {self.session_id}: {message.get('method', 'unknown')}")
                    
                except asyncio.TimeoutError:
                    # Keep-alive 전송
                    keepalive_count += 1
                    yield f": keepalive-{keepalive_count}\n\n"
                    
                    if keepalive_count % 10 == 0:
                        logger.debug(f"💓 Keepalive #{keepalive_count} for session {self.session_id}")
                        
        except asyncio.CancelledError:
            logger.info(f"🔌 SSE stream cancelled for session {self.session_id}")
            raise
        except Exception as e:
            logger.error(f"❌ Error in SSE stream {self.session_id}: {e}")
            # 오류 이벤트 전송
            error_event = {
                "jsonrpc": "2.0",
                "method": "notifications/error",
                "params": {
                    "code": -32000,
                    "message": f"SSE stream error: {str(e)}"
                }
            }
            yield f"data: {json.dumps(error_event)}\n\n"
        finally:
            await self.close()
        
    async def handle_post_message(self, request: Request) -> JSONResponse:
        """
        POST 메시지 처리 (세션 기반)
        
        MCP JSON-RPC 2.0 메시지 처리:
        - initialize: 초기화 핸드셰이크  
        - tools/list: 도구 목록 조회
        - tools/call: 도구 실행
        - notifications/*: 알림 처리
        """
        try:
            message = await request.json()
            method = message.get("method")
            request_id = message.get("id")
            
            logger.info(f"📥 Session {self.session_id} received: {method} (id={request_id})")
            logger.info(f"🔍 Full message content: {json.dumps(message, indent=2)}")
            
            # JSON-RPC 2.0 검증
            if message.get("jsonrpc") != "2.0":
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Invalid JSON-RPC version"
                )
            
            if not method:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Missing method field"
                )
            
            # 메서드별 처리
            if method == "initialize":
                return await self.handle_initialize(message)
            elif method == "tools/list":
                return await self.handle_tools_list(message)
            elif method == "tools/call":
                return await self.handle_tool_call(message)
            elif method.startswith("notifications/"):
                return await self.handle_notification(message)
            else:
                # 알 수 없는 메서드
                logger.warning(f"Unknown method received: {method}")
                error_response = {
                    "jsonrpc": "2.0",
                    "id": request_id,
                    "error": {
                        "code": -32601,
                        "message": f"Method not found: {method}"
                    }
                }
                return JSONResponse(content=error_response, status_code=200)
                
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"❌ Error processing message in session {self.session_id}: {e}")
            
            # JSON-RPC 오류 응답
            error_response = {
                "jsonrpc": "2.0",
                "id": message.get("id") if 'message' in locals() else None,
                "error": {
                    "code": -32000,
                    "message": f"Internal error: {str(e)}"
                }
            }
            return JSONResponse(content=error_response, status_code=200)
    
    async def handle_initialize(self, message: Dict[str, Any]) -> JSONResponse:
        """
        초기화 요청 처리 - Inspector Transport 연결 완료의 핵심
        
        MCP 표준 초기화 응답으로 Transport 상태를 "연결됨"으로 설정
        """
        request_id = message.get("id")
        params = message.get("params", {})
        
        logger.info(f"🎯 Processing initialize request for session {self.session_id}, id={request_id}")
        logger.info(f"🔍 Initialize params: {json.dumps(params, indent=2)}")
        
        # 실제 서버 기능 확인 - Inspector에서 의미 있는 정보 표시
        try:
            server_config = self._build_server_config()
            has_tools = server_config and server_config.get('is_enabled', True)
        except Exception:
            has_tools = False
            
        # MCP 표준 초기화 응답 (Inspector 완전 호환)
        response = {
            "jsonrpc": "2.0",
            "id": request_id,
            "result": {
                "protocolVersion": "2024-11-05",
                "capabilities": {
                    "tools": {} if has_tools else None,
                    "logging": {},
                    "prompts": None,
                    "resources": None
                },
                "serverInfo": {
                    "name": f"mcp-orch-{self.server.name}",
                    "version": "1.0.0"
                },
                "instructions": f"MCP Orchestrator proxy for '{self.server.name}' in project {self.project_id}. Use tools/list to see available tools."
            }
        }
        
        logger.info(f"✅ Initialize complete for session {self.session_id}")
        logger.info(f"🔍 Initialize response: {json.dumps(response, indent=2)}")
        logger.info(f"📋 Next step: Inspector Client should send 'notifications/initialized'")
        logger.info(f"✅ Inspector Transport should now be connected!")
        
        return JSONResponse(content=response)
    
    async def handle_tools_list(self, message: Dict[str, Any]) -> JSONResponse:
        """도구 목록 조회 처리 (필터링 적용)"""
        try:
            server_config = self._build_server_config()
            if not server_config:
                raise ValueError("Failed to build server configuration")
            
            # 🆕 필터링이 적용된 도구 목록 조회 (세션 매니저에서 자동 처리)
            tools = await mcp_connection_service.get_server_tools(str(self.server.id), server_config)
            
            response = {
                "jsonrpc": "2.0",
                "id": message.get("id"),
                "result": {
                    "tools": [
                        {
                            "name": tool.get("name"),
                            "description": tool.get("description", ""),
                            "inputSchema": tool.get("schema", tool.get("inputSchema", {
                                "type": "object",
                                "properties": {},
                                "required": []
                            }))
                        }
                        for tool in tools
                    ] if tools else []
                }
            }
            
            logger.info(f"📋 Sent {len(tools) if tools else 0} filtered tools for session {self.session_id}")
            return JSONResponse(content=response)
            
        except Exception as e:
            logger.error(f"❌ Tools list error in session {self.session_id}: {e}")
            
            error_response = {
                "jsonrpc": "2.0",
                "id": message.get("id"),
                "error": {
                    "code": -32000,
                    "message": f"Failed to list tools: {str(e)}"
                }
            }
            return JSONResponse(content=error_response)
    
    async def handle_tool_call(self, message: Dict[str, Any]) -> JSONResponse:
        """도구 호출 처리"""
        try:
            params = message.get("params", {})
            tool_name = params.get("name")
            arguments = params.get("arguments", {})
            
            if not tool_name:
                raise ValueError("Missing tool name")
            
            logger.info(f"🔧 Calling tool {tool_name} in session {self.session_id}")
            
            # 서버 설정 구성
            server_config = self._build_server_config()
            if not server_config:
                raise ValueError("Failed to build server configuration")
            
            # 도구 호출
            result = await mcp_connection_service.call_tool(
                str(self.server.id),
                server_config,
                tool_name,
                arguments
            )
            
            # 성공 응답
            response = {
                "jsonrpc": "2.0",
                "id": message.get("id"),
                "result": {
                    "content": [
                        {
                            "type": "text",
                            "text": str(result) if result else "Tool executed successfully"
                        }
                    ]
                }
            }
            
            logger.info(f"✅ Tool call successful: {tool_name} in session {self.session_id}")
            return JSONResponse(content=response)
            
        except Exception as e:
            logger.error(f"❌ Tool call error in session {self.session_id}: {e}")
            
            # 오류 응답
            error_response = {
                "jsonrpc": "2.0",
                "id": message.get("id"),
                "error": {
                    "code": -32000,
                    "message": f"Tool execution failed: {str(e)}"
                }
            }
            return JSONResponse(content=error_response)
    
    async def handle_notification(self, message: Dict[str, Any]) -> JSONResponse:
        """알림 메시지 처리"""
        method = message.get("method")
        logger.info(f"📢 Notification received in session {self.session_id}: {method}")
        
        # notifications/initialized 특별 처리 - Inspector 연결 완료 핵심
        if method == "notifications/initialized":
            logger.info(f"🎯 CRITICAL: notifications/initialized received for session {self.session_id}")
            logger.info(f"✅ Inspector MCP Client 초기화 핸드셰이크 완료!")
            logger.info(f"✅ Inspector UI에서 'Connected' 상태 표시되어야 함")
            
            # Inspector Transport 상태를 완전히 "연결됨"으로 설정
            # 이 시점에서 Inspector는 연결이 완료되었다고 인식해야 함
        
        # 기타 알림 처리
        elif method.startswith("notifications/"):
            logger.debug(f"📢 Standard notification: {method}")
        
        # 모든 알림은 202 Accepted 반환 (MCP 표준)
        return JSONResponse(content={"status": "accepted"}, status_code=202)
    
    def _build_server_config(self) -> Optional[Dict[str, Any]]:
        """데이터베이스 서버 모델에서 설정 구성"""
        try:
            return {
                'command': self.server.command,
                'args': self.server.args or [],
                'env': self.server.env or {},
                'timeout': self.server.timeout or 60,
                'transportType': self.server.transport_type or 'stdio',
                'disabled': not self.server.is_enabled
            }
        except Exception as e:
            logger.error(f"Error building server config: {e}")
            return None
    
    async def send_notification(self, notification: Dict[str, Any]):
        """서버에서 클라이언트로 알림 전송"""
        if self.is_connected:
            await self.message_queue.put(notification)
            logger.debug(f"📤 Queued notification for session {self.session_id}: {notification.get('method')}")
    
    async def close(self):
        """Transport 종료"""
        if self.is_connected:
            self.is_connected = False
            await self.message_queue.put(None)  # 종료 신호
            logger.info(f"🔌 Transport closed for session {self.session_id}")


async def get_current_user_for_mcp_sse(
    request: Request,
    project_id: UUID,
    db: Session = Depends(get_db)
) -> Optional[User]:
    """MCP SSE용 유연한 사용자 인증 (기존 로직 재사용)"""
    
    # 프로젝트 보안 설정 조회
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project not found"
        )
    
    # SSE 연결인지 확인
    is_sse_request = request.url.path.endswith('/sse')
    
    # SSE 연결 시 인증 정책 확인
    if is_sse_request and not project.sse_auth_required:
        logger.info(f"SSE connection allowed without auth for project {project_id}")
        return None
    
    # 인증이 필요한 경우 JWT 토큰 확인
    user = await get_user_from_jwt_token(request, db)
    if not user:
        if hasattr(request.state, 'user') and request.state.user:
            user = request.state.user
            logger.info(f"Authenticated SSE request via API key for project {project_id}, user={user.email}")
            return user
        
        logger.warning(f"SSE authentication required but no valid token for project {project_id}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required"
        )
    
    logger.info(f"Authenticated SSE request for project {project_id}, user={user.email}")
    return user


@router.get("/projects/{project_id}/servers/{server_name}/sse")
async def mcp_sse_endpoint(
    project_id: UUID,
    server_name: str,
    request: Request,
    db: Session = Depends(get_db)
):
    """
    MCP 표준 SSE 엔드포인트
    
    Inspector "Not connected" 오류 해결을 위한 MCP SDK 호환 구현:
    - 세션 ID 기반 연결 관리
    - 양방향 통신 지원 (SSE + POST)
    - MCP 표준 준수
    """
    try:
        # 1. 사용자 인증
        current_user = await get_current_user_for_mcp_sse(request, project_id, db)
        
        if current_user:
            logger.info(f"🔐 MCP SSE connection: project={project_id}, server={server_name}, user={current_user.email}")
        else:
            logger.info(f"🔓 MCP SSE connection (no auth): project={project_id}, server={server_name}")
        
        # 2. 서버 존재 확인
        server = db.query(McpServer).filter(
            and_(
                McpServer.project_id == project_id,
                McpServer.name == server_name,
                McpServer.is_enabled == True
            )
        ).first()
        
        if not server:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Server '{server_name}' not found or disabled in project {project_id}"
            )
        
        # 3. 세션 ID 생성
        session_id = str(uuid.uuid4())
        
        # 4. 메시지 엔드포인트 경로 생성 (절대 URI)
        base_url = str(request.base_url).rstrip('/')
        message_endpoint = f"{base_url}/projects/{project_id}/servers/{server_name}/messages"
        
        # 5. MCPSSETransport 생성 및 저장
        transport = MCPSSETransport(session_id, message_endpoint, server, project_id)
        sse_transports[session_id] = transport
        
        logger.info(f"🚀 Starting MCP SSE transport: session={session_id}, endpoint={message_endpoint}")
        
        # 6. SSE 스트림 시작
        async def sse_generator():
            try:
                async for chunk in transport.start_sse_stream():
                    yield chunk
            finally:
                # 정리
                if session_id in sse_transports:
                    del sse_transports[session_id]
                logger.info(f"🧹 Cleaned up transport for session {session_id}")
        
        return StreamingResponse(
            sse_generator(),
            media_type="text/event-stream",
            headers={
                # MCP 표준 SSE 헤더
                "Cache-Control": "no-cache, no-store, must-revalidate",
                "Connection": "keep-alive",
                "Content-Type": "text/event-stream; charset=utf-8",
                
                # CORS 헤더 (Inspector proxy 호환)
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Headers": "Content-Type, Authorization, Accept",
                "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
                "Access-Control-Expose-Headers": "Content-Type",
                
                # 세션 ID 전달 (디버깅용)
                "X-Session-ID": session_id,
                
                # SSE 최적화
                "X-Accel-Buffering": "no",
                "Pragma": "no-cache",
                "Expires": "0",
                "Transfer-Encoding": "chunked"
            }
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ MCP SSE error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"MCP SSE connection failed: {str(e)}"
        )


@router.post("/projects/{project_id}/servers/{server_name}/messages")
async def mcp_messages_endpoint(
    project_id: UUID,
    server_name: str,
    request: Request,
    sessionId: str = Query(..., description="MCP 세션 ID")
):
    """
    MCP 표준 메시지 엔드포인트 (세션 기반)
    
    Inspector "Not connected" 오류 해결:
    - 세션 ID를 통한 SSE 연결과 POST 요청 연결
    - MCP JSON-RPC 2.0 프로토콜 준수
    - Transport 객체를 통한 상태 관리
    """
    
    logger.info(f"📥 POST message for session: {sessionId}")
    
    try:
        # 1. 세션별 Transport 조회
        transport = sse_transports.get(sessionId)
        if not transport:
            logger.error(f"❌ Session {sessionId} not found")
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Session not found: {sessionId}"
            )
        
        # 2. 프로젝트/서버 검증
        if (transport.project_id != project_id or 
            transport.server.name != server_name):
            logger.error(f"❌ Session {sessionId} project/server mismatch")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Session project/server mismatch"
            )
        
        # 3. Transport를 통한 메시지 처리
        logger.info(f"✅ Routing message to transport for session {sessionId}")
        return await transport.handle_post_message(request)
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Error in MCP messages endpoint: {e}")
        
        # JSON-RPC 오류 응답
        error_response = {
            "jsonrpc": "2.0",
            "id": None,
            "error": {
                "code": -32000,
                "message": f"Message processing failed: {str(e)}"
            }
        }
        return JSONResponse(content=error_response, status_code=200)


# 유틸리티 함수들
async def get_active_sessions() -> Dict[str, Dict[str, Any]]:
    """활성 세션 정보 조회 (디버깅용)"""
    return {
        session_id: {
            "server_name": transport.server.name,
            "project_id": str(transport.project_id),
            "is_connected": transport.is_connected,
            "created_at": transport.created_at.isoformat(),
            "message_endpoint": transport.message_endpoint
        }
        for session_id, transport in sse_transports.items()
    }


async def cleanup_inactive_sessions():
    """비활성 세션 정리"""
    inactive_sessions = []
    
    for session_id, transport in sse_transports.items():
        if not transport.is_connected:
            inactive_sessions.append(session_id)
    
    for session_id in inactive_sessions:
        transport = sse_transports.get(session_id)
        if transport:
            await transport.close()
        del sse_transports[session_id]
        logger.info(f"🧹 Cleaned up inactive session: {session_id}")
    
    return len(inactive_sessions)
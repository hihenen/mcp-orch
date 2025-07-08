"""
표준 MCP SSE Transport 구현
Claude Code 호환성을 위한 정확한 MCP 프로토콜 구현
"""

import asyncio
import json
import logging
import uuid
from typing import Dict, Any, Optional, AsyncGenerator, List
from datetime import datetime
from uuid import UUID

from fastapi import APIRouter, Request, HTTPException, status, Depends, Query
from fastapi.responses import StreamingResponse, JSONResponse
from sqlalchemy.orm import Session
from sqlalchemy import and_

from ..database import get_db
from ..models import Project, McpServer, User
from ..models.mcp_server import McpServerStatus
from .jwt_auth import get_user_from_jwt_token
from ..services.mcp_connection_service import mcp_connection_service
from ..services.server_status_service import ServerStatusService

logger = logging.getLogger(__name__)

router = APIRouter(tags=["mcp-standard-sse"])

# 활성 SSE 연결 관리
active_sse_connections: Dict[str, Dict[str, Any]] = {}


async def get_current_user_for_mcp_sse(
    request: Request,
    project_id: UUID,
    db: Session = Depends(get_db)
) -> Optional[User]:
    """MCP SSE용 유연한 사용자 인증"""
    
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


@router.get("/projects/{project_id}/servers/{server_name}/standard/sse")
async def mcp_standard_sse_endpoint(
    project_id: UUID,
    server_name: str,
    request: Request,
    db: Session = Depends(get_db)
):
    """표준 MCP SSE 엔드포인트 - Claude Code 호환"""
    
    try:
        # 사용자 인증
        current_user = await get_current_user_for_mcp_sse(request, project_id, db)
        
        if current_user:
            logger.info(f"MCP SSE connection: project_id={project_id}, server={server_name}, user={current_user.email}")
        else:
            logger.info(f"MCP SSE connection (no auth): project_id={project_id}, server={server_name}")
        
        # 서버 존재 확인
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
        
        # SSE 연결 ID 생성
        connection_id = str(uuid.uuid4())
        
        logger.info(f"Starting MCP SSE stream for server {server_name}, connection {connection_id}")
        
        return StreamingResponse(
            generate_mcp_sse_stream(connection_id, project_id, server_name, server, request),
            media_type="text/event-stream",
            headers={
                # 표준 SSE 헤더 (Inspector 요구사항)
                "Cache-Control": "no-cache, no-store, must-revalidate",
                "Connection": "keep-alive",
                "Content-Type": "text/event-stream; charset=utf-8",
                
                # CORS 헤더 강화 (Inspector proxy 호환)
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Headers": "Content-Type, Authorization, Accept",
                "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
                "Access-Control-Expose-Headers": "Content-Type",
                
                # SSE 최적화 헤더
                "X-Accel-Buffering": "no",  # Nginx buffering 비활성화
                "Pragma": "no-cache",
                "Expires": "0",
                "Transfer-Encoding": "chunked"
            }
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"MCP SSE error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"MCP SSE connection failed: {str(e)}"
        )


async def generate_mcp_sse_stream(
    connection_id: str, 
    project_id: UUID, 
    server_name: str, 
    server: McpServer,
    request: Request = None
) -> AsyncGenerator[str, None]:
    """표준 MCP SSE 스트림 생성"""
    
    try:
        # 연결 정보 저장
        active_sse_connections[connection_id] = {
            "project_id": project_id,
            "server_name": server_name,
            "server": server,
            "created_at": datetime.utcnow(),
            "message_queue": asyncio.Queue()
        }
        
        logger.info(f"MCP SSE connection {connection_id} established")
        
        # 🔄 서버 상태 자동 업데이트: SSE 연결 시 ACTIVE로 설정
        try:
            await ServerStatusService.update_server_status_by_name(
                server_name=server_name,
                project_id=project_id,
                status=McpServerStatus.ACTIVE,
                connection_type="SSE_CONNECT"
            )
        except Exception as e:
            logger.error(f"❌ Failed to update server status on SSE connect: {e}")
        
        # 1. 연결 설정 완료 대기 (Inspector Transport 초기화 대기)
        await asyncio.sleep(0.1)
        
        # 2. endpoint 이벤트 전송 (표준 MCP 프로토콜)
        # Inspector 호환성을 위해 절대 URI 필요 (Inspector Transport 타임아웃 방지)
        # 동적 base URL 구성: 환경변수 우선, Request 기반 fallback
        import os
        base_url = os.getenv('MCP_SERVER_BASE_URL')
        if not base_url:
            base_url = f"{request.url.scheme}://{request.url.netloc}"
        
        endpoint_uri = f"{base_url}/projects/{project_id}/servers/{server_name}/messages"
        endpoint_event = {
            "jsonrpc": "2.0",
            "method": "endpoint",
            "params": {
                "uri": endpoint_uri
            }
        }
        
        # 3. SSE 형식으로 전송 (개행 중요!)
        yield f"data: {json.dumps(endpoint_event)}\n\n"
        logger.info(f"✅ Sent endpoint event: {endpoint_uri}")
        
        # 4. Transport 안정화 대기
        await asyncio.sleep(0.2)
        
        # 5. 추가 이벤트 전송 전 연결 확인
        yield f": connection-established\n\n"  # SSE 주석 이벤트
        logger.info(f"✅ Connection established signal sent for {connection_id}")
        
        # 6. Inspector 호환성 모드: initialized 이벤트 자동 전송
        # MCP 표준과 다르지만 Inspector가 initialize 요청을 보내지 않으므로 필요
        # Inspector는 endpoint 이벤트 후 서버 정보를 즉시 기대함
        logger.info(f"🔧 [INSPECTOR MODE] Sending automatic initialized event for server {server_name}")
        
        initialized_event = {
            "jsonrpc": "2.0",
            "method": "notifications/initialized",
            "params": {
                "protocolVersion": "2024-11-05",
                "capabilities": {
                    "tools": {},
                    "logging": {},
                    "prompts": {},
                    "resources": {}
                },
                "serverInfo": {
                    "name": "mcp-orch",
                    "version": "1.0.0"
                }
            }
        }
        yield f"data: {json.dumps(initialized_event)}\n\n"
        logger.info(f"✅ Sent initialized event for server {server_name}")
        
        # 7. 도구 목록도 즉시 전송 (Inspector 호환성)
        try:
            server_config = _build_server_config_from_db(server)
            if server_config:
                # Session manager가 기대하는 server_id 형식: "project_id.server_name"
                session_manager_server_id = f"{project_id}.{server_name}"
                tools = await mcp_connection_service.get_server_tools(session_manager_server_id, server_config)
                if tools:
                    tools_event = {
                        "jsonrpc": "2.0",
                        "method": "notifications/tools/list_changed",
                        "params": {
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
                            ]
                        }
                    }
                    yield f"data: {json.dumps(tools_event)}\n\n"
                    logger.info(f"✅ Sent {len(tools)} tools for server {server_name}")
        except Exception as e:
            logger.error(f"Failed to send tools list: {e}")
        
        # 8. 메시지 큐 처리 루프
        logger.info(f"Starting message queue loop for connection {connection_id}")
        connection_info = active_sse_connections[connection_id]
        message_queue = connection_info["message_queue"]
        keepalive_count = 0
        
        while True:
            try:
                # 큐에서 메시지 대기 (타임아웃 30초)
                message = await asyncio.wait_for(message_queue.get(), timeout=30.0)
                
                if message is None:  # 연결 종료 신호
                    break
                    
                # 메시지 전송
                yield f"data: {json.dumps(message)}\n\n"
                logger.debug(f"Sent message to connection {connection_id}: {message.get('method', 'unknown')}")
                
            except asyncio.TimeoutError:
                # Keep-alive 신호 전송 (mcp-inspector 스타일)
                keepalive_count += 1
                yield f": keepalive-{keepalive_count}\n\n"
                
                if keepalive_count % 10 == 0:
                    logger.debug(f"Sent keepalive #{keepalive_count} to connection {connection_id}")
                
    except asyncio.CancelledError:
        logger.info(f"MCP SSE connection {connection_id} cancelled")
        raise
    except Exception as e:
        logger.error(f"Error in MCP SSE stream {connection_id}: {e}")
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
        # 🔄 서버 상태 자동 업데이트: SSE 연결 해제 시 INACTIVE로 설정
        connection_info = active_sse_connections.get(connection_id)
        if connection_info:
            try:
                await ServerStatusService.update_server_status_by_name(
                    server_name=connection_info["server_name"],
                    project_id=connection_info["project_id"],
                    status=McpServerStatus.INACTIVE,
                    connection_type="SSE_DISCONNECT"
                )
            except Exception as e:
                logger.error(f"❌ Failed to update server status on SSE disconnect: {e}")
        
        # 연결 정리
        if connection_id in active_sse_connections:
            del active_sse_connections[connection_id]
        logger.info(f"MCP SSE connection {connection_id} closed")


@router.post("/projects/{project_id}/servers/{server_name}/standard/messages")
async def mcp_messages_endpoint(
    project_id: UUID,
    server_name: str,
    request: Request,
    db: Session = Depends(get_db)
):
    """표준 MCP 메시지 엔드포인트 - 도구 호출 처리"""
    
    # 진단용 로그 - Inspector "Not connected" 오류 추적
    logger.info(f"🚀 POST /messages received: project={project_id}, server={server_name}")
    logger.info(f"🚀 Request headers: {dict(request.headers)}")
    
    try:
        # 요청 본문 미리 확인 (Inspector initialize 요청 추적)
        body = await request.body()
        logger.info(f"🚀 Request body (raw): {body.decode()}")
        logger.info(f"✅ POST request successfully received by mcp-orch!")
    except Exception as e:
        logger.error(f"🚀 Failed to read request body: {e}")
        # body를 다시 읽기 위해 새 Request 객체 필요하므로 계속 진행
    
    try:
        # 사용자 인증
        current_user = await get_current_user_for_mcp_sse(request, project_id, db)
        
        # 요청 본문 파싱
        message = await request.json()
        
        logger.info(f"Received MCP message: method={message.get('method')}, id={message.get('id')}")
        
        # JSON-RPC 2.0 검증
        if message.get("jsonrpc") != "2.0":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid JSON-RPC version"
            )
        
        method = message.get("method")
        if not method:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Missing method field"
            )
        
        # 서버 존재 확인
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
                detail=f"Server '{server_name}' not found or disabled"
            )
        
        # 메서드별 처리 - initialize 최우선 처리 (Inspector "Not connected" 오류 방지)
        if method == "initialize":
            # 초기화는 즉시 응답 (Inspector Transport.start() 완료의 핵심)
            logger.info(f"🎯 Handling initialize request for server {server_name}, id={message.get('id')}")
            logger.info(f"✅ Initialize request received - Inspector Transport will connect!")
            return await handle_initialize(message)
        elif method == "tools/list":
            # 도구 목록도 즉시 응답
            return await handle_tools_list(server)
        elif method == "tools/call":
            return await handle_tool_call(message, server, project_id, server_name)
        elif method.startswith("notifications/"):
            # 알림 메시지는 202 Accepted 반환
            return JSONResponse(content={"status": "accepted"}, status_code=202)
        else:
            # 알 수 없는 메서드
            logger.warning(f"Unknown method received: {method}")
            error_response = {
                "jsonrpc": "2.0",
                "id": message.get("id"),
                "error": {
                    "code": -32601,
                    "message": f"Method not found: {method}"
                }
            }
            return JSONResponse(content=error_response, status_code=200)
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error processing MCP message: {e}")
        
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


async def handle_tool_call(message: Dict[str, Any], server: McpServer, project_id: UUID, server_name: str):
    """도구 호출 처리"""
    
    try:
        params = message.get("params", {})
        tool_name = params.get("name")
        arguments = params.get("arguments", {})
        
        if not tool_name:
            raise ValueError("Missing tool name")
        
        logger.info(f"Calling tool {tool_name} with arguments: {arguments}")
        
        # 서버 설정 구성
        server_config = _build_server_config_from_db(server)
        if not server_config:
            raise ValueError("Failed to build server configuration")
        
        # Session manager가 기대하는 server_id 형식: "project_id.server_name"
        session_manager_server_id = f"{project_id}.{server_name}"
        
        # 도구 호출
        result = await mcp_connection_service.call_tool(
            session_manager_server_id,
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
        
        logger.info(f"Tool call successful: {tool_name}")
        return JSONResponse(content=response)
        
    except Exception as e:
        logger.error(f"Tool call error: {e}")
        
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


async def handle_tools_list(server: McpServer):
    """도구 목록 조회 처리"""
    
    try:
        server_config = _build_server_config_from_db(server)
        if not server_config:
            raise ValueError("Failed to build server configuration")
        
        # Session manager가 기대하는 server_id 형식: "project_id.server_name"
        # server는 McpServer 객체이므로 project_id를 가져와서 사용
        session_manager_server_id = f"{server.project_id}.{server.name}"
        
        tools = await mcp_connection_service.get_server_tools(session_manager_server_id, server_config)
        
        response = {
            "jsonrpc": "2.0",
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
        
        return JSONResponse(content=response)
        
    except Exception as e:
        logger.error(f"Tools list error: {e}")
        
        error_response = {
            "jsonrpc": "2.0",
            "error": {
                "code": -32000,
                "message": f"Failed to list tools: {str(e)}"
            }
        }
        return JSONResponse(content=error_response)


async def handle_initialize(message: Dict[str, Any]):
    """초기화 요청 즉시 응답 처리 - Inspector Transport "Not connected" 오류 방지"""
    
    request_id = message.get("id")
    logger.info(f"🚀 Processing initialize request with id: {request_id}")
    
    # MCP 표준 초기화 응답 - 모든 capabilities 포함
    response = {
        "jsonrpc": "2.0",
        "id": request_id,  # 요청 ID 필수 매칭
        "result": {
            "protocolVersion": "2024-11-05",
            "capabilities": {
                "tools": {}, 
                "logging": {},
                "prompts": {},
                "resources": {}
            },
            "serverInfo": {
                "name": "mcp-orch",
                "version": "1.0.0"
            }
        }
    }
    
    logger.info(f"✅ Sending initialize response for id: {request_id}")
    logger.info(f"✅ Inspector Transport connection should complete now!")
    return JSONResponse(content=response)


def _build_server_config_from_db(server: McpServer) -> Optional[Dict[str, Any]]:
    """데이터베이스 서버 모델에서 설정 구성"""
    
    try:
        return {
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


async def send_message_to_sse_connections(project_id: UUID, server_name: str, message: Dict[str, Any]):
    """활성 SSE 연결에 메시지 전송"""
    
    sent_count = 0
    for connection_id, connection_info in active_sse_connections.items():
        if (connection_info["project_id"] == project_id and 
            connection_info["server_name"] == server_name):
            try:
                await connection_info["message_queue"].put(message)
                sent_count += 1
                logger.debug(f"Sent message to SSE connection {connection_id}")
            except Exception as e:
                logger.error(f"Failed to send message to SSE connection {connection_id}: {e}")
    
    logger.info(f"Sent message to {sent_count} SSE connections for {server_name}")
    return sent_count


# Claude Code 호환 개별 서버 Streamable HTTP 엔드포인트
@router.get("/projects/{project_id}/servers/{server_name}/mcp")
async def individual_streamable_http_endpoint(
    project_id: UUID,
    server_name: str,
    request: Request,
    sessionId: Optional[str] = Query(None, description="Session ID for Streamable HTTP connection"),
    db: Session = Depends(get_db)
):
    """개별 서버용 MCP Streamable HTTP GET 엔드포인트 - Claude Code 호환"""
    
    try:
        # 사용자 인증
        current_user = await get_current_user_for_mcp_sse(request, project_id, db)
        
        # 서버 존재 확인
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
        
        logger.info(f"🌊 Starting individual server Streamable HTTP: project={project_id}, server={server_name}")
        
        # SSE 스트림 생성기
        async def sse_stream():
            try:
                # 초기 연결 확인 메시지
                yield f"data: {json.dumps({'type': 'connection', 'status': 'connected'})}\\n\\n"
                
                # 서버 정보 전송
                yield f"data: {json.dumps({
                    'type': 'server_info',
                    'project_id': str(project_id),
                    'server_name': server_name,
                    'server_id': str(server.id)
                })}\\n\\n"
                
                # 준비 완료 신호
                yield f"data: {json.dumps({'type': 'ready', 'timestamp': datetime.utcnow().isoformat()})}\\n\\n"
                
                # 표준 keepalive (30초마다)
                keepalive_count = 0
                while True:
                    await asyncio.sleep(30)
                    keepalive_count += 1
                    yield f"data: {json.dumps({
                        'type': 'keepalive', 
                        'count': keepalive_count,
                        'timestamp': datetime.utcnow().isoformat()
                    })}\\n\\n"
                    
            except Exception as e:
                logger.error(f"❌ SSE stream error: {e}")
                yield f"data: {json.dumps({'type': 'error', 'message': str(e)})}\\n\\n"
        
        return StreamingResponse(
            sse_stream(),
            media_type="text/event-stream",
            headers={
                "Cache-Control": "no-cache",
                "Connection": "keep-alive",
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Headers": "*",
                "Access-Control-Allow-Methods": "GET, POST, DELETE"
            }
        )
        
    except Exception as e:
        logger.error(f"❌ Individual Streamable HTTP error: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Individual Streamable HTTP connection failed: {str(e)}"
        )


@router.post("/projects/{project_id}/servers/{server_name}/mcp")
async def individual_streamable_http_messages(
    project_id: UUID,
    server_name: str,
    request: Request,
    sessionId: Optional[str] = Query(None, description="Session ID from Streamable HTTP connection"),
    db: Session = Depends(get_db)
):
    """개별 서버용 MCP Streamable HTTP POST 엔드포인트 - Claude Code 호환"""
    
    try:
        # 사용자 인증
        current_user = await get_current_user_for_mcp_sse(request, project_id, db)
        
        # 서버 존재 확인
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
                detail=f"Server '{server_name}' not found or disabled"
            )
        
        # 요청 처리 로깅
        logger.info(f"🔧 Individual POST: project={project_id}, server={server_name}, sessionId={sessionId}")
        
        # 요청 바디 읽기 및 파싱
        request_body = await request.body()
        
        try:
            # JSON-RPC 메시지 파싱
            message = json.loads(request_body.decode('utf-8'))
            method = message.get('method')
            
            logger.info(f"🔧 Method: {method}, ID: {message.get('id')}")
            
            # 메서드별 빠른 처리
            if method == 'initialize':
                result = await handle_individual_initialize(message, project_id, server_name, server, sessionId)
            elif method == 'tools/list':
                result = await handle_individual_tools_list(message, project_id, server_name, server)
            elif method == 'tools/call':
                result = await handle_individual_tool_call(message, project_id, server_name, server)
            elif method == 'resources/list':
                result = await handle_individual_resources_list(message)
            elif method == 'resources/templates/list':
                result = await handle_individual_resources_templates_list(message)
            elif method.startswith('notifications/'):
                result = await handle_individual_notification(message)
            else:
                # 빠른 202 응답
                result = JSONResponse(
                    content={
                        "message": "Request accepted for processing",
                        "method": method,
                        "project_id": str(project_id),
                        "server_name": server_name,
                        "session_id": sessionId
                    },
                    status_code=202,
                    headers={
                        "Access-Control-Allow-Origin": "*",
                        "Access-Control-Allow-Headers": "*", 
                        "Access-Control-Allow-Methods": "GET, POST, DELETE"
                    }
                )
            
            # 처리 완료 로깅
            logger.info(f"✅ Individual POST completed: {method}")
            
            return result
                
        except json.JSONDecodeError as e:
            logger.error(f"❌ Invalid JSON in request body: {e}")
            raise HTTPException(
                status_code=400,
                detail=f"Invalid JSON: {str(e)}"
            )
        
    except Exception as e:
        logger.error(f"❌ Individual Streamable HTTP POST error: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Individual Streamable HTTP POST failed: {str(e)}"
        )


# 개별 서버용 핸들러 함수들
async def handle_individual_initialize(message: dict, project_id: UUID, server_name: str, server: McpServer, sessionId: Optional[str]) -> JSONResponse:
    """개별 서버 Initialize 요청 처리"""
    request_id = message.get("id")
    
    response = {
        "jsonrpc": "2.0",
        "id": request_id,
        "result": {
            "protocolVersion": "2024-11-05",
            "capabilities": {
                "tools": {},
                "logging": {}
            },
            "serverInfo": {
                "name": f"mcp-orch-{server_name}",
                "version": "1.0.0"
            },
            "instructions": f"Individual MCP server '{server_name}' in project {project_id}. Use tools/list to see available tools."
        }
    }
    
    logger.info(f"✅ Individual initialize complete for server {server_name}")
    return JSONResponse(
        content=response,
        headers={
            "mcp-session-id": sessionId or str(uuid.uuid4()),
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Headers": "*",
            "Access-Control-Allow-Methods": "GET, POST, DELETE"
        }
    )


async def handle_individual_tools_list(message: dict, project_id: UUID, server_name: str, server: McpServer) -> JSONResponse:
    """개별 서버 Tools/list 요청 처리"""
    try:
        server_config = _build_server_config_from_db(server)
        if not server_config:
            raise ValueError("Failed to build server configuration")
        
        # Session manager가 기대하는 server_id 형식: "project_id.server_name"
        session_manager_server_id = f"{project_id}.{server_name}"
        logger.info(f"🔍 Individual server - server: {server_name}, session_id: {session_manager_server_id}")
        
        # 필터링이 적용된 도구 목록 조회
        from ..services.mcp_connection_service import mcp_connection_service
        tools = await mcp_connection_service.get_server_tools(session_manager_server_id, server_config)
        
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
        
        logger.info(f"📋 Sent {len(tools) if tools else 0} filtered tools for individual server {server_name}")
        return JSONResponse(content=response)
        
    except Exception as e:
        logger.error(f"❌ Individual tools list error: {e}")
        
        error_response = {
            "jsonrpc": "2.0",
            "id": message.get("id"),
            "error": {
                "code": -32000,
                "message": f"Failed to list tools: {str(e)}"
            }
        }
        return JSONResponse(content=error_response)


async def handle_individual_tool_call(message: dict, project_id: UUID, server_name: str, server: McpServer) -> JSONResponse:
    """개별 서버 Tools/call 요청 처리"""
    try:
        params = message.get("params", {})
        tool_name = params.get("name")
        arguments = params.get("arguments", {})
        
        if not tool_name:
            raise ValueError("Missing tool name")
        
        logger.info(f"🔧 Individual tool call: {tool_name} on server {server_name}")
        
        # 서버 설정 구성
        server_config = _build_server_config_from_db(server)
        if not server_config:
            raise ValueError("Failed to build server configuration")
        
        # Session manager가 기대하는 server_id 형식: "project_id.server_name"
        session_manager_server_id = f"{project_id}.{server_name}"
        
        # 도구 호출
        from ..services.mcp_connection_service import mcp_connection_service
        result = await mcp_connection_service.call_tool(
            session_manager_server_id,
            server_config,
            tool_name,
            arguments
        )
        
        # 응답 형식 변환
        if isinstance(result, dict) and "content" in result:
            response_content = result["content"]
        else:
            response_content = [{"type": "text", "text": str(result) if result else "Tool executed successfully"}]
        
        response = {
            "jsonrpc": "2.0",
            "id": message.get("id"),
            "result": {"content": response_content}
        }
        
        logger.info(f"✅ Individual tool call completed: {tool_name} on server {server_name}")
        return JSONResponse(content=response)
        
    except Exception as e:
        logger.error(f"❌ Individual tool call error: {e}")
        
        error_response = {
            "jsonrpc": "2.0",
            "id": message.get("id"),
            "error": {
                "code": -32000,
                "message": f"Tool execution failed: {str(e)}"
            }
        }
        return JSONResponse(content=error_response)


async def handle_individual_resources_list(message: dict) -> JSONResponse:
    """개별 서버 Resources/list 요청 처리"""
    response = {
        "jsonrpc": "2.0",
        "id": message.get("id"),
        "result": {
            "resources": []
        }
    }
    return JSONResponse(content=response)


async def handle_individual_resources_templates_list(message: dict) -> JSONResponse:
    """개별 서버 Resources/templates/list 요청 처리"""
    response = {
        "jsonrpc": "2.0",
        "id": message.get("id"),
        "result": {
            "resourceTemplates": []
        }
    }
    return JSONResponse(content=response)


async def handle_individual_notification(message: dict) -> JSONResponse:
    """개별 서버 Notification 요청 처리"""
    method = message.get("method")
    logger.info(f"🔔 Individual notification: {method}")
    
    return JSONResponse(
        content={"message": "Notification processed"},
        status_code=202,
        headers={
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Headers": "*",
            "Access-Control-Allow-Methods": "GET, POST, DELETE"
        }
    )


# 호환성을 위한 추가 라우트 - SSE 연결 컨텍스트 기반 메시지 처리
@router.post("/messages")
async def mcp_messages_endpoint_compat(
    request: Request,
    session_id: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """호환성 메시지 엔드포인트 - 상대 경로 지원"""
    
    # 진단용 로그 - 호환성 엔드포인트 호출 기록 (Inspector 상대 경로 지원)
    logger.info(f"🚀 COMPAT POST /messages received")
    logger.info(f"🚀 Request headers: {dict(request.headers)}")
    
    try:
        # 요청 본문 미리 확인
        body = await request.body()
        logger.info(f"🚀 Request body (raw): {body.decode()}")
        logger.info(f"✅ Compatibility POST request successfully received!")
    except Exception as e:
        logger.error(f"🚀 Failed to read request body: {e}")
    
    try:
        # Referer 헤더에서 SSE 연결 정보 추출
        referer = request.headers.get("referer", "")
        logger.info(f"Compat messages endpoint called from referer: {referer}")
        
        # URL 파싱하여 project_id와 server_name 추출
        import re
        match = re.search(r'/projects/([^/]+)/servers/([^/]+)/sse', referer)
        if not match:
            # session_id로 찾기 시도
            if session_id:
                for conn_id, conn_info in active_sse_connections.items():
                    if conn_id == session_id:
                        project_id = conn_info["project_id"]
                        server_name = conn_info["server_name"]
                        break
                else:
                    raise HTTPException(
                        status_code=status.HTTP_404_NOT_FOUND,
                        detail="Session not found"
                    )
            else:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Unable to determine project context"
                )
        else:
            project_id = UUID(match.group(1))
            server_name = match.group(2)
        
        # 기존 메시지 엔드포인트로 전달
        return await mcp_messages_endpoint(project_id, server_name, request, db)
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error in compat messages endpoint: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Message processing failed: {str(e)}"
        )
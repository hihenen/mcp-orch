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

from fastapi import APIRouter, Request, HTTPException, status, Depends
from fastapi.responses import StreamingResponse, JSONResponse
from sqlalchemy.orm import Session
from sqlalchemy import and_

from ..database import get_db
from ..models import Project, McpServer, User
from .jwt_auth import get_user_from_jwt_token
from ..services.mcp_connection_service import mcp_connection_service

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


@router.get("/projects/{project_id}/servers/{server_name}/sse")
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
            generate_mcp_sse_stream(connection_id, project_id, server_name, server),
            media_type="text/event-stream",
            headers={
                "Cache-Control": "no-cache, no-store, must-revalidate",
                "Connection": "keep-alive",
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Headers": "*",
                "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
                "X-Accel-Buffering": "no",
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
    server: McpServer
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
        
        # 1. endpoint 이벤트 전송 (표준 MCP 프로토콜 - 절대 URI 필수)
        # mcp-inspector 호환성을 위해 절대 URI 사용
        endpoint_uri = f"http://localhost:8000/projects/{project_id}/servers/{server_name}/messages"
        endpoint_event = {
            "jsonrpc": "2.0",
            "method": "endpoint",
            "params": {
                "uri": endpoint_uri
            }
        }
        yield f"data: {json.dumps(endpoint_event)}\n\n"
        logger.info(f"Sent endpoint event with absolute URI: {endpoint_uri}")
        
        # 2. initialized 알림 전송
        initialized_event = {
            "jsonrpc": "2.0",
            "method": "notifications/initialized",
            "params": {
                "protocolVersion": "2024-11-05",
                "capabilities": {"tools": {}},
                "serverInfo": {
                    "name": f"mcp-orch-{server_name}",
                    "version": "1.0.0"
                }
            }
        }
        yield f"data: {json.dumps(initialized_event)}\n\n"
        logger.info(f"Sent initialized event for server {server_name}")
        
        # 3. 도구 목록 가져오기 및 전송
        try:
            server_config = _build_server_config_from_db(server)
            if server_config:
                tools = await mcp_connection_service.get_server_tools(str(server.id), server_config)
                
                if tools:
                    # tools/list_changed 알림 전송 (표준 MCP 프로토콜)
                    tools_event = {
                        "jsonrpc": "2.0",
                        "method": "notifications/tools/list_changed",
                        "params": {
                            "tools": [
                                {
                                    "name": tool.get("name"),
                                    "description": tool.get("description", ""),
                                    "inputSchema": tool.get("inputSchema", {
                                        "type": "object",
                                        "properties": {},
                                        "required": []
                                    })
                                }
                                for tool in tools
                            ]
                        }
                    }
                    yield f"data: {json.dumps(tools_event)}\n\n"
                    
                    logger.info(f"Sent {len(tools)} tools for server {server_name}")
                else:
                    logger.warning(f"No tools found for server {server_name}")
            else:
                logger.error(f"Failed to build server config for {server_name}")
                
        except Exception as e:
            logger.error(f"Error loading tools for server {server_name}: {e}")
        
        # 4. 메시지 큐 처리 루프
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
        # 연결 정리
        if connection_id in active_sse_connections:
            del active_sse_connections[connection_id]
        logger.info(f"MCP SSE connection {connection_id} closed")


@router.post("/projects/{project_id}/servers/{server_name}/messages")
async def mcp_messages_endpoint(
    project_id: UUID,
    server_name: str,
    request: Request,
    db: Session = Depends(get_db)
):
    """표준 MCP 메시지 엔드포인트 - 도구 호출 처리"""
    
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
        
        # 메서드별 처리 - initialize 최우선 처리
        if method == "initialize":
            # 초기화는 즉시 응답 (mcp-inspector 연결 상태 해결의 핵심)
            logger.info(f"Handling initialize request for server {server_name}")
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
        
        # 도구 호출
        result = await mcp_connection_service.call_tool(
            str(server.id),
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
        
        tools = await mcp_connection_service.get_server_tools(str(server.id), server_config)
        
        response = {
            "jsonrpc": "2.0",
            "result": {
                "tools": [
                    {
                        "name": tool.get("name"),
                        "description": tool.get("description", ""),
                        "inputSchema": tool.get("inputSchema", {
                            "type": "object",
                            "properties": {},
                            "required": []
                        })
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
    """초기화 요청 즉시 응답 처리 - mcp-inspector 연결 상태 해결"""
    
    logger.info(f"Processing initialize request with id: {message.get('id')}")
    
    # MCP 표준 초기화 응답 - 모든 capabilities 포함
    response = {
        "jsonrpc": "2.0",
        "id": message.get("id"),  # 요청 ID 필수 포함
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
    
    logger.info(f"Sending initialize response for id: {message.get('id')}")
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


# 호환성을 위한 추가 라우트 - SSE 연결 컨텍스트 기반 메시지 처리
@router.post("/messages")
async def mcp_messages_endpoint_compat(
    request: Request,
    session_id: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """호환성 메시지 엔드포인트 - 상대 경로 지원"""
    
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
"""
MCP HTTP 엔드포인트 정의
SSE 및 메시지 처리 라우터
"""

import logging
import json
from typing import Dict, Any

from fastapi import APIRouter, Request, HTTPException, status, Depends
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from ...database import get_db
from .common import get_current_user_for_standard_mcp
from .mcp_auth_manager import McpAuthManager
from .mcp_sse_manager import McpSseManager
from .mcp_protocol_handler import McpProtocolHandler
from .fastmcp_integration import FastMcpIntegration

logger = logging.getLogger(__name__)

router = APIRouter(tags=["standard-mcp"])

# 모듈 인스턴스 생성
auth_manager = McpAuthManager()
sse_manager = McpSseManager()
protocol_handler = McpProtocolHandler()
fastmcp_integration = FastMcpIntegration()


@router.get("/projects/{project_id}/servers/{server_name}/sse")
@router.post("/projects/{project_id}/servers/{server_name}/sse")
async def standard_mcp_sse_endpoint(
    project_id: str,
    server_name: str,
    request: Request,
    db: Session = Depends(get_db)
):
    """표준 MCP SSE 엔드포인트"""
    try:
        # 인증 및 권한 확인
        user, project, server = await auth_manager.authenticate_for_server(
            request, project_id, server_name, db
        )
        
        # 서버 설정 구성
        server_config = {
            'command': server.command,
            'args': server.args or [],
            'env': server.env or {},
            'timeout': 30,
            'is_enabled': server.is_enabled
        }
        
        if not server_config.get('is_enabled', True):
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail=f"Server '{server_name}' is disabled"
            )
        
        # SSE 세션 생성
        session_id = sse_manager.create_sse_session(
            project_id, server_name, server_config, str(user.id)
        )
        
        logger.info(f"Starting SSE stream for session {session_id}")
        
        # FastMCP 사용 가능한 경우 FastMCP 처리
        if fastmcp_integration.is_available():
            return await _handle_sse_with_fastmcp(session_id, server_name, request)
        else:
            return await _handle_sse_manual_fallback(session_id, request)
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"SSE endpoint error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="SSE connection failed"
        )


async def _handle_sse_with_fastmcp(session_id: str, server_name: str, request: Request):
    """FastMCP를 사용한 SSE 처리"""
    
    async def fastmcp_event_stream():
        try:
            # FastMCP 서버 생성
            fastmcp_server = fastmcp_integration.get_or_create_server(server_name)
            if not fastmcp_server:
                yield f"data: {json.dumps({'error': 'FastMCP server creation failed'})}\n\n"
                return
            
            # 연결 확인
            yield f"data: {json.dumps({'type': 'connection', 'status': 'connected', 'mode': 'fastmcp'})}\n\n"
            
            # 초기화 메시지
            init_response = protocol_handler.create_initialize_response(0)
            yield f"data: {json.dumps(init_response)}\n\n"
            
            # initialized 알림
            initialized_notification = protocol_handler.create_notification("notifications/initialized")
            yield f"data: {json.dumps(initialized_notification)}\n\n"
            
            # Keepalive 루프
            import asyncio
            last_keepalive = asyncio.get_event_loop().time()
            
            while True:
                current_time = asyncio.get_event_loop().time()
                
                # Keepalive 전송
                if current_time - last_keepalive >= 30:
                    yield f"data: {json.dumps({'type': 'keepalive', 'timestamp': current_time})}\n\n"
                    last_keepalive = current_time
                
                # 클라이언트 연결 확인
                if await request.is_disconnected():
                    logger.info(f"Client disconnected for FastMCP session {session_id}")
                    break
                
                await asyncio.sleep(1)
                
        except Exception as e:
            logger.error(f"FastMCP SSE error: {e}")
            yield f"data: {json.dumps({'error': str(e)})}\n\n"
    
    return StreamingResponse(
        fastmcp_event_stream(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "Access-Control-Allow-Origin": "*",
        }
    )


async def _handle_sse_manual_fallback(session_id: str, request: Request):
    """수동 구현을 사용한 SSE 처리"""
    return await sse_manager.create_sse_stream(session_id, request)


@router.post("/messages/")
async def standard_mcp_messages(
    request: Request,
    db: Session = Depends(get_db)
):
    """표준 MCP 메시지 처리 엔드포인트"""
    try:
        # 세션 ID 추출
        session_id = request.query_params.get('session_id')
        logger.info(f"Processing MCP message for session: {session_id}")
        
        # 요청 본문 읽기
        body = await request.body()
        if not body:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Empty message body"
            )
        
        # 메시지 파싱
        try:
            raw_message = body.decode('utf-8')
            message = protocol_handler.parse_message(raw_message)
        except Exception as e:
            logger.error(f"Message parsing failed: {e}")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid message format"
            )
        
        # 세션 기반 처리
        if session_id:
            return await _handle_session_based_message(session_id, message)
        else:
            return await _handle_generic_message(message)
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Message processing error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Message processing failed"
        )


async def _handle_session_based_message(session_id: str, message: Dict[str, Any]):
    """세션 기반 메시지 처리"""
    session_info = sse_manager.get_session_info(session_id)
    if not session_info:
        logger.warning(f"Session {session_id} not found")
        return _create_generic_response(message)
    
    # 세션의 서버 이름 가져오기
    server_name = session_info.get('server_name')
    
    # FastMCP 처리 시도
    if fastmcp_integration.is_available() and server_name:
        fastmcp_response = await fastmcp_integration.handle_fastmcp_message(
            server_name, message
        )
        if fastmcp_response:
            return fastmcp_response
    
    # SSE 매니저를 통한 처리
    response = await sse_manager.handle_client_message(session_id, message)
    return response or _create_generic_response(message)


async def _handle_generic_message(message: Dict[str, Any]):
    """일반 메시지 처리"""
    method = message.get("method")
    message_id = message.get("id")
    
    # 표준 메서드 처리
    response = protocol_handler.handle_standard_methods(message)
    if response:
        return response
    
    # 기본 응답 생성
    return _create_generic_response(message)


def _create_generic_response(message: Dict[str, Any]):
    """기본 응답 생성"""
    method = message.get("method")
    message_id = message.get("id")
    
    if method == "initialize":
        return protocol_handler.create_initialize_response(message_id)
    elif method == "tools/list":
        # 하드코딩된 도구 목록 반환
        tools = fastmcp_integration.tool_manager.get_available_tools(use_hardcoded=True)
        return protocol_handler.create_tools_list_response(message_id, tools)
    elif method == "tools/call":
        # 기본 도구 호출 처리
        params = message.get("params", {})
        tool_name = params.get("name", "")
        arguments = params.get("arguments", {})
        
        try:
            content = fastmcp_integration.tool_manager.create_mock_tool_response(
                tool_name, arguments
            )
            return protocol_handler.create_tool_call_response(message_id, content)
        except Exception as e:
            return protocol_handler.create_internal_error_response(
                message_id, str(e)
            )
    else:
        return protocol_handler.create_method_not_found_response(message_id, method)


# 상태 확인 엔드포인트
@router.get("/status")
async def get_mcp_status():
    """MCP 시스템 상태 확인"""
    return {
        "status": "operational",
        "fastmcp_available": fastmcp_integration.is_available(),
        "session_statistics": sse_manager.get_session_statistics(),
        "fastmcp_servers": fastmcp_integration.get_all_servers_info()
    }
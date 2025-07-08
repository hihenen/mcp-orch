"""
HTTP Routes for Unified MCP Transport

Defines the FastAPI endpoints for unified MCP server access.
"""

import asyncio
import json
import logging
import uuid
from datetime import datetime
from typing import Optional, Dict, List
from uuid import UUID

from fastapi import APIRouter, Request, Depends, Query, HTTPException
from fastapi.responses import StreamingResponse, JSONResponse
from sqlalchemy.orm import Session
from sqlalchemy import and_

from ....database import get_db
from ....models import McpServer
from .auth import get_current_user_for_unified_mcp
from .transport import UnifiedMCPTransport
from ...mcp_sse_transport import sse_transports


logger = logging.getLogger(__name__)

router = APIRouter(tags=["unified-mcp"])



async def handle_initialize_request(message: dict, project_id: UUID, sessionId: Optional[str], db) -> JSONResponse:
    """Initialize 요청 처리 (SSE 구현과 동일한 로직)"""
    request_id = message.get("id")
    params = message.get("params", {})
    
    logger.info(f"🎯 Processing initialize request for project {project_id}, id={request_id}")
    
    # 프로젝트의 활성 서버들 조회
    project_servers = db.query(McpServer).filter(
        and_(
            McpServer.project_id == project_id,
            McpServer.is_enabled == True
        )
    ).all()
    
    # MCP 표준 초기화 응답 (Claude Code 호환)
    capabilities = {
        "logging": {}
    }
    
    # tools가 있는 경우에만 capabilities에 추가
    if project_servers:
        capabilities["tools"] = {}
    
    response = {
        "jsonrpc": "2.0",
        "id": request_id,
        "result": {
            "protocolVersion": "2024-11-05",
            "capabilities": capabilities,
            "serverInfo": {
                "name": f"mcp-orch-unified-{project_id}",
                "version": "1.0.0"
            },
            "instructions": f"Unified MCP server for project {project_id} with {len(project_servers)} active servers. Use tools/list to see available tools."
        }
    }
    
    logger.info(f"✅ Initialize complete for project {project_id}")
    return JSONResponse(
        content=response,
        headers={
            "mcp-session-id": sessionId or str(uuid.uuid4()),
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Headers": "*",
            "Access-Control-Allow-Methods": "GET, POST, DELETE"
        }
    )



async def handle_tools_list_request(message: dict, project_id: UUID, db) -> JSONResponse:
    """Tools/list 요청 처리"""
    try:
        # 프로젝트의 활성 서버들 조회
        project_servers = db.query(McpServer).filter(
            and_(
                McpServer.project_id == project_id,
                McpServer.is_enabled == True
            )
        ).all()
        
        logger.info(f"📋 Tools/list for {len(project_servers)} servers")
        
        all_tools = []
        
        # 각 서버에서 도구 목록 병렬로 가져오기
        from ....services.mcp_connection_service import mcp_connection_service
        
        # 서버별 도구 로딩 태스크 생성
        server_tasks = []
        for server_record in project_servers:
            server_config = {
                "command": server_record.command,
                "args": server_record.args or [],
                "env": server_record.env or {},
                "timeout": server_record.timeout,
                "is_enabled": server_record.is_enabled
            }
            
            task = asyncio.create_task(
                mcp_connection_service.get_server_tools(str(server_record.id), server_config)
            )
            server_tasks.append((server_record, task))
        
        # 모든 서버에서 도구 목록 병렬 수집 (Facade 패턴 - 필터링 자동 적용)
        for server_record, task in server_tasks:
            try:
                # mcp_connection_service를 통해 필터링이 자동 적용된 도구 목록 받기
                filtered_tools = await task
                
                # 네임스페이스 추가 (서버명 접두사) - 이미 필터링된 도구들
                for tool in filtered_tools:
                    namespaced_name = f"{server_record.name}__{tool.get('name', 'unknown')}"
                    all_tools.append({
                        "name": namespaced_name,
                        "description": f"[{server_record.name}] {tool.get('description', 'No description')}",
                        "inputSchema": tool.get("inputSchema", tool.get("schema", {
                            "type": "object",
                            "properties": {},
                            "required": []
                        }))
                    })
                
            except Exception as e:
                logger.error(f"❌ Failed to load tools from server {server_record.name}: {e}")
                continue
        
        response = {
            "jsonrpc": "2.0",
            "id": message.get("id"),
            "result": {
                "tools": all_tools
            }
        }
        
        logger.info(f"📋 Sent {len(all_tools)} filtered tools")
        return JSONResponse(content=response)
        
    except Exception as e:
        logger.error(f"❌ Tools list error: {e}")
        
        error_response = {
            "jsonrpc": "2.0",
            "id": message.get("id"),
            "error": {
                "code": -32000,
                "message": f"Failed to list tools: {str(e)}"
            }
        }
        return JSONResponse(content=error_response)


async def handle_tools_call_request(message: dict, project_id: UUID, db) -> JSONResponse:
    """Tools/call 요청 처리"""
    tool_name = None
    try:
        params = message.get("params", {})
        tool_name = params.get("name")
        arguments = params.get("arguments", {})
        
        if not tool_name:
            raise ValueError("Missing tool name")
        
        logger.info(f"🔧 Tools/call: {tool_name}")
        
        # 네임스페이스 파싱 (서버명__도구명)
        if "__" not in tool_name:
            raise ValueError(f"Invalid tool name format: {tool_name} (expected server__tool format)")
        
        server_name, actual_tool_name = tool_name.split("__", 1)
        
        # 프로젝트의 활성 서버들 조회
        target_server = db.query(McpServer).filter(
            and_(
                McpServer.project_id == project_id,
                McpServer.name == server_name,
                McpServer.is_enabled == True
            )
        ).first()
        
        if not target_server:
            error_response = {
                "jsonrpc": "2.0",
                "id": message.get("id"),
                "error": {
                    "code": -32000,
                    "message": f"Server '{server_name}' not found or disabled"
                }
            }
            return JSONResponse(content=error_response)
        
        # 서버 설정 구성
        server_config = {
            "command": target_server.command,
            "args": target_server.args or [],
            "env": target_server.env or {},
            "timeout": target_server.timeout or 30,
            "is_enabled": target_server.is_enabled
        }
        
        # 도구 호출
        from ....services.mcp_connection_service import mcp_connection_service
        
        result = await mcp_connection_service.call_tool(
            str(target_server.id),
            server_config,
            actual_tool_name,
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
        
        logger.info(f"✅ Tool call completed: {tool_name}")
        return JSONResponse(content=response)
        
    except Exception as e:
        logger.error(f"❌ Tool call error for {tool_name}: {e}")
        
        error_response = {
            "jsonrpc": "2.0",
            "id": message.get("id"),
            "error": {
                "code": -32000,
                "message": f"Tool execution failed: {str(e)}"
            }
        }
        return JSONResponse(content=error_response)


async def handle_resources_list_request(message: dict, project_id: UUID, db) -> JSONResponse:
    """Resources/list 요청 처리 - 현재는 빈 목록 반환"""
    try:
        logger.info(f"📁 Processing resources/list for project {project_id}")
        
        # 현재는 resources를 지원하지 않으므로 빈 목록 반환
        response = {
            "jsonrpc": "2.0",
            "id": message.get("id"),
            "result": {
                "resources": []
            }
        }
        
        logger.info(f"📁 Sent empty resources list")
        return JSONResponse(content=response)
        
    except Exception as e:
        logger.error(f"❌ Resources list error: {e}")
        
        error_response = {
            "jsonrpc": "2.0",
            "id": message.get("id"),
            "error": {
                "code": -32000,
                "message": f"Failed to list resources: {str(e)}"
            }
        }
        return JSONResponse(content=error_response)


async def handle_resources_templates_list_request(message: dict, project_id: UUID, db) -> JSONResponse:
    """Resources/templates/list 요청 처리 - Claude Code 호환성"""
    try:
        logger.info(f"📋 Processing resources/templates/list for project {project_id}")
        
        # Claude Code는 resource templates를 요청하는데, 우리는 지원하지 않으므로 빈 목록 반환
        response = {
            "jsonrpc": "2.0",
            "id": message.get("id"),
            "result": {
                "resourceTemplates": []
            }
        }
        
        logger.info(f"📋 Sent empty resource templates list")
        return JSONResponse(content=response)
        
    except Exception as e:
        logger.error(f"❌ Resource templates list error: {e}")
        
        error_response = {
            "jsonrpc": "2.0",
            "id": message.get("id"),
            "error": {
                "code": -32000,
                "message": f"Failed to list resource templates: {str(e)}"
            }
        }
        return JSONResponse(content=error_response)


async def handle_notification_request(message: dict) -> JSONResponse:
    """Notification 요청 처리"""
    method = message.get("method")
    logger.info(f"🔔 Processing notification: {method}")
    
    # notifications/initialized는 단순히 성공 응답
    if method == "notifications/initialized":
        logger.info(f"✅ Client initialized notification received")
    
    # 알림은 응답이 필요하지 않으므로 202 Accepted
    return JSONResponse(
        content={"message": "Notification processed"},
        status_code=202,
        headers={
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Headers": "*",
            "Access-Control-Allow-Methods": "GET, POST, DELETE"
        }
    )


@router.get("/projects/{project_id}/unified/sse")
async def unified_mcp_endpoint(
    request: Request,
    project_id: UUID,
    _legacy: Optional[bool] = Query(False, description="Enable legacy mode for compatibility"),
    current_user = Depends(get_current_user_for_unified_mcp),
    db: Session = Depends(get_db)
):
    """
    통합 MCP SSE endpoint - 프로젝트의 모든 활성 서버를 하나로 통합
    
    Features:
    - 단일 연결로 모든 프로젝트 서버 접근
    - 네임스페이스 기반 툴 라우팅
    - 서버별 에러 격리
    - Inspector 완벽 호환
    
    Args:
        project_id: Project UUID
        _legacy: Enable legacy mode for client compatibility
        current_user: Authenticated user
        db: Database session
        
    Returns:
        SSE stream for MCP communication
    """
    # 세션 ID 생성
    session_id = str(uuid.uuid4())
    
    # 프로젝트의 활성 서버들 조회
    project_servers = db.query(McpServer).filter(
        and_(
            McpServer.project_id == project_id,
            McpServer.is_enabled == True
        )
    ).all()
    
    logger.info(f"🎯 Starting unified MCP session: project={project_id}, user={current_user.email}, servers={len(project_servers)}")
    
    # 메시지 엔드포인트 구성 (Inspector proxy가 사용할 경로)
    base_url = str(request.url).split('/sse')[0]
    message_endpoint = f"{base_url}/messages"
    
    # UnifiedMCPTransport 인스턴스 생성
    transport = UnifiedMCPTransport(
        session_id=session_id,
        message_endpoint=message_endpoint,
        project_servers=project_servers,
        project_id=project_id
    )
    
    # 레거시 모드 설정
    if _legacy:
        transport._legacy_mode = True
        logger.info(f"🔧 Legacy mode enabled for session {session_id}")
    
    # 전역 세션 레지스트리에 등록
    sse_transports[session_id] = transport
    
    logger.info(f"✅ Unified MCP transport registered: session={session_id}, servers={[s.name for s in project_servers if s.is_enabled]}")
    
    async def cleanup():
        """Clean up on connection close"""
        logger.info(f"🧹 Cleaning up unified session {session_id}")
        await transport.cleanup()
        if session_id in sse_transports:
            del sse_transports[session_id]
        logger.info(f"✅ Unified session {session_id} cleaned up")
    
    # SSE 스트림 반환
    return StreamingResponse(
        transport.start_sse_stream(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",  # Nginx buffering 비활성화
            "Access-Control-Allow-Origin": "*",
        },
        background=cleanup
    )


@router.get("/projects/{project_id}/unified/mcp")
@router.get("/projects/{project_id}/unified/streamable")
async def unified_streamable_http_endpoint(
    request: Request,
    project_id: UUID,
    sessionId: Optional[str] = Query(None, description="Session ID for Streamable HTTP connection"),
    _legacy: Optional[bool] = Query(False, description="Enable legacy mode for compatibility"),
    current_user = Depends(get_current_user_for_unified_mcp),
    db: Session = Depends(get_db)
):
    """
    Standard MCP Streamable HTTP endpoint - 프로젝트의 모든 활성 서버를 통합
    
    Python SDK의 StreamableHTTPServerTransport를 완전히 준수하여
    Claude Code와 같은 표준 MCP 클라이언트와 호환되도록 구현
    
    Features:
    - 단일 연결로 모든 프로젝트 서버 접근
    - 네임스페이스 기반 툴 라우팅  
    - 서버별 에러 격리
    - 표준 MCP Streamable HTTP 프로토콜 완벽 지원
    
    Args:
        project_id: Project UUID
        _legacy: Enable legacy mode for client compatibility
        current_user: Authenticated user
        db: Database session
        
    Returns:
        Standard Streamable HTTP connection for MCP communication
    """
    try:
        # 프로젝트의 활성 서버들 조회
        project_servers = db.query(McpServer).filter(
            and_(
                McpServer.project_id == project_id,
                McpServer.is_enabled == True
            )
        ).all()
        
        logger.info(f"🌊 Starting unified Streamable HTTP: project={project_id}, servers={len(project_servers)}")
        
        # SSE 스트림 생성기
        async def sse_stream():
            try:
                # 초기 연결 확인 메시지
                yield f"data: {json.dumps({'type': 'connection', 'status': 'connected'})}\n\n"
                
                # 서버 정보 전송
                yield f"data: {json.dumps({
                    'type': 'server_info',
                    'project_id': str(project_id),
                    'servers': [s.name for s in project_servers if s.is_enabled],
                    'total_servers': len(project_servers)
                })}\n\n"
                
                # 준비 완료 신호
                yield f"data: {json.dumps({'type': 'ready', 'timestamp': datetime.utcnow().isoformat()})}\n\n"
                
                # 표준 keepalive (30초마다)
                keepalive_count = 0
                while True:
                    await asyncio.sleep(30)
                    keepalive_count += 1
                    yield f"data: {json.dumps({
                        'type': 'keepalive', 
                        'count': keepalive_count,
                        'timestamp': datetime.utcnow().isoformat()
                    })}\n\n"
                    
            except Exception as e:
                logger.error(f"❌ SSE stream error: {e}")
                yield f"data: {json.dumps({'type': 'error', 'message': str(e)})}\n\n"
        
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
        logger.error(f"❌ Unified Streamable HTTP error: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Unified Streamable HTTP connection failed: {str(e)}"
        )


@router.post("/projects/{project_id}/unified/mcp")
async def unified_streamable_http_messages(
    request: Request,
    project_id: UUID,
    sessionId: Optional[str] = Query(None, description="Session ID from Streamable HTTP connection"),
    current_user = Depends(get_current_user_for_unified_mcp),
    db: Session = Depends(get_db)
):
    """
    통합 MCP Streamable HTTP 메시지 처리 endpoint
    
    Claude Code 호환을 위해 JSON-RPC 메시지 처리 및 응답
    
    Args:
        project_id: Project UUID
        sessionId: Session ID from Streamable HTTP connection (optional for initial requests)
        current_user: Authenticated user
        db: Database session
        
    Returns:
        JSON response with MCP message processing result
    """
    try:
        # 요청 처리 로깅
        logger.info(f"🔧 POST: project={project_id}, sessionId={sessionId}")
        
        # 요청 바디 읽기 및 파싱
        request_body = await request.body()
        
        try:
            # JSON-RPC 메시지 파싱
            message = json.loads(request_body.decode('utf-8'))
            method = message.get('method')
            
            logger.info(f"🔧 Method: {method}, ID: {message.get('id')}")
            
            # 메서드별 빠른 처리
            if method == 'initialize':
                result = await handle_initialize_request(message, project_id, sessionId, db)
            elif method == 'tools/list':
                result = await handle_tools_list_request(message, project_id, db)
            elif method == 'tools/call':
                result = await handle_tools_call_request(message, project_id, db)
            elif method == 'resources/list':
                result = await handle_resources_list_request(message, project_id, db)
            elif method == 'resources/templates/list':
                result = await handle_resources_templates_list_request(message, project_id, db)
            elif method.startswith('notifications/'):
                result = await handle_notification_request(message)
            else:
                # 빠른 202 응답
                result = JSONResponse(
                    content={
                        "message": "Request accepted for processing",
                        "method": method,
                        "project_id": str(project_id),
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
            logger.info(f"✅ POST completed: {method}")
            
            return result
                
        except json.JSONDecodeError as e:
            logger.error(f"❌ Invalid JSON in request body: {e}")
            raise HTTPException(
                status_code=400,
                detail=f"Invalid JSON: {str(e)}"
            )
        
    except Exception as e:
        logger.error(f"❌ Unified Streamable HTTP POST error: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Unified Streamable HTTP POST failed: {str(e)}"
        )


@router.post("/projects/{project_id}/unified/messages")
async def unified_mcp_messages_endpoint(
    request: Request,
    project_id: UUID,
    sessionId: str = Query(..., description="Session ID from SSE connection"),
    current_user = Depends(get_current_user_for_unified_mcp),
    db: Session = Depends(get_db)
):
    """
    통합 MCP 메시지 처리 endpoint (SSE)
    
    Inspector proxy가 이 endpoint로 POST 요청을 보냄.
    
    Args:
        project_id: Project UUID
        sessionId: Session ID from SSE connection
        current_user: Authenticated user
        db: Database session
        
    Returns:
        JSON response or 202 Accepted for async processing
    """
    # 세션 검증
    if sessionId not in sse_transports:
        logger.warning(f"❌ Invalid session ID for unified messages: {sessionId}")
        return {"error": "Invalid session"}, 400
    
    transport = sse_transports[sessionId]
    
    # 프로젝트 ID 검증
    if str(transport.project_id) != str(project_id):
        logger.warning(f"❌ Project ID mismatch: {transport.project_id} != {project_id}")
        return {"error": "Project ID mismatch"}, 403
    
    # 메시지 처리 위임
    return await transport.handle_post_message(request)


@router.delete("/projects/{project_id}/unified/mcp")
async def unified_streamable_http_delete(
    request: Request,
    project_id: UUID,
    sessionId: Optional[str] = Query(None, description="Session ID for Streamable HTTP connection"),
    current_user = Depends(get_current_user_for_unified_mcp),
    db: Session = Depends(get_db)
):
    """
    통합 MCP Streamable HTTP 세션 종료 endpoint
    
    Args:
        project_id: Project UUID
        sessionId: Session ID for Streamable HTTP connection
        current_user: Authenticated user
        db: Database session
        
    Returns:
        200 OK on successful session termination
    """
    if not sessionId:
        logger.warning(f"❌ Missing session ID for unified Streamable HTTP DELETE")
        return {"error": "Missing session ID"}, 400
        
    if sessionId not in sse_transports:
        logger.warning(f"❌ Invalid session ID for unified Streamable HTTP DELETE: {sessionId}")
        return {"error": "Invalid session"}, 404
    
    transport = sse_transports[sessionId]
    
    # 프로젝트 ID 검증
    if str(transport.project_id) != str(project_id):
        logger.warning(f"❌ Project ID mismatch: {transport.project_id} != {project_id}")
        return {"error": "Project ID mismatch"}, 403
    
    # 세션 정리
    try:
        logger.info(f"🧹 Terminating unified session {sessionId}")
        await transport.cleanup()
        if sessionId in sse_transports:
            del sse_transports[sessionId]
        logger.info(f"✅ Unified session {sessionId} terminated")
        
        return {"message": "Session terminated successfully"}
        
    except Exception as e:
        logger.error(f"❌ Error terminating session {sessionId}: {e}")
        return {"error": f"Error terminating session: {str(e)}"}, 500


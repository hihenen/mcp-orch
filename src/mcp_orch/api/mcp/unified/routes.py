"""
HTTP Routes for Unified MCP Transport

Defines the FastAPI endpoints for unified MCP server access.
"""

import logging
import uuid
from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Request, Depends, Query
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from sqlalchemy import and_

from ....database import get_db
from ....models import McpServer
from .auth import get_current_user_for_unified_mcp
from .transport import UnifiedMCPTransport
from ...mcp_sse_transport import sse_transports


logger = logging.getLogger(__name__)

router = APIRouter(tags=["unified-mcp"])


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


@router.post("/projects/{project_id}/unified/messages")
async def unified_mcp_messages_endpoint(
    request: Request,
    project_id: UUID,
    sessionId: str = Query(..., description="Session ID from SSE connection"),
    current_user = Depends(get_current_user_for_unified_mcp),
    db: Session = Depends(get_db)
):
    """
    통합 MCP 메시지 처리 endpoint
    
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
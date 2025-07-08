"""
Fast Claude Code Compatible Routes
간단하고 빠른 Claude Code 호환 라우트
"""

import asyncio
import json
import logging
from datetime import datetime
from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Request, Depends, Query
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from sqlalchemy import and_

from ....database import get_db
from ....models import McpServer
from .auth import get_current_user_for_unified_mcp

logger = logging.getLogger(__name__)

router = APIRouter(tags=["fast-unified-mcp"])


@router.get("/projects/{project_id}/unified/mcp/fast")
async def fast_streamable_http_endpoint(
    request: Request,
    project_id: UUID,
    sessionId: Optional[str] = Query(None, description="Session ID for Streamable HTTP connection"),
    current_user = Depends(get_current_user_for_unified_mcp),
    db: Session = Depends(get_db)
):
    """
    ⚡ 초고속 Claude Code 호환 Streamable HTTP endpoint
    
    Features:
    - 즉시 응답 (블로킹 없음)
    - 간단한 SSE 스트림
    - Claude Code 연결 최적화
    """
    try:
        # 프로젝트의 활성 서버들 조회 (최소한의 쿼리)
        project_servers = db.query(McpServer).filter(
            and_(
                McpServer.project_id == project_id,
                McpServer.is_enabled == True
            )
        ).all()
        
        logger.info(f"⚡ Fast unified MCP GET: project={project_id}, servers={len(project_servers)}")
        
        # 즉시 SSE 스트림 시작 (절대 블로킹 없음)
        async def ultra_fast_sse():
            try:
                # 즉시 준비 완료 신호 (Claude Code가 기다리는 것)
                yield f"data: {json.dumps({'type': 'connection', 'status': 'ready', 'timestamp': datetime.utcnow().isoformat()})}\n\n"
                
                # 서버 정보 (즉시)
                yield f"data: {json.dumps({
                    'type': 'server_info',
                    'project_id': str(project_id),
                    'servers': [s.name for s in project_servers],
                    'total_servers': len(project_servers),
                    'status': 'ready'
                })}\n\n"
                
                # Claude Code에게 "이제 POST 요청을 보내세요" 신호
                yield f"data: {json.dumps({'type': 'ready', 'message': 'Ready for POST requests'})}\n\n"
                
                # 표준 keepalive (30초마다)
                count = 0
                while True:
                    await asyncio.sleep(30)
                    count += 1
                    yield f"data: {json.dumps({'type': 'keepalive', 'count': count})}\n\n"
                    
            except Exception as e:
                logger.error(f"❌ Ultra fast SSE error: {e}")
                yield f"data: {json.dumps({'type': 'error', 'message': str(e)})}\n\n"
        
        return StreamingResponse(
            ultra_fast_sse(),
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
        logger.error(f"❌ Ultra fast endpoint error: {e}")
        return StreamingResponse(
            iter([f"data: {json.dumps({'type': 'error', 'message': str(e)})}\n\n"]),
            media_type="text/event-stream"
        )
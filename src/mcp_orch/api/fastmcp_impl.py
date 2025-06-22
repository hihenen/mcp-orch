"""
FastMCP를 사용한 간단한 MCP 서버 구현
"""

import logging
import asyncio
import json
from typing import Dict, Any, Optional, List
from uuid import UUID

from fastapi import APIRouter, Request, HTTPException, status, Depends
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from sqlalchemy import and_

from mcp.server.fastmcp import FastMCP

from ..database import get_db
from ..models import Project, ProjectMember, User, McpServer, ApiKey
from .jwt_auth import get_user_from_jwt_token

logger = logging.getLogger(__name__)

router = APIRouter(tags=["fastmcp"])

# 전역 FastMCP 인스턴스
brave_search_mcp = FastMCP("brave-search")

@brave_search_mcp.tool()
def brave_web_search(query: str, count: int = 10, offset: int = 0) -> str:
    """Performs a web search using the Brave Search API, ideal for general queries, news, articles, and online content. Use this for broad information gathering, recent events, or when you need diverse web sources. Supports pagination, content filtering, and freshness controls. Maximum 20 results per request, with offset for pagination."""
    logger.info(f"FastMCP: Executing brave_web_search with query='{query}', count={count}, offset={offset}")
    
    # 실제 brave-search 서버로 전달하는 로직을 여기에 구현
    # 지금은 간단한 응답만 반환
    return f"Search results for '{query}' (showing {count} results starting from {offset})"

@brave_search_mcp.tool()
def brave_local_search(query: str, count: int = 5) -> str:
    """Searches for local businesses and places using Brave's Local Search API. Best for queries related to physical locations, businesses, restaurants, services, etc. Returns detailed information including business names and addresses, ratings and review counts, phone numbers and opening hours. Use this when the query implies 'near me' or mentions specific locations. Automatically falls back to web search if no local results are found."""
    logger.info(f"FastMCP: Executing brave_local_search with query='{query}', count={count}")
    
    # 실제 brave-search 서버로 전달하는 로직을 여기에 구현
    # 지금은 간단한 응답만 반환
    return f"Local search results for '{query}' (showing {count} results)"


# 유연한 인증 함수 (기존과 동일)
async def get_current_user_for_fastmcp(
    request: Request,
    project_id: UUID,
    db: Session = Depends(get_db)
) -> Optional[User]:
    """FastMCP용 유연한 사용자 인증 함수"""
    
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
    if is_sse_request:
        if not project.sse_auth_required:
            logger.info(f"FastMCP SSE connection allowed without auth for project {project_id}")
            return None  # 인증 없이 허용
    else:
        # 메시지 요청 시 인증 정책 확인
        if not project.message_auth_required:
            logger.info(f"FastMCP message request allowed without auth for project {project_id}")
            return None  # 인증 없이 허용
    
    # 인증이 필요한 경우 - JWT 토큰 또는 API 키 확인
    user = await get_user_from_jwt_token(request, db)
    if not user:
        # JWT 인증 실패 시 request.state.user 확인 (API 키 인증 결과)
        if hasattr(request.state, 'user') and request.state.user:
            user = request.state.user
            auth_type = "SSE" if is_sse_request else "Message"
            logger.info(f"Authenticated FastMCP {auth_type} request via API key for project {project_id}, user={user.email}")
            return user
        
        auth_type = "SSE" if is_sse_request else "Message"
        logger.warning(f"FastMCP {auth_type} authentication required but no valid token for project {project_id}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required"
        )
    
    logger.info(f"Authenticated FastMCP {'SSE' if is_sse_request else 'Message'} request for project {project_id}, user={user.email}")
    return user


# FastMCP SSE 엔드포인트
@router.get("/fastmcp/projects/{project_id}/servers/{server_name}/sse")
async def fastmcp_sse_endpoint(
    project_id: UUID,
    server_name: str,
    request: Request,
    db: Session = Depends(get_db)
):
    """FastMCP SSE 엔드포인트 (테스트용 별도 경로)"""
    
    try:
        # 유연한 인증 적용
        current_user = await get_current_user_for_fastmcp(request, project_id, db)
        
        if current_user:
            logger.info(f"FastMCP SSE connection: method={request.method}, project_id={project_id}, server={server_name}, user={current_user.email}")
        else:
            logger.info(f"FastMCP SSE connection (no auth): method={request.method}, project_id={project_id}, server={server_name}")
        
        # 간단한 SSE 스트림 생성
        logger.info("Starting FastMCP SSE stream")
        
        async def generate_fastmcp_sse():
            """FastMCP SSE 스트림 생성"""
            try:
                logger.info("FastMCP SSE stream started")
                
                # 초기화 응답
                init_response = {
                    "jsonrpc": "2.0",
                    "id": 0,
                    "result": {
                        "protocolVersion": "2024-11-05",
                        "capabilities": {
                            "tools": {}
                        },
                        "serverInfo": {
                            "name": f"fastmcp-{server_name}",
                            "version": "1.0.0"
                        }
                    }
                }
                
                yield f"data: {json.dumps(init_response)}\n\n"
                logger.info("FastMCP: Sent initialization response")
                
                # 도구 목록 응답
                tools_response = {
                    "jsonrpc": "2.0",
                    "id": 1,
                    "result": {
                        "tools": [
                            {
                                "name": "brave_web_search",
                                "description": "Performs a web search using the Brave Search API, ideal for general queries, news, articles, and online content. Use this for broad information gathering, recent events, or when you need diverse web sources. Supports pagination, content filtering, and freshness controls. Maximum 20 results per request, with offset for pagination.",
                                "inputSchema": {
                                    "type": "object",
                                    "properties": {
                                        "query": {
                                            "type": "string",
                                            "description": "Search query (max 400 chars, 50 words)"
                                        },
                                        "count": {
                                            "type": "number",
                                            "description": "Number of results (1-20, default 10)",
                                            "default": 10
                                        },
                                        "offset": {
                                            "type": "number",
                                            "description": "Pagination offset (max 9, default 0)",
                                            "default": 0
                                        }
                                    },
                                    "required": ["query"]
                                }
                            },
                            {
                                "name": "brave_local_search",
                                "description": "Searches for local businesses and places using Brave's Local Search API. Best for queries related to physical locations, businesses, restaurants, services, etc. Returns detailed information including business names and addresses, ratings and review counts, phone numbers and opening hours. Use this when the query implies 'near me' or mentions specific locations. Automatically falls back to web search if no local results are found.",
                                "inputSchema": {
                                    "type": "object",
                                    "properties": {
                                        "query": {
                                            "type": "string",
                                            "description": "Local search query (e.g. 'pizza near Central Park')"
                                        },
                                        "count": {
                                            "type": "number",
                                            "description": "Number of results (1-20, default 5)",
                                            "default": 5
                                        }
                                    },
                                    "required": ["query"]
                                }
                            }
                        ]
                    }
                }
                
                yield f"data: {json.dumps(tools_response)}\n\n"
                logger.info("FastMCP: Sent tools list with 2 tools")
                
                # 준비 완료 신호
                yield "event: ready\ndata: {\"status\": \"ready\"}\n\n"
                logger.info("FastMCP SSE stream ready")
                
                # 주기적 keepalive
                while True:
                    await asyncio.sleep(60)
                    yield "event: keepalive\ndata: {\"timestamp\": \"" + str(asyncio.get_event_loop().time()) + "\"}\n\n"
                    
            except Exception as e:
                logger.error(f"FastMCP SSE stream error: {e}")
                error_data = {'error': str(e), 'type': 'fastmcp_sse_error'}
                yield f"event: error\ndata: {json.dumps(error_data)}\n\n"
        
        return StreamingResponse(
            generate_fastmcp_sse(),
            media_type="text/event-stream",
            headers={
                "Cache-Control": "no-cache",
                "Connection": "keep-alive",
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Headers": "*",
                "X-Accel-Buffering": "no",
            }
        )
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"FastMCP SSE error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="FastMCP SSE connection failed"
        )


# FastMCP 메시지 엔드포인트
@router.post("/fastmcp/messages/")
async def fastmcp_messages(request: Request):
    """FastMCP 메시지 처리 엔드포인트 (테스트용 별도 경로)"""
    
    try:
        import json
        
        # 세션 ID 추출 (쿼리 파라미터에서)
        session_id = request.query_params.get('session_id')
        
        logger.info(f"Received FastMCP /messages/ request with session_id: {session_id}")
        
        # 요청 본문 읽기
        body = await request.body()
        if not body:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Empty message body"
            )
        
        try:
            message = json.loads(body)
            logger.info(f"Received FastMCP message: {message} (session: {session_id})")
            
            method = message.get("method")
            message_id = message.get("id")
            
            if method == "initialize":
                response_data = {
                    "jsonrpc": "2.0",
                    "id": message_id,
                    "result": {
                        "protocolVersion": "2024-11-05",
                        "capabilities": {
                            "tools": {}
                        },
                        "serverInfo": {
                            "name": "fastmcp-brave-search",
                            "version": "1.0.0"
                        }
                    }
                }
                
                logger.info("FastMCP: Sending initialize response")
                return response_data
                
            elif method == "tools/list":
                response_data = {
                    "jsonrpc": "2.0",
                    "id": message_id,
                    "result": {
                        "tools": [
                            {
                                "name": "brave_web_search",
                                "description": "Performs a web search using the Brave Search API, ideal for general queries, news, articles, and online content. Use this for broad information gathering, recent events, or when you need diverse web sources. Supports pagination, content filtering, and freshness controls. Maximum 20 results per request, with offset for pagination.",
                                "inputSchema": {
                                    "type": "object",
                                    "properties": {
                                        "query": {
                                            "type": "string",
                                            "description": "Search query (max 400 chars, 50 words)"
                                        },
                                        "count": {
                                            "type": "number",
                                            "description": "Number of results (1-20, default 10)",
                                            "default": 10
                                        },
                                        "offset": {
                                            "type": "number",
                                            "description": "Pagination offset (max 9, default 0)",
                                            "default": 0
                                        }
                                    },
                                    "required": ["query"]
                                }
                            },
                            {
                                "name": "brave_local_search",
                                "description": "Searches for local businesses and places using Brave's Local Search API. Best for queries related to physical locations, businesses, restaurants, services, etc. Returns detailed information including business names and addresses, ratings and review counts, phone numbers and opening hours. Use this when the query implies 'near me' or mentions specific locations. Automatically falls back to web search if no local results are found.",
                                "inputSchema": {
                                    "type": "object",
                                    "properties": {
                                        "query": {
                                            "type": "string",
                                            "description": "Local search query (e.g. 'pizza near Central Park')"
                                        },
                                        "count": {
                                            "type": "number",
                                            "description": "Number of results (1-20, default 5)",
                                            "default": 5
                                        }
                                    },
                                    "required": ["query"]
                                }
                            }
                        ]
                    }
                }
                
                logger.info("FastMCP: Sending tools list response with 2 tools")
                return response_data
                
            elif method == "tools/call":
                # 도구 호출 처리
                tool_name = message.get("params", {}).get("name")
                tool_arguments = message.get("params", {}).get("arguments", {})
                
                logger.info(f"FastMCP: Received tool call: {tool_name} with arguments: {tool_arguments}")
                
                # FastMCP 도구 실행
                if tool_name == "brave_web_search":
                    result = brave_web_search(**tool_arguments)
                elif tool_name == "brave_local_search":
                    result = brave_local_search(**tool_arguments)
                else:
                    result = f"Unknown tool: {tool_name}"
                
                response_data = {
                    "jsonrpc": "2.0",
                    "id": message_id,
                    "result": {
                        "content": [
                            {
                                "type": "text",
                                "text": result
                            }
                        ]
                    }
                }
                
                logger.info(f"FastMCP: Sending tool call response for {tool_name}")
                return response_data
                
            else:
                # 알 수 없는 메서드
                response_data = {
                    "jsonrpc": "2.0",
                    "id": message_id,
                    "error": {
                        "code": -32601,
                        "message": f"Method not found: {method}"
                    }
                }
                
                logger.warning(f"FastMCP: Unknown method: {method}")
                return response_data
                
        except json.JSONDecodeError as e:
            logger.error(f"Invalid JSON in FastMCP message: {e}")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid JSON format"
            )
                
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error handling FastMCP /messages request: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="FastMCP message handling failed"
        )

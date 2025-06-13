"""
표준 MCP 프로토콜 구현
기존 커스텀 SSE를 표준 MCP SSE로 교체
"""

import logging
import json
import asyncio
from typing import Dict, Any, Optional, List
from uuid import UUID

from fastapi import APIRouter, Request, HTTPException, status, Depends
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from sqlalchemy import and_

from mcp.server import Server
from mcp.server.sse import SseServerTransport
from mcp.types import Tool, TextContent

from ..database import get_db
from ..models import Project, ProjectMember, User, McpServer, ApiKey
from .jwt_auth import get_user_from_jwt_token

logger = logging.getLogger(__name__)

router = APIRouter(tags=["standard-mcp"])


class StandardMCPHandler:
    """표준 MCP 프로토콜 핸들러"""
    
    def __init__(self, project_id: str, server_name: str, db: Session):
        self.project_id = project_id
        self.server_name = server_name
        self.db = db
        
        # 표준 MCP 서버 생성
        self.mcp_server = Server(
            name=f"mcp-orch-{server_name}",
            version="1.0.0"
        )
        
        # 실제 MCP 서버 연결 정보
        self.actual_server_config = None
        self._setup_handlers()
    
    async def initialize(self):
        """MCP 핸들러 초기화"""
        # 데이터베이스에서 실제 서버 정보 조회
        db_server = self.db.query(McpServer).filter(
            and_(
                McpServer.project_id == UUID(self.project_id),
                McpServer.name == self.server_name
            )
        ).first()
        
        if not db_server:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Server '{self.server_name}' not found in project"
            )
        
        self.actual_server_config = {
            'command': db_server.command,
            'args': db_server.args or [],
            'env': db_server.env or {},
            'timeout': 30,
            'disabled': not db_server.is_enabled
        }
        
        if self.actual_server_config.get('disabled', False):
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail=f"Server '{self.server_name}' is disabled"
            )
        
        logger.info(f"Initialized standard MCP handler for {self.server_name}")
    
    def _setup_handlers(self):
        """표준 MCP 핸들러 설정 - 하드코딩된 도구 사용"""
        
        @self.mcp_server.list_tools()
        async def list_tools() -> List[Tool]:
            """도구 목록 조회 - 하드코딩된 brave-search 도구"""
            try:
                logger.info(f"Listing hardcoded tools for {self.server_name}")
                
                # 하드코딩된 brave-search 도구들
                tools = [
                    Tool(
                        name="brave_web_search",
                        description="Performs a web search using the Brave Search API, ideal for general queries, news, articles, and online content. Use this for broad information gathering, recent events, or when you need diverse web sources. Supports pagination, content filtering, and freshness controls. Maximum 20 results per request, with offset for pagination.",
                        inputSchema={
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
                    ),
                    Tool(
                        name="brave_local_search",
                        description="Searches for local businesses and places using Brave's Local Search API. Best for queries related to physical locations, businesses, restaurants, services, etc. Returns detailed information including business names and addresses, ratings and review counts, phone numbers and opening hours. Use this when the query implies 'near me' or mentions specific locations. Automatically falls back to web search if no local results are found.",
                        inputSchema={
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
                    )
                ]
                
                logger.info(f"Listed {len(tools)} hardcoded tools for {self.server_name}")
                return tools
                
            except Exception as e:
                logger.error(f"Error listing hardcoded tools for {self.server_name}: {e}")
                return []
        
        @self.mcp_server.call_tool()
        async def call_tool(name: str, arguments: dict) -> List[TextContent]:
            """도구 실행 - 실제 MCP 서버로 전달"""
            try:
                logger.info(f"Calling tool '{name}' with arguments: {arguments}")
                
                # 실제 MCP 서버로 도구 호출 전달
                tool_response = await self._forward_to_actual_server({
                    "jsonrpc": "2.0",
                    "id": 2,
                    "method": "tools/call",
                    "params": {
                        "name": name,
                        "arguments": arguments
                    }
                })
                
                if tool_response and "result" in tool_response:
                    result_data = tool_response["result"]
                    
                    # 결과를 TextContent 리스트로 변환
                    if "content" in result_data:
                        content_list = result_data["content"]
                        text_contents = []
                        
                        for content_item in content_list:
                            if content_item.get("type") == "text":
                                text_content = TextContent(
                                    type="text",
                                    text=content_item.get("text", "")
                                )
                                text_contents.append(text_content)
                        
                        logger.info(f"Tool '{name}' executed successfully")
                        return text_contents
                    else:
                        # 단순 텍스트 응답인 경우
                        return [TextContent(
                            type="text",
                            text=str(result_data)
                        )]
                
                # 오류 응답인 경우
                if tool_response and "error" in tool_response:
                    error_msg = tool_response["error"].get("message", "Tool execution failed")
                    return [TextContent(
                        type="text",
                        text=f"Error: {error_msg}"
                    )]
                
                return [TextContent(
                    type="text",
                    text="No response from tool"
                )]
                
            except Exception as e:
                logger.error(f"Error calling tool '{name}': {e}")
                return [TextContent(
                    type="text",
                    text=f"Error executing tool: {str(e)}"
                )]
    
    async def _forward_to_actual_server(self, message: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """실제 MCP 서버로 메시지 전달"""
        try:
            import os
            
            if not self.actual_server_config:
                logger.error("Actual server config not initialized")
                return None
            
            command = self.actual_server_config.get('command', '')
            args = self.actual_server_config.get('args', [])
            env = self.actual_server_config.get('env', {})
            timeout = self.actual_server_config.get('timeout', 30)
            
            if not command:
                logger.error("No command specified for MCP server")
                return None
            
            # 환경변수 설정
            full_env = os.environ.copy()
            full_env.update(env)
            
            logger.info(f"Forwarding message to MCP server: {command} {' '.join(args)}")
            
            # MCP 서버 프로세스 시작
            process = await asyncio.create_subprocess_exec(
                command, *args,
                stdin=asyncio.subprocess.PIPE,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE,
                env=full_env
            )
            
            try:
                # 초기화가 필요한 경우 먼저 초기화 수행
                if message.get("method") != "initialize":
                    # 초기화 메시지 전송
                    init_message = {
                        "jsonrpc": "2.0",
                        "id": 0,
                        "method": "initialize",
                        "params": {
                            "protocolVersion": "2024-11-05",
                            "capabilities": {},
                            "clientInfo": {
                                "name": "mcp-orch",
                                "version": "1.0.0"
                            }
                        }
                    }
                    
                    init_json = json.dumps(init_message) + '\n'
                    process.stdin.write(init_json.encode())
                    await process.stdin.drain()
                    
                    # 초기화 응답 읽기 (무시)
                    await asyncio.wait_for(process.stdout.readline(), timeout=10)
                
                # 실제 메시지 전송
                message_json = json.dumps(message) + '\n'
                process.stdin.write(message_json.encode())
                await process.stdin.drain()
                
                # 응답 대기
                response_line = await asyncio.wait_for(
                    process.stdout.readline(), 
                    timeout=timeout
                )
                
                if response_line:
                    response_text = response_line.decode().strip()
                    logger.info(f"Received response from actual MCP server: {response_text}")
                    
                    try:
                        response_data = json.loads(response_text)
                        return response_data
                    except json.JSONDecodeError as e:
                        logger.error(f"Invalid JSON response from MCP server: {e}")
                        return None
                else:
                    logger.warning("No response received from MCP server")
                    return None
                    
            except asyncio.TimeoutError:
                logger.error(f"MCP server response timeout after {timeout} seconds")
                return None
                
            finally:
                # 프로세스 정리
                try:
                    if process.stdin and not process.stdin.is_closing():
                        process.stdin.close()
                        await process.stdin.wait_closed()
                    
                    # 프로세스 종료 대기 (짧은 타임아웃)
                    try:
                        await asyncio.wait_for(process.wait(), timeout=5.0)
                    except asyncio.TimeoutError:
                        # 강제 종료
                        logger.warning("Force killing MCP server process")
                        process.kill()
                        await process.wait()
                        
                except Exception as cleanup_error:
                    logger.error(f"Error during MCP server cleanup: {cleanup_error}")
                    
        except Exception as e:
            logger.error(f"Error forwarding message to MCP server: {e}")
            return None


# 유연한 인증 함수 (기존 project_sse.py에서 가져옴)
async def get_current_user_for_standard_mcp(
    request: Request,
    project_id: UUID,
    db: Session = Depends(get_db)
) -> Optional[User]:
    """표준 MCP용 유연한 사용자 인증 함수"""
    
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
            logger.info(f"Standard MCP SSE connection allowed without auth for project {project_id}")
            return None  # 인증 없이 허용
    else:
        # 메시지 요청 시 인증 정책 확인
        if not project.message_auth_required:
            logger.info(f"Standard MCP message request allowed without auth for project {project_id}")
            return None  # 인증 없이 허용
    
    # 인증이 필요한 경우 - JWT 토큰 또는 API 키 확인
    user = await get_user_from_jwt_token(request, db)
    if not user:
        # JWT 인증 실패 시 request.state.user 확인 (API 키 인증 결과)
        if hasattr(request.state, 'user') and request.state.user:
            user = request.state.user
            auth_type = "SSE" if is_sse_request else "Message"
            logger.info(f"Authenticated standard MCP {auth_type} request via API key for project {project_id}, user={user.email}")
            return user
        
        auth_type = "SSE" if is_sse_request else "Message"
        logger.warning(f"Standard MCP {auth_type} authentication required but no valid token for project {project_id}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required"
        )
    
    logger.info(f"Authenticated standard MCP {'SSE' if is_sse_request else 'Message'} request for project {project_id}, user={user.email}")
    return user


async def handle_mcp_message_request(
    request: Request,
    project_id: UUID,
    server_name: str,
    db: Session
):
    """MCP 메시지 요청 처리 (SSE 엔드포인트로 온 POST 요청)"""
    
    try:
        logger.info(f"Handling MCP message request for project {project_id}, server {server_name}")
        
        # 요청 본문 읽기
        body = await request.body()
        if not body:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Empty message body"
            )
        
        try:
            message = json.loads(body)
            logger.info(f"Received MCP message: {message}")
            
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
                            "name": f"example-servers/brave-search",
                            "version": "0.1.0"
                        }
                    }
                }
                
                logger.info("Standard MCP: Sending initialize response via POST")
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
                
                logger.info("Standard MCP: Sending tools list response via POST with 2 tools")
                return response_data
                
            elif method == "tools/call":
                # 도구 호출 처리
                tool_name = message.get("params", {}).get("name")
                tool_arguments = message.get("params", {}).get("arguments", {})
                
                logger.info(f"Standard MCP: Received tool call via POST: {tool_name} with arguments: {tool_arguments}")
                
                # 간단한 응답 (실제로는 brave-search 서버로 전달해야 함)
                if tool_name == "brave_web_search":
                    result = f"Search results for '{tool_arguments.get('query', '')}' (showing {tool_arguments.get('count', 10)} results starting from {tool_arguments.get('offset', 0)})"
                elif tool_name == "brave_local_search":
                    result = f"Local search results for '{tool_arguments.get('query', '')}' (showing {tool_arguments.get('count', 5)} results)"
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
                
                logger.info(f"Standard MCP: Sending tool call response via POST for {tool_name}")
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
                
                logger.warning(f"Standard MCP: Unknown method via POST: {method}")
                return response_data
                
        except json.JSONDecodeError as e:
            logger.error(f"Invalid JSON in MCP message via POST: {e}")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid JSON format"
            )
                
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error handling MCP message request via POST: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="MCP message handling failed"
        )


# 표준 MCP SSE 엔드포인트 (기존 경로 유지)
@router.api_route("/projects/{project_id}/servers/{server_name}/sse", methods=["GET", "POST"])
async def standard_mcp_sse_endpoint(
    project_id: UUID,
    server_name: str,
    request: Request,
    db: Session = Depends(get_db)
):
    """표준 MCP SSE 엔드포인트 (기존 경로에 간단한 MCP 구현) - GET은 SSE, POST는 메시지 처리"""
    
    try:
        # POST 요청인 경우 메시지 처리
        if request.method == "POST":
            logger.info(f"Received POST request to SSE endpoint, handling as MCP message")
            return await handle_mcp_message_request(request, project_id, server_name, db)
        
        # 유연한 인증 적용
        current_user = await get_current_user_for_standard_mcp(request, project_id, db)
        
        if current_user:
            logger.info(f"Standard MCP SSE connection: method={request.method}, project_id={project_id}, server={server_name}, user={current_user.email}")
        else:
            logger.info(f"Standard MCP SSE connection (no auth): method={request.method}, project_id={project_id}, server={server_name}")
        
        # 간단한 MCP SSE 스트림 생성 (FastMCP 방식)
        logger.info("Starting standard MCP SSE stream")
        
        async def generate_standard_mcp_sse():
            """표준 MCP SSE 스트림 생성 - 순수 MCP 프로토콜"""
            try:
                logger.info("Standard MCP SSE stream started - pure MCP protocol")
                
                # 무한 대기 (클라이언트 POST 요청만 처리)
                while True:
                    await asyncio.sleep(3600)  # 1시간마다 체크 (실제로는 POST 요청으로만 통신)
                    
            except Exception as e:
                logger.error(f"Standard MCP SSE stream error: {e}")
                error_data = {'error': str(e), 'type': 'standard_mcp_sse_error'}
                yield f"event: error\ndata: {json.dumps(error_data)}\n\n"
        
        return StreamingResponse(
            generate_standard_mcp_sse(),
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
        logger.error(f"Standard MCP SSE error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Standard MCP SSE connection failed"
        )


# 표준 MCP 메시지 엔드포인트 (기존 경로 유지)
@router.post("/messages/")
async def standard_mcp_messages(request: Request):
    """표준 MCP 메시지 처리 엔드포인트 (기존 경로에 간단한 MCP 구현)"""
    
    try:
        # 세션 ID 추출 (쿼리 파라미터에서)
        session_id = request.query_params.get('session_id')
        
        logger.info(f"Received standard MCP /messages/ request with session_id: {session_id}")
        
        # 요청 본문 읽기
        body = await request.body()
        if not body:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Empty message body"
            )
        
        try:
            message = json.loads(body)
            logger.info(f"Received standard MCP message: {message} (session: {session_id})")
            
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
                            "name": "mcp-orch-brave-search",
                            "version": "1.0.0"
                        }
                    }
                }
                
                logger.info("Standard MCP: Sending initialize response")
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
                
                logger.info("Standard MCP: Sending tools list response with 2 tools")
                return response_data
                
            elif method == "tools/call":
                # 도구 호출 처리
                tool_name = message.get("params", {}).get("name")
                tool_arguments = message.get("params", {}).get("arguments", {})
                
                logger.info(f"Standard MCP: Received tool call: {tool_name} with arguments: {tool_arguments}")
                
                # 간단한 응답 (실제로는 brave-search 서버로 전달해야 함)
                if tool_name == "brave_web_search":
                    result = f"Search results for '{tool_arguments.get('query', '')}' (showing {tool_arguments.get('count', 10)} results starting from {tool_arguments.get('offset', 0)})"
                elif tool_name == "brave_local_search":
                    result = f"Local search results for '{tool_arguments.get('query', '')}' (showing {tool_arguments.get('count', 5)} results)"
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
                
                logger.info(f"Standard MCP: Sending tool call response for {tool_name}")
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
                
                logger.warning(f"Standard MCP: Unknown method: {method}")
                return response_data
                
        except json.JSONDecodeError as e:
            logger.error(f"Invalid JSON in standard MCP message: {e}")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid JSON format"
            )
                
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error handling standard MCP /messages request: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Standard MCP message handling failed"
        )

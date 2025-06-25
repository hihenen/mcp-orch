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
    
    # 프로젝트 JWT 인증 정책 확인 (SSE와 Message 통합)
    if not project.jwt_auth_required:
        auth_type = "SSE" if is_sse_request else "Message"
        logger.info(f"Standard MCP {auth_type} request allowed without auth for project {project_id}")
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
                            "name": f"mcp-orch-{server_name}",
                            "version": "1.0.0"
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


# FastMCP 기반 서버 매니저 (기존 엔드포인트 유지)
try:
    from fastmcp import FastMCP
    FASTMCP_AVAILABLE = True
    
    class FastMCPManager:
        """FastMCP 서버 관리자 (기존 엔드포인트 구조 유지)"""
        
        def __init__(self):
            self.servers: Dict[str, FastMCP] = {}
        
        def get_or_create_server(self, project_id: str, server_name: str) -> FastMCP:
            """FastMCP 서버 가져오기 또는 생성"""
            server_key = f"{project_id}_{server_name}"
            
            if server_key not in self.servers:
                # FastMCP 서버 생성
                mcp = FastMCP(name=f"mcp-orch-{server_name}")
                
                @mcp.tool
                def brave_web_search(query: str, count: int = 10, offset: int = 0) -> str:
                    """Performs a web search using the Brave Search API, ideal for general queries, news, articles, and online content. Use this for broad information gathering, recent events, or when you need diverse web sources. Supports pagination, content filtering, and freshness controls. Maximum 20 results per request, with offset for pagination."""
                    logger.info(f"FastMCP Tool: brave_web_search(query='{query}', count={count}, offset={offset})")
                    return f"Search results for '{query}' (showing {count} results starting from {offset})"
                
                @mcp.tool
                def brave_local_search(query: str, count: int = 5) -> str:
                    """Searches for local businesses and places using Brave's Local Search API. Best for queries related to physical locations, businesses, restaurants, services, etc. Returns detailed information including business names and addresses, ratings and review counts, phone numbers and opening hours. Use this when the query implies 'near me' or mentions specific locations. Automatically falls back to web search if no local results are found."""
                    logger.info(f"FastMCP Tool: brave_local_search(query='{query}', count={count})")
                    return f"Local search results for '{query}' (showing {count} results)"
                
                self.servers[server_key] = mcp
                logger.info(f"Created FastMCP server: {server_key}")
            
            return self.servers[server_key]
    
    # 전역 FastMCP 매니저
    fastmcp_manager = FastMCPManager()
    
except ImportError:
    FASTMCP_AVAILABLE = False
    fastmcp_manager = None
    logger.warning("FastMCP not available, falling back to manual implementation")


# 표준 MCP SSE 엔드포인트 (기존 경로 유지, FastMCP 내부 사용)
@router.api_route("/projects/{project_id}/servers/{server_name}/sse", methods=["GET", "POST"])
async def standard_mcp_sse_endpoint(
    project_id: UUID,
    server_name: str,
    request: Request,
    db: Session = Depends(get_db)
):
    """표준 MCP SSE 엔드포인트 - FastMCP 기반 구현 (기존 경로 유지)"""
    
    try:
        # POST 요청인 경우 MCP 메시지 처리
        if request.method == "POST":
            logger.info(f"Received POST request to SSE endpoint, handling as MCP message")
            return await handle_mcp_message_request_with_fastmcp(request, project_id, server_name, db)
        
        # 유연한 인증 적용
        current_user = await get_current_user_for_standard_mcp(request, project_id, db)
        
        if current_user:
            logger.info(f"Standard MCP SSE connection: method={request.method}, project_id={project_id}, server={server_name}, user={current_user.email}")
        else:
            logger.info(f"Standard MCP SSE connection (no auth): method={request.method}, project_id={project_id}, server={server_name}")
        
        if FASTMCP_AVAILABLE and fastmcp_manager:
            logger.info("Starting FastMCP-based SSE implementation")
            return await handle_sse_with_fastmcp(project_id, server_name)
        else:
            logger.info("Starting fallback manual MCP SSE implementation")
            return await handle_sse_manual_fallback(server_name)
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Standard MCP SSE error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Standard MCP SSE connection failed: {str(e)}"
        )


async def handle_sse_with_fastmcp(project_id: UUID, server_name: str):
    """FastMCP를 사용한 SSE 처리"""
    
    # FastMCP 서버 가져오기
    mcp_server = fastmcp_manager.get_or_create_server(str(project_id), server_name)
    
    # FastMCP HTTP 앱 생성 (SSE 모드)
    http_app = mcp_server.http_app(path="/", transport="sse")
    
    # SSE 스트림 생성
    async def generate_fastmcp_sse():
        """FastMCP 기반 SSE 스트림"""
        try:
            logger.info("FastMCP SSE stream started")
            
            # FastMCP가 자동으로 처리하는 초기화 과정을 시뮬레이션
            # 실제로는 FastMCP 내부에서 자동 처리됨
            
            # 1. endpoint 이벤트 전송 (표준 MCP 프로토콜)
            endpoint_event = {
                "jsonrpc": "2.0",
                "method": "endpoint",
                "params": {
                    "uri": "/messages"
                }
            }
            yield f"data: {json.dumps(endpoint_event)}\n\n"
            
            # 2. 서버 정보 전송
            server_info = {
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
            yield f"data: {json.dumps(server_info)}\n\n"
            
            # 도구 목록 가져오기 (FastMCP에서)
            try:
                tools_dict = await mcp_server.get_tools()
                tools_list = []
                
                for tool_name, tool_obj in tools_dict.items():
                    # FastMCP의 FunctionTool 객체 처리
                    try:
                        # FunctionTool 객체에서 정보 추출
                        if hasattr(tool_obj, 'description'):
                            description = tool_obj.description
                        elif hasattr(tool_obj, '__doc__'):
                            description = tool_obj.__doc__ or f"Tool: {tool_name}"
                        else:
                            description = f"Tool: {tool_name}"
                        
                        # 도구별 하드코딩된 스키마 (Cline 호환성을 위해)
                        if tool_name == "brave_web_search":
                            tool_schema = {
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
                            }
                        elif tool_name == "brave_local_search":
                            tool_schema = {
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
                        else:
                            # 기본 도구 스키마 생성 (동적 파라미터 추출 시도)
                            tool_schema = {
                                "name": tool_name,
                                "description": description,
                                "inputSchema": {
                                    "type": "object",
                                    "properties": {
                                        "query": {
                                            "type": "string",
                                            "description": "Query parameter"
                                        }
                                    },
                                    "required": ["query"]
                                }
                            }
                            
                            # FunctionTool에서 실제 함수 가져오기
                            actual_func = None
                            if hasattr(tool_obj, 'func'):
                                actual_func = tool_obj.func
                            elif hasattr(tool_obj, '_func'):
                                actual_func = tool_obj._func
                            elif callable(tool_obj):
                                actual_func = tool_obj
                            
                            # 함수 시그니처에서 파라미터 추출
                            if actual_func and callable(actual_func):
                                import inspect
                                try:
                                    sig = inspect.signature(actual_func)
                                    properties = {}
                                    required = []
                                    
                                    for param_name, param in sig.parameters.items():
                                        if param_name not in ['self', 'ctx']:  # 'ctx' 파라미터 제외
                                            param_type = "string"
                                            if param.annotation == int:
                                                param_type = "number"
                                            elif param.annotation == bool:
                                                param_type = "boolean"
                                            
                                            properties[param_name] = {
                                                "type": param_type,
                                                "description": f"Parameter: {param_name}"
                                            }
                                            
                                            if param.default == inspect.Parameter.empty:
                                                required.append(param_name)
                                    
                                    # 파라미터가 추출되었으면 업데이트
                                    if properties:
                                        tool_schema["inputSchema"]["properties"] = properties
                                        tool_schema["inputSchema"]["required"] = required
                                        
                                except Exception as sig_error:
                                    logger.warning(f"Failed to extract signature for {tool_name}: {sig_error}")
                        
                        tools_list.append(tool_schema)
                        logger.info(f"FastMCP: Processed tool {tool_name} with {len(tool_schema['inputSchema']['properties'])} parameters")
                        
                    except Exception as tool_error:
                        logger.error(f"Error processing tool {tool_name}: {tool_error}")
                        # 기본 도구 스키마로 폴백
                        tools_list.append({
                            "name": tool_name,
                            "description": f"Tool: {tool_name}",
                            "inputSchema": {
                                "type": "object",
                                "properties": {
                                    "query": {"type": "string", "description": "Query parameter"}
                                },
                                "required": ["query"]
                            }
                        })
                
                # 도구 목록 전송
                tools_notification = {
                    "jsonrpc": "2.0",
                    "method": "notifications/tools/list_changed",
                    "params": {"tools": tools_list}
                }
                yield f"data: {json.dumps(tools_notification)}\n\n"
                logger.info(f"FastMCP: Sent tools list with {len(tools_list)} tools")
                
            except Exception as tools_error:
                logger.error(f"Failed to get tools from FastMCP: {tools_error}")
                # 폴백으로 하드코딩된 도구 목록 전송
                fallback_tools = [
                    {
                        "name": "brave_web_search",
                        "description": "Performs a web search using the Brave Search API, ideal for general queries, news, articles, and online content. Use this for broad information gathering, recent events, or when you need diverse web sources. Supports pagination, content filtering, and freshness controls. Maximum 20 results per request, with offset for pagination.",
                        "inputSchema": {
                            "type": "object",
                            "properties": {
                                "query": {"type": "string", "description": "Search query (max 400 chars, 50 words)"},
                                "count": {"type": "number", "description": "Number of results (1-20, default 10)", "default": 10},
                                "offset": {"type": "number", "description": "Pagination offset (max 9, default 0)", "default": 0}
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
                                "query": {"type": "string", "description": "Local search query (e.g. 'pizza near Central Park')"},
                                "count": {"type": "number", "description": "Number of results (1-20, default 5)", "default": 5}
                            },
                            "required": ["query"]
                        }
                    }
                ]
                
                fallback_notification = {
                    "jsonrpc": "2.0",
                    "method": "notifications/tools/list_changed",
                    "params": {"tools": fallback_tools}
                }
                yield f"data: {json.dumps(fallback_notification)}\n\n"
                logger.info("FastMCP: Sent fallback tools list with 2 tools")
            
            # 연결 유지
            keepalive_count = 0
            while True:
                await asyncio.sleep(30)
                keepalive_count += 1
                yield f": keepalive-{keepalive_count}\n\n"
                
                if keepalive_count % 10 == 0:
                    logger.info(f"FastMCP SSE keepalive #{keepalive_count}")
                    
        except asyncio.CancelledError:
            logger.info("FastMCP SSE stream cancelled")
            raise
        except Exception as e:
            logger.error(f"FastMCP SSE stream error: {e}")
            error_message = {
                "jsonrpc": "2.0",
                "method": "notifications/error",
                "params": {"error": str(e), "type": "fastmcp_sse_error"}
            }
            yield f"data: {json.dumps(error_message)}\n\n"
    
    return StreamingResponse(
        generate_fastmcp_sse(),
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
            "Transfer-Encoding": "chunked",
        }
    )


async def handle_sse_manual_fallback(server_name: str):
    """FastMCP 없을 때 수동 구현 폴백"""
    
    async def generate_manual_sse():
        """수동 MCP SSE 스트림 (폴백)"""
        try:
            logger.info("Manual fallback SSE stream started")
            
            # 1. endpoint 이벤트 전송 (표준 MCP 프로토콜)
            endpoint_event = {
                "jsonrpc": "2.0",
                "method": "endpoint",
                "params": {
                    "uri": "/messages"
                }
            }
            yield f"data: {json.dumps(endpoint_event)}\n\n"
            
            # 2. 서버 정보 전송
            server_info = {
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
            yield f"data: {json.dumps(server_info)}\n\n"
            
            # 하드코딩된 도구 목록
            tools_notification = {
                "jsonrpc": "2.0",
                "method": "notifications/tools/list_changed",
                "params": {
                    "tools": [
                        {
                            "name": "brave_web_search",
                            "description": "Performs a web search using the Brave Search API, ideal for general queries, news, articles, and online content. Use this for broad information gathering, recent events, or when you need diverse web sources. Supports pagination, content filtering, and freshness controls. Maximum 20 results per request, with offset for pagination.",
                            "inputSchema": {
                                "type": "object",
                                "properties": {
                                    "query": {"type": "string", "description": "Search query (max 400 chars, 50 words)"},
                                    "count": {"type": "number", "description": "Number of results (1-20, default 10)", "default": 10},
                                    "offset": {"type": "number", "description": "Pagination offset (max 9, default 0)", "default": 0}
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
                                    "query": {"type": "string", "description": "Local search query (e.g. 'pizza near Central Park')"},
                                    "count": {"type": "number", "description": "Number of results (1-20, default 5)", "default": 5}
                                },
                                "required": ["query"]
                            }
                        }
                    ]
                }
            }
            yield f"data: {json.dumps(tools_notification)}\n\n"
            logger.info("Manual fallback: Sent tools list with 2 tools")
            
            # 연결 유지
            keepalive_count = 0
            while True:
                await asyncio.sleep(30)
                keepalive_count += 1
                yield f": keepalive-{keepalive_count}\n\n"
                
        except asyncio.CancelledError:
            logger.info("Manual fallback SSE stream cancelled")
            raise
        except Exception as e:
            logger.error(f"Manual fallback SSE stream error: {e}")
    
    return StreamingResponse(
        generate_manual_sse(),
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
            "Transfer-Encoding": "chunked",
        }
    )


async def handle_mcp_message_request_with_fastmcp(
    request: Request,
    project_id: UUID,
    server_name: str,
    db: Session
):
    """FastMCP를 사용한 MCP 메시지 요청 처리"""
    
    try:
        body = await request.body()
        if not body:
            raise HTTPException(status_code=400, detail="Empty message body")
        
        message = json.loads(body)
        method = message.get("method")
        message_id = message.get("id")
        
        logger.info(f"FastMCP message request: {method}")
        
        if FASTMCP_AVAILABLE and fastmcp_manager:
            # FastMCP 서버 사용
            mcp_server = fastmcp_manager.get_or_create_server(str(project_id), server_name)
            
            if method == "initialize":
                return {
                    "jsonrpc": "2.0",
                    "id": message_id,
                    "result": {
                        "protocolVersion": "2024-11-05",
                        "capabilities": {"tools": {}},
                        "serverInfo": {
                            "name": f"mcp-orch-{server_name}",
                            "version": "1.0.0"
                        }
                    }
                }
            
            elif method == "tools/list":
                # FastMCP에서 도구 목록 가져오기
                tools_dict = await mcp_server.get_tools()
                tools_list = []
                
                for tool_name, tool_func in tools_dict.items():
                    # 도구 스키마 생성 (간단화)
                    tool_schema = {
                        "name": tool_name,
                        "description": tool_func.__doc__ or f"Tool: {tool_name}",
                        "inputSchema": {"type": "object", "properties": {}, "required": []}
                    }
                    tools_list.append(tool_schema)
                
                return {
                    "jsonrpc": "2.0",
                    "id": message_id,
                    "result": {"tools": tools_list}
                }
            
            elif method == "tools/call":
                # FastMCP 도구 호출
                tool_name = message.get("params", {}).get("name")
                tool_arguments = message.get("params", {}).get("arguments", {})
                
                tools_dict = await mcp_server.get_tools()
                if tool_name in tools_dict:
                    try:
                        result = tools_dict[tool_name](**tool_arguments)
                        return {
                            "jsonrpc": "2.0",
                            "id": message_id,
                            "result": {
                                "content": [{"type": "text", "text": str(result)}]
                            }
                        }
                    except Exception as tool_error:
                        logger.error(f"FastMCP tool execution error: {tool_error}")
                        return {
                            "jsonrpc": "2.0",
                            "id": message_id,
                            "error": {
                                "code": -32603,
                                "message": f"Tool execution failed: {str(tool_error)}"
                            }
                        }
                else:
                    return {
                        "jsonrpc": "2.0",
                        "id": message_id,
                        "error": {
                            "code": -32601,
                            "message": f"Tool not found: {tool_name}"
                        }
                    }
        
        # FastMCP 없을 때 폴백
        return await handle_mcp_message_request(request, project_id, server_name, db)
        
    except Exception as e:
        logger.error(f"FastMCP message handling error: {e}")
        raise HTTPException(status_code=500, detail=f"Message handling failed: {str(e)}")


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

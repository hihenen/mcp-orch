"""
Unified MCP Transport - 통합 MCP 서버 구현

프로젝트의 모든 MCP 서버를 하나의 엔드포인트로 통합하여 제공.
기존 개별 서버 기능은 완전히 유지하면서 추가 옵션으로 제공.
"""

import asyncio
import json
import logging
import uuid
from datetime import datetime
from typing import Dict, Any, Optional, List, AsyncGenerator
from uuid import UUID

from fastapi import APIRouter, Request, HTTPException, status, Depends, Query
from fastapi.responses import StreamingResponse, JSONResponse
from sqlalchemy.orm import Session
from sqlalchemy import and_

from ..database import get_db
from ..models import Project, McpServer, User
from .jwt_auth import get_user_from_jwt_token
from .mcp_sse_transport import MCPSSETransport, sse_transports
from ..services.mcp_connection_service import mcp_connection_service
from ..utils.namespace import (
    NamespaceRegistry, OrchestratorMetaTools,
    create_namespaced_name, parse_namespaced_name, is_namespaced, 
    get_meta_tool_prefix, NAMESPACE_SEPARATOR
)

logger = logging.getLogger(__name__)

router = APIRouter(tags=["unified-mcp"])


class UnifiedMCPTransport(MCPSSETransport):
    """
    통합 MCP Transport - 기존 MCPSSETransport 확장
    
    기존 개별 서버 기능을 100% 유지하면서 다중 서버 라우팅 추가:
    - 네임스페이스 기반 툴 관리
    - 에러 격리 (개별 서버 실패가 전체에 영향 없음)
    - 오케스트레이터 메타 도구
    - 동적 네임스페이스 구분자 설정
    """
    
    def __init__(self, session_id: str, message_endpoint: str, 
                 project_servers: List[McpServer], project_id: UUID):
        
        # 기존 MCPSSETransport 초기화 (첫 번째 서버 또는 더미 서버 사용)
        primary_server = project_servers[0] if project_servers else None
        if not primary_server:
            # 더미 서버 생성 (서버가 없는 경우)
            from ..models.mcp_server import McpServer as McpServerModel
            primary_server = McpServerModel(
                name="unified-placeholder",
                command="echo",
                args=["Unified MCP Server"],
                project_id=project_id,
                is_enabled=True
            )
        
        super().__init__(session_id, message_endpoint, primary_server, project_id)
        
        # 통합 기능을 위한 추가 속성
        self.project_servers = project_servers
        self.namespace_registry = NamespaceRegistry()
        self.server_connections = {}  # 개별 서버 연결 캐시
        self.failed_servers = set()   # 실패한 서버 추적
        
        # 서버 네임스페이스 등록
        self._register_servers()
        
        logger.info(f"🚀 UnifiedMCPTransport created: session={session_id}, servers={len(project_servers)}, separator='{NAMESPACE_SEPARATOR}'")
    
    def _register_servers(self):
        """프로젝트 서버들을 네임스페이스 레지스트리에 등록"""
        for server in self.project_servers:
            if server.is_enabled:
                namespace_name = self.namespace_registry.register_server(server.name)
                logger.debug(f"Registered server: '{server.name}' → '{namespace_name}'")
    
    async def handle_initialize(self, message: Dict[str, Any]) -> JSONResponse:
        """
        통합 서버 초기화 - 기존 로직 확장
        """
        request_id = message.get("id")
        params = message.get("params", {})
        
        logger.info(f"🎯 Unified MCP initialize: session={self.session_id}, servers={len(self.project_servers)}")
        
        # 활성 서버 수 확인
        active_servers = [s for s in self.project_servers if s.is_enabled]
        
        # MCP 표준 초기화 응답 (통합 서버용)
        response = {
            "jsonrpc": "2.0",
            "id": request_id,
            "result": {
                "protocolVersion": "2024-11-05",
                "capabilities": {
                    "tools": {} if active_servers else None,
                    "logging": {},
                    "prompts": None,
                    "resources": None
                },
                "serverInfo": {
                    "name": f"mcp-orch-unified-{self.project_id}",
                    "version": "1.0.0"
                },
                "instructions": f"🎯 Unified MCP Server for project {self.project_id}. Managing {len(active_servers)} active servers with '{self.tool_naming.separator}' namespace separator. Use tools/list to see all available tools."
            }
        }
        
        logger.info(f"✅ Unified initialize complete: session={self.session_id}")
        return JSONResponse(content=response)
    
    async def handle_tools_list(self, message: Dict[str, Any]) -> JSONResponse:
        """모든 활성 서버의 툴을 네임스페이스와 함께 반환"""
        all_tools = []
        failed_servers = []
        active_servers = [s for s in self.project_servers if s.is_enabled]
        
        logger.info(f"📋 Listing unified tools from {len(active_servers)} servers")
        
        # 각 서버에서 툴 수집 (에러 격리)
        for server in active_servers:
            try:
                if server.name in self.failed_servers:
                    logger.debug(f"Skipping previously failed server: {server.name}")
                    continue
                
                # 서버 설정 구성
                server_config = self._build_server_config_for_server(server)
                if not server_config:
                    logger.warning(f"Failed to build config for server: {server.name}")
                    failed_servers.append(server.name)
                    continue
                
                # 기존 mcp_connection_service 활용 (에러 격리)
                tools = await mcp_connection_service.get_server_tools(
                    str(server.id), server_config
                )
                
                if tools is None:
                    logger.warning(f"No tools returned from server: {server.name}")
                    failed_servers.append(server.name)
                    continue
                
                # 네임스페이스 적용
                namespace_name = self.namespace_registry.get_original_name(server.name)
                if not namespace_name:
                    namespace_name = self.namespace_registry.register_server(server.name)
                
                for tool in tools:
                    try:
                        namespaced_tool = tool.copy()
                        namespaced_tool['name'] = create_namespaced_name(
                            namespace_name, tool['name']
                        )
                        
                        # 메타데이터 추가
                        namespaced_tool['_source_server'] = server.name
                        namespaced_tool['_original_name'] = tool['name']
                        namespaced_tool['_namespace'] = namespace_name
                        
                        all_tools.append(namespaced_tool)
                        
                    except Exception as e:
                        logger.error(f"Error processing tool {tool.get('name', 'unknown')} from {server.name}: {e}")
                        
                logger.info(f"✅ Collected {len(tools)} tools from server: {server.name}")
                
            except Exception as e:
                logger.error(f"❌ Failed to get tools from server {server.name}: {e}")
                failed_servers.append(server.name)
                self.failed_servers.add(server.name)
                # 개별 서버 실패가 전체를 망가뜨리지 않도록 continue
        
        # 오케스트레이터 메타 도구 추가
        try:
            meta_tools = OrchestratorMetaTools.get_meta_tools()
            all_tools.extend(meta_tools)
            logger.info(f"✅ Added {len(meta_tools)} orchestrator meta tools")
        except Exception as e:
            logger.error(f"❌ Failed to add meta tools: {e}")
        
        # 응답 구성
        response = {
            "jsonrpc": "2.0",
            "id": message.get("id"),
            "result": {
                "tools": all_tools,
                "_meta": {
                    "total_servers": len(self.project_servers),
                    "active_servers": len(active_servers),
                    "successful_servers": len(active_servers) - len(failed_servers),
                    "failed_servers": failed_servers,
                    "namespace_separator": NAMESPACE_SEPARATOR,
                    "total_tools": len(all_tools),
                    "meta_tools": len([t for t in all_tools if t.get('_meta', {}).get('type') == 'orchestrator'])
                }
            }
        }
        
        logger.info(f"📋 Unified tools list complete: {len(all_tools)} tools ({len(failed_servers)} failed servers)")
        return JSONResponse(content=response)
    
    async def handle_tool_call(self, message: Dict[str, Any]) -> JSONResponse:
        """네임스페이스 툴 호출을 적절한 서버로 라우팅"""
        try:
            params = message.get("params", {})
            namespaced_tool_name = params.get("name")
            arguments = params.get("arguments", {})
            
            if not namespaced_tool_name:
                raise ValueError("Missing tool name")
            
            logger.info(f"🔧 Unified tool call: {namespaced_tool_name}")
            
            # 오케스트레이터 메타 도구 처리
            if OrchestratorMetaTools.is_meta_tool(namespaced_tool_name):
                return await self._handle_meta_tool_call(message)
            
            # 네임스페이스 파싱
            try:
                namespace_name, tool_name = parse_namespaced_name(namespaced_tool_name)
            except ValueError as e:
                raise ValueError(f"Invalid tool name format: {str(e)}")
            
            # 대상 서버 찾기
            target_server = self._find_server_by_namespace(namespace_name)
            if not target_server:
                raise ValueError(f"Server '{namespace_name}' not found or not accessible")
            
            if not target_server.is_enabled:
                raise ValueError(f"Server '{namespace_name}' is disabled")
            
            if target_server.name in self.failed_servers:
                raise ValueError(f"Server '{namespace_name}' is marked as failed")
            
            # 개별 서버 호출 (기존 로직 재사용)
            server_config = self._build_server_config_for_server(target_server)
            if not server_config:
                raise ValueError(f"Failed to build configuration for server '{namespace_name}'")
            
            logger.info(f"🎯 Routing to server: {namespace_name} → {target_server.name}.{tool_name}")
            
            # 도구 호출 (에러 격리)
            try:
                result = await mcp_connection_service.call_tool(
                    str(target_server.id), server_config, tool_name, arguments
                )
            except Exception as e:
                # 서버 실패 마킹 (향후 요청에서 제외)
                self.failed_servers.add(target_server.name)
                raise ValueError(f"Tool execution failed on server '{namespace_name}': {str(e)}")
            
            # 성공 응답 (기존 MCPSSETransport와 동일한 형식)
            response = {
                "jsonrpc": "2.0",
                "id": message.get("id"),
                "result": {
                    "content": [
                        {
                            "type": "text",
                            "text": str(result) if result else "Tool executed successfully"
                        }
                    ],
                    "_meta": {
                        "source_server": target_server.name,
                        "namespace": namespace_name,
                        "original_tool": tool_name,
                        "execution_mode": "unified"
                    }
                }
            }
            
            logger.info(f"✅ Unified tool call successful: {namespaced_tool_name}")
            return JSONResponse(content=response)
            
        except Exception as e:
            logger.error(f"❌ Unified tool call error: {e}")
            
            # 상세한 에러 정보 제공
            error_response = {
                "jsonrpc": "2.0",
                "id": message.get("id"),
                "error": {
                    "code": -32000,
                    "message": f"Unified tool execution failed: {str(e)}",
                    "data": {
                        "tool_name": namespaced_tool_name if 'namespaced_tool_name' in locals() else "unknown",
                        "error_type": type(e).__name__,
                        "failed_servers": list(self.failed_servers),
                        "execution_mode": "unified"
                    }
                }
            }
            return JSONResponse(content=error_response)
    
    async def _handle_meta_tool_call(self, message: Dict[str, Any]) -> JSONResponse:
        """오케스트레이터 메타 도구 처리"""
        try:
            params = message.get("params", {})
            tool_name = params.get("name")
            arguments = params.get("arguments", {})
            
            logger.info(f"🔧 Meta tool call: {tool_name}")
            
            if tool_name == f"orchestrator{self.tool_naming.separator}list_servers":
                return await self._meta_list_servers(message)
            elif tool_name == f"orchestrator{self.tool_naming.separator}server_status":
                return await self._meta_server_status(message, arguments)
            elif tool_name == f"orchestrator{self.tool_naming.separator}switch_namespace":
                return await self._meta_switch_namespace(message, arguments)
            elif tool_name == f"orchestrator{self.tool_naming.separator}project_info":
                return await self._meta_project_info(message)
            else:
                raise ValueError(f"Unknown meta tool: {tool_name}")
                
        except Exception as e:
            logger.error(f"❌ Meta tool error: {e}")
            return JSONResponse(content={
                "jsonrpc": "2.0",
                "id": message.get("id"),
                "error": {
                    "code": -32000,
                    "message": f"Meta tool execution failed: {str(e)}"
                }
            })
    
    async def _meta_list_servers(self, message: Dict[str, Any]) -> JSONResponse:
        """서버 목록 조회 메타 도구"""
        servers_info = []
        
        for server in self.project_servers:
            namespace_name = next(
                (ns for ns, orig in self.namespace_registry.get_all_mappings().items() if orig == server.name),
                server.name
            )
            
            servers_info.append({
                "name": server.name,
                "namespace": namespace_name,
                "enabled": server.is_enabled,
                "status": "failed" if server.name in self.failed_servers else "active",
                "command": server.command,
                "description": getattr(server, 'description', None)
            })
        
        result_text = f"📋 Project Servers ({len(self.project_servers)} total):\n\n"
        for info in servers_info:
            status_icon = "❌" if info["status"] == "failed" else ("✅" if info["enabled"] else "⏸️")
            result_text += f"{status_icon} {info['namespace']} ({info['name']})\n"
            result_text += f"   Command: {info['command']}\n"
            if info['description']:
                result_text += f"   Description: {info['description']}\n"
            result_text += "\n"
        
        return JSONResponse(content={
            "jsonrpc": "2.0",
            "id": message.get("id"),
            "result": {
                "content": [{"type": "text", "text": result_text}],
                "_meta": {"servers": servers_info}
            }
        })
    
    async def _meta_server_status(self, message: Dict[str, Any], arguments: Dict[str, Any]) -> JSONResponse:
        """서버 상태 조회 메타 도구"""
        server_name = arguments.get("server_name")
        if not server_name:
            raise ValueError("server_name argument required")
        
        # 서버 찾기 (네임스페이스명 또는 원본명으로)
        target_server = self._find_server_by_namespace(server_name)
        if not target_server:
            target_server = next((s for s in self.project_servers if s.name == server_name), None)
        
        if not target_server:
            raise ValueError(f"Server '{server_name}' not found")
        
        # 상태 정보 수집
        status_info = {
            "name": target_server.name,
            "enabled": target_server.is_enabled,
            "failed": target_server.name in self.failed_servers,
            "command": target_server.command,
            "args": target_server.args or [],
            "env": target_server.env or {},
            "description": getattr(target_server, 'description', None)
        }
        
        # 실시간 연결 테스트 (옵션)
        try:
            if target_server.is_enabled and target_server.name not in self.failed_servers:
                server_config = self._build_server_config_for_server(target_server)
                # 간단한 상태 확인 (타임아웃 짧게)
                connection_status = await mcp_connection_service.check_server_status(
                    str(target_server.id), server_config
                )
                status_info["connection_status"] = connection_status
        except Exception as e:
            status_info["connection_status"] = f"error: {str(e)}"
        
        result_text = f"🔍 Server Status: {target_server.name}\n\n"
        result_text += f"Enabled: {'✅' if status_info['enabled'] else '❌'}\n"
        result_text += f"Failed: {'❌' if status_info['failed'] else '✅'}\n"
        result_text += f"Command: {status_info['command']}\n"
        if status_info['args']:
            result_text += f"Args: {' '.join(status_info['args'])}\n"
        if status_info.get('connection_status'):
            result_text += f"Connection: {status_info['connection_status']}\n"
        
        return JSONResponse(content={
            "jsonrpc": "2.0",
            "id": message.get("id"),
            "result": {
                "content": [{"type": "text", "text": result_text}],
                "_meta": {"server_status": status_info}
            }
        })
    
    async def _meta_switch_namespace(self, message: Dict[str, Any], arguments: Dict[str, Any]) -> JSONResponse:
        """네임스페이스 구분자 변경 메타 도구"""
        new_separator = arguments.get("separator")
        if not new_separator:
            raise ValueError("separator argument required")
        
        if not NamespaceConfig.validate_separator(new_separator):
            raise ValueError(f"Invalid separator '{new_separator}'. Valid separators: {[s.value for s in NamespaceConfig.NamespaceSeparator]}")
        
        old_separator = self.tool_naming.separator
        
        # 새로운 구분자로 업데이트
        self.tool_naming = UnifiedToolNaming(new_separator)
        
        # 네임스페이스 레지스트리 재구성
        self.namespace_registry.clear()
        self._register_servers()
        
        result_text = f"🔄 Namespace separator changed: '{old_separator}' → '{new_separator}'\n\n"
        result_text += "All tool names will now use the new separator format.\n"
        result_text += "Use tools/list to see updated tool names."
        
        logger.info(f"🔄 Namespace separator changed: '{old_separator}' → '{new_separator}' (session: {self.session_id})")
        
        return JSONResponse(content={
            "jsonrpc": "2.0",
            "id": message.get("id"),
            "result": {
                "content": [{"type": "text", "text": result_text}],
                "_meta": {
                    "old_separator": old_separator,
                    "new_separator": new_separator
                }
            }
        })
    
    async def _meta_project_info(self, message: Dict[str, Any]) -> JSONResponse:
        """프로젝트 정보 조회 메타 도구"""
        project_info = {
            "project_id": str(self.project_id),
            "total_servers": len(self.project_servers),
            "active_servers": len([s for s in self.project_servers if s.is_enabled]),
            "failed_servers": len(self.failed_servers),
            "namespace_separator": self.tool_naming.separator,
            "session_id": self.session_id
        }
        
        result_text = f"📊 Project Information\n\n"
        result_text += f"Project ID: {project_info['project_id']}\n"
        result_text += f"Total Servers: {project_info['total_servers']}\n"
        result_text += f"Active Servers: {project_info['active_servers']}\n"
        result_text += f"Failed Servers: {project_info['failed_servers']}\n"
        result_text += f"Namespace Separator: '{project_info['namespace_separator']}'\n"
        result_text += f"Session ID: {project_info['session_id']}\n"
        
        return JSONResponse(content={
            "jsonrpc": "2.0",
            "id": message.get("id"),
            "result": {
                "content": [{"type": "text", "text": result_text}],
                "_meta": {"project_info": project_info}
            }
        })
    
    def _find_server_by_namespace(self, namespace_name: str) -> Optional[McpServer]:
        """네임스페이스명으로 서버 찾기"""
        original_name = self.namespace_registry.get_original_name(namespace_name)
        if not original_name:
            # 직접 이름 매칭 시도
            original_name = namespace_name
        
        return next((s for s in self.project_servers if s.name == original_name), None)
    
    def _build_server_config_for_server(self, server: McpServer) -> Optional[Dict[str, Any]]:
        """특정 서버용 설정 구성"""
        try:
            return {
                'command': server.command,
                'args': server.args or [],
                'env': server.env or {},
                'timeout': getattr(server, 'timeout', 60),
                'transportType': getattr(server, 'transport_type', 'stdio'),
                'disabled': not server.is_enabled
            }
        except Exception as e:
            logger.error(f"Error building server config for {server.name}: {e}")
            return None


# 사용자 인증 (기존 로직 재사용)
async def get_current_user_for_unified_mcp(
    request: Request,
    project_id: UUID,
    db: Session = Depends(get_db)
) -> Optional[User]:
    """Unified MCP용 유연한 사용자 인증 (기존 로직 재사용)"""
    
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
        logger.info(f"Unified SSE connection allowed without auth for project {project_id}")
        return None
    
    # 인증이 필요한 경우 JWT 토큰 확인
    user = await get_user_from_jwt_token(request, db)
    if not user:
        if hasattr(request.state, 'user') and request.state.user:
            user = request.state.user
            logger.info(f"Authenticated unified SSE request via API key for project {project_id}, user={user.email}")
            return user
        
        logger.warning(f"Unified SSE authentication required but no valid token for project {project_id}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required"
        )
    
    logger.info(f"Authenticated unified SSE request for project {project_id}, user={user.email}")
    return user


@router.get("/projects/{project_id}/unified/sse")
async def unified_mcp_endpoint(
    project_id: UUID,
    request: Request,
    db: Session = Depends(get_db)
):
    """
    🎯 Unified MCP SSE 엔드포인트
    
    프로젝트의 모든 MCP 서버를 하나의 엔드포인트로 통합 제공.
    기존 개별 서버 엔드포인트(/projects/{id}/servers/{name}/sse)와 병행 사용 가능.
    
    Features:
    - 네임스페이스 기반 툴 관리 (예: github.create_issue)
    - 에러 격리 (개별 서버 실패가 전체에 영향 없음)
    - 오케스트레이터 메타 도구 (orchestrator.list_servers 등)
    - 전역 네임스페이스 구분자 사용 (변경은 NAMESPACE_SEPARATOR 상수만 수정)
    """
    try:
        # 1. 사용자 인증
        current_user = await get_current_user_for_unified_mcp(request, project_id, db)
        
        if current_user:
            logger.info(f"🔐 Unified MCP connection: project={project_id}, user={current_user.email}")
        else:
            logger.info(f"🔓 Unified MCP connection (no auth): project={project_id}")
        
        logger.info(f"🎯 Using global namespace separator: '{NAMESPACE_SEPARATOR}'")
        
        # 4. 프로젝트 서버 조회 (활성/비활성 모두 포함)
        servers = db.query(McpServer).filter(
            McpServer.project_id == project_id
        ).all()
        
        if not servers:
            logger.warning(f"No servers found in project {project_id}")
            # 서버가 없어도 연결은 허용 (메타 도구만 사용 가능)
        
        active_servers = [s for s in servers if s.is_enabled]
        logger.info(f"📊 Project {project_id}: {len(servers)} total servers, {len(active_servers)} active")
        
        # 5. 세션 ID 생성
        session_id = str(uuid.uuid4())
        
        # 6. 통합 메시지 엔드포인트
        base_url = str(request.base_url).rstrip('/')
        message_endpoint = f"{base_url}/projects/{project_id}/unified/messages"
        
        # 7. UnifiedMCPTransport 생성 및 저장
        transport = UnifiedMCPTransport(
            session_id, message_endpoint, servers, project_id
        )
        sse_transports[session_id] = transport
        
        logger.info(f"🚀 Unified MCP transport started: session={session_id}, servers={len(servers)}, separator='{NAMESPACE_SEPARATOR}'")
        
        # 8. SSE 스트림 시작
        async def unified_sse_generator():
            try:
                async for chunk in transport.start_sse_stream():
                    yield chunk
            finally:
                # 정리
                if session_id in sse_transports:
                    del sse_transports[session_id]
                logger.info(f"🧹 Cleaned up unified transport for session {session_id}")
        
        return StreamingResponse(
            unified_sse_generator(),
            media_type="text/event-stream",
            headers={
                # MCP 표준 SSE 헤더
                "Cache-Control": "no-cache, no-store, must-revalidate",
                "Connection": "keep-alive",
                "Content-Type": "text/event-stream; charset=utf-8",
                
                # CORS 헤더 (MCP 클라이언트 호환)
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Headers": "Content-Type, Authorization, Accept",
                "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
                "Access-Control-Expose-Headers": "Content-Type",
                
                # 메타 정보 헤더
                "X-Session-ID": session_id,
                "X-Mode": "unified",
                "X-Servers-Total": str(len(servers)),
                "X-Servers-Active": str(len(active_servers)),
                "X-Namespace-Separator": namespace_separator,
                
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
        logger.error(f"❌ Unified MCP SSE error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Unified MCP SSE connection failed: {str(e)}"
        )


@router.post("/projects/{project_id}/unified/messages")
async def unified_mcp_messages_endpoint(
    project_id: UUID,
    request: Request,
    sessionId: str = Query(..., description="MCP 세션 ID")
):
    """
    🎯 Unified MCP 메시지 엔드포인트 (세션 기반)
    
    통합 MCP 서버의 JSON-RPC 메시지 처리:
    - 네임스페이스 기반 툴 라우팅
    - 오케스트레이터 메타 도구 처리
    - 에러 격리 및 상세 에러 정보 제공
    """
    
    logger.info(f"📥 Unified POST message for session: {sessionId}")
    
    try:
        # 1. 세션별 Transport 조회
        transport = sse_transports.get(sessionId)
        if not transport:
            logger.error(f"❌ Unified session {sessionId} not found")
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Unified session not found: {sessionId}"
            )
        
        # 2. Unified Transport 타입 확인
        if not isinstance(transport, UnifiedMCPTransport):
            logger.error(f"❌ Session {sessionId} is not a unified transport")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Session {sessionId} is not a unified MCP transport"
            )
        
        # 3. 프로젝트 검증
        if transport.project_id != project_id:
            logger.error(f"❌ Session {sessionId} project mismatch")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Session project mismatch"
            )
        
        # 4. Unified Transport를 통한 메시지 처리
        logger.info(f"✅ Routing unified message to transport for session {sessionId}")
        return await transport.handle_post_message(request)
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Error in unified MCP messages endpoint: {e}")
        
        # JSON-RPC 오류 응답
        error_response = {
            "jsonrpc": "2.0",
            "id": None,
            "error": {
                "code": -32000,
                "message": f"Unified message processing failed: {str(e)}",
                "data": {
                    "mode": "unified",
                    "error_type": type(e).__name__
                }
            }
        }
        return JSONResponse(content=error_response, status_code=200)
"""
Unified MCP Transport - 통합 MCP 서버 구현

프로젝트의 모든 MCP 서버를 하나의 엔드포인트로 통합하여 제공.
기존 개별 서버 기능은 완전히 유지하면서 추가 옵션으로 제공.
"""

import asyncio
import json
import logging
import uuid
from datetime import datetime, timedelta
from typing import Dict, Any, Optional, List, AsyncGenerator
from uuid import UUID
from enum import Enum

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
    NamespaceRegistry, OrchestratorMetaTools, UnifiedToolNaming,
    create_namespaced_name, parse_namespaced_name, is_namespaced, 
    get_meta_tool_prefix, NAMESPACE_SEPARATOR
)

logger = logging.getLogger(__name__)

router = APIRouter(tags=["unified-mcp"])


# ============================================================================
# 구조화된 로깅 시스템
# ============================================================================

class StructuredLogger:
    """통합 MCP 서버용 구조화된 로깅 클래스"""
    
    def __init__(self, session_id: str, project_id: UUID):
        self.session_id = session_id
        self.project_id = str(project_id)
        self.logger = logger
    
    def _log_structured(self, level: str, event: str, **kwargs):
        """구조화된 로그 생성"""
        log_data = {
            "timestamp": datetime.now().isoformat(),
            "level": level,
            "event": event,
            "session_id": self.session_id,
            "project_id": self.project_id,
            **kwargs
        }
        
        # JSON 형태로 로깅 (운영환경에서 파싱 용이)
        log_message = json.dumps(log_data, ensure_ascii=False)
        
        # 레벨에 따라 적절한 로거 메서드 호출
        if level == "error":
            self.logger.error(log_message)
        elif level == "warning":
            self.logger.warning(log_message)
        elif level == "info":
            self.logger.info(log_message)
        else:
            self.logger.debug(log_message)
    
    def server_success(self, server_name: str, tools_count: int = 0, **kwargs):
        """서버 성공 로그"""
        self._log_structured(
            "info", "server_success",
            server_name=server_name,
            tools_count=tools_count,
            **kwargs
        )
    
    def server_failure(self, server_name: str, error_type: str, error_message: str, 
                      consecutive_failures: int = 0, **kwargs):
        """서버 실패 로그"""
        self._log_structured(
            "error", "server_failure",
            server_name=server_name,
            error_type=error_type,
            error_message=error_message,
            consecutive_failures=consecutive_failures,
            **kwargs
        )
    
    def tool_call_start(self, tool_name: str, server_name: str, namespace: str, **kwargs):
        """툴 호출 시작 로그"""
        self._log_structured(
            "info", "tool_call_start",
            tool_name=tool_name,
            server_name=server_name,
            namespace=namespace,
            **kwargs
        )
    
    def tool_call_success(self, tool_name: str, server_name: str, namespace: str, 
                         execution_time_ms: float = None, **kwargs):
        """툴 호출 성공 로그"""
        self._log_structured(
            "info", "tool_call_success",
            tool_name=tool_name,
            server_name=server_name,
            namespace=namespace,
            execution_time_ms=execution_time_ms,
            **kwargs
        )
    
    def tool_call_failure(self, tool_name: str, server_name: str, namespace: str,
                         error_type: str, error_message: str, **kwargs):
        """툴 호출 실패 로그"""
        self._log_structured(
            "error", "tool_call_failure",
            tool_name=tool_name,
            server_name=server_name,
            namespace=namespace,
            error_type=error_type,
            error_message=error_message,
            **kwargs
        )
    
    def session_event(self, event_type: str, **kwargs):
        """세션 이벤트 로그"""
        self._log_structured(
            "info", "session_event",
            event_type=event_type,
            **kwargs
        )


# ============================================================================
# 서버 상태 추적 및 에러 격리 시스템
# ============================================================================

class ServerErrorType(Enum):
    """서버 에러 타입 분류"""
    CONNECTION_TIMEOUT = "connection_timeout"
    CONNECTION_REFUSED = "connection_refused"
    INVALID_RESPONSE = "invalid_response"
    TOOL_EXECUTION_ERROR = "tool_execution_error"
    SERVER_CRASH = "server_crash"
    AUTHENTICATION_ERROR = "authentication_error"
    UNKNOWN_ERROR = "unknown_error"


class ServerStatus(Enum):
    """서버 상태"""
    HEALTHY = "healthy"
    DEGRADED = "degraded"  # 일부 기능만 작동
    FAILED = "failed"      # 완전히 실패
    RECOVERING = "recovering"  # 복구 시도 중


class ServerHealthInfo:
    """개별 서버 헬스 정보"""
    
    def __init__(self, server_name: str):
        self.server_name = server_name
        self.status = ServerStatus.HEALTHY
        self.last_success_time = datetime.now()
        self.last_failure_time: Optional[datetime] = None
        self.failure_count = 0
        self.consecutive_failures = 0
        self.last_error_type: Optional[ServerErrorType] = None
        self.last_error_message: Optional[str] = None
        self.recovery_attempts = 0
        self.tools_available = 0
        self.tools_failed = 0
    
    def record_success(self):
        """성공 기록"""
        self.status = ServerStatus.HEALTHY
        self.last_success_time = datetime.now()
        self.consecutive_failures = 0
        self.recovery_attempts = 0
        self.last_error_type = None
        self.last_error_message = None
    
    def record_failure(self, error_type: ServerErrorType, error_message: str):
        """실패 기록"""
        self.last_failure_time = datetime.now()
        self.failure_count += 1
        self.consecutive_failures += 1
        self.last_error_type = error_type
        self.last_error_message = error_message
        
        # 상태 결정
        if self.consecutive_failures >= 5:
            self.status = ServerStatus.FAILED
        elif self.consecutive_failures >= 2:
            self.status = ServerStatus.DEGRADED
    
    def start_recovery(self):
        """복구 시작"""
        self.status = ServerStatus.RECOVERING
        self.recovery_attempts += 1
    
    def is_failed(self) -> bool:
        """서버가 실패 상태인지 확인"""
        return self.status == ServerStatus.FAILED
    
    def should_retry(self) -> bool:
        """재시도 해야 하는지 확인"""
        if self.status == ServerStatus.HEALTHY:
            return True
        
        # 최근 실패가 5분 이전이면 재시도
        if self.last_failure_time and \
           datetime.now() - self.last_failure_time > timedelta(minutes=5):
            return True
        
        return False
    
    def get_health_summary(self) -> Dict[str, Any]:
        """헬스 요약 정보 반환"""
        return {
            "server_name": self.server_name,
            "status": self.status.value,
            "last_success": self.last_success_time.isoformat() if self.last_success_time else None,
            "last_failure": self.last_failure_time.isoformat() if self.last_failure_time else None,
            "failure_count": self.failure_count,
            "consecutive_failures": self.consecutive_failures,
            "last_error_type": self.last_error_type.value if self.last_error_type else None,
            "last_error_message": self.last_error_message,
            "recovery_attempts": self.recovery_attempts,
            "tools_available": self.tools_available,
            "tools_failed": self.tools_failed
        }


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
        self.server_health = {}  # 서버별 헬스 정보 추적
        self.structured_logger = StructuredLogger(session_id, project_id)  # 구조화된 로깅
        self.tool_naming = UnifiedToolNaming()  # 🔧 ADD: tool_naming 속성 초기화
        
        # 레거시 모드 초기화 (기본값: False)
        self._legacy_mode = False
        
        # 서버 헬스 정보 초기화
        for server in project_servers:
            if server.is_enabled:
                self.server_health[server.name] = ServerHealthInfo(server.name)
        
        # 서버 네임스페이스 등록
        self._register_servers()
        
        # 세션 시작 로그
        self.structured_logger.session_event(
            "session_created",
            servers_count=len(project_servers),
            enabled_servers_count=len([s for s in project_servers if s.is_enabled]),
            namespace_separator=NAMESPACE_SEPARATOR
        )
        
        logger.info(f"🚀 UnifiedMCPTransport created: session={session_id}, servers={len(project_servers)}, separator='{NAMESPACE_SEPARATOR}'")
    
    async def handle_post_message(self, request: Request) -> JSONResponse:
        """
        🎯 Unified MCP POST 메시지 처리 (오버라이드)
        
        UnifiedMCPTransport용 메시지 라우팅:
        - initialize: 통합 서버 초기화
        - tools/list: 모든 서버의 네임스페이스 툴 목록
        - tools/call: 네임스페이스 기반 툴 라우팅
        - notifications/*: 알림 처리
        """
        logger.info(f"🚀 UNIFIED handle_post_message called for session {self.session_id}")
        logger.info(f"🚀 Class type: {type(self).__name__}")
        
        try:
            message = await request.json()
            method = message.get("method")
            request_id = message.get("id")
            
            logger.info(f"📥 🎯 UNIFIED session {self.session_id} received: {method} (id={request_id})")
            logger.debug(f"🔍 Unified message content: {json.dumps(message, indent=2)}")
            
            # JSON-RPC 2.0 검증
            if message.get("jsonrpc") != "2.0":
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Invalid JSON-RPC version"
                )
            
            if not method:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Missing method field"
                )
            
            # Unified 메서드별 처리 (기본 MCPSSETransport와 다른 라우팅)
            if method == "initialize":
                logger.info(f"🎯 🚀 UNIFIED initialize for session {self.session_id}")
                return await self.handle_initialize(message)
            elif method == "tools/list":
                logger.info(f"📋 🚀 UNIFIED tools/list for session {self.session_id}")
                return await self.handle_tools_list(message)
            elif method == "tools/call":
                logger.info(f"🔧 🚀 UNIFIED tools/call for session {self.session_id}")
                return await self.handle_tool_call(message)
            elif method.startswith("notifications/"):
                logger.info(f"📢 🚀 UNIFIED notification for session {self.session_id}: {method}")
                return await self.handle_notification(message)
            else:
                # 알 수 없는 메서드
                logger.warning(f"❓ 🚀 UNIFIED unknown method received: {method}")
                error_response = {
                    "jsonrpc": "2.0",
                    "id": request_id,
                    "error": {
                        "code": -32601,
                        "message": f"Method not found: {method}"
                    }
                }
                return JSONResponse(content=error_response, status_code=200)
                
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"❌ 🚀 UNIFIED error processing message in session {self.session_id}: {e}")
            
            # JSON-RPC 오류 응답
            error_response = {
                "jsonrpc": "2.0",
                "id": message.get("id") if 'message' in locals() else None,
                "error": {
                    "code": -32000,
                    "message": f"Unified message processing error: {str(e)}",
                    "data": {
                        "mode": "unified",
                        "error_type": type(e).__name__
                    }
                }
            }
            return JSONResponse(content=error_response, status_code=200)
    
    async def handle_notification(self, message: Dict[str, Any]) -> JSONResponse:
        """
        🎯 Unified MCP 알림 처리 (오버라이드)
        
        UnifiedMCPTransport용 알림 처리:
        - notifications/initialized: 초기화 완료 알림
        - 기타 알림: 로깅 및 응답
        """
        method = message.get("method")
        logger.info(f"📢 Unified notification received in session {self.session_id}: {method}")
        
        # notifications/initialized 특별 처리 - Inspector 연결 완료 핵심
        if method == "notifications/initialized":
            logger.info(f"🎯 CRITICAL: Unified notifications/initialized received for session {self.session_id}")
            
            # 구조화된 로깅
            self.structured_logger.session_event(
                "initialized_notification_received",
                servers_count=len(self.project_servers),
                active_servers_count=len([s for s in self.project_servers if s.is_enabled])
            )
        
        # 알림은 응답이 필요 없으므로 200 OK 응답
        return JSONResponse(content={"status": "ok"}, status_code=200)
    
    def _register_servers(self):
        """프로젝트 서버들을 네임스페이스 레지스트리에 등록"""
        for server in self.project_servers:
            if server.is_enabled:
                namespace_name = self.namespace_registry.register_server(server.name)
                logger.debug(f"Registered server: '{server.name}' → '{namespace_name}'")
    
    def _classify_error(self, error: Exception) -> ServerErrorType:
        """에러를 분류하여 적절한 타입 반환"""
        error_msg = str(error).lower()
        
        if "timeout" in error_msg or "timed out" in error_msg:
            return ServerErrorType.CONNECTION_TIMEOUT
        elif "connection refused" in error_msg or "connection reset" in error_msg:
            return ServerErrorType.CONNECTION_REFUSED
        elif "authentication" in error_msg or "unauthorized" in error_msg:
            return ServerErrorType.AUTHENTICATION_ERROR
        elif "invalid response" in error_msg or "json" in error_msg:
            return ServerErrorType.INVALID_RESPONSE
        elif "crashed" in error_msg or "terminated" in error_msg:
            return ServerErrorType.SERVER_CRASH
        else:
            return ServerErrorType.UNKNOWN_ERROR
    
    def _record_server_success(self, server_name: str, tools_count: int = 0):
        """서버 성공 기록"""
        if server_name in self.server_health:
            health_info = self.server_health[server_name]
            health_info.record_success()
            health_info.tools_available = tools_count
            
            # 구조화된 로깅
            self.structured_logger.server_success(
                server_name=server_name,
                tools_count=tools_count,
                status=health_info.status.value
            )
            
            logger.debug(f"✅ Server success recorded: {server_name} ({tools_count} tools)")
    
    def _record_server_failure(self, server_name: str, error: Exception):
        """서버 실패 기록"""
        error_type = self._classify_error(error)
        error_message = str(error)
        
        if server_name in self.server_health:
            health_info = self.server_health[server_name]
            health_info.record_failure(error_type, error_message)
            
            # 구조화된 로깅
            self.structured_logger.server_failure(
                server_name=server_name,
                error_type=error_type.value,
                error_message=error_message,
                consecutive_failures=health_info.consecutive_failures,
                status=health_info.status.value
            )
            
            logger.warning(f"❌ Server failure recorded: {server_name}")
            logger.warning(f"   Error type: {error_type.value}")
            logger.warning(f"   Consecutive failures: {health_info.consecutive_failures}")
            logger.warning(f"   Status: {health_info.status.value}")
    
    def _is_server_available(self, server_name: str) -> bool:
        """서버가 사용 가능한지 확인"""
        if server_name not in self.server_health:
            return True  # 새 서버는 기본적으로 사용 가능
        
        health_info = self.server_health[server_name]
        return not health_info.is_failed() and health_info.should_retry()
    
    def _get_failed_servers(self) -> List[str]:
        """실패한 서버 목록 반환"""
        failed = []
        for server_name, health_info in self.server_health.items():
            if health_info.is_failed():
                failed.append(server_name)
        return failed
    
    def _get_server_health_summary(self) -> Dict[str, Any]:
        """전체 서버 헬스 요약 정보"""
        summary = {
            "total_servers": len(self.project_servers),
            "healthy_servers": 0,
            "degraded_servers": 0,
            "failed_servers": 0,
            "servers": {}
        }
        
        for server_name, health_info in self.server_health.items():
            status = health_info.status
            if status == ServerStatus.HEALTHY:
                summary["healthy_servers"] += 1
            elif status == ServerStatus.DEGRADED:
                summary["degraded_servers"] += 1
            elif status == ServerStatus.FAILED:
                summary["failed_servers"] += 1
            
            summary["servers"][server_name] = health_info.get_health_summary()
        
        return summary
    
    async def handle_initialize(self, message: Dict[str, Any]) -> JSONResponse:
        """
        통합 서버 초기화 - 기존 로직 확장
        """
        request_id = message.get("id")
        params = message.get("params", {})
        
        logger.info(f"🎯 Unified MCP initialize: session={self.session_id}, servers={len(self.project_servers)}")
        
        # 활성 서버 수 확인
        active_servers = [s for s in self.project_servers if s.is_enabled]
        
        # MCP 표준 초기화 응답 (개별 서버 호환성)
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
                    "name": f"mcp-orch-unified",
                    "version": "1.0.0"
                },
                "instructions": f"MCP Orchestrator unified proxy for project {self.project_id}. Use tools/list to see available tools."
            }
        }
        
        logger.info(f"✅ Unified initialize complete: session={self.session_id}")
        return JSONResponse(content=response)
    
    async def handle_tools_list(self, message: Dict[str, Any]) -> JSONResponse:
        """모든 활성 서버의 툴을 네임스페이스와 함께 반환"""
        all_tools = []
        failed_servers = []
        active_servers = [s for s in self.project_servers if s.is_enabled]
        
        # 클라이언트 호환성을 위한 레거시 모드 감지 (Inspector 호환성을 위해 기본 활성화)
        request_id = message.get("id")
        legacy_mode = getattr(self, '_legacy_mode', True)  # 기본값 True (Inspector 호환성)
        
        logger.info(f"📋 Listing unified tools from {len(active_servers)} servers (legacy_mode: {legacy_mode})")
        
        # 각 서버에서 툴 수집 (강화된 에러 격리)
        for server in active_servers:
            try:
                # 서버 헬스 체크
                if not self._is_server_available(server.name):
                    logger.debug(f"Skipping unavailable server: {server.name}")
                    failed_servers.append(server.name)
                    continue
                
                # 서버 설정 구성
                server_config = self._build_server_config_for_server(server)
                if not server_config:
                    error_msg = f"Failed to build config for server: {server.name}"
                    logger.warning(error_msg)
                    self._record_server_failure(server.name, Exception(error_msg))
                    failed_servers.append(server.name)
                    continue
                
                # 기존 mcp_connection_service 활용 (에러 격리)
                tools = await mcp_connection_service.get_server_tools(
                    str(server.id), server_config
                )
                
                if tools is None:
                    error_msg = f"No tools returned from server: {server.name}"
                    logger.warning(error_msg)
                    self._record_server_failure(server.name, Exception(error_msg))
                    failed_servers.append(server.name)
                    continue
                
                # 네임스페이스 적용
                namespace_name = self.namespace_registry.get_original_name(server.name)
                if not namespace_name:
                    namespace_name = self.namespace_registry.register_server(server.name)
                
                for tool in tools:
                    try:
                        processed_tool = tool.copy()
                        
                        if legacy_mode:
                            # 레거시 모드: 네임스페이스 없이 원본 도구명 사용
                            # 메타데이터 최소화
                            pass  # 원본 도구명 그대로 사용
                        else:
                            # 표준 모드: 네임스페이스 적용
                            processed_tool['name'] = create_namespaced_name(
                                namespace_name, tool['name']
                            )
                            
                            # 메타데이터 추가
                            processed_tool['_source_server'] = server.name
                            processed_tool['_original_name'] = tool['name']
                            processed_tool['_namespace'] = namespace_name
                        
                        all_tools.append(processed_tool)
                        
                    except Exception as e:
                        logger.error(f"Error processing tool {tool.get('name', 'unknown')} from {server.name}: {e}")
                        
                # 서버 성공 기록
                self._record_server_success(server.name, len(tools))
                logger.info(f"✅ Collected {len(tools)} tools from server: {server.name}")
                
            except Exception as e:
                logger.error(f"❌ Failed to get tools from server {server.name}: {e}")
                self._record_server_failure(server.name, e)
                failed_servers.append(server.name)
                # 개별 서버 실패가 전체를 망가뜨리지 않도록 continue
        
        # 오케스트레이터 메타 도구 추가 (레거시 모드에서는 제외)
        if not legacy_mode:
            try:
                meta_tools = OrchestratorMetaTools.get_meta_tools()
                all_tools.extend(meta_tools)
                logger.info(f"✅ Added {len(meta_tools)} orchestrator meta tools")
            except Exception as e:
                logger.error(f"❌ Failed to add meta tools: {e}")
        
        # 응답 구성
        response = {
            "jsonrpc": "2.0",
            "id": request_id,
            "result": {
                "tools": all_tools
            }
        }
        
        # 표준 모드에서만 _meta 정보 추가
        if not legacy_mode:
            response["result"]["_meta"] = {
                "total_servers": len(self.project_servers),
                "active_servers": len(active_servers),
                "successful_servers": len(active_servers) - len(failed_servers),
                "failed_servers": failed_servers,
                "namespace_separator": NAMESPACE_SEPARATOR,
                "total_tools": len(all_tools),
                "meta_tools": len([t for t in all_tools if t.get('_meta', {}).get('type') == 'orchestrator']),
                "server_health": self._get_server_health_summary()
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
            
            # 서버 헬스 체크
            if not self._is_server_available(target_server.name):
                health_info = self.server_health.get(target_server.name)
                if health_info:
                    raise ValueError(f"Server '{namespace_name}' is unavailable (Status: {health_info.status.value}, Failures: {health_info.consecutive_failures})")
                else:
                    raise ValueError(f"Server '{namespace_name}' is unavailable")
            
            # 개별 서버 호출 (기존 로직 재사용)
            server_config = self._build_server_config_for_server(target_server)
            if not server_config:
                raise ValueError(f"Failed to build configuration for server '{namespace_name}'")
            
            logger.info(f"🎯 Routing to server: {namespace_name} → {target_server.name}.{tool_name}")
            
            # 툴 호출 시작 로그
            self.structured_logger.tool_call_start(
                tool_name=tool_name,
                server_name=target_server.name,
                namespace=namespace_name,
                arguments_keys=list(arguments.keys()) if arguments else []
            )
            
            # 도구 호출 (강화된 에러 격리)
            start_time = datetime.now()
            try:
                result = await mcp_connection_service.call_tool(
                    str(target_server.id), server_config, tool_name, arguments
                )
                
                # 실행 시간 계산
                execution_time_ms = (datetime.now() - start_time).total_seconds() * 1000
                
                # 성공 기록
                self._record_server_success(target_server.name)
                
                # 툴 호출 성공 로그
                self.structured_logger.tool_call_success(
                    tool_name=tool_name,
                    server_name=target_server.name,
                    namespace=namespace_name,
                    execution_time_ms=execution_time_ms
                )
                
            except Exception as e:
                # 에러 타입 분류
                error_type = self._classify_error(e)
                
                # 서버 실패 기록
                self._record_server_failure(target_server.name, e)
                
                # 툴 호출 실패 로그
                self.structured_logger.tool_call_failure(
                    tool_name=tool_name,
                    server_name=target_server.name,
                    namespace=namespace_name,
                    error_type=error_type.value,
                    error_message=str(e)
                )
                
                # 사용자 친화적 에러 메시지 생성
                health_info = self.server_health.get(target_server.name)
                if health_info:
                    error_context = f"Error type: {health_info.last_error_type.value if health_info.last_error_type else 'unknown'}, Consecutive failures: {health_info.consecutive_failures}"
                else:
                    error_context = "Server error details unavailable"
                
                raise ValueError(f"Tool execution failed on server '{namespace_name}': {str(e)} ({error_context})")
            
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
                        "execution_mode": "unified",
                        "server_health": self.server_health.get(target_server.name, {}).get_health_summary() if target_server.name in self.server_health else None
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
            
            meta_prefix = get_meta_tool_prefix()
            
            if tool_name == f"{meta_prefix}list_servers":
                return await self._meta_list_servers(message)
            elif tool_name == f"{meta_prefix}server_status":
                return await self._meta_server_status(message, arguments)
            elif tool_name == f"{meta_prefix}project_info":
                return await self._meta_project_info(message)
            elif tool_name == f"{meta_prefix}recover_failed_servers":
                return await self._meta_recover_failed_servers(message, arguments)
            elif tool_name == f"{meta_prefix}health_report":
                return await self._meta_health_report(message)
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
            
            # 서버 헬스 정보 추가
            health_info = self.server_health.get(server.name)
            if health_info:
                status = health_info.status.value
                tools_count = health_info.tools_available
                consecutive_failures = health_info.consecutive_failures
            else:
                status = "unknown"
                tools_count = 0
                consecutive_failures = 0
            
            servers_info.append({
                "name": server.name,
                "namespace": namespace_name,
                "enabled": server.is_enabled,
                "status": status,
                "command": server.command,
                "description": getattr(server, 'description', None),
                "tools_count": tools_count,
                "consecutive_failures": consecutive_failures
            })
        
        result_text = f"📋 Project Servers ({len(self.project_servers)} total):\n\n"
        for info in servers_info:
            # 상태별 아이콘 결정
            if info["status"] == "failed":
                status_icon = "❌"
            elif info["status"] == "degraded":
                status_icon = "⚠️"
            elif info["status"] == "healthy" and info["enabled"]:
                status_icon = "✅"
            elif not info["enabled"]:
                status_icon = "⏸️"
            else:
                status_icon = "❓"
            
            result_text += f"{status_icon} {info['namespace']} ({info['name']})\n"
            result_text += f"   Status: {info['status']}\n"
            result_text += f"   Command: {info['command']}\n"
            result_text += f"   Tools Available: {info['tools_count']}\n"
            
            if info['consecutive_failures'] > 0:
                result_text += f"   Consecutive Failures: {info['consecutive_failures']}\n"
            
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
    
    async def _meta_recover_failed_servers(self, message: Dict[str, Any], arguments: Dict[str, Any]) -> JSONResponse:
        """실패한 서버 복구 시도 메타 도구"""
        target_server_name = arguments.get("server_name")
        
        if target_server_name:
            # 특정 서버 복구
            servers_to_recover = [s for s in self.project_servers if s.name == target_server_name]
            if not servers_to_recover:
                raise ValueError(f"Server '{target_server_name}' not found")
        else:
            # 모든 실패한 서버 복구
            failed_server_names = self._get_failed_servers()
            servers_to_recover = [s for s in self.project_servers if s.name in failed_server_names]
        
        recovery_results = []
        
        for server in servers_to_recover:
            health_info = self.server_health.get(server.name)
            if not health_info:
                continue
            
            logger.info(f"🔄 Attempting to recover server: {server.name}")
            
            # 복구 시도 기록
            health_info.start_recovery()
            
            try:
                # 서버 설정 구성 시도
                server_config = self._build_server_config_for_server(server)
                if not server_config:
                    recovery_results.append({
                        "server": server.name,
                        "success": False,
                        "error": "Failed to build server configuration"
                    })
                    continue
                
                # 서버 도구 목록 가져오기 시도 (연결 테스트)
                tools = await mcp_connection_service.get_server_tools(
                    str(server.id), server_config
                )
                
                if tools is not None:
                    # 복구 성공
                    self._record_server_success(server.name, len(tools))
                    recovery_results.append({
                        "server": server.name,
                        "success": True,
                        "tools_count": len(tools)
                    })
                    
                    # 구조화된 로깅
                    self.structured_logger.session_event(
                        "server_recovered",
                        server_name=server.name,
                        tools_count=len(tools),
                        recovery_attempts=health_info.recovery_attempts
                    )
                else:
                    recovery_results.append({
                        "server": server.name,
                        "success": False,
                        "error": "Server returned no tools"
                    })
                    
            except Exception as e:
                # 복구 실패
                self._record_server_failure(server.name, e)
                recovery_results.append({
                    "server": server.name,
                    "success": False,
                    "error": str(e)
                })
        
        # 결과 정리
        successful_recoveries = [r for r in recovery_results if r["success"]]
        failed_recoveries = [r for r in recovery_results if not r["success"]]
        
        result_text = f"🔄 Server Recovery Results:\n\n"
        
        if successful_recoveries:
            result_text += f"✅ Successfully Recovered ({len(successful_recoveries)}):\n"
            for result in successful_recoveries:
                result_text += f"   • {result['server']} ({result.get('tools_count', 0)} tools)\n"
            result_text += "\n"
        
        if failed_recoveries:
            result_text += f"❌ Failed to Recover ({len(failed_recoveries)}):\n"
            for result in failed_recoveries:
                result_text += f"   • {result['server']}: {result['error']}\n"
            result_text += "\n"
        
        if not recovery_results:
            result_text += "ℹ️ No servers found for recovery.\n"
        
        result_text += f"Use {get_meta_tool_prefix()}health_report for detailed status information."
        
        return JSONResponse(content={
            "jsonrpc": "2.0",
            "id": message.get("id"),
            "result": {
                "content": [{"type": "text", "text": result_text}],
                "_meta": {
                    "total_attempted": len(recovery_results),
                    "successful": len(successful_recoveries),
                    "failed": len(failed_recoveries),
                    "results": recovery_results
                }
            }
        })
    
    async def _meta_health_report(self, message: Dict[str, Any]) -> JSONResponse:
        """종합 헬스 리포트 및 권장 사항 메타 도구"""
        health_summary = self._get_server_health_summary()
        
        result_text = f"🏥 Server Health Report\n\n"
        
        # 전체 요약
        result_text += f"📊 Summary:\n"
        result_text += f"   Total Servers: {health_summary['total_servers']}\n"
        result_text += f"   ✅ Healthy: {health_summary['healthy_servers']}\n"
        result_text += f"   ⚠️ Degraded: {health_summary['degraded_servers']}\n"
        result_text += f"   ❌ Failed: {health_summary['failed_servers']}\n\n"
        
        # 개별 서버 상세 정보
        recommendations = []
        
        for server_name, server_health in health_summary['servers'].items():
            status = server_health['status']
            
            if status == 'failed':
                result_text += f"❌ {server_name}:\n"
                result_text += f"   Status: Failed ({server_health['consecutive_failures']} consecutive failures)\n"
                result_text += f"   Last Error: {server_health['last_error_type']} - {server_health['last_error_message']}\n"
                result_text += f"   Last Success: {server_health['last_success']}\n"
                
                recommendations.append(f"• Try recovering {server_name} using {get_meta_tool_prefix()}recover_failed_servers")
                
            elif status == 'degraded':
                result_text += f"⚠️ {server_name}:\n"
                result_text += f"   Status: Degraded ({server_health['consecutive_failures']} recent failures)\n"
                result_text += f"   Tools Available: {server_health['tools_available']}\n"
                result_text += f"   Last Error: {server_health['last_error_type']}\n"
                
                recommendations.append(f"• Monitor {server_name} closely - may need attention")
                
            elif status == 'healthy':
                result_text += f"✅ {server_name}: Healthy ({server_health['tools_available']} tools)\n"
            
            result_text += "\n"
        
        # 권장 사항
        if recommendations:
            result_text += "💡 Recommendations:\n"
            for rec in recommendations:
                result_text += f"   {rec}\n"
        else:
            result_text += "✨ All servers are operating normally!\n"
        
        return JSONResponse(content={
            "jsonrpc": "2.0",
            "id": message.get("id"),
            "result": {
                "content": [{"type": "text", "text": result_text}],
                "_meta": health_summary
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
    if is_sse_request and not project.jwt_auth_required:
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
                "X-Namespace-Separator": NAMESPACE_SEPARATOR,
                
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
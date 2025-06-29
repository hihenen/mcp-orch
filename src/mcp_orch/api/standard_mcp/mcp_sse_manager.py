"""
MCP SSE 스트림 관리
실시간 이벤트 스트림, 연결 관리, Keepalive
"""

import logging
import asyncio
import json
from typing import Dict, Any, Optional, AsyncGenerator
from uuid import uuid4

from fastapi import Request
from fastapi.responses import StreamingResponse

from .common import (
    McpMessage,
    McpResponse,
    DEFAULT_KEEPALIVE_INTERVAL,
    MAX_RECONNECT_ATTEMPTS
)
from .mcp_protocol_handler import McpProtocolHandler
from .mcp_server_connector import McpServerConnector

logger = logging.getLogger(__name__)


class McpSseManager:
    """MCP SSE 스트림 관리"""
    
    def __init__(self):
        self.logger = logger
        self.active_sessions = {}  # session_id -> session_info
        self.protocol_handler = McpProtocolHandler()
        self.server_connector = McpServerConnector()
        self.keepalive_interval = DEFAULT_KEEPALIVE_INTERVAL
    
    def create_sse_session(
        self, 
        project_id: str, 
        server_name: str, 
        server_config: Dict[str, Any],
        user_id: str
    ) -> str:
        """SSE 세션 생성"""
        session_id = str(uuid4())
        
        session_info = {
            'session_id': session_id,
            'project_id': project_id,
            'server_name': server_name,
            'server_config': server_config,
            'user_id': user_id,
            'created_at': asyncio.get_event_loop().time(),
            'last_activity': asyncio.get_event_loop().time(),
            'is_active': True,
            'reconnect_count': 0
        }
        
        self.active_sessions[session_id] = session_info
        self.logger.info(f"Created SSE session {session_id} for server {server_name}")
        
        return session_id
    
    async def create_sse_stream(
        self, 
        session_id: str, 
        request: Request
    ) -> StreamingResponse:
        """SSE 스트림 생성"""
        
        async def event_stream() -> AsyncGenerator[str, None]:
            session_info = self.active_sessions.get(session_id)
            if not session_info:
                yield f"data: {json.dumps({'error': 'Session not found'})}\n\n"
                return
            
            try:
                # 연결 확인 메시지
                yield f"data: {json.dumps({'type': 'connection', 'status': 'connected'})}\n\n"
                
                # 초기화 메시지 전송
                await self._send_initialize_message(session_id)
                
                # Keepalive 및 메시지 처리 루프
                last_keepalive = asyncio.get_event_loop().time()
                
                while session_info.get('is_active', False):
                    current_time = asyncio.get_event_loop().time()
                    
                    # Keepalive 전송
                    if current_time - last_keepalive >= self.keepalive_interval:
                        yield f"data: {json.dumps({'type': 'keepalive', 'timestamp': current_time})}\n\n"
                        last_keepalive = current_time
                    
                    # 클라이언트 연결 확인
                    if await request.is_disconnected():
                        self.logger.info(f"Client disconnected for session {session_id}")
                        break
                    
                    # 짧은 대기 (CPU 사용량 제어)
                    await asyncio.sleep(1)
                
            except Exception as e:
                self.logger.error(f"SSE stream error for session {session_id}: {e}")
                yield f"data: {json.dumps({'error': str(e)})}\n\n"
            finally:
                # 세션 정리
                await self._cleanup_session(session_id)
        
        return StreamingResponse(
            event_stream(),
            media_type="text/event-stream",
            headers={
                "Cache-Control": "no-cache",
                "Connection": "keep-alive",
                "Access-Control-Allow-Origin": "*",
            }
        )
    
    async def _send_initialize_message(self, session_id: str):
        """세션에 초기화 메시지 전송"""
        session_info = self.active_sessions.get(session_id)
        if not session_info:
            return
        
        try:
            # MCP 서버에 초기화 메시지 전송
            init_message = {
                "jsonrpc": "2.0",
                "id": 0,
                "method": "initialize",
                "params": {
                    "protocolVersion": "2025-03-26",
                    "capabilities": {},
                    "clientInfo": {
                        "name": "mcp-orch",
                        "version": "1.0.0"
                    }
                }
            }
            
            response = await self.server_connector.forward_message_to_server(
                session_info['server_config'],
                init_message
            )
            
            if response:
                # 클라이언트에 초기화 응답 전송
                await self._send_message_to_session(session_id, response)
                
                # initialized 알림 전송
                initialized_notification = self.protocol_handler.create_notification(
                    "notifications/initialized"
                )
                await self._send_message_to_session(session_id, initialized_notification)
                
                self.logger.info(f"Initialization completed for session {session_id}")
                
        except Exception as e:
            self.logger.error(f"Initialization failed for session {session_id}: {e}")
    
    async def _send_message_to_session(self, session_id: str, message: McpResponse):
        """세션에 메시지 전송"""
        session_info = self.active_sessions.get(session_id)
        if not session_info or not session_info.get('is_active'):
            return False
        
        try:
            # 메시지를 세션의 메시지 큐에 추가 (실제 구현에서는 큐 시스템 필요)
            message_data = {
                'type': 'mcp_message',
                'data': message,
                'timestamp': asyncio.get_event_loop().time()
            }
            
            # 실제로는 SSE 스트림에 직접 전송해야 하지만,
            # 여기서는 로깅으로 대체
            self.logger.info(f"Message queued for session {session_id}: {message.get('method', 'response')}")
            
            # 세션 활동 시간 업데이트
            session_info['last_activity'] = asyncio.get_event_loop().time()
            
            return True
            
        except Exception as e:
            self.logger.error(f"Failed to send message to session {session_id}: {e}")
            return False
    
    async def handle_client_message(self, session_id: str, message: McpMessage) -> Optional[McpResponse]:
        """클라이언트 메시지 처리"""
        session_info = self.active_sessions.get(session_id)
        if not session_info:
            return self.protocol_handler.create_internal_error_response(
                message.get("id"),
                "Session not found"
            )
        
        try:
            # 세션 활동 시간 업데이트
            session_info['last_activity'] = asyncio.get_event_loop().time()
            
            # 표준 MCP 메서드 먼저 처리
            response = self.protocol_handler.handle_standard_methods(message)
            if response:
                return response
            
            # 서버에 메시지 전달
            response = await self.server_connector.forward_message_to_server(
                session_info['server_config'],
                message
            )
            
            if response:
                self.logger.info(f"Message processed for session {session_id}")
                return response
            else:
                return self.protocol_handler.create_internal_error_response(
                    message.get("id"),
                    "No response from server"
                )
                
        except Exception as e:
            self.logger.error(f"Message handling failed for session {session_id}: {e}")
            return self.protocol_handler.create_internal_error_response(
                message.get("id"),
                str(e)
            )
    
    async def _cleanup_session(self, session_id: str):
        """세션 정리"""
        session_info = self.active_sessions.get(session_id)
        if session_info:
            session_info['is_active'] = False
            
            # 세션 정보 제거 (일정 시간 후)
            await asyncio.sleep(60)  # 1분 후 정리
            if session_id in self.active_sessions:
                del self.active_sessions[session_id]
                self.logger.info(f"Session {session_id} cleaned up")
    
    def get_session_info(self, session_id: str) -> Optional[Dict[str, Any]]:
        """세션 정보 조회"""
        return self.active_sessions.get(session_id)
    
    def get_active_sessions(self) -> Dict[str, Dict[str, Any]]:
        """활성 세션 목록 조회"""
        return {
            session_id: info 
            for session_id, info in self.active_sessions.items() 
            if info.get('is_active', False)
        }
    
    async def cleanup_inactive_sessions(self):
        """비활성 세션 정리"""
        current_time = asyncio.get_event_loop().time()
        inactive_sessions = []
        
        for session_id, info in self.active_sessions.items():
            last_activity = info.get('last_activity', 0)
            if current_time - last_activity > 300:  # 5분 비활성
                inactive_sessions.append(session_id)
        
        for session_id in inactive_sessions:
            await self._cleanup_session(session_id)
            self.logger.info(f"Cleaned up inactive session {session_id}")
    
    def handle_reconnection(self, session_id: str) -> bool:
        """재연결 처리"""
        session_info = self.active_sessions.get(session_id)
        if not session_info:
            return False
        
        reconnect_count = session_info.get('reconnect_count', 0)
        if reconnect_count >= MAX_RECONNECT_ATTEMPTS:
            self.logger.warning(f"Max reconnection attempts reached for session {session_id}")
            return False
        
        session_info['reconnect_count'] = reconnect_count + 1
        session_info['is_active'] = True
        session_info['last_activity'] = asyncio.get_event_loop().time()
        
        self.logger.info(f"Reconnection {reconnect_count + 1} for session {session_id}")
        return True
    
    async def broadcast_to_project_sessions(self, project_id: str, message: Dict[str, Any]):
        """프로젝트의 모든 세션에 메시지 브로드캐스트"""
        project_sessions = [
            session_id for session_id, info in self.active_sessions.items()
            if info.get('project_id') == project_id and info.get('is_active')
        ]
        
        for session_id in project_sessions:
            await self._send_message_to_session(session_id, message)
        
        self.logger.info(f"Broadcasted message to {len(project_sessions)} sessions in project {project_id}")
    
    def get_session_statistics(self) -> Dict[str, Any]:
        """세션 통계 조회"""
        active_count = sum(1 for info in self.active_sessions.values() if info.get('is_active'))
        total_count = len(self.active_sessions)
        
        return {
            'active_sessions': active_count,
            'total_sessions': total_count,
            'sessions_by_project': self._get_sessions_by_project()
        }
    
    def _get_sessions_by_project(self) -> Dict[str, int]:
        """프로젝트별 세션 수 조회"""
        project_counts = {}
        for info in self.active_sessions.values():
            if info.get('is_active'):
                project_id = info.get('project_id', 'unknown')
                project_counts[project_id] = project_counts.get(project_id, 0) + 1
        return project_counts
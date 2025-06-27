"""
MCP 세션 매니저 - 진정한 Resource Connection 구현
MCP Python SDK의 ClientSession 패턴을 따른 지속적 세션 관리
"""

import asyncio
import json
import logging
import time
from typing import Dict, List, Optional, Any, Union, Tuple
from datetime import datetime, timedelta
from uuid import UUID
from dataclasses import dataclass
from sqlalchemy.orm import Session

from ..models import McpServer, ToolCallLog, CallStatus, ClientSession, ServerLog, LogLevel, LogCategory
from ..config import MCPSessionConfig

logger = logging.getLogger(__name__)


@dataclass
class McpSession:
    """MCP 서버와의 지속적 세션"""
    server_id: str
    process: asyncio.subprocess.Process
    read_stream: asyncio.StreamReader
    write_stream: asyncio.StreamWriter
    session_id: str
    created_at: datetime
    last_used_at: datetime
    tools_cache: Optional[List[Dict]] = None
    is_initialized: bool = False
    initialization_lock: Optional[asyncio.Lock] = None
    _read_buffer: str = ""  # MCP 메시지 읽기용 버퍼


class ToolExecutionError(Exception):
    """도구 실행 에러를 위한 상세 정보를 포함한 예외 클래스"""
    def __init__(self, message: str, error_code: str = "UNKNOWN", details: Dict = None):
        super().__init__(message)
        self.error_code = error_code
        self.details = details or {}
        self.message = message


class McpSessionManager:
    """
    MCP Server Session Manager - Based on MCP Python SDK patterns
    
    Manages persistent connections to MCP servers with configurable timeouts
    and automatic cleanup of expired sessions.
    """
    
    def __init__(self, config: Optional[MCPSessionConfig] = None):
        """
        Initialize MCP Session Manager
        
        Args:
            config: MCP session configuration. If None, uses default values with environment variable support.
        """
        if config is None:
            # Load configuration with environment variable support
            import os
            config = MCPSessionConfig(
                session_timeout_minutes=int(os.getenv('MCP_SESSION_TIMEOUT_MINUTES', '30')),
                cleanup_interval_minutes=int(os.getenv('MCP_SESSION_CLEANUP_INTERVAL_MINUTES', '5'))
            )
            
        self.config = config
        self.sessions: Dict[str, McpSession] = {}
        self.session_timeout = timedelta(minutes=config.session_timeout_minutes)
        self.cleanup_interval = timedelta(minutes=config.cleanup_interval_minutes)
        self._cleanup_task: Optional[asyncio.Task] = None
        self._message_id_counter = 0
        
        logger.info(f"🔧 MCP Session Manager initialized:")
        logger.info(f"   Session timeout: {config.session_timeout_minutes} minutes")
        logger.info(f"   Cleanup interval: {config.cleanup_interval_minutes} minutes")
        
    async def start_manager(self):
        """세션 매니저 시작 - 정리 작업 스케줄링"""
        if self._cleanup_task is None:
            self._cleanup_task = asyncio.create_task(self._cleanup_expired_sessions())
            logger.info("🟢 MCP Session Manager started")
    
    async def stop_manager(self):
        """세션 매니저 중지 - 모든 세션 정리"""
        if self._cleanup_task:
            self._cleanup_task.cancel()
            try:
                await self._cleanup_task
            except asyncio.CancelledError:
                pass
            self._cleanup_task = None
            
        # 모든 활성 세션 종료
        for session in list(self.sessions.values()):
            await self._close_session(session)
        self.sessions.clear()
        logger.info("🔴 MCP Session Manager stopped")
    
    def _get_next_message_id(self) -> int:
        """다음 메시지 ID 생성"""
        self._message_id_counter += 1
        return self._message_id_counter
    
    async def get_or_create_session(self, server_id: str, server_config: Dict) -> McpSession:
        """서버 세션을 가져오거나 새로 생성 (MCP 표준 패턴)"""
        # 기존 세션이 있고 유효한지 확인
        if server_id in self.sessions:
            session = self.sessions[server_id]
            
            # 세션이 살아있는지 확인
            if await self._is_session_alive(session):
                session.last_used_at = datetime.utcnow()
                logger.info(f"♻️ Reusing existing session for server {server_id}")
                return session
            else:
                # 죽은 세션 정리
                logger.warning(f"⚠️ Session for server {server_id} is dead, creating new one")
                await self._close_session(session)
                del self.sessions[server_id]
        
        # 새 세션 생성 (MCP stdio_client 패턴)
        session = await self._create_new_session(server_id, server_config)
        self.sessions[server_id] = session
        logger.info(f"🆕 Created new session for server {server_id}")
        return session
    
    async def _create_new_session(self, server_id: str, server_config: Dict) -> McpSession:
        """새 MCP 세션 생성 - stdio_client 패턴"""
        command = server_config.get('command', '')
        args = server_config.get('args', [])
        env = server_config.get('env', {})
        
        if not command:
            raise ValueError(f"Server {server_id} command not configured")
        
        logger.info(f"🚀 Creating new MCP session for server {server_id}")
        logger.info(f"🔍 Command: {command} {' '.join(args)}")
        
        # 환경 변수 설정
        import os
        full_env = os.environ.copy()
        full_env.update(env)
        
        # stdio 서브프로세스 생성 (MCP 표준)
        try:
            process = await asyncio.create_subprocess_exec(
                command, *args,
                stdin=asyncio.subprocess.PIPE,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE,
                env=full_env
            )
            logger.info(f"✅ MCP process created with PID: {process.pid}")
        except Exception as e:
            logger.error(f"❌ Failed to create MCP process: {e}")
            raise
        
        # 스트림 래퍼 생성
        read_stream = process.stdout
        write_stream = process.stdin
        
        # 세션 객체 생성
        session = McpSession(
            server_id=server_id,
            process=process,
            read_stream=read_stream,
            write_stream=write_stream,
            session_id=f"session_{server_id}_{int(time.time())}",
            created_at=datetime.utcnow(),
            last_used_at=datetime.utcnow(),
            initialization_lock=asyncio.Lock()
        )
        
        return session
    
    async def initialize_session(self, session: McpSession) -> None:
        """MCP 세션 초기화 (한 번만 실행)"""
        if session.is_initialized:
            return
            
        async with session.initialization_lock:
            if session.is_initialized:
                return
                
            logger.info(f"🔧 Initializing MCP session for server {session.server_id}")
            
            # MCP 프로토콜 초기화 메시지
            init_message = {
                "jsonrpc": "2.0",
                "id": self._get_next_message_id(),
                "method": "initialize",
                "params": {
                    "protocolVersion": "2024-11-05",
                    "capabilities": {
                        "roots": {"listChanged": True},
                        "sampling": {}
                    },
                    "clientInfo": {
                        "name": "mcp-orch", 
                        "version": "1.0.0"
                    }
                }
            }
            
            # 초기화 메시지 전송
            await self._send_message(session, init_message)
            
            # 초기화 응답 대기
            init_response = await self._read_message(session, timeout=10)
            if not init_response or init_response.get('id') != init_message['id']:
                raise Exception("Failed to receive initialization response")
            
            if 'error' in init_response:
                error_msg = init_response['error'].get('message', 'Unknown error')
                raise Exception(f"Server initialization failed: {error_msg}")
            
            # initialized notification 전송 (MCP 표준)
            initialized_notification = {
                "jsonrpc": "2.0",
                "method": "notifications/initialized",
                "params": {}
            }
            await self._send_message(session, initialized_notification)
            
            session.is_initialized = True
            logger.info(f"✅ MCP session initialized for server {session.server_id}")
    
    async def call_tool(
        self, 
        server_id: str, 
        server_config: Dict, 
        tool_name: str, 
        arguments: Dict,
        session_id: Optional[str] = None,
        project_id: Optional[Union[str, UUID]] = None,
        user_agent: Optional[str] = None,
        ip_address: Optional[str] = None,
        db: Optional[Session] = None
    ) -> Dict:
        """MCP 도구 호출 - 지속적 세션 사용"""
        start_time = time.time()
        
        # 프로젝트 ID 변환
        converted_project_id = None
        if project_id:
            try:
                if isinstance(project_id, str):
                    converted_project_id = UUID(project_id)
                else:
                    converted_project_id = project_id
            except (ValueError, TypeError) as e:
                logger.warning(f"Invalid project_id format: {project_id}, error: {e}")
        
        # 로그 데이터 준비
        log_data = {
            'server_id': UUID(server_id),
            'project_id': converted_project_id,
            'tool_name': tool_name,
            'arguments': arguments,
            'session_id': session_id,
            'user_agent': user_agent,
            'ip_address': ip_address,
            'timestamp': datetime.utcnow()
        }
        
        try:
            logger.info(f"🔧 Calling tool {tool_name} on server {server_id} (MCP Session)")
            
            # 서버가 비활성화된 경우
            if server_config.get('disabled', False):
                raise ValueError(f"Server {server_id} is disabled")
            
            # 세션 가져오기 또는 생성
            session = await self.get_or_create_session(server_id, server_config)
            
            # 세션 초기화 (필요시)
            await self.initialize_session(session)
            
            # 도구 호출 메시지 생성
            tool_message = {
                "jsonrpc": "2.0",
                "id": self._get_next_message_id(),
                "method": "tools/call",
                "params": {
                    "name": tool_name,
                    "arguments": arguments
                }
            }
            
            # 메시지 전송
            await self._send_message(session, tool_message)
            logger.info(f"📤 Sent tool call message for {tool_name} (ID: {tool_message['id']})")
            
            # 응답 대기
            timeout = server_config.get('timeout', 60)
            response = await self._read_message(session, timeout=timeout)
            
            # 응답 디버깅
            if not response:
                logger.error(f"❌ No response received for tool call {tool_name} (ID: {tool_message['id']})")
                raise ToolExecutionError("No response received from MCP server")
            
            logger.info(f"📥 Received response for {tool_name}: ID={response.get('id')}, expected={tool_message['id']}")
            logger.debug(f"📥 Full response content: {response}")
            
            if response.get('id') != tool_message['id']:
                logger.error(f"❌ Message ID mismatch: expected {tool_message['id']}, got {response.get('id')}")
                raise ToolExecutionError(f"Message ID mismatch: expected {tool_message['id']}, got {response.get('id')}")
            
            if 'error' in response:
                error_msg = response['error'].get('message', 'Unknown error')
                logger.error(f"❌ Tool call error: {error_msg}")
                raise ToolExecutionError(f"Tool execution failed: {error_msg}")
            
            if 'result' not in response:
                raise ToolExecutionError("No result in tool call response")
            
            result = response['result']
            execution_time = (time.time() - start_time) * 1000  # 밀리초
            
            # 성공 로그 저장
            if db:
                await self._save_tool_call_log(
                    db, log_data, execution_time, CallStatus.SUCCESS, 
                    {'result': result}
                )
            
            # 세션 사용 시간 업데이트
            session.last_used_at = datetime.utcnow()
            
            logger.info(f"✅ Tool {tool_name} executed successfully in {execution_time:.2f}ms")
            return result
            
        except Exception as e:
            execution_time = (time.time() - start_time) * 1000
            if db:
                status = CallStatus.TIMEOUT if "timeout" in str(e).lower() else CallStatus.FAILED
                await self._save_tool_call_log(
                    db, log_data, execution_time, status, 
                    {'error': str(e)}
                )
            logger.error(f"❌ Error calling tool {tool_name} on server {server_id}: {e}")
            raise
    
    async def get_server_tools(self, server_id: str, server_config: Dict) -> List[Dict]:
        """서버 도구 목록 조회 - 캐시된 결과 사용"""
        try:
            # 세션 가져오기 또는 생성
            session = await self.get_or_create_session(server_id, server_config)
            
            # 세션 초기화 (필요시)
            await self.initialize_session(session)
            
            # 캐시된 도구 목록이 있으면 반환
            if session.tools_cache is not None:
                logger.info(f"📋 Using cached tools for server {server_id}")
                return session.tools_cache
            
            # 도구 목록 요청
            tools_message = {
                "jsonrpc": "2.0",
                "id": self._get_next_message_id(),
                "method": "tools/list",
                "params": {}
            }
            
            # 메시지 전송
            await self._send_message(session, tools_message)
            
            # 응답 대기
            response = await self._read_message(session, timeout=30)
            
            if not response or response.get('id') != tools_message['id']:
                raise Exception("Invalid tools list response")
            
            if 'error' in response:
                error_msg = response['error'].get('message', 'Unknown error')
                raise Exception(f"Tools list failed: {error_msg}")
            
            raw_tools = response.get('result', {}).get('tools', [])
            
            # 도구 데이터 정규화 (기존 구현과 호환성 유지)
            tools = []
            for tool in raw_tools:
                normalized_tool = {
                    'name': tool.get('name', ''),
                    'description': tool.get('description', ''),
                    'schema': tool.get('inputSchema', {})  # inputSchema -> schema 변환
                }
                tools.append(normalized_tool)
            
            # 캐시에 저장
            session.tools_cache = tools
            session.last_used_at = datetime.utcnow()
            
            logger.info(f"📋 Retrieved {len(tools)} tools for server {server_id}")
            return tools
            
        except Exception as e:
            logger.error(f"❌ Error getting tools for server {server_id}: {e}")
            return []
    
    async def _send_message(self, session: McpSession, message: Dict) -> None:
        """메시지 전송"""
        try:
            message_json = json.dumps(message) + '\n'
            session.write_stream.write(message_json.encode())
            await session.write_stream.drain()
            logger.debug(f"📤 Sent message: {message.get('method', message.get('id'))}")
        except Exception as e:
            logger.error(f"❌ Failed to send message: {e}")
            raise
    
    async def _read_message(self, session: McpSession, timeout: int = 60) -> Optional[Dict]:
        """메시지 읽기 - MCP 공식 패턴 적용 (청크 기반 + split 방식)"""
        try:
            # 세션에 읽기 버퍼가 없으면 초기화
            if not hasattr(session, '_read_buffer'):
                session._read_buffer = ""
            
            # 완전한 라인이 버퍼에 있는지 먼저 확인
            if '\n' in session._read_buffer:
                lines = session._read_buffer.split('\n')
                session._read_buffer = lines.pop()  # 마지막 불완전한 라인은 버퍼에 유지
                
                # 첫 번째 완전한 라인 처리
                if lines:
                    line_text = lines[0].strip()
                    if line_text:
                        try:
                            response = json.loads(line_text)
                            logger.debug(f"📥 Received message ({len(line_text)} bytes): {response.get('method', response.get('id'))}")
                            logger.debug(f"📥 Message content: {response}")
                            return response
                        except json.JSONDecodeError as e:
                            logger.error(f"❌ JSON decode error in first buffer check: {e}")
                            logger.error(f"❌ Invalid JSON content: {line_text[:500]}...")
                            # JSON 파싱 오류 시 재귀 호출하여 다음 메시지 읽기
                            return await self._read_message(session, timeout)
            
            # MCP SDK와 동일한 패턴: 청크 기반 읽기
            chunk = await asyncio.wait_for(
                session.read_stream.read(8192),  # 8KB 청크 크기
                timeout=timeout
            )
            
            if not chunk:
                # 연결이 닫혔을 때
                logger.warning("⚠️ Connection closed by MCP server")
                return None
            
            # 버퍼에 새 청크 추가
            session._read_buffer += chunk.decode('utf-8')
            
            # 완전한 라인이 있는지 확인
            if '\n' in session._read_buffer:
                lines = session._read_buffer.split('\n')
                session._read_buffer = lines.pop()  # 마지막 불완전한 라인은 버퍼에 유지
                
                # 첫 번째 완전한 라인 처리
                if lines:
                    line_text = lines[0].strip()
                    if line_text:
                        try:
                            response = json.loads(line_text)
                            logger.debug(f"📥 Received message ({len(line_text)} bytes): {response.get('method', response.get('id'))}")
                            logger.debug(f"📥 Message content: {response}")
                            return response
                        except json.JSONDecodeError as e:
                            logger.error(f"❌ JSON decode error in chunk buffer check: {e}")
                            logger.error(f"❌ Invalid JSON content: {line_text[:500]}...")
                            # JSON 파싱 오류 시 재귀 호출하여 다음 메시지 읽기
                            return await self._read_message(session, timeout)
            
            # 완전한 라인이 없으면 재귀 호출하여 더 읽기
            return await self._read_message(session, timeout)
            
        except asyncio.TimeoutError:
            logger.error(f"❌ Message read timeout after {timeout} seconds")
            raise ToolExecutionError(f"Message read timeout after {timeout} seconds")
        except json.JSONDecodeError as e:
            logger.error(f"❌ Invalid JSON response: {e}")
            logger.error(f"❌ Raw message: {line_text[:500]}..." if 'line_text' in locals() else "❌ No line_text available")
            raise ToolExecutionError(f"Invalid JSON response: {e}")
        except UnicodeDecodeError as e:
            logger.error(f"❌ Invalid UTF-8 encoding: {e}")
            raise ToolExecutionError(f"Invalid UTF-8 encoding: {e}")
        except Exception as e:
            logger.error(f"❌ Error reading message: {e}")
            raise
    
    async def _is_session_alive(self, session: McpSession) -> bool:
        """세션이 살아있는지 확인"""
        try:
            if session.process.returncode is not None:
                return False
            
            # 간단한 ping 메시지로 확인 (선택적)
            return True
            
        except Exception:
            return False
    
    async def _close_session(self, session: McpSession) -> None:
        """세션 종료"""
        try:
            logger.info(f"🔴 Closing session for server {session.server_id}")
            
            # 프로세스 종료
            if session.process.returncode is None:
                session.process.terminate()
                try:
                    await asyncio.wait_for(session.process.wait(), timeout=5)
                except asyncio.TimeoutError:
                    session.process.kill()
                    await session.process.wait()
            
            # 스트림 정리
            if session.write_stream and not session.write_stream.is_closing():
                session.write_stream.close()
                try:
                    await session.write_stream.wait_closed()
                except:
                    pass
            
        except Exception as e:
            logger.error(f"❌ Error closing session for {session.server_id}: {e}")
    
    async def _cleanup_expired_sessions(self) -> None:
        """
        Clean up expired sessions (background task)
        
        Runs periodically based on cleanup_interval_minutes configuration
        """
        while True:
            try:
                # Use configured cleanup interval (convert minutes to seconds)
                cleanup_seconds = int(self.cleanup_interval.total_seconds())
                await asyncio.sleep(cleanup_seconds)
                
                now = datetime.utcnow()
                expired_sessions = []
                
                for server_id, session in self.sessions.items():
                    if now - session.last_used_at > self.session_timeout:
                        expired_sessions.append(server_id)
                
                for server_id in expired_sessions:
                    session = self.sessions.pop(server_id, None)
                    if session:
                        await self._close_session(session)
                        logger.info(f"🧹 Cleaned up expired session for server {server_id}")
                
            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.error(f"❌ Error during session cleanup: {e}")
    
    async def _save_tool_call_log(
        self,
        db: Session,
        log_data: Dict,
        execution_time: float,
        status: CallStatus,
        output_data: Optional[Dict] = None,
        error_message: Optional[str] = None,
        error_code: Optional[str] = None
    ):
        """ToolCallLog 데이터베이스에 저장"""
        try:
            # 저장할 데이터 로깅
            logger.info(f"🔍 Saving ToolCallLog: server_id={log_data.get('server_id')} (type: {type(log_data.get('server_id'))}), project_id={log_data.get('project_id')}, tool={log_data.get('tool_name')}")
            
            tool_call_log = ToolCallLog(
                session_id=log_data.get('session_id'),
                server_id=log_data.get('server_id'),
                project_id=log_data.get('project_id'),
                tool_name=log_data.get('tool_name'),
                tool_namespace=f"{log_data.get('server_id')}.{log_data.get('tool_name')}",
                arguments=log_data.get('arguments'),
                result=output_data.get('result') if output_data else None,
                error_message=error_message or (output_data.get('error') if output_data else None),
                error_code=error_code,
                execution_time_ms=int(execution_time),  # 밀리초 단위로 저장 (DB 스키마에 맞춰)
                status=status,
                user_agent=log_data.get('user_agent'),
                ip_address=log_data.get('ip_address'),
                created_at=log_data.get('timestamp')
            )
            
            db.add(tool_call_log)
            db.commit()
            
            logger.info(f"✅ ToolCallLog saved successfully: id={tool_call_log.id}, server_id={tool_call_log.server_id}, project_id={tool_call_log.project_id}, tool={tool_call_log.tool_name} ({status.value}) in {execution_time:.3f}ms")
            
        except Exception as e:
            logger.error(f"❌ Failed to save ToolCallLog: {e}")
            logger.error(f"❌ Log data: {log_data}")
            logger.error(f"❌ Output data: {output_data}")
            db.rollback()


# 글로벌 세션 매니저 인스턴스
_session_manager: Optional[McpSessionManager] = None

async def get_session_manager(config: Optional[MCPSessionConfig] = None) -> McpSessionManager:
    """
    Get global session manager instance
    
    Args:
        config: MCP session configuration. If None, uses environment variables or defaults.
    
    Returns:
        McpSessionManager: The global session manager instance
    """
    global _session_manager
    if _session_manager is None:
        _session_manager = McpSessionManager(config)
        await _session_manager.start_manager()
    return _session_manager

async def shutdown_session_manager():
    """글로벌 세션 매니저 종료"""
    global _session_manager
    if _session_manager is not None:
        await _session_manager.stop_manager()
        _session_manager = None
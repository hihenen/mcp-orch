"""
MCP 서버 연결 및 상태 관리 서비스
"""

import asyncio
import json
import subprocess
import logging
import time
from typing import Dict, List, Optional, Any, Union
from datetime import datetime
from uuid import UUID
from sqlalchemy.orm import Session

from ..models import McpServer, ToolCallLog, CallStatus, ClientSession

logger = logging.getLogger(__name__)


class McpConnectionService:
    """MCP 서버 연결 및 상태 관리"""
    
    def __init__(self):
        self.active_connections: Dict[str, Any] = {}
    
    async def check_server_status(self, server_id: str, server_config: Dict) -> str:
        """개별 MCP 서버 상태 확인 (실시간)"""
        try:
            # 서버가 비활성화된 경우
            if server_config.get('disabled', False):
                return "disabled"
            
            # MCP 서버 연결 테스트 (캐시 없이 실시간 확인)
            result = await self._test_mcp_connection(server_config)
            if result:
                return "online"
            else:
                return "offline"
                
        except Exception as e:
            logger.error(f"Error checking server {server_id} status: {e}")
            return "error"
    
    async def _test_mcp_connection(self, server_config: Dict) -> bool:
        """MCP 서버 연결 테스트 (449a99f 개선사항 적용)"""
        try:
            command = server_config.get('command', '')
            args = server_config.get('args', [])
            env = server_config.get('env', {})
            timeout = server_config.get('timeout', 10)  # 실시간 조회를 위해 더 짧은 타임아웃
            
            logger.info(f"🔍 Testing MCP connection: {command} {' '.join(args)}")
            
            if not command:
                logger.warning("❌ No command specified for MCP server")
                return False
            
            # MCP 초기화 메시지 전송
            init_message = {
                "jsonrpc": "2.0",
                "id": 1,
                "method": "initialize",
                "params": {
                    "protocolVersion": "2024-11-05",
                    "capabilities": {
                        "roots": {
                            "listChanged": True
                        },
                        "sampling": {}
                    },
                    "clientInfo": {
                        "name": "mcp-orch",
                        "version": "1.0.0"
                    }
                }
            }
            
            # 프로세스 실행 (PATH 환경변수 상속 - 449a99f 핵심 개선사항)
            import os
            full_env = os.environ.copy()
            full_env.update(env)
            
            process = await asyncio.create_subprocess_exec(
                command, *args,
                stdin=asyncio.subprocess.PIPE,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE,
                env=full_env
            )
            
            # 초기화 메시지 전송
            init_json = json.dumps(init_message) + '\n'
            process.stdin.write(init_json.encode())
            await process.stdin.drain()
            
            # 응답 대기 (타임아웃 적용)
            try:
                stdout_data, stderr_data = await asyncio.wait_for(
                    process.communicate(), timeout=timeout
                )
                
                if process.returncode == 0:
                    # 응답 파싱 시도
                    response_lines = stdout_data.decode().strip().split('\n')
                    logger.info(f"📥 MCP server response lines: {len(response_lines)}")
                    for line in response_lines:
                        if line.strip():
                            try:
                                response = json.loads(line)
                                logger.info(f"📋 Parsed response: {response}")
                                if response.get('id') == 1 and 'result' in response:
                                    logger.info("✅ MCP connection test successful")
                                    return True
                            except json.JSONDecodeError:
                                logger.warning(f"⚠️ Failed to parse JSON: {line[:100]}")
                                continue
                
                logger.warning("❌ MCP connection test failed - no valid response")
                return False
                
            except asyncio.TimeoutError:
                process.kill()
                await process.wait()
                return False
                
        except Exception as e:
            logger.error(f"MCP connection test failed: {e}")
            return False
    
    async def get_server_tools(self, server_id: str, server_config: Dict) -> List[Dict]:
        """MCP 서버의 도구 목록 조회"""
        try:
            logger.info(f"🔧 Getting tools for server {server_id}")
            
            if server_config.get('disabled', False):
                logger.info("⚠️ Server is disabled, returning empty tools")
                return []
            
            # 서버 타입에 따라 도구 조회 방식 분기
            server_type = server_config.get('serverType', 'api_wrapper')
            logger.info(f"🎯 Server type: {server_type}")
            
            if server_type == 'resource_connection':
                return await self._get_tools_sequential(server_id, server_config)
            else:
                return await self._get_tools_standard(server_id, server_config)
                
        except Exception as e:
            logger.error(f"❌ Error getting tools for server {server_id}: {e}")
            return []
    
    async def _get_tools_standard(self, server_id: str, server_config: Dict) -> List[Dict]:
        """표준 API Wrapper 서버용 도구 조회 (기존 방식)"""
        try:
            command = server_config.get('command', '')
            args = server_config.get('args', [])
            env = server_config.get('env', {})
            timeout = server_config.get('timeout', 10)
            
            logger.info(f"🔍 Standard tools command: {command} {' '.join(args)}")
            
            if not command:
                logger.warning("❌ No command specified for tools query")
                return []
            
            # tools/list 메시지 전송
            tools_message = {
                "jsonrpc": "2.0",
                "id": 2,
                "method": "tools/list",
                "params": {}
            }
            
            # 프로세스 실행
            import os
            full_env = os.environ.copy()
            full_env.update(env)
            
            process = await asyncio.create_subprocess_exec(
                command, *args,
                stdin=asyncio.subprocess.PIPE,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE,
                env=full_env
            )
            
            # 초기화 후 도구 목록 요청 (기존 방식)
            init_message = {
                "jsonrpc": "2.0",
                "id": 1,
                "method": "initialize",
                "params": {
                    "protocolVersion": "2024-11-05",
                    "capabilities": {},
                    "clientInfo": {"name": "mcp-orch", "version": "1.0.0"}
                }
            }
            
            init_json = json.dumps(init_message) + '\n'
            tools_json = json.dumps(tools_message) + '\n'
            
            process.stdin.write(init_json.encode())
            process.stdin.write(tools_json.encode())
            await process.stdin.drain()
            process.stdin.close()
            
            # 응답 대기
            try:
                stdout_data, _ = await asyncio.wait_for(
                    process.communicate(), timeout=timeout
                )
                
                tools = []
                response_lines = stdout_data.decode().strip().split('\n')
                logger.info(f"📥 Standard tools response lines: {len(response_lines)}")
                
                for line in response_lines:
                    if line.strip():
                        try:
                            response = json.loads(line)
                            logger.info(f"📋 Standard tools response: {response}")
                            if response.get('id') == 2 and 'result' in response:
                                tools_data = response['result'].get('tools', [])
                                logger.info(f"🔧 Found {len(tools_data)} tools in response")
                                for tool in tools_data:
                                    tools.append({
                                        'name': tool.get('name', ''),
                                        'description': tool.get('description', ''),
                                        'schema': tool.get('inputSchema', {})
                                    })
                                break
                        except json.JSONDecodeError:
                            logger.warning(f"⚠️ Failed to parse tools JSON: {line[:100]}")
                            continue
                
                logger.info(f"✅ Returning {len(tools)} tools for server {server_id}")
                return tools
                
            except asyncio.TimeoutError:
                logger.warning(f"⏰ Timeout getting tools for server {server_id}")
                process.kill()
                await process.wait()
                return []
                
        except Exception as e:
            logger.error(f"❌ Error getting standard tools for server {server_id}: {e}")
            return []
    
    async def _get_tools_sequential(self, server_id: str, server_config: Dict) -> List[Dict]:
        """Resource Connection 서버용 순차 도구 조회 (JDBC 등)"""
        try:
            command = server_config.get('command', '')
            args = server_config.get('args', [])
            env = server_config.get('env', {})
            timeout = server_config.get('timeout', 30)  # 더 긴 타임아웃
            
            logger.info(f"🔍 Sequential tools command: {command} {' '.join(args)}")
            
            if not command:
                logger.warning("❌ No command specified for sequential tools query")
                return []
            
            # 프로세스 실행
            import os
            full_env = os.environ.copy()
            full_env.update(env)
            
            process = await asyncio.create_subprocess_exec(
                command, *args,
                stdin=asyncio.subprocess.PIPE,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE,
                env=full_env
            )
            
            try:
                # 1단계: 초기화 요청
                init_message = {
                    "jsonrpc": "2.0",
                    "id": 1,
                    "method": "initialize",
                    "params": {
                        "protocolVersion": "2024-11-05",
                        "capabilities": {},
                        "clientInfo": {"name": "mcp-orch", "version": "1.0.0"}
                    }
                }
                
                init_json = json.dumps(init_message) + '\n'
                process.stdin.write(init_json.encode())
                await process.stdin.drain()
                
                logger.info("📤 Sent initialize request, waiting for response...")
                
                # 초기화 응답 대기
                init_response_received = False
                response_buffer = ""
                
                # 스트림에서 응답 읽기
                while not init_response_received:
                    try:
                        line_bytes = await asyncio.wait_for(process.stdout.readline(), timeout=10)
                        if not line_bytes:
                            break
                        
                        line = line_bytes.decode().strip()
                        if line:
                            try:
                                response = json.loads(line)
                                logger.info(f"📋 Init response: {response}")
                                if response.get('id') == 1 and 'result' in response:
                                    init_response_received = True
                                    logger.info("✅ Initialize response received")
                                    
                                    # MCP 프로토콜 표준: initialized notification 전송
                                    initialized_message = {
                                        "jsonrpc": "2.0",
                                        "method": "notifications/initialized"
                                    }
                                    initialized_json = json.dumps(initialized_message) + '\n'
                                    process.stdin.write(initialized_json.encode())
                                    await process.stdin.drain()
                                    logger.info("📤 Sent initialized notification (MCP protocol standard)")
                                    break
                            except json.JSONDecodeError:
                                logger.warning(f"⚠️ Failed to parse init JSON: {line[:100]}")
                                continue
                    except asyncio.TimeoutError:
                        logger.warning("⏰ Timeout waiting for init response")
                        break
                
                if not init_response_received:
                    logger.warning("❌ Failed to receive initialize response")
                    process.kill()
                    await process.wait()
                    return []
                
                # 2단계: 도구 목록 요청
                tools_message = {
                    "jsonrpc": "2.0",
                    "id": 2,
                    "method": "tools/list",
                    "params": {}
                }
                
                tools_json = json.dumps(tools_message) + '\n'
                process.stdin.write(tools_json.encode())
                await process.stdin.drain()
                
                logger.info("📤 Sent tools/list request, waiting for response...")
                
                # 도구 응답 대기
                tools = []
                tools_response_received = False
                
                while not tools_response_received:
                    try:
                        line_bytes = await asyncio.wait_for(process.stdout.readline(), timeout=15)
                        if not line_bytes:
                            break
                        
                        line = line_bytes.decode().strip()
                        if line:
                            try:
                                response = json.loads(line)
                                logger.info(f"📋 Tools response: {response}")
                                if response.get('id') == 2 and 'result' in response:
                                    tools_data = response['result'].get('tools', [])
                                    logger.info(f"🔧 Found {len(tools_data)} tools in sequential response")
                                    for tool in tools_data:
                                        tools.append({
                                            'name': tool.get('name', ''),
                                            'description': tool.get('description', ''),
                                            'schema': tool.get('inputSchema', {})
                                        })
                                    tools_response_received = True
                                    break
                            except json.JSONDecodeError:
                                logger.warning(f"⚠️ Failed to parse tools JSON: {line[:100]}")
                                continue
                    except asyncio.TimeoutError:
                        logger.warning("⏰ Timeout waiting for tools response")
                        break
                
                process.stdin.close()
                await process.wait()
                
                logger.info(f"✅ Returning {len(tools)} tools from sequential query for server {server_id}")
                return tools
                
            except Exception as e:
                logger.error(f"❌ Error in sequential tools query: {e}")
                process.kill()
                await process.wait()
                return []
                
        except Exception as e:
            logger.error(f"❌ Error getting sequential tools for server {server_id}: {e}")
            return []
    
    async def refresh_all_servers(self, db: Session) -> Dict[str, Dict]:
        """모든 MCP 서버 상태 새로고침 (449a99f DB 기반 전환)"""
        try:
            # 데이터베이스의 서버 목록 조회
            db_servers = db.query(McpServer).all()
            server_results = {}
            
            for db_server in db_servers:
                # 프로젝트별 고유 서버 식별자 생성
                unique_server_id = self._generate_unique_server_id(db_server)
                
                # 데이터베이스에서 서버 설정 구성
                server_config = self._build_server_config_from_db(db_server)
                
                if not server_config:
                    server_results[str(db_server.id)] = {
                        'status': 'not_configured',
                        'tools_count': 0,
                        'tools': []
                    }
                    continue
                
                # 서버 상태 확인 (고유 식별자 사용)
                status = await self.check_server_status(unique_server_id, server_config)
                
                # 도구 목록 조회 (온라인인 경우에만)
                tools = []
                if status == "online":
                    tools = await self.get_server_tools(unique_server_id, server_config)
                
                server_results[str(db_server.id)] = {
                    'status': status,
                    'tools_count': len(tools),
                    'tools': tools
                }
                
                # 데이터베이스 업데이트
                if status == "online":
                    db_server.last_used_at = datetime.utcnow()
                    db.commit()
            
            return server_results
            
        except Exception as e:
            logger.error(f"Error refreshing server status: {e}")
            return {}
    
    def _generate_unique_server_id(self, db_server) -> str:
        """프로젝트별 고유 서버 식별자 생성: 프로젝트ID.서버이름"""
        try:
            project_id = str(db_server.project_id).replace('-', '')[:8]  # UUID 앞 8자리
            server_name = db_server.name.replace(' ', '_').replace('.', '_')  # 공백과 점을 언더스코어로 변경
            return f"{project_id}.{server_name}"
        except Exception as e:
            logger.error(f"Error generating unique server ID: {e}")
            return str(db_server.id)  # 실패 시 기본 서버 ID 사용
    
    def _build_server_config_from_db(self, db_server) -> Dict:
        """데이터베이스 서버 정보로부터 MCP 설정 구성"""
        try:
            if not db_server.command:
                return None
            
            config = {
                'command': db_server.command,
                'args': db_server.args or [],
                'env': db_server.env or {},
                'timeout': 60,  # 기본 타임아웃
                'transportType': db_server.transport_type or 'stdio',
                'serverType': db_server.server_type or 'api_wrapper',
                'disabled': not db_server.is_enabled
            }
            
            return config
            
        except Exception as e:
            logger.error(f"Error building server config from DB: {e}")
            return None
    
    async def get_server_tools_count(self, server_id: str, server_config: Dict) -> int:
        """서버 도구 개수 실시간 조회"""
        try:
            tools = await self.get_server_tools(server_id, server_config)
            return len(tools)
        except Exception as e:
            logger.error(f"Error getting tools count for server {server_id}: {e}")
            return 0
    
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
    ) -> Any:
        """
        MCP 서버의 도구 호출 (ToolCallLog 수집 포함)
        
        Args:
            server_id: MCP 서버 ID
            server_config: 서버 설정
            tool_name: 호출할 도구 이름
            arguments: 도구 호출 인수
            session_id: 클라이언트 세션 ID (옵션)
            project_id: 프로젝트 ID (옵션)
            user_agent: 사용자 에이전트 (옵션)
            ip_address: IP 주소 (옵션) 
            db: 데이터베이스 세션 (옵션)
        """
        
        # 실행 시간 측정 시작
        start_time = time.time()
        
        # 프로젝트 ID를 UUID로 변환
        converted_project_id = None
        if project_id:
            if isinstance(project_id, str):
                try:
                    converted_project_id = UUID(project_id)
                except ValueError:
                    logger.warning(f"Invalid project_id format: {project_id}")
            elif isinstance(project_id, UUID):
                converted_project_id = project_id
        
        # 로그 기본 정보 설정
        log_data = {
            'session_id': session_id,
            'server_id': server_id,
            'project_id': converted_project_id,
            'tool_name': tool_name,
            'input_data': {
                'arguments': arguments,
                'context': {
                    'user_agent': user_agent,
                    'ip_address': ip_address,
                    'call_time': datetime.utcnow().isoformat()
                }
            },
            'user_agent': user_agent,
            'ip_address': ip_address
        }
        
        # stderr 오류 정보 초기화 (변수 참조 오류 방지)
        stderr_error_info = None
        
        try:
            # 서버가 비활성화된 경우
            if server_config.get('disabled', False):
                raise ValueError(f"Server {server_id} is disabled")
            
            command = server_config.get('command', '')
            args = server_config.get('args', [])
            env = server_config.get('env', {})
            timeout = server_config.get('timeout', 60)
            
            if not command:
                raise ValueError("Server command not configured")
            
            logger.info(f"🔧 Calling tool {tool_name} on server {server_id} with arguments: {arguments}")
            logger.info(f"🔍 Server command: {command}")
            logger.info(f"🔍 Server args: {args}")
            logger.info(f"🔍 Server env: {env}")
            logger.info(f"🔍 Server timeout: {timeout}")
            
            # 환경 변수 설정
            import os
            full_env = os.environ.copy()
            full_env.update(env)
            
            process = await asyncio.create_subprocess_exec(
                command, *args,
                stdin=asyncio.subprocess.PIPE,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE,
                env=full_env
            )
            
            # 1단계: 초기화 메시지 먼저 전송
            init_message = {
                "jsonrpc": "2.0",
                "id": 1,
                "method": "initialize",
                "params": {
                    "protocolVersion": "2024-11-05",
                    "capabilities": {},
                    "clientInfo": {"name": "mcp-orch", "version": "1.0.0"}
                }
            }
            
            init_json = json.dumps(init_message) + '\n'
            process.stdin.write(init_json.encode())
            await process.stdin.drain()
            
            # 2단계: 초기화 응답 대기 (최대 5초)
            init_timeout = 5
            init_completed = False
            start_init_time = time.time()
            
            while time.time() - start_init_time < init_timeout:
                if process.stdout.at_eof():
                    break
                    
                try:
                    # 논블로킹으로 한 줄씩 읽기
                    line = await asyncio.wait_for(process.stdout.readline(), timeout=1.0)
                    if not line:
                        break
                    
                    line_text = line.decode().strip()
                    if line_text:
                        try:
                            response = json.loads(line_text)
                            if response.get('id') == 1 and 'result' in response:
                                logger.info(f"✅ MCP server {server_id} initialized successfully")
                                
                                # MCP 프로토콜 표준: initialized notification 전송
                                initialized_message = {
                                    "jsonrpc": "2.0",
                                    "method": "notifications/initialized"
                                }
                                initialized_json = json.dumps(initialized_message) + '\n'
                                process.stdin.write(initialized_json.encode())
                                await process.stdin.drain()
                                logger.info("📤 Sent initialized notification for tool call (MCP protocol standard)")
                                
                                init_completed = True
                                break
                            elif response.get('id') == 1 and 'error' in response:
                                error = response['error']
                                raise ValueError(f"MCP initialization failed: {error.get('message', 'Unknown error')}")
                        except json.JSONDecodeError:
                            continue
                except asyncio.TimeoutError:
                    continue
            
            if not init_completed:
                raise ValueError(f"MCP server {server_id} initialization timeout")
            
            # 3단계: 초기화 완료 후 도구 호출
            tool_call_message = {
                "jsonrpc": "2.0",
                "id": 2,
                "method": "tools/call",
                "params": {
                    "name": tool_name,
                    "arguments": arguments
                }
            }
            
            logger.info(f"🔍 Sending tool call message: {json.dumps(tool_call_message, indent=2)}")
            
            tool_call_json = json.dumps(tool_call_message) + '\n'
            process.stdin.write(tool_call_json.encode())
            await process.stdin.drain()
            process.stdin.close()
            
            # 4단계: 도구 호출 응답 대기
            try:
                # 남은 응답들을 읽어서 도구 호출 결과 찾기
                remaining_timeout = timeout - (time.time() - start_init_time)
                remaining_timeout = max(1, remaining_timeout)  # 최소 1초
                
                stdout_data, stderr_data = await asyncio.wait_for(
                    process.communicate(), timeout=remaining_timeout
                )
                
                # 남은 출력에서 도구 호출 응답 찾기
                remaining_lines = stdout_data.decode().strip().split('\n') if stdout_data else []
                result = None
                
                logger.info(f"🔍 Processing {len(remaining_lines)} response lines from MCP server")
                for line in remaining_lines:
                    if line.strip():
                        logger.info(f"🔍 Raw response line: {line.strip()}")
                        try:
                            response = json.loads(line)
                            logger.info(f"🔍 Parsed JSON response: {json.dumps(response, indent=2)}")
                            if response.get('id') == 2:
                                if 'result' in response:
                                    result = response['result']
                                    # content 배열에서 텍스트 추출
                                    if isinstance(result, dict) and 'content' in result:
                                        content_list = result['content']
                                        if content_list and isinstance(content_list, list):
                                            first_content = content_list[0]
                                            if isinstance(first_content, dict) and 'text' in first_content:
                                                result = first_content['text']
                                    break
                                elif 'error' in response:
                                    error = response['error']
                                    logger.error(f"🔍 MCP Tool Error Details - Full error object: {error}")
                                    logger.error(f"🔍 MCP Tool Error Details - Error message: {error.get('message', 'No message')}")
                                    logger.error(f"🔍 MCP Tool Error Details - Error code: {error.get('code', 'No code')}")
                                    logger.error(f"🔍 MCP Tool Error Details - Error data: {error.get('data', 'No data')}")
                                    
                                    # "Internal error"인 경우 stderr에서 실제 오류 추출 시도
                                    original_error_message = error.get('message', 'Unknown error')
                                    if original_error_message == "Internal error" and stderr_error_info:
                                        # stderr에서 추출한 실제 오류 메시지 사용
                                        error_message = f"Tool error: {stderr_error_info}"
                                        logger.info(f"🔄 Replaced 'Internal error' with stderr info: {stderr_error_info}")
                                    else:
                                        error_message = f"Tool error: {original_error_message}"
                                    
                                    error_code = str(error.get('code', 'TOOL_ERROR'))
                                    
                                    # 초기화 관련 에러 특별 처리
                                    if "initialization" in error_message.lower():
                                        error_code = "INITIALIZATION_INCOMPLETE"
                                    elif error.get('code') == -32602:
                                        error_code = "INVALID_PARAMETERS"
                                    elif error.get('code') == -32603 and stderr_error_info:
                                        error_code = "DATABASE_ERROR"
                                    
                                    # 실행 시간 계산 및 ERROR 로그 저장
                                    execution_time = time.time() - start_time
                                    if db:
                                        await self._save_tool_call_log(
                                            db=db,
                                            log_data=log_data,
                                            execution_time=execution_time,
                                            status=CallStatus.ERROR,
                                            output_data=None,
                                            error_message=error_message,
                                            error_code=error_code
                                        )
                                    
                                    raise ValueError(error_message)
                        except json.JSONDecodeError:
                            continue
                
                # stderr에서 오류 메시지 확인 및 실제 오류 정보 추출
                if stderr_data:
                    stderr_text = stderr_data.decode().strip()
                    if stderr_text:
                        logger.error(f"🔍 MCP Server stderr output: {stderr_text}")
                        
                        # 데이터베이스 관련 오류 패턴 검출
                        if any(pattern in stderr_text for pattern in [
                            "ORA-", "SQLException", "Connection refused", "Authentication failed",
                            "Access denied", "Unknown host", "Connection timeout", "FATAL:", "ERROR:"
                        ]):
                            stderr_error_info = self._extract_meaningful_error(stderr_text)
                            logger.error(f"🔍 Extracted meaningful error: {stderr_error_info}")
                        
                        # 일반적인 오류 패턴 검출
                        elif "error" in stderr_text.lower() or "exception" in stderr_text.lower():
                            stderr_error_info = self._extract_meaningful_error(stderr_text)
                            logger.error(f"🔍 Potential error found in stderr: {stderr_error_info}")
                else:
                    logger.info("🔍 No stderr output from MCP server")
                
                if result is None:
                    error_message = f"No valid response received for tool call {tool_name}"
                    
                    # 실행 시간 계산 및 ERROR 로그 저장
                    execution_time = time.time() - start_time
                    if db:
                        await self._save_tool_call_log(
                            db=db,
                            log_data=log_data,
                            execution_time=execution_time,
                            status=CallStatus.ERROR,
                            output_data=None,
                            error_message=error_message,
                            error_code='NO_RESPONSE'
                        )
                    
                    raise ValueError(error_message)
                
                # 성공적인 실행 시간 계산 및 SUCCESS 로그 저장
                execution_time = time.time() - start_time
                
                if db:
                    await self._save_tool_call_log(
                        db=db,
                        log_data=log_data,
                        execution_time=execution_time,
                        status=CallStatus.SUCCESS,
                        output_data={
                            'result': result,
                            'metadata': {
                                'response_size': len(str(result)) if result else 0,
                                'stdout_lines': len(remaining_lines)
                            }
                        }
                    )
                
                logger.info(f"✅ Tool {tool_name} executed successfully in {execution_time:.3f}s")
                return result
                
            except asyncio.TimeoutError:
                process.kill()
                await process.wait()
                
                # 실행 시간 계산 및 TIMEOUT 로그 저장
                execution_time = time.time() - start_time
                error_message = f"Tool call timeout for {tool_name}"
                
                if db:
                    await self._save_tool_call_log(
                        db=db,
                        log_data=log_data,
                        execution_time=execution_time,
                        status=CallStatus.TIMEOUT,
                        output_data=None,
                        error_message=error_message,
                        error_code='TIMEOUT'
                    )
                
                raise ValueError(error_message)
                
        except Exception as e:
            # 실행 시간 계산 및 ERROR 로그 저장
            execution_time = time.time() - start_time
            error_message = str(e)
            
            if db:
                await self._save_tool_call_log(
                    db=db,
                    log_data=log_data,
                    execution_time=execution_time,
                    status=CallStatus.ERROR,
                    output_data=None,
                    error_message=error_message,
                    error_code='EXECUTION_ERROR'
                )
            
            logger.error(f"❌ Error calling tool {tool_name} on server {server_id}: {e}")
            raise
    
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
            tool_call_log = ToolCallLog(
                session_id=log_data.get('session_id'),
                server_id=log_data.get('server_id'),
                project_id=log_data.get('project_id'),
                tool_name=log_data.get('tool_name'),
                tool_namespace=f"{log_data.get('server_id')}.{log_data.get('tool_name')}",
                input_data=log_data.get('input_data'),
                output_data=output_data,
                execution_time=execution_time,
                status=status,
                error_message=error_message,
                error_code=error_code,
                user_agent=log_data.get('user_agent'),
                ip_address=log_data.get('ip_address')
            )
            
            db.add(tool_call_log)
            db.commit()
            
            logger.info(f"📊 ToolCallLog saved: {tool_call_log.tool_name} ({status.value}) in {execution_time:.3f}s")
            
        except Exception as e:
            logger.error(f"❌ Failed to save ToolCallLog: {e}")
            db.rollback()

    def _extract_meaningful_error(self, stderr_text: str) -> str:
        """stderr에서 의미있는 오류 메시지 추출"""
        try:
            # Oracle 오류 패턴 (ORA-XXXXX)
            import re
            
            # ORA-XXXXX 패턴 검출
            ora_match = re.search(r'ORA-\d{5}[^.]*', stderr_text)
            if ora_match:
                ora_error = ora_match.group(0)
                # 친화적인 메시지로 변환
                if "ORA-01017" in ora_error:
                    return "Database authentication failed - invalid username/password. Please check your Oracle credentials."
                elif "ORA-12541" in ora_error:
                    return "Database connection failed - TNS listener error. Please check the hostname and port."
                elif "ORA-12154" in ora_error:
                    return "Database connection failed - TNS could not resolve service name."
                else:
                    return f"Database error: {ora_error}"
            
            # PostgreSQL 오류 패턴
            if "FATAL:" in stderr_text:
                fatal_match = re.search(r'FATAL:\s*([^\n]+)', stderr_text)
                if fatal_match:
                    return f"Database connection failed: {fatal_match.group(1)}"
            
            # MySQL 오류 패턴
            if "Access denied" in stderr_text:
                return "Database authentication failed - access denied. Please check your credentials."
            
            # 일반적인 연결 오류
            if "Connection refused" in stderr_text:
                return "Database connection failed - connection refused. Please check if the database server is running."
            elif "Connection timeout" in stderr_text:
                return "Database connection failed - connection timeout. Please check network connectivity."
            elif "Unknown host" in stderr_text:
                return "Database connection failed - unknown host. Please check the hostname."
            
            # SQLException 패턴
            sql_exception = re.search(r'SQLException[^\n]*([^\n]+)', stderr_text)
            if sql_exception:
                return f"Database error: {sql_exception.group(0)}"
            
            # Exception 패턴에서 메시지 추출
            exception_match = re.search(r'Exception[^\n]*:([^\n]+)', stderr_text)
            if exception_match:
                return f"Error: {exception_match.group(1).strip()}"
            
            # 에러 키워드가 포함된 줄 추출
            lines = stderr_text.split('\n')
            for line in lines:
                if any(keyword in line.lower() for keyword in ['error', 'exception', 'failed', 'denied']):
                    # 로그 레벨 제거하고 핵심 메시지만 추출
                    clean_line = re.sub(r'^\d{4}-\d{2}-\d{2}.*?\s+', '', line)
                    clean_line = re.sub(r'^(ERROR|WARN|INFO|DEBUG)\s*:?\s*', '', clean_line, flags=re.IGNORECASE)
                    if len(clean_line.strip()) > 10:  # 의미있는 길이의 메시지만
                        return clean_line.strip()
            
            # 마지막 수단: stderr 전체에서 첫 번째 에러 라인
            error_lines = [line for line in lines if 'error' in line.lower()]
            if error_lines:
                return error_lines[0].strip()
            
            return stderr_text.strip()[:200]  # 최대 200자로 제한
            
        except Exception as e:
            logger.warning(f"Failed to extract meaningful error: {e}")
            return stderr_text.strip()[:200]


# 전역 서비스 인스턴스
mcp_connection_service = McpConnectionService()

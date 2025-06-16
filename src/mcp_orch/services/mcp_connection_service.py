"""
MCP 서버 연결 및 상태 관리 서비스
"""

import asyncio
import json
import subprocess
import logging
from typing import Dict, List, Optional, Any
from datetime import datetime
from sqlalchemy.orm import Session

from ..models import McpServer

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
            
            command = server_config.get('command', '')
            args = server_config.get('args', [])
            env = server_config.get('env', {})
            timeout = server_config.get('timeout', 10)  # 실시간 조회를 위해 더 짧은 타임아웃
            
            logger.info(f"🔍 Tools command: {command} {' '.join(args)}")
            
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
            
            # 초기화 후 도구 목록 요청
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
                logger.info(f"📥 Tools response lines: {len(response_lines)}")
                
                for line in response_lines:
                    if line.strip():
                        try:
                            response = json.loads(line)
                            logger.info(f"📋 Tools response: {response}")
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
            logger.error(f"❌ Error getting tools for server {server_id}: {e}")
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
    
    async def call_tool(self, server_id: str, server_config: Dict, tool_name: str, arguments: Dict) -> Any:
        """MCP 서버의 도구 호출"""
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
            
            # 초기화 메시지
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
            
            # 도구 호출 메시지
            tool_call_message = {
                "jsonrpc": "2.0",
                "id": 2,
                "method": "tools/call",
                "params": {
                    "name": tool_name,
                    "arguments": arguments
                }
            }
            
            init_json = json.dumps(init_message) + '\n'
            tool_call_json = json.dumps(tool_call_message) + '\n'
            
            process.stdin.write(init_json.encode())
            process.stdin.write(tool_call_json.encode())
            await process.stdin.drain()
            process.stdin.close()
            
            # 응답 대기
            try:
                stdout_data, stderr_data = await asyncio.wait_for(
                    process.communicate(), timeout=timeout
                )
                
                response_lines = stdout_data.decode().strip().split('\n')
                
                for line in response_lines:
                    if line.strip():
                        try:
                            response = json.loads(line)
                            if response.get('id') == 2:
                                if 'result' in response:
                                    result = response['result']
                                    # content 배열에서 텍스트 추출
                                    if isinstance(result, dict) and 'content' in result:
                                        content_list = result['content']
                                        if content_list and isinstance(content_list, list):
                                            first_content = content_list[0]
                                            if isinstance(first_content, dict) and 'text' in first_content:
                                                return first_content['text']
                                    return result
                                elif 'error' in response:
                                    error = response['error']
                                    raise ValueError(f"Tool error: {error.get('message', 'Unknown error')}")
                        except json.JSONDecodeError:
                            continue
                
                # stderr에서 오류 메시지 확인
                if stderr_data:
                    stderr_text = stderr_data.decode().strip()
                    if stderr_text:
                        logger.warning(f"Tool call stderr: {stderr_text}")
                
                raise ValueError(f"No valid response received for tool call {tool_name}")
                
            except asyncio.TimeoutError:
                process.kill()
                await process.wait()
                raise ValueError(f"Tool call timeout for {tool_name}")
                
        except Exception as e:
            logger.error(f"Error calling tool {tool_name} on server {server_id}: {e}")
            raise


# 전역 서비스 인스턴스
mcp_connection_service = McpConnectionService()

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
from ..config_parser import load_mcp_config

logger = logging.getLogger(__name__)


class McpConnectionService:
    """MCP 서버 연결 및 상태 관리"""
    
    def __init__(self):
        self.active_connections: Dict[str, Any] = {}
        self.server_status: Dict[str, str] = {}
        self.server_tools: Dict[str, List[Dict]] = {}
    
    async def check_server_status(self, server_id: str, server_config: Dict) -> str:
        """개별 MCP 서버 상태 확인"""
        try:
            # 서버가 비활성화된 경우
            if server_config.get('disabled', False):
                return "disabled"
            
            # MCP 서버 연결 테스트
            result = await self._test_mcp_connection(server_config)
            if result:
                self.server_status[server_id] = "online"
                return "online"
            else:
                self.server_status[server_id] = "offline"
                return "offline"
                
        except Exception as e:
            logger.error(f"Error checking server {server_id} status: {e}")
            self.server_status[server_id] = "error"
            return "error"
    
    async def _test_mcp_connection(self, server_config: Dict) -> bool:
        """MCP 서버 연결 테스트"""
        try:
            command = server_config.get('command', '')
            args = server_config.get('args', [])
            env = server_config.get('env', {})
            timeout = server_config.get('timeout', 30)
            
            if not command:
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
            
            # 프로세스 실행
            process = await asyncio.create_subprocess_exec(
                command, *args,
                stdin=asyncio.subprocess.PIPE,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE,
                env={**env}
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
                    for line in response_lines:
                        if line.strip():
                            try:
                                response = json.loads(line)
                                if response.get('id') == 1 and 'result' in response:
                                    return True
                            except json.JSONDecodeError:
                                continue
                
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
            if server_config.get('disabled', False):
                return []
            
            command = server_config.get('command', '')
            args = server_config.get('args', [])
            env = server_config.get('env', {})
            timeout = server_config.get('timeout', 30)
            
            if not command:
                return []
            
            # tools/list 메시지 전송
            tools_message = {
                "jsonrpc": "2.0",
                "id": 2,
                "method": "tools/list",
                "params": {}
            }
            
            # 프로세스 실행
            process = await asyncio.create_subprocess_exec(
                command, *args,
                stdin=asyncio.subprocess.PIPE,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE,
                env={**env}
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
                
                for line in response_lines:
                    if line.strip():
                        try:
                            response = json.loads(line)
                            if response.get('id') == 2 and 'result' in response:
                                tools_data = response['result'].get('tools', [])
                                for tool in tools_data:
                                    tools.append({
                                        'name': tool.get('name', ''),
                                        'description': tool.get('description', ''),
                                        'schema': tool.get('inputSchema', {})
                                    })
                                break
                        except json.JSONDecodeError:
                            continue
                
                self.server_tools[server_id] = tools
                return tools
                
            except asyncio.TimeoutError:
                process.kill()
                await process.wait()
                return []
                
        except Exception as e:
            logger.error(f"Error getting tools for server {server_id}: {e}")
            return []
    
    async def refresh_all_servers(self, db: Session) -> Dict[str, Dict]:
        """모든 MCP 서버 상태 새로고침"""
        try:
            # MCP 설정 파일 로드
            config = load_mcp_config()
            if not config or 'servers' not in config:
                return {}
            
            # 데이터베이스의 서버 목록 조회
            db_servers = db.query(McpServer).all()
            server_results = {}
            
            for db_server in db_servers:
                server_name = db_server.name
                
                # 설정 파일에서 해당 서버 찾기
                server_config = config['servers'].get(server_name)
                if not server_config:
                    server_results[str(db_server.id)] = {
                        'status': 'not_configured',
                        'tools_count': 0,
                        'tools': []
                    }
                    continue
                
                # 서버 상태 확인
                status = await self.check_server_status(server_name, server_config)
                
                # 도구 목록 조회 (온라인인 경우에만)
                tools = []
                if status == "online":
                    tools = await self.get_server_tools(server_name, server_config)
                
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
    
    def get_cached_status(self, server_id: str) -> str:
        """캐시된 서버 상태 반환"""
        return self.server_status.get(server_id, "unknown")
    
    def get_cached_tools_count(self, server_id: str) -> int:
        """캐시된 도구 개수 반환"""
        tools = self.server_tools.get(server_id, [])
        return len(tools)


# 전역 서비스 인스턴스
mcp_connection_service = McpConnectionService()

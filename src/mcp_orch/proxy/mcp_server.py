"""
MCP 서버 관리

개별 MCP 서버 프로세스를 관리하고 통신을 처리합니다.
"""

import asyncio
import json
import logging
import os
from typing import Any, Dict, Optional, List
from dataclasses import dataclass, field
import subprocess

from ..config_parser import MCPServerConfig

logger = logging.getLogger(__name__)


@dataclass
class MCPServer:
    """MCP 서버 인스턴스"""
    config: MCPServerConfig
    process: Optional[asyncio.subprocess.Process] = None
    reader_task: Optional[asyncio.Task] = None
    writer_lock: asyncio.Lock = field(default_factory=asyncio.Lock)
    request_id: int = 0
    pending_requests: Dict[str, asyncio.Future] = field(default_factory=dict)
    tools: List[Dict[str, Any]] = field(default_factory=list)
    is_connected: bool = False
    
    async def start(self) -> None:
        """서버 프로세스 시작"""
        if self.process and self.process.returncode is None:
            logger.warning(f"Server {self.config.name} is already running")
            return
            
        # 환경 변수 설정
        env = os.environ.copy()
        env.update(self.config.env)
        
        # 프로세스 시작
        cmd = [self.config.command] + self.config.args
        logger.info(f"Starting MCP server {self.config.name}: {' '.join(cmd)}")
        
        try:
            self.process = await asyncio.create_subprocess_exec(
                *cmd,
                stdin=asyncio.subprocess.PIPE,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE,
                env=env
            )
            
            # 읽기 태스크 시작
            self.reader_task = asyncio.create_task(self._read_loop())
            
            # 서버 초기화
            await self._initialize()
            
            # 도구 목록 조회
            await self._list_tools()
            
            self.is_connected = True
            logger.info(f"MCP server {self.config.name} started successfully")
            
        except Exception as e:
            logger.error(f"Failed to start MCP server {self.config.name}: {e}")
            raise
    
    async def stop(self) -> None:
        """서버 프로세스 종료"""
        if self.reader_task:
            self.reader_task.cancel()
            
        if self.process and self.process.returncode is None:
            logger.info(f"Stopping MCP server {self.config.name}")
            self.process.terminate()
            try:
                await asyncio.wait_for(self.process.wait(), timeout=5.0)
            except asyncio.TimeoutError:
                logger.warning(f"Force killing MCP server {self.config.name}")
                self.process.kill()
                await self.process.wait()
                
        self.is_connected = False
        self.tools.clear()
        
        # pending requests 정리
        await self._cleanup_pending_requests("Server stopped")
    
    async def _read_loop(self) -> None:
        """stdout에서 메시지 읽기"""
        try:
            while True:
                try:
                    line = await self.process.stdout.readline()
                    if not line:
                        logger.warning(f"MCP server {self.config.name}: stdout closed")
                        break
                        
                    # JSON 파싱
                    try:
                        data = json.loads(line.decode('utf-8').strip())
                        await self._handle_message(data)
                    except json.JSONDecodeError as e:
                        logger.error(f"Failed to parse JSON from {self.config.name}: {e}")
                        # JSON 파싱 실패는 계속 진행 (다음 라인 시도)
                        continue
                        
                except asyncio.CancelledError:
                    logger.info(f"Read loop cancelled for {self.config.name}")
                    break
                except Exception as e:
                    logger.error(f"Error in read loop for {self.config.name}: {e}")
                    break
        finally:
            # read loop 종료 시 모든 pending requests를 실패 처리
            await self._cleanup_pending_requests("Read loop terminated")
    
    async def _cleanup_pending_requests(self, error_message: str) -> None:
        """모든 pending requests를 에러로 정리"""
        if self.pending_requests:
            logger.warning(f"Cleaning up {len(self.pending_requests)} pending requests for {self.config.name}: {error_message}")
            
            # 모든 pending requests를 실패 처리
            for request_id, future in list(self.pending_requests.items()):
                if not future.done():
                    future.set_exception(Exception(f"Connection lost: {error_message}"))
            
            self.pending_requests.clear()
    
    async def _handle_message(self, data: Dict[str, Any]) -> None:
        """메시지 처리"""
        # 응답 메시지인 경우
        if "id" in data and str(data["id"]) in self.pending_requests:
            request_id = str(data["id"])
            future = self.pending_requests.pop(request_id)
            
            if "error" in data:
                future.set_exception(Exception(data["error"].get("message", "Unknown error")))
            else:
                future.set_result(data.get("result"))
        else:
            # 알림 메시지 등은 로깅
            logger.debug(f"Notification from {self.config.name}: {data}")
    
    async def _send_request(self, method: str, params: Optional[Dict[str, Any]] = None, timeout: Optional[int] = None) -> Any:
        """요청 전송 및 응답 대기"""
        self.request_id += 1
        request_id = str(self.request_id)
        
        message = {
            "jsonrpc": "2.0",
            "method": method,
            "params": params or {},
            "id": request_id
        }
        
        # Future 생성
        future = asyncio.Future()
        self.pending_requests[request_id] = future
        
        # 메시지 전송
        async with self.writer_lock:
            data = json.dumps(message) + "\n"
            self.process.stdin.write(data.encode('utf-8'))
            await self.process.stdin.drain()
        
        # 응답 대기
        request_timeout = timeout if timeout is not None else self.config.timeout
        try:
            result = await asyncio.wait_for(future, timeout=request_timeout)
            return result
        except asyncio.TimeoutError:
            self.pending_requests.pop(request_id, None)
            raise TimeoutError(f"Request timeout for {method} (waited {request_timeout}s)")
    
    async def _initialize(self) -> None:
        """서버 초기화"""
        logger.info(f"Initializing MCP server {self.config.name}")
        
        result = await self._send_request("initialize", {
            "protocolVersion": "0.1.0",
            "capabilities": {},
            "clientInfo": {
                "name": "mcp-orch",
                "version": "0.1.0"
            }
        })
        
        logger.debug(f"Initialize response from {self.config.name}: {result}")
    
    async def _list_tools(self) -> None:
        """도구 목록 조회"""
        logger.info(f"Listing tools for MCP server {self.config.name}")
        
        result = await self._send_request("tools/list")
        self.tools = result.get("tools", [])
        
        logger.info(f"Found {len(self.tools)} tools in {self.config.name}")
        for tool in self.tools:
            logger.debug(f"  - {tool['name']}: {tool.get('description', 'No description')}")
    
    async def call_tool(self, tool_name: str, arguments: Dict[str, Any]) -> Any:
        """도구 호출"""
        if not self.is_connected:
            raise RuntimeError(f"MCP server {self.config.name} is not connected")
            
        # auto_approve 확인
        if tool_name not in self.config.auto_approve:
            logger.warning(f"Tool {tool_name} requires approval but auto_approve not set")
        
        return await self._send_request("tools/call", {
            "name": tool_name,
            "arguments": arguments
        })
    
    def get_namespaced_tools(self) -> List[Dict[str, Any]]:
        """네임스페이스가 적용된 도구 목록 반환"""
        namespaced_tools = []
        for tool in self.tools:
            namespaced_tool = tool.copy()
            # 원본 이름 저장
            namespaced_tool["original_name"] = tool["name"]
            # 네임스페이스 적용
            namespaced_tool["name"] = f"{self.config.name}.{tool['name']}"
            namespaced_tool["server"] = self.config.name
            namespaced_tools.append(namespaced_tool)
        return namespaced_tools

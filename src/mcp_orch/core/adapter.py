"""
프로토콜 어댑터

stdio와 HTTP 프로토콜 간의 변환을 담당하는 어댑터
"""

import asyncio
import json
import logging
import subprocess
from abc import ABC, abstractmethod
from enum import Enum
from typing import Any, Dict, List, Optional, Union

import aiohttp
from pydantic import BaseModel, Field

logger = logging.getLogger(__name__)


class TransportType(str, Enum):
    """전송 프로토콜 타입"""
    STDIO = "stdio"
    HTTP = "http"
    WEBSOCKET = "websocket"


class MCPMessage(BaseModel):
    """MCP 메시지 포맷"""
    jsonrpc: str = "2.0"
    method: Optional[str] = None
    params: Optional[Dict[str, Any]] = None
    result: Optional[Any] = None
    error: Optional[Dict[str, Any]] = None
    id: Optional[Union[str, int]] = None


class Connection(ABC):
    """추상 연결 클래스"""
    
    @abstractmethod
    async def send(self, message: MCPMessage) -> None:
        """메시지 전송"""
        pass
        
    @abstractmethod
    async def receive(self) -> MCPMessage:
        """메시지 수신"""
        pass
        
    @abstractmethod
    async def close(self) -> None:
        """연결 종료"""
        pass
        
    @abstractmethod
    async def list_tools(self) -> List[Dict[str, Any]]:
        """도구 목록 조회"""
        pass
        
    @abstractmethod
    async def call_tool(self, tool_name: str, arguments: Dict[str, Any]) -> Any:
        """도구 호출"""
        pass


class StdioConnection(Connection):
    """stdio 기반 연결"""
    
    def __init__(self, process: subprocess.Popen):
        self.process = process
        self._reader_task = None
        self._message_queue = asyncio.Queue()
        self._request_id = 0
        self._pending_requests = {}
        
    async def start(self):
        """읽기 태스크 시작"""
        self._reader_task = asyncio.create_task(self._read_loop())
        
    async def _read_loop(self):
        """stdout에서 메시지를 지속적으로 읽기"""
        while True:
            try:
                line = await asyncio.get_event_loop().run_in_executor(
                    None, self.process.stdout.readline
                )
                
                if not line:
                    break
                    
                # JSON-RPC 메시지 파싱
                try:
                    data = json.loads(line.decode('utf-8').strip())
                    message = MCPMessage(**data)
                    
                    # 응답 메시지인 경우
                    if message.id is not None and message.id in self._pending_requests:
                        future = self._pending_requests.pop(message.id)
                        if message.error:
                            future.set_exception(Exception(message.error.get("message", "Unknown error")))
                        else:
                            future.set_result(message.result)
                    else:
                        # 일반 메시지는 큐에 추가
                        await self._message_queue.put(message)
                        
                except json.JSONDecodeError as e:
                    logger.error(f"Failed to parse JSON: {e}")
                    
            except Exception as e:
                logger.error(f"Error in read loop: {e}", exc_info=True)
                break
                
    async def send(self, message: MCPMessage) -> None:
        """stdin으로 메시지 전송"""
        try:
            data = message.model_dump_json(exclude_none=True) + "\n"
            await asyncio.get_event_loop().run_in_executor(
                None,
                lambda: self.process.stdin.write(data.encode('utf-8'))
            )
            await asyncio.get_event_loop().run_in_executor(
                None, self.process.stdin.flush
            )
        except Exception as e:
            logger.error(f"Error sending message: {e}", exc_info=True)
            raise
            
    async def receive(self) -> MCPMessage:
        """메시지 수신"""
        return await self._message_queue.get()
        
    async def close(self) -> None:
        """연결 종료"""
        if self._reader_task:
            self._reader_task.cancel()
            
        if self.process.poll() is None:
            self.process.terminate()
            try:
                await asyncio.wait_for(
                    asyncio.get_event_loop().run_in_executor(None, self.process.wait),
                    timeout=5.0
                )
            except asyncio.TimeoutError:
                self.process.kill()
                
    async def _send_request(self, method: str, params: Optional[Dict[str, Any]] = None) -> Any:
        """요청 전송 및 응답 대기"""
        self._request_id += 1
        request_id = str(self._request_id)
        
        message = MCPMessage(
            method=method,
            params=params,
            id=request_id
        )
        
        # 응답 대기를 위한 Future 생성
        future = asyncio.Future()
        self._pending_requests[request_id] = future
        
        await self.send(message)
        
        # 응답 대기
        try:
            result = await asyncio.wait_for(future, timeout=30.0)
            return result
        except asyncio.TimeoutError:
            self._pending_requests.pop(request_id, None)
            raise TimeoutError(f"Request timeout: {method}")
            
    async def list_tools(self) -> List[Dict[str, Any]]:
        """도구 목록 조회"""
        result = await self._send_request("tools/list")
        return result.get("tools", [])
        
    async def call_tool(self, tool_name: str, arguments: Dict[str, Any]) -> Any:
        """도구 호출"""
        return await self._send_request(
            "tools/call",
            {"name": tool_name, "arguments": arguments}
        )


class HttpConnection(Connection):
    """HTTP 기반 연결"""
    
    def __init__(self, base_url: str, headers: Optional[Dict[str, str]] = None):
        self.base_url = base_url.rstrip('/')
        self.headers = headers or {}
        self.session = None
        
    async def start(self):
        """HTTP 세션 시작"""
        self.session = aiohttp.ClientSession(headers=self.headers)
        
    async def send(self, message: MCPMessage) -> None:
        """HTTP POST로 메시지 전송"""
        # HTTP 연결에서는 send/receive가 하나의 요청-응답으로 처리됨
        pass
        
    async def receive(self) -> MCPMessage:
        """HTTP 응답 수신"""
        # HTTP 연결에서는 send/receive가 하나의 요청-응답으로 처리됨
        pass
        
    async def close(self) -> None:
        """연결 종료"""
        if self.session:
            await self.session.close()
            
    async def _request(self, endpoint: str, data: Optional[Dict[str, Any]] = None) -> Any:
        """HTTP 요청 전송"""
        if not self.session:
            await self.start()
            
        url = f"{self.base_url}/{endpoint}"
        
        try:
            async with self.session.post(url, json=data) as response:
                response.raise_for_status()
                return await response.json()
        except aiohttp.ClientError as e:
            logger.error(f"HTTP request failed: {e}")
            raise
            
    async def list_tools(self) -> List[Dict[str, Any]]:
        """도구 목록 조회"""
        result = await self._request("tools")
        return result.get("tools", [])
        
    async def call_tool(self, tool_name: str, arguments: Dict[str, Any]) -> Any:
        """도구 호출"""
        return await self._request(
            f"tools/{tool_name}",
            arguments
        )


class ProtocolAdapter:
    """
    프로토콜 어댑터
    
    다양한 프로토콜 간의 변환을 담당하고,
    통일된 인터페이스를 제공합니다.
    """
    
    def __init__(self):
        self._connections: Dict[str, Connection] = {}
        
    async def connect(self, server_info: Any) -> Connection:
        """
        서버 정보를 기반으로 적절한 연결 생성
        
        Args:
            server_info: 서버 연결 정보
            
        Returns:
            연결 객체
        """
        transport_type = TransportType(server_info.transport_type)
        
        if transport_type == TransportType.STDIO:
            return await self._create_stdio_connection(server_info)
        elif transport_type == TransportType.HTTP:
            return await self._create_http_connection(server_info)
        else:
            raise ValueError(f"Unsupported transport type: {transport_type}")
            
    async def _create_stdio_connection(self, server_info: Any) -> StdioConnection:
        """stdio 연결 생성"""
        try:
            # 환경 변수 설정
            env = dict(os.environ)
            env.update(server_info.env)
            
            # 프로세스 시작
            cmd = [server_info.command] + server_info.args
            process = subprocess.Popen(
                cmd,
                stdin=subprocess.PIPE,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                env=env,
                text=False  # 바이너리 모드
            )
            
            connection = StdioConnection(process)
            await connection.start()
            
            # 초기 핸드셰이크
            await self._handshake_stdio(connection)
            
            return connection
            
        except Exception as e:
            logger.error(f"Failed to create stdio connection: {e}", exc_info=True)
            raise
            
    async def _create_http_connection(self, server_info: Any) -> HttpConnection:
        """HTTP 연결 생성"""
        try:
            # HTTP 서버 URL 구성
            base_url = server_info.env.get("MCP_HTTP_URL", "http://localhost:8080")
            
            # 인증 헤더 설정
            headers = {}
            if "MCP_API_KEY" in server_info.env:
                headers["Authorization"] = f"Bearer {server_info.env['MCP_API_KEY']}"
                
            connection = HttpConnection(base_url, headers)
            await connection.start()
            
            return connection
            
        except Exception as e:
            logger.error(f"Failed to create HTTP connection: {e}", exc_info=True)
            raise
            
    async def _handshake_stdio(self, connection: StdioConnection) -> None:
        """stdio 연결 초기 핸드셰이크"""
        try:
            # 초기화 메시지 전송
            init_message = MCPMessage(
                method="initialize",
                params={
                    "protocolVersion": "1.0",
                    "capabilities": {}
                },
                id="init"
            )
            
            await connection.send(init_message)
            
            # 응답 대기 (타임아웃 설정)
            # 실제 구현에서는 _send_request 메서드 사용
            
        except Exception as e:
            logger.error(f"Handshake failed: {e}")
            raise
            
    def convert_stdio_to_http(self, stdio_message: MCPMessage) -> Dict[str, Any]:
        """stdio 메시지를 HTTP 요청으로 변환"""
        if stdio_message.method == "tools/list":
            return {
                "endpoint": "/tools",
                "method": "GET",
                "data": None
            }
        elif stdio_message.method == "tools/call":
            tool_name = stdio_message.params.get("name")
            arguments = stdio_message.params.get("arguments", {})
            return {
                "endpoint": f"/tools/{tool_name}",
                "method": "POST",
                "data": arguments
            }
        else:
            raise ValueError(f"Unknown method: {stdio_message.method}")
            
    def convert_http_to_stdio(self, http_response: Dict[str, Any], request_id: str) -> MCPMessage:
        """HTTP 응답을 stdio 메시지로 변환"""
        if "error" in http_response:
            return MCPMessage(
                error={
                    "code": http_response.get("code", -1),
                    "message": http_response.get("error")
                },
                id=request_id
            )
        else:
            return MCPMessage(
                result=http_response,
                id=request_id
            )


# os 모듈 import 추가
import os

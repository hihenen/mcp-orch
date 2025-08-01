"""
도구 레지스트리

MCP 서버들의 도구를 발견, 등록, 관리하는 중앙 레지스트리
"""

import asyncio
import json
import logging
from collections import defaultdict
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, List, Optional, Set

from pydantic import BaseModel, Field

logger = logging.getLogger(__name__)


class ToolInfo(BaseModel):
    """도구 정보"""
    name: str
    server_name: str
    description: Optional[str] = None
    input_schema: Optional[Dict[str, Any]] = None
    output_schema: Optional[Dict[str, Any]] = None
    namespace: str  # 네임스페이스 형식: server_name.tool_name
    registered_at: datetime = Field(default_factory=datetime.now)
    last_used: Optional[datetime] = None
    usage_count: int = 0


class ServerInfo(BaseModel):
    """MCP 서버 정보"""
    name: str
    command: str
    args: List[str] = Field(default_factory=list)
    env: Dict[str, str] = Field(default_factory=dict)
    transport_type: str = "stdio"
    timeout: int = 60
    auto_approve: List[str] = Field(default_factory=list)
    disabled: bool = False
    connected: bool = False
    tools: List[str] = Field(default_factory=list)
    last_connected: Optional[datetime] = None
    error: Optional[str] = None


class ToolRegistry:
    """
    도구 레지스트리
    
    모든 MCP 서버의 도구를 중앙에서 관리하고,
    네임스페이스를 통해 도구 충돌을 방지합니다.
    """
    
    def __init__(self, config_path: Optional[Path] = None):
        """
        레지스트리 초기화
        
        Args:
            config_path: MCP 설정 파일 경로
        """
        self.config_path = config_path or Path("mcp-config.json")
        self._tools: Dict[str, ToolInfo] = {}
        self._servers: Dict[str, ServerInfo] = {}
        self._server_connections: Dict[str, Any] = {}  # 실제 서버 연결 객체
        self._mcp_servers: Dict[str, Any] = {}  # MCPServer 인스턴스
        self._lock = asyncio.Lock()
        
    async def load_configuration(self) -> None:
        """데이터베이스 기반 MCP 서버 목록 로드 (449a99f config_parser 의존성 제거)"""
        # config_parser 의존성 제거하여 완전 DB 기반으로 전환
        # 기존 JSON 파일 로딩 제거
        
        # 데이터베이스에서 서버 로드
        await self._load_database_servers()
            
        logger.info(f"Loaded {len(self._servers)} MCP server configurations from database")
        
    async def _load_database_servers(self) -> None:
        """데이터베이스에서 MCP 서버 목록 로드 (449a99f 완전 DB 기반)"""
        try:
            from ..database import get_db
            from ..models import McpServer
            from ..services.mcp_connection_service import mcp_connection_service
            
            db = next(get_db())
            db_servers = db.query(McpServer).filter(McpServer.is_enabled == True).all()
            
            for db_server in db_servers:
                # 데이터베이스 서버 설정을 ServerInfo로 변환
                config = mcp_connection_service._build_server_config_from_db(db_server)
                if not config:
                    logger.warning(f"Failed to build config for database server: {db_server.name}")
                    continue
                
                server_info = ServerInfo(
                    name=db_server.name,
                    command=config["command"],
                    args=config["args"],
                    env=config.get("env", {}),
                    transport_type=config.get("transportType", "stdio"),
                    timeout=config.get("timeout", 60),
                    auto_approve=[],
                    disabled=config.get("disabled", False)
                )
                
                # 449a99f: config_parser 의존성 제거로 JSON 서버 충돌 없음
                self._servers[db_server.name] = server_info
                logger.info(f"Loaded database server: {db_server.name}")
                    
        except Exception as e:
            logger.error(f"Error loading database servers: {e}", exc_info=True)
            
    async def connect_servers(self) -> None:
        """모든 설정된 MCP 서버에 연결"""
        tasks = []
        server_names = []
        
        for server_name, server_info in self._servers.items():
            if not server_info.disabled:
                tasks.append(self._connect_server(server_name, server_info))
                server_names.append(server_name)
                
        results = await asyncio.gather(*tasks, return_exceptions=True)
        
        # 결과 분석
        connected = 0
        failed = 0
        failed_servers = []
        
        for i, result in enumerate(results):
            server_name = server_names[i]
            if isinstance(result, Exception):
                failed += 1
                failed_servers.append(server_name)
                logger.error(f"Failed to connect to {server_name}: {result}")
            else:
                connected += 1
                
        # 연결 결과 요약
        total = len(tasks)
        logger.info(f"MCP Server Connection Summary: {connected}/{total} servers connected successfully")
        
        if failed > 0:
            logger.warning(f"Failed to connect to {failed} servers: {', '.join(failed_servers)}")
            logger.info("Server will continue to operate with available MCP servers")
        else:
            logger.info("All MCP servers connected successfully")
        
    async def _connect_server(self, server_name: str, server_info: ServerInfo) -> None:
        """
        개별 MCP 서버에 연결
        
        Args:
            server_name: 서버 이름
            server_info: 서버 정보
            
        Raises:
            Exception: 연결 실패 시 예외를 발생시켜 상위에서 처리
        """
        try:
            logger.info(f"Attempting to connect to MCP server: {server_name}")
            
            # MCPServer 인스턴스 생성 및 시작
            from ..proxy.mcp_server import MCPServer
            from ..config_parser import MCPServerConfig
            
            mcp_config = MCPServerConfig(
                name=server_name,
                command=server_info.command,
                args=server_info.args,
                env=server_info.env,
                timeout=server_info.timeout,
                auto_approve=server_info.auto_approve,
                transport_type=server_info.transport_type,
                disabled=server_info.disabled
            )
            
            mcp_server = MCPServer(mcp_config)
            await mcp_server.start()
            
            async with self._lock:
                self._mcp_servers[server_name] = mcp_server
                self._server_connections[server_name] = mcp_server  # 호환성을 위해
                server_info.connected = True
                server_info.last_connected = datetime.now()
                server_info.error = None  # 성공 시 이전 에러 클리어
                
            # 도구 발견
            await self._discover_tools(server_name, mcp_server)
            
            logger.info(f"Successfully connected to {server_name}")
            
        except Exception as e:
            # 서버 상태 업데이트
            async with self._lock:
                server_info.connected = False
                server_info.error = str(e)
                
            # 실패한 서버를 데이터베이스에서 자동 비활성화
            await self._disable_failed_server(server_name, str(e))
                
            # 예외를 다시 발생시켜 상위 레벨에서 처리하도록 함
            error_msg = f"Failed to connect to MCP server '{server_name}': {type(e).__name__}: {e}"
            logger.error(error_msg)
            raise Exception(error_msg) from e
    
    async def _disable_failed_server(self, server_name: str, error_message: str) -> None:
        """
        실패한 MCP 서버를 데이터베이스에서 비활성화
        
        Args:
            server_name: 서버 이름
            error_message: 실패 이유
        """
        try:
            from ..database import get_db
            from ..models import McpServer
            from datetime import datetime
            
            db = next(get_db())
            
            # 해당 서버를 데이터베이스에서 찾아서 비활성화
            db_server = db.query(McpServer).filter(McpServer.name == server_name).first()
            if db_server:
                db_server.is_enabled = False
                db_server.updated_at = datetime.utcnow()
                
                # 실패 이유를 메타데이터에 저장 (JSON 필드가 있다면)
                if hasattr(db_server, 'server_metadata'):
                    # db_server.server_metadata는 SQLAlchemy의 JSON 타입이므로 딕셔너리로 안전하게 처리
                    current_metadata = db_server.server_metadata if db_server.server_metadata is not None else {}
                    
                    # JSON 필드에 실패 정보 추가
                    failure_info = {
                        'error': error_message,
                        'timestamp': datetime.utcnow().isoformat(),
                        'auto_disabled': True
                    }
                    
                    # 새로운 딕셔너리 생성하여 할당 (SQLAlchemy JSON 타입은 mutation tracking을 위해 재할당 필요)
                    updated_metadata = dict(current_metadata)
                    updated_metadata['last_failure'] = failure_info
                    db_server.server_metadata = updated_metadata
                
                db.commit()
                logger.warning(f"Auto-disabled MCP server '{server_name}' in database due to connection failure")
                logger.info(f"Server '{server_name}' will not be loaded on next restart. Re-enable it through admin API if needed.")
            else:
                logger.warning(f"Could not find MCP server '{server_name}' in database to disable")
                
        except Exception as e:
            logger.error(f"Failed to auto-disable server '{server_name}' in database: {e}")
            # 비활성화 실패는 전체 프로세스를 중단시키지 않음
                
    async def _discover_tools(self, server_name: str, mcp_server: Any) -> None:
        """
        MCP 서버에서 도구 발견
        
        Args:
            server_name: 서버 이름
            mcp_server: MCPServer 인스턴스
        """
        try:
            # MCPServer에서 네임스페이스가 적용된 도구 목록 가져오기
            namespaced_tools = mcp_server.get_namespaced_tools()
            
            async with self._lock:
                server_info = self._servers[server_name]
                server_info.tools.clear()  # 기존 도구 목록 초기화
                
                for tool_data in namespaced_tools:
                    namespace = tool_data["name"]  # 이미 네임스페이스 적용됨
                    original_name = tool_data["original_name"]
                    
                    tool_info = ToolInfo(
                        name=original_name,
                        server_name=server_name,
                        description=tool_data.get("description"),
                        input_schema=tool_data.get("inputSchema"),
                        output_schema=tool_data.get("outputSchema"),
                        namespace=namespace
                    )
                    
                    self._tools[namespace] = tool_info
                    server_info.tools.append(original_name)
                    
            logger.info(f"Discovered {len(namespaced_tools)} tools from {server_name}")
            
        except Exception as e:
            # 도구 발견 실패는 서버 연결을 중단시키지 않음 (서버는 연결되었지만 도구만 없는 상태)
            logger.warning(f"Failed to discover tools from {server_name}: {e}")
            logger.info(f"Server {server_name} will remain connected without tools")
            
    async def register_tool(self, server_name: str, tool_info: Dict[str, Any]) -> str:
        """
        도구 수동 등록
        
        Args:
            server_name: 서버 이름
            tool_info: 도구 정보
            
        Returns:
            등록된 도구의 네임스페이스
        """
        tool_name = tool_info["name"]
        namespace = f"{server_name}.{tool_name}"
        
        async with self._lock:
            self._tools[namespace] = ToolInfo(
                name=tool_name,
                server_name=server_name,
                description=tool_info.get("description"),
                input_schema=tool_info.get("inputSchema"),
                output_schema=tool_info.get("outputSchema"),
                namespace=namespace
            )
            
            if server_name in self._servers:
                self._servers[server_name].tools.append(tool_name)
                
        logger.info(f"Registered tool: {namespace}")
        return namespace
        
    def get_tool(self, namespace: str) -> Optional[ToolInfo]:
        """
        네임스페이스로 도구 조회
        
        Args:
            namespace: 도구 네임스페이스 (server_name.tool_name)
            
        Returns:
            도구 정보 또는 None
        """
        return self._tools.get(namespace)
        
    def get_all_tools(self) -> List[ToolInfo]:
        """모든 등록된 도구 조회"""
        return list(self._tools.values())
        
    def get_server_tools(self, server_name: str) -> List[ToolInfo]:
        """특정 서버의 도구 목록 조회"""
        return [
            tool for tool in self._tools.values()
            if tool.server_name == server_name
        ]
        
    def get_servers(self) -> List[ServerInfo]:
        """모든 서버 정보 조회"""
        return list(self._servers.values())
        
    def get_server(self, server_name: str) -> Optional[ServerInfo]:
        """특정 서버 정보 조회"""
        return self._servers.get(server_name)
        
    async def get_server_connection(self, server_name: str) -> Optional[Any]:
        """서버 연결 객체 조회"""
        async with self._lock:
            return self._server_connections.get(server_name)
            
    async def update_tool_usage(self, namespace: str) -> None:
        """도구 사용 통계 업데이트"""
        async with self._lock:
            if namespace in self._tools:
                tool = self._tools[namespace]
                tool.usage_count += 1
                tool.last_used = datetime.now()
                
    async def reload_servers(self) -> None:
        """서버 설정 리로드 및 재연결"""
        logger.info("Reloading MCP server configurations")
        
        # 기존 MCP 서버 종료
        for server_name, mcp_server in self._mcp_servers.items():
            try:
                await mcp_server.stop()
            except Exception as e:
                logger.error(f"Error stopping MCP server {server_name}: {e}")
                
        # 초기화
        async with self._lock:
            self._tools.clear()
            self._servers.clear()
            self._server_connections.clear()
            self._mcp_servers.clear()
            
        # 재로드
        await self.load_configuration()
        await self.connect_servers()
        
    def search_tools(self, query: str) -> List[ToolInfo]:
        """
        도구 검색
        
        Args:
            query: 검색어
            
        Returns:
            매칭되는 도구 목록
        """
        query_lower = query.lower()
        results = []
        
        for tool in self._tools.values():
            if (query_lower in tool.name.lower() or
                query_lower in tool.namespace.lower() or
                (tool.description and query_lower in tool.description.lower())):
                results.append(tool)
                
        return results
        
    def get_statistics(self) -> Dict[str, Any]:
        """레지스트리 통계 조회"""
        total_servers = len(self._servers)
        connected_servers = sum(1 for s in self._servers.values() if s.connected)
        total_tools = len(self._tools)
        
        # 서버별 도구 수
        tools_by_server = defaultdict(int)
        for tool in self._tools.values():
            tools_by_server[tool.server_name] += 1
            
        # 가장 많이 사용된 도구
        most_used_tools = sorted(
            self._tools.values(),
            key=lambda t: t.usage_count,
            reverse=True
        )[:10]
        
        return {
            "total_servers": total_servers,
            "connected_servers": connected_servers,
            "total_tools": total_tools,
            "tools_by_server": dict(tools_by_server),
            "most_used_tools": [
                {
                    "namespace": t.namespace,
                    "usage_count": t.usage_count,
                    "last_used": t.last_used.isoformat() if t.last_used else None
                }
                for t in most_used_tools
            ]
        }

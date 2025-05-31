"""
듀얼 모드 컨트롤러

프록시 모드와 병렬화 모드를 관리하고 전환하는 핵심 컨트롤러
"""

import asyncio
import logging
from enum import Enum
from typing import Any, Dict, Optional, Union

from pydantic import BaseModel, Field

from ..config import Settings
from .registry import ToolRegistry
from ..config_parser import ConfigParser

logger = logging.getLogger(__name__)


class OperationMode(str, Enum):
    """운영 모드 정의"""
    PROXY = "proxy"
    BATCH = "batch"


class ControllerState(BaseModel):
    """컨트롤러 상태"""
    mode: OperationMode = Field(default=OperationMode.PROXY)
    is_running: bool = Field(default=False)
    connected_servers: int = Field(default=0)
    total_tools: int = Field(default=0)
    active_tasks: int = Field(default=0)


class DualModeController:
    """
    듀얼 모드 컨트롤러
    
    프록시 모드와 병렬화 모드 간 전환을 관리하고,
    각 모드에 맞는 요청 처리를 담당합니다.
    """
    
    def __init__(self, settings: Optional[Settings] = None):
        """
        컨트롤러 초기화
        
        Args:
            settings: 애플리케이션 설정
        """
        self.settings = settings or Settings()
        self.mode = OperationMode(self.settings.server.mode)
        self.state = ControllerState(mode=self.mode)
        self.tool_registry = ToolRegistry()
        self._proxy_handler = None
        self._batch_handler = None
        self._lock = asyncio.Lock()
        self.config_parser = ConfigParser(str(self.settings.mcp_config_file) if self.settings.mcp_config_file else None)
        self._tool_registry = self.tool_registry  # 호환성을 위한 별칭
        
    async def initialize(self) -> None:
        """컨트롤러 초기화 및 핸들러 설정"""
        logger.info(f"Initializing DualModeController in {self.mode} mode")
        
        # 도구 레지스트리 초기화 (설정 파일 로드 및 MCP 서버 연결)
        await self.tool_registry.load_configuration()
        await self.tool_registry.connect_servers()
        
        # 모드별 핸들러 초기화
        if self.mode == OperationMode.PROXY:
            from ..proxy.handler import ProxyHandler
            self._proxy_handler = ProxyHandler(self.tool_registry)
            await self._proxy_handler.initialize()
        else:
            from ..batch.handler import BatchHandler
            self._batch_handler = BatchHandler(self.tool_registry)
            await self._batch_handler.initialize()
            
        self.state.is_running = True
        logger.info("DualModeController initialized successfully")
        
    async def shutdown(self) -> None:
        """컨트롤러 종료"""
        logger.info("Shutting down DualModeController")
        
        async with self._lock:
            if self._proxy_handler:
                await self._proxy_handler.shutdown()
            if self._batch_handler:
                await self._batch_handler.shutdown()
                
            self.state.is_running = False
            
        logger.info("DualModeController shutdown complete")
        
    async def switch_mode(self, new_mode: OperationMode) -> Dict[str, Any]:
        """
        운영 모드 전환
        
        Args:
            new_mode: 전환할 모드
            
        Returns:
            전환 결과
        """
        async with self._lock:
            if new_mode == self.mode:
                return {
                    "status": "unchanged",
                    "message": f"Already in {new_mode} mode"
                }
                
            logger.info(f"Switching mode from {self.mode} to {new_mode}")
            
            # 현재 핸들러 종료
            if self.mode == OperationMode.PROXY and self._proxy_handler:
                await self._proxy_handler.shutdown()
                self._proxy_handler = None
            elif self.mode == OperationMode.BATCH and self._batch_handler:
                await self._batch_handler.shutdown()
                self._batch_handler = None
                
            # 새 모드 설정 및 핸들러 초기화
            self.mode = new_mode
            self.state.mode = new_mode
            
            if new_mode == OperationMode.PROXY:
                from ..proxy.handler import ProxyHandler
                self._proxy_handler = ProxyHandler(self.tool_registry)
                await self._proxy_handler.initialize()
            else:
                from ..batch.handler import BatchHandler
                self._batch_handler = BatchHandler(self.tool_registry)
                await self._batch_handler.initialize()
                
            return {
                "status": "success",
                "message": f"Switched to {new_mode} mode",
                "mode": new_mode
            }
            
    async def handle_request(self, request: Dict[str, Any]) -> Dict[str, Any]:
        """
        요청 처리 (모드에 따라 적절한 핸들러로 라우팅)
        
        Args:
            request: 처리할 요청
            
        Returns:
            처리 결과
        """
        if not self.state.is_running:
            return {
                "error": "Controller is not running",
                "status": "error"
            }
            
        try:
            if self.mode == OperationMode.PROXY:
                if not self._proxy_handler:
                    return {
                        "error": "Proxy handler not initialized",
                        "status": "error"
                    }
                return await self._proxy_handler.handle(request)
            else:
                if not self._batch_handler:
                    return {
                        "error": "Batch handler not initialized",
                        "status": "error"
                    }
                return await self._batch_handler.handle(request)
                
        except Exception as e:
            logger.error(f"Error handling request: {e}", exc_info=True)
            return {
                "error": str(e),
                "status": "error"
            }
            
    async def get_status(self) -> Dict[str, Any]:
        """
        컨트롤러 상태 조회
        
        Returns:
            상태 정보
        """
        # 도구 레지스트리에서 최신 정보 업데이트
        self.state.connected_servers = len(self.tool_registry.get_servers())
        self.state.total_tools = len(self.tool_registry.get_all_tools())
        
        # 모드별 추가 상태 정보
        mode_status = {}
        if self.mode == OperationMode.PROXY and self._proxy_handler:
            mode_status = await self._proxy_handler.get_status()
        elif self.mode == OperationMode.BATCH and self._batch_handler:
            mode_status = await self._batch_handler.get_status()
            self.state.active_tasks = mode_status.get("active_tasks", 0)
            
        return {
            **self.state.model_dump(),
            "mode_status": mode_status
        }
        
    async def reload_configuration(self) -> Dict[str, Any]:
        """
        설정 파일 리로드
        
        Returns:
            리로드 결과
        """
        try:
            logger.info("Reloading configuration")
            
            # 설정 파일 변경 확인 및 리로드
            if self.config_parser.reload_if_changed():
                logger.info("Configuration file changed, reloading servers")
                
                # 기존 서버 연결 종료
                # TODO: 기존 MCP 서버 연결 종료 구현
                
                # 새로운 설정으로 서버 재연결
                config = self.config_parser._config
                for server_name, server_config in config.servers.items():
                    if not server_config.disabled:
                        logger.info(f"Reloading MCP server: {server_name}")
                        # TODO: MCP 서버 재연결 구현
            
            # 설정 리로드
            self.settings.reload()
            
            # 도구 레지스트리 리로드
            await self.tool_registry.reload_servers()
            
            return {
                "status": "success",
                "message": "Configuration reloaded successfully",
                "servers": len(self.tool_registry.get_servers()),
                "tools": len(self.tool_registry.get_all_tools())
            }
            
        except Exception as e:
            logger.error(f"Error reloading configuration: {e}", exc_info=True)
            return {
                "status": "error",
                "error": str(e)
            }

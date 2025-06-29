"""
Standard MCP API 모듈화 패키지
SOLID 원칙 기반으로 분해된 MCP 프로토콜 구현

모듈 구조:
- mcp_protocol_handler: MCP 프로토콜 처리
- mcp_auth_manager: 인증 및 권한 관리  
- mcp_tool_manager: 도구 관리
- mcp_server_connector: 실제 서버 연결
- mcp_sse_manager: SSE 스트림 관리
- fastmcp_integration: FastMCP 통합
- mcp_routes: HTTP 엔드포인트
"""

from fastapi import APIRouter

# 모든 서브 모듈 import
from .mcp_routes import router as mcp_routes_router

# 메인 라우터 생성 및 하위 라우터 통합
router = APIRouter()
router.include_router(mcp_routes_router)

# 하위 호환성을 위한 기존 인터페이스 노출
from .mcp_protocol_handler import McpProtocolHandler
from .mcp_auth_manager import McpAuthManager
from .mcp_tool_manager import McpToolManager
from .mcp_server_connector import McpServerConnector
from .mcp_sse_manager import McpSseManager
from .fastmcp_integration import FastMcpIntegration

# Facade 패턴 구현 - 하위 호환성을 위한 통합 인터페이스
class StandardMcpOrchestrator:
    """모든 MCP 기능을 통합하는 Facade 클래스"""
    
    def __init__(self):
        self.protocol_handler = McpProtocolHandler()
        self.auth_manager = McpAuthManager()
        self.tool_manager = McpToolManager()
        self.server_connector = McpServerConnector()
        self.sse_manager = McpSseManager()
        self.fastmcp_integration = FastMcpIntegration()
    
    # 기존 StandardMCPHandler 클래스의 인터페이스 유지
    async def initialize(self):
        """MCP 핸들러 초기화 (하위 호환성)"""
        pass
    
    def _setup_handlers(self):
        """표준 MCP 핸들러 설정 (하위 호환성)"""
        pass

# 기존 클래스명으로 alias 생성 (하위 호환성)
StandardMCPHandler = StandardMcpOrchestrator

__all__ = [
    "router",
    "McpProtocolHandler",
    "McpAuthManager", 
    "McpToolManager",
    "McpServerConnector",
    "McpSseManager",
    "FastMcpIntegration",
    "StandardMcpOrchestrator",
    "StandardMCPHandler"  # 하위 호환성
]
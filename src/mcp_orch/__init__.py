"""
MCP Orch - 하이브리드 MCP 프록시 및 병렬화 오케스트레이션 도구

여러 MCP 서버를 통합하고 작업을 자동으로 병렬 처리하는 혁신적인 도구
"""

from dotenv import load_dotenv

# Load .env file
load_dotenv()

__version__ = "0.1.0"
__author__ = "Your Name"
__email__ = "your.email@example.com"

from .core.controller import DualModeController
from .core.registry import ToolRegistry
from .core.adapter import ProtocolAdapter

__all__ = ["DualModeController", "ToolRegistry", "ProtocolAdapter"]

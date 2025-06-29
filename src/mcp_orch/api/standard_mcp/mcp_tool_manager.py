"""
MCP 도구 관리
도구 스키마 관리, 등록, 검증, 호출 처리
"""

import logging
from typing import List, Dict, Any, Optional

from mcp.types import Tool, TextContent

from .common import McpError

logger = logging.getLogger(__name__)


class McpToolManager:
    """MCP 도구 관리"""
    
    def __init__(self):
        self.logger = logger
        self._hardcoded_tools = self._create_hardcoded_tools()
    
    def _create_hardcoded_tools(self) -> List[Tool]:
        """하드코딩된 도구들 생성 (Brave Search)"""
        return [
            Tool(
                name="brave_web_search",
                description="Performs a web search using the Brave Search API, ideal for general queries, news, articles, and online content. Use this for broad information gathering, recent events, or when you need diverse web sources. Supports pagination, content filtering, and freshness controls. Maximum 20 results per request, with offset for pagination.",
                inputSchema={
                    "type": "object",
                    "properties": {
                        "query": {
                            "type": "string",
                            "description": "Search query (max 400 chars, 50 words)"
                        },
                        "count": {
                            "type": "number",
                            "description": "Number of results (1-20, default 10)",
                            "default": 10
                        },
                        "offset": {
                            "type": "number",
                            "description": "Pagination offset (max 9, default 0)",
                            "default": 0
                        }
                    },
                    "required": ["query"]
                }
            ),
            Tool(
                name="brave_local_search",
                description="Searches for local businesses and places using Brave's Local Search API. Best for queries related to physical locations, businesses, restaurants, services, etc. Returns detailed information including business names and addresses, ratings and review counts, phone numbers and opening hours. Use this when the query implies 'near me' or mentions specific locations. Automatically falls back to web search if no local results are found.",
                inputSchema={
                    "type": "object",
                    "properties": {
                        "query": {
                            "type": "string",
                            "description": "Local search query (e.g. 'pizza near Central Park')"
                        },
                        "count": {
                            "type": "number",
                            "description": "Number of results (1-20, default 5)",
                            "default": 5
                        }
                    },
                    "required": ["query"]
                }
            )
        ]
    
    def get_available_tools(self, use_hardcoded: bool = True) -> List[Tool]:
        """사용 가능한 도구 목록 조회"""
        if use_hardcoded:
            self.logger.info(f"Returning {len(self._hardcoded_tools)} hardcoded tools")
            return self._hardcoded_tools.copy()
        
        # 실제 MCP 서버에서 도구 조회하는 로직은 server_connector에서 처리
        return []
    
    def get_tool_by_name(self, tool_name: str, use_hardcoded: bool = True) -> Optional[Tool]:
        """이름으로 도구 조회"""
        available_tools = self.get_available_tools(use_hardcoded)
        
        for tool in available_tools:
            if tool.name == tool_name:
                return tool
        
        return None
    
    def validate_tool_exists(self, tool_name: str, use_hardcoded: bool = True) -> bool:
        """도구 존재 여부 확인"""
        return self.get_tool_by_name(tool_name, use_hardcoded) is not None
    
    def validate_tool_arguments(self, tool_name: str, arguments: Dict[str, Any]) -> bool:
        """도구 인자 검증"""
        tool = self.get_tool_by_name(tool_name)
        if not tool:
            raise McpError(f"Tool '{tool_name}' not found", -32601)
        
        # inputSchema가 있는 경우 검증
        if hasattr(tool, 'inputSchema') and tool.inputSchema:
            return self._validate_against_schema(arguments, tool.inputSchema)
        
        # 스키마가 없으면 기본적으로 통과
        return True
    
    def _validate_against_schema(self, arguments: Dict[str, Any], schema: Dict[str, Any]) -> bool:
        """JSON 스키마에 대한 인자 검증"""
        try:
            # 필수 필드 확인
            required_fields = schema.get("required", [])
            for field in required_fields:
                if field not in arguments:
                    raise McpError(f"Required field '{field}' is missing", -32602)
            
            # 타입 확인 (기본적인 검증만)
            properties = schema.get("properties", {})
            for arg_name, arg_value in arguments.items():
                if arg_name in properties:
                    expected_type = properties[arg_name].get("type")
                    if expected_type and not self._check_type(arg_value, expected_type):
                        raise McpError(f"Invalid type for '{arg_name}': expected {expected_type}", -32602)
            
            return True
            
        except McpError:
            raise
        except Exception as e:
            self.logger.error(f"Schema validation error: {e}")
            return False
    
    def _check_type(self, value: Any, expected_type: str) -> bool:
        """기본적인 타입 검사"""
        type_mapping = {
            "string": str,
            "number": (int, float),
            "integer": int,
            "boolean": bool,
            "array": list,
            "object": dict
        }
        
        expected_python_type = type_mapping.get(expected_type)
        if expected_python_type:
            return isinstance(value, expected_python_type)
        
        return True  # 알 수 없는 타입은 통과
    
    def create_mock_tool_response(self, tool_name: str, arguments: Dict[str, Any]) -> List[TextContent]:
        """목 도구 응답 생성 (하드코딩된 도구용)"""
        if tool_name == "brave_web_search":
            query = arguments.get("query", "")
            count = arguments.get("count", 10)
            
            mock_content = f"Mock web search results for '{query}' (requested {count} results):\n\n"
            mock_content += "1. Example Result 1 - This is a mock search result\n"
            mock_content += "2. Example Result 2 - Another mock search result\n"
            mock_content += f"... and {count-2} more results"
            
            return [TextContent(type="text", text=mock_content)]
        
        elif tool_name == "brave_local_search":
            query = arguments.get("query", "")
            count = arguments.get("count", 5)
            
            mock_content = f"Mock local search results for '{query}' (requested {count} results):\n\n"
            mock_content += "1. Example Business 1 - 123 Main St, City\n"
            mock_content += "2. Example Business 2 - 456 Oak Ave, City\n"
            mock_content += f"... and {count-2} more local results"
            
            return [TextContent(type="text", text=mock_content)]
        
        else:
            return [TextContent(
                type="text", 
                text=f"Tool '{tool_name}' executed with arguments: {arguments}"
            )]
    
    def get_tool_schema(self, tool_name: str) -> Optional[Dict[str, Any]]:
        """도구 스키마 조회"""
        tool = self.get_tool_by_name(tool_name)
        if tool and hasattr(tool, 'inputSchema'):
            return tool.inputSchema
        return None
    
    def list_tool_names(self, use_hardcoded: bool = True) -> List[str]:
        """도구 이름 목록 조회"""
        tools = self.get_available_tools(use_hardcoded)
        return [tool.name for tool in tools]
    
    def get_tool_info(self, tool_name: str) -> Optional[Dict[str, Any]]:
        """도구 정보 조회"""
        tool = self.get_tool_by_name(tool_name)
        if not tool:
            return None
        
        info = {
            "name": tool.name,
            "description": tool.description
        }
        
        if hasattr(tool, 'inputSchema') and tool.inputSchema:
            info["inputSchema"] = tool.inputSchema
        
        return info
    
    def filter_tools_by_pattern(self, pattern: str, use_hardcoded: bool = True) -> List[Tool]:
        """패턴으로 도구 필터링"""
        tools = self.get_available_tools(use_hardcoded)
        filtered_tools = []
        
        pattern_lower = pattern.lower()
        for tool in tools:
            if (pattern_lower in tool.name.lower() or 
                pattern_lower in tool.description.lower()):
                filtered_tools.append(tool)
        
        return filtered_tools
    
    def log_tool_operation(self, operation: str, tool_name: str, details: Optional[str] = None):
        """도구 작업 로깅"""
        log_message = f"Tool {operation}: {tool_name}"
        if details:
            log_message += f" - {details}"
        
        self.logger.info(log_message)
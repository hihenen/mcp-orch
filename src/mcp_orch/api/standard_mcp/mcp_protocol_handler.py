"""
MCP 프로토콜 표준 처리
메시지 파싱, 검증, 응답 포맷팅
"""

import logging
import json
from typing import Dict, Any, Optional, List

from mcp.types import Tool, TextContent

from .common import (
    McpMessage,
    McpResponse,
    MCP_PROTOCOL_VERSION,
    validate_mcp_message,
    create_mcp_error_response,
    create_mcp_success_response,
    McpError
)

logger = logging.getLogger(__name__)


class McpProtocolHandler:
    """MCP 프로토콜 표준 처리"""
    
    def __init__(self):
        self.logger = logger
        self.protocol_version = MCP_PROTOCOL_VERSION
    
    def parse_message(self, raw_message: str) -> McpMessage:
        """원시 메시지를 MCP 메시지로 파싱"""
        try:
            message = json.loads(raw_message)
            
            if not validate_mcp_message(message):
                raise McpError("Invalid MCP message format", -32600)
            
            self.logger.debug(f"Parsed MCP message: {message.get('method', 'unknown')} (id: {message.get('id')})")
            return message
            
        except json.JSONDecodeError as e:
            raise McpError(f"Invalid JSON: {e}", -32700)
        except Exception as e:
            raise McpError(f"Message parsing failed: {e}", -32600)
    
    def create_initialize_response(self, message_id: Optional[Any]) -> McpResponse:
        """초기화 응답 생성"""
        capabilities = {
            "tools": {},
            "resources": {},
            "prompts": {}
        }
        
        server_info = {
            "name": "mcp-orch",
            "version": "1.0.0"
        }
        
        result = {
            "protocolVersion": self.protocol_version,
            "capabilities": capabilities,
            "serverInfo": server_info
        }
        
        return create_mcp_success_response(message_id, result)
    
    def create_tools_list_response(self, message_id: Optional[Any], tools: List[Tool]) -> McpResponse:
        """도구 목록 응답 생성"""
        tools_data = []
        
        for tool in tools:
            tool_data = {
                "name": tool.name,
                "description": tool.description
            }
            
            # inputSchema가 있는 경우 추가
            if hasattr(tool, 'inputSchema') and tool.inputSchema:
                tool_data["inputSchema"] = tool.inputSchema
            
            tools_data.append(tool_data)
        
        result = {"tools": tools_data}
        return create_mcp_success_response(message_id, result)
    
    def create_tool_call_response(self, message_id: Optional[Any], content: List[TextContent]) -> McpResponse:
        """도구 호출 응답 생성"""
        content_data = []
        
        for item in content:
            if hasattr(item, 'type') and hasattr(item, 'text'):
                content_data.append({
                    "type": item.type,
                    "text": item.text
                })
            else:
                # 기본 텍스트 형식으로 처리
                content_data.append({
                    "type": "text",
                    "text": str(item)
                })
        
        result = {"content": content_data}
        return create_mcp_success_response(message_id, result)
    
    def create_notification(self, method: str, params: Optional[Dict[str, Any]] = None) -> McpResponse:
        """알림 메시지 생성"""
        notification = {
            "jsonrpc": "2.0",
            "method": method
        }
        
        if params:
            notification["params"] = params
        
        return notification
    
    def handle_standard_methods(self, message: McpMessage) -> Optional[McpResponse]:
        """표준 MCP 메서드 처리"""
        method = message.get("method")
        message_id = message.get("id")
        
        if method == "initialize":
            return self.create_initialize_response(message_id)
        
        elif method == "ping":
            # Ping에 대한 Pong 응답
            return create_mcp_success_response(message_id, {})
        
        elif method == "notifications/initialized":
            # 초기화 완료 알림 - 응답 없음
            self.logger.info("Client initialization completed")
            return None
        
        # 기타 표준 메서드들은 None 반환 (다른 핸들러에서 처리)
        return None
    
    def validate_tool_call_params(self, params: Dict[str, Any]) -> tuple[str, Dict[str, Any]]:
        """도구 호출 파라미터 검증"""
        if not params:
            raise McpError("Missing tool call parameters", -32602)
        
        tool_name = params.get("name")
        if not tool_name:
            raise McpError("Missing tool name", -32602)
        
        arguments = params.get("arguments", {})
        if not isinstance(arguments, dict):
            raise McpError("Invalid tool arguments format", -32602)
        
        return tool_name, arguments
    
    def create_method_not_found_response(self, message_id: Optional[Any], method: str) -> McpResponse:
        """메서드를 찾을 수 없음 응답 생성"""
        return create_mcp_error_response(
            message_id,
            -32601,
            f"Method not found: {method}"
        )
    
    def create_internal_error_response(self, message_id: Optional[Any], error_message: str) -> McpResponse:
        """내부 오류 응답 생성"""
        return create_mcp_error_response(
            message_id,
            -32603,
            f"Internal error: {error_message}"
        )
    
    def format_response_for_transport(self, response: McpResponse) -> str:
        """전송을 위한 응답 포맷팅"""
        try:
            return json.dumps(response, ensure_ascii=False)
        except Exception as e:
            self.logger.error(f"Response formatting failed: {e}")
            # 기본 에러 응답 반환
            error_response = create_mcp_error_response(
                None,
                -32603,
                "Response formatting failed"
            )
            return json.dumps(error_response, ensure_ascii=False)
    
    def log_message_processing(self, message: McpMessage, response: Optional[McpResponse]):
        """메시지 처리 로깅"""
        method = message.get("method", "unknown")
        message_id = message.get("id")
        
        if response:
            if "error" in response:
                error_code = response["error"].get("code", "unknown")
                error_message = response["error"].get("message", "unknown")
                self.logger.warning(f"MCP {method} (id: {message_id}) failed: {error_code} - {error_message}")
            else:
                self.logger.info(f"MCP {method} (id: {message_id}) succeeded")
        else:
            self.logger.info(f"MCP {method} (id: {message_id}) - no response (notification)")
    
    def is_notification(self, message: McpMessage) -> bool:
        """메시지가 알림인지 확인 (id 필드 없음)"""
        return "id" not in message and "method" in message
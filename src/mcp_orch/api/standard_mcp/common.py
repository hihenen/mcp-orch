"""
Standard MCP API 공통 구성 요소
공통 타입, 유틸리티 함수, 상수 정의
"""

import logging
from typing import Dict, Any, Optional
from uuid import UUID

from fastapi import HTTPException, status, Request
from sqlalchemy.orm import Session
from sqlalchemy import and_

from ...models import Project, ProjectMember, User, McpServer, ApiKey
from ..jwt_auth import get_user_from_jwt_token

logger = logging.getLogger(__name__)

# 상수 정의
DEFAULT_TIMEOUT = 30
MCP_PROTOCOL_VERSION = "2025-03-26"
DEFAULT_KEEPALIVE_INTERVAL = 30
MAX_RECONNECT_ATTEMPTS = 3

# 타입 정의
ServerConfig = Dict[str, Any]
McpMessage = Dict[str, Any]
McpResponse = Dict[str, Any]


class McpError(Exception):
    """MCP 관련 에러"""
    def __init__(self, message: str, code: int = -1):
        self.message = message
        self.code = code
        super().__init__(message)


class McpServerNotFound(McpError):
    """MCP 서버를 찾을 수 없음"""
    def __init__(self, server_name: str):
        super().__init__(f"Server '{server_name}' not found", -32601)


class McpServerDisabled(McpError):
    """MCP 서버가 비활성화됨"""
    def __init__(self, server_name: str):
        super().__init__(f"Server '{server_name}' is disabled", -32600)


class McpAuthenticationError(McpError):
    """MCP 인증 오류"""
    def __init__(self, message: str = "Authentication required"):
        super().__init__(message, -32600)


# 공통 유틸리티 함수
async def get_current_user_for_standard_mcp(request: Request, db: Session) -> User:
    """Standard MCP API용 사용자 인증 함수"""
    if hasattr(request.state, 'user') and request.state.user:
        return request.state.user
    
    user = await get_user_from_jwt_token(request, db)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required"
        )
    return user


def get_server_config_from_db(project_id: str, server_name: str, db: Session) -> tuple[McpServer, ServerConfig]:
    """데이터베이스에서 서버 설정 조회"""
    db_server = db.query(McpServer).filter(
        and_(
            McpServer.project_id == UUID(project_id),
            McpServer.name == server_name
        )
    ).first()
    
    if not db_server:
        raise McpServerNotFound(server_name)
    
    server_config = {
        'command': db_server.command,
        'args': db_server.args or [],
        'env': db_server.env or {},
        'timeout': DEFAULT_TIMEOUT,
        'is_enabled': db_server.is_enabled
    }
    
    if not server_config.get('is_enabled', True):
        raise McpServerDisabled(server_name)
    
    return db_server, server_config


def validate_mcp_message(message: McpMessage) -> bool:
    """MCP 메시지 형식 검증"""
    if not isinstance(message, dict):
        return False
    
    # JSON-RPC 2.0 형식 확인
    if message.get('jsonrpc') != '2.0':
        return False
        
    # id 또는 method 필드 확인
    if 'id' not in message and 'method' not in message:
        return False
        
    return True


def create_mcp_error_response(message_id: Optional[Any], error_code: int, error_message: str) -> McpResponse:
    """MCP 에러 응답 생성"""
    return {
        "jsonrpc": "2.0",
        "id": message_id,
        "error": {
            "code": error_code,
            "message": error_message
        }
    }


def create_mcp_success_response(message_id: Optional[Any], result: Any) -> McpResponse:
    """MCP 성공 응답 생성"""
    return {
        "jsonrpc": "2.0",
        "id": message_id,
        "result": result
    }


def get_project_and_verify_access(project_id: str, user: User, db: Session) -> Project:
    """프로젝트 존재 여부와 사용자 접근 권한 확인"""
    project = db.query(Project).filter(Project.id == UUID(project_id)).first()
    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project not found"
        )
    
    # 프로젝트 멤버십 확인
    project_member = db.query(ProjectMember).filter(
        ProjectMember.project_id == UUID(project_id),
        ProjectMember.user_id == user.id
    ).first()
    
    if not project_member:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You are not a member of this project"
        )
    
    return project
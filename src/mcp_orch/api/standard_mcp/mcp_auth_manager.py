"""
MCP 인증 및 권한 관리
JWT 토큰, API 키 기반 인증 처리
"""

import logging
from typing import Optional

from fastapi import Request, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import and_

from ...models import Project, ProjectMember, User, McpServer, ApiKey
from ..jwt_auth import get_user_from_jwt_token
from .common import (
    McpAuthenticationError,
    get_current_user_for_standard_mcp,
    get_project_and_verify_access
)

logger = logging.getLogger(__name__)


class McpAuthManager:
    """MCP 인증 및 권한 관리"""
    
    def __init__(self):
        self.logger = logger
    
    async def authenticate_request(self, request: Request, db: Session) -> User:
        """요청 인증 처리"""
        try:
            # 1. JWT 토큰 인증 시도
            user = await self._authenticate_with_jwt(request, db)
            if user:
                return user
            
            # 2. API 키 인증 시도
            user = await self._authenticate_with_api_key(request, db)
            if user:
                return user
            
            # 3. 모든 인증 방법 실패
            raise McpAuthenticationError("No valid authentication found")
            
        except Exception as e:
            self.logger.error(f"Authentication failed: {e}")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Authentication failed"
            )
    
    async def _authenticate_with_jwt(self, request: Request, db: Session) -> Optional[User]:
        """JWT 토큰 기반 인증"""
        try:
            # Request state에 이미 사용자가 있는 경우
            if hasattr(request.state, 'user') and request.state.user:
                return request.state.user
            
            # JWT 토큰에서 사용자 추출
            user = await get_user_from_jwt_token(request, db)
            if user:
                # Request state에 사용자 저장
                request.state.user = user
                self.logger.info(f"JWT authentication successful for user {user.id}")
                return user
                
        except Exception as e:
            self.logger.debug(f"JWT authentication failed: {e}")
        
        return None
    
    async def _authenticate_with_api_key(self, request: Request, db: Session) -> Optional[User]:
        """API 키 기반 인증"""
        try:
            # Authorization 헤더에서 API 키 추출
            auth_header = request.headers.get("authorization")
            if not auth_header or not auth_header.startswith("Bearer "):
                return None
            
            api_key = auth_header.split(" ")[1]
            
            # API 키로 사용자 조회 (개별 사용자 API 키)
            db_api_key = db.query(ApiKey).filter(
                ApiKey.key_hash == api_key,  # 실제로는 해시된 키와 비교해야 함
                ApiKey.is_active == True
            ).first()
            
            if db_api_key and db_api_key.user_id:
                user = db.query(User).filter(User.id == db_api_key.user_id).first()
                if user:
                    # Request state에 사용자 및 API 키 정보 저장
                    request.state.user = user
                    request.state.api_key = db_api_key
                    self.logger.info(f"API key authentication successful for user {user.id}")
                    return user
                    
        except Exception as e:
            self.logger.debug(f"API key authentication failed: {e}")
        
        return None
    
    def verify_project_access(self, user: User, project_id: str, db: Session) -> Project:
        """프로젝트 접근 권한 확인"""
        return get_project_and_verify_access(project_id, user, db)
    
    def verify_server_access(self, user: User, project_id: str, server_name: str, db: Session) -> McpServer:
        """서버 접근 권한 확인"""
        # 프로젝트 접근 권한 먼저 확인
        project = self.verify_project_access(user, project_id, db)
        
        # 서버 존재 확인
        server = db.query(McpServer).filter(
            and_(
                McpServer.project_id == project.id,
                McpServer.name == server_name
            )
        ).first()
        
        if not server:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Server '{server_name}' not found in project"
            )
        
        return server
    
    def check_authentication_requirement(self, server: McpServer, project: Project) -> bool:
        """서버별 인증 요구사항 확인"""
        # 서버별 JWT 인증 설정 확인
        jwt_auth_required = server.get_effective_jwt_auth_required()
        
        if jwt_auth_required is True:
            return True
        elif jwt_auth_required is False:
            return False
        else:
            # 프로젝트 기본 설정 사용
            return getattr(project, 'jwt_auth_required', True)
    
    async def authenticate_for_server(
        self, 
        request: Request, 
        project_id: str, 
        server_name: str, 
        db: Session
    ) -> tuple[User, Project, McpServer]:
        """특정 서버에 대한 전체 인증 처리"""
        # 사용자 인증
        user = await self.authenticate_request(request, db)
        
        # 서버 접근 권한 확인
        server = self.verify_server_access(user, project_id, server_name, db)
        project = server.project
        
        # 서버별 인증 요구사항 확인
        auth_required = self.check_authentication_requirement(server, project)
        
        if auth_required and not user:
            raise McpAuthenticationError(f"Authentication required for server '{server_name}'")
        
        self.logger.info(f"Authentication successful for user {user.id} on server {server_name}")
        return user, project, server
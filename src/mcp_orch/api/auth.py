"""
Authentication middleware for MCP Orchestrator API
"""
import os
import logging
from typing import Optional
from fastapi import HTTPException, Request, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from starlette.responses import JSONResponse

logger = logging.getLogger(__name__)

# Bearer token security scheme
security = HTTPBearer(auto_error=False)

class AuthMiddleware:
    """Authentication middleware for API requests"""
    
    def __init__(self, app):
        self.app = app
        # Get API token from environment variable
        self.api_token = os.getenv("MCP_ORCH_API_TOKEN")
        # 디버깅용 - 프로덕션에서는 제거해야 함
        logger.info(f"AuthMiddleware initialized with token: {'*' * len(self.api_token) if self.api_token else 'None'} (length: {len(self.api_token) if self.api_token else 0})")
        logger.debug(f"DEBUG - Actual token: {self.api_token}")  # 디버깅용
        # List of paths that don't require authentication
        self.public_paths = [
            "/status",
            "/docs",
            "/openapi.json",
            "/redoc",
        ]
    
    def is_public_path(self, path: str) -> bool:
        """Check if the path is public (doesn't require auth)"""
        # SSE endpoints for MCP clients should not require auth
        # as they use their own authentication mechanism
        if path.startswith("/servers/") and path.endswith("/sse"):
            return True
        
        # Check exact matches and prefixes
        for public_path in self.public_paths:
            if path == public_path or path.startswith(public_path + "/"):
                return True
        
        return False
    
    async def __call__(self, scope, receive, send):
        """Process the request and check authentication"""
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return
            
        request = Request(scope, receive)
        path = request.url.path
        logger.debug(f"AuthMiddleware processing request: {path}")
        
        # Skip auth for public paths
        if self.is_public_path(path):
            logger.debug(f"Path {path} is public, skipping auth")
            await self.app(scope, receive, send)
            return
        
        # If no token is configured, allow all requests (backward compatibility)
        if not self.api_token:
            logger.debug("No API token configured, allowing request")
            await self.app(scope, receive, send)
            return
        
        # Check for Authorization header
        auth_header = request.headers.get("Authorization")
        if not auth_header:
            logger.warning(f"Authorization header missing for path: {path}")
            response = JSONResponse(
                status_code=status.HTTP_401_UNAUTHORIZED,
                content={"detail": "Authorization header missing"},
                headers={"WWW-Authenticate": "Bearer"},
            )
            await response(scope, receive, send)
            return
        
        # Validate Bearer token
        try:
            scheme, token = auth_header.split(" ", 1)
            if scheme.lower() != "bearer":
                raise ValueError("Invalid authentication scheme")
            
            if token != self.api_token:
                logger.warning(f"Invalid token provided for path: {path}")
                raise ValueError("Invalid token")
                
        except (ValueError, AttributeError) as e:
            logger.warning(f"Authentication failed for path {path}: {str(e)}")
            response = JSONResponse(
                status_code=status.HTTP_401_UNAUTHORIZED,
                content={"detail": "Invalid authentication credentials"},
                headers={"WWW-Authenticate": "Bearer"},
            )
            await response(scope, receive, send)
            return
        
        # Authentication successful, proceed with request
        logger.debug(f"Authentication successful for path: {path}")
        await self.app(scope, receive, send)

def verify_token(credentials: Optional[HTTPAuthorizationCredentials] = None) -> bool:
    """Verify Bearer token for FastAPI dependency injection"""
    if not credentials:
        return False
    
    api_token = os.getenv("MCP_ORCH_API_TOKEN")
    if not api_token:
        # No token configured, allow access
        return True
    
    return credentials.credentials == api_token

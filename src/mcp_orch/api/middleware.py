"""
API 미들웨어

인증, 로깅 등의 미들웨어 구현
"""

import logging
import time
from typing import Callable

from fastapi import Request, Response, HTTPException
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import Response as StarletteResponse
from starlette.status import HTTP_204_NO_CONTENT

from ..config import Settings

logger = logging.getLogger(__name__)


class LoggingMiddleware(BaseHTTPMiddleware):
    """
    로깅 미들웨어
    
    요청/응답 로깅을 처리합니다.
    """
    
    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        """요청 처리"""
        start_time = time.time()
        
        # 요청 로깅
        logger.info(
            f"Request: {request.method} {request.url.path} "
            f"from {request.client.host if request.client else 'unknown'}"
        )
        
        # 요청 처리
        response = await call_next(request)
        
        # 응답 로깅
        process_time = time.time() - start_time
        logger.info(
            f"Response: {response.status_code} "
            f"({process_time:.3f}s)"
        )
        
        # 응답 헤더에 처리 시간 추가
        response.headers["X-Process-Time"] = str(process_time)
        
        return response


class RateLimitMiddleware(BaseHTTPMiddleware):
    """
    속도 제한 미들웨어
    
    API 호출 속도를 제한합니다.
    """
    
    def __init__(self, app, requests_per_minute: int = 60):
        super().__init__(app)
        self.requests_per_minute = requests_per_minute
        self.request_counts = {}
        
    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        """요청 처리"""
        # 클라이언트 IP 가져오기
        client_ip = request.client.host if request.client else "unknown"
        
        # 현재 분 가져오기
        current_minute = int(time.time() / 60)
        
        # 요청 카운트 키
        key = f"{client_ip}:{current_minute}"
        
        # 요청 카운트 증가
        if key not in self.request_counts:
            self.request_counts[key] = 0
        self.request_counts[key] += 1
        
        # 오래된 카운트 정리
        self._cleanup_old_counts(current_minute)
        
        # 속도 제한 확인
        if self.request_counts[key] > self.requests_per_minute:
            return JSONResponse(
                status_code=429,
                content={
                    "error": "Rate limit exceeded",
                    "retry_after": 60
                },
                headers={
                    "Retry-After": "60"
                }
            )
            
        # 요청 처리
        response = await call_next(request)
        
        # 남은 요청 수 헤더 추가
        remaining = self.requests_per_minute - self.request_counts[key]
        response.headers["X-RateLimit-Limit"] = str(self.requests_per_minute)
        response.headers["X-RateLimit-Remaining"] = str(remaining)
        response.headers["X-RateLimit-Reset"] = str((current_minute + 1) * 60)
        
        return response
        
    def _cleanup_old_counts(self, current_minute: int):
        """오래된 카운트 정리"""
        # 2분 이상 된 카운트 제거
        old_keys = [
            key for key in self.request_counts
            if int(key.split(":")[1]) < current_minute - 1
        ]
        for key in old_keys:
            del self.request_counts[key]


class JWTAuthMiddleware(BaseHTTPMiddleware):
    """
    JWT 인증 미들웨어
    
    요청 헤더에서 JWT 토큰을 추출하고 검증합니다.
    """
    
    def __init__(self, app):
        super().__init__(app)
        # JWT 기능이 필요할 때만 import
        try:
            from ..utils import verify_jwt_token
            self.verify_jwt_token = verify_jwt_token
        except ImportError:
            logger.warning("JWT utility functions not available. JWT authentication disabled.")
            self.verify_jwt_token = None
    
    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        """요청 처리"""
        # JWT 검증 기능이 없으면 인증 없이 통과
        if self.verify_jwt_token is None:
            logger.warning("JWT authentication skipped - verify_jwt_token not available")
            return await call_next(request)
            
        # 인증 헤더 가져오기
        auth_header = request.headers.get("Authorization")
        
        # 인증 헤더가 없으면 401 Unauthorized 반환
        if not auth_header:
            raise HTTPException(status_code=401, detail="Unauthorized")
        
        # Bearer 토큰 추출
        token = auth_header.split(" ")[1]
        
        # 토큰 검증
        user_info = self.verify_jwt_token(token)
        
        # 사용자 정보를 요청 객체에 추가
        request.state.user = user_info
        
        # 요청 처리
        response = await call_next(request)
        
        return response


class SuppressNoResponseReturnedMiddleware(BaseHTTPMiddleware):
    """
    SSE 연결 해제 시 발생하는 오류 처리 미들웨어
    
    SSE 엔드포인트에서 클라이언트가 연결을 해제할 때 발생하는
    AssertionError와 RuntimeError를 처리합니다.
    """
    
    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        """요청 처리"""
        try:
            return await call_next(request)
        except (RuntimeError, AssertionError) as exc:
            # "No response returned" 오류 또는 BaseMiddleware assertion 오류 처리
            if (str(exc) == 'No response returned.' or 
                'http.response.body' in str(exc)) and await request.is_disconnected():
                logger.debug(f"Client disconnected during SSE stream: {exc}")
                return StarletteResponse(status_code=HTTP_204_NO_CONTENT)
            raise

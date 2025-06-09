"""
API 미들웨어

인증, 로깅 등의 미들웨어 구현
"""

import logging
import time
from typing import Callable

from fastapi import Request, Response
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware

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
        
        # 현재 시간 (분 단위)
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

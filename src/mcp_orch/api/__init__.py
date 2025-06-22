"""
REST API 모듈

FastAPI를 사용한 REST API 엔드포인트 구현
"""

from .app import create_app

__all__ = ["create_app"]

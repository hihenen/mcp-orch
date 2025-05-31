"""
배치(병렬화) 모드 구현

LLM과 협력하여 작업을 자동으로 병렬 처리하는 기능
"""

from .handler import BatchHandler

__all__ = ["BatchHandler"]

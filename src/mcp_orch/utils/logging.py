"""
로깅 유틸리티 모듈

JSON 포맷 로깅과 구조화된 로그 출력을 지원합니다.
"""

import json
import logging
import os
import sys
from datetime import datetime
from typing import Any, Dict, Optional
from pythonjsonlogger import jsonlogger


class JSONFormatter(jsonlogger.JsonFormatter):
    """JSON 로그 포맷터
    
    구조화된 JSON 형태로 로그를 출력합니다.
    timestamp, level, logger, message, 추가 필드들을 포함합니다.
    """
    
    def add_fields(self, log_record: Dict[str, Any], record: logging.LogRecord, message_dict: Dict[str, Any]) -> None:
        """로그 레코드에 추가 필드를 포함합니다."""
        super().add_fields(log_record, record, message_dict)
        
        # 기본 필드 추가
        log_record['timestamp'] = datetime.utcnow().isoformat() + 'Z'
        log_record['level'] = record.levelname
        log_record['logger'] = record.name
        
        # 추가 컨텍스트 정보
        if hasattr(record, 'user_id'):
            log_record['user_id'] = record.user_id
        if hasattr(record, 'project_id'):
            log_record['project_id'] = record.project_id
        if hasattr(record, 'request_id'):
            log_record['request_id'] = record.request_id
        if hasattr(record, 'mcp_server'):
            log_record['mcp_server'] = record.mcp_server


class ContextFilter(logging.Filter):
    """로그 컨텍스트 필터
    
    요청별 컨텍스트 정보를 로그에 추가합니다.
    """
    
    def filter(self, record: logging.LogRecord) -> bool:
        """로그 레코드에 컨텍스트 정보를 추가합니다."""
        # 기본값 설정
        if not hasattr(record, 'user_id'):
            record.user_id = None
        if not hasattr(record, 'project_id'):
            record.project_id = None
        if not hasattr(record, 'request_id'):
            record.request_id = None
        if not hasattr(record, 'mcp_server'):
            record.mcp_server = None
            
        return True


def setup_logging(
    level: str = "INFO",
    format_type: str = "text",
    output: str = "console",
    file_path: Optional[str] = None
) -> None:
    """로깅 시스템을 설정합니다.
    
    Args:
        level: 로그 레벨 (DEBUG, INFO, WARNING, ERROR, CRITICAL)
        format_type: 로그 포맷 ("text" 또는 "json")
        output: 출력 방식 ("console", "file", "both")
        file_path: 파일 출력 시 파일 경로
    """
    
    # 로그 레벨 설정
    log_level = getattr(logging, level.upper(), logging.INFO)
    
    # 루트 로거 설정
    root_logger = logging.getLogger()
    root_logger.setLevel(log_level)
    
    # 기존 핸들러 제거
    for handler in root_logger.handlers[:]:
        root_logger.removeHandler(handler)
    
    # 컨텍스트 필터 추가
    context_filter = ContextFilter()
    
    # 포맷터 설정
    if format_type.lower() == "json":
        formatter = JSONFormatter(
            fmt='%(timestamp)s %(level)s %(logger)s %(message)s'
        )
    else:
        formatter = logging.Formatter(
            fmt='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
            datefmt='%Y-%m-%d %H:%M:%S'
        )
    
    # 콘솔 핸들러
    if output in ["console", "both"]:
        console_handler = logging.StreamHandler(sys.stdout)
        console_handler.setLevel(log_level)
        console_handler.setFormatter(formatter)
        console_handler.addFilter(context_filter)
        root_logger.addHandler(console_handler)
    
    # 파일 핸들러
    if output in ["file", "both"] and file_path:
        # 디렉토리 생성
        os.makedirs(os.path.dirname(file_path), exist_ok=True)
        
        file_handler = logging.FileHandler(file_path)
        file_handler.setLevel(log_level)
        file_handler.setFormatter(formatter)
        file_handler.addFilter(context_filter)
        root_logger.addHandler(file_handler)


def get_logger(name: str) -> logging.Logger:
    """로거 인스턴스를 반환합니다.
    
    Args:
        name: 로거 이름 (일반적으로 __name__ 사용)
        
    Returns:
        설정된 로거 인스턴스
    """
    return logging.getLogger(name)


class LogContext:
    """로그 컨텍스트 매니저
    
    특정 범위에서 로그에 컨텍스트 정보를 추가합니다.
    """
    
    def __init__(self, **context):
        """컨텍스트 정보를 초기화합니다."""
        self.context = context
        self.old_factory = None
    
    def __enter__(self):
        """컨텍스트 매니저 시작"""
        self.old_factory = logging.getLogRecordFactory()
        
        def record_factory(*args, **kwargs):
            record = self.old_factory(*args, **kwargs)
            for key, value in self.context.items():
                setattr(record, key, value)
            return record
            
        logging.setLogRecordFactory(record_factory)
        return self
    
    def __exit__(self, exc_type, exc_val, exc_tb):
        """컨텍스트 매니저 종료"""
        logging.setLogRecordFactory(self.old_factory)


# 편의 함수들
def log_with_context(logger: logging.Logger, level: int, message: str, **context):
    """컨텍스트 정보와 함께 로그를 출력합니다."""
    with LogContext(**context):
        logger.log(level, message)


def log_user_action(logger: logging.Logger, user_id: str, action: str, **extra):
    """사용자 액션을 로깅합니다."""
    context = {"user_id": user_id, "action": action}
    context.update(extra)
    with LogContext(**context):
        logger.info(f"User action: {action}")


def log_mcp_server_event(logger: logging.Logger, server_name: str, event: str, **extra):
    """MCP 서버 이벤트를 로깅합니다."""
    context = {"mcp_server": server_name, "event": event}
    context.update(extra)
    with LogContext(**context):
        logger.info(f"MCP server event: {event}")


def log_api_request(logger: logging.Logger, method: str, path: str, user_id: Optional[str] = None, **extra):
    """API 요청을 로깅합니다."""
    context = {"method": method, "path": path, "api_request": True}
    if user_id:
        context["user_id"] = user_id
    context.update(extra)
    with LogContext(**context):
        logger.info(f"{method} {path}")
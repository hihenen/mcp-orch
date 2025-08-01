"""
Unified MCP Server 네임스페이스 관리
툴명 네임스페이싱 및 라우팅을 위한 유틸리티
"""

import re
import logging
from typing import Dict, List, Optional, Tuple

logger = logging.getLogger(__name__)

# ============================================================================
# 전역 네임스페이스 구분자 설정
# ============================================================================
# 이 값만 변경하면 전체 시스템의 구분자가 바뀝니다.
# 예: "." → "_" 또는 ":" 등으로 변경 가능
NAMESPACE_SEPARATOR = "."

# ============================================================================
# 간소화된 네임스페이스 유틸리티
# ============================================================================

def create_namespaced_name(server_name: str, tool_name: str) -> str:
    """네임스페이스 툴명 생성"""
    safe_server_name = _sanitize_server_name(server_name)
    namespaced_name = f"{safe_server_name}{NAMESPACE_SEPARATOR}{tool_name}"
    logger.debug(f"Created namespaced tool: '{tool_name}' → '{namespaced_name}'")
    return namespaced_name


def parse_namespaced_name(namespaced_name: str) -> Tuple[str, str]:
    """네임스페이스 툴명 파싱"""
    if NAMESPACE_SEPARATOR not in namespaced_name:
        raise ValueError(f"Invalid namespaced tool name: '{namespaced_name}' (missing separator '{NAMESPACE_SEPARATOR}')")
    
    parts = namespaced_name.split(NAMESPACE_SEPARATOR, 1)
    server_name, tool_name = parts[0], parts[1]
    
    logger.debug(f"Parsed namespaced tool: '{namespaced_name}' → server='{server_name}', tool='{tool_name}'")
    return server_name, tool_name


def is_namespaced(tool_name: str) -> bool:
    """툴명이 네임스페이스를 포함하는지 확인"""
    return NAMESPACE_SEPARATOR in tool_name


def _sanitize_server_name(server_name: str) -> str:
    """서버명 안전화 (구분자 충돌 방지)"""
    # 1. 구분자가 포함된 경우 언더스코어로 변환
    if NAMESPACE_SEPARATOR in server_name:
        sanitized = server_name.replace(NAMESPACE_SEPARATOR, "_")
        logger.info(f"Server name escaped: '{server_name}' → '{sanitized}' (separator: '{NAMESPACE_SEPARATOR}')")
    else:
        sanitized = server_name
    
    # 2. 추가 안전화: 특수문자 제거/변환
    sanitized = re.sub(r'[^\w\-]', '_', sanitized)
    
    # 3. 연속된 언더스코어 정리
    sanitized = re.sub(r'_+', '_', sanitized)
    
    # 4. 앞뒤 언더스코어 제거
    sanitized = sanitized.strip('_')
    
    if sanitized != server_name:
        logger.info(f"Server name sanitized: '{server_name}' → '{sanitized}'")
    
    return sanitized


# ============================================================================
# 네임스페이스 충돌 방지 및 관리
# ============================================================================

class NamespaceRegistry:
    """네임스페이스 충돌 방지 및 관리"""
    
    def __init__(self):
        self.registered_servers: Dict[str, str] = {}  # sanitized_name -> original_name
        self.collision_counter: Dict[str, int] = {}
    
    def register_server(self, original_name: str) -> str:
        """서버를 등록하고 고유한 네임스페이스명 반환"""
        sanitized_name = _sanitize_server_name(original_name)
        
        # 충돌 검사
        if sanitized_name in self.registered_servers:
            # 충돌 발생 - 번호 추가
            counter = self.collision_counter.get(sanitized_name, 1)
            self.collision_counter[sanitized_name] = counter + 1
            
            unique_name = f"{sanitized_name}_{counter}"
            logger.warning(f"Server name collision resolved: '{original_name}' → '{unique_name}'")
            
            self.registered_servers[unique_name] = original_name
            return unique_name
        else:
            # 충돌 없음
            self.registered_servers[sanitized_name] = original_name
            return sanitized_name
    
    def get_original_name(self, namespace_name: str) -> Optional[str]:
        """네임스페이스명에서 원본 서버명 반환"""
        return self.registered_servers.get(namespace_name)
    
    def get_all_mappings(self) -> Dict[str, str]:
        """모든 네임스페이스 매핑 반환"""
        return self.registered_servers.copy()
    
    def clear(self):
        """등록된 서버 정보 초기화"""
        self.registered_servers.clear()
        self.collision_counter.clear()


# ============================================================================
# 하위 호환성을 위한 클래스 (기존 코드 지원)
# ============================================================================

class UnifiedToolNaming:
    """
    하위 호환성을 위한 클래스
    기존 코드가 이 클래스를 사용하는 경우를 위해 유지
    """
    
    def __init__(self, separator: str = None):
        """생성자 - separator 파라미터는 무시하고 전역 상수 사용"""
        if separator and separator != NAMESPACE_SEPARATOR:
            logger.warning(f"Separator parameter '{separator}' ignored, using global '{NAMESPACE_SEPARATOR}'")
        self.separator = NAMESPACE_SEPARATOR
        logger.info(f"UnifiedToolNaming initialized with global separator: '{NAMESPACE_SEPARATOR}'")
    
    def create_namespaced_name(self, server_name: str, tool_name: str) -> str:
        return create_namespaced_name(server_name, tool_name)
    
    def parse_namespaced_name(self, namespaced_name: str) -> Tuple[str, str]:
        return parse_namespaced_name(namespaced_name)
    
    def parse_tool_name(self, namespaced_name: str) -> Tuple[str, str]:
        """하위 호환성을 위한 메서드 - parse_namespaced_name과 동일"""
        return self.parse_namespaced_name(namespaced_name)
    
    def is_namespaced(self, tool_name: str) -> bool:
        return is_namespaced(tool_name)
    
    
    def _sanitize_server_name(self, server_name: str) -> str:
        return _sanitize_server_name(server_name)
#!/usr/bin/env python3
"""도구 이름 검증 테스트"""

import asyncio
import re
import logging
from mcp_orch.core.controller import DualModeController
from mcp_orch.config import Settings

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# MCP 도구 이름 패턴
TOOL_NAME_PATTERN = re.compile(r'^[a-zA-Z0-9_-]{1,64}$')

async def test_tool_names():
    """도구 이름 검증"""
    # 설정 로드
    settings = Settings()
    
    # 컨트롤러 생성
    controller = DualModeController(settings)
    await controller.initialize()
    
    # 모든 서버의 도구 목록 확인
    servers_response = await controller.handle_request({
        "type": "list_servers"
    })
    
    servers = servers_response.get("servers", [])
    
    for server in servers:
        server_name = server["name"]
        logger.info(f"\n=== Server: {server_name} ===")
        
        # 도구 목록 조회
        tools_response = await controller.handle_request({
            "type": "list_tools",
            "server_name": server_name
        })
        
        tools = tools_response.get("tools", [])
        
        for tool in tools:
            namespace = tool.get("namespace", "")
            # 네임스페이스에서 도구 이름 추출
            if "." in namespace:
                tool_name = namespace.split(".", 1)[1]
            else:
                tool_name = namespace
            
            # 패턴 검증
            is_valid = TOOL_NAME_PATTERN.match(tool_name) is not None
            
            logger.info(f"Tool: {tool_name}")
            logger.info(f"  Namespace: {namespace}")
            logger.info(f"  Valid: {is_valid}")
            
            if not is_valid:
                logger.error(f"  ❌ Invalid tool name! Must match pattern: ^[a-zA-Z0-9_-]{{1,64}}$")
                # 어떤 문자가 문제인지 확인
                invalid_chars = [c for c in tool_name if not re.match(r'[a-zA-Z0-9_-]', c)]
                if invalid_chars:
                    logger.error(f"  Invalid characters: {invalid_chars}")
                if len(tool_name) > 64:
                    logger.error(f"  Name too long: {len(tool_name)} > 64")
    
    await controller.shutdown()

if __name__ == "__main__":
    asyncio.run(test_tool_names())

"""
MCP Orch 통합 테스트

전체 시스템을 테스트합니다.
"""

import asyncio
import json
import logging
import sys
from pathlib import Path

# 프로젝트 경로 추가
sys.path.insert(0, str(Path(__file__).parent / "src"))

from mcp_orch.config import Settings
from mcp_orch.core.controller import DualModeController

# 로깅 설정
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


async def test_integration():
    """통합 테스트"""
    
    # 설정 생성
    settings = Settings(
        mcp_config_file="mcp-config.json",
        server__mode="proxy",
        server__port=8000
    )
    
    # 컨트롤러 생성
    controller = DualModeController(settings)
    
    try:
        # 컨트롤러 초기화
        logger.info("=== Initializing Controller ===")
        await controller.initialize()
        
        # 상태 확인
        status = await controller.get_status()
        logger.info(f"Controller Status: {json.dumps(status, indent=2)}")
        
        # 도구 목록 조회
        logger.info("\n=== Listing Tools ===")
        tools_response = await controller.handle_request({
            "type": "list_tools"
        })
        
        if tools_response.get("status") == "success":
            tools = tools_response.get("tools", [])
            logger.info(f"Found {len(tools)} tools:")
            for tool in tools[:5]:  # 처음 5개만 표시
                logger.info(f"  - {tool['namespace']}: {tool.get('description', 'No description')[:50]}...")
        else:
            logger.error(f"Failed to list tools: {tools_response}")
            
        # 서버 목록 조회
        logger.info("\n=== Listing Servers ===")
        servers_response = await controller.handle_request({
            "type": "list_servers"
        })
        
        if servers_response.get("status") == "success":
            servers = servers_response.get("servers", [])
            logger.info(f"Found {len(servers)} servers:")
            for server in servers:
                logger.info(f"  - {server['name']}: Connected={server['connected']}, Tools={server['tools_count']}")
        else:
            logger.error(f"Failed to list servers: {servers_response}")
            
        # Brave Search 도구 테스트 (연결된 경우)
        logger.info("\n=== Testing Tool Call ===")
        brave_tools = [t for t in tools if "brave" in t["namespace"].lower()]
        
        if brave_tools:
            # brave_web_search 테스트
            search_tool = next((t for t in brave_tools if "web_search" in t["namespace"]), None)
            if search_tool:
                logger.info(f"Testing {search_tool['namespace']}...")
                
                tool_response = await controller.handle_request({
                    "type": "call_tool",
                    "namespace": search_tool["namespace"],
                    "arguments": {
                        "query": "MCP protocol",
                        "count": 3
                    }
                })
                
                if tool_response.get("status") == "success":
                    logger.info("Tool call successful!")
                    result = tool_response.get("result", {})
                    
                    # 결과 파싱 시도
                    if isinstance(result, list) and len(result) > 0:
                        for item in result:
                            if "content" in item:
                                content = item["content"]
                                if isinstance(content, list):
                                    for content_item in content:
                                        if content_item.get("type") == "text":
                                            try:
                                                search_data = json.loads(content_item.get("text", "{}"))
                                                if "results" in search_data:
                                                    logger.info(f"Found {len(search_data['results'])} search results")
                                                    for idx, res in enumerate(search_data["results"][:3]):
                                                        logger.info(f"\n{idx + 1}. {res.get('title', 'No title')}")
                                                        logger.info(f"   URL: {res.get('url', 'No URL')}")
                                            except json.JSONDecodeError:
                                                logger.info("Could not parse search results")
                else:
                    logger.error(f"Tool call failed: {tool_response}")
        else:
            logger.warning("No Brave Search tools found")
            
        # 설정 리로드 테스트
        logger.info("\n=== Testing Configuration Reload ===")
        reload_response = await controller.reload_configuration()
        logger.info(f"Reload response: {json.dumps(reload_response, indent=2)}")
        
    except Exception as e:
        logger.error(f"Test failed: {e}", exc_info=True)
        
    finally:
        # 컨트롤러 종료
        logger.info("\n=== Shutting Down ===")
        await controller.shutdown()
        logger.info("Test complete!")


async def main():
    """메인 함수"""
    logger.info("=== MCP Orch Integration Test ===")
    await test_integration()


if __name__ == "__main__":
    asyncio.run(main())

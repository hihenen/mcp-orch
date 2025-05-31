"""
MCP 서버 연결 테스트 스크립트

Brave Search MCP 서버와의 연결을 테스트합니다.
"""

import asyncio
import json
import logging
from pathlib import Path

# 로깅 설정
logging.basicConfig(
    level=logging.DEBUG,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# 프로젝트 경로 설정
import sys
sys.path.insert(0, str(Path(__file__).parent / "src"))

from mcp_orch.config_parser import ConfigParser
from mcp_orch.core.adapter import ProtocolAdapter


async def test_mcp_connection():
    """MCP 서버 연결 테스트"""
    
    # 1. 설정 파일 로드
    logger.info("Loading configuration...")
    config_parser = ConfigParser("mcp-config.json")
    config = config_parser.load()
    
    # Brave Search 서버 설정 확인
    brave_config = config.servers.get("brave-search")
    if not brave_config:
        logger.error("Brave Search server not found in configuration")
        return
        
    logger.info(f"Found Brave Search configuration: {brave_config.name}")
    
    # 2. 프로토콜 어댑터 생성
    logger.info("Creating protocol adapter...")
    adapter = ProtocolAdapter()
    
    # 3. MCP 서버 연결
    logger.info("Connecting to Brave Search MCP server...")
    try:
        # 서버 프로세스 시작
        process = await adapter.start_server(
            command=brave_config.command,
            args=brave_config.args,
            env=brave_config.env
        )
        
        logger.info("Server process started successfully")
        
        # 초기화 메시지 전송
        init_request = {
            "jsonrpc": "2.0",
            "method": "initialize",
            "params": {
                "protocolVersion": "0.1.0",
                "capabilities": {}
            },
            "id": 1
        }
        
        logger.info("Sending initialize request...")
        response = await adapter.send_request(init_request)
        logger.info(f"Initialize response: {json.dumps(response, indent=2)}")
        
        # 도구 목록 조회
        tools_request = {
            "jsonrpc": "2.0",
            "method": "tools/list",
            "params": {},
            "id": 2
        }
        
        logger.info("Requesting tools list...")
        tools_response = await adapter.send_request(tools_request)
        logger.info(f"Tools response: {json.dumps(tools_response, indent=2)}")
        
        # 도구 목록 파싱
        if "result" in tools_response and "tools" in tools_response["result"]:
            tools = tools_response["result"]["tools"]
            logger.info(f"\nFound {len(tools)} tools:")
            for tool in tools:
                logger.info(f"  - {tool['name']}: {tool.get('description', 'No description')}")
        
        # 간단한 검색 테스트
        if tools:
            search_request = {
                "jsonrpc": "2.0",
                "method": "tools/call",
                "params": {
                    "name": "brave_web_search",
                    "arguments": {
                        "query": "MCP protocol",
                        "count": 3
                    }
                },
                "id": 3
            }
            
            logger.info("\nTesting brave_web_search with query 'MCP protocol'...")
            search_response = await adapter.send_request(search_request)
            
            if "result" in search_response:
                logger.info("Search completed successfully!")
                # 결과 요약 출력
                result = search_response["result"]
                if isinstance(result, list) and len(result) > 0:
                    content = result[0].get("content", [])
                    if isinstance(content, list) and len(content) > 0:
                        text_content = content[0].get("text", "")
                        # JSON 파싱 시도
                        try:
                            search_data = json.loads(text_content)
                            if "results" in search_data:
                                logger.info(f"\nFound {len(search_data['results'])} search results:")
                                for idx, item in enumerate(search_data["results"][:3]):
                                    logger.info(f"\n{idx + 1}. {item.get('title', 'No title')}")
                                    logger.info(f"   URL: {item.get('url', 'No URL')}")
                                    logger.info(f"   Description: {item.get('description', 'No description')[:100]}...")
                        except json.JSONDecodeError:
                            logger.info(f"Raw response: {text_content[:200]}...")
            else:
                logger.error(f"Search failed: {search_response}")
        
        # 서버 종료
        logger.info("\nShutting down server...")
        await adapter.shutdown()
        logger.info("Server shutdown complete")
        
    except Exception as e:
        logger.error(f"Error during test: {e}", exc_info=True)
        await adapter.shutdown()


async def main():
    """메인 함수"""
    logger.info("=== MCP Connection Test ===")
    await test_mcp_connection()
    logger.info("=== Test Complete ===")


if __name__ == "__main__":
    asyncio.run(main())

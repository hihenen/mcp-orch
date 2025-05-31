"""
간단한 MCP 서버 연결 테스트

ProtocolAdapter를 사용하여 Brave Search MCP 서버와 연결합니다.
"""

import asyncio
import json
import logging
import os
import subprocess
from pathlib import Path

# 로깅 설정
logging.basicConfig(
    level=logging.DEBUG,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


async def test_brave_search():
    """Brave Search MCP 서버 테스트"""
    
    # 환경 변수 설정
    env = os.environ.copy()
    env["BRAVE_API_KEY"] = "BSAiFio-6UgIYNeno28H-8iPw_J-7iC"
    
    # 프로세스 시작
    cmd = ["npx", "-y", "@modelcontextprotocol/server-brave-search"]
    logger.info(f"Starting process: {' '.join(cmd)}")
    
    process = await asyncio.create_subprocess_exec(
        *cmd,
        stdin=asyncio.subprocess.PIPE,
        stdout=asyncio.subprocess.PIPE,
        stderr=asyncio.subprocess.PIPE,
        env=env
    )
    
    logger.info("Process started, waiting for initialization...")
    
    # 서버가 시작될 시간을 줌
    await asyncio.sleep(3)
    
    try:
        # 초기화 메시지
        init_msg = {
            "jsonrpc": "2.0",
            "method": "initialize",
            "params": {
                "protocolVersion": "0.1.0",
                "capabilities": {},
                "clientInfo": {
                    "name": "mcp-orch-test",
                    "version": "0.1.0"
                }
            },
            "id": 1
        }
        
        # 메시지 전송
        logger.info("Sending initialize message...")
        process.stdin.write((json.dumps(init_msg) + "\n").encode())
        await process.stdin.drain()
        
        # 응답 읽기
        response_line = await asyncio.wait_for(process.stdout.readline(), timeout=10)
        response = json.loads(response_line.decode())
        logger.info(f"Initialize response: {json.dumps(response, indent=2)}")
        
        # 도구 목록 요청
        tools_msg = {
            "jsonrpc": "2.0",
            "method": "tools/list",
            "params": {},
            "id": 2
        }
        
        logger.info("Requesting tools list...")
        process.stdin.write((json.dumps(tools_msg) + "\n").encode())
        await process.stdin.drain()
        
        # 응답 읽기
        response_line = await asyncio.wait_for(process.stdout.readline(), timeout=10)
        response = json.loads(response_line.decode())
        logger.info(f"Tools response: {json.dumps(response, indent=2)}")
        
        # 도구 목록 확인
        if "result" in response and "tools" in response["result"]:
            tools = response["result"]["tools"]
            logger.info(f"\nFound {len(tools)} tools:")
            for tool in tools:
                logger.info(f"  - {tool['name']}: {tool.get('description', 'No description')}")
                
            # 검색 테스트
            if any(tool["name"] == "brave_web_search" for tool in tools):
                search_msg = {
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
                
                logger.info("\nTesting brave_web_search...")
                process.stdin.write((json.dumps(search_msg) + "\n").encode())
                await process.stdin.drain()
                
                # 응답 읽기
                response_line = await asyncio.wait_for(process.stdout.readline(), timeout=30)
                response = json.loads(response_line.decode())
                
                if "result" in response:
                    logger.info("Search completed successfully!")
                    # 결과 파싱
                    result = response["result"]
                    logger.debug(f"Raw result type: {type(result)}")
                    logger.debug(f"Raw result: {json.dumps(result, indent=2)[:500]}...")
                    
                    if isinstance(result, list) and len(result) > 0:
                        for item in result:
                            if "content" in item:
                                content = item["content"]
                                if isinstance(content, list):
                                    for content_item in content:
                                        if content_item.get("type") == "text":
                                            text_content = content_item.get("text", "")
                                            try:
                                                search_data = json.loads(text_content)
                                                if "results" in search_data:
                                                    logger.info(f"\nFound {len(search_data['results'])} search results:")
                                                    for idx, search_item in enumerate(search_data["results"][:3]):
                                                        logger.info(f"\n{idx + 1}. {search_item.get('title', 'No title')}")
                                                        logger.info(f"   URL: {search_item.get('url', 'No URL')}")
                                                        desc = search_item.get('description', 'No description')
                                                        logger.info(f"   Description: {desc[:100]}..." if len(desc) > 100 else f"   Description: {desc}")
                                            except json.JSONDecodeError:
                                                logger.info(f"Raw text content: {text_content[:200]}...")
                else:
                    logger.error(f"Search failed: {response}")
        
    except asyncio.TimeoutError:
        logger.error("Timeout waiting for response")
    except Exception as e:
        logger.error(f"Error: {e}", exc_info=True)
    finally:
        # 프로세스 종료
        logger.info("Terminating process...")
        process.terminate()
        await process.wait()
        logger.info("Process terminated")


async def main():
    """메인 함수"""
    logger.info("=== Simple MCP Connection Test ===")
    await test_brave_search()
    logger.info("=== Test Complete ===")


if __name__ == "__main__":
    asyncio.run(main())

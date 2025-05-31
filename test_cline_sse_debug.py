#!/usr/bin/env python3
"""Cline SSE 디버그 테스트"""

import asyncio
import httpx
import json
import logging

# 로깅 설정
logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)

async def test_cline_sse():
    """Cline 방식으로 SSE 테스트"""
    base_url = "http://localhost:8000"
    server_name = "brave-search"
    
    async with httpx.AsyncClient(timeout=30.0) as client:
        # SSE 연결
        logger.info(f"Connecting to SSE: {base_url}/sse/{server_name}")
        
        async with client.stream("GET", f"{base_url}/sse/{server_name}") as response:
            if response.status_code != 200:
                logger.error(f"SSE connection failed: {response.status_code}")
                return
            
            logger.info("SSE connected, reading events...")
            
            # 이벤트 읽기
            event_count = 0
            async for line in response.aiter_lines():
                if not line:
                    continue
                
                if line.startswith("event:"):
                    event_type = line[6:].strip()
                    logger.info(f"Event: {event_type}")
                elif line.startswith("data:"):
                    data = line[5:].strip()
                    try:
                        parsed = json.loads(data)
                        logger.info(f"Data: {json.dumps(parsed, indent=2)}")
                        
                        # 초기화 응답 확인
                        if parsed.get("id") == 1 and "result" in parsed:
                            logger.info("✅ Initialization response received!")
                            logger.info(f"Server: {parsed['result']['serverInfo']['name']}")
                            logger.info(f"Capabilities: {parsed['result']['capabilities']}")
                        
                        # 도구 목록 확인
                        elif parsed.get("id") == 2 and "result" in parsed:
                            tools = parsed["result"].get("tools", [])
                            logger.info(f"✅ Tools list received! Count: {len(tools)}")
                            for tool in tools:
                                logger.info(f"  - {tool['name']}: {tool.get('description', '')[:50]}...")
                        
                        event_count += 1
                        
                    except json.JSONDecodeError:
                        logger.debug(f"Non-JSON data: {data}")
                
                # 몇 개 이벤트만 읽고 종료
                if event_count >= 3:
                    break
            
            logger.info(f"Total events received: {event_count}")

async def test_post_message():
    """POST 메시지 테스트"""
    base_url = "http://localhost:8000"
    server_name = "brave-search"
    
    async with httpx.AsyncClient(timeout=30.0) as client:
        # 초기화 메시지 POST
        logger.info("Sending POST initialize message...")
        
        # Cline이 사용하는 잘못된 URL 패턴 테스트
        urls = [
            f"{base_url}/messages/{server_name}/",
            f"{base_url}/{server_name}messages/",  # Cline 버그
        ]
        
        for url in urls:
            logger.info(f"Testing URL: {url}")
            try:
                response = await client.post(
                    url,
                    json={
                        "jsonrpc": "2.0",
                        "id": 100,
                        "method": "initialize",
                        "params": {
                            "protocolVersion": "0.1.0",
                            "clientInfo": {
                                "name": "test-client",
                                "version": "1.0.0"
                            }
                        }
                    }
                )
                logger.info(f"Response: {response.status_code}")
                if response.status_code == 200:
                    logger.info(f"Response data: {response.json()}")
            except Exception as e:
                logger.error(f"Error: {e}")

async def main():
    """메인 함수"""
    print("=== Testing Cline SSE Debug ===")
    
    # SSE 테스트
    await test_cline_sse()
    
    print("\n=== Testing POST Messages ===")
    
    # POST 테스트
    await test_post_message()

if __name__ == "__main__":
    asyncio.run(main())

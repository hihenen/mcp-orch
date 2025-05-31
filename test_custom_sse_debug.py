#!/usr/bin/env python3
"""커스텀 SSE 연결 디버그 테스트"""

import asyncio
import httpx
import json
import logging

# 로깅 설정
logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)

async def test_custom_sse():
    """커스텀 SSE 연결 테스트"""
    url = "http://localhost:8000/sse/brave-search"
    
    async with httpx.AsyncClient(timeout=30.0) as client:
        try:
            logger.info(f"Connecting to {url}")
            
            # SSE 연결 시도
            async with client.stream("GET", url) as response:
                logger.info(f"Response status: {response.status_code}")
                logger.info(f"Response headers: {dict(response.headers)}")
                
                if response.status_code != 200:
                    content = await response.aread()
                    logger.error(f"Error response: {content}")
                    return
                
                # SSE 이벤트 읽기
                async for line in response.aiter_lines():
                    if not line:
                        continue
                        
                    logger.debug(f"Received line: {line}")
                    
                    if line.startswith("event:"):
                        event_type = line[6:].strip()
                        logger.info(f"Event type: {event_type}")
                    elif line.startswith("data:"):
                        data = line[5:].strip()
                        try:
                            parsed = json.loads(data)
                            logger.info(f"Data: {json.dumps(parsed, indent=2)}")
                        except:
                            logger.info(f"Raw data: {data}")
                    
        except Exception as e:
            logger.error(f"Connection error: {e}", exc_info=True)

async def test_post_message():
    """POST 메시지 테스트"""
    url = "http://localhost:8000/messages/brave-search/"
    
    # 초기화 요청
    init_request = {
        "jsonrpc": "2.0",
        "id": 1,
        "method": "initialize",
        "params": {
            "protocolVersion": "0.1.0",
            "clientInfo": {
                "name": "test-client",
                "version": "1.0.0"
            }
        }
    }
    
    async with httpx.AsyncClient() as client:
        try:
            logger.info(f"Sending POST to {url}")
            response = await client.post(url, json=init_request)
            logger.info(f"Response status: {response.status_code}")
            logger.info(f"Response: {response.json()}")
        except Exception as e:
            logger.error(f"POST error: {e}", exc_info=True)

async def main():
    """메인 함수"""
    print("=== Testing Custom SSE Connection ===")
    
    # SSE 연결 테스트
    await test_custom_sse()
    
    print("\n=== Testing POST Message ===")
    # POST 메시지 테스트
    await test_post_message()

if __name__ == "__main__":
    asyncio.run(main())

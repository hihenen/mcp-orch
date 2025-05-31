#!/usr/bin/env python3
"""MCP SDK 스타일 커스텀 SSE 테스트"""

import asyncio
import httpx
import json
import logging

# 로깅 설정
logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)

async def test_mcp_style_sse():
    """MCP SDK 스타일로 SSE 연결 테스트"""
    base_url = "http://localhost:8000"
    server_name = "brave-search"
    
    async with httpx.AsyncClient(timeout=30.0) as client:
        try:
            # 1. SSE 연결 열기
            logger.info(f"Opening SSE connection to {base_url}/sse/{server_name}")
            
            sse_connected = False
            messages_received = []
            
            async with client.stream("GET", f"{base_url}/sse/{server_name}") as sse_response:
                if sse_response.status_code != 200:
                    logger.error(f"SSE connection failed: {sse_response.status_code}")
                    return
                
                logger.info("SSE connection established")
                sse_connected = True
                
                # 2. 별도 태스크로 POST 메시지 전송
                async def send_messages():
                    await asyncio.sleep(0.5)  # SSE 연결이 준비될 때까지 대기
                    
                    # 초기화 메시지 전송
                    logger.info("Sending initialize message")
                    init_response = await client.post(
                        f"{base_url}/messages/{server_name}/",
                        json={
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
                    )
                    logger.info(f"Initialize response: {init_response.status_code} - {init_response.json()}")
                    
                    await asyncio.sleep(0.5)
                    
                    # 도구 목록 요청
                    logger.info("Sending tools/list message")
                    tools_response = await client.post(
                        f"{base_url}/messages/{server_name}/",
                        json={
                            "jsonrpc": "2.0",
                            "id": 2,
                            "method": "tools/list",
                            "params": {}
                        }
                    )
                    logger.info(f"Tools list response: {tools_response.status_code} - {tools_response.json()}")
                
                # POST 메시지 전송 태스크 시작
                send_task = asyncio.create_task(send_messages())
                
                # 3. SSE 이벤트 수신
                start_time = asyncio.get_event_loop().time()
                async for line in sse_response.aiter_lines():
                    if not line:
                        continue
                    
                    if line.startswith("event:"):
                        event_type = line[6:].strip()
                        logger.info(f"Event type: {event_type}")
                    elif line.startswith("data:"):
                        data = line[5:].strip()
                        try:
                            parsed = json.loads(data)
                            logger.info(f"Data: {json.dumps(parsed, indent=2)}")
                            
                            # message 이벤트만 수집
                            if "jsonrpc" in parsed:
                                messages_received.append(parsed)
                        except:
                            logger.debug(f"Raw data: {data}")
                    
                    # 5초 후 종료
                    if asyncio.get_event_loop().time() - start_time > 5:
                        break
                
                await send_task
                
        except Exception as e:
            logger.error(f"Test error: {e}", exc_info=True)
        
        # 결과 요약
        logger.info("\n=== Test Summary ===")
        logger.info(f"SSE Connected: {sse_connected}")
        logger.info(f"Messages Received: {len(messages_received)}")
        for i, msg in enumerate(messages_received):
            logger.info(f"Message {i+1}: {msg.get('id')} - {msg.get('result', msg.get('error'))}")

async def main():
    """메인 함수"""
    print("=== Testing MCP-style Custom SSE ===")
    await test_mcp_style_sse()

if __name__ == "__main__":
    asyncio.run(main())

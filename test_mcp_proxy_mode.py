#!/usr/bin/env python3
"""mcp-proxy 모드 테스트"""

import asyncio
import httpx
import json
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

async def test_mcp_proxy_mode():
    """mcp-proxy 모드 테스트"""
    base_url = "http://localhost:8000"
    
    # 1. 상태 확인
    async with httpx.AsyncClient() as client:
        response = await client.get(f"{base_url}/status")
        logger.info(f"Status: {response.json()}")
        
        # 2. 각 서버의 SSE 엔드포인트 확인
        servers = response.json().get("servers", {})
        
        for server_name in servers:
            sse_url = f"{base_url}/servers/{server_name}/sse"
            logger.info(f"\nTesting SSE endpoint: {sse_url}")
            
            # SSE 연결 테스트
            try:
                # 초기화 메시지 전송
                init_request = {
                    "jsonrpc": "2.0",
                    "method": "initialize",
                    "params": {
                        "protocolVersion": "0.1.0",
                        "clientInfo": {
                            "name": "test-client",
                            "version": "1.0.0"
                        }
                    },
                    "id": 1
                }
                
                # POST 메시지 엔드포인트
                messages_url = f"{base_url}/servers/{server_name}/messages/"
                
                response = await client.post(
                    messages_url,
                    json=init_request,
                    headers={"Content-Type": "application/json"}
                )
                
                logger.info(f"Initialize response: {response.status_code}")
                if response.status_code == 200:
                    logger.info(f"Response: {response.json()}")
                    
            except Exception as e:
                logger.error(f"Error testing {server_name}: {e}")

if __name__ == "__main__":
    asyncio.run(test_mcp_proxy_mode())

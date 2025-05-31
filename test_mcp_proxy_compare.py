#!/usr/bin/env python3
"""mcp-proxy와 mcp-orch 응답 비교"""

import asyncio
import httpx
import json
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

async def test_mcp_proxy():
    """mcp-proxy SSE 테스트"""
    logger.info("=== Testing mcp-proxy ===")
    
    async with httpx.AsyncClient(timeout=30.0) as client:
        async with client.stream("GET", "http://localhost:8001/servers/brave/sse") as response:
            if response.status_code != 200:
                logger.error(f"Failed to connect: {response.status_code}")
                return
            
            logger.info("Connected to mcp-proxy")
            event_count = 0
            
            async for line in response.aiter_lines():
                if not line:
                    continue
                
                if line.startswith("event:"):
                    logger.info(f"Event: {line}")
                elif line.startswith("data:"):
                    logger.info(f"Data: {line}")
                    event_count += 1
                
                if event_count >= 5:  # 처음 몇 개만
                    break

async def test_mcp_orch():
    """mcp-orch SSE 테스트"""
    logger.info("\n=== Testing mcp-orch ===")
    
    async with httpx.AsyncClient(timeout=30.0) as client:
        async with client.stream("GET", "http://localhost:8000/sse/brave-search") as response:
            if response.status_code != 200:
                logger.error(f"Failed to connect: {response.status_code}")
                return
            
            logger.info("Connected to mcp-orch")
            event_count = 0
            
            async for line in response.aiter_lines():
                if not line:
                    continue
                
                if line.startswith("event:"):
                    logger.info(f"Event: {line}")
                elif line.startswith("data:"):
                    logger.info(f"Data: {line}")
                    event_count += 1
                
                if event_count >= 5:  # 처음 몇 개만
                    break

async def main():
    """메인 함수"""
    # mcp-proxy가 실행 중이라고 가정
    await test_mcp_proxy()
    
    # mcp-orch 테스트
    await test_mcp_orch()

if __name__ == "__main__":
    asyncio.run(main())

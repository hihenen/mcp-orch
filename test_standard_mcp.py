#!/usr/bin/env python3
"""
표준 MCP 프로토콜 구현 테스트
기존 커스텀 SSE에서 표준 MCP SSE로 전환 확인
"""

import asyncio
import json
import logging
import aiohttp
from typing import Dict, Any

# 로깅 설정
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# 테스트 설정
BASE_URL = "http://localhost:8000"
PROJECT_ID = "c41aa472-15c3-4336-bcf8-21b464253d62"
SERVER_NAME = "brave-search"
API_KEY = "project_7xXZb_tq_QreIJ3CB2wvWRpklyOmsGSGy1B"


async def test_standard_mcp_sse():
    """표준 MCP SSE 연결 테스트"""
    logger.info("🧪 Testing Standard MCP SSE Connection")
    
    try:
        # SSE 엔드포인트 URL
        sse_url = f"{BASE_URL}/projects/{PROJECT_ID}/servers/{SERVER_NAME}/sse"
        
        headers = {
            'Authorization': f'Bearer {API_KEY}',
            'Accept': 'text/event-stream',
            'Cache-Control': 'no-cache'
        }
        
        logger.info(f"📡 Connecting to SSE: {sse_url}")
        
        async with aiohttp.ClientSession() as session:
            async with session.get(sse_url, headers=headers) as response:
                logger.info(f"✅ SSE Response Status: {response.status}")
                logger.info(f"📋 SSE Response Headers: {dict(response.headers)}")
                
                if response.status == 200:
                    logger.info("🎉 Standard MCP SSE connection successful!")
                    
                    # SSE 스트림 읽기 (처음 몇 개 이벤트만)
                    event_count = 0
                    max_events = 5
                    
                    async for line in response.content:
                        line_text = line.decode('utf-8').strip()
                        
                        if line_text:
                            logger.info(f"📨 SSE Event: {line_text}")
                            
                            # 이벤트 카운트 증가
                            if line_text.startswith('event:') or line_text.startswith('data:'):
                                event_count += 1
                                
                                if event_count >= max_events:
                                    logger.info(f"✅ Received {event_count} SSE events, stopping test")
                                    break
                else:
                    logger.error(f"❌ SSE connection failed with status: {response.status}")
                    error_text = await response.text()
                    logger.error(f"❌ Error response: {error_text}")
                    
    except Exception as e:
        logger.error(f"❌ Standard MCP SSE test failed: {e}")


async def test_standard_mcp_messages():
    """표준 MCP 메시지 처리 테스트"""
    logger.info("🧪 Testing Standard MCP Messages")
    
    try:
        # 메시지 엔드포인트 URL
        messages_url = f"{BASE_URL}/messages/"
        
        headers = {
            'Authorization': f'Bearer {API_KEY}',
            'Content-Type': 'application/json'
        }
        
        # 초기화 메시지 테스트
        init_message = {
            "jsonrpc": "2.0",
            "id": 1,
            "method": "initialize",
            "params": {
                "protocolVersion": "2024-11-05",
                "capabilities": {},
                "clientInfo": {
                    "name": "test-client",
                    "version": "1.0.0"
                }
            }
        }
        
        logger.info(f"📤 Sending initialize message to: {messages_url}")
        logger.info(f"📋 Message: {json.dumps(init_message, indent=2)}")
        
        async with aiohttp.ClientSession() as session:
            async with session.post(messages_url, headers=headers, json=init_message) as response:
                logger.info(f"✅ Message Response Status: {response.status}")
                
                if response.status == 200:
                    response_data = await response.json()
                    logger.info(f"📨 Initialize Response: {json.dumps(response_data, indent=2)}")
                    
                    # 응답 검증
                    if response_data.get("jsonrpc") == "2.0" and "result" in response_data:
                        logger.info("🎉 Standard MCP initialize message successful!")
                        
                        # 도구 목록 요청 테스트
                        await test_tools_list(session, headers)
                    else:
                        logger.error("❌ Invalid initialize response format")
                else:
                    logger.error(f"❌ Message request failed with status: {response.status}")
                    error_text = await response.text()
                    logger.error(f"❌ Error response: {error_text}")
                    
    except Exception as e:
        logger.error(f"❌ Standard MCP messages test failed: {e}")


async def test_tools_list(session: aiohttp.ClientSession, headers: Dict[str, str]):
    """도구 목록 요청 테스트"""
    logger.info("🔧 Testing tools/list request")
    
    try:
        messages_url = f"{BASE_URL}/messages/"
        
        tools_message = {
            "jsonrpc": "2.0",
            "id": 2,
            "method": "tools/list",
            "params": {}
        }
        
        logger.info(f"📤 Sending tools/list message")
        
        async with session.post(messages_url, headers=headers, json=tools_message) as response:
            logger.info(f"✅ Tools Response Status: {response.status}")
            
            if response.status == 200:
                response_data = await response.json()
                logger.info(f"📨 Tools Response: {json.dumps(response_data, indent=2)}")
                
                if response_data.get("jsonrpc") == "2.0" and "result" in response_data:
                    tools = response_data["result"].get("tools", [])
                    logger.info(f"🎉 Found {len(tools)} tools")
                    
                    for tool in tools:
                        logger.info(f"🔧 Tool: {tool.get('name', 'Unknown')} - {tool.get('description', 'No description')}")
                else:
                    logger.error("❌ Invalid tools/list response format")
            else:
                logger.error(f"❌ Tools request failed with status: {response.status}")
                
    except Exception as e:
        logger.error(f"❌ Tools list test failed: {e}")


async def test_project_specific_messages():
    """프로젝트별 메시지 처리 테스트"""
    logger.info("🧪 Testing Project-Specific MCP Messages")
    
    try:
        # 프로젝트별 메시지 엔드포인트 URL
        project_messages_url = f"{BASE_URL}/projects/{PROJECT_ID}/servers/{SERVER_NAME}/messages/"
        
        headers = {
            'Authorization': f'Bearer {API_KEY}',
            'Content-Type': 'application/json'
        }
        
        # 초기화 메시지 테스트
        init_message = {
            "jsonrpc": "2.0",
            "id": 1,
            "method": "initialize",
            "params": {
                "protocolVersion": "2024-11-05",
                "capabilities": {},
                "clientInfo": {
                    "name": "test-client",
                    "version": "1.0.0"
                }
            }
        }
        
        logger.info(f"📤 Sending project initialize message to: {project_messages_url}")
        
        async with aiohttp.ClientSession() as session:
            async with session.post(project_messages_url, headers=headers, json=init_message) as response:
                logger.info(f"✅ Project Message Response Status: {response.status}")
                
                if response.status == 200:
                    response_data = await response.json()
                    logger.info(f"📨 Project Initialize Response: {json.dumps(response_data, indent=2)}")
                    
                    if response_data.get("jsonrpc") == "2.0":
                        logger.info("🎉 Project-specific MCP message successful!")
                    else:
                        logger.error("❌ Invalid project response format")
                else:
                    logger.error(f"❌ Project message request failed with status: {response.status}")
                    error_text = await response.text()
                    logger.error(f"❌ Error response: {error_text}")
                    
    except Exception as e:
        logger.error(f"❌ Project-specific messages test failed: {e}")


async def test_health_check():
    """헬스체크 테스트"""
    logger.info("🧪 Testing Health Check")
    
    try:
        health_url = f"{BASE_URL}/health"
        
        async with aiohttp.ClientSession() as session:
            async with session.get(health_url) as response:
                logger.info(f"✅ Health Response Status: {response.status}")
                
                if response.status == 200:
                    health_data = await response.json()
                    logger.info(f"📨 Health Response: {json.dumps(health_data, indent=2)}")
                    logger.info("🎉 Health check successful!")
                else:
                    logger.error(f"❌ Health check failed with status: {response.status}")
                    
    except Exception as e:
        logger.error(f"❌ Health check test failed: {e}")


async def main():
    """메인 테스트 실행"""
    logger.info("🚀 Starting Standard MCP Protocol Tests")
    logger.info("=" * 60)
    
    # 테스트 순서
    tests = [
        ("Health Check", test_health_check),
        ("Standard MCP SSE", test_standard_mcp_sse),
        ("Standard MCP Messages", test_standard_mcp_messages),
        ("Project-Specific Messages", test_project_specific_messages),
    ]
    
    for test_name, test_func in tests:
        logger.info(f"\n📋 Running: {test_name}")
        logger.info("-" * 40)
        
        try:
            await test_func()
            logger.info(f"✅ {test_name} completed")
        except Exception as e:
            logger.error(f"❌ {test_name} failed: {e}")
        
        # 테스트 간 잠시 대기
        await asyncio.sleep(1)
    
    logger.info("\n" + "=" * 60)
    logger.info("🏁 Standard MCP Protocol Tests Completed")


if __name__ == "__main__":
    asyncio.run(main())

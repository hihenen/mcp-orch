"""Cline SSE 연결 테스트"""

import asyncio
import json
import aiohttp
from aiohttp_sse_client import client as sse_client


async def test_sse_connection():
    """SSE 연결 테스트"""
    url = "http://localhost:8000/sse/brave-search"
    
    print(f"Connecting to {url}...")
    
    try:
        async with aiohttp.ClientSession() as session:
            async with sse_client.EventSource(
                url,
                session=session,
                timeout=aiohttp.ClientTimeout(total=60)
            ) as event_source:
                print("Connected!")
                
                # 이벤트 수신
                async for event in event_source:
                    print(f"\nEvent type: {event.type}")
                    print(f"Event data: {event.data}")
                    
                    if event.type == "message":
                        try:
                            data = json.loads(event.data)
                            print(f"Parsed data: {json.dumps(data, indent=2)}")
                            
                            # 메서드 확인
                            if "method" in data:
                                print(f"Method: {data['method']}")
                                
                                # tools/list 메시지를 받으면 종료
                                if data["method"] == "tools/list":
                                    print("\nReceived tools list!")
                                    tools = data.get("params", {}).get("tools", [])
                                    print(f"Number of tools: {len(tools)}")
                                    for tool in tools:
                                        print(f"  - {tool['name']}: {tool.get('description', '')[:50]}...")
                                    break
                                    
                        except json.JSONDecodeError:
                            print("Failed to parse JSON")
                    
    except Exception as e:
        print(f"Error: {e}")


async def test_mcp_handshake():
    """MCP 핸드셰이크 테스트"""
    url = "http://localhost:8000/mcp/brave-search"
    
    print(f"\nTesting MCP handshake at {url}...")
    
    async with aiohttp.ClientSession() as session:
        # 1. Initialize 요청
        init_request = {
            "jsonrpc": "2.0",
            "id": 1,
            "method": "initialize",
            "params": {
                "protocolVersion": "0.1.0",
                "capabilities": {
                    "tools": {}
                },
                "clientInfo": {
                    "name": "test-client",
                    "version": "1.0.0"
                }
            }
        }
        
        try:
            async with session.post(url, json=init_request) as resp:
                result = await resp.json()
                print(f"Initialize response: {json.dumps(result, indent=2)}")
                
                if "result" in result:
                    # 2. Initialized 알림 (일반적으로 필요 없음)
                    
                    # 3. tools/list 요청
                    tools_request = {
                        "jsonrpc": "2.0",
                        "id": 2,
                        "method": "tools/list",
                        "params": {}
                    }
                    
                    async with session.post(url, json=tools_request) as resp2:
                        result2 = await resp2.json()
                        print(f"\nTools list response: {json.dumps(result2, indent=2)}")
                        
        except Exception as e:
            print(f"Error: {e}")


async def main():
    """메인 함수"""
    # SSE 연결 테스트
    await test_sse_connection()
    
    # MCP 핸드셰이크 테스트
    await test_mcp_handshake()


if __name__ == "__main__":
    asyncio.run(main())

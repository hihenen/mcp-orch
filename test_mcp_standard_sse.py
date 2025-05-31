#!/usr/bin/env python3
"""MCP 표준 SSE 서버 테스트"""

import asyncio
import sys
from mcp.client.sse import sse_client
from mcp.client.session import ClientSession

async def test_standard_sse():
    """표준 SSE 서버 테스트"""
    try:
        # brave-search 서버 테스트
        print("Testing MCP Standard SSE connection to http://127.0.0.1:8080/servers/brave-search/sse")
        
        async with sse_client(url="http://127.0.0.1:8080/servers/brave-search/sse") as streams:
            async with ClientSession(*streams) as session:
                print("Connected successfully!")
                
                # 초기화
                init_result = await session.initialize()
                print(f"Server name: {init_result.serverInfo.name}")
                print(f"Server version: {init_result.serverInfo.version}")
                print(f"Capabilities: {init_result.capabilities}")
                
                # 도구 확인
                if init_result.capabilities.tools:
                    print("✅ Tools capability detected!")
                    
                    # 도구 목록
                    tools_result = await session.list_tools()
                    print(f"Available tools: {len(tools_result.tools)}")
                    
                    for tool in tools_result.tools:
                        print(f"  - {tool.name}: {tool.description}")
                else:
                    print("❌ No tools capability found")
                    
    except Exception as e:
        print(f"Error: {e}")
        import traceback
        traceback.print_exc()
        return False
    
    return True

if __name__ == "__main__":
    success = asyncio.run(test_standard_sse())
    sys.exit(0 if success else 1)

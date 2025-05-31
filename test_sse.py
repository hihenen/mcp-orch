#!/usr/bin/env python3
"""
SSE 연결 테스트 스크립트
"""

import asyncio
import aiohttp
import json

async def test_sse_connection():
    """SSE 연결 테스트"""
    url = "http://localhost:8000/sse/brave-search"
    
    print(f"SSE 연결 테스트: {url}\n")
    
    async with aiohttp.ClientSession() as session:
        try:
            async with session.get(url) as response:
                print(f"응답 상태: {response.status}")
                print(f"Content-Type: {response.headers.get('Content-Type')}")
                print("\n수신된 이벤트:\n")
                
                # SSE 스트림 읽기
                async for line in response.content:
                    line = line.decode('utf-8').strip()
                    if line:
                        print(f"수신: {line}")
                        
                        # 이벤트 파싱
                        if line.startswith("event:"):
                            event_type = line[6:].strip()
                            print(f"  이벤트 타입: {event_type}")
                        elif line.startswith("data:"):
                            data = line[5:].strip()
                            try:
                                parsed_data = json.loads(data)
                                print(f"  데이터: {json.dumps(parsed_data, indent=2, ensure_ascii=False)}")
                            except:
                                print(f"  데이터: {data}")
                        
                        # 처음 몇 개 이벤트만 받고 종료
                        if "tools/list" in line:
                            await asyncio.sleep(1)
                            break
                            
        except Exception as e:
            print(f"오류 발생: {e}")

async def test_mcp_endpoint():
    """MCP JSON-RPC 엔드포인트 테스트"""
    url = "http://localhost:8000/mcp/brave-search"
    
    print(f"\n\nMCP 엔드포인트 테스트: {url}\n")
    
    # initialize 요청
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
    
    async with aiohttp.ClientSession() as session:
        try:
            async with session.post(url, json=init_request) as response:
                result = await response.json()
                print("Initialize 응답:")
                print(json.dumps(result, indent=2, ensure_ascii=False))
                
            # tools/list 요청
            tools_request = {
                "jsonrpc": "2.0",
                "id": 2,
                "method": "tools/list",
                "params": {}
            }
            
            async with session.post(url, json=tools_request) as response:
                result = await response.json()
                print("\nTools/list 응답:")
                print(json.dumps(result, indent=2, ensure_ascii=False))
                
        except Exception as e:
            print(f"오류 발생: {e}")

async def main():
    """메인 함수"""
    await test_sse_connection()
    await test_mcp_endpoint()

if __name__ == "__main__":
    asyncio.run(main())

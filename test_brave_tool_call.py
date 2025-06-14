#!/usr/bin/env python3
"""
Brave Search MCP 서버 실제 도구 호출 테스트
"""

import asyncio
import sys
import os
import json
sys.path.append(os.path.join(os.path.dirname(__file__), 'src'))

from sqlalchemy.orm import Session
from mcp_orch.database import get_db
from mcp_orch.models import McpServer, Project
from mcp_orch.services.mcp_connection_service import mcp_connection_service

async def test_brave_tool_call():
    """Brave Search 도구 실제 호출 테스트"""
    
    # 데이터베이스 연결
    db = next(get_db())
    
    try:
        print("=== Brave Search 도구 호출 테스트 ===\n")
        
        # brave-search 서버 찾기
        brave_server = db.query(McpServer).filter(McpServer.name == "brave-search").first()
        
        if not brave_server:
            print("❌ brave-search 서버를 찾을 수 없습니다.")
            return
        
        print(f"✅ brave-search 서버 발견: {brave_server.id}")
        print(f"프로젝트 ID: {brave_server.project_id}")
        print(f"명령어: {brave_server.command} {' '.join(brave_server.args)}")
        print()
        
        # 서버 설정 구성
        server_config = mcp_connection_service._build_server_config_from_db(brave_server)
        if not server_config:
            print("❌ 서버 설정 구성에 실패했습니다.")
            return
        
        print("=== 도구 호출 테스트 시작 ===")
        
        # 1. brave_web_search 호출 테스트
        print("\n1. brave_web_search 테스트")
        web_search_result = await test_tool_call(
            server_config, 
            "brave_web_search", 
            {"query": "Python programming", "count": 3}
        )
        
        if web_search_result:
            print("✅ brave_web_search 호출 성공")
            print(f"응답: {web_search_result}")
        else:
            print("❌ brave_web_search 호출 실패")
        
        # 2. brave_local_search 호출 테스트  
        print("\n2. brave_local_search 테스트")
        local_search_result = await test_tool_call(
            server_config,
            "brave_local_search",
            {"query": "pizza near Central Park", "count": 2}
        )
        
        if local_search_result:
            print("✅ brave_local_search 호출 성공")
            print(f"응답: {local_search_result}")
        else:
            print("❌ brave_local_search 호출 실패")
            
    finally:
        db.close()

async def test_tool_call(server_config: dict, tool_name: str, arguments: dict):
    """개별 도구 호출 테스트"""
    try:
        import os
        
        command = server_config.get('command', '')
        args = server_config.get('args', [])
        env = server_config.get('env', {})
        timeout = 30
        
        if not command:
            print(f"❌ {tool_name}: 명령어가 지정되지 않음")
            return None
        
        # 환경변수 설정 (PATH 상속 포함)
        full_env = os.environ.copy()
        full_env.update(env)
        
        print(f"🚀 {tool_name} 호출: {arguments}")
        
        # MCP 서버 프로세스 시작
        process = await asyncio.create_subprocess_exec(
            command, *args,
            stdin=asyncio.subprocess.PIPE,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
            env=full_env
        )
        
        try:
            # 1. 초기화 메시지
            init_message = {
                "jsonrpc": "2.0",
                "id": 1,
                "method": "initialize",
                "params": {
                    "protocolVersion": "2024-11-05",
                    "capabilities": {},
                    "clientInfo": {
                        "name": "mcp-orch-test",
                        "version": "1.0.0"
                    }
                }
            }
            
            # 2. 도구 호출 메시지
            tool_call_message = {
                "jsonrpc": "2.0",
                "id": 2,
                "method": "tools/call",
                "params": {
                    "name": tool_name,
                    "arguments": arguments
                }
            }
            
            # 메시지 전송
            init_json = json.dumps(init_message) + '\n'
            tool_json = json.dumps(tool_call_message) + '\n'
            
            process.stdin.write(init_json.encode())
            process.stdin.write(tool_json.encode())
            await process.stdin.drain()
            process.stdin.close()
            
            # 응답 수집
            responses = []
            try:
                # 초기화 응답 읽기
                init_response = await asyncio.wait_for(
                    process.stdout.readline(), timeout=timeout
                )
                if init_response:
                    responses.append(init_response.decode().strip())
                
                # 도구 호출 응답 읽기
                tool_response = await asyncio.wait_for(
                    process.stdout.readline(), timeout=timeout
                )
                if tool_response:
                    responses.append(tool_response.decode().strip())
                    
            except asyncio.TimeoutError:
                print(f"⏰ {tool_name}: 응답 타임아웃 ({timeout}초)")
                return None
            
            # 응답 파싱
            for response_line in responses:
                if response_line.strip():
                    try:
                        response_data = json.loads(response_line)
                        if response_data.get('id') == 2 and 'result' in response_data:
                            # 도구 호출 결과
                            result = response_data['result']
                            if 'content' in result:
                                # MCP 표준 형식
                                content_items = result['content']
                                if content_items and len(content_items) > 0:
                                    return content_items[0].get('text', 'No text content')
                            else:
                                # 직접 결과
                                return str(result)
                        elif response_data.get('id') == 2 and 'error' in response_data:
                            # 오류 응답
                            error = response_data['error']
                            print(f"❌ {tool_name}: {error}")
                            return None
                    except json.JSONDecodeError as e:
                        print(f"⚠️ {tool_name}: JSON 파싱 오류 - {e}")
                        continue
            
            return None
            
        finally:
            # 프로세스 정리
            try:
                await asyncio.wait_for(process.wait(), timeout=5.0)
            except asyncio.TimeoutError:
                process.kill()
                await process.wait()
                
    except Exception as e:
        print(f"❌ {tool_name} 호출 중 오류: {e}")
        return None

if __name__ == "__main__":
    asyncio.run(test_brave_tool_call())
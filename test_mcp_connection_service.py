#!/usr/bin/env python3
"""
MCP 연결 서비스 테스트 스크립트
"""

import asyncio
import sys
import os

# 프로젝트 루트를 Python 경로에 추가
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'src'))

from mcp_orch.services.mcp_connection_service import mcp_connection_service
from mcp_orch.config_parser import load_mcp_config


async def test_mcp_connection():
    """MCP 서버 연결 테스트"""
    print("🔍 MCP 서버 연결 테스트 시작...")
    
    # MCP 설정 파일 로드
    config = load_mcp_config()
    if not config or 'servers' not in config:
        print("❌ MCP 설정 파일을 찾을 수 없습니다.")
        return
    
    print(f"📋 발견된 서버: {list(config['servers'].keys())}")
    
    # 각 서버별 연결 테스트
    for server_name, server_config in config['servers'].items():
        print(f"\n🔧 테스트 중: {server_name}")
        print(f"   명령어: {server_config.get('command', 'N/A')}")
        print(f"   인수: {server_config.get('args', [])}")
        print(f"   비활성화: {server_config.get('disabled', False)}")
        
        if server_config.get('disabled', False):
            print(f"   ⏸️  {server_name}: 비활성화됨")
            continue
        
        # 서버 상태 확인
        try:
            status = await mcp_connection_service.check_server_status(server_name, server_config)
            print(f"   📊 상태: {status}")
            
            if status == "online":
                # 도구 목록 조회
                tools = await mcp_connection_service.get_server_tools(server_name, server_config)
                print(f"   🛠️  도구 개수: {len(tools)}")
                
                if tools:
                    print("   📝 사용 가능한 도구:")
                    for tool in tools[:5]:  # 처음 5개만 표시
                        print(f"      - {tool.get('name', 'Unknown')}: {tool.get('description', 'No description')}")
                    if len(tools) > 5:
                        print(f"      ... 그리고 {len(tools) - 5}개 더")
            else:
                print(f"   ❌ 연결 실패: {status}")
                
        except Exception as e:
            print(f"   💥 오류 발생: {str(e)}")
    
    print("\n✅ MCP 서버 연결 테스트 완료!")


async def test_brave_search_specifically():
    """Brave Search 서버 특별 테스트"""
    print("\n🔍 Brave Search 서버 특별 테스트...")
    
    config = load_mcp_config()
    if not config or 'servers' not in config:
        print("❌ MCP 설정 파일을 찾을 수 없습니다.")
        return
    
    brave_config = config['servers'].get('brave-search')
    if not brave_config:
        print("❌ brave-search 서버 설정을 찾을 수 없습니다.")
        return
    
    print("📋 Brave Search 설정:")
    print(f"   명령어: {brave_config.get('command')}")
    print(f"   인수: {brave_config.get('args')}")
    print(f"   환경변수: {list(brave_config.get('env', {}).keys())}")
    print(f"   비활성화: {brave_config.get('disabled', False)}")
    
    # 연결 테스트
    try:
        print("\n🔗 연결 테스트 중...")
        status = await mcp_connection_service.check_server_status('brave-search', brave_config)
        print(f"📊 상태: {status}")
        
        if status == "online":
            print("🛠️  도구 목록 조회 중...")
            tools = await mcp_connection_service.get_server_tools('brave-search', brave_config)
            print(f"📝 발견된 도구: {len(tools)}개")
            
            for tool in tools:
                print(f"   - {tool.get('name')}")
                print(f"     설명: {tool.get('description', 'No description')}")
                schema = tool.get('schema', {})
                if 'properties' in schema:
                    print(f"     매개변수: {list(schema['properties'].keys())}")
                print()
        else:
            print(f"❌ 연결 실패: {status}")
            
    except Exception as e:
        print(f"💥 오류 발생: {str(e)}")
        import traceback
        traceback.print_exc()


if __name__ == "__main__":
    print("🚀 MCP 연결 서비스 테스트 시작")
    
    # 일반 테스트
    asyncio.run(test_mcp_connection())
    
    # Brave Search 특별 테스트
    asyncio.run(test_brave_search_specifically())
    
    print("\n🎉 모든 테스트 완료!")

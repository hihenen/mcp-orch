#!/usr/bin/env python3
"""
Brave Search MCP 서버 디버깅 스크립트
"""

import asyncio
import sys
import os
sys.path.append(os.path.join(os.path.dirname(__file__), 'src'))

from sqlalchemy.orm import Session
from mcp_orch.database import get_db
from mcp_orch.models import McpServer, Project
from mcp_orch.services.mcp_connection_service import mcp_connection_service

async def debug_brave_search():
    """Brave Search 서버 디버깅"""
    
    # 데이터베이스 연결
    db = next(get_db())
    
    try:
        print("=== Brave Search MCP 서버 디버깅 ===\n")
        
        # 1. 모든 프로젝트 조회
        projects = db.query(Project).all()
        print(f"총 프로젝트 수: {len(projects)}")
        for project in projects:
            print(f"  - {project.name} (ID: {project.id})")
        print()
        
        # 2. 모든 MCP 서버 조회
        servers = db.query(McpServer).all()
        print(f"총 MCP 서버 수: {len(servers)}")
        
        brave_servers = []
        for server in servers:
            print(f"  - {server.name} (ID: {server.id})")
            print(f"    프로젝트: {server.project_id}")
            print(f"    명령어: {server.command}")
            print(f"    인수: {server.args}")
            print(f"    환경변수: {server.env}")
            print(f"    활성화: {server.is_enabled}")
            print(f"    전송 타입: {server.transport_type}")
            print()
            
            # brave-search 관련 서버 찾기
            if 'brave' in server.name.lower() or (server.args and any('brave' in str(arg).lower() for arg in server.args)):
                brave_servers.append(server)
        
        print(f"Brave Search 관련 서버 수: {len(brave_servers)}")
        
        # 3. Brave Search 서버 상세 분석
        for server in brave_servers:
            print(f"\n=== Brave Search 서버 분석: {server.name} ===")
            print(f"ID: {server.id}")
            print(f"프로젝트 ID: {server.project_id}")
            print(f"명령어: {server.command}")
            print(f"인수: {server.args}")
            print(f"환경변수: {server.env}")
            print(f"활성화 상태: {server.is_enabled}")
            print(f"전송 타입: {server.transport_type}")
            
            # 4. 서버 설정 구성 테스트
            server_config = mcp_connection_service._build_server_config_from_db(server)
            print(f"구성된 설정: {server_config}")
            
            if server_config and server.is_enabled:
                print("\n--- 연결 테스트 시작 ---")
                
                # 5. 연결 테스트
                try:
                    status = await mcp_connection_service.check_server_status(str(server.id), server_config)
                    print(f"서버 상태: {status}")
                    
                    if status == "online":
                        # 6. 도구 목록 조회
                        tools = await mcp_connection_service.get_server_tools(str(server.id), server_config)
                        print(f"도구 개수: {len(tools)}")
                        
                        if tools:
                            print("도구 목록:")
                            for tool in tools:
                                print(f"  - {tool.get('name', 'Unknown')}: {tool.get('description', 'No description')}")
                        else:
                            print("⚠️  도구가 발견되지 않았습니다!")
                    else:
                        print(f"⚠️  서버가 오프라인 상태입니다: {status}")
                        
                except Exception as e:
                    print(f"❌ 연결 테스트 실패: {e}")
            else:
                if not server.is_enabled:
                    print("⚠️  서버가 비활성화되어 있습니다.")
                if not server_config:
                    print("⚠️  서버 설정이 불완전합니다.")
        
        # 7. 수동 brave-search 테스트
        print(f"\n=== 수동 Brave Search 테스트 ===")
        manual_config = {
            'command': 'npx',
            'args': ['-y', '@modelcontextprotocol/server-brave-search'],
            'env': {'BRAVE_API_KEY': 'BSAiFio-6UgIYNeno28H-8iPw_J-7iC'},
            'timeout': 60,
            'transportType': 'stdio',
            'disabled': False
        }
        
        print(f"테스트 설정: {manual_config}")
        
        try:
            status = await mcp_connection_service.check_server_status("manual_test", manual_config)
            print(f"수동 테스트 상태: {status}")
            
            if status == "online":
                tools = await mcp_connection_service.get_server_tools("manual_test", manual_config)
                print(f"수동 테스트 도구 개수: {len(tools)}")
                
                if tools:
                    print("수동 테스트 도구 목록:")
                    for tool in tools:
                        print(f"  - {tool.get('name', 'Unknown')}: {tool.get('description', 'No description')}")
                else:
                    print("⚠️  수동 테스트에서도 도구가 발견되지 않았습니다!")
            else:
                print(f"⚠️  수동 테스트도 실패했습니다: {status}")
                
        except Exception as e:
            print(f"❌ 수동 테스트 실패: {e}")
            
    finally:
        db.close()

if __name__ == "__main__":
    asyncio.run(debug_brave_search())

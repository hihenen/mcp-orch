#!/usr/bin/env python3

import asyncio
import sys
import os
sys.path.append(os.path.join(os.path.dirname(__file__), 'src'))

from mcp_orch.services.mcp_connection_service import mcp_connection_service
from mcp_orch.database import get_db
from mcp_orch.models import McpServer
from sqlalchemy.orm import Session

async def test_tools_api():
    """도구 API 테스트"""
    
    # 데이터베이스 연결
    db = next(get_db())
    
    try:
        # test 프로젝트의 brave-search 서버 찾기
        servers = db.query(McpServer).filter(
            McpServer.name.like('%brave%')
        ).all()
        
        print(f"🔍 Found {len(servers)} servers with 'brave' in name:")
        for server in servers:
            print(f"  - {server.name} (ID: {server.id}, Project: {server.project_id})")
            print(f"    Command: {server.command}")
            print(f"    Args: {server.args}")
            print(f"    Enabled: {server.is_enabled}")
            
            # 서버 설정 구성
            server_config = mcp_connection_service._build_server_config_from_db(server)
            if server_config:
                print(f"    Config: {server_config}")
                
                # 서버 상태 확인
                try:
                    unique_server_id = mcp_connection_service._generate_unique_server_id(server)
                    print(f"    Unique ID: {unique_server_id}")
                    
                    status = await mcp_connection_service.check_server_status(unique_server_id, server_config)
                    print(f"    Status: {status}")
                    
                    if status == "online":
                        tools = await mcp_connection_service.get_server_tools(unique_server_id, server_config)
                        print(f"    Tools count: {len(tools)}")
                        for i, tool in enumerate(tools):
                            print(f"      {i+1}. {tool.get('name', 'Unknown')} - {tool.get('description', 'No description')}")
                    else:
                        print(f"    Server is not online, cannot get tools")
                        
                except Exception as e:
                    print(f"    Error checking status: {e}")
            else:
                print(f"    No valid config found")
            
            print()
            
    except Exception as e:
        print(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()
    finally:
        db.close()

if __name__ == "__main__":
    asyncio.run(test_tools_api())

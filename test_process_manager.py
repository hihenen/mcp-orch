#!/usr/bin/env python3
"""
ProcessManager 테스트 스크립트
"""
import asyncio
import sys
import os
from pathlib import Path

# 프로젝트 루트를 Python 경로에 추가
project_root = Path(__file__).parent
sys.path.insert(0, str(project_root / "src"))

async def test_process_manager():
    """ProcessManager 기본 기능 테스트"""
    print("🧪 ProcessManager 테스트 시작")
    
    try:
        from mcp_orch.services.process_manager import ProcessManager
        from mcp_orch.database import get_db_session
        from mcp_orch.models.mcp_server import McpServer, McpServerStatus
        
        # ProcessManager 인스턴스 생성
        pm = ProcessManager()
        print("✅ ProcessManager 인스턴스 생성 성공")
        
        # 데이터베이스 연결 테스트
        from mcp_orch.database import async_session
        async with async_session() as db:
            # enabled 서버 개수 확인
            from sqlalchemy import select
            stmt = select(McpServer).where(McpServer.is_enabled == True)
            result = await db.execute(stmt)
            enabled_servers = result.scalars().all()
            
            print(f"📊 enabled=True 서버 개수: {len(enabled_servers)}")
            
            for server in enabled_servers:
                print(f"  - {server.name} (ID: {server.id})")
                print(f"    Command: {server.command}")
                print(f"    Args: {server.args}")
                print(f"    Status: {server.status}")
                print(f"    Process ID: {server.process_id}")
                print(f"    Auto Restart: {server.is_auto_restart_enabled}")
                print()
        
        # 헬스체크 기능 테스트
        print("🔍 헬스체크 기능 테스트")
        await pm.health_check_all()
        print("✅ 헬스체크 완료")
        
        # 전체 상태 조회 테스트
        print("📋 전체 서버 상태 조회")
        statuses = await pm.get_all_status()
        print(f"총 {len(statuses)}개 서버 상태 조회됨")
        
        for status in statuses:
            print(f"  - {status['name']}: {status['status']}")
            print(f"    Running: {status['is_running']}")
            print(f"    Healthy: {status['is_healthy']}")
            print(f"    Memory: {status['memory_mb']}MB")
            print(f"    Failures: {status['health_check_failures']}")
            print()
        
        print("✅ ProcessManager 테스트 완료!")
        
    except Exception as e:
        print(f"❌ 테스트 실패: {e}")
        import traceback
        traceback.print_exc()


async def test_api_models():
    """API 모델 테스트"""
    print("🧪 API 모델 테스트 시작")
    
    try:
        from mcp_orch.api.process_management import (
            ProcessStatusResponse, 
            ProcessMetricsResponse,
            ServerStartRequest
        )
        from datetime import datetime
        
        # ProcessStatusResponse 테스트
        status_data = {
            "id": "test-id",
            "name": "test-server",
            "status": "active",
            "is_enabled": True,
            "is_running": True,
            "process_id": 12345,
            "last_health_check": datetime.utcnow(),
            "health_check_failures": 0,
            "last_started_at": datetime.utcnow(),
            "restart_count": 0,
            "last_error": None,
            "memory_mb": 100,
            "cpu_percent": 5.5,
            "is_healthy": True,
            "needs_restart": False
        }
        
        status_response = ProcessStatusResponse(**status_data)
        print(f"✅ ProcessStatusResponse: {status_response.name}")
        
        # ProcessMetricsResponse 테스트
        metrics_data = {
            "total_servers": 5,
            "active_servers": 3,
            "inactive_servers": 1,
            "error_servers": 1,
            "total_memory_mb": 500,
            "total_cpu_percent": 25.5,
            "health_check_failures": 2
        }
        
        metrics_response = ProcessMetricsResponse(**metrics_data)
        print(f"✅ ProcessMetricsResponse: {metrics_response.total_servers} servers")
        
        # ServerStartRequest 테스트
        start_request = ServerStartRequest(
            server_ids=["server-1", "server-2"],
            force=False
        )
        print(f"✅ ServerStartRequest: {len(start_request.server_ids)} servers")
        
        print("✅ API 모델 테스트 완료!")
        
    except Exception as e:
        print(f"❌ API 모델 테스트 실패: {e}")
        import traceback
        traceback.print_exc()


async def main():
    """메인 테스트 함수"""
    print("🚀 ProcessManager 통합 테스트")
    print("=" * 50)
    
    await test_api_models()
    print()
    await test_process_manager()
    
    print("=" * 50)
    print("🎉 모든 테스트 완료!")


if __name__ == "__main__":
    asyncio.run(main())
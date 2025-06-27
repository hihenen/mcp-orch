"""
Cache Invalidation Service - 통합 캐시 무효화 시스템

기존 시스템과 통합하여 일관된 캐시 관리를 제공
"""

import logging
from typing import Optional, Dict, Any
from uuid import UUID

logger = logging.getLogger(__name__)


class CacheInvalidationService:
    """통합 캐시 무효화 서비스"""
    
    @staticmethod
    async def invalidate_tool_caches(
        project_id: UUID, 
        server_id: UUID,
        invalidation_type: str = "user_setting_change"
    ):
        """
        전체 툴 캐시 무효화 (3-Layer 통합 시스템)
        
        Args:
            project_id: 프로젝트 ID
            server_id: 서버 ID
            invalidation_type: 무효화 유형 (user_setting_change, tool_list_updated, etc.)
        """
        
        try:
            # 1. 🔧 MCP 세션 매니저 캐시 무효화 (기존 시스템 통합)
            await CacheInvalidationService._invalidate_session_cache(project_id, server_id)
            
            # 2. 🗄️ PostgreSQL Materialized View 새로고침 (향후 적용)
            # await CacheInvalidationService._refresh_materialized_views(project_id, server_id)
            
            # 3. 📡 활성 SSE 연결에 업데이트 알림 (향후 적용)
            await CacheInvalidationService._notify_active_connections(
                project_id, 
                {
                    "type": "tools_filter_updated",
                    "server_id": str(server_id),
                    "invalidation_type": invalidation_type
                }
            )
            
            # 📊 무효화 메트릭 로깅 (ServerStatusService 패턴)
            logger.info(f"📈 [METRICS] Cache invalidation completed: {invalidation_type} for server {server_id} in project {project_id}")
            
        except Exception as e:
            logger.error(f"❌ [CACHE] Cache invalidation failed: {e}")
    
    @staticmethod
    async def _invalidate_session_cache(project_id: UUID, server_id: UUID):
        """MCP 세션 매니저 캐시 무효화"""
        try:
            # 기존 MCP 세션 매니저와 통합
            from .mcp_session_manager import get_session_manager
            
            session_manager = await get_session_manager()
            server_key = f"{project_id}.{server_id}"
            
            if server_key in session_manager.sessions:
                # 기존 세션의 툴 캐시 무효화
                session_manager.sessions[server_key].tools_cache = None
                logger.info(f"🔄 [CACHE] Invalidated session cache: {server_key}")
            else:
                logger.debug(f"🔍 [CACHE] No active session found for: {server_key}")
                
        except Exception as e:
            logger.error(f"❌ [CACHE] Session cache invalidation failed: {e}")
    
    @staticmethod
    async def _refresh_materialized_views(project_id: UUID, server_id: UUID):
        """PostgreSQL Materialized View 새로고침 (향후 구현)"""
        try:
            # TODO: 성능 이슈 발생 시 구현 예정
            # from ..database import get_db
            # db = next(get_db())
            # db.execute(text("REFRESH MATERIALIZED VIEW CONCURRENTLY tool_preferences_summary"))
            # db.commit()
            # db.close()
            
            logger.debug(f"🗄️ [CACHE] Materialized view refresh planned for project {project_id}, server {server_id}")
            
        except Exception as e:
            logger.error(f"❌ [CACHE] Materialized view refresh failed: {e}")
    
    @staticmethod
    async def _notify_active_connections(project_id: UUID, update_data: Dict[str, Any]):
        """활성 SSE 연결에 업데이트 알림 (향후 구현)"""
        try:
            # TODO: SSE 연결 매니저와 통합하여 실시간 알림 구현
            # - 프로젝트의 활성 SSE 연결 목록 조회
            # - 각 연결에 업데이트 메시지 전송
            # - 실패한 연결은 자동 정리
            
            logger.info(f"📡 [CACHE] SSE notification prepared for project {project_id}: {update_data['type']}")
            
        except Exception as e:
            logger.error(f"❌ [CACHE] SSE notification failed: {e}")
    
    @staticmethod
    async def invalidate_project_caches(project_id: UUID, invalidation_type: str = "project_setting_change"):
        """프로젝트 전체 캐시 무효화"""
        try:
            # 프로젝트의 모든 서버에 대해 캐시 무효화
            from ..database import get_db
            from ..models import McpServer
            
            db = next(get_db())
            try:
                servers = db.query(McpServer).filter(McpServer.project_id == project_id).all()
                
                for server in servers:
                    await CacheInvalidationService.invalidate_tool_caches(
                        project_id=project_id,
                        server_id=server.id,
                        invalidation_type=invalidation_type
                    )
                
                logger.info(f"🔄 [CACHE] Project-wide cache invalidation completed for {len(servers)} servers in project {project_id}")
                
            finally:
                db.close()
                
        except Exception as e:
            logger.error(f"❌ [CACHE] Project cache invalidation failed: {e}")
    
    @staticmethod
    async def on_tool_list_changed(project_id: UUID, server_id: UUID):
        """툴 목록 변경 시 자동 호출 (스케줄러 연동용)"""
        await CacheInvalidationService.invalidate_tool_caches(
            project_id=project_id,
            server_id=server_id,
            invalidation_type="tool_list_updated"
        )
    
    @staticmethod
    async def on_user_preference_changed(project_id: UUID, server_id: UUID, tool_name: str):
        """사용자 설정 변경 시 자동 호출 (API 연동용)"""
        await CacheInvalidationService.invalidate_tool_caches(
            project_id=project_id,
            server_id=server_id,
            invalidation_type=f"user_preference_changed:{tool_name}"
        )
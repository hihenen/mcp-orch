"""
Tool Filtering Service - 프로젝트별 툴 사용 설정 관리

ServerStatusService 패턴을 적용한 일관된 DB 세션 관리 및 로깅 시스템
"""

import logging
import time
from typing import List, Dict, Any, Optional
from uuid import UUID
from sqlalchemy.orm import Session
from sqlalchemy import and_

from ..models.tool_preference import ToolPreference
from ..database import get_db

logger = logging.getLogger(__name__)


class ToolFilteringService:
    """공통 툴 필터링 서비스 - Unified/Individual MCP Transport 모두 사용"""
    
    @staticmethod
    async def filter_tools_by_preferences(
        project_id: UUID,
        server_id: UUID,
        tools: List[Dict],
        db: Session = None
    ) -> List[Dict]:
        """
        프로젝트 툴 설정에 따라 툴 목록 필터링 (ServerStatusService 패턴)
        
        Args:
            project_id: 프로젝트 ID
            server_id: MCP 서버 ID
            tools: 원본 툴 목록
            db: 데이터베이스 세션 (선택적)
            
        Returns:
            필터링된 툴 목록
        """
        start_time = time.time()
        
        # 🔄 ServerStatusService와 동일한 DB 세션 관리 패턴
        should_close_db = False
        if db is None:
            db = next(get_db())
            should_close_db = True
        
        try:
            # 툴 설정 조회 (배치 쿼리 최적화)
            tool_preferences = db.query(ToolPreference).filter(
                and_(
                    ToolPreference.project_id == project_id,
                    ToolPreference.server_id == server_id
                )
            ).all()
            
            # 빠른 조회를 위한 설정 맵 생성
            preference_map = {
                pref.tool_name: pref.is_enabled
                for pref in tool_preferences
            }
            
            # 필터링 적용
            filtered_tools = []
            filtered_count = 0
            
            for tool in tools:
                tool_name = tool.get('name', '')
                is_enabled = preference_map.get(tool_name, True)  # 기본값: 사용함
                
                if is_enabled:
                    filtered_tools.append(tool)
                else:
                    filtered_count += 1
                    logger.debug(f"🚫 Tool filtered: {tool_name} from server {server_id}")
            
            # 📊 ServerStatusService 스타일 메트릭 로깅
            filtering_time = (time.time() - start_time) * 1000  # 밀리초
            
            if filtered_count > 0:
                logger.info(f"📈 [METRICS] Tool filtering applied: {len(filtered_tools)}/{len(tools)} tools enabled for server {server_id} in {filtering_time:.2f}ms")
            else:
                logger.debug(f"📈 [METRICS] No filtering needed: {len(tools)} tools for server {server_id} in {filtering_time:.2f}ms")
            
            return filtered_tools
            
        except Exception as e:
            filtering_time = (time.time() - start_time) * 1000
            logger.error(f"❌ [TOOL_FILTERING] Error filtering tools for server {server_id}: {e} (took {filtering_time:.2f}ms)")
            # 🛡️ ServerStatusService 스타일 안전장치: 에러 시 원본 툴 목록 반환
            return tools
            
        finally:
            if should_close_db:
                db.close()
    
    @staticmethod
    async def get_project_tool_preferences(
        project_id: UUID,
        db: Session = None
    ) -> Dict[str, Dict[str, bool]]:
        """
        프로젝트의 전체 툴 설정 조회 (캐싱 및 UI용)
        
        Args:
            project_id: 프로젝트 ID
            db: 데이터베이스 세션 (선택적)
            
        Returns:
            {server_id: {tool_name: is_enabled}} 형태의 설정 맵
        """
        # 🔄 ServerStatusService와 동일한 DB 세션 관리 패턴
        should_close_db = False
        if db is None:
            db = next(get_db())
            should_close_db = True
            
        try:
            preferences = db.query(ToolPreference).filter(
                ToolPreference.project_id == project_id
            ).all()
            
            result = {}
            for pref in preferences:
                server_key = str(pref.server_id)
                if server_key not in result:
                    result[server_key] = {}
                result[server_key][pref.tool_name] = pref.is_enabled
            
            logger.info(f"📋 [TOOL_FILTERING] Loaded {len(preferences)} tool preferences for project {project_id}")
            return result
            
        except Exception as e:
            logger.error(f"❌ [TOOL_FILTERING] Error loading project tool preferences: {e}")
            return {}
            
        finally:
            if should_close_db:
                db.close()
    
    @staticmethod
    async def update_tool_preference(
        project_id: UUID,
        server_id: UUID,
        tool_name: str,
        is_enabled: bool,
        db: Session = None
    ) -> bool:
        """
        개별 툴 설정 업데이트 (ServerStatusService 패턴)
        
        Args:
            project_id: 프로젝트 ID
            server_id: 서버 ID
            tool_name: 툴 이름
            is_enabled: 활성화 여부
            db: 데이터베이스 세션 (선택적)
            
        Returns:
            bool: 업데이트 성공 여부
        """
        # 🔄 ServerStatusService와 동일한 DB 세션 관리 패턴
        should_close_db = False
        if db is None:
            db = next(get_db())
            should_close_db = True
            
        try:
            # 기존 설정 조회 또는 생성
            preference = db.query(ToolPreference).filter(
                and_(
                    ToolPreference.project_id == project_id,
                    ToolPreference.server_id == server_id,
                    ToolPreference.tool_name == tool_name
                )
            ).first()
            
            if preference:
                # 기존 설정 업데이트
                old_value = preference.is_enabled
                preference.is_enabled = is_enabled
                preference.updated_at = time.time()
                
                logger.info(f"📝 [TOOL_FILTERING] Updated tool preference: {tool_name} ({old_value} → {is_enabled}) for server {server_id}")
            else:
                # 새 설정 생성
                preference = ToolPreference(
                    project_id=project_id,
                    server_id=server_id,
                    tool_name=tool_name,
                    is_enabled=is_enabled
                )
                db.add(preference)
                
                logger.info(f"📝 [TOOL_FILTERING] Created new tool preference: {tool_name} (enabled={is_enabled}) for server {server_id}")
            
            db.commit()
            
            # 📊 ServerStatusService 스타일 메트릭 로깅
            logger.info(f"📈 [METRICS] Tool preference updated: {project_id}/{server_id}/{tool_name} = {is_enabled}")
            
            return True
            
        except Exception as e:
            logger.error(f"❌ [TOOL_FILTERING] Error updating tool preference: {e}")
            db.rollback()
            return False
            
        finally:
            if should_close_db:
                db.close()
    
    @staticmethod
    async def bulk_update_tool_preferences(
        project_id: UUID,
        preferences: List[Dict[str, Any]],
        db: Session = None
    ) -> int:
        """
        툴 설정 일괄 업데이트
        
        Args:
            project_id: 프로젝트 ID
            preferences: [{"server_id": UUID, "tool_name": str, "is_enabled": bool}, ...]
            db: 데이터베이스 세션 (선택적)
            
        Returns:
            int: 업데이트된 설정 개수
        """
        # 🔄 ServerStatusService와 동일한 DB 세션 관리 패턴
        should_close_db = False
        if db is None:
            db = next(get_db())
            should_close_db = True
            
        try:
            updated_count = 0
            
            for pref_data in preferences:
                server_id = pref_data['server_id']
                tool_name = pref_data['tool_name']
                is_enabled = pref_data['is_enabled']
                
                success = await ToolFilteringService.update_tool_preference(
                    project_id=project_id,
                    server_id=server_id,
                    tool_name=tool_name,
                    is_enabled=is_enabled,
                    db=db  # 동일한 세션 재사용
                )
                
                if success:
                    updated_count += 1
            
            # 📊 ServerStatusService 스타일 메트릭 로깅
            logger.info(f"📈 [METRICS] Bulk tool preferences update: {updated_count}/{len(preferences)} successful for project {project_id}")
            
            return updated_count
            
        except Exception as e:
            logger.error(f"❌ [TOOL_FILTERING] Error in bulk update: {e}")
            return 0
            
        finally:
            if should_close_db:
                db.close()
    
    @staticmethod
    async def invalidate_cache(
        project_id: UUID,
        server_id: Optional[UUID] = None
    ):
        """
        툴 필터링 캐시 무효화 (향후 캐싱 시스템 연동용)
        
        Args:
            project_id: 프로젝트 ID
            server_id: 서버 ID (None이면 프로젝트 전체)
        """
        try:
            # 현재는 로깅만, 향후 Redis나 Materialized View 연동 시 확장
            if server_id:
                logger.info(f"🔄 [CACHE] Tool filtering cache invalidated for server {server_id} in project {project_id}")
            else:
                logger.info(f"🔄 [CACHE] Tool filtering cache invalidated for all servers in project {project_id}")
                
            # 📊 ServerStatusService 스타일 메트릭 로깅
            logger.info(f"📈 [METRICS] Cache invalidation completed for project {project_id}")
            
            # TODO: 향후 구현 예정
            # - MCP 세션 매니저 캐시 무효화
            # - Materialized View 새로고침
            # - 활성 SSE 연결에 업데이트 알림
            
        except Exception as e:
            logger.error(f"❌ [CACHE] Cache invalidation failed: {e}")
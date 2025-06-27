"""
Tool Preferences API - 프로젝트별 툴 사용 설정 관리

기존 JWT 인증 패턴을 따르는 API 엔드포인트
"""

from typing import List, Optional, Dict, Any
from uuid import UUID
import logging

from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session
from pydantic import BaseModel, Field

from ..database import get_db
from ..models import Project, ProjectMember, User, McpServer, ToolPreference
from ..models.project import ProjectRole
from .jwt_auth import get_user_from_jwt_token
from ..services.tool_filtering_service import ToolFilteringService
from ..services.cache_invalidation_service import CacheInvalidationService

router = APIRouter(prefix="/api", tags=["tool-preferences"])
logger = logging.getLogger(__name__)


# Pydantic 모델들
class ToolPreferenceResponse(BaseModel):
    """툴 설정 응답 모델"""
    server_id: str
    server_name: str
    tool_name: str
    is_enabled: bool
    created_at: Optional[str] = None
    updated_at: Optional[str] = None

    class Config:
        from_attributes = True


class ToolPreferenceUpdate(BaseModel):
    """툴 설정 업데이트 모델"""
    server_id: UUID = Field(..., description="서버 ID")
    tool_name: str = Field(..., min_length=1, max_length=255, description="툴 이름")
    is_enabled: bool = Field(..., description="활성화 여부")


class BulkToolPreferenceUpdate(BaseModel):
    """툴 설정 일괄 업데이트 모델"""
    preferences: List[ToolPreferenceUpdate] = Field(..., description="업데이트할 설정 목록")


# 사용자 인증 dependency 함수 (기존 패턴)
async def get_current_user_for_tool_preferences(
    request: Request,
    db: Session = Depends(get_db)
) -> User:
    """툴 설정 API용 사용자 인증 함수"""
    user = await get_user_from_jwt_token(request, db)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required"
        )
    return user


def check_project_access(
    project_id: UUID,
    user: User,
    required_role: ProjectRole,
    db: Session
) -> Project:
    """프로젝트 접근 권한 확인 (기존 패턴)"""
    # 프로젝트 존재 확인
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project not found"
        )
    
    # 프로젝트 멤버십 확인
    project_member = db.query(ProjectMember).filter(
        ProjectMember.project_id == project_id,
        ProjectMember.user_id == user.id
    ).first()
    
    if not project_member:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied: Not a project member"
        )
    
    # 역할 권한 확인
    role_hierarchy = {
        ProjectRole.REPORTER: 0,
        ProjectRole.DEVELOPER: 1,
        ProjectRole.OWNER: 2,
    }
    
    user_role_level = role_hierarchy.get(project_member.role, -1)
    required_role_level = role_hierarchy.get(required_role, 999)
    
    if user_role_level < required_role_level:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Access denied: {required_role.value} role required"
        )
    
    return project


@router.get("/projects/{project_id}/tool-preferences", response_model=List[ToolPreferenceResponse])
async def get_tool_preferences(
    project_id: UUID,
    server_id: Optional[UUID] = None,
    current_user: User = Depends(get_current_user_for_tool_preferences),
    db: Session = Depends(get_db)
):
    """
    프로젝트의 툴 사용 설정 조회
    
    Args:
        project_id: 프로젝트 ID
        server_id: 특정 서버 ID (선택적)
    """
    # 프로젝트 접근 권한 확인 (REPORTER 이상)
    project = check_project_access(project_id, current_user, ProjectRole.REPORTER, db)
    
    try:
        # 기본 쿼리
        query = db.query(ToolPreference, McpServer).join(
            McpServer, ToolPreference.server_id == McpServer.id
        ).filter(
            ToolPreference.project_id == project_id
        )
        
        # 특정 서버 필터링
        if server_id:
            query = query.filter(ToolPreference.server_id == server_id)
        
        preferences = query.all()
        
        # 응답 데이터 구성
        result = []
        for pref, server in preferences:
            result.append(ToolPreferenceResponse(
                server_id=str(pref.server_id),
                server_name=server.name,
                tool_name=pref.tool_name,
                is_enabled=pref.is_enabled,
                created_at=pref.created_at.isoformat() if pref.created_at else None,
                updated_at=pref.updated_at.isoformat() if pref.updated_at else None
            ))
        
        logger.info(f"📋 [TOOL_PREFERENCES] Loaded {len(result)} preferences for project {project_id}")
        return result
        
    except Exception as e:
        logger.error(f"❌ [TOOL_PREFERENCES] Error loading preferences: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to load tool preferences"
        )


@router.put("/projects/{project_id}/tool-preferences/{server_id}/{tool_name}")
async def update_tool_preference(
    project_id: UUID,
    server_id: UUID,
    tool_name: str,
    update_data: Dict[str, bool],  # {"is_enabled": true/false}
    current_user: User = Depends(get_current_user_for_tool_preferences),
    db: Session = Depends(get_db)
):
    """
    개별 툴 설정 업데이트
    
    Args:
        project_id: 프로젝트 ID
        server_id: 서버 ID
        tool_name: 툴 이름
        update_data: {"is_enabled": bool}
    """
    # 프로젝트 접근 권한 확인 (DEVELOPER 이상)
    project = check_project_access(project_id, current_user, ProjectRole.DEVELOPER, db)
    
    # 서버 존재 확인
    server = db.query(McpServer).filter(
        McpServer.id == server_id,
        McpServer.project_id == project_id
    ).first()
    
    if not server:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Server not found in this project"
        )
    
    is_enabled = update_data.get("is_enabled")
    if is_enabled is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="is_enabled field is required"
        )
    
    try:
        # ToolFilteringService를 통한 업데이트
        success = await ToolFilteringService.update_tool_preference(
            project_id=project_id,
            server_id=server_id,
            tool_name=tool_name,
            is_enabled=is_enabled,
            db=db
        )
        
        if not success:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to update tool preference"
            )
        
        # 캐시 무효화
        await CacheInvalidationService.on_user_preference_changed(
            project_id=project_id,
            server_id=server_id,
            tool_name=tool_name
        )
        
        logger.info(f"📝 [TOOL_PREFERENCES] Updated {tool_name} = {is_enabled} for server {server_id}")
        
        return {"success": True, "message": f"Tool preference updated: {tool_name}"}
        
    except Exception as e:
        logger.error(f"❌ [TOOL_PREFERENCES] Error updating preference: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update tool preference"
        )


@router.put("/projects/{project_id}/tool-preferences")
async def bulk_update_tool_preferences(
    project_id: UUID,
    update_data: BulkToolPreferenceUpdate,
    current_user: User = Depends(get_current_user_for_tool_preferences),
    db: Session = Depends(get_db)
):
    """
    툴 설정 일괄 업데이트
    
    Args:
        project_id: 프로젝트 ID
        update_data: 업데이트할 설정 목록
    """
    # 프로젝트 접근 권한 확인 (DEVELOPER 이상)
    project = check_project_access(project_id, current_user, ProjectRole.DEVELOPER, db)
    
    try:
        # 서버 ID 유효성 검증
        server_ids = [pref.server_id for pref in update_data.preferences]
        valid_servers = db.query(McpServer).filter(
            McpServer.id.in_(server_ids),
            McpServer.project_id == project_id
        ).all()
        
        valid_server_ids = {server.id for server in valid_servers}
        invalid_server_ids = set(server_ids) - valid_server_ids
        
        if invalid_server_ids:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid server IDs: {list(invalid_server_ids)}"
            )
        
        # 일괄 업데이트 실행
        preferences_data = [
            {
                "server_id": pref.server_id,
                "tool_name": pref.tool_name,
                "is_enabled": pref.is_enabled
            }
            for pref in update_data.preferences
        ]
        
        updated_count = await ToolFilteringService.bulk_update_tool_preferences(
            project_id=project_id,
            preferences=preferences_data,
            db=db
        )
        
        # 영향받은 서버들의 캐시 무효화
        affected_servers = set(pref.server_id for pref in update_data.preferences)
        for server_id in affected_servers:
            await CacheInvalidationService.invalidate_tool_caches(
                project_id=project_id,
                server_id=server_id,
                invalidation_type="bulk_update"
            )
        
        logger.info(f"📝 [TOOL_PREFERENCES] Bulk updated {updated_count}/{len(update_data.preferences)} preferences")
        
        return {
            "success": True,
            "updated_count": updated_count,
            "total_count": len(update_data.preferences),
            "message": f"Bulk update completed: {updated_count} preferences updated"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ [TOOL_PREFERENCES] Error in bulk update: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to bulk update tool preferences"
        )


@router.delete("/projects/{project_id}/tool-preferences/{server_id}/{tool_name}")
async def delete_tool_preference(
    project_id: UUID,
    server_id: UUID,
    tool_name: str,
    current_user: User = Depends(get_current_user_for_tool_preferences),
    db: Session = Depends(get_db)
):
    """
    툴 설정 삭제 (기본값으로 복원)
    
    Args:
        project_id: 프로젝트 ID
        server_id: 서버 ID  
        tool_name: 툴 이름
    """
    # 프로젝트 접근 권한 확인 (DEVELOPER 이상)
    project = check_project_access(project_id, current_user, ProjectRole.DEVELOPER, db)
    
    try:
        # 설정 삭제
        deleted_count = db.query(ToolPreference).filter(
            ToolPreference.project_id == project_id,
            ToolPreference.server_id == server_id,
            ToolPreference.tool_name == tool_name
        ).delete()
        
        db.commit()
        
        if deleted_count == 0:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Tool preference not found"
            )
        
        # 캐시 무효화
        await CacheInvalidationService.on_user_preference_changed(
            project_id=project_id,
            server_id=server_id,
            tool_name=tool_name
        )
        
        logger.info(f"🗑️ [TOOL_PREFERENCES] Deleted preference for {tool_name} (reset to default)")
        
        return {"success": True, "message": f"Tool preference deleted: {tool_name} (reset to default)"}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ [TOOL_PREFERENCES] Error deleting preference: {e}")
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to delete tool preference"
        )
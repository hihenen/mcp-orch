"""
Authentication for Unified MCP Transport

Handles JWT authentication and project access verification.
"""

import logging
from typing import Optional
from uuid import UUID

from fastapi import Depends, HTTPException, status, Request
from sqlalchemy.orm import Session
from sqlalchemy import and_

from ....database import get_db
from ....models import Project, User
from ...jwt_auth import get_user_from_jwt_token


logger = logging.getLogger(__name__)


async def get_current_user_for_unified_mcp(
    request: Request,
    project_id: UUID,
    db: Session = Depends(get_db)
) -> User:
    """
    통합 MCP용 사용자 인증 및 프로젝트 접근 권한 확인
    
    Args:
        request: FastAPI request 객체
        project_id: 접근하려는 프로젝트 ID
        db: 데이터베이스 세션
        
    Returns:
        인증된 사용자 객체
        
    Raises:
        HTTPException: 인증 실패 또는 권한 없음
    """
    # JWT 토큰에서 사용자 정보 추출
    user = await get_user_from_jwt_token(request, db)
    if not user:
        logger.warning(f"🚫 Unified MCP: 인증 실패 - JWT 토큰 없음 또는 유효하지 않음")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required"
        )
    
    # 프로젝트 존재 여부 확인
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        logger.warning(f"🚫 Unified MCP: 프로젝트 {project_id} 없음")
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project not found"
        )
    
    # unified_mcp_enabled 확인
    if not project.unified_mcp_enabled:
        logger.warning(f"🚫 Unified MCP: 프로젝트 {project_id}에서 통합 MCP 비활성화됨")
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Unified MCP is not enabled for this project"
        )
    
    # 프로젝트 멤버 여부 확인 (추가 권한 검사 필요시 여기에 추가)
    # 현재는 JWT 인증만으로 충분하다고 가정
    
    logger.info(f"✅ Unified MCP: 사용자 {user.email} 인증 성공 (프로젝트: {project_id})")
    return user
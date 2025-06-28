"""
프로젝트 즐겨찾기 관리 API
서버/도구 즐겨찾기 추가, 삭제, 조회 기능
"""

from typing import List, Optional
from uuid import UUID
from datetime import datetime
import logging

from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session
from sqlalchemy import and_
from pydantic import BaseModel, Field

from ...database import get_db
from ...models import Project, ProjectMember, User, ProjectRole
from ...models.favorite import UserFavorite
from ..jwt_auth import get_user_from_jwt_token

router = APIRouter()
logger = logging.getLogger(__name__)


# Pydantic Models
class FavoriteCreate(BaseModel):
    favorite_type: str = Field(..., description="즐겨찾기 유형 (server, tool)")
    target_id: str = Field(..., description="대상 ID (서버 ID 또는 도구 ID)")
    target_name: str = Field(..., description="대상 이름")


class FavoriteResponse(BaseModel):
    id: str
    favorite_type: str
    target_id: str
    target_name: str
    created_at: datetime
    
    class Config:
        from_attributes = True


# Dependency Functions
async def get_current_user_for_favorites(request: Request, db: Session = Depends(get_db)) -> User:
    """즐겨찾기 관리용 사용자 인증"""
    user = await get_user_from_jwt_token(request, db)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required"
        )
    return user


def verify_project_access(project_id: UUID, user: User, db: Session) -> Project:
    """프로젝트 접근 권한 확인"""
    # 프로젝트 멤버십 확인
    project_member = db.query(ProjectMember).filter(
        and_(
            ProjectMember.project_id == project_id,
            ProjectMember.user_id == user.id
        )
    ).first()
    
    if not project_member:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have access to this project"
        )
    
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project not found"
        )
    
    return project


# API Endpoints
@router.get("/projects/{project_id}/favorites", response_model=List[FavoriteResponse])
async def get_project_favorites(
    project_id: UUID,
    favorite_type: Optional[str] = None,
    current_user: User = Depends(get_current_user_for_favorites),
    db: Session = Depends(get_db)
):
    """프로젝트 즐겨찾기 목록 조회"""
    
    # 프로젝트 접근 권한 확인
    verify_project_access(project_id, current_user, db)
    
    # 즐겨찾기 조회
    query = db.query(UserFavorite).filter(
        and_(
            UserFavorite.user_id == current_user.id,
            UserFavorite.project_id == project_id
        )
    )
    
    if favorite_type:
        query = query.filter(UserFavorite.favorite_type == favorite_type)
    
    favorites = query.order_by(UserFavorite.created_at.desc()).all()
    
    logger.info(f"Retrieved {len(favorites)} favorites for project {project_id}")
    
    return [
        FavoriteResponse(
            id=str(favorite.id),
            favorite_type=favorite.favorite_type,
            target_id=favorite.target_id,
            target_name=favorite.target_name,
            created_at=favorite.created_at
        )
        for favorite in favorites
    ]


@router.post("/projects/{project_id}/favorites", response_model=FavoriteResponse)
async def add_project_favorite(
    project_id: UUID,
    favorite_data: FavoriteCreate,
    current_user: User = Depends(get_current_user_for_favorites),
    db: Session = Depends(get_db)
):
    """프로젝트 즐겨찾기 추가"""
    
    # 프로젝트 접근 권한 확인
    verify_project_access(project_id, current_user, db)
    
    # 중복 즐겨찾기 확인
    existing_favorite = db.query(UserFavorite).filter(
        and_(
            UserFavorite.user_id == current_user.id,
            UserFavorite.project_id == project_id,
            UserFavorite.favorite_type == favorite_data.favorite_type,
            UserFavorite.target_id == favorite_data.target_id
        )
    ).first()
    
    if existing_favorite:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="This item is already in your favorites"
        )
    
    # 새 즐겨찾기 생성
    new_favorite = UserFavorite(
        user_id=current_user.id,
        project_id=project_id,
        favorite_type=favorite_data.favorite_type,
        target_id=favorite_data.target_id,
        target_name=favorite_data.target_name
    )
    
    db.add(new_favorite)
    db.commit()
    db.refresh(new_favorite)
    
    logger.info(f"Added favorite {favorite_data.target_name} for user {current_user.id}")
    
    return FavoriteResponse(
        id=str(new_favorite.id),
        favorite_type=new_favorite.favorite_type,
        target_id=new_favorite.target_id,
        target_name=new_favorite.target_name,
        created_at=new_favorite.created_at
    )


@router.delete("/projects/{project_id}/favorites/{favorite_id}")
async def remove_project_favorite(
    project_id: UUID,
    favorite_id: UUID,
    current_user: User = Depends(get_current_user_for_favorites),
    db: Session = Depends(get_db)
):
    """프로젝트 즐겨찾기 제거"""
    
    # 프로젝트 접근 권한 확인
    verify_project_access(project_id, current_user, db)
    
    # 즐겨찾기 조회
    favorite = db.query(UserFavorite).filter(
        and_(
            UserFavorite.id == favorite_id,
            UserFavorite.user_id == current_user.id,
            UserFavorite.project_id == project_id
        )
    ).first()
    
    if not favorite:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Favorite not found"
        )
    
    # 즐겨찾기 삭제
    db.delete(favorite)
    db.commit()
    
    logger.info(f"Removed favorite {favorite.target_name} for user {current_user.id}")
    
    return {"message": "Favorite removed successfully"}


@router.delete("/projects/{project_id}/favorites")
async def remove_project_favorite_by_target(
    project_id: UUID,
    favorite_type: str,
    target_id: str,
    current_user: User = Depends(get_current_user_for_favorites),
    db: Session = Depends(get_db)
):
    """타겟 정보로 프로젝트 즐겨찾기 제거"""
    
    # 프로젝트 접근 권한 확인
    verify_project_access(project_id, current_user, db)
    
    # 즐겨찾기 조회
    favorite = db.query(UserFavorite).filter(
        and_(
            UserFavorite.user_id == current_user.id,
            UserFavorite.project_id == project_id,
            UserFavorite.favorite_type == favorite_type,
            UserFavorite.target_id == target_id
        )
    ).first()
    
    if not favorite:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Favorite not found"
        )
    
    # 즐겨찾기 삭제
    db.delete(favorite)
    db.commit()
    
    logger.info(f"Removed favorite {favorite.target_name} for user {current_user.id}")
    
    return {"message": "Favorite removed successfully"}
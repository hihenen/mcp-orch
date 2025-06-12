"""
프로젝트 즐겨찾기 관리 API
즐겨찾기 추가, 제거, 조회 등
"""

from typing import List, Optional
from uuid import UUID
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session
from sqlalchemy import and_
from pydantic import BaseModel, Field

from ..database import get_db
from ..models import Project, ProjectMember, User, UserFavorite
from .jwt_auth import get_user_from_jwt_token

router = APIRouter(prefix="/api", tags=["project-favorites"])


# Pydantic 모델들
class FavoriteCreate(BaseModel):
    favorite_type: str = Field(..., pattern="^(server|tool|project)$")
    target_id: str = Field(..., min_length=1, max_length=255)
    target_name: str = Field(..., min_length=1, max_length=255)


class FavoriteResponse(BaseModel):
    id: str
    favorite_type: str
    target_id: str
    target_name: str
    created_at: datetime
    
    class Config:
        from_attributes = True


# 사용자 인증 dependency 함수
async def get_current_user_for_project_favorites(
    request: Request,
    db: Session = Depends(get_db)
) -> User:
    """프로젝트 즐겨찾기 API용 사용자 인증 함수"""
    user = await get_user_from_jwt_token(request, db)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required"
        )
    return user


# 즐겨찾기 관리 API
@router.get("/projects/{project_id}/favorites", response_model=List[FavoriteResponse])
async def list_project_favorites(
    project_id: UUID,
    favorite_type: Optional[str] = None,  # Query parameter for filtering
    current_user: User = Depends(get_current_user_for_project_favorites),
    db: Session = Depends(get_db)
):
    """프로젝트별 사용자 즐겨찾기 목록 조회"""
    
    # 프로젝트 접근 권한 확인
    project_member = db.query(ProjectMember).filter(
        and_(
            ProjectMember.project_id == project_id,
            ProjectMember.user_id == current_user.id
        )
    ).first()
    
    if not project_member:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project not found or access denied"
        )
    
    # 즐겨찾기 목록 조회 (프로젝트별, 사용자별)
    query = db.query(UserFavorite).filter(
        and_(
            UserFavorite.user_id == current_user.id,
            UserFavorite.project_id == project_id
        )
    )
    
    # 타입별 필터링
    if favorite_type:
        if favorite_type not in ["server", "tool", "project"]:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid favorite_type. Must be 'server', 'tool', or 'project'"
            )
        query = query.filter(UserFavorite.favorite_type == favorite_type)
    
    favorites = query.order_by(UserFavorite.created_at.desc()).all()
    
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
    current_user: User = Depends(get_current_user_for_project_favorites),
    db: Session = Depends(get_db)
):
    """프로젝트별 즐겨찾기 추가"""
    
    # 프로젝트 접근 권한 확인
    project_member = db.query(ProjectMember).filter(
        and_(
            ProjectMember.project_id == project_id,
            ProjectMember.user_id == current_user.id
        )
    ).first()
    
    if not project_member:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project not found or access denied"
        )
    
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
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="This item is already in your favorites"
        )
    
    # 즐겨찾기 추가
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
    current_user: User = Depends(get_current_user_for_project_favorites),
    db: Session = Depends(get_db)
):
    """프로젝트별 즐겨찾기 제거"""
    
    # 프로젝트 접근 권한 확인
    project_member = db.query(ProjectMember).filter(
        and_(
            ProjectMember.project_id == project_id,
            ProjectMember.user_id == current_user.id
        )
    ).first()
    
    if not project_member:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project not found or access denied"
        )
    
    # 즐겨찾기 조회 (본인의 즐겨찾기만)
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
    
    # 즐겨찾기 제거
    db.delete(favorite)
    db.commit()
    
    return {"message": "Favorite removed successfully"}


@router.delete("/projects/{project_id}/favorites")
async def remove_project_favorite_by_target(
    project_id: UUID,
    favorite_type: str,
    target_id: str,
    current_user: User = Depends(get_current_user_for_project_favorites),
    db: Session = Depends(get_db)
):
    """프로젝트별 즐겨찾기 제거 (타입과 대상 ID로)"""
    
    # 타입 검증
    if favorite_type not in ["server", "tool", "project"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid favorite_type. Must be 'server', 'tool', or 'project'"
        )
    
    # 프로젝트 접근 권한 확인
    project_member = db.query(ProjectMember).filter(
        and_(
            ProjectMember.project_id == project_id,
            ProjectMember.user_id == current_user.id
        )
    ).first()
    
    if not project_member:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project not found or access denied"
        )
    
    # 즐겨찾기 조회 및 삭제
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
    
    # 즐겨찾기 제거
    db.delete(favorite)
    db.commit()
    
    return {"message": "Favorite removed successfully"}

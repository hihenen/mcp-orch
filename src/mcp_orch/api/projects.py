"""
프로젝트 중심 API 엔드포인트
독립적인 프로젝트 단위 협업 시스템
"""

from typing import List, Optional
from uuid import UUID
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_
from pydantic import BaseModel, Field

from ..database import get_db
from ..models import Project, ProjectMember, User, McpServer, ApiKey, ProjectRole, InviteSource, UserFavorite
from .jwt_auth import get_user_from_jwt_token
from ..services.mcp_connection_service import mcp_connection_service
from ..config_parser import load_mcp_config

router = APIRouter(prefix="/api", tags=["projects"])


# Pydantic 모델들
class ProjectCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    description: Optional[str] = None
    slug: str = Field(..., min_length=1, max_length=100)


class ProjectUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=255)
    description: Optional[str] = None


class ProjectMemberCreate(BaseModel):
    user_id: UUID
    role: ProjectRole = ProjectRole.DEVELOPER
    invited_as: InviteSource = InviteSource.INDIVIDUAL


class ProjectMemberUpdate(BaseModel):
    role: ProjectRole


class ProjectResponse(BaseModel):
    id: str
    name: str
    description: Optional[str]
    slug: str
    created_by: str
    created_at: datetime
    updated_at: datetime
    member_count: int
    server_count: int
    
    class Config:
        from_attributes = True


class ProjectMemberResponse(BaseModel):
    id: str
    user_id: str
    user_name: str
    user_email: str
    role: ProjectRole
    invited_as: InviteSource
    invited_by: str
    joined_at: datetime
    
    class Config:
        from_attributes = True


class ProjectDetailResponse(ProjectResponse):
    members: List[ProjectMemberResponse]
    recent_activity: List[dict] = []  # 향후 구현
    
    class Config:
        from_attributes = True


# 사용자 인증 dependency 함수
async def get_current_user_for_projects(
    request: Request,
    db: Session = Depends(get_db)
) -> User:
    """프로젝트 API용 사용자 인증 함수"""
    user = await get_user_from_jwt_token(request, db)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required"
        )
    return user

# 프로젝트 관리 API
@router.get("/projects", response_model=List[ProjectResponse])
async def list_user_projects(
    current_user: User = Depends(get_current_user_for_projects),
    db: Session = Depends(get_db)
):
    """사용자가 참여한 모든 프로젝트 목록 조회"""
    
    # 사용자가 멤버로 참여한 프로젝트들 조회
    projects = db.query(Project).join(ProjectMember).filter(
        ProjectMember.user_id == current_user.id
    ).all()
    
    result = []
    for project in projects:
        member_count = db.query(ProjectMember).filter(
            ProjectMember.project_id == project.id
        ).count()
        
        server_count = db.query(McpServer).filter(
            McpServer.project_id == project.id
        ).count()
        
        result.append(ProjectResponse(
            id=str(project.id),
            name=project.name,
            description=project.description,
            slug=project.slug,
            created_by=str(project.created_by),
            created_at=project.created_at,
            updated_at=project.updated_at,
            member_count=member_count,
            server_count=server_count
        ))
    
    return result


@router.post("/projects", response_model=ProjectResponse)
async def create_project(
    project_data: ProjectCreate,
    current_user: User = Depends(get_current_user_for_projects),
    db: Session = Depends(get_db)
):
    """새 프로젝트 생성"""
    
    # slug 중복 확인
    existing_project = db.query(Project).filter(Project.slug == project_data.slug).first()
    if existing_project:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Project slug already exists"
        )
    
    # 프로젝트 생성
    project = Project(
        name=project_data.name,
        description=project_data.description,
        slug=project_data.slug,
        created_by=current_user.id
    )
    
    db.add(project)
    db.flush()  # ID 생성을 위해 flush
    
    # 생성자를 Owner로 자동 추가
    project_member = ProjectMember(
        project_id=project.id,
        user_id=current_user.id,
        role=ProjectRole.OWNER,
        invited_as=InviteSource.INDIVIDUAL,
        invited_by=current_user.id
    )
    
    db.add(project_member)
    db.commit()
    db.refresh(project)
    
    return ProjectResponse(
        id=str(project.id),
        name=project.name,
        description=project.description,
        slug=project.slug,
        created_by=str(project.created_by),
        created_at=project.created_at,
        updated_at=project.updated_at,
        member_count=1,
        server_count=0
    )


@router.get("/projects/{project_id}", response_model=ProjectDetailResponse)
async def get_project_detail(
    project_id: UUID,
    current_user: User = Depends(get_current_user_for_projects),
    db: Session = Depends(get_db)
):
    """프로젝트 상세 정보 조회"""
    
    # 프로젝트 존재 확인 및 접근 권한 확인
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
    
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project not found"
        )
    
    # 프로젝트 멤버 목록 조회
    members_query = db.query(ProjectMember, User).join(
        User, ProjectMember.user_id == User.id
    ).filter(ProjectMember.project_id == project_id)
    
    members = []
    for member, user in members_query:
        members.append(ProjectMemberResponse(
            id=str(member.id),
            user_id=str(member.user_id),
            user_name=user.name,
            user_email=user.email,
            role=member.role,
            invited_as=member.invited_as,
            invited_by=str(member.invited_by),
            joined_at=member.joined_at
        ))
    
    # 서버 개수 조회
    server_count = db.query(McpServer).filter(
        McpServer.project_id == project_id
    ).count()
    
    return ProjectDetailResponse(
        id=str(project.id),
        name=project.name,
        description=project.description,
        slug=project.slug,
        created_by=str(project.created_by),
        created_at=project.created_at,
        updated_at=project.updated_at,
        member_count=len(members),
        server_count=server_count,
        members=members,
        recent_activity=[]  # 향후 구현
    )


@router.put("/projects/{project_id}", response_model=ProjectResponse)
async def update_project(
    project_id: UUID,
    project_data: ProjectUpdate,
    current_user: User = Depends(get_current_user_for_projects),
    db: Session = Depends(get_db)
):
    """프로젝트 정보 수정 (Owner만 가능)"""
    
    # 프로젝트 Owner 권한 확인
    project_member = db.query(ProjectMember).filter(
        and_(
            ProjectMember.project_id == project_id,
            ProjectMember.user_id == current_user.id,
            ProjectMember.role == ProjectRole.OWNER
        )
    ).first()
    
    if not project_member:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only project owners can update project information"
        )
    
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project not found"
        )
    
    # 프로젝트 정보 업데이트
    if project_data.name is not None:
        project.name = project_data.name
    if project_data.description is not None:
        project.description = project_data.description
    
    project.updated_at = datetime.utcnow()
    
    db.commit()
    db.refresh(project)
    
    # 통계 정보 조회
    member_count = db.query(ProjectMember).filter(
        ProjectMember.project_id == project_id
    ).count()
    
    server_count = db.query(McpServer).filter(
        McpServer.project_id == project_id
    ).count()
    
    return ProjectResponse(
        id=str(project.id),
        name=project.name,
        description=project.description,
        slug=project.slug,
        created_by=str(project.created_by),
        created_at=project.created_at,
        updated_at=project.updated_at,
        member_count=member_count,
        server_count=server_count
    )


@router.delete("/projects/{project_id}")
async def delete_project(
    project_id: UUID,
    current_user: User = Depends(get_current_user_for_projects),
    db: Session = Depends(get_db)
):
    """프로젝트 삭제 (Owner만 가능)"""
    
    # 프로젝트 Owner 권한 확인
    project_member = db.query(ProjectMember).filter(
        and_(
            ProjectMember.project_id == project_id,
            ProjectMember.user_id == current_user.id,
            ProjectMember.role == ProjectRole.OWNER
        )
    ).first()
    
    if not project_member:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only project owners can delete projects"
        )
    
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project not found"
        )
    
    # 프로젝트 삭제 (CASCADE로 관련 데이터도 함께 삭제됨)
    db.delete(project)
    db.commit()
    
    return {"message": "Project deleted successfully"}


# 프로젝트 멤버 관리 API
@router.get("/projects/{project_id}/members", response_model=List[ProjectMemberResponse])
async def list_project_members(
    project_id: UUID,
    current_user: User = Depends(get_current_user_for_projects),
    db: Session = Depends(get_db)
):
    """프로젝트 멤버 목록 조회"""
    
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
    
    # 멤버 목록 조회
    members_query = db.query(ProjectMember, User).join(
        User, ProjectMember.user_id == User.id
    ).filter(ProjectMember.project_id == project_id)
    
    members = []
    for member, user in members_query:
        members.append(ProjectMemberResponse(
            id=str(member.id),
            user_id=str(member.user_id),
            user_name=user.name,
            user_email=user.email,
            role=member.role,
            invited_as=member.invited_as,
            invited_by=str(member.invited_by),
            joined_at=member.joined_at
        ))
    
    return members


@router.post("/projects/{project_id}/members", response_model=ProjectMemberResponse)
async def add_project_member(
    project_id: UUID,
    member_data: ProjectMemberCreate,
    current_user: User = Depends(get_current_user_for_projects),
    db: Session = Depends(get_db)
):
    """프로젝트에 멤버 추가 (Owner/Developer만 가능)"""
    
    # 프로젝트 권한 확인 (Owner 또는 Developer)
    project_member = db.query(ProjectMember).filter(
        and_(
            ProjectMember.project_id == project_id,
            ProjectMember.user_id == current_user.id,
            or_(
                ProjectMember.role == ProjectRole.OWNER,
                ProjectMember.role == ProjectRole.DEVELOPER
            )
        )
    ).first()
    
    if not project_member:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only project owners and developers can add members"
        )
    
    # 사용자 존재 확인
    user = db.query(User).filter(User.id == member_data.user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    # 이미 멤버인지 확인
    existing_member = db.query(ProjectMember).filter(
        and_(
            ProjectMember.project_id == project_id,
            ProjectMember.user_id == member_data.user_id
        )
    ).first()
    
    if existing_member:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User is already a member of this project"
        )
    
    # 멤버 추가
    new_member = ProjectMember(
        project_id=project_id,
        user_id=member_data.user_id,
        role=member_data.role,
        invited_as=member_data.invited_as,
        invited_by=current_user.id
    )
    
    db.add(new_member)
    db.commit()
    db.refresh(new_member)
    
    return ProjectMemberResponse(
        id=str(new_member.id),
        user_id=str(new_member.user_id),
        user_name=user.name,
        user_email=user.email,
        role=new_member.role,
        invited_as=new_member.invited_as,
        invited_by=str(new_member.invited_by),
        joined_at=new_member.joined_at
    )


@router.put("/projects/{project_id}/members/{member_id}", response_model=ProjectMemberResponse)
async def update_project_member(
    project_id: UUID,
    member_id: UUID,
    member_data: ProjectMemberUpdate,
    current_user: User = Depends(get_current_user_for_projects),
    db: Session = Depends(get_db)
):
    """프로젝트 멤버 역할 변경 (Owner만 가능)"""
    
    # 프로젝트 Owner 권한 확인
    project_owner = db.query(ProjectMember).filter(
        and_(
            ProjectMember.project_id == project_id,
            ProjectMember.user_id == current_user.id,
            ProjectMember.role == ProjectRole.OWNER
        )
    ).first()
    
    if not project_owner:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only project owners can update member roles"
        )
    
    # 멤버 조회
    member = db.query(ProjectMember).filter(
        and_(
            ProjectMember.id == member_id,
            ProjectMember.project_id == project_id
        )
    ).first()
    
    if not member:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project member not found"
        )
    
    # 자기 자신의 Owner 권한은 변경할 수 없음
    if member.user_id == current_user.id and member.role == ProjectRole.OWNER:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot change your own owner role"
        )
    
    # 역할 업데이트
    member.role = member_data.role
    db.commit()
    db.refresh(member)
    
    # 사용자 정보 조회
    user = db.query(User).filter(User.id == member.user_id).first()
    
    return ProjectMemberResponse(
        id=str(member.id),
        user_id=str(member.user_id),
        user_name=user.name,
        user_email=user.email,
        role=member.role,
        invited_as=member.invited_as,
        invited_by=str(member.invited_by),
        joined_at=member.joined_at
    )


@router.delete("/projects/{project_id}/members/{member_id}")
async def remove_project_member(
    project_id: UUID,
    member_id: UUID,
    current_user: User = Depends(get_current_user_for_projects),
    db: Session = Depends(get_db)
):
    """프로젝트에서 멤버 제거 (Owner만 가능)"""
    
    # 프로젝트 Owner 권한 확인
    project_owner = db.query(ProjectMember).filter(
        and_(
            ProjectMember.project_id == project_id,
            ProjectMember.user_id == current_user.id,
            ProjectMember.role == ProjectRole.OWNER
        )
    ).first()
    
    if not project_owner:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only project owners can remove members"
        )
    
    # 멤버 조회
    member = db.query(ProjectMember).filter(
        and_(
            ProjectMember.id == member_id,
            ProjectMember.project_id == project_id
        )
    ).first()
    
    if not member:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project member not found"
        )
    
    # 자기 자신은 제거할 수 없음
    if member.user_id == current_user.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot remove yourself from the project"
        )
    
    # 멤버 제거
    db.delete(member)
    db.commit()
    
    return {"message": "Member removed successfully"}


# 즐겨찾기 관리 API
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


@router.get("/projects/{project_id}/favorites", response_model=List[FavoriteResponse])
async def list_project_favorites(
    project_id: UUID,
    favorite_type: Optional[str] = None,  # Query parameter for filtering
    current_user: User = Depends(get_current_user_for_projects),
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
    current_user: User = Depends(get_current_user_for_projects),
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
    current_user: User = Depends(get_current_user_for_projects),
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


# API 키 관리 API
class ApiKeyCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    description: Optional[str] = None
    expires_at: Optional[datetime] = None


class ApiKeyResponse(BaseModel):
    id: str
    name: str
    description: Optional[str]
    key_prefix: str
    expires_at: Optional[datetime]
    last_used_at: Optional[datetime]
    last_used_ip: Optional[str]
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True


class ApiKeyCreateResponse(BaseModel):
    id: str
    name: str
    description: Optional[str]
    api_key: str  # 전체 키는 생성 시에만 반환
    key_prefix: str
    expires_at: Optional[datetime]
    created_at: datetime
    
    class Config:
        from_attributes = True


@router.get("/projects/{project_id}/api-keys", response_model=List[ApiKeyResponse])
async def list_project_api_keys(
    project_id: UUID,
    current_user: User = Depends(get_current_user_for_projects),
    db: Session = Depends(get_db)
):
    """프로젝트별 API 키 목록 조회"""
    
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
    
    # 프로젝트별 API 키 목록 조회
    api_keys = db.query(ApiKey).filter(
        ApiKey.project_id == project_id
    ).order_by(ApiKey.created_at.desc()).all()
    
    result = []
    for api_key in api_keys:
        result.append(ApiKeyResponse(
            id=str(api_key.id),
            name=api_key.name,
            description=api_key.description,
            key_prefix=api_key.key_prefix or "",
            expires_at=api_key.expires_at,
            last_used_at=api_key.last_used_at,
            last_used_ip=api_key.last_used_ip,
            created_at=api_key.created_at,
            updated_at=api_key.updated_at
        ))
    
    return result


@router.post("/projects/{project_id}/api-keys", response_model=ApiKeyCreateResponse)
async def create_project_api_key(
    project_id: UUID,
    api_key_data: ApiKeyCreate,
    current_user: User = Depends(get_current_user_for_projects),
    db: Session = Depends(get_db)
):
    """프로젝트 API 키 생성 (Owner/Developer만 가능)"""
    
    # 프로젝트 권한 확인 (Owner 또는 Developer)
    project_member = db.query(ProjectMember).filter(
        and_(
            ProjectMember.project_id == project_id,
            ProjectMember.user_id == current_user.id,
            or_(
                ProjectMember.role == ProjectRole.OWNER,
                ProjectMember.role == ProjectRole.DEVELOPER
            )
        )
    ).first()
    
    if not project_member:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only project owners and developers can create API keys"
        )
    
    # API 키 이름 중복 확인 (프로젝트 내에서)
    existing_key = db.query(ApiKey).filter(
        and_(
            ApiKey.project_id == project_id,
            ApiKey.name == api_key_data.name
        )
    ).first()
    
    if existing_key:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="API key name already exists in this project"
        )
    
    # 새 API 키 생성
    import secrets
    import hashlib
    
    # 32바이트 랜덤 키 생성
    raw_key = secrets.token_urlsafe(32)
    full_api_key = f"project_{str(project_id).replace('-', '')[:8]}_{raw_key}"
    
    # 키 해시 생성 (저장용)
    key_hash = hashlib.sha256(full_api_key.encode()).hexdigest()
    key_prefix = full_api_key[:12] + "..."
    
    new_api_key = ApiKey(
        project_id=project_id,
        name=api_key_data.name,
        description=api_key_data.description,
        key_hash=key_hash,
        key_prefix=key_prefix,
        expires_at=api_key_data.expires_at,
        created_by=current_user.id
    )
    
    db.add(new_api_key)
    db.commit()
    db.refresh(new_api_key)
    
    return ApiKeyCreateResponse(
        id=str(new_api_key.id),
        name=new_api_key.name,
        description=new_api_key.description,
        api_key=full_api_key,  # 전체 키는 생성 시에만 반환
        key_prefix=new_api_key.key_prefix or "",
        expires_at=new_api_key.expires_at,
        created_at=new_api_key.created_at
    )


@router.delete("/projects/{project_id}/api-keys/{key_id}")
async def delete_project_api_key(
    project_id: UUID,
    key_id: UUID,
    current_user: User = Depends(get_current_user_for_projects),
    db: Session = Depends(get_db)
):
    """프로젝트 API 키 삭제 (Owner/Developer만 가능)"""
    
    # 프로젝트 권한 확인 (Owner 또는 Developer)
    project_member = db.query(ProjectMember).filter(
        and_(
            ProjectMember.project_id == project_id,
            ProjectMember.user_id == current_user.id,
            or_(
                ProjectMember.role == ProjectRole.OWNER,
                ProjectMember.role == ProjectRole.DEVELOPER
            )
        )
    ).first()
    
    if not project_member:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only project owners and developers can delete API keys"
        )
    
    # API 키 조회
    api_key = db.query(ApiKey).filter(
        and_(
            ApiKey.id == key_id,
            ApiKey.project_id == project_id
        )
    ).first()
    
    if not api_key:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="API key not found"
        )
    
    # API 키 삭제
    key_name = api_key.name
    db.delete(api_key)
    db.commit()
    
    return {"message": f"API key '{key_name}' deleted successfully"}


# 프로젝트별 서버 관리 API
class ServerCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    description: Optional[str] = None
    transport: str = Field(default="stdio")
    command: str = Field(..., min_length=1)
    args: List[str] = Field(default_factory=list)
    env: dict = Field(default_factory=dict)
    cwd: Optional[str] = None


class ServerUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=255)
    description: Optional[str] = None
    transport: Optional[str] = None
    command: Optional[str] = None
    args: Optional[List[str]] = None
    env: Optional[dict] = None
    cwd: Optional[str] = None


class ServerResponse(BaseModel):
    id: str
    name: str
    description: Optional[str]
    transport_type: str
    command: str
    args: List[str]
    env: dict
    cwd: Optional[str]
    disabled: bool
    status: str = "offline"
    tools_count: int = 0
    last_connected: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True


@router.get("/projects/{project_id}/servers", response_model=List[ServerResponse])
async def list_project_servers(
    project_id: UUID,
    current_user: User = Depends(get_current_user_for_projects),
    db: Session = Depends(get_db)
):
    """프로젝트별 MCP 서버 목록 조회"""
    
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
    
    # 프로젝트별 서버 목록 조회
    servers = db.query(McpServer).filter(
        McpServer.project_id == project_id
    ).all()
    
    # MCP 설정 파일 로드
    config = load_mcp_config()
    
    result = []
    for server in servers:
        # 실제 MCP 서버 상태 확인
        server_status = "offline"
        tools_count = 0
        
        if config and 'servers' in config:
            server_config = config['servers'].get(server.name)
            if server_config:
                if server_config.get('disabled', False):
                    server_status = "disabled"
                else:
                    # 실제 연결 테스트는 비동기로 처리하므로 캐시된 상태 사용
                    server_status = mcp_connection_service.get_cached_status(server.name)
                    tools_count = mcp_connection_service.get_cached_tools_count(server.name)
                    
                    # 캐시된 상태가 없으면 기본값 사용
                    if server_status == "unknown":
                        server_status = "offline"
            else:
                server_status = "not_configured"
        
        result.append(ServerResponse(
            id=str(server.id),
            name=server.name,
            description=server.description,
            transport_type=server.transport_type or "stdio",
            command=server.command or "",
            args=server.args or [],
            env=server.env or {},
            cwd=server.cwd,
            disabled=not server.is_enabled,
            status=server_status,
            tools_count=tools_count,
            last_connected=server.last_used_at,
            created_at=server.created_at,
            updated_at=server.updated_at
        ))
    
    return result


@router.get("/projects/{project_id}/servers/{server_id}", response_model=ServerResponse)
async def get_project_server_detail(
    project_id: UUID,
    server_id: UUID,
    current_user: User = Depends(get_current_user_for_projects),
    db: Session = Depends(get_db)
):
    """프로젝트별 MCP 서버 상세 정보 조회"""
    
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
    
    # 서버 조회
    server = db.query(McpServer).filter(
        and_(
            McpServer.id == server_id,
            McpServer.project_id == project_id
        )
    ).first()
    
    if not server:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Server not found"
        )
    
    # MCP 설정 파일 로드 및 실제 상태 확인
    config = load_mcp_config()
    server_status = "offline"
    tools_count = 0
    
    if config and 'servers' in config:
        server_config = config['servers'].get(server.name)
        if server_config:
            if server_config.get('disabled', False):
                server_status = "disabled"
            else:
                # 실제 연결 테스트는 비동기로 처리하므로 캐시된 상태 사용
                server_status = mcp_connection_service.get_cached_status(server.name)
                tools_count = mcp_connection_service.get_cached_tools_count(server.name)
                
                # 캐시된 상태가 없으면 기본값 사용
                if server_status == "unknown":
                    server_status = "offline"
        else:
            server_status = "not_configured"
    
    return ServerResponse(
        id=str(server.id),
        name=server.name,
        description=server.description,
        transport_type=server.transport_type or "stdio",
        command=server.command or "",
        args=server.args or [],
        env=server.env or {},
        cwd=server.cwd,
        disabled=not server.is_enabled,
        status=server_status,
        tools_count=tools_count,
        last_connected=server.last_used_at,
        created_at=server.created_at,
        updated_at=server.updated_at
    )


@router.post("/projects/{project_id}/servers", response_model=ServerResponse)
async def create_project_server(
    project_id: UUID,
    server_data: ServerCreate,
    current_user: User = Depends(get_current_user_for_projects),
    db: Session = Depends(get_db)
):
    """프로젝트에 새 MCP 서버 추가 (Owner/Developer만 가능)"""
    
    # 프로젝트 권한 확인 (Owner 또는 Developer)
    project_member = db.query(ProjectMember).filter(
        and_(
            ProjectMember.project_id == project_id,
            ProjectMember.user_id == current_user.id,
            or_(
                ProjectMember.role == ProjectRole.OWNER,
                ProjectMember.role == ProjectRole.DEVELOPER
            )
        )
    ).first()
    
    if not project_member:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only project owners and developers can add servers"
        )
    
    # 서버 이름 중복 확인 (프로젝트 내에서)
    existing_server = db.query(McpServer).filter(
        and_(
            McpServer.project_id == project_id,
            McpServer.name == server_data.name
        )
    ).first()
    
    if existing_server:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Server name already exists in this project"
        )
    
    # 새 서버 생성
    new_server = McpServer(
        project_id=project_id,
        name=server_data.name,
        description=server_data.description,
        transport_type=server_data.transport,
        command=server_data.command,
        args=server_data.args,
        env=server_data.env,
        cwd=server_data.cwd,
        created_by_id=current_user.id
    )
    
    db.add(new_server)
    db.commit()
    db.refresh(new_server)
    
    return ServerResponse(
        id=str(new_server.id),
        name=new_server.name,
        description=new_server.description,
        transport_type=new_server.transport_type or "stdio",
        command=new_server.command or "",
        args=new_server.args or [],
        env=new_server.env or {},
        cwd=new_server.cwd,
        disabled=not new_server.is_enabled,
        status="offline",
        tools_count=0,
        last_connected=new_server.last_used_at,
        created_at=new_server.created_at,
        updated_at=new_server.updated_at
    )


@router.put("/projects/{project_id}/servers/{server_id}", response_model=ServerResponse)
async def update_project_server(
    project_id: UUID,
    server_id: UUID,
    server_data: ServerUpdate,
    current_user: User = Depends(get_current_user_for_projects),
    db: Session = Depends(get_db)
):
    """프로젝트 서버 정보 수정 (Owner/Developer만 가능)"""
    
    # 프로젝트 권한 확인 (Owner 또는 Developer)
    project_member = db.query(ProjectMember).filter(
        and_(
            ProjectMember.project_id == project_id,
            ProjectMember.user_id == current_user.id,
            or_(
                ProjectMember.role == ProjectRole.OWNER,
                ProjectMember.role == ProjectRole.DEVELOPER
            )
        )
    ).first()
    
    if not project_member:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only project owners and developers can update servers"
        )
    
    # 서버 조회
    server = db.query(McpServer).filter(
        and_(
            McpServer.id == server_id,
            McpServer.project_id == project_id
        )
    ).first()
    
    if not server:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Server not found"
        )
    
    # 서버 이름 중복 확인 (다른 서버와)
    if server_data.name and server_data.name != server.name:
        existing_server = db.query(McpServer).filter(
            and_(
                McpServer.project_id == project_id,
                McpServer.name == server_data.name,
                McpServer.id != server_id
            )
        ).first()
        
        if existing_server:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Server name already exists in this project"
            )
    
    # 서버 정보 업데이트
    if server_data.name is not None:
        server.name = server_data.name
    if server_data.description is not None:
        server.description = server_data.description
    if server_data.transport is not None:
        server.transport_type = server_data.transport
    if server_data.command is not None:
        server.command = server_data.command
    if server_data.args is not None:
        server.args = server_data.args
    if server_data.env is not None:
        server.env = server_data.env
    if server_data.cwd is not None:
        server.cwd = server_data.cwd
    
    server.updated_at = datetime.utcnow()
    
    db.commit()
    db.refresh(server)
    
    return ServerResponse(
        id=str(server.id),
        name=server.name,
        description=server.description,
        transport_type=server.transport_type or "stdio",
        command=server.command or "",
        args=server.args or [],
        env=server.env or {},
        cwd=server.cwd,
        disabled=not server.is_enabled,
        status="offline",
        tools_count=0,
        last_connected=server.last_used_at,
        created_at=server.created_at,
        updated_at=server.updated_at
    )


@router.delete("/projects/{project_id}/servers/{server_id}")
async def delete_project_server(
    project_id: UUID,
    server_id: UUID,
    current_user: User = Depends(get_current_user_for_projects),
    db: Session = Depends(get_db)
):
    """프로젝트에서 서버 삭제 (Owner/Developer만 가능)"""
    
    # 프로젝트 권한 확인 (Owner 또는 Developer)
    project_member = db.query(ProjectMember).filter(
        and_(
            ProjectMember.project_id == project_id,
            ProjectMember.user_id == current_user.id,
            or_(
                ProjectMember.role == ProjectRole.OWNER,
                ProjectMember.role == ProjectRole.DEVELOPER
            )
        )
    ).first()
    
    if not project_member:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only project owners and developers can delete servers"
        )
    
    # 서버 조회
    server = db.query(McpServer).filter(
        and_(
            McpServer.id == server_id,
            McpServer.project_id == project_id
        )
    ).first()
    
    if not server:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Server not found"
        )
    
    # 서버 삭제
    server_name = server.name
    db.delete(server)
    db.commit()
    
    return {"message": f"Server '{server_name}' deleted successfully"}


@router.post("/projects/{project_id}/servers/{server_id}/toggle")
async def toggle_project_server(
    project_id: UUID,
    server_id: UUID,
    current_user: User = Depends(get_current_user_for_projects),
    db: Session = Depends(get_db)
):
    """프로젝트 서버 활성화/비활성화 토글 (Owner/Developer만 가능)"""
    
    # 프로젝트 권한 확인 (Owner 또는 Developer)
    project_member = db.query(ProjectMember).filter(
        and_(
            ProjectMember.project_id == project_id,
            ProjectMember.user_id == current_user.id,
            or_(
                ProjectMember.role == ProjectRole.OWNER,
                ProjectMember.role == ProjectRole.DEVELOPER
            )
        )
    ).first()
    
    if not project_member:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only project owners and developers can toggle servers"
        )
    
    # 서버 조회
    server = db.query(McpServer).filter(
        and_(
            McpServer.id == server_id,
            McpServer.project_id == project_id
        )
    ).first()
    
    if not server:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Server not found"
        )
    
    # 서버 상태 토글
    server.is_enabled = not server.is_enabled
    server.updated_at = datetime.utcnow()
    
    db.commit()
    db.refresh(server)
    
    status_text = "비활성화" if not server.is_enabled else "활성화"
    return {
        "message": f"서버 '{server.name}'가 {status_text}되었습니다.",
        "disabled": not server.is_enabled
    }


@router.delete("/projects/{project_id}/favorites")
async def remove_project_favorite_by_target(
    project_id: UUID,
    favorite_type: str,
    target_id: str,
    current_user: User = Depends(get_current_user_for_projects),
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


# MCP 서버 상태 관리 API
@router.post("/projects/{project_id}/servers/refresh-status")
async def refresh_project_servers_status(
    project_id: UUID,
    current_user: User = Depends(get_current_user_for_projects),
    db: Session = Depends(get_db)
):
    """프로젝트 내 모든 MCP 서버 상태 새로고침"""
    
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
    
    try:
        # 모든 서버 상태 새로고침
        server_results = await mcp_connection_service.refresh_all_servers(db)
        
        # 프로젝트별 서버만 필터링
        project_servers = db.query(McpServer).filter(
            McpServer.project_id == project_id
        ).all()
        
        project_results = {}
        for server in project_servers:
            server_id = str(server.id)
            if server_id in server_results:
                project_results[server_id] = server_results[server_id]
            else:
                project_results[server_id] = {
                    'status': 'not_configured',
                    'tools_count': 0,
                    'tools': []
                }
        
        return {
            "message": "Server status refreshed successfully",
            "servers": project_results,
            "refreshed_at": datetime.utcnow().isoformat()
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to refresh server status: {str(e)}"
        )


@router.post("/projects/{project_id}/servers/{server_id}/refresh-status")
async def refresh_project_server_status(
    project_id: UUID,
    server_id: UUID,
    current_user: User = Depends(get_current_user_for_projects),
    db: Session = Depends(get_db)
):
    """특정 MCP 서버 상태 새로고침"""
    
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
    
    # 서버 조회
    server = db.query(McpServer).filter(
        and_(
            McpServer.id == server_id,
            McpServer.project_id == project_id
        )
    ).first()
    
    if not server:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Server not found"
        )
    
    try:
        # MCP 설정 파일 로드
        config = load_mcp_config()
        if not config or 'servers' not in config:
            return {
                "message": "MCP configuration not found",
                "status": "not_configured",
                "tools_count": 0,
                "tools": []
            }
        
        server_config = config['servers'].get(server.name)
        if not server_config:
            return {
                "message": f"Server '{server.name}' not found in MCP configuration",
                "status": "not_configured",
                "tools_count": 0,
                "tools": []
            }
        
        # 서버 상태 확인
        status_result = await mcp_connection_service.check_server_status(server.name, server_config)
        
        # 도구 목록 조회 (온라인인 경우에만)
        tools = []
        if status_result == "online":
            tools = await mcp_connection_service.get_server_tools(server.name, server_config)
            # 데이터베이스 업데이트
            server.last_used_at = datetime.utcnow()
            db.commit()
        
        return {
            "message": f"Server '{server.name}' status refreshed successfully",
            "status": status_result,
            "tools_count": len(tools),
            "tools": tools,
            "refreshed_at": datetime.utcnow().isoformat()
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to refresh server status: {str(e)}"
        )

"""
프로젝트 기본 CRUD API
프로젝트 생성, 조회, 수정, 삭제 등 핵심 기능
"""

from typing import List, Optional
from uuid import UUID
from datetime import datetime
import logging

from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session
from sqlalchemy import and_, func
from pydantic import BaseModel, Field

from ...database import get_db
from ...models import Project, ProjectMember, User, ProjectRole, InviteSource, McpServer
from ...services.activity_logger import ActivityLogger
from .common import get_current_user_for_projects, verify_project_access, verify_project_owner, check_project_name_availability

router = APIRouter()
logger = logging.getLogger(__name__)


# Pydantic Models
class ProjectCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=255, description="프로젝트 이름")
    description: Optional[str] = Field(None, max_length=1000, description="프로젝트 설명")


class ProjectUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=255, description="프로젝트 이름")
    description: Optional[str] = Field(None, max_length=1000, description="프로젝트 설명")


class ProjectResponse(BaseModel):
    id: str
    name: str
    description: Optional[str]
    created_by: str
    created_at: datetime
    updated_at: datetime
    member_count: int
    server_count: int
    unified_mcp_enabled: bool
    
    class Config:
        from_attributes = True


class ProjectDetailResponse(BaseModel):
    id: str
    name: str
    description: Optional[str]
    created_by: str
    created_by_name: str
    created_at: datetime
    updated_at: datetime
    member_count: int
    server_count: int
    unified_mcp_enabled: bool
    
    # 현재 사용자의 프로젝트 내 역할
    user_role: ProjectRole
    
    class Config:
        from_attributes = True


# API Endpoints
@router.get("/projects", response_model=List[ProjectResponse])
async def list_user_projects(
    current_user: User = Depends(get_current_user_for_projects),
    db: Session = Depends(get_db)
):
    """사용자가 속한 프로젝트 목록 조회"""
    
    # 사용자가 멤버인 프로젝트들을 조회
    projects_query = db.query(
        Project,
        func.count(ProjectMember.id).label('member_count'),
        func.count(McpServer.id).label('server_count')
    ).join(
        ProjectMember, Project.id == ProjectMember.project_id
    ).outerjoin(
        McpServer, Project.id == McpServer.project_id
    ).filter(
        ProjectMember.user_id == current_user.id
    ).group_by(
        Project.id
    ).order_by(
        Project.updated_at.desc()
    )
    
    results = projects_query.all()
    
    logger.info(f"Retrieved {len(results)} projects for user {current_user.id}")
    
    return [
        ProjectResponse(
            id=str(project.id),
            name=project.name,
            description=project.description,
                created_by=str(project.created_by),
            created_at=project.created_at,
            updated_at=project.updated_at,
            member_count=member_count,
            server_count=server_count,
            unified_mcp_enabled=project.unified_mcp_enabled
        )
        for project, member_count, server_count in results
    ]


@router.post("/projects", response_model=ProjectResponse)
async def create_project(
    project_data: ProjectCreate,
    current_user: User = Depends(get_current_user_for_projects),
    db: Session = Depends(get_db)
):
    """새 프로젝트 생성"""
    
    # 프로젝트 이름 중복 확인
    if not check_project_name_availability(project_data.name, current_user, db):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Project with this name already exists"
        )
    
    
    # 새 프로젝트 생성
    new_project = Project(
        name=project_data.name,
        description=project_data.description,
        created_by=current_user.id
    )
    
    db.add(new_project)
    db.flush()  # ID 생성을 위해 flush
    
    # 생성자를 Owner로 프로젝트 멤버에 추가
    owner_member = ProjectMember(
        project_id=new_project.id,
        user_id=current_user.id,
        role=ProjectRole.OWNER,
        invited_as=InviteSource.INDIVIDUAL,  # 프로젝트 생성자는 개인으로 초대된 것으로 간주
        invited_by=current_user.id
    )
    
    db.add(owner_member)
    db.commit()
    db.refresh(new_project)
    
    # 활동 로깅
    try:
        activity_logger = ActivityLogger()
        await activity_logger.log_activity(
            db=db,
            user_id=current_user.id,
            project_id=new_project.id,
            activity_type="project_created",
            description=f"프로젝트 '{project_data.name}' 생성",
            metadata={
                "project_id": str(new_project.id),
                "project_name": project_data.name
            }
        )
    except Exception as e:
        logger.warning(f"Failed to log project creation activity: {e}")
    
    logger.info(f"Created project '{project_data.name}' for user {current_user.id}")
    
    return ProjectResponse(
        id=str(new_project.id),
        name=new_project.name,
        description=new_project.description,
        created_by=str(new_project.created_by),
        created_at=new_project.created_at,
        updated_at=new_project.updated_at,
        member_count=1,
        server_count=0,
        unified_mcp_enabled=new_project.unified_mcp_enabled
    )


@router.get("/projects/{project_id}", response_model=ProjectDetailResponse)
async def get_project_detail(
    project_id: UUID,
    current_user: User = Depends(get_current_user_for_projects),
    db: Session = Depends(get_db)
):
    """프로젝트 상세 정보 조회"""
    
    # 프로젝트 접근 권한 확인
    project, project_member = verify_project_access(project_id, current_user, db)
    
    # 멤버 수 계산
    member_count = db.query(func.count(ProjectMember.id)).filter(
        ProjectMember.project_id == project_id
    ).scalar()
    
    # 서버 수 계산
    server_count = db.query(func.count(McpServer.id)).filter(
        McpServer.project_id == project_id
    ).scalar()
    
    # 생성자 정보 조회
    creator = db.query(User).filter(User.id == project.created_by).first()
    creator_name = creator.name if creator else "Unknown"
    
    logger.info(f"Retrieved project details for {project_id}")
    
    return ProjectDetailResponse(
        id=str(project.id),
        name=project.name,
        description=project.description,
        created_by=str(project.created_by),
        created_by_name=creator_name,
        created_at=project.created_at,
        updated_at=project.updated_at,
        member_count=member_count,
        server_count=server_count,
        unified_mcp_enabled=project.unified_mcp_enabled,
        user_role=project_member.role
    )


@router.put("/projects/{project_id}", response_model=ProjectDetailResponse)
async def update_project(
    project_id: UUID,
    project_data: ProjectUpdate,
    current_user: User = Depends(get_current_user_for_projects),
    db: Session = Depends(get_db)
):
    """프로젝트 정보 수정 (Owner만 가능)"""
    
    # 프로젝트 소유자 권한 확인
    project, project_member = verify_project_owner(project_id, current_user, db)
    
    # 업데이트할 필드가 있는지 확인
    if not project_data.name and not project_data.description:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="At least one field must be provided for update"
        )
    
    # 프로젝트 이름 변경 시 중복 확인
    if project_data.name and project_data.name != project.name:
        if not check_project_name_availability(project_data.name, current_user, db, project_id):
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Project with this name already exists"
            )
        
    
    # 필드 업데이트
    if project_data.name:
        project.name = project_data.name
    
    if project_data.description is not None:  # 빈 문자열도 허용
        project.description = project_data.description
    
    project.updated_at = datetime.utcnow()
    
    db.commit()
    db.refresh(project)
    
    # 통계 정보 조회
    member_count = db.query(func.count(ProjectMember.id)).filter(
        ProjectMember.project_id == project_id
    ).scalar()
    
    server_count = db.query(func.count(McpServer.id)).filter(
        McpServer.project_id == project_id
    ).scalar()
    
    # 생성자 정보 조회
    creator = db.query(User).filter(User.id == project.created_by).first()
    creator_name = creator.name if creator else "Unknown"
    
    # 활동 로깅
    try:
        activity_logger = ActivityLogger()
        await activity_logger.log_activity(
            db=db,
            user_id=current_user.id,
            project_id=project_id,
            activity_type="project_updated",
            description=f"프로젝트 정보 수정",
            metadata={
                "updated_fields": {
                    k: v for k, v in project_data.dict(exclude_unset=True).items()
                }
            }
        )
    except Exception as e:
        logger.warning(f"Failed to log project update activity: {e}")
    
    logger.info(f"Updated project {project_id}")
    
    return ProjectDetailResponse(
        id=str(project.id),
        name=project.name,
        description=project.description,
        created_by=str(project.created_by),
        created_by_name=creator_name,
        created_at=project.created_at,
        updated_at=project.updated_at,
        member_count=member_count,
        server_count=server_count,
        unified_mcp_enabled=project.unified_mcp_enabled,
        user_role=project_member.role
    )


@router.delete("/projects/{project_id}")
async def delete_project(
    project_id: UUID,
    current_user: User = Depends(get_current_user_for_projects),
    db: Session = Depends(get_db)
):
    """프로젝트 삭제 (Owner만 가능)"""
    
    # 프로젝트 소유자 권한 확인
    project, _ = verify_project_owner(project_id, current_user, db)
    
    project_name = project.name
    
    # 프로젝트 삭제 (CASCADE로 관련 데이터도 함께 삭제됨)
    db.delete(project)
    db.commit()
    
    # 활동 로깅 (프로젝트 삭제 후에는 project_id가 None)
    try:
        activity_logger = ActivityLogger()
        await activity_logger.log_activity(
            db=db,
            user_id=current_user.id,
            project_id=None,  # 프로젝트가 삭제되었으므로 None
            activity_type="project_deleted",
            description=f"프로젝트 '{project_name}' 삭제",
            metadata={
                "deleted_project_id": str(project_id),
                "project_name": project_name
            }
        )
    except Exception as e:
        logger.warning(f"Failed to log project deletion activity: {e}")
    
    logger.info(f"Deleted project '{project_name}' (ID: {project_id})")
    
    return {"message": "Project deleted successfully"}
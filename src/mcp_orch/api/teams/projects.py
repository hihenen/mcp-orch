"""
팀 프로젝트 관리 API
팀에서 접근 가능한 프로젝트 조회 및 생성
"""

from typing import List, Dict, Any
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session
from sqlalchemy import and_

from ...database import get_db
from ...models.team import TeamMember, TeamRole
from ...models.mcp_server import McpServer
from ...models import Project, ProjectMember, ProjectRole, InviteSource
from .common import get_team_and_verify_access

router = APIRouter()


@router.get("/{team_id}/projects", response_model=List[Dict[str, Any]])
async def get_team_projects(
    team_id: UUID,
    request: Request,
    db: Session = Depends(get_db)
):
    """팀에서 접근 가능한 프로젝트 목록 조회"""
    current_user = getattr(request.state, 'user', None)
    
    if not current_user:
        raise HTTPException(status_code=401, detail="Authentication required")
    
    team, membership = get_team_and_verify_access(team_id, current_user, db)
    
    # 팀으로 명시적으로 초대된 프로젝트만 조회
    # InviteSource.TEAM_MEMBER로 초대된 프로젝트만 표시하여 개인 프로젝트는 제외
    
    # 팀의 모든 멤버 ID 조회
    team_member_ids = db.query(TeamMember.user_id).filter(
        TeamMember.team_id == team.id
    ).all()
    team_member_ids = [member_id[0] for member_id in team_member_ids]
    
    # 팀으로 명시적으로 초대된 프로젝트만 조회 (개인 프로젝트 제외)
    projects_query = db.query(
        Project.id,
        Project.name, 
        Project.description,
        Project.created_by,
        Project.created_at,
        Project.updated_at
    ).join(ProjectMember).filter(
        and_(
            ProjectMember.user_id.in_(team_member_ids),
            ProjectMember.invited_as == InviteSource.TEAM_MEMBER  # 팀으로 초대된 경우만
        )
    ).distinct()
    
    project_rows = projects_query.all()
    
    # 프로젝트 ID들을 별도로 조회하여 전체 객체 가져오기
    if project_rows:
        project_ids = [row.id for row in project_rows]
        projects = db.query(Project).filter(Project.id.in_(project_ids)).all()
    else:
        projects = []
    
    result = []
    for project in projects:
        # 프로젝트별 통계 계산
        member_count = db.query(ProjectMember).filter(
            ProjectMember.project_id == project.id
        ).count()
        
        server_count = db.query(McpServer).filter(
            McpServer.project_id == project.id
        ).count()
        
        # 현재 사용자의 이 프로젝트에서의 역할 확인
        user_project_member = db.query(ProjectMember).filter(
            and_(
                ProjectMember.project_id == project.id,
                ProjectMember.user_id == current_user.id
            )
        ).first()
        
        # 현재 사용자가 이 프로젝트에 접근할 수 있는지 확인
        if user_project_member:
            # Enum 속성 안전 접근 - 이미 문자열인 경우와 Enum 객체인 경우 모두 처리
            user_role = user_project_member.role.value if hasattr(user_project_member.role, 'value') else user_project_member.role
            invited_as = user_project_member.invited_as.value if hasattr(user_project_member.invited_as, 'value') else user_project_member.invited_as
            
            result.append({
                "id": str(project.id),
                "name": project.name,
                "description": project.description,
                "created_at": project.created_at.isoformat(),
                "member_count": member_count,
                "server_count": server_count,
                "user_role": user_role,
                "invited_as": invited_as
            })
    
    return result


@router.post("/{team_id}/projects", response_model=Dict[str, Any])
async def create_team_project(
    team_id: UUID,
    project_data: Dict[str, Any],
    request: Request,
    db: Session = Depends(get_db)
):
    """팀에서 새 프로젝트 생성"""
    current_user = getattr(request.state, 'user', None)
    
    if not current_user:
        raise HTTPException(status_code=401, detail="Authentication required")
    
    team, membership = get_team_and_verify_access(team_id, current_user, db, TeamRole.DEVELOPER)
    
    # 프로젝트 생성
    project = Project(
        name=project_data.get('name'),
        description=project_data.get('description'),
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
    
    return {
        "id": str(project.id),
        "name": project.name,
        "description": project.description,
        "created_at": project.created_at.isoformat(),
        "member_count": 1,
        "server_count": 0,
        "user_role": ProjectRole.OWNER.value,
        "invited_as": InviteSource.INDIVIDUAL.value
    }
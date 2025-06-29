"""
팀 API 키 관리 API
API 키 생성, 조회, 삭제 기능
"""

from typing import List
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session
from sqlalchemy import and_

from ...database import get_db
from ...models.team import TeamMember, TeamRole
from ...models.api_key import ApiKey
from ...models import ProjectMember
from ...services.activity_logger import ActivityLogger
from .common import (
    TeamApiKeyResponse,
    CreateApiKeyRequest,
    get_current_user_for_teams,
    get_team_and_verify_access
)

router = APIRouter()


@router.get("/{team_id}/api-keys", response_model=List[TeamApiKeyResponse])
async def get_team_api_keys(
    team_id: UUID,
    request: Request,
    db: Session = Depends(get_db)
):
    """Get all API keys for a team."""
    current_user = getattr(request.state, 'user', None)
    
    if not current_user:
        raise HTTPException(status_code=401, detail="Authentication required")
    team, _ = get_team_and_verify_access(team_id, current_user, db, TeamRole.DEVELOPER)
    
    # Get team's API keys (through projects owned by team members)
    team_member_ids = db.query(TeamMember.user_id).filter(
        TeamMember.team_id == team.id
    ).subquery()
    
    team_project_ids = db.query(ProjectMember.project_id).filter(
        ProjectMember.user_id.in_(
            db.query(team_member_ids.c.user_id)
        )
    ).distinct().subquery()
    
    api_keys = db.query(ApiKey).filter(
        ApiKey.project_id.in_(
            db.query(team_project_ids.c.project_id)
        )
    ).all()
    
    return [
        TeamApiKeyResponse(
            id=str(key.id),
            name=key.name,
            key_prefix=key.key_prefix,
            key_suffix=key.key_suffix,
            is_active=key.is_active,
            created_at=key.created_at,
            last_used_at=key.last_used_at
        )
        for key in api_keys
    ]


@router.post("/{team_id}/api-keys")
async def create_team_api_key(
    team_id: UUID,
    key_request: CreateApiKeyRequest,
    request: Request,
    db: Session = Depends(get_db)
):
    """Create a new API key for the team."""
    current_user = getattr(request.state, 'user', None)
    
    if not current_user:
        raise HTTPException(status_code=401, detail="Authentication required")
    team, _ = get_team_and_verify_access(team_id, current_user, db, TeamRole.OWNER)
    
    # Check API key limit (through projects owned by team members)
    team_member_ids = db.query(TeamMember.user_id).filter(
        TeamMember.team_id == team.id
    ).subquery()
    
    team_project_ids = db.query(ProjectMember.project_id).filter(
        ProjectMember.user_id.in_(
            db.query(team_member_ids.c.user_id)
        )
    ).distinct().subquery()
    
    existing_keys = db.query(ApiKey).filter(
        ApiKey.project_id.in_(
            db.query(team_project_ids.c.project_id)
        )
    ).count()
    
    if existing_keys >= team.max_api_keys:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Maximum number of API keys ({team.max_api_keys}) reached"
        )
    
    # Generate API key
    import secrets
    import hashlib
    api_key = f"mcp_{secrets.token_urlsafe(32)}"
    key_hash = hashlib.sha256(api_key.encode()).hexdigest()
    
    # Create API key record - need to associate with a project
    # For teams, we'll use the first project owned by team members
    first_project_id = db.query(team_project_ids.c.project_id).first()
    if not first_project_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No projects found for this team"
        )
    
    key_record = ApiKey(
        name=key_request.name,
        key_hash=key_hash,
        key_prefix=api_key[:8],
        key_suffix=api_key[-4:],
        project_id=first_project_id[0],
        created_by_id=current_user.id,
        is_active=True
    )
    
    db.add(key_record)
    db.commit()
    db.refresh(key_record)
    
    # API 키 생성 활동 로깅
    ActivityLogger.log_team_api_key_created(
        team_id=team.id,
        user_id=current_user.id,
        team_name=team.name,
        api_key_name=key_record.name,
        api_key_id=str(key_record.id),
        db=db
    )
    
    return {
        "id": str(key_record.id),
        "name": key_record.name,
        "api_key": api_key,  # Return full key only on creation
        "message": "API key created successfully"
    }


@router.delete("/{team_id}/api-keys/{key_id}")
async def delete_team_api_key(
    team_id: UUID,
    key_id: UUID,
    request: Request,
    db: Session = Depends(get_db)
):
    """Delete an API key."""
    current_user = getattr(request.state, 'user', None)
    
    if not current_user:
        raise HTTPException(status_code=401, detail="Authentication required")
    team, _ = get_team_and_verify_access(team_id, current_user, db, TeamRole.OWNER)
    
    # Find API key through projects owned by team members
    team_member_ids = db.query(TeamMember.user_id).filter(
        TeamMember.team_id == team.id
    ).subquery()
    
    team_project_ids = db.query(ProjectMember.project_id).filter(
        ProjectMember.user_id.in_(
            db.query(team_member_ids.c.user_id)
        )
    ).distinct().subquery()
    
    api_key = db.query(ApiKey).filter(
        and_(
            ApiKey.id == key_id,
            ApiKey.project_id.in_(
                db.query(team_project_ids.c.project_id)
            )
        )
    ).first()
    
    if not api_key:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="API key not found"
        )
    
    db.delete(api_key)
    db.commit()
    
    return {"message": "API key deleted successfully"}
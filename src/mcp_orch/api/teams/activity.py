"""
팀 활동 피드 API
팀 관련 활동 로그 조회 기능
"""

from typing import List, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session, joinedload

from ...database import get_db
from ...models.activity import Activity
from .common import TeamActivityResponse, get_team_and_verify_access

router = APIRouter()


@router.get("/{team_id}/activity", response_model=List[TeamActivityResponse])
async def get_team_activity(
    team_id: UUID,
    request: Request,
    db: Session = Depends(get_db),
    action_filter: Optional[str] = None,
    severity_filter: Optional[str] = None,
    limit: int = 50,
    offset: int = 0
):
    """Get team activity feed."""
    # JWT 미들웨어에서 이미 인증된 사용자 가져오기
    current_user = getattr(request.state, 'user', None)
    
    if not current_user:
        raise HTTPException(status_code=401, detail="Authentication required")
    
    team, _ = get_team_and_verify_access(team_id, current_user, db)
    
    # 실제 팀 활동 데이터 조회 (User relationship 포함)
    query = db.query(Activity).options(joinedload(Activity.user)).filter(Activity.team_id == team_id)
    
    # 필터링 적용
    if action_filter:
        query = query.filter(Activity.action == action_filter)
    if severity_filter:
        query = query.filter(Activity.severity == severity_filter)
    
    # 최신순 정렬 및 페이지네이션
    activities = query.order_by(Activity.created_at.desc()).offset(offset).limit(limit).all()
    
    # 응답 형식으로 변환
    activity_responses = []
    for activity in activities:
        activity_responses.append(TeamActivityResponse(
            id=str(activity.id),
            activity_type=activity.action,
            description=activity.description,
            user_name=activity.user.name if activity.user else 'System',
            created_at=activity.created_at,
            severity=activity.severity
        ))
    
    return activity_responses
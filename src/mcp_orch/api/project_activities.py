"""Project activities API endpoints."""

from datetime import datetime
from typing import List, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from ..database import get_db
from ..models.activity import Activity, ActivityType, ActivitySeverity, ProjectActivity
from ..models.project import Project
from ..models.user import User
from .jwt_auth import get_current_user_for_api

router = APIRouter(prefix="/api/projects/{project_id}/activities", tags=["project-activities"])


class ActivityResponse(BaseModel):
    """Activity information for API response."""
    id: str
    project_id: str
    user_id: Optional[str] = None
    user_name: str
    action: str
    description: str
    severity: str
    metadata: dict = {}
    context: dict = {}
    target_type: Optional[str] = None
    target_id: Optional[str] = None
    created_at: str

    class Config:
        from_attributes = True


@router.get("/", response_model=List[ActivityResponse])
async def get_project_activities(
    project_id: str,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user_for_api),
    action_filter: Optional[str] = Query(None, description="Filter by action type"),
    severity_filter: Optional[str] = Query(None, description="Filter by severity"),
    limit: int = Query(50, ge=1, le=200, description="Number of activities to return"),
    offset: int = Query(0, ge=0, description="Number of activities to skip")
):
    """Get activities for a specific project."""
    try:
        project_uuid = UUID(project_id)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid project ID format"
        )
    
    # Verify project exists and user has access
    project = db.query(Project).filter(Project.id == project_uuid).first()
    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project not found"
        )
    
    # TODO: Add proper project access control
    # For now, allow all authenticated users to view activities
    
    # Build query with filters
    query = db.query(Activity).filter(
        Activity.project_id == project_uuid
    )
    
    if action_filter:
        query = query.filter(Activity.type == action_filter)
    
    if severity_filter:
        query = query.filter(Activity.severity == severity_filter)
    
    # Order by created_at desc (most recent first) and apply pagination
    activities = query.order_by(
        Activity.created_at.desc()
    ).offset(offset).limit(limit).all()
    
    # Convert to response format
    result = []
    for activity in activities:
        user_name = "System"
        if activity.user_id and activity.user:
            user_name = activity.user.name or activity.user.email
        
        result.append(ActivityResponse(
            id=str(activity.id),
            project_id=str(activity.project_id),
            user_id=str(activity.user_id) if activity.user_id else None,
            user_name=user_name,
            action=activity.action.value if hasattr(activity.action, 'value') else activity.action,
            description=activity.description,
            severity=activity.severity.value if hasattr(activity.severity, 'value') else activity.severity,
            metadata=activity.meta_data,
            context=activity.context,
            target_type=activity.target_type,
            target_id=activity.target_id,
            created_at=activity.created_at.isoformat() + 'Z'  # UTC timezone
        ))
    
    return result


@router.get("/summary", response_model=dict)
async def get_project_activities_summary(
    project_id: str,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user_for_api)
):
    """Get activity summary statistics for a project."""
    try:
        project_uuid = UUID(project_id)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid project ID format"
        )
    
    # Verify project exists and user has access
    project = db.query(Project).filter(Project.id == project_uuid).first()
    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project not found"
        )
    
    # Get total activity count
    total_count = db.query(ProjectActivity).filter(
        ProjectActivity.project_id == project_uuid
    ).count()
    
    # Get today's activity count (last 24 hours)
    from datetime import datetime, timedelta
    yesterday = datetime.utcnow() - timedelta(days=1)
    today_count = db.query(ProjectActivity).filter(
        ProjectActivity.project_id == project_uuid,
        ProjectActivity.created_at >= yesterday
    ).count()
    
    # Get activity counts by severity
    severity_counts = {}
    for severity in ActivitySeverity:
        count = db.query(ProjectActivity).filter(
            ProjectActivity.project_id == project_uuid,
            ProjectActivity.severity == severity
        ).count()
        severity_counts[severity.value] = count
    
    # Get activity counts by action type
    action_counts = {}
    for action in ActivityType:
        count = db.query(ProjectActivity).filter(
            ProjectActivity.project_id == project_uuid,
            ProjectActivity.action == action
        ).count()
        if count > 0:  # Only include actions that have occurred
            action_counts[action.value] = count
    
    return {
        "total_activities": total_count,
        "today_activities": today_count,
        "severity_breakdown": severity_counts,
        "action_breakdown": action_counts,
        "project_id": project_id,
        "generated_at": datetime.utcnow().isoformat() + 'Z'
    }
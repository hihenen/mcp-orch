"""Admin API Keys management API endpoints."""
from datetime import datetime
from typing import List, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status, Request
from pydantic import BaseModel, Field
from sqlalchemy import and_, func, desc, or_
from sqlalchemy.orm import Session, joinedload

from ..database import get_db
from ..models.api_key import ApiKey
from ..models import Project, ProjectMember
from ..models.user import User
from .users import get_current_admin_user

router = APIRouter(prefix="/api/admin/api-keys", tags=["admin-api-keys"])


# Pydantic models for Admin API
class AdminApiKeyResponse(BaseModel):
    """Admin API key information."""
    id: str
    name: str
    description: Optional[str] = None
    key_prefix_masked: str  # Masked key prefix (e.g., "project_abc123***")
    is_active: bool
    expires_at: Optional[datetime] = None
    created_at: datetime
    last_used_at: Optional[datetime] = None
    last_used_ip: Optional[str] = None
    
    # Rate limits
    rate_limit_per_minute: int
    rate_limit_per_day: int
    
    # Project and creator information
    project_id: str
    project_name: str
    project_slug: str
    creator_id: str
    creator_name: str
    creator_email: str
    
    # Usage statistics (will be expanded later)
    total_usage_count: int = 0
    last_30_days_usage: int = 0

    class Config:
        from_attributes = True


class AdminApiKeyListResponse(BaseModel):
    """Admin API key list response."""
    api_keys: List[AdminApiKeyResponse]
    total: int
    page: int
    per_page: int


class AdminUpdateApiKeyRequest(BaseModel):
    """Admin request to update API key."""
    is_active: Optional[bool] = None
    rate_limit_per_minute: Optional[int] = None
    rate_limit_per_day: Optional[int] = None
    expires_at: Optional[datetime] = None


def mask_api_key_prefix(key_prefix: str) -> str:
    """Mask API key prefix for security."""
    if len(key_prefix) <= 15:
        # For shorter prefixes, show first 8 chars + asterisks
        return key_prefix[:8] + "*" * max(0, len(key_prefix) - 8)
    else:
        # For longer prefixes, show first 15 chars + asterisks
        return key_prefix[:15] + "*" * 15


@router.get("/", response_model=AdminApiKeyListResponse)
async def list_api_keys_admin(
    request: Request,
    skip: int = 0,
    limit: int = 100,
    search: Optional[str] = None,
    project_id: Optional[str] = None,
    is_active: Optional[bool] = None,
    expired_only: bool = False,
    current_user: User = Depends(get_current_admin_user),
    db: Session = Depends(get_db)
):
    """Admin endpoint to list all API keys."""
    try:
        # Base query with joins
        query = db.query(ApiKey).options(
            joinedload(ApiKey.project),
            joinedload(ApiKey.created_by)
        )
        
        # Filter by project if specified
        if project_id:
            try:
                project_uuid = UUID(project_id)
                query = query.filter(ApiKey.project_id == project_uuid)
            except ValueError:
                raise HTTPException(
                    status_code=400,
                    detail="Invalid project ID format"
                )
        
        # Filter by active status
        if is_active is not None:
            query = query.filter(ApiKey.is_active == is_active)
        
        # Filter expired keys only
        if expired_only:
            query = query.filter(
                and_(
                    ApiKey.expires_at.isnot(None),
                    ApiKey.expires_at <= datetime.utcnow()
                )
            )
        
        # Search condition
        if search:
            search_term = f"%{search}%"
            query = query.filter(
                or_(
                    ApiKey.name.ilike(search_term),
                    ApiKey.description.ilike(search_term),
                    ApiKey.key_prefix.ilike(search_term)
                )
            )
        
        # Total count
        total = query.count()
        
        # Apply pagination and ordering
        api_keys = query.order_by(desc(ApiKey.created_at)).offset(skip).limit(limit).all()
        
        # Build response with masked keys
        api_key_responses = []
        for api_key in api_keys:
            # Calculate usage statistics (placeholder for now)
            total_usage_count = 0  # TODO: Implement usage tracking
            last_30_days_usage = 0  # TODO: Implement usage tracking
            
            api_key_response = AdminApiKeyResponse(
                id=str(api_key.id),
                name=api_key.name,
                description=api_key.description,
                key_prefix_masked=mask_api_key_prefix(api_key.key_prefix),
                is_active=api_key.is_active,
                expires_at=api_key.expires_at,
                created_at=api_key.created_at,
                last_used_at=api_key.last_used_at,
                last_used_ip=api_key.last_used_ip,
                rate_limit_per_minute=api_key.rate_limit_per_minute,
                rate_limit_per_day=api_key.rate_limit_per_day,
                project_id=str(api_key.project_id),
                project_name=api_key.project.name,
                project_slug=api_key.project.slug,
                creator_id=str(api_key.created_by_id),
                creator_name=api_key.created_by.name,
                creator_email=api_key.created_by.email,
                total_usage_count=total_usage_count,
                last_30_days_usage=last_30_days_usage
            )
            api_key_responses.append(api_key_response)
        
        return AdminApiKeyListResponse(
            api_keys=api_key_responses,
            total=total,
            page=(skip // limit) + 1 if limit > 0 else 1,
            per_page=limit
        )
        
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error retrieving API keys: {str(e)}"
        )


@router.get("/{api_key_id}", response_model=AdminApiKeyResponse)
async def get_api_key_admin(
    request: Request,
    api_key_id: str,
    current_user: User = Depends(get_current_admin_user),
    db: Session = Depends(get_db)
):
    """Admin endpoint to get detailed API key information."""
    try:
        try:
            key_uuid = UUID(api_key_id)
        except ValueError:
            raise HTTPException(
                status_code=400,
                detail="Invalid API key ID format"
            )
        
        api_key = db.query(ApiKey).options(
            joinedload(ApiKey.project),
            joinedload(ApiKey.created_by)
        ).filter(ApiKey.id == key_uuid).first()
        
        if not api_key:
            raise HTTPException(
                status_code=404,
                detail="API key not found"
            )
        
        # Calculate usage statistics (placeholder for now)
        total_usage_count = 0  # TODO: Implement usage tracking
        last_30_days_usage = 0  # TODO: Implement usage tracking
        
        return AdminApiKeyResponse(
            id=str(api_key.id),
            name=api_key.name,
            description=api_key.description,
            key_prefix_masked=mask_api_key_prefix(api_key.key_prefix),
            is_active=api_key.is_active,
            expires_at=api_key.expires_at,
            created_at=api_key.created_at,
            last_used_at=api_key.last_used_at,
            last_used_ip=api_key.last_used_ip,
            rate_limit_per_minute=api_key.rate_limit_per_minute,
            rate_limit_per_day=api_key.rate_limit_per_day,
            project_id=str(api_key.project_id),
            project_name=api_key.project.name,
            project_slug=api_key.project.slug,
            creator_id=str(api_key.created_by_id),
            creator_name=api_key.created_by.name,
            creator_email=api_key.created_by.email,
            total_usage_count=total_usage_count,
            last_30_days_usage=last_30_days_usage
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error retrieving API key: {str(e)}"
        )


@router.put("/{api_key_id}", response_model=AdminApiKeyResponse)
async def update_api_key_admin(
    request: Request,
    api_key_id: str,
    key_data: AdminUpdateApiKeyRequest,
    current_user: User = Depends(get_current_admin_user),
    db: Session = Depends(get_db)
):
    """Admin endpoint to update API key settings."""
    try:
        try:
            key_uuid = UUID(api_key_id)
        except ValueError:
            raise HTTPException(
                status_code=400,
                detail="Invalid API key ID format"
            )
        
        api_key = db.query(ApiKey).options(
            joinedload(ApiKey.project),
            joinedload(ApiKey.created_by)
        ).filter(ApiKey.id == key_uuid).first()
        
        if not api_key:
            raise HTTPException(
                status_code=404,
                detail="API key not found"
            )
        
        # Update fields
        if key_data.is_active is not None:
            api_key.is_active = key_data.is_active
        if key_data.rate_limit_per_minute is not None:
            api_key.rate_limit_per_minute = key_data.rate_limit_per_minute
        if key_data.rate_limit_per_day is not None:
            api_key.rate_limit_per_day = key_data.rate_limit_per_day
        if key_data.expires_at is not None:
            api_key.expires_at = key_data.expires_at
        
        db.commit()
        db.refresh(api_key)
        
        # Calculate usage statistics (placeholder for now)
        total_usage_count = 0  # TODO: Implement usage tracking
        last_30_days_usage = 0  # TODO: Implement usage tracking
        
        return AdminApiKeyResponse(
            id=str(api_key.id),
            name=api_key.name,
            description=api_key.description,
            key_prefix_masked=mask_api_key_prefix(api_key.key_prefix),
            is_active=api_key.is_active,
            expires_at=api_key.expires_at,
            created_at=api_key.created_at,
            last_used_at=api_key.last_used_at,
            last_used_ip=api_key.last_used_ip,
            rate_limit_per_minute=api_key.rate_limit_per_minute,
            rate_limit_per_day=api_key.rate_limit_per_day,
            project_id=str(api_key.project_id),
            project_name=api_key.project.name,
            project_slug=api_key.project.slug,
            creator_id=str(api_key.created_by_id),
            creator_name=api_key.created_by.name,
            creator_email=api_key.created_by.email,
            total_usage_count=total_usage_count,
            last_30_days_usage=last_30_days_usage
        )
        
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=500,
            detail=f"Error updating API key: {str(e)}"
        )


@router.delete("/{api_key_id}")
async def delete_api_key_admin(
    request: Request,
    api_key_id: str,
    current_user: User = Depends(get_current_admin_user),
    db: Session = Depends(get_db)
):
    """Admin endpoint to delete an API key (hard delete)."""
    try:
        try:
            key_uuid = UUID(api_key_id)
        except ValueError:
            raise HTTPException(
                status_code=400,
                detail="Invalid API key ID format"
            )
        
        api_key = db.query(ApiKey).filter(ApiKey.id == key_uuid).first()
        
        if not api_key:
            raise HTTPException(
                status_code=404,
                detail="API key not found"
            )
        
        # Store key name for response
        key_name = api_key.name
        
        # Hard delete the API key
        db.delete(api_key)
        db.commit()
        
        return {"message": f"API key '{key_name}' deleted successfully"}
        
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=500,
            detail=f"Error deleting API key: {str(e)}"
        )


@router.get("/statistics/overview")
async def get_api_keys_statistics(
    request: Request,
    current_user: User = Depends(get_current_admin_user),
    db: Session = Depends(get_db)
):
    """Admin endpoint to get API keys statistics overview."""
    try:
        # Total API keys
        total_keys = db.query(ApiKey).count()
        
        # Active API keys
        active_keys = db.query(ApiKey).filter(ApiKey.is_active == True).count()
        
        # Inactive API keys
        inactive_keys = db.query(ApiKey).filter(ApiKey.is_active == False).count()
        
        # Expired API keys
        expired_keys = db.query(ApiKey).filter(
            and_(
                ApiKey.expires_at.isnot(None),
                ApiKey.expires_at <= datetime.utcnow()
            )
        ).count()
        
        # Keys expiring in next 30 days
        from datetime import timedelta
        thirty_days_from_now = datetime.utcnow() + timedelta(days=30)
        expiring_soon = db.query(ApiKey).filter(
            and_(
                ApiKey.expires_at.isnot(None),
                ApiKey.expires_at <= thirty_days_from_now,
                ApiKey.expires_at > datetime.utcnow()
            )
        ).count()
        
        # Recently used keys (last 7 days)
        seven_days_ago = datetime.utcnow() - timedelta(days=7)
        recently_used = db.query(ApiKey).filter(
            ApiKey.last_used_at >= seven_days_ago
        ).count()
        
        return {
            "total_keys": total_keys,
            "active_keys": active_keys,
            "inactive_keys": inactive_keys,
            "expired_keys": expired_keys,
            "expiring_soon": expiring_soon,
            "recently_used": recently_used
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error retrieving API keys statistics: {str(e)}"
        )
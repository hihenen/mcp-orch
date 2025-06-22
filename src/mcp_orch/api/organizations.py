"""
조직 관리 API 엔드포인트
"""

import logging
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Request
from fastapi.security import HTTPBearer
from pydantic import BaseModel
from sqlalchemy.orm import Session
from sqlalchemy import and_

from ..database import get_db
from ..models.organization import Organization
from ..models.user import User
from ..models.organization import OrganizationMember
from .jwt_auth import get_current_user, JWTUser, get_current_user_from_request

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/organizations", tags=["organizations"])
security = HTTPBearer()

# Pydantic 모델들
class OrganizationCreate(BaseModel):
    name: str
    slug: Optional[str] = None

class OrganizationUpdate(BaseModel):
    name: Optional[str] = None

class OrganizationResponse(BaseModel):
    id: str
    name: str
    slug: str
    created_at: str
    updated_at: str
    member_count: int
    user_role: Optional[str] = None

class MemberResponse(BaseModel):
    id: str
    user_id: str
    user_name: str
    user_email: str
    role: str
    is_default: bool
    created_at: str

class InviteMemberRequest(BaseModel):
    email: str
    role: str = "member"

class UpdateMemberRoleRequest(BaseModel):
    role: str

@router.get("/", response_model=List[OrganizationResponse])
async def get_organizations(
    request: Request,
    db: Session = Depends(get_db)
):
    """현재 사용자가 속한 조직 목록을 조회합니다."""
    current_user = get_current_user_from_request(request)
    if not current_user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required"
        )
    
    try:
        # 사용자가 속한 조직들을 조회
        memberships = db.query(OrganizationMember).filter(
            OrganizationMember.user_id == current_user.id
        ).all()
        
        organizations = []
        for membership in memberships:
            org = db.query(Organization).filter(
                Organization.id == membership.organization_id
            ).first()
            
            if org:
                # 조직 멤버 수 계산
                member_count = db.query(OrganizationMember).filter(
                    OrganizationMember.organization_id == org.id
                ).count()
                
                organizations.append(OrganizationResponse(
                    id=org.id,
                    name=org.name,
                    slug=org.slug,
                    created_at=org.created_at.isoformat(),
                    updated_at=org.updated_at.isoformat(),
                    member_count=member_count,
                    user_role=membership.role
                ))
        
        return organizations
        
    except Exception as e:
        logger.error(f"Error fetching organizations: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to fetch organizations"
        )

@router.post("/", response_model=OrganizationResponse)
async def create_organization(
    organization_data: OrganizationCreate,
    request: Request,
    db: Session = Depends(get_db)
):
    """새 조직을 생성합니다."""
    current_user = get_current_user_from_request(request)
    if not current_user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required"
        )
    
    try:
        # slug 생성 (제공되지 않은 경우)
        slug = organization_data.slug
        if not slug:
            # 조직명을 기반으로 slug 생성
            import re
            slug = re.sub(r'[^a-zA-Z0-9\-]', '-', organization_data.name.lower())
            slug = re.sub(r'-+', '-', slug).strip('-')
            
            # 중복 확인 및 고유 slug 생성
            base_slug = slug
            counter = 1
            while db.query(Organization).filter(Organization.slug == slug).first():
                slug = f"{base_slug}-{counter}"
                counter += 1
        
        # 조직 생성
        new_org = Organization(
            name=organization_data.name,
            slug=slug
        )
        db.add(new_org)
        db.flush()  # ID 생성을 위해 flush
        
        # 생성자를 관리자로 추가
        membership = OrganizationMember(
            user_id=current_user.id,
            organization_id=new_org.id,
            role="admin",
            is_default=False  # 기본 조직은 아님
        )
        db.add(membership)
        db.commit()
        
        return OrganizationResponse(
            id=new_org.id,
            name=new_org.name,
            slug=new_org.slug,
            created_at=new_org.created_at.isoformat(),
            updated_at=new_org.updated_at.isoformat(),
            member_count=1,
            user_role="admin"
        )
        
    except Exception as e:
        db.rollback()
        logger.error(f"Error creating organization: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create organization"
        )

@router.get("/{org_id}", response_model=OrganizationResponse)
async def get_organization(
    org_id: str,
    request: Request,
    db: Session = Depends(get_db)
):
    """특정 조직의 상세 정보를 조회합니다."""
    current_user = get_current_user_from_request(request)
    if not current_user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required"
        )
    
    try:
        # 사용자가 해당 조직의 멤버인지 확인
        membership = db.query(OrganizationMember).filter(
            and_(
                OrganizationMember.user_id == current_user.id,
                OrganizationMember.organization_id == org_id
            )
        ).first()
        
        if not membership:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied to this organization"
            )
        
        # 조직 정보 조회
        org = db.query(Organization).filter(Organization.id == org_id).first()
        if not org:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Organization not found"
            )
        
        # 멤버 수 계산
        member_count = db.query(OrganizationMember).filter(
            OrganizationMember.organization_id == org_id
        ).count()
        
        return OrganizationResponse(
            id=org.id,
            name=org.name,
            slug=org.slug,
            created_at=org.created_at.isoformat(),
            updated_at=org.updated_at.isoformat(),
            member_count=member_count,
            user_role=membership.role
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching organization: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to fetch organization"
        )

@router.put("/{org_id}", response_model=OrganizationResponse)
async def update_organization(
    org_id: str,
    organization_data: OrganizationUpdate,
    request: Request,
    db: Session = Depends(get_db)
):
    """조직 정보를 수정합니다. (관리자만 가능)"""
    current_user = get_current_user_from_request(request)
    if not current_user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required"
        )
    
    try:
        # 사용자가 해당 조직의 관리자인지 확인
        membership = db.query(OrganizationMember).filter(
            and_(
                OrganizationMember.user_id == current_user.id,
                OrganizationMember.organization_id == org_id,
                OrganizationMember.role == "admin"
            )
        ).first()
        
        if not membership:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Admin access required"
            )
        
        # 조직 정보 조회
        org = db.query(Organization).filter(Organization.id == org_id).first()
        if not org:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Organization not found"
            )
        
        # 조직 정보 업데이트
        if organization_data.name:
            org.name = organization_data.name
        
        db.commit()
        
        # 멤버 수 계산
        member_count = db.query(OrganizationMember).filter(
            OrganizationMember.organization_id == org_id
        ).count()
        
        return OrganizationResponse(
            id=org.id,
            name=org.name,
            slug=org.slug,
            created_at=org.created_at.isoformat(),
            updated_at=org.updated_at.isoformat(),
            member_count=member_count,
            user_role=membership.role
        )
        
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Error updating organization: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update organization"
        )

@router.get("/{org_id}/members", response_model=List[MemberResponse])
async def get_organization_members(
    org_id: str,
    request: Request,
    db: Session = Depends(get_db)
):
    """조직 멤버 목록을 조회합니다."""
    current_user = get_current_user_from_request(request)
    if not current_user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required"
        )
    
    try:
        # 사용자가 해당 조직의 멤버인지 확인
        membership = db.query(OrganizationMember).filter(
            and_(
                OrganizationMember.user_id == current_user.id,
                OrganizationMember.organization_id == org_id
            )
        ).first()
        
        if not membership:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied to this organization"
            )
        
        # 조직 멤버들 조회
        members = db.query(OrganizationMember, User).join(
            User, OrganizationMember.user_id == User.id
        ).filter(
            OrganizationMember.organization_id == org_id
        ).all()
        
        member_list = []
        for member, user in members:
            member_list.append(MemberResponse(
                id=member.id,
                user_id=user.id,
                user_name=user.name or "",
                user_email=user.email,
                role=member.role,
                is_default=member.is_default,
                created_at=member.created_at.isoformat()
            ))
        
        return member_list
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching organization members: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to fetch organization members"
        )

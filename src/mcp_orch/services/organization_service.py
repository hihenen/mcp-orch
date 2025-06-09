"""
Organization Service

조직 관련 비즈니스 로직을 처리하는 서비스 모듈
"""

from typing import Optional, List
from uuid import UUID, uuid4
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError

from ..models.organization import Organization, OrganizationMember, OrganizationRole
from ..models.user import User
from ..database import get_db


class OrganizationService:
    """조직 관리 서비스"""
    
    def __init__(self, db: Session):
        self.db = db
    
    def create_organization(
        self,
        name: str,
        owner_id: UUID,
        description: Optional[str] = None,
        slug: Optional[str] = None
    ) -> Organization:
        """
        새 조직을 생성합니다.
        
        Args:
            name: 조직 이름
            owner_id: 조직 소유자 사용자 ID
            description: 조직 설명 (선택사항)
            slug: 조직 슬러그 (선택사항)
            
        Returns:
            생성된 조직 객체
            
        Raises:
            IntegrityError: 조직 이름이 중복되거나 사용자가 존재하지 않는 경우
        """
        try:
            # 슬러그 생성 (제공되지 않은 경우)
            if not slug:
                slug = f"org-{str(uuid4())[:8]}"
            
            # 조직 생성
            organization = Organization(
                id=uuid4(),
                name=name,
                slug=slug,
                description=description,
                is_personal=True  # 개인 조직으로 설정
            )
            
            self.db.add(organization)
            self.db.flush()  # ID 생성을 위해 flush
            
            # 소유자를 조직 멤버로 추가
            member = OrganizationMember(
                id=uuid4(),
                organization_id=organization.id,
                user_id=owner_id,
                role=OrganizationRole.OWNER,
                is_default=True  # 기본 조직으로 설정
            )
            
            self.db.add(member)
            self.db.commit()
            
            return organization
            
        except IntegrityError as e:
            self.db.rollback()
            raise e
    
    def add_user_to_organization(
        self,
        organization_id: UUID,
        user_id: UUID,
        role: OrganizationRole = OrganizationRole.DEVELOPER
    ) -> OrganizationMember:
        """
        사용자를 조직에 추가합니다.
        
        Args:
            organization_id: 조직 ID
            user_id: 사용자 ID
            role: 조직 내 역할
            
        Returns:
            생성된 조직 멤버 객체
        """
        try:
            member = OrganizationMember(
                id=uuid4(),
                organization_id=organization_id,
                user_id=user_id,
                role=role
            )
            
            self.db.add(member)
            self.db.commit()
            
            return member
            
        except IntegrityError as e:
            self.db.rollback()
            raise e
    
    def get_user_organizations(self, user_id: UUID) -> List[Organization]:
        """
        사용자가 속한 모든 조직을 조회합니다.
        
        Args:
            user_id: 사용자 ID
            
        Returns:
            사용자가 속한 조직 목록
        """
        return (
            self.db.query(Organization)
            .join(OrganizationMember)
            .filter(OrganizationMember.user_id == user_id)
            .all()
        )
    
    def get_organization_by_id(self, organization_id: UUID) -> Optional[Organization]:
        """
        ID로 조직을 조회합니다.
        
        Args:
            organization_id: 조직 ID
            
        Returns:
            조직 객체 또는 None
        """
        return self.db.query(Organization).filter(Organization.id == organization_id).first()
    
    def get_user_primary_organization(self, user_id: UUID) -> Optional[Organization]:
        """
        사용자의 기본 조직을 조회합니다.
        소유자인 조직이 있으면 그것을, 없으면 첫 번째 조직을 반환합니다.
        
        Args:
            user_id: 사용자 ID
            
        Returns:
            기본 조직 또는 None
        """
        # 소유자인 조직 찾기
        owner_org = (
            self.db.query(Organization)
            .join(OrganizationMember)
            .filter(
                OrganizationMember.user_id == user_id,
                OrganizationMember.role == OrganizationRole.OWNER
            )
            .first()
        )
        
        if owner_org:
            return owner_org
        
        # 소유자인 조직이 없으면 첫 번째 조직 반환
        return (
            self.db.query(Organization)
            .join(OrganizationMember)
            .filter(OrganizationMember.user_id == user_id)
            .first()
        )
    
    def create_default_organization_for_user(self, user: User) -> Organization:
        """
        사용자를 위한 기본 1인 조직을 생성합니다.
        
        Args:
            user: 사용자 객체
            
        Returns:
            생성된 조직 객체
        """
        org_name = f"{user.name}'s Organization" if user.name else f"{user.email}'s Organization"
        
        return self.create_organization(
            name=org_name,
            owner_id=user.id,
            description="Personal organization"
        )


def get_organization_service(db: Session = None) -> OrganizationService:
    """
    OrganizationService 인스턴스를 생성합니다.
    
    Args:
        db: 데이터베이스 세션 (None이면 새로 생성)
        
    Returns:
        OrganizationService 인스턴스
    """
    if db is None:
        db = next(get_db())
    
    return OrganizationService(db)

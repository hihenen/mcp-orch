"""
사용자 즐겨찾기 모델
"""

from sqlalchemy import Column, String, DateTime, ForeignKey, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from datetime import datetime
import uuid

from .base import Base


class UserFavorite(Base):
    """사용자 즐겨찾기 모델"""
    __tablename__ = "user_favorites"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    project_id = Column(UUID(as_uuid=True), ForeignKey("projects.id"), nullable=False)
    
    # 즐겨찾기 타입 (server, tool, project)
    favorite_type = Column(String(20), nullable=False)
    
    # 타입별 식별자
    target_id = Column(String(255), nullable=False)  # server_name, tool_name, project_id
    target_name = Column(String(255), nullable=False)  # 표시용 이름
    
    # 메타데이터
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # 관계
    user = relationship("User", back_populates="favorites")
    project = relationship("Project")
    
    # 유니크 제약조건 (사용자당 프로젝트별 타겟 중복 방지)
    __table_args__ = (
        UniqueConstraint('user_id', 'project_id', 'favorite_type', 'target_id', 
                        name='uq_user_project_favorite'),
    )
    
    def __repr__(self):
        return f"<UserFavorite(user_id={self.user_id}, project_id={self.project_id}, " \
               f"type={self.favorite_type}, target={self.target_name})>"


# User 모델에 즐겨찾기 관계 추가를 위한 패치
# 실제 User 모델 파일에서 이 관계를 추가해야 함

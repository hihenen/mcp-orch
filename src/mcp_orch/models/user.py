"""User model for authentication."""
from uuid import uuid4

from sqlalchemy import Column, String, Boolean, DateTime
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from .base import Base


class User(Base):
    """User model compatible with NextAuth.js."""
    
    __tablename__ = "users"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid4)
    email = Column(String(255), unique=True, nullable=False, index=True)
    email_verified = Column(DateTime, nullable=True)
    name = Column(String(255), nullable=True)
    image = Column(String(500), nullable=True)
    
    # Password hash for email/password auth
    password = Column(String(255), nullable=True)  # Changed from password_hash to password
    
    # OAuth provider data
    provider = Column(String(50), nullable=True)  # 'google', 'github', etc.
    provider_id = Column(String(255), nullable=True)
    
    # User status
    is_active = Column(Boolean, default=True, nullable=False)
    
    # Relationships
    team_memberships = relationship(
        "TeamMember", 
        back_populates="user",
        foreign_keys="TeamMember.user_id",
        cascade="all, delete-orphan"
    )
    
    favorites = relationship(
        "UserFavorite",
        back_populates="user",
        cascade="all, delete-orphan"
    )
    
    def __repr__(self) -> str:
        return f"<User(id={self.id}, email={self.email})>"

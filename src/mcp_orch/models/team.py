"""Team model for team-based management."""
from enum import Enum
from uuid import uuid4

from sqlalchemy import Column, String, Boolean, Integer, DateTime, ForeignKey, UniqueConstraint, Enum as SQLEnum
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from .base import Base


class TeamRole(str, Enum):
    """Team member roles - GitLab style 3-tier system."""
    OWNER = "owner"        # 🔴 Full control: team management, member management, server management, API keys
    DEVELOPER = "developer"  # 🟡 Execution rights: server usage, tool execution, log viewing, API key viewing
    REPORTER = "reporter"    # 🔵 Read-only: information viewing only, no API key access


class Team(Base):
    """Team model for team-based API key management."""
    
    __tablename__ = "teams"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid4)
    name = Column(String(255), nullable=False)
    slug = Column(String(255), unique=True, nullable=False, index=True)
    description = Column(String(500), nullable=True)
    
    # Team settings
    is_personal = Column(Boolean, default=False, nullable=False)  # True for auto-created personal teams
    is_active = Column(Boolean, default=True, nullable=False)
    
    # Billing/Plan info (for future use)
    plan = Column(String(50), default="free", nullable=False)
    max_api_keys = Column(Integer, default=5, nullable=False)
    max_members = Column(Integer, default=10, nullable=False)
    
    # Relationships
    members = relationship(
        "TeamMember",
        back_populates="team",
        cascade="all, delete-orphan"
    )
    
    def __repr__(self) -> str:
        return f"<Team(id={self.id}, name={self.name})>"


class TeamMember(Base):
    """Membership relationship between users and teams."""
    
    __tablename__ = "team_members"
    __table_args__ = (
        UniqueConstraint("user_id", "team_id", name="uq_user_team"),
    )
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    team_id = Column(UUID(as_uuid=True), ForeignKey("teams.id"), nullable=False)
    role = Column(SQLEnum(TeamRole), nullable=False)
    
    # Invitation tracking
    invited_by_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    invited_at = Column(DateTime, nullable=True)
    joined_at = Column(DateTime, nullable=True)
    
    # Default team flag
    is_default = Column(Boolean, default=False, nullable=False)
    
    # Relationships
    user = relationship("User", back_populates="team_memberships", foreign_keys=[user_id])
    team = relationship("Team", back_populates="members")
    invited_by = relationship("User", foreign_keys=[invited_by_id])
    
    def __repr__(self) -> str:
        return f"<TeamMember(user_id={self.user_id}, team_id={self.team_id}, role={self.role})>"

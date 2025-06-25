"""
통합 활동 로그 모델
프로젝트, 팀 등 모든 리소스의 활동을 추적하는 확장 가능한 시스템
"""

from datetime import datetime
from enum import Enum
from typing import Optional, Dict, Any
from uuid import UUID, uuid4

from sqlalchemy import Column, DateTime, ForeignKey, String, Text, JSON, Index
from sqlalchemy.dialects.postgresql import UUID as PGUUID
from sqlalchemy.orm import relationship

from .base import Base


class ActivityType(str, Enum):
    """활동 타입 (확장 가능)"""
    # 서버 관련
    SERVER_CREATED = "server.created"
    SERVER_UPDATED = "server.updated"
    SERVER_DELETED = "server.deleted"
    SERVER_STARTED = "server.started"
    SERVER_STOPPED = "server.stopped"
    SERVER_RESTARTED = "server.restarted"
    
    # 도구 실행 관련
    TOOL_EXECUTED = "tool.executed"
    TOOL_FAILED = "tool.failed"
    
    # 멤버 관리 관련
    MEMBER_INVITED = "member.invited"
    MEMBER_JOINED = "member.joined"
    MEMBER_REMOVED = "member.removed"
    MEMBER_ROLE_CHANGED = "member.role_changed"
    
    # API 키 관련
    API_KEY_CREATED = "api_key.created"
    API_KEY_DELETED = "api_key.deleted"
    API_KEY_ROTATED = "api_key.rotated"
    
    # 프로젝트 설정 관련
    PROJECT_SETTINGS_UPDATED = "project.settings_updated"
    PROJECT_CREATED = "project.created"
    PROJECT_DELETED = "project.deleted"
    
    # 팀 관리 관련
    TEAM_CREATED = "team.created"
    TEAM_UPDATED = "team.updated"
    TEAM_DELETED = "team.deleted"
    TEAM_SETTINGS_UPDATED = "team.settings_updated"
    
    # 세션 관리 관련
    SESSION_CREATED = "session.created"
    SESSION_ENDED = "session.ended"


class ActivitySeverity(str, Enum):
    """활동 중요도"""
    INFO = "info"
    WARNING = "warning"
    ERROR = "error"
    SUCCESS = "success"


class Activity(Base):
    """
    통합 활동 로그 테이블
    
    특징:
    - 프로젝트, 팀 등 모든 리소스의 활동 통합 관리
    - 단일 진입점 패턴으로 모든 활동 기록
    - JSON 메타데이터로 무한 확장성
    - 검색 및 필터링 최적화
    - 성능을 위한 인덱스 설계
    """
    __tablename__ = "activities"

    # 기본 필드
    id: UUID = Column(PGUUID(as_uuid=True), primary_key=True, default=uuid4)
    
    # 리소스 연결 (확장 가능한 구조)
    project_id: Optional[UUID] = Column(PGUUID(as_uuid=True), ForeignKey("projects.id", ondelete="CASCADE"), nullable=True)
    team_id: Optional[UUID] = Column(PGUUID(as_uuid=True), ForeignKey("teams.id", ondelete="CASCADE"), nullable=True)
    user_id: Optional[UUID] = Column(PGUUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    
    # 실제 DB 스키마에 맞는 필드들
    type: ActivityType = Column(String(50), nullable=False)  # 실제 DB에서는 'type' 필드 사용
    severity: ActivitySeverity = Column(String(20), default=ActivitySeverity.INFO, nullable=False)
    title: str = Column(String(255), nullable=False)  # 실제 DB에는 title 필드 존재
    description: Optional[str] = Column(Text, nullable=True)
    
    # 확장성을 위한 JSON 필드
    activity_metadata: Dict[str, Any] = Column('metadata', JSON, nullable=True, default=dict)  # 실제 DB에서는 'metadata' 사용
    
    # 대상 리소스 (실제 DB 스키마)
    resource_type: Optional[str] = Column(String(50), nullable=True)  # 실제 DB 필드명
    resource_id: Optional[str] = Column(String(100), nullable=True)  # 실제 DB 필드명
    
    # 추가 메타데이터 (실제 DB 스키마)
    ip_address: Optional[str] = Column(String(255), nullable=True)
    user_agent: Optional[str] = Column(Text, nullable=True)
    session_id: Optional[str] = Column(String(255), nullable=True)
    tags: Optional[list] = Column(JSON, nullable=True)  # PostgreSQL ARRAY -> JSON으로 매핑
    
    # 서버 관련 (실제 DB 스키마)
    server_id: Optional[UUID] = Column(PGUUID(as_uuid=True), nullable=True)
    
    # 타임스탬프
    created_at: datetime = Column(DateTime, nullable=False, default=datetime.utcnow)
    updated_at: datetime = Column(DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # 관계
    project = relationship("Project")
    team = relationship("Team")
    user = relationship("User")
    
    # 성능 최적화 인덱스 (실제 DB 필드명 사용)
    __table_args__ = (
        Index('idx_activities_project_created', 'project_id', 'created_at'),
        Index('idx_activities_team_created', 'team_id', 'created_at'),
        Index('idx_activities_type_created', 'type', 'created_at'),  # action -> type 변경
        Index('idx_activities_user_created', 'user_id', 'created_at'),
        Index('idx_activities_resource', 'resource_type', 'resource_id'),  # target -> resource 변경
        Index('idx_activities_severity', 'severity', 'created_at'),
    )

    def __repr__(self):
        resource_info = f"project_id={self.project_id}" if self.project_id else f"team_id={self.team_id}"
        type_value = self.type.value if self.type else 'unknown'
        desc_preview = self.description[:50] + '...' if self.description and len(self.description) > 50 else (self.description or '')
        return f"<Activity(id={self.id}, {resource_info}, type={type_value}, description='{desc_preview}')>"

    def to_dict(self) -> Dict[str, Any]:
        """딕셔너리 변환 (API 응답용)"""
        return {
            'id': str(self.id),
            'project_id': str(self.project_id) if self.project_id else None,
            'team_id': str(self.team_id) if self.team_id else None,
            'user_id': str(self.user_id) if self.user_id else None,
            'server_id': str(self.server_id) if self.server_id else None,
            'type': self.type.value if self.type else None,  # action -> type 변경
            'title': self.title,
            'description': self.description,
            'severity': self.severity.value if self.severity else None,
            'metadata': self.activity_metadata,
            'resource_type': self.resource_type,
            'resource_id': self.resource_id,
            'ip_address': self.ip_address,
            'user_agent': self.user_agent,
            'session_id': self.session_id,
            'tags': self.tags,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None,
            'user_name': self.user.name if self.user else 'System'
        }
    
    # 호환성을 위한 별칭들
    @property
    def action(self):
        """호환성을 위한 별칭"""
        return self.type
    
    @action.setter
    def action(self, value):
        """호환성을 위한 setter"""
        self.type = value
    
    @property
    def meta_data(self):
        """호환성을 위한 별칭"""
        return self.activity_metadata
    
    @meta_data.setter
    def meta_data(self, value):
        """호환성을 위한 setter"""
        self.activity_metadata = value
    
    @property
    def target_type(self):
        """호환성을 위한 별칭"""
        return self.resource_type
    
    @target_type.setter
    def target_type(self, value):
        """호환성을 위한 setter"""
        self.resource_type = value
    
    @property
    def target_id(self):
        """호환성을 위한 별칭"""
        return self.resource_id
    
    @target_id.setter
    def target_id(self, value):
        """호환성을 위한 setter"""
        self.resource_id = value
    
    @property
    def context(self):
        """호환성을 위한 별칭"""
        return self.activity_metadata.get('context', {})
    
    @context.setter
    def context(self, value):
        """호환성을 위한 setter"""
        if self.activity_metadata is None:
            self.activity_metadata = {}
        self.activity_metadata['context'] = value


# Backward compatibility alias
ProjectActivity = Activity
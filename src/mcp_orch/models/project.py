"""
프로젝트 중심 협업 모델
독립적인 프로젝트 단위로 팀 경계를 넘나드는 유연한 협업 구조
"""

from datetime import datetime
from enum import Enum
from typing import Optional
from uuid import UUID, uuid4

from sqlalchemy import Column, DateTime, ForeignKey, String, Text, Boolean, JSON
from sqlalchemy.dialects.postgresql import UUID as PGUUID
from sqlalchemy.orm import relationship

from .base import Base


class ProjectRole(str, Enum):
    """프로젝트 내 역할"""
    OWNER = "owner"        # 프로젝트 관리, 멤버 관리, 서버 관리, API 키 관리
    DEVELOPER = "developer"  # 서버 사용, 도구 실행, 로그 조회
    REPORTER = "reporter"   # 읽기 전용 접근


class InviteSource(str, Enum):
    """초대 경로"""
    TEAM_MEMBER = "team_member"    # 팀 멤버로서 초대
    INDIVIDUAL = "individual"      # 개인으로서 초대
    EXTERNAL = "external"          # 외부 협력사/프리랜서


class Project(Base):
    """
    독립적인 프로젝트 (팀 경계를 넘나드는 협업 단위)
    
    특징:
    - 팀에 속하지 않는 독립적인 협업 단위
    - 다양한 팀의 멤버들을 초대 가능
    - 외부 협력사, 프리랜서도 초대 가능
    - 프로젝트별 독립적인 MCP 서버 구성
    - 프로젝트별 독립적인 API 키 관리
    """
    __tablename__ = "projects"

    id: UUID = Column(PGUUID(as_uuid=True), primary_key=True, default=uuid4)
    name: str = Column(String(255), nullable=False)
    description: Optional[str] = Column(Text)
    
    # 프로젝트 생성자 (소유자)
    created_by: UUID = Column(PGUUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    created_at: datetime = Column(DateTime, default=datetime.utcnow)
    updated_at: datetime = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # 보안 설정
    jwt_auth_required: bool = Column(Boolean, default=True, nullable=False)  # JWT 인증 필수 여부 (SSE + Message 통합)
    allowed_ip_ranges: Optional[str] = Column(JSON, default=list)  # 허용된 IP 범위 목록
    
    # MCP 서버 운영 모드 설정
    unified_mcp_enabled: bool = Column(Boolean, default=True, nullable=False)  # Unified MCP Server 모드 활성화 여부
    
    # 관계
    creator = relationship("User", foreign_keys=[created_by])
    members = relationship("ProjectMember", back_populates="project", cascade="all, delete-orphan")
    servers = relationship("McpServer", back_populates="project", cascade="all, delete-orphan")
    api_keys = relationship("ApiKey", back_populates="project", cascade="all, delete-orphan")
    client_sessions = relationship("ClientSession", back_populates="project", cascade="all, delete-orphan")
    # ToolCallLog 관계는 ForeignKey가 없으므로 주석 처리
    # tool_call_logs = relationship("ToolCallLog", back_populates="project", cascade="all, delete-orphan")
    


class ProjectMember(Base):
    """
    프로젝트별 멤버 (크로스팀 멤버십)
    
    특징:
    - 팀 경계를 넘나드는 프로젝트 멤버십
    - 같은 사용자가 여러 프로젝트에 다른 역할로 참여 가능
    - 초대 경로 추적 (팀 vs 개인 vs 외부)
    """
    __tablename__ = "project_members"

    id: UUID = Column(PGUUID(as_uuid=True), primary_key=True, default=uuid4)
    project_id: UUID = Column(PGUUID(as_uuid=True), ForeignKey("projects.id"), nullable=False)
    user_id: UUID = Column(PGUUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    role: ProjectRole = Column(String(20), default=ProjectRole.DEVELOPER, nullable=False)
    
    # 초대 경로 추적
    invited_as: InviteSource = Column(String(20), nullable=False)
    invited_by: UUID = Column(PGUUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    joined_at: datetime = Column(DateTime, default=datetime.utcnow)
    
    # 관계
    project = relationship("Project", back_populates="members")
    user = relationship("User", foreign_keys=[user_id])
    inviter = relationship("User", foreign_keys=[invited_by])
    
    # 유니크 제약 조건 (한 프로젝트에 같은 사용자는 한 번만)
    __table_args__ = (
        {"schema": None},  # 기본 스키마 사용
    )


# 사용 시나리오 예시:
"""
"E-commerce Redesign" 프로젝트
├── 참여자:
│   ├── Frontend Team의 John (Developer, team_member로 초대)
│   ├── Frontend Team의 Jane (Owner, team_member로 초대)  
│   ├── Backend Team의 Alice (Developer, team_member로 초대)
│   ├── Backend Team의 Bob (Developer, team_member로 초대)
│   ├── Design Team의 Charlie (Developer, individual로 초대)
│   └── External Agency의 David (Reporter, external로 초대)
├── MCP 서버:
│   ├── figma-server (디자인 연동)
│   ├── github-server (코드 관리)
│   └── slack-server (커뮤니케이션)
└── API 키: project_ecommerce_redesign_key_abc123

SSE 엔드포인트:
GET /api/projects/{project_id}/servers/github-server/sse
Authorization: Bearer project_api_key_abc123

Cline 설정:
{
  "mcpServers": {
    "github-server": {
      "transport": "sse",
      "url": "http://localhost:8000/api/projects/{project_id}/servers/github-server/sse",
      "headers": {
        "Authorization": "Bearer project_api_key_abc123"
      }
    }
  }
}
"""

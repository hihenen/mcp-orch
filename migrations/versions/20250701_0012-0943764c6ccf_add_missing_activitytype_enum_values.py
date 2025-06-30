"""Add missing ActivityType enum values

Revision ID: 0943764c6ccf
Revises: bb733bb9d57a
Create Date: 2025-07-01 00:12:15.002779

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '0943764c6ccf'
down_revision: Union[str, None] = 'bb733bb9d57a'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # PostgreSQL에서 enum 타입에 새 값을 추가
    # 주의: PostgreSQL에서는 enum 값을 직접 추가할 수 없으므로 
    # ALTER TYPE 명령을 사용해야 함
    
    # 새로운 enum 값들 추가
    op.execute("ALTER TYPE activitytype ADD VALUE IF NOT EXISTS 'TOOL_EXECUTED'")
    op.execute("ALTER TYPE activitytype ADD VALUE IF NOT EXISTS 'TOOL_FAILED'")
    op.execute("ALTER TYPE activitytype ADD VALUE IF NOT EXISTS 'MEMBER_INVITED'")
    op.execute("ALTER TYPE activitytype ADD VALUE IF NOT EXISTS 'MEMBER_JOINED'")
    op.execute("ALTER TYPE activitytype ADD VALUE IF NOT EXISTS 'MEMBER_REMOVED'")
    op.execute("ALTER TYPE activitytype ADD VALUE IF NOT EXISTS 'MEMBER_ROLE_CHANGED'")
    op.execute("ALTER TYPE activitytype ADD VALUE IF NOT EXISTS 'API_KEY_ROTATED'")
    op.execute("ALTER TYPE activitytype ADD VALUE IF NOT EXISTS 'PROJECT_SETTINGS_UPDATED'")
    op.execute("ALTER TYPE activitytype ADD VALUE IF NOT EXISTS 'TEAM_SETTINGS_UPDATED'")
    op.execute("ALTER TYPE activitytype ADD VALUE IF NOT EXISTS 'SESSION_CREATED'")
    op.execute("ALTER TYPE activitytype ADD VALUE IF NOT EXISTS 'SESSION_ENDED'")
    op.execute("ALTER TYPE activitytype ADD VALUE IF NOT EXISTS 'SERVER_RESTARTED'")


def downgrade() -> None:
    # PostgreSQL에서는 enum 값을 제거할 수 없음
    # 전체 enum을 재생성해야 하는데, 이는 매우 복잡하고 위험함
    # 따라서 downgrade는 구현하지 않음
    pass

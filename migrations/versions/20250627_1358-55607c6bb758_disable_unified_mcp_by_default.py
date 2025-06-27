"""disable_unified_mcp_by_default

Revision ID: 55607c6bb758
Revises: 38d4bd81b787
Create Date: 2025-06-27 13:58:44.302875

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '55607c6bb758'
down_revision: Union[str, None] = '38d4bd81b787'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """기존 프로젝트들의 unified_mcp_enabled를 False로 설정 (베타 기능이므로 기본 비활성화)"""
    # 기존 프로젝트들의 unified_mcp_enabled를 False로 업데이트
    op.execute(
        "UPDATE projects SET unified_mcp_enabled = false WHERE unified_mcp_enabled = true"
    )


def downgrade() -> None:
    """이전 상태로 되돌리기 (모든 프로젝트의 unified_mcp_enabled를 True로 설정)"""
    # 다운그레이드 시에는 모든 프로젝트를 True로 되돌림
    op.execute(
        "UPDATE projects SET unified_mcp_enabled = true WHERE unified_mcp_enabled = false"
    )

"""add_cwd_field_to_mcp_servers

Revision ID: c0f8f6824b89
Revises: 82afefa65f8b
Create Date: 2025-06-11 08:43:11.621964

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'c0f8f6824b89'
down_revision: Union[str, None] = '82afefa65f8b'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # ### commands auto generated by Alembic - please adjust! ###
    op.add_column('mcp_servers', sa.Column('cwd', sa.String(length=500), nullable=True))
    # ### end Alembic commands ###


def downgrade() -> None:
    # ### commands auto generated by Alembic - please adjust! ###
    op.drop_column('mcp_servers', 'cwd')
    # ### end Alembic commands ###

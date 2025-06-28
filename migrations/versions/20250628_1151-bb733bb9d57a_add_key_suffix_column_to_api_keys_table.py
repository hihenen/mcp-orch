"""Add key_suffix column to api_keys table

Revision ID: bb733bb9d57a
Revises: fb936566aaa3
Create Date: 2025-06-28 11:51:41.103121

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'bb733bb9d57a'
down_revision: Union[str, None] = 'fb936566aaa3'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Add key_suffix column to api_keys table
    op.add_column('api_keys', sa.Column('key_suffix', sa.String(length=10), nullable=False, server_default=''))


def downgrade() -> None:
    # Remove key_suffix column from api_keys table
    op.drop_column('api_keys', 'key_suffix')

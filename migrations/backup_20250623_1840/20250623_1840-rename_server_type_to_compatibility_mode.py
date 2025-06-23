"""Rename server_type to compatibility_mode

Revision ID: rename_server_type_to_compatibility_mode
Revises: ecab1c57e2f2
Create Date: 2025-06-23 18:40:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'rename_server_type_to_compatibility_mode'
down_revision: Union[str, None] = 'ecab1c57e2f2'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Rename server_type column to compatibility_mode
    op.alter_column('mcp_servers', 'server_type', new_column_name='compatibility_mode')


def downgrade() -> None:
    # Rename compatibility_mode column back to server_type
    op.alter_column('mcp_servers', 'compatibility_mode', new_column_name='server_type')
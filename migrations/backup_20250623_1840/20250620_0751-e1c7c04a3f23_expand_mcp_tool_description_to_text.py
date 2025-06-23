"""expand_mcp_tool_description_to_text

Revision ID: e1c7c04a3f23
Revises: 9e925a6d9f5f
Create Date: 2025-06-20 07:51:52.651128

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'e1c7c04a3f23'
down_revision: Union[str, None] = '9e925a6d9f5f'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Expand mcp_tools.description column from VARCHAR(1000) to TEXT
    # to accommodate longer tool descriptions from MCP servers
    op.alter_column('mcp_tools', 'description',
                   existing_type=sa.VARCHAR(length=1000),
                   type_=sa.Text(),
                   existing_nullable=True)


def downgrade() -> None:
    # Revert mcp_tools.description column back to VARCHAR(1000)
    # Note: This will truncate any descriptions longer than 1000 characters
    op.alter_column('mcp_tools', 'description',
                   existing_type=sa.Text(),
                   type_=sa.VARCHAR(length=1000),
                   existing_nullable=True)

"""Add timestamps to tool_preferences

Revision ID: fb936566aaa3
Revises: a1b2c3d4e5f6
Create Date: 2025-06-27 22:56:31.379644

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'fb936566aaa3'
down_revision: Union[str, None] = 'a1b2c3d4e5f6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Check if updated_at column exists, if not add it
    connection = op.get_bind()
    inspector = sa.inspect(connection)
    columns = [col['name'] for col in inspector.get_columns('tool_preferences')]
    
    if 'updated_at' not in columns:
        op.add_column('tool_preferences', sa.Column('updated_at', sa.DateTime(), nullable=False, server_default=sa.text('NOW()')))
    
    # Update existing records that might have NULL timestamps
    op.execute("UPDATE tool_preferences SET updated_at = NOW() WHERE updated_at IS NULL")


def downgrade() -> None:
    # Remove updated_at column if it exists
    connection = op.get_bind()
    inspector = sa.inspect(connection)
    columns = [col['name'] for col in inspector.get_columns('tool_preferences')]
    
    if 'updated_at' in columns:
        op.drop_column('tool_preferences', 'updated_at')

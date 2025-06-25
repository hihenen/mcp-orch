"""Add missing user fields: email_verified, image, password, provider, provider_id

Revision ID: add_missing_user_fields
Revises: 38d4bd81b787
Create Date: 2025-06-25 14:59:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = 'add_missing_user_fields'
down_revision: Union[str, None] = '38d4bd81b787'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Add missing user fields
    op.add_column('users', sa.Column('email_verified', sa.DateTime(), nullable=True))
    op.add_column('users', sa.Column('image', sa.String(length=500), nullable=True))
    op.add_column('users', sa.Column('password', sa.String(length=255), nullable=True))
    op.add_column('users', sa.Column('provider', sa.String(length=50), nullable=True))
    op.add_column('users', sa.Column('provider_id', sa.String(length=255), nullable=True))
    
    # Add missing worker_config fields (essential ones only)
    op.add_column('worker_configs', sa.Column('server_check_interval', sa.Integer(), nullable=True, default=300))
    op.add_column('worker_configs', sa.Column('coalesce', sa.Boolean(), nullable=True, default=True))
    op.add_column('worker_configs', sa.Column('max_instances', sa.Integer(), nullable=True, default=1))
    op.add_column('worker_configs', sa.Column('notes', sa.Text(), nullable=True))


def downgrade() -> None:
    # Remove added user fields
    op.drop_column('users', 'provider_id')
    op.drop_column('users', 'provider')
    op.drop_column('users', 'password')
    op.drop_column('users', 'image')
    op.drop_column('users', 'email_verified')
    
    # Remove added worker_config fields
    op.drop_column('worker_configs', 'notes')
    op.drop_column('worker_configs', 'max_instances')
    op.drop_column('worker_configs', 'coalesce')
    op.drop_column('worker_configs', 'server_check_interval')
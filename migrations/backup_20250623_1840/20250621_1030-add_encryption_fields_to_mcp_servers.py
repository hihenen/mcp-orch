"""Add encryption fields to mcp_servers for secure storage of sensitive data

Revision ID: a1b2c3d4e5f6
Revises: d5972937e80e
Create Date: 2025-06-21 10:30:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'a1b2c3d4e5f6'
down_revision: Union[str, None] = 'd5972937e80e'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Add encrypted fields for sensitive data
    op.add_column('mcp_servers', 
                  sa.Column('_args_encrypted', 
                           sa.Text(), 
                           nullable=True, 
                           comment='Encrypted JSON of command arguments'))
    
    op.add_column('mcp_servers', 
                  sa.Column('_env_encrypted', 
                           sa.Text(), 
                           nullable=True, 
                           comment='Encrypted JSON of environment variables'))


def downgrade() -> None:
    # Remove encrypted fields
    op.drop_column('mcp_servers', '_env_encrypted')
    op.drop_column('mcp_servers', '_args_encrypted')
"""add_project_based_architecture

Revision ID: e9c1c46137a1
Revises: 28e9113aacc1
Create Date: 2025-06-06 10:53:17.017785

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = 'e9c1c46137a1'
down_revision: Union[str, None] = '28e9113aacc1'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # ### commands auto generated by Alembic - please adjust! ###
    op.create_table('projects',
    sa.Column('id', sa.UUID(), nullable=False),
    sa.Column('name', sa.String(length=255), nullable=False),
    sa.Column('description', sa.Text(), nullable=True),
    sa.Column('slug', sa.String(length=100), nullable=False),
    sa.Column('created_by', sa.UUID(), nullable=False),
    sa.Column('created_at', sa.DateTime(), nullable=True),
    sa.Column('updated_at', sa.DateTime(), nullable=True),
    sa.ForeignKeyConstraint(['created_by'], ['users.id'], ),
    sa.PrimaryKeyConstraint('id'),
    sa.UniqueConstraint('slug')
    )
    op.create_table('project_members',
    sa.Column('id', sa.UUID(), nullable=False),
    sa.Column('project_id', sa.UUID(), nullable=False),
    sa.Column('user_id', sa.UUID(), nullable=False),
    sa.Column('role', sa.String(length=20), nullable=False),
    sa.Column('invited_as', sa.String(length=20), nullable=False),
    sa.Column('invited_by', sa.UUID(), nullable=False),
    sa.Column('joined_at', sa.DateTime(), nullable=True),
    sa.Column('created_at', sa.DateTime(), nullable=False),
    sa.Column('updated_at', sa.DateTime(), nullable=False),
    sa.ForeignKeyConstraint(['invited_by'], ['users.id'], ),
    sa.ForeignKeyConstraint(['project_id'], ['projects.id'], ),
    sa.ForeignKeyConstraint(['user_id'], ['users.id'], ),
    sa.PrimaryKeyConstraint('id')
    )
    op.add_column('api_keys', sa.Column('project_id', sa.UUID(), nullable=False))
    op.drop_index(op.f('idx_api_key_team'), table_name='api_keys')
    op.create_index('idx_api_key_project', 'api_keys', ['project_id'], unique=False)
    op.drop_constraint(op.f('api_keys_team_id_fkey'), 'api_keys', type_='foreignkey')
    op.create_foreign_key(None, 'api_keys', 'projects', ['project_id'], ['id'])
    op.drop_column('api_keys', 'team_id')
    op.add_column('mcp_servers', sa.Column('project_id', sa.UUID(), nullable=False))
    op.drop_constraint(op.f('mcp_servers_team_id_fkey'), 'mcp_servers', type_='foreignkey')
    op.create_foreign_key(None, 'mcp_servers', 'projects', ['project_id'], ['id'])
    op.drop_column('mcp_servers', 'team_access')
    op.drop_column('mcp_servers', 'team_id')
    # ### end Alembic commands ###


def downgrade() -> None:
    # ### commands auto generated by Alembic - please adjust! ###
    op.add_column('mcp_servers', sa.Column('team_id', sa.UUID(), autoincrement=False, nullable=False))
    op.add_column('mcp_servers', sa.Column('team_access', postgresql.ARRAY(sa.VARCHAR()), autoincrement=False, nullable=False))
    op.drop_constraint(None, 'mcp_servers', type_='foreignkey')
    op.create_foreign_key(op.f('mcp_servers_team_id_fkey'), 'mcp_servers', 'teams', ['team_id'], ['id'])
    op.drop_column('mcp_servers', 'project_id')
    op.add_column('api_keys', sa.Column('team_id', sa.UUID(), autoincrement=False, nullable=False))
    op.drop_constraint(None, 'api_keys', type_='foreignkey')
    op.create_foreign_key(op.f('api_keys_team_id_fkey'), 'api_keys', 'teams', ['team_id'], ['id'])
    op.drop_index('idx_api_key_project', table_name='api_keys')
    op.create_index(op.f('idx_api_key_team'), 'api_keys', ['team_id'], unique=False)
    op.drop_column('api_keys', 'project_id')
    op.drop_table('project_members')
    op.drop_table('projects')
    # ### end Alembic commands ###

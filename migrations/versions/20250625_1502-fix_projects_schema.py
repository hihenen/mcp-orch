"""Fix projects schema to match current models

Revision ID: fix_projects_schema  
Revises: add_missing_user_fields
Create Date: 2025-06-25 15:02:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = 'fix_projects_schema'
down_revision: Union[str, None] = 'add_missing_user_fields'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Fix projects table
    # 1. Rename created_by_id to created_by
    op.alter_column('projects', 'created_by_id', new_column_name='created_by')
    
    # 2. Change description type to Text and slug length
    op.alter_column('projects', 'description',
                   existing_type=sa.VARCHAR(length=1000),
                   type_=sa.Text(),
                   existing_nullable=True)
    
    op.alter_column('projects', 'slug', 
                   existing_type=sa.VARCHAR(length=255),
                   type_=sa.String(length=100),
                   existing_nullable=False)
    
    # 3. Add new fields
    op.add_column('projects', sa.Column('sse_auth_required', sa.Boolean(), nullable=False, default=False))
    op.add_column('projects', sa.Column('message_auth_required', sa.Boolean(), nullable=False, default=True))
    op.add_column('projects', sa.Column('allowed_ip_ranges', sa.JSON(), nullable=True))
    
    # 4. Remove old fields
    op.drop_column('projects', 'team_id')
    op.drop_column('projects', 'is_active') 
    op.drop_column('projects', 'settings')
    
    # Fix project_members table
    # 1. Change role from enum to string
    op.alter_column('project_members', 'role',
                   existing_type=sa.Enum('OWNER', 'ADMIN', 'MEMBER', 'VIEWER', name='projectrole'),
                   type_=sa.String(length=20),
                   existing_nullable=False)
    
    # 2. Rename and modify invite fields
    op.alter_column('project_members', 'invited_by_id', new_column_name='invited_by')
    op.alter_column('project_members', 'invite_source', new_column_name='invited_as')
    op.alter_column('project_members', 'invited_as',
                   existing_type=sa.Enum('DIRECT', 'TEAM', name='invitesource'),
                   type_=sa.String(length=20),
                   existing_nullable=False)
    
    # 3. Add timestamp fields
    op.add_column('project_members', sa.Column('created_at', sa.DateTime(), nullable=False, default=sa.func.now()))
    op.add_column('project_members', sa.Column('updated_at', sa.DateTime(), nullable=False, default=sa.func.now()))
    
    # 4. Remove unique constraint
    op.drop_constraint('project_members_project_id_user_id_key', 'project_members', type_='unique')


def downgrade() -> None:
    # Reverse project_members changes
    op.create_unique_constraint('project_members_project_id_user_id_key', 'project_members', ['project_id', 'user_id'])
    op.drop_column('project_members', 'updated_at')
    op.drop_column('project_members', 'created_at')
    
    op.alter_column('project_members', 'invited_as',
                   existing_type=sa.String(length=20),
                   type_=sa.Enum('DIRECT', 'TEAM', name='invitesource'),
                   existing_nullable=False)
    op.alter_column('project_members', 'invited_as', new_column_name='invite_source')
    op.alter_column('project_members', 'invited_by', new_column_name='invited_by_id')
    
    op.alter_column('project_members', 'role',
                   existing_type=sa.String(length=20),
                   type_=sa.Enum('OWNER', 'ADMIN', 'MEMBER', 'VIEWER', name='projectrole'),
                   existing_nullable=False)
    
    # Reverse projects changes
    op.add_column('projects', sa.Column('settings', sa.JSON(), nullable=False))
    op.add_column('projects', sa.Column('is_active', sa.Boolean(), nullable=False))
    op.add_column('projects', sa.Column('team_id', sa.UUID(), nullable=True))
    
    op.drop_column('projects', 'allowed_ip_ranges')
    op.drop_column('projects', 'message_auth_required')
    op.drop_column('projects', 'sse_auth_required')
    
    op.alter_column('projects', 'slug',
                   existing_type=sa.String(length=100),
                   type_=sa.VARCHAR(length=255),
                   existing_nullable=False)
    
    op.alter_column('projects', 'description',
                   existing_type=sa.Text(),
                   type_=sa.VARCHAR(length=1000),
                   existing_nullable=True)
    
    op.alter_column('projects', 'created_by', new_column_name='created_by_id')
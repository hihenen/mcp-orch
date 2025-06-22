"""unify activities table

Revision ID: unify_activities
Revises: 51bf78f0b48a
Create Date: 2025-06-21 14:50:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = 'unify_activities'
down_revision: Union[str, None] = '51bf78f0b48a'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. Rename project_activities table to activities
    op.rename_table('project_activities', 'activities')
    
    # 2. Make project_id nullable (for team activities)
    op.alter_column('activities', 'project_id',
                   existing_type=postgresql.UUID(),
                   nullable=True)
    
    # 3. Add team_id column for team activities
    op.add_column('activities', sa.Column('team_id', postgresql.UUID(), nullable=True))
    
    # 4. Add foreign key constraint for team_id
    op.create_foreign_key('fk_activities_team_id', 'activities', 'teams', ['team_id'], ['id'], ondelete='CASCADE')
    
    # 5. Drop old indexes and create new ones with correct names
    op.drop_index('idx_project_activities_action_created', table_name='activities')
    op.drop_index('idx_project_activities_project_created', table_name='activities')
    op.drop_index('idx_project_activities_severity', table_name='activities')
    op.drop_index('idx_project_activities_target', table_name='activities')
    op.drop_index('idx_project_activities_user_created', table_name='activities')
    
    # 6. Create new indexes for unified activities table
    op.create_index('idx_activities_action_created', 'activities', ['action', 'created_at'], unique=False)
    op.create_index('idx_activities_project_created', 'activities', ['project_id', 'created_at'], unique=False)
    op.create_index('idx_activities_team_created', 'activities', ['team_id', 'created_at'], unique=False)
    op.create_index('idx_activities_severity', 'activities', ['severity', 'created_at'], unique=False)
    op.create_index('idx_activities_target', 'activities', ['target_type', 'target_id'], unique=False)
    op.create_index('idx_activities_user_created', 'activities', ['user_id', 'created_at'], unique=False)


def downgrade() -> None:
    # 1. Drop new indexes
    op.drop_index('idx_activities_user_created', table_name='activities')
    op.drop_index('idx_activities_target', table_name='activities')
    op.drop_index('idx_activities_severity', table_name='activities')
    op.drop_index('idx_activities_team_created', table_name='activities')
    op.drop_index('idx_activities_project_created', table_name='activities')
    op.drop_index('idx_activities_action_created', table_name='activities')
    
    # 2. Recreate old indexes
    op.create_index('idx_project_activities_user_created', 'activities', ['user_id', 'created_at'], unique=False)
    op.create_index('idx_project_activities_target', 'activities', ['target_type', 'target_id'], unique=False)
    op.create_index('idx_project_activities_severity', 'activities', ['severity', 'created_at'], unique=False)
    op.create_index('idx_project_activities_project_created', 'activities', ['project_id', 'created_at'], unique=False)
    op.create_index('idx_project_activities_action_created', 'activities', ['action', 'created_at'], unique=False)
    
    # 3. Drop foreign key constraint for team_id
    op.drop_constraint('fk_activities_team_id', 'activities', type_='foreignkey')
    
    # 4. Remove team_id column
    op.drop_column('activities', 'team_id')
    
    # 5. Make project_id not nullable again
    op.alter_column('activities', 'project_id',
                   existing_type=postgresql.UUID(),
                   nullable=False)
    
    # 6. Rename activities table back to project_activities
    op.rename_table('activities', 'project_activities')
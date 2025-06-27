"""Add tool_preferences table for project-specific tool filtering

Revision ID: a1b2c3d4e5f6
Revises: 55607c6bb758
Create Date: 2025-06-27 22:10:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = 'a1b2c3d4e5f6'
down_revision = '55607c6bb758'
branch_labels = None
depends_on = None


def upgrade():
    # Create tool_preferences table
    op.create_table('tool_preferences',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('project_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('server_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('tool_name', sa.String(length=255), nullable=False),
        sa.Column('is_enabled', sa.Boolean(), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['project_id'], ['projects.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['server_id'], ['mcp_servers.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('project_id', 'server_id', 'tool_name', name='uq_tool_preference')
    )
    
    # Create indexes for performance optimization
    op.create_index('idx_tool_preferences_project_server', 'tool_preferences', ['project_id', 'server_id'])
    op.create_index('idx_tool_preferences_enabled', 'tool_preferences', ['project_id', 'server_id', 'is_enabled'])


def downgrade():
    # Drop indexes
    op.drop_index('idx_tool_preferences_enabled', 'tool_preferences')
    op.drop_index('idx_tool_preferences_project_server', 'tool_preferences')
    
    # Drop table
    op.drop_table('tool_preferences')
"""Add process tracking fields to mcp_servers table

Revision ID: add_process_tracking_fields
Revises: b8c0dc689156
Create Date: 2025-01-31 12:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = 'add_process_tracking_fields'
down_revision = 'b8c0dc689156'
branch_labels = None
depends_on = None


def upgrade():
    """Add process tracking and health monitoring fields."""
    # Check and add new columns for process tracking (only if they don't exist)
    conn = op.get_bind()
    
    # Check if process_id already exists
    result = conn.execute(sa.text("""
        SELECT column_name FROM information_schema.columns 
        WHERE table_name='mcp_servers' AND column_name='process_id'
    """))
    if not result.fetchone():
        op.add_column('mcp_servers', sa.Column('process_id', sa.Integer(), nullable=True, comment='OS process ID when running'))
    
    # Check and add other columns
    columns_to_add = [
        ('last_health_check', sa.DateTime(), 'Last successful health check timestamp'),
        ('health_check_failures', sa.Integer(), 'Consecutive health check failures count'),
        ('last_restart_attempt', sa.DateTime(), 'Last restart attempt timestamp'), 
        ('restart_count', sa.Integer(), 'Total restart count'),
        ('is_auto_restart_enabled', sa.Boolean(), 'Auto restart on failure enabled'),
        ('failure_reason', sa.String(1000), 'Last failure reason')
    ]
    
    for col_name, col_type, comment in columns_to_add:
        result = conn.execute(sa.text(f"""
            SELECT column_name FROM information_schema.columns 
            WHERE table_name='mcp_servers' AND column_name='{col_name}'
        """))
        if not result.fetchone():
            if col_name in ['health_check_failures', 'restart_count']:
                # 첫 번째: nullable로 추가
                col = sa.Column(col_name, col_type, nullable=True, comment=comment)
                op.add_column('mcp_servers', col)
                # 두 번째: 기본값 설정
                conn.execute(sa.text(f"UPDATE mcp_servers SET {col_name} = 0 WHERE {col_name} IS NULL"))
                # 세 번째: NOT NULL로 변경
                op.alter_column('mcp_servers', col_name, nullable=False)
            elif col_name == 'is_auto_restart_enabled':
                # 첫 번째: nullable로 추가
                col = sa.Column(col_name, col_type, nullable=True, comment=comment)
                op.add_column('mcp_servers', col)
                # 두 번째: 기본값 설정
                conn.execute(sa.text(f"UPDATE mcp_servers SET {col_name} = true WHERE {col_name} IS NULL"))
                # 세 번째: NOT NULL로 변경
                op.alter_column('mcp_servers', col_name, nullable=False)
            else:
                col = sa.Column(col_name, col_type, nullable=True, comment=comment)
                op.add_column('mcp_servers', col)


def downgrade():
    """Remove process tracking fields."""
    op.drop_column('mcp_servers', 'failure_reason')
    op.drop_column('mcp_servers', 'is_auto_restart_enabled')
    op.drop_column('mcp_servers', 'restart_count')
    op.drop_column('mcp_servers', 'last_restart_attempt')
    op.drop_column('mcp_servers', 'health_check_failures')
    op.drop_column('mcp_servers', 'last_health_check')
    op.drop_column('mcp_servers', 'process_id')
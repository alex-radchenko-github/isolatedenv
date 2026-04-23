"""Add audit_log table.

Revision ID: 002
Revises: 001
Create Date: 2025-01-01 00:00:00.000000
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects.postgresql import JSONB, UUID

revision: str = "002"
down_revision: Union[str, None] = "001"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "audit_log",
        sa.Column("id", UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("admin_user_id", UUID(as_uuid=True), nullable=False),
        sa.Column("admin_email", sa.String(320), nullable=False),
        sa.Column("action", sa.String(20), nullable=False),
        sa.Column("target_user_id", UUID(as_uuid=True), nullable=False),
        sa.Column("target_user_email", sa.String(320), nullable=False),
        sa.Column("details", JSONB(), nullable=True),
        sa.Column("ip_address", sa.String(45), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        # No updated_at trigger -- audit entries are immutable (column kept for ORM Base compatibility)
    )
    op.create_index("ix_audit_log_admin_user_id", "audit_log", ["admin_user_id"])
    op.create_index("ix_audit_log_target_user_id", "audit_log", ["target_user_id"])

    # Composite index for paginated action queries (action + created_at DESC)
    op.execute('CREATE INDEX ix_audit_log_action_created_at ON audit_log (action, created_at DESC)')

    # Composite index for cursor-based (keyset) pagination: ORDER BY created_at DESC, id DESC
    op.execute('CREATE INDEX ix_audit_log_created_at_id ON audit_log (created_at DESC, id DESC)')

    # GIN trgm indexes for ILIKE search on email columns
    op.execute('CREATE INDEX ix_audit_log_admin_email_trgm ON audit_log USING GIN (admin_email gin_trgm_ops)')
    op.execute('CREATE INDEX ix_audit_log_target_email_trgm ON audit_log USING GIN (target_user_email gin_trgm_ops)')

    # CHECK constraint: only allow known audit actions
    op.execute("""
        ALTER TABLE audit_log ADD CONSTRAINT ck_audit_log_action
        CHECK (action IN ('change_role', 'block_user', 'unblock_user', 'delete_user', 'reset_password', 'delete_self'))
    """)


def downgrade() -> None:
    op.execute('ALTER TABLE audit_log DROP CONSTRAINT IF EXISTS ck_audit_log_action')
    op.execute('DROP INDEX IF EXISTS ix_audit_log_target_email_trgm')
    op.execute('DROP INDEX IF EXISTS ix_audit_log_admin_email_trgm')
    op.execute('DROP INDEX IF EXISTS ix_audit_log_created_at_id')
    op.execute('DROP INDEX IF EXISTS ix_audit_log_action_created_at')
    op.drop_index("ix_audit_log_target_user_id", table_name="audit_log")
    op.drop_index("ix_audit_log_admin_user_id", table_name="audit_log")
    op.drop_table("audit_log")

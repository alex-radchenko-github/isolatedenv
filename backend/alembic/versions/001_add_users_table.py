"""Add users table with RBAC.

Revision ID: 001
Revises:
Create Date: 2025-01-01 00:00:00.000000
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects.postgresql import UUID

revision: str = "001"
down_revision: Union[str, None] = "000"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "users",
        sa.Column("id", UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("provider_id", sa.String(128), nullable=False),
        sa.Column("email", sa.String(320), nullable=False),
        sa.Column("name", sa.String(255), nullable=False, server_default=""),
        sa.Column("role", sa.String(20), nullable=False, server_default="free"),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("role_changed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("role_changed_by", sa.String(36), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index("ix_users_provider_id", "users", ["provider_id"], unique=True)
    op.create_index("ix_users_email", "users", ["email"], unique=True)
    op.create_index("ix_users_role_created_at", "users", ["role", "created_at"])

    # Composite index for cursor-based (keyset) pagination: ORDER BY created_at DESC, id DESC
    op.execute('CREATE INDEX ix_users_created_at_id ON users (created_at DESC, id DESC)')

    # Partial index for quickly finding active users
    op.execute('CREATE INDEX ix_users_active ON users (id) WHERE is_active = true')

    # GIN trgm indexes for fuzzy ILIKE search (extension created in migration 000)
    op.execute('CREATE INDEX ix_users_email_trgm ON users USING GIN (email gin_trgm_ops)')
    op.execute('CREATE INDEX ix_users_name_trgm ON users USING GIN (name gin_trgm_ops)')

    # PostgreSQL trigger for auto-updating updated_at (function created in migration 000)
    op.execute("""
        CREATE TRIGGER trg_users_updated_at
        BEFORE UPDATE ON users
        FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    """)


def downgrade() -> None:
    op.execute("DROP TRIGGER IF EXISTS trg_users_updated_at ON users")
    op.execute('DROP INDEX IF EXISTS ix_users_email_trgm')
    op.execute('DROP INDEX IF EXISTS ix_users_name_trgm')
    op.execute('DROP INDEX IF EXISTS ix_users_active')
    op.execute('DROP INDEX IF EXISTS ix_users_created_at_id')
    op.drop_index("ix_users_role_created_at", table_name="users")
    op.drop_index("ix_users_email", table_name="users")
    op.drop_index("ix_users_provider_id", table_name="users")
    op.drop_table("users")

"""Add items table.

Revision ID: 003
Revises: 002
Create Date: 2025-01-01 00:00:00.000000
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects.postgresql import UUID

revision: str = "003"
down_revision: Union[str, None] = "002"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "items",
        sa.Column("id", UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("title", sa.String(255), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("owner_id", UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index("ix_items_title", "items", ["title"])
    op.create_index("ix_items_owner_id", "items", ["owner_id"])

    # Composite index for cursor-based (keyset) pagination: ORDER BY created_at DESC, id DESC
    op.execute('CREATE INDEX ix_items_created_at_id ON items (created_at DESC, id DESC)')

    op.execute("""
        CREATE TRIGGER trg_items_updated_at
        BEFORE UPDATE ON items
        FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    """)


def downgrade() -> None:
    op.execute("DROP TRIGGER IF EXISTS trg_items_updated_at ON items")
    op.execute('DROP INDEX IF EXISTS ix_items_created_at_id')
    op.drop_index("ix_items_owner_id", table_name="items")
    op.drop_index("ix_items_title", table_name="items")
    op.drop_table("items")

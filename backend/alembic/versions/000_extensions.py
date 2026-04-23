"""Install shared PostgreSQL extensions and functions.

Revision ID: 000
Revises:
Create Date: 2025-01-01 00:00:00.000000
"""

from typing import Sequence, Union

from alembic import op

revision: str = "000"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # pg_trgm for fuzzy ILIKE search indexes.
    # uuid-ossp is NOT needed -- gen_random_uuid() is built-in since PG 14.
    op.execute('CREATE EXTENSION IF NOT EXISTS pg_trgm')

    # Shared trigger function for auto-updating updated_at on any table.
    # Used by trg_users_updated_at, trg_items_updated_at, etc.
    op.execute("""
        CREATE OR REPLACE FUNCTION update_updated_at_column()
        RETURNS TRIGGER AS $$
        BEGIN
            NEW.updated_at = NOW();
            RETURN NEW;
        END;
        $$ LANGUAGE plpgsql;
    """)


def downgrade() -> None:
    op.execute("DROP FUNCTION IF EXISTS update_updated_at_column()")
    op.execute('DROP EXTENSION IF EXISTS pg_trgm')

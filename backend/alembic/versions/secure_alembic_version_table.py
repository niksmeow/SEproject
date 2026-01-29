"""move alembic_version to private schema

Revision ID: secure_alembic_version
Revises: 9f1279af6152
Create Date: 2026-01-28 12:00:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'secure_alembic_version'
down_revision: Union[str, None] = '9f1279af6152'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Create alembic schema if it doesn't exist
    op.execute("CREATE SCHEMA IF NOT EXISTS alembic")
    
    # Check if alembic_version table exists in public schema
    # If it exists, move it to alembic schema
    # If it doesn't exist yet, Alembic will create it in the new schema automatically
    op.execute("""
        DO $$
        BEGIN
            IF EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_schema = 'public' 
                AND table_name = 'alembic_version'
            ) THEN
                -- Move table to alembic schema
                ALTER TABLE public.alembic_version SET SCHEMA alembic;
            END IF;
        END $$;
    """)
    
    # Revoke all privileges from public and authenticated roles on alembic schema
    op.execute("REVOKE ALL ON SCHEMA alembic FROM PUBLIC")
    op.execute("REVOKE ALL ON SCHEMA alembic FROM authenticated")
    op.execute("REVOKE ALL ON SCHEMA alembic FROM anon")
    
    # Revoke privileges on alembic_version table if it exists
    op.execute("""
        DO $$
        BEGIN
            IF EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_schema = 'alembic' 
                AND table_name = 'alembic_version'
            ) THEN
                REVOKE ALL ON TABLE alembic.alembic_version FROM PUBLIC;
                REVOKE ALL ON TABLE alembic.alembic_version FROM authenticated;
                REVOKE ALL ON TABLE alembic.alembic_version FROM anon;
            END IF;
        END $$;
    """)
    
    # Grant usage and select only to service_role (Supabase service role)
    # Note: This assumes service_role exists. If not, the migration will still work
    # but you may need to adjust permissions manually
    op.execute("""
        DO $$
        BEGIN
            IF EXISTS (
                SELECT FROM pg_roles WHERE rolname = 'service_role'
            ) THEN
                GRANT USAGE ON SCHEMA alembic TO service_role;
                IF EXISTS (
                    SELECT FROM information_schema.tables 
                    WHERE table_schema = 'alembic' 
                    AND table_name = 'alembic_version'
                ) THEN
                    GRANT SELECT, INSERT, UPDATE ON TABLE alembic.alembic_version TO service_role;
                END IF;
            END IF;
        END $$;
    """)


def downgrade() -> None:
    # Move table back to public schema
    op.execute("""
        DO $$
        BEGIN
            IF EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_schema = 'alembic' 
                AND table_name = 'alembic_version'
            ) THEN
                ALTER TABLE alembic.alembic_version SET SCHEMA public;
            END IF;
        END $$;
    """)
    
    # Note: We don't drop the alembic schema in downgrade to be safe
    # You can drop it manually if needed: DROP SCHEMA IF EXISTS alembic CASCADE;

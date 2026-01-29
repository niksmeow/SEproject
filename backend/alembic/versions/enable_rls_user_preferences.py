"""enable rls on user_preferences

Revision ID: enable_rls_user_prefs
Revises: secure_alembic_version
Create Date: 2026-01-28 13:00:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'enable_rls_user_prefs'
down_revision: Union[str, None] = 'secure_alembic_version'  # Points to secure_alembic_version migration
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Enable Row Level Security on user_preferences table
    op.execute("ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY")
    
    # Drop existing policies if they exist (to avoid conflicts)
    op.execute('DROP POLICY IF EXISTS "Users can view own preferences" ON user_preferences')
    op.execute('DROP POLICY IF EXISTS "Users can insert own preferences" ON user_preferences')
    op.execute('DROP POLICY IF EXISTS "Users can update own preferences" ON user_preferences')
    op.execute('DROP POLICY IF EXISTS "Users can delete own preferences" ON user_preferences')
    
    # Create RLS policies
    # Users can only view their own preferences
    op.execute("""
        CREATE POLICY "Users can view own preferences" ON user_preferences
            FOR SELECT USING (auth.uid() = user_id)
    """)
    
    # Users can only insert preferences for themselves
    op.execute("""
        CREATE POLICY "Users can insert own preferences" ON user_preferences
            FOR INSERT WITH CHECK (auth.uid() = user_id)
    """)
    
    # Users can only update their own preferences
    op.execute("""
        CREATE POLICY "Users can update own preferences" ON user_preferences
            FOR UPDATE USING (auth.uid() = user_id)
    """)
    
    # Users can only delete their own preferences
    op.execute("""
        CREATE POLICY "Users can delete own preferences" ON user_preferences
            FOR DELETE USING (auth.uid() = user_id)
    """)


def downgrade() -> None:
    # Drop policies
    op.execute('DROP POLICY IF EXISTS "Users can view own preferences" ON user_preferences')
    op.execute('DROP POLICY IF EXISTS "Users can insert own preferences" ON user_preferences')
    op.execute('DROP POLICY IF EXISTS "Users can update own preferences" ON user_preferences')
    op.execute('DROP POLICY IF EXISTS "Users can delete own preferences" ON user_preferences')
    
    # Disable RLS (optional - you may want to keep it enabled)
    # op.execute("ALTER TABLE user_preferences DISABLE ROW LEVEL SECURITY")

"""add search_keywords to jobs

Revision ID: add_search_keywords
Revises: 
Create Date: 2026-01-27 16:50:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'add_search_keywords'
down_revision = None
branch_labels = None
depends_on = None


def upgrade():
    # Add search_keywords column to jobs table
    op.add_column('jobs', sa.Column('search_keywords', sa.String(), nullable=True))


def downgrade():
    # Remove search_keywords column from jobs table
    op.drop_column('jobs', 'search_keywords')

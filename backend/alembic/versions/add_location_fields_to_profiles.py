"""add location fields to profiles

Revision ID: add_location_fields
Revises: add_search_keywords
Create Date: 2026-01-27 17:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'add_location_fields'
down_revision = 'add_search_keywords'
branch_labels = None
depends_on = None


def upgrade():
    # Add location fields to profiles table
    op.add_column('profiles', sa.Column('location', sa.String(), nullable=True))
    op.add_column('profiles', sa.Column('latitude', sa.String(), nullable=True))
    op.add_column('profiles', sa.Column('longitude', sa.String(), nullable=True))
    op.add_column('profiles', sa.Column('location_radius', sa.String(), nullable=True, server_default='50'))


def downgrade():
    # Remove location fields from profiles table
    op.drop_column('profiles', 'location_radius')
    op.drop_column('profiles', 'longitude')
    op.drop_column('profiles', 'latitude')
    op.drop_column('profiles', 'location')

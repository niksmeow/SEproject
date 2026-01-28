"""add_location_fields_to_profiles

Revision ID: 9e6d748b631a
Revises: add_search_keywords
Create Date: 2026-01-27 20:29:52.666753

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '9e6d748b631a'
down_revision: Union[str, None] = 'add_search_keywords'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Add location fields to profiles table
    op.add_column('profiles', sa.Column('location', sa.String(), nullable=True))
    op.add_column('profiles', sa.Column('latitude', sa.String(), nullable=True))
    op.add_column('profiles', sa.Column('longitude', sa.String(), nullable=True))
    op.add_column('profiles', sa.Column('location_radius', sa.String(), nullable=True, server_default='50'))


def downgrade() -> None:
    # Remove location fields from profiles table
    op.drop_column('profiles', 'location_radius')
    op.drop_column('profiles', 'longitude')
    op.drop_column('profiles', 'latitude')
    op.drop_column('profiles', 'location')

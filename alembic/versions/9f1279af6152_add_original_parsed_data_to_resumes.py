"""add_original_parsed_data_to_resumes

Revision ID: 9f1279af6152
Revises: 9e6d748b631a
Create Date: 2026-01-27 20:48:30.953339

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '9f1279af6152'
down_revision: Union[str, None] = '9e6d748b631a'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Add original_parsed_data column to resumes table
    op.add_column('resumes', sa.Column('original_parsed_data', sa.JSON(), nullable=True))


def downgrade() -> None:
    # Remove original_parsed_data column from resumes table
    op.drop_column('resumes', 'original_parsed_data')

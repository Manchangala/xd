"""add admin activities

Revision ID: b81b83d7420f
Revises: 69faf3bee003
Create Date: 2026-05-15 11:45:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "b81b83d7420f"
down_revision: Union[str, Sequence[str], None] = "69faf3bee003"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "admin_activities",
        sa.Column("id", sa.String(length=64), nullable=False),
        sa.Column("descripcion", sa.String(length=255), nullable=False),
        sa.Column("fecha", sa.DateTime(timezone=True), nullable=False),
        sa.Column("tipo", sa.String(length=40), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )


def downgrade() -> None:
    op.drop_table("admin_activities")

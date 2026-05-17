"""complete user and profile capabilities

Revision ID: d12f4a6c9e31
Revises: b81b83d7420f
Create Date: 2026-05-16 08:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "d12f4a6c9e31"
down_revision: Union[str, Sequence[str], None] = "b81b83d7420f"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "users",
        sa.Column("activo", sa.Boolean(), nullable=False, server_default=sa.true()),
    )
    op.add_column(
        "students",
        sa.Column("carga_maxima_creditos", sa.Integer(), nullable=False, server_default="20"),
    )
    op.create_table(
        "password_reset_tokens",
        sa.Column("id", sa.String(length=64), nullable=False),
        sa.Column("usuario_id", sa.String(length=64), nullable=False),
        sa.Column("token_hash", sa.String(length=128), nullable=False),
        sa.Column("expira_en", sa.DateTime(timezone=True), nullable=False),
        sa.Column("usado_en", sa.DateTime(timezone=True), nullable=True),
        sa.Column("creado_en", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["usuario_id"], ["users.id"]),
        sa.PrimaryKeyConstraint("id"),
    )


def downgrade() -> None:
    op.drop_table("password_reset_tokens")
    op.drop_column("students", "carga_maxima_creditos")
    op.drop_column("users", "activo")

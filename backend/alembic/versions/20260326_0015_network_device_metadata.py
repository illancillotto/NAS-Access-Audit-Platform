"""add editable metadata to network devices

Revision ID: 20260326_0015
Revises: 20260326_0014
Create Date: 2026-03-26 13:00:00
"""

from alembic import op
import sqlalchemy as sa


revision = "20260326_0015"
down_revision = "20260326_0014"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("network_devices", sa.Column("display_name", sa.String(length=255), nullable=True))
    op.add_column("network_devices", sa.Column("asset_label", sa.String(length=255), nullable=True))
    op.add_column("network_devices", sa.Column("dns_name", sa.String(length=255), nullable=True))
    op.add_column("network_devices", sa.Column("location_hint", sa.String(length=255), nullable=True))
    op.add_column("network_devices", sa.Column("notes", sa.Text(), nullable=True))
    op.create_index("ix_network_devices_display_name", "network_devices", ["display_name"], unique=False)
    op.create_index("ix_network_devices_asset_label", "network_devices", ["asset_label"], unique=False)


def downgrade() -> None:
    op.drop_index("ix_network_devices_asset_label", table_name="network_devices")
    op.drop_index("ix_network_devices_display_name", table_name="network_devices")
    op.drop_column("network_devices", "notes")
    op.drop_column("network_devices", "location_hint")
    op.drop_column("network_devices", "dns_name")
    op.drop_column("network_devices", "asset_label")
    op.drop_column("network_devices", "display_name")

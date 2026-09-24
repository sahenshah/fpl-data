"""create core FPL tables

Revision ID: 0001_initial_schema
"""
from alembic import op
import sqlalchemy as sa


revision = "0001_initial_schema"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "teams",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("name", sa.String(length=100), nullable=False),
        sa.Column("short_name", sa.String(length=10), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_table(
        "players",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("first_name", sa.String(length=100), nullable=False),
        sa.Column("second_name", sa.String(length=100), nullable=False),
        sa.Column("web_name", sa.String(length=100), nullable=False),
        sa.Column("team_id", sa.Integer(), nullable=False),
        sa.ForeignKeyConstraint(["team_id"], ["teams.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_players_web_name", "players", ["web_name"])
    op.create_index("ix_players_team_id", "players", ["team_id"])
    op.create_table(
        "events",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("name", sa.String(length=50), nullable=False),
        sa.Column("deadline_time", sa.DateTime(timezone=True), nullable=True),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_table(
        "fixtures",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("event_id", sa.Integer(), nullable=True),
        sa.Column("home_team_id", sa.Integer(), nullable=False),
        sa.Column("away_team_id", sa.Integer(), nullable=False),
        sa.Column("kickoff_time", sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(["away_team_id"], ["teams.id"]),
        sa.ForeignKeyConstraint(["event_id"], ["events.id"]),
        sa.ForeignKeyConstraint(["home_team_id"], ["teams.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_fixtures_event_id", "fixtures", ["event_id"])
    op.create_index("ix_fixtures_home_team_id", "fixtures", ["home_team_id"])
    op.create_index("ix_fixtures_away_team_id", "fixtures", ["away_team_id"])
    op.create_table(
        "ingestion_runs",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("source", sa.String(length=50), nullable=False),
        sa.Column("status", sa.String(length=20), nullable=False),
        sa.Column("started_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("completed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("error_message", sa.String(length=500), nullable=True),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("source", "started_at"),
    )
    op.create_index("ix_ingestion_runs_source", "ingestion_runs", ["source"])


def downgrade() -> None:
    op.drop_index("ix_ingestion_runs_source", table_name="ingestion_runs")
    op.drop_table("ingestion_runs")
    op.drop_index("ix_fixtures_away_team_id", table_name="fixtures")
    op.drop_index("ix_fixtures_home_team_id", table_name="fixtures")
    op.drop_index("ix_fixtures_event_id", table_name="fixtures")
    op.drop_table("fixtures")
    op.drop_table("events")
    op.drop_index("ix_players_team_id", table_name="players")
    op.drop_index("ix_players_web_name", table_name="players")
    op.drop_table("players")
    op.drop_table("teams")

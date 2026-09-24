from decimal import Decimal

from sqlalchemy import create_engine, select
from sqlalchemy.orm import Session

from fpl_iq.db import Base
from fpl_iq.ingestion.history import history_rows, replace_player_history
from fpl_iq.models import PlayerGameweekStat


def test_history_rows_normalizes_api_values() -> None:
    rows = history_rows(1, {"history": [{"round": 1, "fixture": 10, "total_points": 8, "influence": "42.5", "kickoff_time": "2026-08-21T17:30:00Z"}]})

    assert rows[0].player_id == 1
    assert rows[0].gameweek == 1
    assert rows[0].total_points == 8
    assert rows[0].influence == Decimal("42.5")


def test_replace_player_history_is_idempotent() -> None:
    engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(engine)
    payload = {"history": [{"round": 1, "fixture": 10, "total_points": 8}]}

    with Session(engine) as session:
        replace_player_history(session, 1, payload)
        session.commit()
        replace_player_history(session, 1, payload)
        session.commit()
        assert len(session.scalars(select(PlayerGameweekStat)).all()) == 1

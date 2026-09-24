from sqlalchemy import create_engine, select
from sqlalchemy.orm import Session

from fpl_iq.db import Base
from fpl_iq.ingestion.bootstrap import persist_bootstrap
from fpl_iq.models import BootstrapSnapshot, Chip, Event, Phase, Player, Team


def test_persist_bootstrap_replaces_previous_snapshot() -> None:
    engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(engine)
    payload = {
        "teams": [{"id": 1, "name": "Arsenal", "short_name": "ARS"}],
        "elements": [
            {
                "id": 10,
                "first_name": "Test",
                "second_name": "Player",
                "web_name": "Player",
                "team": 1,
            }
        ],
        "events": [{"id": 1, "name": "Gameweek 1", "deadline_time": "2026-08-14T18:30:00Z"}],
        "chips": [{"id": 1, "name": "wildcard", "number": 1, "start_event": 1, "stop_event": 19, "chip_type": "transfer", "overrides": {"rules": {}}}],
        "phases": [{"id": 1, "name": "Overall", "start_event": 1, "stop_event": 38, "highest_score": None}],
        "element_types": [],
    }

    with Session(engine) as session:
        persist_bootstrap(session, payload)
        persist_bootstrap(session, payload)

        assert len(session.scalars(select(Team)).all()) == 1
        assert len(session.scalars(select(Player)).all()) == 1
        assert len(session.scalars(select(Event)).all()) == 1
        assert len(session.scalars(select(Chip)).all()) == 1
        assert len(session.scalars(select(Phase)).all()) == 1
        assert len(session.scalars(select(BootstrapSnapshot)).all()) == 2

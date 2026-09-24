from datetime import datetime

from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.pool import StaticPool
from sqlalchemy.orm import Session

from fpl_iq.db import Base, get_session
from fpl_iq.main import app
from fpl_iq.models import BootstrapSnapshot, Event


def test_bootstrap_uses_etag_and_conditional_response() -> None:
    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(engine)
    with Session(engine) as session:
        session.add(BootstrapSnapshot(fetched_at=datetime(2026, 1, 1), raw_data={"events": [], "teams": []}))
        session.commit()

    def override_session():
        with Session(engine) as session:
            yield session

    app.dependency_overrides[get_session] = override_session
    try:
        with TestClient(app) as client:
            first = client.get("/api/v1/bootstrap")
            second = client.get("/api/v1/bootstrap", headers={"If-None-Match": first.headers["etag"]})

        assert first.status_code == 200
        assert first.json() == {"events": [], "teams": []}
        assert second.status_code == 304
        assert second.text == ""
    finally:
        app.dependency_overrides.clear()


def test_manager_snapshot_aggregates_manager_payloads(monkeypatch) -> None:
    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(engine)
    with Session(engine) as session:
        session.add(Event(id=1, name="Gameweek 1", is_current=True))
        session.commit()

    def override_session():
        with Session(engine) as session:
            yield session

    class FakeClient:
        base_url = "https://test"

        def __init__(self, client=None):
            pass

        async def fetch_entry(self, team_id: int):
            return {"id": team_id}

        async def fetch_entry_transfers(self, team_id: int):
            return [{"element_in": 1}]

        async def fetch_entry_history(self, team_id: int):
            return {"current": []}

        async def fetch_entry_picks(self, team_id: int, gameweek: int):
            return {"event": gameweek, "picks": []}

    import fpl_iq.api as api

    api.cache.clear()
    monkeypatch.setattr(api, "FplClient", FakeClient)
    app.dependency_overrides[get_session] = override_session
    try:
        with TestClient(app) as client:
            result = client.get("/api/v1/managers/123/snapshot")

        assert result.status_code == 200
        assert result.json()["team"] == {"id": 123}
        assert result.json()["picks"] == [{"gameweek": 1, "data": {"event": 1, "picks": []}}]
    finally:
        app.dependency_overrides.clear()
        api.cache.clear()

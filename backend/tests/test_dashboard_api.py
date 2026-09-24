from datetime import datetime

from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import Session
from sqlalchemy.pool import StaticPool

from fpl_iq.db import Base, get_session
from fpl_iq.main import app
from fpl_iq.models import BootstrapSnapshot, Fixture


def test_dashboard_combines_database_payloads() -> None:
    engine = create_engine("sqlite://", connect_args={"check_same_thread": False}, poolclass=StaticPool)
    Base.metadata.create_all(engine)
    with Session(engine) as session:
        session.add(BootstrapSnapshot(fetched_at=datetime(2026, 1, 1), raw_data={"elements": [], "teams": [], "events": []}))
        session.add(Fixture(id=1, event_id=1, home_team_id=1, away_team_id=2, raw_data={"id": 1, "event": 1}))
        session.commit()

    def override_session():
        with Session(engine) as session:
            yield session

    app.dependency_overrides[get_session] = override_session
    try:
        response = TestClient(app).get("/api/v1/dashboard")
        assert response.status_code == 200
        assert response.json()["bootstrap"]["elements"] == []
        assert response.json()["fixtures"] == [{"id": 1, "event": 1}]
    finally:
        app.dependency_overrides.clear()

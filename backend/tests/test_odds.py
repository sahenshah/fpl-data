from decimal import Decimal
from pathlib import Path
from types import SimpleNamespace

import pytest

from fpl_iq.ingestion.odds import devig, parse_historical_odds_csv, parse_live_odds_payload, replace_historical_odds
from fpl_iq.db import Base
from fpl_iq.models import Fixture, HistoricalMatchOdds, Team
from sqlalchemy import create_engine, select
from sqlalchemy.orm import Session


def test_devig_normalizes_implied_probabilities_to_sum_to_one() -> None:
    # decimal odds 2.0/3.5/4.0 -> implied 0.5/0.2857/0.25 -> sums to ~1.0357 (3.57% margin)
    implied = [1 / 2.0, 1 / 3.5, 1 / 4.0]
    result = devig(implied)
    assert sum(result) == pytest.approx(1.0)
    assert result[0] > result[1] > result[2]


def _write(tmp_path: Path, name: str, content: str) -> Path:
    path = tmp_path / name
    path.write_text(content)
    return path


HISTORICAL_ODDS_CSV = (
    "Date,HomeTeam,AwayTeam,AvgH,AvgD,AvgA,Avg>2.5,Avg<2.5\n"
    "12/08/23,Arsenal,Aston Villa,1.50,4.20,6.50,1.90,1.95\n"
    "12/08/23,Nott'm Forest,Man City,8.00,5.00,1.35,2.10,1.75\n"
)


def test_parse_historical_odds_csv_devigs_and_maps_team_names(tmp_path: Path) -> None:
    path = _write(tmp_path, "E0.csv", HISTORICAL_ODDS_CSV)

    rows = parse_historical_odds_csv(path, "2023-24")

    assert len(rows) == 2
    arsenal_row = next(r for r in rows if r["home_short_name"] == "ARS")
    assert arsenal_row["away_short_name"] == "AVL"
    assert arsenal_row["home_win_probability"] > arsenal_row["away_win_probability"]
    assert sum([
        float(arsenal_row["home_win_probability"]), float(arsenal_row["draw_probability"]), float(arsenal_row["away_win_probability"]),
    ]) == pytest.approx(1.0, abs=1e-3)


def test_parse_historical_odds_csv_requires_core_columns(tmp_path: Path) -> None:
    path = _write(tmp_path, "E0.csv", "Date,HomeTeam,AwayTeam\n12/08/23,Arsenal,Aston Villa\n")

    with pytest.raises(ValueError, match="missing expected column"):
        parse_historical_odds_csv(path, "2023-24")


def test_parse_historical_odds_csv_skips_unmatched_team_names(tmp_path: Path) -> None:
    csv_text = "Date,HomeTeam,AwayTeam,AvgH,AvgD,AvgA\n12/08/23,Not A Real Club,Aston Villa,1.50,4.20,6.50\n"
    path = _write(tmp_path, "E0.csv", csv_text)

    rows = parse_historical_odds_csv(path, "2023-24")

    assert rows == []


def test_replace_historical_odds_is_idempotent(tmp_path: Path) -> None:
    engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(engine)
    path = _write(tmp_path, "E0.csv", HISTORICAL_ODDS_CSV)
    rows = parse_historical_odds_csv(path, "2023-24")

    with Session(engine) as session:
        replace_historical_odds(session, "2023-24", rows)
        session.commit()
        replace_historical_odds(session, "2023-24", rows)
        session.commit()
        assert len(session.scalars(select(HistoricalMatchOdds)).all()) == 2


def test_parse_live_odds_payload_matches_to_fixture_and_devigs() -> None:
    fixtures = [Fixture(id=1, event_id=6, home_team_id=1, away_team_id=2, raw_data={})]
    teams_by_id = {
        1: SimpleNamespace(short_name="ARS"),
        2: SimpleNamespace(short_name="AVL"),
    }
    payload = [
        {
            "home_team": "Arsenal",
            "away_team": "Aston Villa",
            "bookmakers": [
                {
                    "markets": [
                        {"key": "h2h", "outcomes": [
                            {"name": "Arsenal", "price": 1.5},
                            {"name": "Draw", "price": 4.2},
                            {"name": "Aston Villa", "price": 6.5},
                        ]},
                        {"key": "totals", "outcomes": [
                            {"name": "Over", "point": 2.5, "price": 1.9},
                            {"name": "Under", "point": 2.5, "price": 1.95},
                        ]},
                    ]
                }
            ],
        }
    ]

    rows = parse_live_odds_payload(payload, fixtures, teams_by_id)

    assert len(rows) == 1
    assert rows[0]["fixture_id"] == 1
    assert rows[0]["home_win_probability"] > rows[0]["away_win_probability"]
    assert rows[0]["over_2_5_probability"] is not None


def test_parse_live_odds_payload_skips_events_with_no_matching_fixture() -> None:
    payload = [{"home_team": "Arsenal", "away_team": "Aston Villa", "bookmakers": []}]
    rows = parse_live_odds_payload(payload, fixtures=[], teams_by_id={})
    assert rows == []

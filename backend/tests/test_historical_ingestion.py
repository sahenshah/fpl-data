from decimal import Decimal
from pathlib import Path

import pytest
from sqlalchemy import create_engine, select
from sqlalchemy.orm import Session

from fpl_iq.db import Base
from fpl_iq.ingestion.historical import parse_merged_gw_csv, parse_players_csv, parse_teams_csv, replace_season
from fpl_iq.models import HistoricalPlayer, HistoricalPlayerGameweekStat, HistoricalTeam


TEAMS_CSV = "id,short_name,strength_attack_home,strength_attack_away,strength_defence_home,strength_defence_away\n1,ARS,1300,1250,1200,1150\n2,BUR,1000,950,1000,950\n"
PLAYERS_CSV = "id,web_name,team,element_type\n10,Saka,1,3\n"
MERGED_GW_CSV = (
    "element,round,fixture,opponent_team,was_home,minutes,total_points,expected_goal_involvements\n"
    "10,1,100,2,True,90,8,0.7\n"
)


def _write(tmp_path: Path, name: str, content: str) -> Path:
    path = tmp_path / name
    path.write_text(content)
    return path


def test_parse_teams_csv_reads_strength_fields(tmp_path: Path) -> None:
    path = _write(tmp_path, "teams.csv", TEAMS_CSV)

    rows = parse_teams_csv(path)

    assert len(rows) == 2
    assert rows[0]["short_name"] == "ARS"
    assert rows[0]["strength_attack_home"] == 1300


def test_parse_teams_csv_requires_short_name(tmp_path: Path) -> None:
    path = _write(tmp_path, "teams.csv", "id,strength_attack_home\n1,1300\n")

    with pytest.raises(ValueError, match="missing expected column"):
        parse_teams_csv(path)


def test_parse_players_csv_maps_team_id_to_short_name(tmp_path: Path) -> None:
    path = _write(tmp_path, "players_raw.csv", PLAYERS_CSV)

    rows = parse_players_csv(path, team_short_name_by_id={"1": "ARS"})

    assert rows[0]["player_key"] == "10"
    assert rows[0]["team_short_name"] == "ARS"
    assert rows[0]["element_type"] == 3


def test_parse_players_csv_raises_on_unknown_team(tmp_path: Path) -> None:
    path = _write(tmp_path, "players_raw.csv", PLAYERS_CSV)

    with pytest.raises(ValueError, match="unknown team id"):
        parse_players_csv(path, team_short_name_by_id={})


def test_parse_merged_gw_csv_normalizes_row(tmp_path: Path) -> None:
    path = _write(tmp_path, "merged_gw.csv", MERGED_GW_CSV)

    rows = parse_merged_gw_csv(path, team_short_name_by_id={"2": "BUR"})

    assert rows[0]["player_key"] == "10"
    assert rows[0]["gameweek"] == 1
    assert rows[0]["opponent_short_name"] == "BUR"
    assert rows[0]["was_home"] is True
    assert rows[0]["total_points"] == 8
    assert rows[0]["expected_goal_involvements"] == Decimal("0.7")


def test_replace_season_is_idempotent(tmp_path: Path) -> None:
    engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(engine)
    teams_csv = _write(tmp_path, "teams.csv", TEAMS_CSV)
    players_csv = _write(tmp_path, "players_raw.csv", PLAYERS_CSV)
    merged_gw_csv = _write(tmp_path, "merged_gw.csv", MERGED_GW_CSV)

    with Session(engine) as session:
        replace_season(session, "2022-23", teams_csv, players_csv, merged_gw_csv)
        session.commit()
        replace_season(session, "2022-23", teams_csv, players_csv, merged_gw_csv)
        session.commit()

        assert len(session.scalars(select(HistoricalTeam)).all()) == 2
        assert len(session.scalars(select(HistoricalPlayer)).all()) == 1
        assert len(session.scalars(select(HistoricalPlayerGameweekStat)).all()) == 1

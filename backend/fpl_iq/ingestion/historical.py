import csv
from datetime import datetime
from decimal import Decimal, InvalidOperation
from pathlib import Path
from typing import Any

from sqlalchemy import delete
from sqlalchemy.orm import Session

from ..models import HistoricalPlayer, HistoricalPlayerGameweekStat, HistoricalTeam

TEAM_COLUMNS = (
    "short_name",
    "strength_attack_home", "strength_attack_away",
    "strength_defence_home", "strength_defence_away",
)
PLAYER_COLUMNS = ("id", "team", "element_type")
GW_STAT_COLUMNS = ("element", "round", "fixture", "opponent_team", "was_home", "minutes", "total_points")


def _require_columns(fieldnames: list[str] | None, required: tuple[str, ...], source: str) -> None:
    available = set(fieldnames or [])
    missing = [column for column in required if column not in available]
    if missing:
        raise ValueError(f"{source} is missing expected column(s): {', '.join(missing)}")


def _read_csv(path: Path) -> list[dict[str, str]]:
    with path.open(newline="", encoding="utf-8") as handle:
        reader = csv.DictReader(handle)
        rows = list(reader)
        return rows if rows else []


def _int(value: Any) -> int | None:
    if value is None or value == "":
        return None
    return int(float(value))


def _decimal(value: Any) -> Decimal | None:
    if value is None or value == "":
        return None
    try:
        return Decimal(str(value))
    except InvalidOperation as error:
        raise ValueError(f"invalid numeric value: {value!r}") from error


def _bool(value: Any) -> bool | None:
    if value is None or value == "":
        return None
    return str(value).strip().lower() in {"true", "1", "yes"}


def _timestamp(value: Any) -> datetime | None:
    if not value:
        return None
    return datetime.fromisoformat(str(value).replace("Z", "+00:00"))


def parse_teams_csv(path: Path) -> list[dict[str, Any]]:
    rows = _read_csv(path)
    if rows:
        _require_columns(list(rows[0].keys()), TEAM_COLUMNS, str(path))
    return [
        {
            "id": row.get("id"),
            "short_name": row["short_name"],
            "strength_overall_home": _int(row.get("strength_overall_home")),
            "strength_overall_away": _int(row.get("strength_overall_away")),
            "strength_attack_home": _int(row.get("strength_attack_home")),
            "strength_attack_away": _int(row.get("strength_attack_away")),
            "strength_defence_home": _int(row.get("strength_defence_home")),
            "strength_defence_away": _int(row.get("strength_defence_away")),
            "raw_data": row,
        }
        for row in rows
    ]


def parse_players_csv(path: Path, team_short_name_by_id: dict[str, str]) -> list[dict[str, Any]]:
    rows = _read_csv(path)
    if rows:
        _require_columns(list(rows[0].keys()), PLAYER_COLUMNS, str(path))
    parsed = []
    for row in rows:
        team_id = str(row["team"])
        team_short_name = team_short_name_by_id.get(team_id)
        if team_short_name is None:
            raise ValueError(f"{path}: unknown team id {team_id!r} not present in teams.csv")
        parsed.append({
            "player_key": str(row["id"]),
            "web_name": row.get("web_name") or f"{row.get('first_name', '')} {row.get('second_name', '')}".strip(),
            "team_short_name": team_short_name,
            "element_type": _int(row.get("element_type")),
            "raw_data": row,
        })
    return parsed


def parse_merged_gw_csv(path: Path, team_short_name_by_id: dict[str, str]) -> list[dict[str, Any]]:
    rows = _read_csv(path)
    if rows:
        _require_columns(list(rows[0].keys()), GW_STAT_COLUMNS, str(path))
    parsed = []
    for row in rows:
        opponent_id = row.get("opponent_team")
        parsed.append({
            "player_key": str(row["element"]),
            "gameweek": _int(row["round"]),
            "fixture_id": _int(row.get("fixture")),
            "opponent_short_name": team_short_name_by_id.get(str(opponent_id)) if opponent_id else None,
            "was_home": _bool(row.get("was_home")),
            "kickoff_time": _timestamp(row.get("kickoff_time")),
            "minutes": _int(row.get("minutes")),
            "starts": _int(row.get("starts")),
            "total_points": _int(row.get("total_points")) or 0,
            "goals_scored": _int(row.get("goals_scored")),
            "assists": _int(row.get("assists")),
            "clean_sheets": _int(row.get("clean_sheets")),
            "goals_conceded": _int(row.get("goals_conceded")),
            "expected_goals": _decimal(row.get("expected_goals")),
            "expected_assists": _decimal(row.get("expected_assists")),
            "expected_goal_involvements": _decimal(row.get("expected_goal_involvements")),
            "expected_goals_conceded": _decimal(row.get("expected_goals_conceded")),
            "raw_data": row,
        })
    return parsed


def replace_season(session: Session, season: str, teams_csv: Path, players_csv: Path, merged_gw_csv: Path) -> dict[str, int]:
    team_rows = parse_teams_csv(teams_csv)
    team_short_name_by_id = {str(row["id"]): row["short_name"] for row in team_rows if row.get("id")}

    player_rows = parse_players_csv(players_csv, team_short_name_by_id)
    stat_rows = parse_merged_gw_csv(merged_gw_csv, team_short_name_by_id)

    session.execute(delete(HistoricalPlayerGameweekStat).where(HistoricalPlayerGameweekStat.season == season))
    session.execute(delete(HistoricalPlayer).where(HistoricalPlayer.season == season))
    session.execute(delete(HistoricalTeam).where(HistoricalTeam.season == season))

    session.add_all(HistoricalTeam(season=season, **{k: v for k, v in row.items() if k != "id"}) for row in team_rows)
    session.add_all(HistoricalPlayer(season=season, **row) for row in player_rows)
    session.add_all(HistoricalPlayerGameweekStat(season=season, **row) for row in stat_rows)

    return {"teams": len(team_rows), "players": len(player_rows), "stats": len(stat_rows)}

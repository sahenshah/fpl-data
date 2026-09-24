from datetime import datetime
from decimal import Decimal, InvalidOperation
from typing import Any

from sqlalchemy import delete, select
from sqlalchemy.orm import Session

from ..models import Player, PlayerGameweekStat


INTEGER_FIELDS = (
    "minutes", "starts", "total_points", "goals_scored", "assists", "clean_sheets", "goals_conceded",
    "own_goals", "penalties_saved", "penalties_missed", "yellow_cards", "red_cards", "saves", "bonus", "bps",
    "clearances_blocks_interceptions", "recoveries", "tackles", "defensive_contribution", "value",
    "transfers_balance", "selected", "transfers_in", "transfers_out",
)
DECIMAL_FIELDS = (
    "influence", "creativity", "threat", "ict_index", "expected_goals", "expected_assists",
    "expected_goal_involvements", "expected_goals_conceded",
)


def _number(value: Any) -> Decimal | None:
    if value is None or value == "":
        return None
    try:
        return Decimal(str(value))
    except (InvalidOperation, ValueError) as error:
        raise ValueError(f"invalid player history numeric value: {value!r}") from error


def _timestamp(value: Any) -> datetime | None:
    if value is None:
        return None
    if not isinstance(value, str):
        raise ValueError("history kickoff_time must be an ISO timestamp")
    return datetime.fromisoformat(value.replace("Z", "+00:00"))


def history_rows(player_id: int, payload: dict[str, Any]) -> list[PlayerGameweekStat]:
    rows: list[PlayerGameweekStat] = []
    for record in payload.get("history", []):
        values: dict[str, Any] = {
            "player_id": player_id,
            "gameweek": record["round"],
            "fixture_id": record.get("fixture"),
            "opponent_team_id": record.get("opponent_team"),
            "was_home": record.get("was_home"),
            "kickoff_time": _timestamp(record.get("kickoff_time")),
            "raw_data": dict(record),
        }
        for field in INTEGER_FIELDS:
            values[field] = record.get(field)
        for field in DECIMAL_FIELDS:
            values[field] = _number(record.get(field))
        rows.append(PlayerGameweekStat(**values))
    return rows


def replace_player_history(session: Session, player_id: int, payload: dict[str, Any]) -> int:
    session.execute(delete(PlayerGameweekStat).where(PlayerGameweekStat.player_id == player_id))
    rows = history_rows(player_id, payload)
    session.add_all(rows)
    return len(rows)


def player_ids(session: Session) -> list[int]:
    return list(session.scalars(select(Player.id).order_by(Player.id)))

from collections.abc import Mapping
from datetime import date, datetime, timezone
from decimal import Decimal, InvalidOperation
from typing import Any

from sqlalchemy import delete
from sqlalchemy.orm import Session

from ..models import BootstrapSnapshot, Chip, ElementType, Event, Fixture, Phase, Player, Team


TEAM_FIELDS = (
    "id", "code", "draw", "form", "loss", "name", "played", "points", "position", "short_name",
    "strength", "team_division", "unavailable", "win", "strength_overall_home", "strength_overall_away",
    "strength_attack_home", "strength_attack_away", "strength_defence_home", "strength_defence_away", "pulse_id",
)
PLAYER_FIELDS = (
    "id", "can_transact", "can_select", "chance_of_playing_next_round", "chance_of_playing_this_round", "code",
    "cost_change_event", "cost_change_event_fall", "cost_change_start", "cost_change_start_fall", "dreamteam_count",
    "element_type", "ep_next", "ep_this", "event_points", "first_name", "form", "in_dreamteam", "news",
    "news_added", "now_cost", "photo", "points_per_game", "removed", "second_name", "selected_by_percent",
    "special", "squad_number", "status", "team_code", "total_points", "transfers_in", "transfers_in_event",
    "transfers_out", "transfers_out_event", "value_form", "value_season", "web_name", "region", "team_join_date",
    "birth_date", "has_temporary_code", "opta_code", "minutes", "goals_scored", "assists", "clean_sheets",
    "goals_conceded", "own_goals", "penalties_saved", "penalties_missed", "yellow_cards", "red_cards", "saves",
    "bonus", "bps", "influence", "creativity", "threat", "ict_index", "clearances_blocks_interceptions",
    "recoveries", "tackles", "defensive_contribution", "starts", "expected_goals", "expected_assists",
    "expected_goal_involvements", "expected_goals_conceded", "influence_rank", "influence_rank_type", "creativity_rank",
    "creativity_rank_type", "threat_rank", "threat_rank_type", "ict_index_rank", "ict_index_rank_type",
    "corners_and_indirect_freekicks_order", "corners_and_indirect_freekicks_text", "direct_freekicks_order",
    "direct_freekicks_text", "penalties_order", "penalties_text", "expected_goals_per_90", "saves_per_90",
    "expected_assists_per_90", "expected_goal_involvements_per_90", "expected_goals_conceded_per_90", "goals_conceded_per_90",
    "now_cost_rank", "now_cost_rank_type", "form_rank", "form_rank_type", "points_per_game_rank",
    "points_per_game_rank_type", "selected_rank", "selected_rank_type", "starts_per_90", "clean_sheets_per_90",
    "defensive_contribution_per_90",
)
PLAYER_DECIMAL_FIELDS = {
    "ep_next", "ep_this", "form", "points_per_game", "selected_by_percent", "value_form", "value_season",
    "influence", "creativity", "threat", "ict_index", "expected_goals", "expected_assists",
    "expected_goal_involvements", "expected_goals_conceded", "expected_goals_per_90", "saves_per_90",
    "expected_assists_per_90", "expected_goal_involvements_per_90", "expected_goals_conceded_per_90",
    "goals_conceded_per_90", "starts_per_90", "clean_sheets_per_90", "defensive_contribution_per_90",
}
DATE_FIELDS = {"team_join_date", "birth_date"}
DATETIME_FIELDS = {"news_added", "deadline_time", "release_time"}


def _required_int(record: Mapping[str, Any], key: str) -> int:
    value = record.get(key)
    if not isinstance(value, int):
        raise ValueError(f"bootstrap record field {key!r} must be an integer")
    return value


def _parse_number(value: Any) -> Decimal | None:
    if value is None or value == "":
        return None
    try:
        return Decimal(str(value))
    except (InvalidOperation, ValueError) as error:
        raise ValueError(f"invalid numeric bootstrap value: {value!r}") from error


def _parse_datetime(value: Any) -> datetime | None:
    if value is None or value == "":
        return None
    if not isinstance(value, str):
        raise ValueError("timestamp must be an ISO string")
    return datetime.fromisoformat(value.replace("Z", "+00:00"))


def _parse_date(value: Any) -> date | None:
    if value is None or value == "":
        return None
    if not isinstance(value, str):
        raise ValueError("date must be an ISO string")
    return date.fromisoformat(value)


def _mapped(record: Mapping[str, Any], fields: tuple[str, ...], *, aliases: dict[str, str] | None = None) -> dict[str, Any]:
    aliases = aliases or {}
    values: dict[str, Any] = {}
    for field in fields:
        source = aliases.get(field, field)
        value = record.get(source)
        if field in PLAYER_DECIMAL_FIELDS:
            value = _parse_number(value)
        elif field in DATE_FIELDS:
            value = _parse_date(value)
        elif field in DATETIME_FIELDS:
            value = _parse_datetime(value)
        values[field] = value
    return values


def persist_bootstrap(session: Session, payload: Mapping[str, Any]) -> None:
    collection_names = ("chips", "events", "phases", "teams", "elements", "element_types")
    collections = {name: payload.get(name) for name in collection_names}
    if not all(isinstance(records, list) for records in collections.values() if records is not None):
        raise ValueError("bootstrap collections must be lists")
    for name in ("chips", "events", "phases", "teams", "elements"):
        if name in ("chips", "phases") and collections[name] is None:
            collections[name] = []
        if not isinstance(collections[name], list):
            raise ValueError(f"bootstrap payload must contain {name}")

    teams = [Team(**_mapped(team, TEAM_FIELDS), raw_data=dict(team)) for team in collections["teams"]]
    players = [
        Player(**_mapped(player, PLAYER_FIELDS), team_id=_required_int(player, "team"), raw_data=dict(player))
        for player in collections["elements"]
    ]
    event_fields = (
        "id", "name", "deadline_time", "release_time", "average_entry_score", "finished", "data_checked",
        "highest_scoring_entry", "deadline_time_epoch", "deadline_time_game_offset", "highest_score", "is_previous",
        "is_current", "is_next", "cup_leagues_created", "h2h_ko_matches_created", "can_enter", "can_manage",
        "released", "ranked_count", "most_selected", "most_transferred_in", "top_element", "transfers_made",
        "most_captained", "most_vice_captained",
    )
    events = [
        Event(
            **_mapped(event, event_fields),
            overrides=event.get("overrides"), chip_plays=event.get("chip_plays"),
            top_element_info=event.get("top_element_info"), raw_data=dict(event),
        )
        for event in collections["events"]
    ]
    chips = [
        Chip(**_mapped(chip, ("id", "name", "number", "start_event", "stop_event", "chip_type")),
             overrides=chip.get("overrides"), raw_data=dict(chip))
        for chip in collections["chips"]
    ]
    phases = [
        Phase(**_mapped(phase, ("id", "name", "start_event", "stop_event", "highest_score")), raw_data=dict(phase))
        for phase in collections["phases"]
    ]
    element_types = [
        ElementType(
            **_mapped(element_type, ("id", "singular_name", "plural_name", "singular_name_short", "squad_select",
                                     "squad_min_play", "squad_max_play", "ui_shorthand", "element_count")),
            sub_positions_locked=element_type.get("sub_positions_locked"), raw_data=dict(element_type),
        )
        for element_type in (collections["element_types"] or [])
    ]

    for model in (Player, Event, Team, Chip, Phase, ElementType):
        session.execute(delete(model))
    session.add(BootstrapSnapshot(fetched_at=datetime.now(timezone.utc), raw_data=dict(payload)))
    session.add_all(teams + players + events + chips + phases + element_types)
    session.commit()


def persist_fixtures(session: Session, records: list[Mapping[str, Any]]) -> None:
    fixtures = [
        Fixture(
            id=_required_int(record, "id"),
            event_id=record.get("event"),
            home_team_id=_required_int(record, "team_h"),
            away_team_id=_required_int(record, "team_a"),
            kickoff_time=_parse_datetime(record.get("kickoff_time")),
            raw_data=dict(record),
        )
        for record in records
    ]
    session.execute(delete(Fixture))
    session.add_all(fixtures)
    session.commit()

from dataclasses import dataclass
from decimal import Decimal

from sqlalchemy import select
from sqlalchemy.orm import Session

from ..models import HistoricalPlayer, HistoricalPlayerGameweekStat
from .team_strength import MAX_GAMEWEEK, TeamStrengthSnapshot, build_team_match_log, team_strength_by_gameweek


@dataclass(frozen=True)
class HistoricalPlayerAdapter:
    element_type: int | None
    team_id: str
    status: str | None = None
    chance_of_playing_next_round: int | None = None


@dataclass(frozen=True)
class HistoricalFixtureAdapter:
    id: str
    event_id: int
    home_team_id: str
    away_team_id: str
    raw_data: dict


@dataclass(frozen=True)
class HistoricalStatRow:
    player_id: str
    gameweek: int
    fixture_id: int | None
    total_points: int
    minutes: int | None
    expected_goal_involvements: Decimal | None


def load_historical_training_data(session: Session) -> tuple[
    dict[int | None, list[HistoricalStatRow]],
    dict[str, HistoricalPlayerAdapter],
    list[HistoricalFixtureAdapter],
    dict[tuple[str, int], TeamStrengthSnapshot],
]:
    """Load ingested historical seasons and adapt them into the same shapes
    `features.py` already consumes for live data (see `Player`/`Team`/
    `Fixture`/`PlayerGameweekStat`), scoped per-position so callers can feed
    them straight into `build_training_examples` alongside live rows.

    Every id is prefixed with its season so a given (season, short_name) team
    or (season, element id) player never collides with another season's or
    with a live player/team. Team strength is derived from that season's own
    actual results (see `team_strength.py`), not FPL's provided rating.
    """
    players: dict[str, HistoricalPlayerAdapter] = {}
    all_stats: list[HistoricalPlayerGameweekStat] = list(session.scalars(select(HistoricalPlayerGameweekStat)))
    seasons: set[str] = set()
    for row in session.scalars(select(HistoricalPlayer)):
        players[f"{row.season}:{row.player_key}"] = HistoricalPlayerAdapter(
            element_type=row.element_type,
            team_id=f"{row.season}:{row.team_short_name}",
        )
        seasons.add(row.season)

    def team_of(stat: HistoricalPlayerGameweekStat) -> str | None:
        player = players.get(f"{stat.season}:{stat.player_key}")
        return player.team_id if player else None

    team_strength: dict[tuple[str, int], TeamStrengthSnapshot] = {}
    for season in seasons:
        season_stats = [stat for stat in all_stats if stat.season == season]
        team_log = build_team_match_log(season_stats, team_of)
        team_strength.update(team_strength_by_gameweek(team_log, MAX_GAMEWEEK))

    fixtures: list[HistoricalFixtureAdapter] = []
    rows_by_position: dict[int | None, list[HistoricalStatRow]] = {}
    for stat in all_stats:
        player_key = f"{stat.season}:{stat.player_key}"
        player = players.get(player_key)
        if player is None or stat.opponent_short_name is None or stat.was_home is None:
            continue
        opponent_id = f"{stat.season}:{stat.opponent_short_name}"
        home_team_id = player.team_id if stat.was_home else opponent_id
        away_team_id = opponent_id if stat.was_home else player.team_id
        # matches the key `pipeline.py` builds historical MatchOdds lookups
        # with: (season, home_short_name, away_short_name)
        fixture_key = f"{stat.season}:{home_team_id.split(':', 1)[1]}:{away_team_id.split(':', 1)[1]}"
        fixtures.append(HistoricalFixtureAdapter(
            id=fixture_key, event_id=stat.gameweek, home_team_id=home_team_id, away_team_id=away_team_id, raw_data={},
        ))
        rows_by_position.setdefault(player.element_type, []).append(HistoricalStatRow(
            player_id=player_key,
            gameweek=stat.gameweek,
            fixture_id=stat.fixture_id,
            total_points=stat.total_points,
            minutes=stat.minutes,
            expected_goal_involvements=stat.expected_goal_involvements,
        ))

    return rows_by_position, players, fixtures, team_strength


def load_career_quality_by_web_name(session: Session) -> dict[str, float]:
    """Points-per-90 rate aggregated across every ingested historical season
    a player appeared in, keyed by lowercased web_name — used as a prior for
    a live player's own points-per-90 (see `_career_adjusted_points_per_90`
    in features.py) before enough current-season evidence exists. Matching
    by name rather than id: historical CSV element ids aren't guaranteed to
    line up with the live FPL API's ids across seasons, but a player's
    web_name is stable and, for the established players this most matters
    for, effectively unique.
    """
    web_name_by_key: dict[tuple[str, str], str] = {
        (row.season, row.player_key): row.web_name.strip().lower()
        for row in session.scalars(select(HistoricalPlayer))
    }
    totals: dict[str, list[float]] = {}
    for stat in session.scalars(select(HistoricalPlayerGameweekStat)):
        web_name = web_name_by_key.get((stat.season, stat.player_key))
        if web_name is None:
            continue
        bucket = totals.setdefault(web_name, [0.0, 0.0])
        bucket[0] += float(stat.total_points or 0)
        bucket[1] += float(stat.minutes or 0)
    return {
        web_name: (points / minutes) * 90.0
        for web_name, (points, minutes) in totals.items()
        if minutes > 0
    }

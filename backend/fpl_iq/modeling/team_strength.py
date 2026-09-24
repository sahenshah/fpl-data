from collections.abc import Callable, Iterable
from dataclasses import dataclass
from decimal import Decimal
from typing import Any, TypeVar

TeamKey = TypeVar("TeamKey")

MAX_GAMEWEEK = 38


@dataclass(frozen=True)
class TeamMatchResult:
    gameweek: int
    was_home: bool
    goals_for: float
    goals_against: float
    xg_for: float
    xg_against: float
    fixture_id: int


@dataclass(frozen=True)
class TeamStrengthSnapshot:
    strength_attack_home: float
    strength_attack_away: float
    strength_defence_home: float
    strength_defence_away: float


def _number(value: int | Decimal | None) -> float:
    return float(value or 0)


def build_team_match_log(stat_rows: Iterable[Any], team_of: Callable[[Any], TeamKey | None]) -> dict[TeamKey, list[TeamMatchResult]]:
    """Derive each team's actual match-by-match goals for/against and xG
    for/against directly from ingested player-gameweek rows, by summing
    goals_scored/expected_goals per team within each fixture_id. A team's
    goals_against in a match is the *other* team's goals_for in that same
    fixture (symmetric, so no separate "conceded" stat is needed).
    """
    by_fixture: dict[int, list[Any]] = {}
    for row in stat_rows:
        if row.fixture_id is None:
            continue
        by_fixture.setdefault(row.fixture_id, []).append(row)

    log: dict[TeamKey, list[TeamMatchResult]] = {}
    for fixture_id, rows in by_fixture.items():
        by_team: dict[TeamKey, list[Any]] = {}
        for row in rows:
            team_key = team_of(row)
            if team_key is None:
                continue
            by_team.setdefault(team_key, []).append(row)
        if len(by_team) != 2:
            continue

        totals: dict[TeamKey, tuple[float, float, int, bool]] = {}
        for team_key, team_rows in by_team.items():
            goals_for = sum(_number(row.goals_scored) for row in team_rows)
            xg_for = sum(_number(getattr(row, "expected_goals", None)) for row in team_rows)
            gameweek = team_rows[0].gameweek
            was_home = bool(next((row.was_home for row in team_rows if row.was_home is not None), False))
            totals[team_key] = (goals_for, xg_for, gameweek, was_home)

        (team_a, (goals_a, xg_a, gameweek_a, home_a)), (team_b, (goals_b, xg_b, gameweek_b, home_b)) = totals.items()
        log.setdefault(team_a, []).append(TeamMatchResult(gameweek_a, home_a, goals_a, goals_b, xg_a, xg_b, fixture_id))
        log.setdefault(team_b, []).append(TeamMatchResult(gameweek_b, home_b, goals_b, goals_a, xg_b, xg_a, fixture_id))

    return log


def _decayed_mean(values: list[float], decay: float) -> float:
    """Weighted mean where the last (most recent) value gets the highest weight."""
    if not values:
        return 0.0
    weights = [decay ** (len(values) - 1 - index) for index in range(len(values))]
    total_weight = sum(weights)
    return sum(value * weight for value, weight in zip(values, weights)) / total_weight


def _blended_average(matches: list[TeamMatchResult], for_field: str, xg_field: str, decay: float | None = None) -> float:
    """Blend a team's goals and xG rate for the given field pair. With
    `decay` set, matches are averaged newest-weighted-highest (a team's most
    recent form) rather than as a flat season-to-date mean; `decay=None`
    keeps the flat mean, used for the cross-team league average/worst
    figures, which aren't a single team's trajectory.
    """
    if not matches:
        return 0.0
    if decay is not None:
        ordered = sorted(matches, key=lambda m: m.gameweek)
        goals_avg = _decayed_mean([getattr(m, for_field) for m in ordered], decay)
        xg_avg = _decayed_mean([getattr(m, xg_field) for m in ordered], decay)
    else:
        goals_avg = sum(getattr(m, for_field) for m in matches) / len(matches)
        xg_avg = sum(getattr(m, xg_field) for m in matches) / len(matches)
    return 0.5 * goals_avg + 0.5 * xg_avg


def _shrink(team_avg: float, prior: float, n: int, k: int) -> float:
    if n + k == 0:
        return prior
    return (n / (n + k)) * team_avg + (k / (n + k)) * prior


def team_strength_by_gameweek(
    team_log: dict[TeamKey, list[TeamMatchResult]],
    max_gameweek: int,
    shrink_k: int = 6,
    form_decay: float = 0.75,
) -> dict[tuple[TeamKey, int], TeamStrengthSnapshot]:
    """One snapshot per (team, gameweek) for gameweek 1..max_gameweek,
    estimating that team's attack/defence strength using only matches
    played *before* that gameweek, shrunk toward the whole league's
    same-split average so far. A team with at least one match blends toward
    the league average; a team with zero matches (a promoted club, or every
    team before any football has been played) has no evidence it belongs at
    the average, so it shrinks toward the league's *worst* observed attack/
    defence instead — a more realistic prior than assuming a newly-promoted
    side is merely average.
    """
    snapshots: dict[tuple[TeamKey, int], TeamStrengthSnapshot] = {}
    for gameweek in range(1, max_gameweek + 1):
        home_matches_by_team: dict[TeamKey, list[TeamMatchResult]] = {}
        away_matches_by_team: dict[TeamKey, list[TeamMatchResult]] = {}
        for team_key, matches in team_log.items():
            before = [m for m in matches if m.gameweek < gameweek]
            home_matches_by_team[team_key] = [m for m in before if m.was_home]
            away_matches_by_team[team_key] = [m for m in before if not m.was_home]

        league_home_attack = _league_average(home_matches_by_team, "goals_for", "xg_for")
        league_home_defence = _league_average(home_matches_by_team, "goals_against", "xg_against")
        league_away_attack = _league_average(away_matches_by_team, "goals_for", "xg_for")
        league_away_defence = _league_average(away_matches_by_team, "goals_against", "xg_against")

        worst_home_attack = _league_worst(home_matches_by_team, "goals_for", "xg_for", weakest=True)
        worst_home_defence = _league_worst(home_matches_by_team, "goals_against", "xg_against", weakest=False)
        worst_away_attack = _league_worst(away_matches_by_team, "goals_for", "xg_for", weakest=True)
        worst_away_defence = _league_worst(away_matches_by_team, "goals_against", "xg_against", weakest=False)

        for team_key in team_log:
            home = home_matches_by_team[team_key]
            away = away_matches_by_team[team_key]
            home_n, away_n = len(home), len(away)
            snapshots[(team_key, gameweek)] = TeamStrengthSnapshot(
                strength_attack_home=_shrink(
                    _blended_average(home, "goals_for", "xg_for", form_decay),
                    league_home_attack if home_n else worst_home_attack, home_n, shrink_k,
                ),
                strength_attack_away=_shrink(
                    _blended_average(away, "goals_for", "xg_for", form_decay),
                    league_away_attack if away_n else worst_away_attack, away_n, shrink_k,
                ),
                strength_defence_home=_shrink(
                    _blended_average(home, "goals_against", "xg_against", form_decay),
                    league_home_defence if home_n else worst_home_defence, home_n, shrink_k,
                ),
                strength_defence_away=_shrink(
                    _blended_average(away, "goals_against", "xg_against", form_decay),
                    league_away_defence if away_n else worst_away_defence, away_n, shrink_k,
                ),
            )
    return snapshots


def _league_average(matches_by_team: dict[TeamKey, list[TeamMatchResult]], for_field: str, xg_field: str) -> float:
    all_matches = [m for matches in matches_by_team.values() for m in matches]
    return _blended_average(all_matches, for_field, xg_field)


def _league_worst(matches_by_team: dict[TeamKey, list[TeamMatchResult]], for_field: str, xg_field: str, weakest: bool) -> float:
    """The weakest attack (lowest) or weakest defence (highest goals/xG
    conceded) among teams that actually have matches in this split so far.
    Falls back to 0.0 when nobody has played yet (e.g. gameweek 1), matching
    the league average in that same edge case.
    """
    values = [_blended_average(matches, for_field, xg_field) for matches in matches_by_team.values() if matches]
    if not values:
        return 0.0
    return min(values) if weakest else max(values)

from dataclasses import dataclass, field
from decimal import Decimal
from typing import Any

from ..models import Fixture, Player, PlayerGameweekStat, Team


FEATURE_NAMES = (
    "recent_points_mean",
    "recent_minutes_mean",
    "recent_xgi_mean",
    "recent_xgi_per_90",
    "season_points_mean",
    "season_minutes_mean",
    "season_xgi_mean",
    "last_points",
    "last_minutes",
    "expected_minutes",
    "opponent_attack_strength",
    "opponent_defence_strength",
    "fixture_difficulty",
    "is_home",
    "fixture_count",
    "career_adjusted_points_per_90",
    "market_team_win_probability",
    "market_draw_probability",
    "market_over_2_5_probability",
)

DEFAULT_WEIGHTS: dict[str, float] = {
    "recent_points_mean": 1.0,
    "recent_minutes_mean": 0.8,
    "recent_xgi_mean": 1.2,
    "recent_xgi_per_90": 1.0,
    "season_points_mean": 0.7,
    "season_minutes_mean": 0.6,
    "season_xgi_mean": 0.8,
    "last_points": 0.7,
    "last_minutes": 0.8,
    "expected_minutes": 1.3,
    "opponent_attack_strength": 0.8,
    "opponent_defence_strength": 0.8,
    "fixture_difficulty": 1.0,
    "is_home": 0.3,
    "fixture_count": 0.5,
    "career_adjusted_points_per_90": 0.9,
    "market_team_win_probability": 1.0,
    "market_draw_probability": 0.4,
    "market_over_2_5_probability": 0.8,
}

# Per-position weight overrides. GK/DEF care about the strength of the attack
# they're facing (clean sheet risk); MID/FWD care about the defence they're
# facing (goal/assist upside) and lean harder on their own xGI history.
POSITION_WEIGHT_OVERRIDES: dict[int, dict[str, float]] = {
    1: {  # GK
        "opponent_attack_strength": 1.4,
        "opponent_defence_strength": 0.1,
        "recent_xgi_mean": 0.1,
        "recent_xgi_per_90": 0.1,
        "season_xgi_mean": 0.1,
        "expected_minutes": 1.5,
    },
    2: {  # DEF
        "opponent_attack_strength": 1.4,
        "opponent_defence_strength": 0.3,
        "recent_xgi_mean": 0.9,
        "recent_xgi_per_90": 0.8,
        "season_xgi_mean": 0.6,
        "expected_minutes": 1.4,
    },
    3: {  # MID
        "opponent_attack_strength": 0.5,
        "opponent_defence_strength": 1.1,
        "recent_xgi_mean": 1.4,
        "recent_xgi_per_90": 1.2,
        "season_xgi_mean": 0.9,
        "expected_minutes": 1.3,
    },
    4: {  # FWD
        "opponent_attack_strength": 0.2,
        "opponent_defence_strength": 1.4,
        "recent_xgi_mean": 1.6,
        "recent_xgi_per_90": 1.4,
        "season_xgi_mean": 1.0,
        "expected_minutes": 1.2,
    },
}


@dataclass(frozen=True)
class FeatureConfig:
    rolling_window: int = 3
    xgi_window: int = 5
    min_minutes_for_rate: int = 60
    minutes_decay: float = 0.85
    form_decay: float = 0.85
    minutes_horizon_decay: float = 0.85
    depth_discount: float = 0.12
    career_shrink_k: int = 8
    weights: dict[str, float] = field(default_factory=lambda: dict(DEFAULT_WEIGHTS))


def position_feature_config(element_type: int | None) -> FeatureConfig:
    """Build a FeatureConfig with weights tailored to a player's position.

    Falls back to DEFAULT_WEIGHTS for unknown/missing positions.
    """
    overrides = POSITION_WEIGHT_OVERRIDES.get(element_type, {})
    weights = {**DEFAULT_WEIGHTS, **overrides}
    return FeatureConfig(weights=weights)


@dataclass(frozen=True)
class TrainingExample:
    player_id: int
    gameweek: int
    features: tuple[float, ...]
    target: float
    always_train: bool = False
    target_minutes: float | None = None


def _number(value: int | Decimal | None) -> float:
    return float(value or 0)


def _availability(player: Player | None, target_gameweek: int | None = None, horizon: int | None = None) -> float:
    if player is None:
        return 1.0
    if player.status in {"i", "s", "u"}:
        expected_return_event = getattr(player, "expected_return_event", None)
        if expected_return_event is not None and target_gameweek is not None and target_gameweek >= expected_return_event:
            # a known/parsed expected-return date has passed by this target
            # gameweek — treat as returning, but not yet a guaranteed starter
            return 0.6
        return 0.0
    chance = player.chance_of_playing_next_round
    if chance is None:
        return 1.0
    chance_fraction = max(0.0, min(1.0, chance / 100.0))
    if horizon is None or horizon <= 1:
        return chance_fraction
    # "chance of playing next round" is exactly that — a near-term signal
    # (a knock, late fitness test) with no bearing on gameweeks months away.
    # Fade the discount back out fast as the horizon grows rather than
    # letting this week's doubt permanently suppress the rest of the
    # season — default to assuming fitness returns unless told otherwise.
    reversion_weight = 1.0 - 0.5 ** (horizon - 1)
    return chance_fraction + reversion_weight * (1.0 - chance_fraction)


def _decayed_weighted_mean(values: list[float], decay: float) -> float:
    """Weighted mean where the last (most recent) value gets the highest weight."""
    if not values:
        return 0.0
    weights = [decay ** (len(values) - 1 - index) for index in range(len(values))]
    total_weight = sum(weights)
    if total_weight == 0:
        return 0.0
    return sum(value * weight for value, weight in zip(values, weights)) / total_weight


def _historical_expected_minutes(history: list[PlayerGameweekStat], decay: float = 0.85) -> float:
    if not history:
        return 0.0
    appearance_rate = _decayed_weighted_mean([1.0 if _number(row.minutes) > 0 else 0.0 for row in history], decay)
    appearances = [row for row in history if _number(row.minutes) > 0]
    if not appearances:
        return 0.0
    avg_minutes_played = _decayed_weighted_mean([_number(row.minutes) for row in appearances], decay)
    return min(90.0, appearance_rate * avg_minutes_played)


def _future_expected_minutes(
    history: list[PlayerGameweekStat], player: Player | None, decay: float = 0.85, target_gameweek: int | None = None
) -> float:
    horizon = max(1, target_gameweek - history[-1].gameweek) if target_gameweek is not None and history else None
    return min(90.0, _availability(player, target_gameweek, horizon) * _historical_expected_minutes(history, decay))


def _starter_reliability(history: list[PlayerGameweekStat], decay: float) -> float:
    """How consistently this player has started and played big minutes
    recently (decayed rate of games with >=60 minutes) — used to scale back
    both the horizon decay and the squad-depth discount below, so a nailed-
    on starter's expected minutes doesn't drift toward a discounted baseline
    over the season the same way a fringe/rotation player's does. 1.0 means
    "played 60+ minutes essentially every recent game"; 0.0 means no such
    evidence at all.
    """
    if not history:
        return 0.0
    return _decayed_weighted_mean([1.0 if _number(row.minutes) >= 60 else 0.0 for row in history], decay)


def _position_depth_factor(player: Player | None, players: dict[int, Player], discount: float, target_gameweek: int | None = None) -> float:
    """How much a player's spot looks contested by same-team, same-position
    teammates who are (or, per a parsed expected-return date, will be by
    target_gameweek) available. Deliberately only used for the longer-horizon
    baseline (see `_expected_minutes`) — if a player started last week
    they'll almost certainly start next week regardless of squad depth, but
    the further out a prediction reaches, the more a fit rival could
    plausibly take their place.
    """
    if player is None:
        return 1.0
    rivals = [
        candidate for candidate in players.values()
        if candidate is not player and candidate.team_id == player.team_id and candidate.element_type == player.element_type
    ]
    available_rivals = sum(1 for candidate in rivals if _availability(candidate, target_gameweek) >= 0.75)
    return 1.0 / (1.0 + discount * available_rivals)


def _expected_minutes(
    history: list[PlayerGameweekStat],
    player: Player | None,
    players: dict[int, Player],
    target_gameweek: int,
    config: FeatureConfig,
) -> float:
    """Blend a near-term estimate (trust recent actual starts) with a more
    conservative longer-horizon baseline (season-long rate, discounted by
    squad depth) — the further target_gameweek sits beyond the player's last
    played gameweek, the more weight shifts to the conservative baseline,
    since we have no real evidence rotation won't have happened by then.
    """
    recent = _future_expected_minutes(history, player, config.minutes_decay, target_gameweek)
    reliability = _starter_reliability(history, config.minutes_decay)

    # A proven nailed-on starter's baseline shouldn't be discounted much just
    # because a squad has backup options on paper — depth risk matters most
    # for players who don't yet have strong evidence of being undisputed.
    depth_factor = _position_depth_factor(player, players, config.depth_discount, target_gameweek)
    effective_depth_factor = 1.0 - reliability * (1.0 - depth_factor)
    baseline = _future_expected_minutes(history, player, decay=0.97, target_gameweek=target_gameweek) * effective_depth_factor

    # Likewise, a consistent starter's near-term estimate should barely
    # decay toward that baseline even at a distant horizon — the further-out
    # uncertainty this decay models is real, but far weaker for a player
    # with a long run of evidence than for one with a thin sample.
    horizon = max(1, target_gameweek - history[-1].gameweek)
    effective_horizon_decay = config.minutes_horizon_decay + (1.0 - config.minutes_horizon_decay) * reliability
    recent_weight = effective_horizon_decay ** (horizon - 1)
    return min(90.0, recent_weight * recent + (1.0 - recent_weight) * baseline)


def _team_attack_defence(team: Team | None, is_home: bool) -> tuple[float, float]:
    if team is None:
        return 0.0, 0.0
    attack = float((team.strength_attack_home if is_home else team.strength_attack_away) or 0)
    defence = float((team.strength_defence_home if is_home else team.strength_defence_away) or 0)
    return attack, defence


def _market_probabilities(fixture: Fixture, is_home: bool, market_odds: dict[Any, Any]) -> tuple[float, float, float]:
    """This fixture's market-implied (team_win, draw, over_2_5) probabilities
    from the player's own team's perspective. Neutral defaults (1/3, 1/3,
    0.5) when no odds row matches — the same graceful-degradation pattern as
    a missing fixture difficulty rating.
    """
    odds = market_odds.get(getattr(fixture, "id", None))
    if odds is None:
        return 1.0 / 3.0, 1.0 / 3.0, 0.5
    team_win = odds.home_win_probability if is_home else odds.away_win_probability
    draw = odds.draw_probability
    over_2_5 = odds.over_2_5_probability
    return (
        float(team_win) if team_win is not None else 1.0 / 3.0,
        float(draw) if draw is not None else 1.0 / 3.0,
        float(over_2_5) if over_2_5 is not None else 0.5,
    )


def _fixture_context(
    player: Player | None,
    target_gameweek: int,
    fixtures: list[Fixture],
    teams: dict[int, Team],
    market_odds: dict[Any, Any] | None = None,
) -> tuple[float, float, float, float, float, float, float, float]:
    market_odds = market_odds or {}
    if player is None:
        return 0.0, 0.0, 3.0, 0.0, 1.0, 1.0 / 3.0, 1.0 / 3.0, 0.5
    player_fixtures = [
        fixture for fixture in fixtures
        if fixture.event_id == target_gameweek
        and player.team_id in {fixture.home_team_id, fixture.away_team_id}
    ]
    if not player_fixtures:
        return 0.0, 0.0, 3.0, 0.0, 1.0, 1.0 / 3.0, 1.0 / 3.0, 0.5

    attack_strengths: list[float] = []
    defence_strengths: list[float] = []
    difficulties: list[float] = []
    home_values: list[float] = []
    market_team_wins: list[float] = []
    market_draws: list[float] = []
    market_over_2_5s: list[float] = []
    for fixture in player_fixtures:
        is_home = player.team_id == fixture.home_team_id
        opponent_id = fixture.away_team_id if is_home else fixture.home_team_id
        opponent = teams.get((opponent_id, target_gameweek))
        opponent_is_home = not is_home
        opponent_attack, opponent_defence = _team_attack_defence(opponent, opponent_is_home)
        attack_strengths.append(opponent_attack)
        defence_strengths.append(opponent_defence)
        raw_difficulty = fixture.raw_data.get("team_h_difficulty" if is_home else "team_a_difficulty", 3)
        difficulties.append(float(raw_difficulty or 3))
        home_values.append(float(is_home))
        team_win, draw, over_2_5 = _market_probabilities(fixture, is_home, market_odds)
        market_team_wins.append(team_win)
        market_draws.append(draw)
        market_over_2_5s.append(over_2_5)
    return (
        sum(attack_strengths) / len(attack_strengths),
        sum(defence_strengths) / len(defence_strengths),
        sum(difficulties) / len(difficulties),
        sum(home_values) / len(home_values),
        float(len(player_fixtures)),
        sum(market_team_wins) / len(market_team_wins),
        sum(market_draws) / len(market_draws),
        sum(market_over_2_5s) / len(market_over_2_5s),
    )


def _weighted(values: dict[str, float], config: FeatureConfig) -> tuple[float, ...]:
    return tuple(values[name] * config.weights.get(name, 1.0) for name in FEATURE_NAMES)


def _feature_values(
    history: list[PlayerGameweekStat],
    target_gameweek: int,
    player: Player | None,
    players: dict[int, Player],
    fixtures: list[Fixture],
    teams: dict[int, Team],
    config: FeatureConfig,
    market_odds: dict[Any, Any] | None = None,
) -> tuple[float, ...]:
    recent = history[-config.rolling_window:]
    xgi_recent = history[-config.xgi_window:]
    minutes = sum(_number(row.minutes) for row in recent)
    xgi_per_row = [_number(getattr(row, "expected_goal_involvements", None)) for row in xgi_recent]
    xgi_per_90_per_row = [
        (_number(getattr(row, "expected_goal_involvements", None)) / _number(row.minutes)) * 90.0 if _number(row.minutes) > 0 else 0.0
        for row in xgi_recent
    ]
    opponent_attack, opponent_defence, difficulty, is_home, fixture_count, market_team_win, market_draw, market_over_2_5 = _fixture_context(
        player, target_gameweek, fixtures, teams, market_odds
    )
    values = {
        # Recency-weighted, not a flat mean — the most recent game or two
        # should carry more signal than one from a few weeks back.
        "recent_points_mean": _decayed_weighted_mean([_number(row.total_points) for row in recent], config.form_decay),
        "recent_minutes_mean": minutes / len(recent),
        "recent_xgi_mean": _decayed_weighted_mean(xgi_per_row, config.form_decay),
        "recent_xgi_per_90": _decayed_weighted_mean(xgi_per_90_per_row, config.form_decay),
        "season_points_mean": sum(_number(row.total_points) for row in history) / len(history),
        "season_minutes_mean": sum(_number(row.minutes) for row in history) / len(history),
        "season_xgi_mean": sum(_number(getattr(row, "expected_goal_involvements", None)) for row in history) / len(history),
        "last_points": _number(history[-1].total_points),
        "last_minutes": _number(history[-1].minutes),
        "expected_minutes": _expected_minutes(history, player, players, target_gameweek, config),
        "opponent_attack_strength": opponent_attack,
        "opponent_defence_strength": opponent_defence,
        "fixture_difficulty": difficulty,
        "is_home": is_home,
        "fixture_count": fixture_count,
        "career_adjusted_points_per_90": _career_adjusted_points_per_90(history, player, config.career_shrink_k),
        "market_team_win_probability": market_team_win,
        "market_draw_probability": market_draw,
        "market_over_2_5_probability": market_over_2_5,
    }
    return _weighted(values, config)


def _career_adjusted_points_per_90(history: list[PlayerGameweekStat], player: Player | None, k: int) -> float:
    """Blend this season's own points-per-90 with the player's points-per-90
    from every ingested prior season (see `career_points_per_90`, attached
    per-player in pipeline.py from historical data matched by name), shrunk
    by how many appearances exist this season. Early season — or for a
    player short on current-season minutes for any reason — this leans on
    their track record; as real current-season evidence accumulates, it
    leans on that instead. A player with no matched history (young/new to
    the league) just gets their current-season rate, unblended.
    """
    appearances = [row for row in history if _number(row.minutes) > 0]
    current_minutes = sum(_number(row.minutes) for row in appearances)
    current_points = sum(_number(row.total_points) for row in appearances)
    current_rate = (current_points / current_minutes) * 90.0 if current_minutes > 0 else 0.0

    career_rate = getattr(player, "career_points_per_90", None) if player is not None else None
    if career_rate is None:
        return current_rate
    n = len(appearances)
    return (n / (n + k)) * current_rate + (k / (n + k)) * career_rate


def _walk_player_histories(rows: list[PlayerGameweekStat]):
    """Group rows by player, sort each player's rows chronologically, and
    yield (player_id, row, history-before-this-row) for every row that has
    at least one prior row — shared by both training-example builders below.
    """
    by_player: dict[int, list[PlayerGameweekStat]] = {}
    for row in rows:
        by_player.setdefault(row.player_id, []).append(row)

    for player_id, player_rows in by_player.items():
        player_rows.sort(key=lambda row: (row.gameweek, row.fixture_id or 0))
        history: list[PlayerGameweekStat] = []
        for row in player_rows:
            if history:
                yield player_id, row, history
            history.append(row)


def build_training_examples(
    rows: list[PlayerGameweekStat],
    players: dict[int, Player] | None = None,
    fixtures: list[Fixture] | None = None,
    teams: dict[int, Team] | None = None,
    config: FeatureConfig | None = None,
    always_train: bool = False,
    market_odds: dict[Any, Any] | None = None,
) -> list[TrainingExample]:
    players = players or {}
    fixtures = fixtures or []
    teams = teams or {}
    config = config or FeatureConfig()
    market_odds = market_odds or {}

    return [
        TrainingExample(
            player_id,
            row.gameweek,
            _feature_values(history, row.gameweek, players.get(player_id), players, fixtures, teams, config, market_odds),
            float(row.total_points),
            always_train,
        )
        for player_id, row, history in _walk_player_histories(rows)
    ]


def build_points_per_90_examples(
    rows: list[PlayerGameweekStat],
    players: dict[int, Player] | None = None,
    fixtures: list[Fixture] | None = None,
    teams: dict[int, Team] | None = None,
    config: FeatureConfig | None = None,
    always_train: bool = False,
    market_odds: dict[Any, Any] | None = None,
) -> list[TrainingExample]:
    """Same as `build_training_examples`, but the target is points-per-90
    rather than raw points, and rows under `config.min_minutes_for_rate`
    (default 60) are skipped — not just non-appearances. A few minutes as a
    substitute can produce wildly inflated rates (1 point in 2 minutes
    extrapolates to 45 points/90) that would otherwise dominate and distort
    training; requiring a meaningful sample of minutes before treating a
    row as evidence of a "rate" avoids that. Excluding low-minute rows also
    frees this model's capacity for quality signals instead of re-deriving
    what `expected_minutes` already answers (see the two-stage architecture
    this feeds into, in pipeline.py).
    """
    players = players or {}
    fixtures = fixtures or []
    teams = teams or {}
    config = config or FeatureConfig()
    market_odds = market_odds or {}

    examples: list[TrainingExample] = []
    for player_id, row, history in _walk_player_histories(rows):
        minutes = _number(row.minutes)
        if minutes < config.min_minutes_for_rate:
            continue
        points_per_90 = (_number(row.total_points) / minutes) * 90.0
        examples.append(TrainingExample(
            player_id,
            row.gameweek,
            _feature_values(history, row.gameweek, players.get(player_id), players, fixtures, teams, config, market_odds),
            points_per_90,
            always_train,
            target_minutes=minutes,
        ))
    return examples


def build_prediction_features(
    rows: list[PlayerGameweekStat],
    target_gameweek: int,
    players: dict[int, Player] | None = None,
    fixtures: list[Fixture] | None = None,
    teams: dict[int, Team] | None = None,
    config: FeatureConfig | None = None,
    market_odds: dict[Any, Any] | None = None,
) -> list[tuple[int, tuple[float, ...]]]:
    players = players or {}
    fixtures = fixtures or []
    teams = teams or {}
    config = config or FeatureConfig()
    market_odds = market_odds or {}
    by_player: dict[int, list[PlayerGameweekStat]] = {}
    for row in rows:
        if row.gameweek < target_gameweek:
            by_player.setdefault(row.player_id, []).append(row)

    return [
        (player_id, _feature_values(history, target_gameweek, players.get(player_id), players, fixtures, teams, config, market_odds))
        for player_id, history in by_player.items()
        if history
    ]

from datetime import datetime, timezone
from decimal import Decimal
from pathlib import Path

import joblib

from sqlalchemy import select
from sqlalchemy.orm import Session

from ..models import Event, Fixture, HistoricalMatchOdds, MatchOdds, Player, PlayerGameweekStat, PlayerPrediction, PredictionRun
from .availability import expected_return_gameweek, parse_expected_return_date
from .baseline import BaselineResult, train_baseline
from .features import FEATURE_NAMES, FeatureConfig, build_prediction_features, build_training_examples, position_feature_config
from .features import _availability
from .historical_features import load_career_quality_by_web_name, load_historical_training_data
from .team_strength import MAX_GAMEWEEK, build_team_match_log, team_strength_by_gameweek

EXPECTED_MINUTES_INDEX = FEATURE_NAMES.index("expected_minutes")

POSITION_LABELS: dict[int | None, str] = {1: "GKP", 2: "DEF", 3: "MID", 4: "FWD", None: "UNK"}


def _live_team_strength(rows: list[PlayerGameweekStat], players: dict[int, Player]) -> dict[tuple[int, int], object]:
    def team_of(row: PlayerGameweekStat) -> int | None:
        player = players.get(row.player_id)
        return player.team_id if player else None

    team_log = build_team_match_log(rows, team_of)
    return team_strength_by_gameweek(team_log, MAX_GAMEWEEK)


def _annotate_players(session: Session, players: dict[int, Player]) -> None:
    """Attach two transient (not persisted, not mapped columns) attributes
    features.py reads via getattr: `expected_return_event`, parsed from
    FPL's free-text injury news against gameweek deadlines, and
    `career_points_per_90`, matched from ingested historical seasons by
    name. Both degrade to None (their prior behavior) when nothing parses
    or matches.
    """
    event_deadlines = [
        (event.id, event.deadline_time.date())
        for event in session.scalars(select(Event))
        if event.deadline_time is not None
    ]
    today = datetime.now(timezone.utc).date()
    career_quality = load_career_quality_by_web_name(session)

    for player in players.values():
        expected_return_event = None
        if player.status in {"i", "s"}:
            news = (player.raw_data or {}).get("news")
            return_date = parse_expected_return_date(news, today)
            if return_date is not None:
                expected_return_event = expected_return_gameweek(return_date, event_deadlines)
        player.expected_return_event = expected_return_event
        player.career_points_per_90 = career_quality.get(player.web_name.strip().lower())


def _live_match_odds(session: Session) -> dict[int, MatchOdds]:
    return {odds.fixture_id: odds for odds in session.scalars(select(MatchOdds))}


def _historical_match_odds(session: Session) -> dict[str, HistoricalMatchOdds]:
    return {
        f"{odds.season}:{odds.home_short_name}:{odds.away_short_name}": odds
        for odds in session.scalars(select(HistoricalMatchOdds))
    }


def train_and_persist(
    session: Session,
    start_gameweek: int,
    end_gameweek: int = 38,
    validation_gameweeks: int = 3,
) -> tuple[PredictionRun, int]:
    if not 1 <= start_gameweek <= end_gameweek <= 38:
        raise ValueError("prediction gameweeks must be between 1 and 38")
    rows = list(session.scalars(select(PlayerGameweekStat).order_by(PlayerGameweekStat.player_id, PlayerGameweekStat.gameweek)))
    players = {player.id: player for player in session.scalars(select(Player))}
    _annotate_players(session, players)
    teams = _live_team_strength(rows, players)
    fixtures = list(session.scalars(select(Fixture)))
    market_odds = _live_match_odds(session)

    rows_by_position: dict[int | None, list[PlayerGameweekStat]] = {}
    for row in rows:
        player = players.get(row.player_id)
        rows_by_position.setdefault(player.element_type if player else None, []).append(row)

    historical_rows_by_position, historical_players, historical_fixtures, historical_teams = load_historical_training_data(session)
    historical_market_odds = _historical_match_odds(session)

    unavailable_gameweeks = [
        gameweek for gameweek in range(start_gameweek, end_gameweek + 1)
        if gameweek != 1 and not build_prediction_features(rows, gameweek, players, fixtures, teams, market_odds=market_odds)
    ]

    artifact_dir = Path(__file__).resolve().parents[2] / "model_artifacts"
    artifact_dir.mkdir(exist_ok=True)

    position_models: dict[int | None, tuple[BaselineResult, FeatureConfig]] = {}
    position_metrics: dict[str, dict] = {}
    for position, position_rows in rows_by_position.items():
        config = position_feature_config(position)
        examples = build_training_examples(position_rows, players, fixtures, teams, config, market_odds=market_odds)
        historical_position_rows = historical_rows_by_position.get(position, [])
        if historical_position_rows:
            examples += build_training_examples(
                historical_position_rows, historical_players, historical_fixtures, historical_teams,
                config, always_train=True, market_odds=historical_market_odds,
            )
        try:
            result = train_baseline(examples, validation_gameweeks=validation_gameweeks)
        except ValueError:
            continue
        label = POSITION_LABELS.get(position, "UNK")
        artifact_path = artifact_dir / f"hist_gradient_boosting_{label}_{datetime.now(timezone.utc):%Y%m%dT%H%M%SZ}.joblib"
        joblib.dump(result.model, artifact_path)
        position_models[position] = (result, config)
        position_metrics[label] = {
            **result.metrics,
            "feature_names": list(result.feature_names),
            "feature_weights": config.weights,
            "artifact_path": str(artifact_path),
        }

    if not position_models:
        raise ValueError("not enough gameweeks for a time-based validation split")

    metadata = {
        "model_name": "hist_gradient_boosting_per_position",
        "model_version": "0.2.1",
        "feature_version": "0.2.1",
        "trained_at": datetime.now(timezone.utc),
        "training_start_event": min(row.gameweek for row in rows),
        "training_end_event": max(row.gameweek for row in rows),
        "metrics": {
            "requested_prediction_start": start_gameweek,
            "requested_prediction_end": end_gameweek,
            "unavailable_gameweeks": unavailable_gameweeks,
            "positions": position_metrics,
        },
        "status": "candidate",
    }
    run = PredictionRun(**metadata)
    session.add(run)
    session.flush()

    prediction_count = 0
    for gameweek in range(start_gameweek, end_gameweek + 1):
        if gameweek == 1:
            prediction_count += _persist_gameweek_one_predictions(session, run.id, players)
            continue
        for position, (result, config) in position_models.items():
            position_rows = rows_by_position.get(position, [])
            candidates = build_prediction_features(position_rows, gameweek, players, fixtures, teams, config, market_odds=market_odds)
            predictions = result.model.predict([features for _, features in candidates]) if candidates else []
            for (player_id, features), prediction in zip(candidates, predictions):
                expected_minutes = features[EXPECTED_MINUTES_INDEX] / config.weights["expected_minutes"]
                session.add(PlayerPrediction(
                    prediction_run_id=run.id,
                    player_id=player_id,
                    event_id=gameweek,
                    predicted_points=Decimal(str(max(0.0, float(prediction)))),
                    predicted_minutes=Decimal(str(round(expected_minutes, 3))),
                    created_at=datetime.now(timezone.utc),
                ))
                prediction_count += 1
    session.commit()
    return run, prediction_count


GW1_DEFAULT_POINTS_PER_90 = 2.0  # fallback for a player with no matched career history at all


def _persist_gameweek_one_predictions(session: Session, run_id: int, players: dict[int, Player]) -> int:
    """Cold-start GW1 predictions: there's no current-season history yet to
    build the normal per-gameweek feature vector from, so this can't use the
    trained per-position models. Instead of a single flat points-per-team
    baseline (the old behaviour — every player on the same side of the same
    fixture got the identical number, GK and star striker alike), use each
    player's own `career_points_per_90` (already matched from historical
    seasons by name in `_annotate_players`, called on `players` before this
    runs) blended with fixture difficulty and current availability — a real,
    if necessarily coarser than the trained model, per-player estimate.
    """
    fixtures = list(session.scalars(select(Fixture).where(Fixture.event_id == 1)))
    fixtures_by_team: dict[int, list[Fixture]] = {}
    for fixture in fixtures:
        fixtures_by_team.setdefault(fixture.home_team_id, []).append(fixture)
        fixtures_by_team.setdefault(fixture.away_team_id, []).append(fixture)

    created = 0
    for player in players.values():
        player_fixtures = fixtures_by_team.get(player.team_id, [])
        career_rate = getattr(player, "career_points_per_90", None)
        base_rate = career_rate if career_rate is not None else GW1_DEFAULT_POINTS_PER_90
        expected_minutes = 90.0 * _availability(player, target_gameweek=1)

        if player_fixtures:
            predicted_points = 0.0
            for fixture in player_fixtures:
                source = fixture.raw_data
                is_home = player.team_id == fixture.home_team_id
                difficulty = float(source.get("team_h_difficulty" if is_home else "team_a_difficulty") or 3)
                difficulty_adjustment = 1.0 + (3.0 - difficulty) * 0.10
                predicted_points += base_rate * (expected_minutes / 90.0) * difficulty_adjustment
        else:
            predicted_points = base_rate * (expected_minutes / 90.0)

        session.add(PlayerPrediction(
            prediction_run_id=run_id,
            player_id=player.id,
            event_id=1,
            predicted_points=Decimal(str(round(max(0.0, predicted_points), 3))),
            predicted_minutes=Decimal(str(round(expected_minutes, 3))),
            created_at=datetime.now(timezone.utc),
        ))
        created += 1
    return created

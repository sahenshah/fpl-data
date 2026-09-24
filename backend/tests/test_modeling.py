from decimal import Decimal
from types import SimpleNamespace

import pytest
from sqlalchemy import create_engine, select
from sqlalchemy.orm import Session
from sqlalchemy.pool import StaticPool

from fpl_iq.db import Base
from fpl_iq.modeling.baseline import train_baseline
from fpl_iq.modeling.features import (
    FEATURE_NAMES,
    FeatureConfig,
    build_prediction_features,
    build_training_examples,
    position_feature_config,
)
from fpl_iq.modeling.pipeline import train_and_persist
from fpl_iq.models import Event, Fixture, Player, PlayerGameweekStat, PlayerPrediction, Team


def stat(player_id: int, gameweek: int, points: int, minutes: int = 90):
    return SimpleNamespace(
        player_id=player_id, gameweek=gameweek, fixture_id=gameweek, total_points=points,
        minutes=minutes, was_home=True, opponent_team_id=2,
    )


def test_features_use_only_prior_gameweeks() -> None:
    examples = build_training_examples([stat(1, 1, 2), stat(1, 2, 8), stat(1, 3, 4)])

    assert len(examples) == 2
    assert examples[0].gameweek == 2
    assert examples[0].features[0] == 2
    assert examples[1].features[0] == pytest.approx((2 * 0.85 + 8 * 1.0) / 1.85)  # decayed weighted mean of [2, 8] at form_decay=0.85
    assert examples[1].features[4] == 3.5  # season_points_mean(2, 8) * weight 0.7


def test_feature_config_adds_xgi_and_weights() -> None:
    rows = [
        SimpleNamespace(player_id=1, gameweek=1, fixture_id=1, total_points=4, minutes=90, expected_goal_involvements=0.5),
        SimpleNamespace(player_id=1, gameweek=2, fixture_id=2, total_points=6, minutes=90, expected_goal_involvements=0.7),
    ]
    config = FeatureConfig(weights={"recent_xgi_mean": 2.0})
    examples = build_training_examples(rows, config=config)

    assert examples[0].features[2] == 1.0


def test_baseline_uses_time_based_validation() -> None:
    rows = [stat(1, week, week) for week in range(1, 8)]
    result = train_baseline(build_training_examples(rows), validation_gameweeks=2)

    assert result.metrics["validation_gameweeks"] == [6, 7]
    assert result.metrics["training_rows"] > 0


def test_baseline_requires_enough_gameweeks() -> None:
    with pytest.raises(ValueError, match="not enough gameweeks"):
        train_baseline(build_training_examples([stat(1, 1, 2), stat(1, 2, 3)]), validation_gameweeks=3)


def test_prediction_features_stop_before_target_gameweek() -> None:
    features = build_prediction_features([stat(1, 1, 2), stat(1, 2, 8), stat(1, 3, 99)], target_gameweek=3)

    assert len(features) == 1
    assert features[0][1][4] == 3.5  # season_points_mean(2, 8) * weight 0.7


def test_training_pipeline_persists_run_and_predictions() -> None:
    engine = create_engine("sqlite://", connect_args={"check_same_thread": False}, poolclass=StaticPool)
    Base.metadata.create_all(engine)
    with Session(engine) as session:
        session.add_all([
            Team(id=1, name="Test", short_name="TST"),
            Player(id=1, first_name="Test", second_name="Player", web_name="Player", team_id=1),
            Event(id=8, name="Gameweek 8"),
        ])
        session.add_all([
            PlayerGameweekStat(player_id=1, gameweek=week, fixture_id=week, total_points=week, minutes=90)
            for week in range(1, 8)
        ])
        session.commit()

        run, count = train_and_persist(session, start_gameweek=8, end_gameweek=10, validation_gameweeks=2)

        predictions = session.scalars(select(PlayerPrediction).order_by(PlayerPrediction.event_id)).all()
        assert run.id is not None
        assert count == 3
        assert len(predictions) == 3
        assert all(prediction.prediction_run_id == run.id for prediction in predictions)
        assert [prediction.event_id for prediction in predictions] == [8, 9, 10]


def test_first_gameweek_has_no_leakage_free_prediction_without_prior_history() -> None:
    examples = build_training_examples([stat(1, 1, 2), stat(1, 2, 3)])

    assert all(example.gameweek >= 2 for example in examples)
    assert not build_prediction_features(
        [stat(1, 1, 2), stat(1, 2, 3)],
        target_gameweek=1,
    )


def test_training_pipeline_uses_two_point_gw1_cold_start() -> None:
    engine = create_engine("sqlite://", connect_args={"check_same_thread": False}, poolclass=StaticPool)
    Base.metadata.create_all(engine)
    with Session(engine) as session:
        session.add_all([
            Team(id=1, name="Test", short_name="TST"),
            Team(id=2, name="Opponent", short_name="OPP"),
            Player(id=1, first_name="Test", second_name="Player", web_name="Player", team_id=1),
            Event(id=1, name="Gameweek 1"),
            Fixture(id=1, event_id=1, home_team_id=1, away_team_id=2, raw_data={"team_h_difficulty": 5, "team_a_difficulty": 3}),
        ])
        session.add_all([
            PlayerGameweekStat(player_id=1, gameweek=week, fixture_id=week, total_points=week, minutes=90)
            for week in range(1, 8)
        ])
        session.commit()

        run, count = train_and_persist(session, start_gameweek=1, end_gameweek=1, validation_gameweeks=2)
        prediction = session.scalar(select(PlayerPrediction).where(PlayerPrediction.prediction_run_id == run.id))

        assert count == 1
        assert prediction is not None
        assert prediction.predicted_minutes == 90
        assert prediction.predicted_points == Decimal("1.6")


def test_opponent_strength_splits_attack_and_defence_by_home_away() -> None:
    rows = [stat(1, 1, 2), stat(1, 2, 8)]
    players = {1: SimpleNamespace(id=1, element_type=4, status=None, chance_of_playing_next_round=None, team_id=1)}
    teams = {
        (2, 3): SimpleNamespace(
            strength_attack_home=1300, strength_attack_away=1200,
            strength_defence_home=1100, strength_defence_away=1000,
        ),
    }
    fixtures = [SimpleNamespace(event_id=3, home_team_id=1, away_team_id=2, raw_data={"team_h_difficulty": 4})]

    features = build_prediction_features(rows, target_gameweek=3, players=players, fixtures=fixtures, teams=teams)

    # player's team (1) is home, so the opponent (team 2) faces us away -> away attack/defence values apply
    attack_index, defence_index = 10, 11
    assert features[0][1][attack_index] == pytest.approx(1200 * FeatureConfig().weights["opponent_attack_strength"])
    assert features[0][1][defence_index] == pytest.approx(1000 * FeatureConfig().weights["opponent_defence_strength"])


def test_position_feature_config_weights_attack_for_defenders_and_defence_for_forwards() -> None:
    defender_config = position_feature_config(2)
    forward_config = position_feature_config(4)

    assert defender_config.weights["opponent_attack_strength"] > defender_config.weights["opponent_defence_strength"]
    assert forward_config.weights["opponent_defence_strength"] > forward_config.weights["opponent_attack_strength"]
    assert forward_config.weights["recent_xgi_mean"] > defender_config.weights["recent_xgi_mean"]


def test_expected_minutes_decays_towards_recent_appearances() -> None:
    # a player who recently lost their starting spot should have lower expected
    # minutes than one who recently won it, even with identical season totals
    lost_spot = [stat(1, week, 2, minutes=90) for week in range(1, 4)] + [stat(1, week, 0, minutes=0) for week in range(4, 6)]
    won_spot = [stat(1, week, 0, minutes=0) for week in range(1, 3)] + [stat(1, week, 2, minutes=90) for week in range(3, 6)]

    lost_spot_features = build_prediction_features(lost_spot, target_gameweek=6)
    won_spot_features = build_prediction_features(won_spot, target_gameweek=6)

    expected_minutes_index = 9
    assert won_spot_features[0][1][expected_minutes_index] > lost_spot_features[0][1][expected_minutes_index]


def test_train_and_persist_trains_separate_models_per_position() -> None:
    engine = create_engine("sqlite://", connect_args={"check_same_thread": False}, poolclass=StaticPool)
    Base.metadata.create_all(engine)
    with Session(engine) as session:
        session.add_all([
            Team(id=1, name="Test", short_name="TST"),
            Player(id=1, first_name="Def", second_name="Player", web_name="Def", team_id=1, element_type=2),
            Player(id=2, first_name="Fwd", second_name="Player", web_name="Fwd", team_id=1, element_type=4),
            Event(id=8, name="Gameweek 8"),
        ])
        session.add_all([
            PlayerGameweekStat(player_id=player_id, gameweek=week, fixture_id=week * 10 + player_id, total_points=week, minutes=90)
            for player_id in (1, 2)
            for week in range(1, 8)
        ])
        session.commit()

        run, count = train_and_persist(session, start_gameweek=8, end_gameweek=8, validation_gameweeks=2)

        assert count == 2
        assert set(run.metrics["positions"].keys()) == {"DEF", "FWD"}


def test_always_train_examples_are_excluded_from_validation() -> None:
    from fpl_iq.modeling.features import TrainingExample

    live_examples = [TrainingExample(player_id=1, gameweek=week, features=(1.0,), target=float(week)) for week in range(1, 6)]
    historical_examples = [
        TrainingExample(player_id="2022-23:1", gameweek=week, features=(1.0,), target=float(week), always_train=True)
        for week in range(1, 30)
    ]

    result = train_baseline(live_examples + historical_examples, validation_gameweeks=2)

    # cutoff/validation must be computed only from the live (non always_train) gameweeks
    assert result.metrics["validation_gameweeks"] == [4, 5]
    # all 29 historical rows plus the 3 live rows before the cutoff (gws 1-3)
    assert result.metrics["training_rows"] == 29 + 3
    assert result.metrics["validation_rows"] == 2


def _hot_streak_history(player_id=1):
    # four straight nailed-on starts at ~85 minutes after one substitute cameo
    return [stat(player_id, 1, 26, minutes=26)] + [stat(player_id, week, 90, minutes=85) for week in range(2, 6)]


def test_expected_minutes_trusts_recent_starts_close_to_the_last_played_gameweek() -> None:
    features = build_prediction_features(_hot_streak_history(), target_gameweek=6)
    expected_minutes_index = 9
    # horizon = 1 (gw6 is right after the last played gw5) — should sit close
    # to the actual recent minutes (~85), not diluted much by the baseline
    assert features[0][1][expected_minutes_index] > 75


def test_expected_minutes_reverts_toward_baseline_for_a_distant_gameweek() -> None:
    near = build_prediction_features(_hot_streak_history(), target_gameweek=6)
    far = build_prediction_features(_hot_streak_history(), target_gameweek=30)
    expected_minutes_index = 9
    # far out (horizon = 25), the same history should sit further from the
    # raw recent estimate than the near-term prediction does
    assert far[0][1][expected_minutes_index] <= near[0][1][expected_minutes_index]


def _nailed_on_history(player_id=1):
    # five straight 90-minute starts, no cameos, no gaps -- maximal reliability
    return [stat(player_id, week, 90, minutes=90) for week in range(1, 6)]


def test_expected_minutes_stays_near_90_far_out_for_a_fully_reliable_starter() -> None:
    far = build_prediction_features(_nailed_on_history(), target_gameweek=30)
    expected_minutes_index = 9
    # a player who has played all 90 minutes in every game so far shouldn't
    # decay meaningfully toward a discounted baseline even at a distant
    # horizon -- past evidence of being nailed-on should carry forward
    assert far[0][1][expected_minutes_index] > 85


def test_reliable_starter_decays_less_than_a_less_consistent_one_at_the_same_horizon() -> None:
    reliable_far = build_prediction_features(_nailed_on_history(), target_gameweek=30)
    inconsistent_far = build_prediction_features(_hot_streak_history(), target_gameweek=30)
    expected_minutes_index = 9
    assert reliable_far[0][1][expected_minutes_index] > inconsistent_far[0][1][expected_minutes_index]


def test_doubtful_status_only_suppresses_the_near_term_not_the_whole_season() -> None:
    # a nailed-on starter carrying a "75% chance of playing" knock -- the
    # kind of short-lived doubt tag that shouldn't discount gameweeks months away
    doubtful_player = SimpleNamespace(
        id=1, element_type=3, status="d", chance_of_playing_next_round=75, team_id=1,
    )
    players = {1: doubtful_player}
    history = _nailed_on_history()

    weight = position_feature_config(3).weights["expected_minutes"]
    next_gw = build_prediction_features(history, target_gameweek=6, players=players)
    far_gw = build_prediction_features(history, target_gameweek=30, players=players)

    expected_minutes_index = 9
    next_gw_raw = next_gw[0][1][expected_minutes_index] / weight
    far_gw_raw = far_gw[0][1][expected_minutes_index] / weight
    # next round still carries close to the full 75% discount
    assert next_gw_raw < 90 * 0.8
    # by gw30 the doubt should have essentially faded -- assume fit by default
    assert far_gw_raw > 85


def test_expected_minutes_is_discounted_by_available_same_position_rivals() -> None:
    players = {
        1: SimpleNamespace(id=1, element_type=4, status="a", chance_of_playing_next_round=None, team_id=1),
        2: SimpleNamespace(id=2, element_type=4, status="a", chance_of_playing_next_round=None, team_id=1),
        3: SimpleNamespace(id=3, element_type=4, status="a", chance_of_playing_next_round=None, team_id=1),
    }
    no_rivals = {1: players[1]}

    with_rivals = build_prediction_features(_hot_streak_history(1), target_gameweek=30, players=players)
    without_rivals = build_prediction_features(_hot_streak_history(1), target_gameweek=30, players=no_rivals)

    expected_minutes_index = 9
    # same recent history, but far-horizon estimate should be lower when two
    # other available forwards exist at the same club
    assert with_rivals[0][1][expected_minutes_index] < without_rivals[0][1][expected_minutes_index]


def test_expected_minutes_recovers_once_target_gameweek_reaches_the_parsed_return_event() -> None:
    injured_player = SimpleNamespace(
        id=1, element_type=4, status="i", chance_of_playing_next_round=0, team_id=1,
        expected_return_event=10,
    )
    players = {1: injured_player}
    history = [stat(1, week, 5, minutes=85) for week in range(1, 6)]

    still_out = build_prediction_features(history, target_gameweek=8, players=players)
    back_by_gw10 = build_prediction_features(history, target_gameweek=10, players=players)

    expected_minutes_index = 9
    assert still_out[0][1][expected_minutes_index] == 0
    assert back_by_gw10[0][1][expected_minutes_index] > 0


def test_career_adjusted_points_per_90_blends_toward_career_rate_when_current_season_is_thin() -> None:
    # one great current-season game (thin sample) for an established scorer
    # with a strong career rate on the books
    star_player = SimpleNamespace(id=1, element_type=4, status="a", chance_of_playing_next_round=None, team_id=1, career_points_per_90=9.0)
    rookie_player = SimpleNamespace(id=2, element_type=4, status="a", chance_of_playing_next_round=None, team_id=2, career_points_per_90=None)

    star_history = [stat(1, 1, 2, minutes=90), stat(1, 2, 2, minutes=90)]
    rookie_history = [stat(2, 1, 2, minutes=90), stat(2, 2, 2, minutes=90)]

    star_features = dict(build_prediction_features(star_history, target_gameweek=3, players={1: star_player}))
    rookie_features = dict(build_prediction_features(rookie_history, target_gameweek=3, players={2: rookie_player}))

    from fpl_iq.modeling.features import FEATURE_NAMES
    career_index = FEATURE_NAMES.index("career_adjusted_points_per_90")
    # identical current-season output (2 points/90 both), but the star's
    # career rate (9.0) should pull their blended estimate well above the
    # rookie's, who has no career prior to blend toward
    assert star_features[1][career_index] > rookie_features[2][career_index]


def test_market_features_default_neutral_with_no_odds_data() -> None:
    rows = [stat(1, 1, 2), stat(1, 2, 8)]
    players = {1: SimpleNamespace(id=1, element_type=4, status=None, chance_of_playing_next_round=None, team_id=1)}
    fixtures = [SimpleNamespace(id=100, event_id=3, home_team_id=1, away_team_id=2, raw_data={})]

    features = build_prediction_features(rows, target_gameweek=3, players=players, fixtures=fixtures, teams={})

    win_index = FEATURE_NAMES.index("market_team_win_probability")
    draw_index = FEATURE_NAMES.index("market_draw_probability")
    over_index = FEATURE_NAMES.index("market_over_2_5_probability")
    assert features[0][1][win_index] == pytest.approx((1 / 3) * FeatureConfig().weights["market_team_win_probability"])
    assert features[0][1][draw_index] == pytest.approx((1 / 3) * FeatureConfig().weights["market_draw_probability"])
    assert features[0][1][over_index] == pytest.approx(0.5 * FeatureConfig().weights["market_over_2_5_probability"])


def test_market_features_reflect_supplied_odds() -> None:
    rows = [stat(1, 1, 2), stat(1, 2, 8)]
    players = {1: SimpleNamespace(id=1, element_type=4, status=None, chance_of_playing_next_round=None, team_id=1)}
    fixtures = [SimpleNamespace(id=100, event_id=3, home_team_id=1, away_team_id=2, raw_data={})]
    market_odds = {100: SimpleNamespace(
        home_win_probability=Decimal("0.7"), away_win_probability=Decimal("0.1"),
        draw_probability=Decimal("0.2"), over_2_5_probability=Decimal("0.65"),
    )}

    features = build_prediction_features(rows, target_gameweek=3, players=players, fixtures=fixtures, teams={}, market_odds=market_odds)

    win_index = FEATURE_NAMES.index("market_team_win_probability")
    over_index = FEATURE_NAMES.index("market_over_2_5_probability")
    # player's team (1) is home, so their own win probability is 0.7
    assert features[0][1][win_index] == pytest.approx(0.7 * FeatureConfig().weights["market_team_win_probability"])
    assert features[0][1][over_index] == pytest.approx(0.65 * FeatureConfig().weights["market_over_2_5_probability"])

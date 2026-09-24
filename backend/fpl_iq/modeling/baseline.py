from dataclasses import dataclass
from datetime import datetime, timezone
from statistics import mean

from sklearn.ensemble import HistGradientBoostingRegressor
from sklearn.metrics import mean_absolute_error, mean_squared_error

from .features import FEATURE_NAMES, TrainingExample


@dataclass(frozen=True)
class BaselineResult:
    model: HistGradientBoostingRegressor
    metrics: dict[str, float | int | list[int]]
    feature_names: tuple[str, ...] = FEATURE_NAMES


# Force predicted points to never decrease as expected_minutes increases,
# holding every other feature fixed. Without this the tree is free to (and,
# per real observed cases, does) rank a 48-minute player above an
# 85-minute one on a similar underlying rate — a GBM has no inherent
# notion that "more minutes, same quality, can't score fewer points" unless
# told so explicitly. Every other feature stays unconstrained (0) — we only
# have strong, unambiguous prior knowledge about this one relationship.
_MONOTONIC_CONSTRAINTS = [1 if name == "expected_minutes" else 0 for name in FEATURE_NAMES]


def split_examples(examples: list[TrainingExample], validation_gameweeks: int) -> tuple[list[TrainingExample], list[TrainingExample]]:
    """Time-based split. `always_train` examples (e.g. historical seasons)
    are never eligible for validation and never influence the cutoff — they
    only ever add training rows, so the validation metric keeps measuring
    prediction accuracy on held-out current-season gameweeks alone.
    """
    splittable = [example for example in examples if not example.always_train]
    gameweeks = sorted({example.gameweek for example in splittable})
    if len(gameweeks) < validation_gameweeks + 1:
        raise ValueError("not enough gameweeks for a time-based validation split")
    validation_weeks = gameweeks[-validation_gameweeks:]
    cutoff = min(validation_weeks)
    return (
        [example for example in examples if example.always_train or example.gameweek < cutoff],
        [example for example in splittable if example.gameweek >= cutoff],
    )


def train_baseline(examples: list[TrainingExample], validation_gameweeks: int = 3) -> BaselineResult:
    if not examples:
        raise ValueError("cannot train without training examples")
    train, validation = split_examples(examples, validation_gameweeks)
    feature_count = len(train[0].features)
    monotonic_cst = _MONOTONIC_CONSTRAINTS if feature_count == len(FEATURE_NAMES) else [0] * feature_count
    model = HistGradientBoostingRegressor(
        max_iter=100, learning_rate=0.05, max_leaf_nodes=15, random_state=42,
        monotonic_cst=monotonic_cst,
    )
    model.fit([example.features for example in train], [example.target for example in train])
    predictions = model.predict([example.features for example in validation])
    baseline_value = mean(example.target for example in train)
    actual = [example.target for example in validation]
    metrics = {
        "mae": float(mean_absolute_error(actual, predictions)),
        "rmse": float(mean_squared_error(actual, predictions) ** 0.5),
        "baseline_mae": float(mean_absolute_error(actual, [baseline_value] * len(actual))),
        "training_rows": len(train),
        "validation_rows": len(validation),
        "validation_gameweeks": sorted({example.gameweek for example in validation}),
    }
    return BaselineResult(model=model, metrics=metrics)


def predict_next_gameweek(result: BaselineResult, examples: list[TrainingExample], target_gameweek: int) -> list[tuple[int, float]]:
    candidates = [example for example in examples if example.gameweek == target_gameweek]
    if not candidates:
        return []
    predictions = result.model.predict([example.features for example in candidates])
    return [(example.player_id, max(0.0, float(prediction))) for example, prediction in zip(candidates, predictions)]


def run_metadata(result: BaselineResult, start_gameweek: int | None, end_gameweek: int | None) -> dict:
    return {
        "model_name": "hist_gradient_boosting",
        "model_version": "0.1.0",
        "feature_version": "0.1.0",
        "trained_at": datetime.now(timezone.utc),
        "training_start_event": start_gameweek,
        "training_end_event": end_gameweek,
        "metrics": result.metrics,
        "status": "candidate",
    }

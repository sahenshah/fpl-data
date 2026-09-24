import argparse

from fpl_iq.db import SessionLocal
from fpl_iq.modeling.pipeline import train_and_persist


parser = argparse.ArgumentParser(description="Train and persist the API-only baseline prediction model")
parser.add_argument("--start-gameweek", type=int, required=True, help="First gameweek to predict")
parser.add_argument("--end-gameweek", type=int, default=38, help="Last gameweek to predict, inclusive")
parser.add_argument("--validation-gameweeks", type=int, default=3)
args = parser.parse_args()

with SessionLocal() as session:
    run, prediction_count = train_and_persist(
        session,
        args.start_gameweek,
        args.end_gameweek,
        args.validation_gameweeks,
    )
    print(f"created prediction run {run.id} with {prediction_count} predictions")
    print(run.metrics)
import argparse
from pathlib import Path

from fpl_iq.db import SessionLocal
from fpl_iq.ingestion.odds import parse_historical_odds_csv, replace_historical_odds

parser = argparse.ArgumentParser(description="Ingest a historical season's match odds from a football-data.co.uk E0.csv")
parser.add_argument("--season", required=True, help="Season label, e.g. 2023-24")
parser.add_argument("--csv-path", required=True, type=Path, help="Path to the downloaded E0.csv for that season")
args = parser.parse_args()

rows = parse_historical_odds_csv(args.csv_path, args.season)

with SessionLocal() as session:
    count = replace_historical_odds(session, args.season, rows)
    session.commit()
    print(f"ingested {count} match odds rows for season {args.season}")

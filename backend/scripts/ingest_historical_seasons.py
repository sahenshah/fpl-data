import argparse
from pathlib import Path

from fpl_iq.db import SessionLocal
from fpl_iq.ingestion.historical import replace_season

parser = argparse.ArgumentParser(description="Ingest a historical FPL season from downloaded CSVs")
parser.add_argument("--season", required=True, help="Season label, e.g. 2023-24")
parser.add_argument(
    "--data-dir", required=True, type=Path,
    help="Directory containing teams.csv, players_raw.csv and gws/merged_gw.csv for the season",
)
args = parser.parse_args()

teams_csv = args.data_dir / "teams.csv"
players_csv = args.data_dir / "players_raw.csv"
merged_gw_csv = args.data_dir / "gws" / "merged_gw.csv"

with SessionLocal() as session:
    counts = replace_season(session, args.season, teams_csv, players_csv, merged_gw_csv)
    session.commit()
    print(f"ingested season {args.season}: {counts}")

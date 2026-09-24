#!/usr/bin/env bash
# Weekly (or however often you like) refresh: pulls the latest FPL data,
# live odds, and retrains + persists predictions — straight to whatever
# DATABASE_URL points at in backend/.env (Neon in production use).
#
# Safe to run from anywhere, including cron, since every path below is
# resolved from this script's own location rather than the caller's cwd.
#
# Usage:
#   bash scripts/update_predictions.sh
#
# Cron example (every Monday 06:00, logging to a file you can check later):
#   0 6 * * 1 /home/sahen/fpl-data/backend/scripts/update_predictions.sh >> /home/sahen/fpl-data/update_predictions.log 2>&1
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$(dirname "$SCRIPT_DIR")"
REPO_DIR="$(dirname "$BACKEND_DIR")"
PYTHON="$REPO_DIR/venv/bin/python"

cd "$BACKEND_DIR"
export PYTHONPATH="$BACKEND_DIR"

log() {
	echo "[update_predictions] $(date -u +%FT%TZ) $*"
}

log "starting"

log "ingesting bootstrap (teams, players, events)"
"$PYTHON" scripts/ingest_bootstrap.py

log "ingesting fixtures"
"$PYTHON" scripts/ingest_fixtures.py

log "ingesting player gameweek history"
"$PYTHON" scripts/ingest_player_history.py

log "ingesting live match odds"
"$PYTHON" scripts/ingest_live_odds.py

log "training and persisting predictions"
"$PYTHON" -c "
from fpl_iq.db import SessionLocal
from fpl_iq.modeling.pipeline import train_and_persist

with SessionLocal() as session:
    run, count = train_and_persist(session, start_gameweek=1, end_gameweek=38, validation_gameweeks=3)
    print(f'run {run.id}: {count} predictions persisted')
"

log "done"

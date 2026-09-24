# FPL IQ Backend

The backend lives in `fpl_iq/` and uses the official FPL API, historical
season archives, and betting-market data as its ingestion sources.

**This app does not serve production traffic.** In production, the API
layer is a set of Cloudflare Pages Functions (`frontend/functions/`) that
query the database directly — see the root `README.md`. This FastAPI app
(`fpl_iq/main.py`) exists for local development, local API testing, and as
the thing you actually run to ingest data and train the model. The Python
`DATABASE_URL` can point at either a local SQLite file (safe for
experimentation) or the production Neon database (for real ingestion/
training runs) — see `backend/.env`.

## Local setup

```sh
source venv/bin/activate
pip install -r backend/requirements.txt
```

Create `backend/.env` (gitignored) with at least:

```
DATABASE_URL=sqlite:///database/fpl_iq.db   # or a postgresql+psycopg://... URL for Neon
ODDS_API_KEY=...                            # from the-odds-api.com, needed for live odds ingestion
```

## Database migrations

```sh
PYTHONPATH=backend alembic -c backend/alembic.ini upgrade head
```

Populate the empty schema from the official FPL API:

```sh
PYTHONPATH=backend python backend/scripts/ingest_bootstrap.py
```

A local SQLite database is generated on disk and is intentionally excluded
from version control. Recreate it from migrations and the ingestion
commands when needed. `scripts/migrate_sqlite_to_postgres.py` is a one-off
tool used to seed Neon from an existing local SQLite database.

## Run the API (local dev only)

```sh
PYTHONPATH=backend uvicorn fpl_iq.main:app --reload
```

The operational endpoints are `/health` and `/ready`.

## Frontend data access

The frontend should use two requests on page load:

```text
GET /api/v1/bootstrap
GET /api/v1/managers/{team_id}/snapshot
```

`/api/v1/bootstrap` returns the latest complete bootstrap response from the
database. It is shared season data and uses `ETag` plus
`Cache-Control: public, max-age=300`, so the browser can reuse it without
downloading the payload again. The backend also keeps a five-minute in-process
cache, avoiding repeated database serialization.

The manager snapshot combines summary, transfers, history, and all available
gameweek picks into one response. It uses a private five-minute browser cache
and a five-minute backend cache. Manager data is not placed in the shared
bootstrap cache because it is user-specific.

The browser should store the returned payload in application state and/or
`sessionStorage`/`localStorage`. It should not call the official FPL API or a
CORS proxy directly. On a repeat page load, send the previous `ETag` as
`If-None-Match`; a `304` response means the existing browser copy is still
valid.

## Stored FPL data

Bootstrap ingestion stores typed scalar fields for teams, players, events,
chips, phases, and element types. Nested API objects and the original source
record are retained in JSON columns (`overrides`, `chip_plays`,
`top_element_info`, and `raw_data`) so API additions do not silently discard
information.

The client also supports the official fixtures, player-summary, live-event,
and manager endpoints. Manager-specific responses are fetched by explicit
ingestion jobs and are not mixed into the season-wide bootstrap tables.

## Prediction storage

Predictions are stored in `prediction_runs` and `player_predictions`. Each
prediction is keyed by model run, player, and target gameweek. This allows
time-based evaluation and model comparison without adding columns such as
`pp_gw_1`, `pp_gw_2`, or `pp_gw_3` to the player table.

## Ingestion and training

For the routine weekly refresh (live FPL data, live odds, retrain, persist
predictions to whatever `DATABASE_URL` points at), just run:

```sh
bash backend/scripts/update_predictions.sh
```

The individual pieces it chains, if you need to run them separately or set
up something from scratch:

```sh
PYTHONPATH=backend python backend/scripts/ingest_bootstrap.py         # teams, players, events
PYTHONPATH=backend python backend/scripts/ingest_fixtures.py
PYTHONPATH=backend python backend/scripts/ingest_player_history.py    # per-player gameweek history
PYTHONPATH=backend python backend/scripts/ingest_live_odds.py         # needs ODDS_API_KEY
PYTHONPATH=backend python backend/scripts/run_baseline_model.py --start-gameweek 1 --end-gameweek 38
```

One-time-only ingestion (already run for this project, only needed again
if rebuilding a database from scratch):

```sh
PYTHONPATH=backend python backend/scripts/ingest_historical_seasons.py --season 2023-24 --data-dir data/fpl-archive/data/2023-24
PYTHONPATH=backend python backend/scripts/ingest_historical_odds.py --season 2023-24 --csv-path data/odds/Season_2324/E0.csv
```

Training uses a strict time-based holdout — the latest gameweeks are held
out for validation, never randomly mixed with earlier training rows, to
avoid leaking future information into the metric.

GW1 has no current-season history to build the normal per-gameweek
features from, so it's handled separately: predictions come from each
player's historical career rate (see the root `README.md`'s "Prediction
model" section) rather than the trained per-position models.

## Tests

```sh
PYTHONPATH=backend pytest backend/tests
```

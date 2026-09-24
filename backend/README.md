# FPL IQ Backend

The backend lives in `fpl_iq/` and uses the official FPL API as its ingestion
source. Runtime requests read from the local application database; they do not
scrape or proxy external websites.

## Local setup

```sh
source venv/bin/activate
pip install -r backend/requirements.txt
```

## Database migrations

Use a separate database URL for local development. The default points to
`backend/database/fpl_iq.db`.

```sh
DATABASE_URL=sqlite:///backend/database/fpl_iq.db \
  alembic -c backend/alembic.ini upgrade head
```

Populate the empty schema from the official FPL API:

```sh
PYTHONPATH=backend DATABASE_URL=sqlite:///backend/database/fpl_iq.db \
  python backend/scripts/ingest_bootstrap.py
```

The database is generated locally and is intentionally excluded from version
control. Recreate it from migrations and the ingestion command when needed.

## Run the API

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

## API-only baseline model

First ingest player gameweek history from the official element-summary API:

```sh
PYTHONPATH=backend DATABASE_URL=sqlite:///backend/database/fpl_iq.db \
  python backend/scripts/ingest_player_history.py
```

Then train and persist a time-split baseline for the rest of the season:

```sh
PYTHONPATH=backend DATABASE_URL=sqlite:///backend/database/fpl_iq.db \
  python backend/scripts/run_baseline_model.py --start-gameweek 6 --end-gameweek 38
```

The baseline uses only FPL data: prior points, minutes, rolling averages,
season averages, and historical player performance available in the API. Validation
uses the latest gameweeks as a holdout; it does not randomly mix future rows
into training data.

Retrospective predictions can be requested from GW1, but GW1 itself has no
prior current-season observations in the database. Therefore the pipeline
produces leakage-free retrospective predictions from GW2 onward and records
GW1 in the run metadata as unavailable rather than inventing a prediction from
later-season data.

## Tests

```sh
PYTHONPATH=backend pytest backend/tests
```

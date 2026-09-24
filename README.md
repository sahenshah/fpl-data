# FPL IQ

A Fantasy Premier League dashboard built around a self-trained prediction
model, rather than third-party projections. It ingests data from the
official FPL API, historical seasons, and betting markets, trains a
per-position gradient-boosted model, and serves live predictions and
player/team data through a React frontend.

## Live site

https://fpl-iq.pages.dev/

## Current status

**Phase 1 (backend + prediction model): complete.** The legacy Flask +
scraped-projections backend has been fully replaced. The site now runs on
a self-built model trained on real historical and market data, deployed
without any always-on server (see Architecture below).

**Phase 2 (frontend rebuild): not started.** The current frontend includes
a prototype "pitch view" team dashboard built for internal testing — it is
not the final design and is expected to be rebuilt from scratch, likely
reusing layout ideas from other FPL sites (e.g. [fplcore.com](https://www.fplcore.com/))
while adding data-visualization sections and a redesigned fixtures view
that aren't in the current build.

## Architecture

There is no always-on backend server in production — this was a deliberate
choice to avoid both the recurring cost of a VM and the cold-start delay of
a free-tier web service that spins down when idle.

- **Frontend**: React 19 + TypeScript + Vite, hosted on **Cloudflare
  Pages** (`frontend/`).
- **API (production)**: **Cloudflare Pages Functions** (TypeScript,
  `frontend/functions/`) — edge functions co-deployed with the static
  site, querying the database directly via Neon's serverless driver.
  Near-instant cold starts (V8 isolates, not containers).
- **Database**: **Neon** (serverless Postgres) — schema managed by
  Alembic, scales to zero when idle.
- **Model training / data ingestion**: a Python backend (`backend/fpl_iq/`,
  FastAPI + SQLAlchemy + scikit-learn) run **locally**, writing directly
  to the production Neon database. There's no server process for this in
  production — it's a script you run on your own machine (see
  [Updating the model](#updating-the-model)), and the FastAPI app it's
  built around only serves local development/testing, not live traffic.

## Prediction model

Per-position (GK/DEF/MID/FWD) `HistGradientBoostingRegressor` models
(scikit-learn), trained with a time-based holdout (never a random split,
to avoid leaking future gameweeks into validation). Features include:

- Recency-weighted recent form (points, xGI), separate from season-long
  averages
- Self-derived, current-season team attack/defence strength — computed
  from actual goals/xG rather than relying on FPL's own strength ratings,
  shrunk toward the league average early in the season or for clubs with
  little data (e.g. newly promoted teams)
- A career-history prior (points-per-90 from 6 seasons of historical data,
  matched by player name) blended with current-season form, weighted more
  heavily before enough current-season evidence exists
- Injury/rotation-aware expected minutes: horizon-based decay toward a
  conservative baseline for a player with a thin track record, parsed
  injury return-date estimates, and squad-depth discounting — but a proven
  nailed-on starter's estimate stays flat rather than drifting down over
  the season
- De-vigged betting-market probabilities (match result, over/under 2.5
  goals) from historical and live odds
- A monotonic constraint tying predicted points to expected minutes, so
  the model can't rank a low-minutes player above a higher-minutes one on
  an otherwise similar profile

GW1 (before any current-season data exists) falls back to the
career-history prior blended with fixture difficulty, rather than a flat
per-team baseline.

## Data sources

- Official FPL API — bootstrap data, fixtures, player gameweek history,
  live manager team/picks data
- [vaastav/Fantasy-Premier-League](https://github.com/vaastav/Fantasy-Premier-League) —
  historical season data (2019-20 through 2024-25)
- [football-data.co.uk](https://www.football-data.co.uk/) — historical
  match odds
- [The Odds API](https://the-odds-api.com/) — live match odds

## Updating the model

```sh
bash backend/scripts/update_predictions.sh
```

Refreshes FPL data, live odds, retrains all four position models, and
persists new predictions straight to the production database — no commit
or redeploy needed, since this only changes data, not code. Can be run on
a cron schedule; see the script's header comment for an example. Excludes
historical-season/historical-odds ingestion, since those cover already-
finished seasons and don't need refreshing.

## Local development

### Backend (ingestion + model training)

```sh
cd backend
python -m venv ../venv && source ../venv/bin/activate
pip install -r requirements.txt
```

Create `backend/.env` (gitignored):

```
DATABASE_URL=postgresql+psycopg://...   # or sqlite:///database/fpl_iq.db for local-only experimentation
ODDS_API_KEY=...                        # from the-odds-api.com
```

```sh
PYTHONPATH=. alembic -c alembic.ini upgrade head
PYTHONPATH=. python scripts/ingest_bootstrap.py
# ...and the other ingest_*.py scripts as needed
```

### Frontend

```sh
cd frontend
npm install
npm run dev
```

To test the production API layer locally against the real database:

```sh
cd frontend
npm run build
npx wrangler pages dev dist   # reads DATABASE_URL from .dev.vars (gitignored)
```

### Deployment

Cloudflare Pages auto-builds from `master`, including `frontend/functions/`
— push to deploy code changes. `DATABASE_URL` must be set as an encrypted
environment variable in the Cloudflare Pages project settings (Production
environment), using the plain `postgresql://...` form — not the
`+psycopg` SQLAlchemy dialect suffix used in the Python backend's `.env`.

## Testing

```sh
cd backend && PYTHONPATH=. pytest tests
cd frontend && npx tsc -b
```

## Tech stack

- **Frontend**: React 19, TypeScript, Vite, MUI, MUI X Charts, Recharts,
  AG Grid (two overlapping grid libraries currently present — flagged for
  consolidation during the Phase 2 rebuild)
- **API (production)**: Cloudflare Pages Functions (TypeScript),
  `@neondatabase/serverless`
- **Backend (local ingestion/training)**: FastAPI, SQLAlchemy, Alembic,
  scikit-learn, httpx
- **Database**: Neon (Postgres)

## License

MIT

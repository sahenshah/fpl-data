# FPL IQ (fpl-data) — Rebuild Architecture & Standards

## Context

FPL IQ is a live Fantasy Premier League data/analytics dashboard —
**this repo (`fpl-data`) is the real one**, deployed at
https://fpl-iq.onrender.com/. (A separate `fpl-friend` repo exists but is
an unrelated earlier project — ignore any instructions file found there,
it does not apply here.)

The goal is a deliberate, staged rebuild, done with AI-assisted engineering
(Claude Code/agentic tools) as genuine practice for interview-ready
fluency, not just "make it work again."

**Two phases. This file governs Phase 1 only.**

- **Phase 1 (current):** rebuild the backend — API layer, data model, data
  ingestion from the official FPL API, and a self-built prediction model to
  replace the scraped third-party prediction data.
- **Phase 2 (later, separate scope):** frontend improvements/cleanup, once
  Phase 1 is built and running. Do not start this early. If a Phase 1 task
  seems to need a frontend change to keep the site working, stop and flag
  it rather than quietly doing it.

## Current State (Legacy, Being Replaced)

- **Backend:** Flask + pandas + a raw SQLAlchemy **engine** (`pd.read_sql`
  against it — not the ORM, no models) + numpy + requests. Two distinct
  data paths coexist:
  - **Live proxy routes** — `/api/bootstrap-static`, `/api/fixtures`,
    `/api/element-summary/<id>`, `/api/event/<gw>/live`,
    `/api/entry/<id>`, `/api/entry/<id>/history` — call the official FPL
    API directly on every request and return the response as-is. No
    caching, no rate-limit handling.
  - **Local DB routes** — `/api/fpl_data/players`, `/teams`, `/events`,
    `/fixtures`, `/element-summary-fixtures/<id>`,
    `/element-summary-history/<id>`, `/element-summary-history-past/<id>`,
    `/bootstrap-static`, `/last_predicted_gw` — read from a pre-populated
    SQLite file (`fpl_data.db`), rebuilt by rerunning
    `backend/scripts/populate_fpl_database.py`.
  - Flask **also serves the built React frontend** as static files from
    `backend/dist` — one process serves both API and frontend, matching
    the single-service Render deployment today.
- **Predictions:** the `elements` table carries `pp_gw_N` columns
  (predicted points per upcoming gameweek), sourced from third-party
  prediction models via the population script — this is exactly what gets
  replaced with a self-built model.
- **Known issue, does not carry forward:** a few DB routes build SQL via
  f-string interpolation (e.g.
  `f'SELECT * FROM element_summary_fixtures WHERE element_id = {player_id}'`)
  instead of parameterized queries. Low practical risk today since Flask's
  `<int:player_id>` route converter forces an int first, but it's a fragile
  pattern to leave in place — convert to parameterized queries as standard
  practice, not just where it's currently risky.
- **Frontend (Phase 2, unchanged for now):** React 19 + TypeScript + Vite
  (real `tsc -b` type-checked build), MUI + MUI X Charts + MUI X Data Grid,
  Recharts, **and** AG Grid — two overlapping table/grid libraries present
  at once. Worth consolidating to one in Phase 2; not a Phase 1 concern.

## Phase 1 Scope

**In scope:**
- FastAPI rewrite of the API layer — async, Pydantic response models
  instead of hand-built dicts from `df.to_dict()`.
- A decision on the local data store: **default to keeping SQLite** unless
  a concrete reason emerges to move to Postgres — this is a read-heavy,
  single-writer (the population script) app with no concurrent-write
  requirement, so Postgres would be added complexity without a matching
  need. Revisit only if that assumption stops holding.
- A redesigned data-ingestion pipeline: pulling from the official FPL API,
  plus a self-built prediction model replacing the `pp_gw_N` third-party
  predictions.
- Caching/rate-limit handling in front of the **live proxy routes**, which
  currently have none — this is the actual "optimise how data is pulled"
  work, alongside whatever the ingestion pipeline needs for the DB-backed
  routes.
- Converting the f-string SQL routes to parameterized queries regardless
  of what replaces them structurally.

**Explicitly out of scope for Phase 1:**
- Any frontend code changes, including the AG Grid/MUI X Data Grid
  overlap — that's a Phase 2 cleanup item.
- Any change to deployment topology. Flask/FastAPI keeps serving the built
  frontend as static files from one process, matching the current Render
  setup — don't split frontend/backend deployment as part of this phase.

## Architecture Decisions

- **API framework:** FastAPI, async where the workload benefits (FPL API
  calls, prediction model inference) — same proven pattern as payment-api.
- **Data layer:** SQLite via SQLAlchemy, moving from raw `pd.read_sql`
  string queries to either the SQLAlchemy ORM or well-structured
  parameterized queries — pandas can still be the tool for the actual data
  wrangling/feature engineering, this is about the query layer, not
  banning pandas.
- **Validation:** Pydantic models for every API response — no more
  `df.replace({np.nan: None}).to_dict(orient='records')` returned directly
  as the response shape.
- **Prediction model:** ambitious is fine as a direction — proper feature
  engineering from the historical player data already being pulled,
  comparison across multiple model types — but start with a
  scikit-learn/LightGBM baseline before reaching for a neural net, and keep
  experimentation clearly separate from what actually ships. See the
  checkpoint below.
- **Testing:** unit tests for the prediction pipeline's data transforms and
  for API response shapes at minimum.

## Guardrails

- **Don't touch frontend code in Phase 1**, including the AG Grid/MUI X
  Data Grid duplication — flag it, don't fix it now.
- **Don't change deployment topology.** Single process serving API +
  built frontend stays as-is.
- **Don't move to Postgres by default.** SQLite stays unless a concrete
  requirement (concurrent writes, multi-user state) actually appears.
- **Checkpoint before adding model complexity.** Ship one working,
  evaluated baseline model first — scored against a clear metric (e.g.
  prediction error on held-out historical gameweeks) — before deciding
  whether more sophistication is worth it. Same principle as the
  system-design "chapter → attempt → reassess" pattern.
- **If a task seems to need a service/dependency not listed here, stop and
  ask rather than adding it.**

## Verification Standard

Verify against reality, not against the AI's own claim of success.

- **API:** endpoint-level tests pass, plus a manual check against real FPL
  data (a couple of known players/fixtures) before an endpoint counts as
  done.
- **Live proxy routes:** confirm caching/rate-limit handling actually
  reduces call volume to the official API under repeated requests, not
  just that it compiles.
- **Prediction model:** evaluated against a held-out set, with the metric
  and result written down — not just "it ran."

import asyncio
import hashlib
import json
from datetime import datetime, timezone
from typing import Any

from fastapi import APIRouter, Depends, Header, HTTPException, Response
import httpx
from sqlalchemy import select
from sqlalchemy.orm import Session

from .cache import cache
from .db import get_session
from .ingestion.client import FplClient
from .models import BootstrapSnapshot, Event, Fixture, Player, PlayerGameweekStat, PlayerPrediction, PredictionRun


router = APIRouter(prefix="/api/v1")
SHARED_CACHE_TTL = 300
MANAGER_CACHE_TTL = 300


@router.get("/players/{player_id}/history", tags=["data"])
def player_history(player_id: int, session: Session = Depends(get_session)) -> dict[str, list[dict[str, Any]]]:
    rows = session.scalars(
        select(PlayerGameweekStat)
        .where(PlayerGameweekStat.player_id == player_id)
        .order_by(PlayerGameweekStat.gameweek, PlayerGameweekStat.fixture_id)
    )
    return {"history": [row.raw_data for row in rows]}


@router.get("/players/{player_id}/history/past", tags=["data"])
def player_past_history(player_id: int) -> dict[str, list[Any]]:
    return {"history_past": []}


def _etag(value: Any) -> str:
    encoded = json.dumps(value, sort_keys=True, separators=(",", ":"), default=str).encode()
    return hashlib.sha256(encoded).hexdigest()


def _cached_response(response: Response, value: Any, etag: str, cache_control: str, if_none_match: str | None) -> Any:
    response.headers["ETag"] = etag
    response.headers["Cache-Control"] = cache_control
    if if_none_match and if_none_match.strip('"') == etag:
        response.status_code = 304
        return None
    return value


@router.get("/bootstrap", tags=["data"])
def bootstrap(
    response: Response,
    if_none_match: str | None = Header(default=None),
    session: Session = Depends(get_session),
) -> Any:
    cached = cache.get("bootstrap")
    if cached is None:
        snapshot = session.scalar(select(BootstrapSnapshot).order_by(BootstrapSnapshot.id.desc()).limit(1))
        if snapshot is None:
            raise HTTPException(status_code=503, detail="bootstrap data has not been ingested")
        cached = cache.put("bootstrap", snapshot.raw_data, SHARED_CACHE_TTL, _etag(snapshot.raw_data))
    return _cached_response(response, cached.value, cached.etag, "public, max-age=300, must-revalidate", if_none_match)


@router.get("/dashboard", tags=["data"])
def dashboard(
    response: Response,
    if_none_match: str | None = Header(default=None),
    session: Session = Depends(get_session),
) -> Any:
    cached = cache.get("dashboard")
    if cached is None:
        snapshot = session.scalar(select(BootstrapSnapshot).order_by(BootstrapSnapshot.id.desc()).limit(1))
        if snapshot is None:
            raise HTTPException(status_code=503, detail="bootstrap data has not been ingested")
        fixtures = [fixture.raw_data for fixture in session.scalars(select(Fixture).order_by(Fixture.id))]
        current_event = session.scalar(select(Event).where(Event.is_current.is_(True)).limit(1))
        live_elements = []
        if current_event is not None:
            live_rows = session.scalars(
                select(PlayerGameweekStat).where(PlayerGameweekStat.gameweek == current_event.id)
            )
            live_elements = [{"id": row.player_id, "stats": row.raw_data} for row in live_rows]
        run = session.scalar(select(PredictionRun).order_by(PredictionRun.id.desc()).limit(1))
        predictions = []
        if run is not None:
            prediction_rows = session.execute(
                select(PlayerPrediction, Player.web_name, Player.team_id)
                .join(Player, Player.id == PlayerPrediction.player_id)
                .where(PlayerPrediction.prediction_run_id == run.id)
            )
            predictions = [
                {
                    "player_id": row.PlayerPrediction.player_id,
                    "web_name": row.web_name,
                    "team_id": row.team_id,
                    "event_id": row.PlayerPrediction.event_id,
                    "predicted_points": float(row.PlayerPrediction.predicted_points),
                    "predicted_minutes": float(row.PlayerPrediction.predicted_minutes) if row.PlayerPrediction.predicted_minutes is not None else None,
                }
                for row in prediction_rows
            ]
        value = {
            "bootstrap": snapshot.raw_data,
            "fixtures": fixtures,
            "live": {"elements": live_elements, "event": current_event.id if current_event else None},
            "predictions": predictions,
            "prediction_run": {
                "id": run.id,
                "model_name": run.model_name,
                "model_version": run.model_version,
                "metrics": run.metrics,
            } if run is not None else None,
        }
        cached = cache.put("dashboard", value, SHARED_CACHE_TTL, _etag(value))
    return _cached_response(response, cached.value, cached.etag, "public, max-age=300, must-revalidate", if_none_match)


@router.get("/managers/{team_id}/snapshot", tags=["manager"])
async def manager_snapshot(
    team_id: int,
    response: Response,
    if_none_match: str | None = Header(default=None),
    session: Session = Depends(get_session),
) -> Any:
    cache_key = f"manager:{team_id}"
    cached = cache.get(cache_key)
    if cached is None:
        current_event = session.scalar(
            select(Event).where(Event.is_current.is_(True)).order_by(Event.id.desc()).limit(1)
        )
        next_event = session.scalar(
            select(Event).where(Event.is_next.is_(True)).order_by(Event.id.asc()).limit(1)
        )
        gameweek = current_event.id if current_event else (next_event.id if next_event else None)
        if gameweek is None:
            raise HTTPException(status_code=503, detail="current gameweek is unavailable")

        async with httpx.AsyncClient(base_url=FplClient.base_url, timeout=20.0) as http_client:
            client = FplClient(http_client)
            summary, transfers, history = await asyncio.gather(
                client.fetch_entry(team_id),
                client.fetch_entry_transfers(team_id),
                client.fetch_entry_history(team_id),
            )
            pick_results = await asyncio.gather(
                *(client.fetch_entry_picks(team_id, gw) for gw in range(1, gameweek + 1)),
                return_exceptions=True,
            )
        picks = [
            {"gameweek": gw, "data": result if not isinstance(result, Exception) else None}
            for gw, result in enumerate(pick_results, start=1)
        ]
        value = {
            "team": summary,
            "transfers": transfers,
            "history": history,
            "picks": picks,
            "fetched_at": datetime.now(timezone.utc).isoformat(),
        }
        cached = cache.put(cache_key, value, MANAGER_CACHE_TTL, _etag(value))
    return _cached_response(response, cached.value, cached.etag, "private, max-age=300, must-revalidate", if_none_match)

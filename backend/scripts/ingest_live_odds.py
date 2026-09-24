import asyncio

from fpl_iq.config import settings
from fpl_iq.db import SessionLocal
from fpl_iq.ingestion.odds import parse_live_odds_payload, replace_live_odds
from fpl_iq.ingestion.odds_client import OddsApiClient
from fpl_iq.models import Fixture, Team
from sqlalchemy import select


async def ingest() -> None:
    if not settings.odds_api_key:
        raise SystemExit("ODDS_API_KEY is not set — create a free account at the-odds-api.com and export it")

    client = OddsApiClient(settings.odds_api_key)
    payload = await client.fetch_odds()

    with SessionLocal() as session:
        fixtures = list(session.scalars(select(Fixture)))
        teams_by_id = {team.id: team for team in session.scalars(select(Team))}
        rows = parse_live_odds_payload(payload, fixtures, teams_by_id)
        count = replace_live_odds(session, rows)
        session.commit()
        print(f"ingested {count} live match odds rows")


if __name__ == "__main__":
    asyncio.run(ingest())

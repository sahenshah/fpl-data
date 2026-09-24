import asyncio

from fpl_iq.db import SessionLocal
from fpl_iq.ingestion.bootstrap import persist_fixtures
from fpl_iq.ingestion.client import FplClient


async def ingest() -> None:
    records = await FplClient().fetch_fixtures()
    with SessionLocal() as session:
        persist_fixtures(session, records)
    print(f"ingested {len(records)} fixtures")


if __name__ == "__main__":
    asyncio.run(ingest())

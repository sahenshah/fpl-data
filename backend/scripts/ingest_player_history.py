import asyncio

import httpx

from fpl_iq.db import SessionLocal
from fpl_iq.ingestion.client import FplClient
from fpl_iq.ingestion.history import replace_player_history, player_ids


async def ingest() -> None:
    async with httpx.AsyncClient(base_url=FplClient.base_url, timeout=20.0) as http_client:
        client = FplClient(http_client)
        with SessionLocal() as session:
            ids = player_ids(session)
            for index, player_id in enumerate(ids, start=1):
                payload = await client.fetch_element_summary(player_id)
                replace_player_history(session, player_id, payload)
                if index % 25 == 0:
                    session.commit()
                    print(f"ingested {index}/{len(ids)} players")
            session.commit()
            print(f"ingested {len(ids)} players")


if __name__ == "__main__":
    asyncio.run(ingest())

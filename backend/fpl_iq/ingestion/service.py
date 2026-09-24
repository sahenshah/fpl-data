from sqlalchemy.orm import Session

from ..db import SessionLocal
from .bootstrap import persist_bootstrap
from .client import FplClient


async def ingest_bootstrap(session: Session | None = None) -> None:
    client = FplClient()
    payload = await client.fetch_bootstrap()
    if session is not None:
        persist_bootstrap(session, payload)
        return

    with SessionLocal() as owned_session:
        persist_bootstrap(owned_session, payload)

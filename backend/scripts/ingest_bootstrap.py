import asyncio

from fpl_iq.ingestion.service import ingest_bootstrap


if __name__ == "__main__":
    asyncio.run(ingest_bootstrap())

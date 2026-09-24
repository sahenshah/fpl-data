"""One-off data migration: copy every row from the local SQLite database
into the Postgres database configured via DATABASE_URL (e.g. Neon).

Uses the shared SQLAlchemy metadata (Base.metadata) as the single source of
truth for both sides, so JSON/Numeric/etc. columns round-trip through their
real Python types rather than raw driver-specific values, and tables are
copied in foreign-key-safe order via `sorted_tables`.
"""
from pathlib import Path

from sqlalchemy import create_engine, insert, text

from fpl_iq import models  # noqa: F401 -- populates Base.metadata
from fpl_iq.config import settings
from fpl_iq.db import Base

SQLITE_PATH = Path(__file__).resolve().parents[1] / "database" / "fpl_iq.db"
CHUNK_SIZE = 500


def main() -> None:
    sqlite_engine = create_engine(f"sqlite:///{SQLITE_PATH}")
    postgres_engine = create_engine(settings.database_url)

    with sqlite_engine.connect() as source, postgres_engine.begin() as destination:
        for table in Base.metadata.sorted_tables:
            rows = [dict(row) for row in source.execute(table.select()).mappings().all()]
            if not rows:
                print(f"{table.name}: 0 rows (skipped)")
                continue

            destination.execute(table.delete())
            for start in range(0, len(rows), CHUNK_SIZE):
                destination.execute(insert(table), rows[start:start + CHUNK_SIZE])
            print(f"{table.name}: {len(rows)} rows")

            # Explicit-id inserts don't advance Postgres's identity sequence
            # -- reset it so the next real (non-migrated) insert doesn't
            # collide with a migrated id. No-op (returns NULL) for tables
            # without a simple serial "id" primary key.
            if "id" in table.c:
                destination.execute(text(
                    f"SELECT setval(pg_get_serial_sequence('{table.name}', 'id'), "
                    f"COALESCE((SELECT MAX(id) FROM {table.name}), 1)) "
                    f"WHERE pg_get_serial_sequence('{table.name}', 'id') IS NOT NULL"
                ))

    print("Done.")


if __name__ == "__main__":
    main()

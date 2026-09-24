from dataclasses import dataclass
import os
from pathlib import Path

from dotenv import load_dotenv

load_dotenv(Path(__file__).resolve().parents[1] / ".env")


@dataclass(frozen=True)
class Settings:
    app_name: str = "FPL IQ API"
    database_url: str = os.getenv(
        "DATABASE_URL",
        f"sqlite:///{Path(__file__).resolve().parents[1] / 'database' / 'fpl_iq.db'}",
    )
    api_prefix: str = "/api/v1"
    odds_api_key: str | None = os.getenv("ODDS_API_KEY")


settings = Settings()

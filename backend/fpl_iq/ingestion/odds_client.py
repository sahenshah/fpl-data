from typing import Any

import httpx


class OddsApiError(RuntimeError):
    pass


class OddsApiClient:
    """Thin client for The Odds API's EPL match-odds endpoint."""

    base_url = "https://api.the-odds-api.com/v4"
    sport_key = "soccer_epl"

    def __init__(self, api_key: str, client: httpx.AsyncClient | None = None) -> None:
        self._api_key = api_key
        self._client = client
        self._owns_client = client is None

    async def fetch_odds(self, regions: str = "uk", markets: str = "h2h,totals") -> list[dict[str, Any]]:
        params = {"apiKey": self._api_key, "regions": regions, "markets": markets, "oddsFormat": "decimal"}
        client = self._client or httpx.AsyncClient(base_url=self.base_url, timeout=20.0)
        try:
            response = await client.get(f"/sports/{self.sport_key}/odds/", params=params)
            response.raise_for_status()
            payload = response.json()
            if not isinstance(payload, list):
                raise OddsApiError("odds response was not a list")
            return payload
        finally:
            if self._owns_client:
                await client.aclose()

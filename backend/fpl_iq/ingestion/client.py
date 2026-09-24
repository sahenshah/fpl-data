from typing import Any

import httpx


class FplApiError(RuntimeError):
    pass


class FplClient:
    base_url = "https://fantasy.premierleague.com/api"

    def __init__(self, client: httpx.AsyncClient | None = None) -> None:
        self._client = client
        self._owns_client = client is None

    async def fetch_bootstrap(self) -> dict[str, Any]:
        return await self._fetch_json("/bootstrap-static/")

    async def fetch_fixtures(self) -> list[dict[str, Any]]:
        payload = await self._fetch_json("/fixtures/")
        if not isinstance(payload, list):
            raise FplApiError("fixtures response was not a list")
        return payload

    async def fetch_element_summary(self, player_id: int) -> dict[str, Any]:
        return await self._fetch_json(f"/element-summary/{player_id}/")

    async def fetch_event_live(self, gameweek: int) -> dict[str, Any]:
        return await self._fetch_json(f"/event/{gameweek}/live/")

    async def fetch_entry(self, team_id: int) -> dict[str, Any]:
        return await self._fetch_json(f"/entry/{team_id}/")

    async def fetch_entry_transfers(self, team_id: int) -> list[dict[str, Any]]:
        payload = await self._fetch_json(f"/entry/{team_id}/transfers/")
        if not isinstance(payload, list):
            raise FplApiError("entry transfers response was not a list")
        return payload

    async def fetch_entry_picks(self, team_id: int, gameweek: int) -> dict[str, Any]:
        return await self._fetch_json(f"/entry/{team_id}/event/{gameweek}/picks/")

    async def fetch_entry_history(self, team_id: int) -> dict[str, Any]:
        return await self._fetch_json(f"/entry/{team_id}/history/")

    async def _fetch_json(self, path: str) -> Any:
        client = self._client or httpx.AsyncClient(base_url=self.base_url, timeout=20.0)
        try:
            response = await client.get(path)
            response.raise_for_status()
            return response.json()
        except (httpx.HTTPError, ValueError) as error:
            raise FplApiError(f"failed to fetch {path}") from error
        finally:
            if self._owns_client:
                await client.aclose()

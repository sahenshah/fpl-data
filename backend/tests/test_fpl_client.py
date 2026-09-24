import httpx
import pytest

from fpl_iq.ingestion.client import FplClient


@pytest.mark.asyncio
async def test_fetch_bootstrap_returns_json_object() -> None:
    def handler(request: httpx.Request) -> httpx.Response:
        assert request.url.path == "/bootstrap-static/"
        return httpx.Response(200, json={"teams": [], "elements": [], "events": []})

    async with httpx.AsyncClient(transport=httpx.MockTransport(handler), base_url="https://test") as client:
        payload = await FplClient(client).fetch_bootstrap()

    assert payload["teams"] == []


@pytest.mark.asyncio
async def test_client_builds_supported_endpoint_paths() -> None:
    def handler(request: httpx.Request) -> httpx.Response:
        if request.url.path in ("/fixtures/", "/entry/11/transfers/"):
            return httpx.Response(200, json=[])
        return httpx.Response(200, json={})

    async with httpx.AsyncClient(transport=httpx.MockTransport(handler), base_url="https://test") as client:
        fpl = FplClient(client)
        assert await fpl.fetch_fixtures() == []
        await fpl.fetch_element_summary(7)
        await fpl.fetch_event_live(3)
        await fpl.fetch_entry(11)
        assert await fpl.fetch_entry_transfers(11) == []
        await fpl.fetch_entry_picks(11, 3)
        await fpl.fetch_entry_history(11)

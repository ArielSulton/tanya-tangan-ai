"""
Integration tests for /api/v1/vocab/ endpoints
Requires real DB (no mocks) — per project convention
"""
import pytest
from httpx import AsyncClient, ASGITransport
from app.main import app


@pytest.mark.asyncio
async def test_get_categories():
    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as client:
        response = await client.get("/api/v1/vocab/categories")
    assert response.status_code == 200
    data = response.json()
    assert "categories" in data
    assert "hewan" in data["categories"]
    assert "kata_keterangan" in data["categories"]


@pytest.mark.asyncio
async def test_lookup_word_not_found():
    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as client:
        response = await client.get(
            "/api/v1/vocab/lookup", params={"word": "xyznotexist", "category": "hewan"}
        )
    assert response.status_code == 200
    data = response.json()
    assert data["found"] is False
    assert data["word"] is None


@pytest.mark.asyncio
async def test_lookup_word_invalid_category():
    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as client:
        response = await client.get(
            "/api/v1/vocab/lookup",
            params={"word": "apel", "category": "invalid_cat"},
        )
    assert response.status_code == 400

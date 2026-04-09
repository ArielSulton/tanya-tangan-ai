"""
Integration tests for /api/v1/vocab/lookup with real DB seed data.

These tests seed Word/WordComparison rows into the real Supabase PostgreSQL DB,
hit the FastAPI endpoint via ASGI transport, assert the response shape, and then
clean up the seeded rows — leaving no test pollution behind.

They will error when the DB is unreachable (connection error
bubbles up as a pytest error, not a test failure — that is acceptable per spec).
"""
import uuid

import pytest
from httpx import ASGITransport, AsyncClient

from app.core.database import async_session_factory
from app.db.models import Word, WordComparison
from app.main import app
from sqlalchemy.ext.asyncio import AsyncSession


# ---------------------------------------------------------------------------
# Test 1 — concrete word lookup (no comparison)
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_lookup_concrete_word_found() -> None:
    """Seed 'kucing/hewan/konkret', hit the lookup endpoint, assert shape."""
    word_id = str(uuid.uuid4())

    try:
        async with async_session_factory() as session:
            # Seed
            word = Word(
                id=word_id,
                text="kucing",
                category="hewan",
                word_type="konkret",
                image_url="https://example.com/kucing.jpg",
            )
            session.add(word)
            await session.commit()

        async with AsyncClient(
            transport=ASGITransport(app=app), base_url="http://test"
        ) as client:
            response = await client.get(
                "/api/v1/vocab/lookup",
                params={"word": "kucing", "category": "hewan"},
            )

        assert response.status_code == 200
        data = response.json()
        assert data["found"] is True
        assert data["word"] is not None
        assert data["word"]["text"] == "kucing"
        assert data["word"]["word_type"] == "konkret"
        assert data["word"]["image_url"] == "https://example.com/kucing.jpg"
        assert data["word"]["comparison"] is None

    finally:
        # Teardown — delete the seeded word
        async with async_session_factory() as session:
            word_obj = await session.get(Word, word_id)
            if word_obj is not None:
                await session.delete(word_obj)
                await session.commit()


# ---------------------------------------------------------------------------
# Test 2 — abstract word lookup (with WordComparison)
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_lookup_abstract_word_with_comparison() -> None:
    """Seed 'sangat/kata_keterangan/abstrak' + a WordComparison, assert shape."""
    word_id = str(uuid.uuid4())
    comparison_id = str(uuid.uuid4())

    try:
        async with async_session_factory() as session:
            # Seed Word
            word = Word(
                id=word_id,
                text="sangat",
                category="kata_keterangan",
                word_type="abstrak",
                # No image_url for abstract words
            )
            session.add(word)
            await session.flush()  # persist word so FK is satisfied

            # Seed linked WordComparison
            comparison = WordComparison(
                id=comparison_id,
                word_id=word_id,
                low_label="sedikit besar",
                high_label="sangat besar",
                reference_word="besar",
                low_image_url="https://example.com/besar-low.jpg",
                high_image_url="https://example.com/besar-high.jpg",
            )
            session.add(comparison)
            await session.commit()

        async with AsyncClient(
            transport=ASGITransport(app=app), base_url="http://test"
        ) as client:
            response = await client.get(
                "/api/v1/vocab/lookup",
                params={"word": "sangat", "category": "kata_keterangan"},
            )

        assert response.status_code == 200
        data = response.json()
        assert data["found"] is True
        assert data["word"] is not None
        assert data["word"]["word_type"] == "abstrak"
        assert data["word"]["image_url"] is None
        assert data["word"]["comparison"] is not None
        assert data["word"]["comparison"]["low_label"] == "sedikit besar"
        assert data["word"]["comparison"]["high_label"] == "sangat besar"
        assert data["word"]["comparison"]["reference_word"] == "besar"

    finally:
        # Teardown — delete comparison first (FK), then word
        async with async_session_factory() as session:
            comp_obj = await session.get(WordComparison, comparison_id)
            if comp_obj is not None:
                await session.delete(comp_obj)
                await session.flush()
            word_obj = await session.get(Word, word_id)
            if word_obj is not None:
                await session.delete(word_obj)
            await session.commit()

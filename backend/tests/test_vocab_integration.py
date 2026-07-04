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
from sqlalchemy import select

from app.core import database
from app.db.models import Word, WordComparison
from app.main import app


# ---------------------------------------------------------------------------
# Test 1 — concrete word lookup (no comparison)
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_lookup_concrete_word_found() -> None:
    """Seed a synthetic concrete word, hit the lookup endpoint, assert shape.

    Uses a word text ('zzz_integration_test_cat') that can never collide with
    real seeded vocabulary (see backend/scripts/seed_vocab.py) — earlier
    versions of this test seeded the real word "kucing", which is also a
    genuine seed_vocab.py entry; a since-fixed pre-cleanup step deleted that
    real row from the dev DB before every run. Do not reuse real vocab words
    (check seed_vocab.py) as test fixtures here.
    """
    word_id = str(uuid.uuid4())
    test_word = "zzz_integration_test_cat"

    # Pre-cleanup: remove any leftovers from a prior run that didn't tear
    # down cleanly. Safe because test_word is synthetic and never real data.
    if not database.async_session_factory:
        await database.init_database()
    async with database.async_session_factory() as session:
        existing_result = await session.execute(
            select(Word).where(Word.text == test_word, Word.category == "hewan")
        )
        for w in existing_result.scalars().all():
            await session.delete(w)  # cascade to WordComparison via ORM
        await session.commit()

    try:
        async with database.async_session_factory() as session:
            # Seed
            word = Word(
                id=word_id,
                text=test_word,
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
                params={"word": test_word, "category": "hewan"},
            )

        assert response.status_code == 200
        data = response.json()
        assert data["found"] is True
        assert data["word"] is not None
        assert data["word"]["text"] == test_word
        assert data["word"]["word_type"] == "konkret"
        assert data["word"]["image_url"] == "https://example.com/kucing.jpg"
        assert data["word"]["comparison"] is None

    finally:
        # Teardown — delete the seeded word
        async with database.async_session_factory() as session:
            word_obj = await session.get(Word, word_id)
            if word_obj is not None:
                await session.delete(word_obj)
                await session.commit()


# ---------------------------------------------------------------------------
# Test 2 — abstract word lookup (with WordComparison)
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_lookup_abstract_word_with_comparison() -> None:
    """Seed a synthetic abstract word + a WordComparison, assert shape.

    Uses a word text ('zzz_integration_test_intensifier') that can never
    collide with real seeded vocabulary — see the note on
    test_lookup_concrete_word_found above for why "sangat" was unsafe here.
    """
    word_id = str(uuid.uuid4())
    comparison_id = str(uuid.uuid4())
    test_word = "zzz_integration_test_intensifier"

    # Pre-cleanup: remove any leftovers from a prior run that didn't tear
    # down cleanly. Safe because test_word is synthetic and never real data.
    if not database.async_session_factory:
        await database.init_database()
    async with database.async_session_factory() as session:
        existing_result = await session.execute(
            select(Word).where(Word.text == test_word, Word.category == "kata_keterangan")
        )
        for w in existing_result.scalars().all():
            await session.delete(w)  # cascade to WordComparison via ORM
        await session.commit()

    try:
        async with database.async_session_factory() as session:
            # Seed Word
            word = Word(
                id=word_id,
                text=test_word,
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
                params={"word": test_word, "category": "kata_keterangan"},
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
        if not database.async_session_factory:
            await database.init_database()
        async with database.async_session_factory() as session:
            comp_obj = await session.get(WordComparison, comparison_id)
            if comp_obj is not None:
                await session.delete(comp_obj)
                await session.flush()
            word_obj = await session.get(Word, word_id)
            if word_obj is not None:
                await session.delete(word_obj)
            await session.commit()


# ---------------------------------------------------------------------------
# Test 3 — cross-category exact match via /vocab/fallback-any
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_fallback_any_finds_word_without_category() -> None:
    """Seed a synthetic word, hit /fallback-any with no category param at all.

    Uses a word text ('zzz_integration_test_peak') that can never collide
    with real seeded vocabulary — "gunung" (the original choice) is also a
    genuine seed_vocab.py entry in the 'alam' category, which would have let
    this test silently match the real row instead of the one it seeds (its
    assertions don't check image_url, so a duplicate match would go
    unnoticed). See the note on test_lookup_concrete_word_found above.
    """
    word_id = str(uuid.uuid4())
    test_word = "zzz_integration_test_peak"

    # Pre-cleanup: remove any leftovers from a prior run that didn't tear
    # down cleanly. Safe because test_word is synthetic and never real data.
    if not database.async_session_factory:
        await database.init_database()
    async with database.async_session_factory() as session:
        existing_result = await session.execute(
            select(Word).where(Word.text == test_word, Word.category == "alam")
        )
        for w in existing_result.scalars().all():
            await session.delete(w)
        await session.commit()

    try:
        async with database.async_session_factory() as session:
            word = Word(
                id=word_id,
                text=test_word,
                category="alam",
                word_type="konkret",
                image_url="https://example.com/gunung.jpg",
            )
            session.add(word)
            await session.commit()

        async with AsyncClient(
            transport=ASGITransport(app=app), base_url="http://test"
        ) as client:
            response = await client.post(
                "/api/v1/vocab/fallback-any",
                json={"gesture_input": test_word},
            )

        assert response.status_code == 200
        data = response.json()
        assert data["found"] is True
        assert data["word"]["text"] == test_word
        assert data["word"]["category"] == "alam"
        assert data["suggested_word"] is None

    finally:
        if not database.async_session_factory:
            await database.init_database()
        async with database.async_session_factory() as session:
            word_obj = await session.get(Word, word_id)
            if word_obj is not None:
                await session.delete(word_obj)
                await session.commit()

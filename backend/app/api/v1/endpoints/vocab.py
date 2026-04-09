"""
Visual vocabulary endpoints for SDLB-B platform
"""
import logging

from app.core.database import get_db_session
from app.models.vocab import (
    CategoryResponse,
    FallbackRequest,
    FallbackResponse,
    LookupResponse,
)
from app.services.vocab_service import (
    CATEGORIES,
    fallback_suggest,
    log_word_request,
    lookup_word,
)
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession

logger = logging.getLogger(__name__)
router = APIRouter()


@router.get("/categories", response_model=CategoryResponse)
async def get_categories():
    """Return the list of available vocabulary categories."""
    return CategoryResponse(categories=CATEGORIES)


@router.get("/lookup", response_model=LookupResponse)
async def vocab_lookup(
    word: str = Query(..., min_length=1, description="Kata yang dicari"),
    category: str = Query(..., min_length=1, description="Kategori kata"),
    db: AsyncSession = Depends(get_db_session),
):
    """Look up a word in the vocabulary database."""
    if category not in CATEGORIES:
        raise HTTPException(
            status_code=400,
            detail=f"Kategori tidak valid. Pilihan: {CATEGORIES}",
        )
    result = await lookup_word(word.lower(), category, db)
    if result:
        return LookupResponse(found=True, word=result)
    return LookupResponse(found=False, word=None)


@router.post("/fallback", response_model=FallbackResponse)
async def vocab_fallback(
    body: FallbackRequest,
    db: AsyncSession = Depends(get_db_session),
):
    """AI fallback: fuzzy-match word and generate child-friendly explanation."""
    result = await fallback_suggest(body.gesture_input, body.category, db)
    await log_word_request(
        body.gesture_input, result.suggested_word, body.session_id, db
    )
    return FallbackResponse(
        suggested_word=result.suggested_word, explanation=result.explanation
    )

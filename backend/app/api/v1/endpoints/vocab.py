"""
Visual vocabulary endpoints for SDLB-B platform
"""
import logging

from app.core.database import get_db_session
from app.db.models import Word, WordRequest
from app.models.vocab import (
    CategoryResponse,
    FallbackRequest,
    FallbackResponse,
    LookupResponse,
    WordListItem,
    WordListResponse,
    WordRequestItem,
    WordRequestListResponse,
)
from app.services.vocab_service import (
    CATEGORIES,
    fallback_suggest,
    log_word_request,
    lookup_word,
)
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import desc, func, select
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
    result = await lookup_word(word.strip().lower(), category, db)
    if result:
        return LookupResponse(found=True, word=result)
    return LookupResponse(found=False, word=None)


@router.post("/fallback", response_model=FallbackResponse)
async def vocab_fallback(
    body: FallbackRequest,
    db: AsyncSession = Depends(get_db_session),
):
    """AI fallback: fuzzy-match word and generate child-friendly explanation."""
    if body.category not in CATEGORIES:
        raise HTTPException(
            status_code=400,
            detail=f"Kategori tidak valid. Pilihan: {CATEGORIES}",
        )
    try:
        result = await fallback_suggest(body.gesture_input, body.category, db)
    except Exception as exc:
        logger.error("fallback_suggest failed for input=%r: %s", body.gesture_input, exc)
        raise HTTPException(
            status_code=503,
            detail="Layanan fallback tidak tersedia sementara.",
        )
    await log_word_request(
        body.gesture_input, result.suggested_word, body.session_id, db
    )
    return result


@router.get("/words", response_model=WordListResponse)
async def list_words(
    category: str = Query(..., min_length=1, description="Category filter"),
    has_image: bool = Query(False, description="Only return words with images"),
    word_type: str | None = Query(None, description="Filter by word type: konkret or abstrak"),
    limit: int = Query(20, ge=1, le=100, description="Max results"),
    db: AsyncSession = Depends(get_db_session),
):
    """List vocabulary words filtered by category, image availability, and word type."""
    if category not in CATEGORIES:
        raise HTTPException(
            status_code=400,
            detail=f"Kategori tidak valid. Pilihan: {CATEGORIES}",
        )

    stmt = select(Word).where(Word.category == category)

    if has_image:
        stmt = stmt.where(Word.image_url.is_not(None))  # noqa: SIM910
    if word_type:
        stmt = stmt.where(Word.word_type == word_type)

    stmt = stmt.order_by(Word.text).limit(limit)
    result = await db.execute(stmt)
    words = result.scalars().all()

    return WordListResponse(
        words=[
            WordListItem(
                id=str(w.id),
                text=w.text,
                category=w.category,
                word_type=w.word_type,
                image_url=w.image_url,
            )
            for w in words
        ]
    )


@router.get("/requests", response_model=WordRequestListResponse)
async def list_word_requests(
    page: int = Query(1, ge=1, description="Page number"),
    limit: int = Query(20, ge=1, le=100, description="Results per page"),
    status: str | None = Query(None, description="Filter by status: pending or resolved"),
    db: AsyncSession = Depends(get_db_session),
):
    """List unmatched gesture inputs logged by students, for admin content curation."""
    base_stmt = select(WordRequest)
    count_stmt = select(func.count()).select_from(WordRequest)

    if status == "pending":
        base_stmt = base_stmt.where(WordRequest.suggested_word.is_(None))  # noqa: SIM910
        count_stmt = count_stmt.where(WordRequest.suggested_word.is_(None))
    elif status == "resolved":
        base_stmt = base_stmt.where(WordRequest.suggested_word.is_not(None))  # noqa: SIM910
        count_stmt = count_stmt.where(WordRequest.suggested_word.is_not(None))

    total_result = await db.execute(count_stmt)
    total = total_result.scalar() or 0

    offset = (page - 1) * limit
    stmt = base_stmt.order_by(desc(WordRequest.created_at)).offset(offset).limit(limit)
    result = await db.execute(stmt)
    requests = result.scalars().all()

    return WordRequestListResponse(
        requests=[
            WordRequestItem(
                id=str(r.id),
                gesture_input=r.gesture_input,
                suggested_word=r.suggested_word,
                session_id=r.session_id,
                created_at=r.created_at.isoformat() if r.created_at else None,
            )
            for r in requests
        ],
        total=total,
        page=page,
        limit=limit,
        total_pages=(total + limit - 1) // limit if limit > 0 else 0,
    )

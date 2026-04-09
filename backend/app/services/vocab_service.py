"""
Vocabulary service: word lookup, AI fallback, and request logging
"""
import logging
import uuid
from typing import Optional

from app.core.config import settings
from app.db.models import Word, WordRequest
from app.models.vocab import FallbackResult, WordComparisonSchema, WordResult
from langchain_groq import ChatGroq
from langchain_core.messages import HumanMessage
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

logger = logging.getLogger(__name__)

CATEGORIES = ["hewan", "benda", "alam", "perasaan", "kata_keterangan"]


async def lookup_word(
    word: str, category: str, db: AsyncSession
) -> Optional[WordResult]:
    """Find a word in the DB by exact text + category match."""
    result = await db.execute(
        select(Word).where(Word.text == word.lower(), Word.category == category)
    )
    db_word = result.scalar_one_or_none()
    if not db_word:
        return None

    comparison = None
    if db_word.word_type == "abstrak" and db_word.comparison:
        comparison = WordComparisonSchema(
            low_image_url=db_word.comparison.low_image_url,
            high_image_url=db_word.comparison.high_image_url,
            low_label=db_word.comparison.low_label,
            high_label=db_word.comparison.high_label,
            reference_word=db_word.comparison.reference_word,
        )

    return WordResult(
        id=db_word.id,
        text=db_word.text,
        category=db_word.category,
        word_type=db_word.word_type,
        image_url=db_word.image_url,
        comparison=comparison,
    )


async def _fuzzy_lookup(
    gesture_input: str, category: str, db: AsyncSession
) -> Optional[str]:
    """Fuzzy search: find nearest word in DB using ILIKE. Wildcards are escaped."""
    escaped = gesture_input.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_")
    result = await db.execute(
        select(Word)
        .where(Word.category == category)
        .where(Word.text.ilike(f"%{escaped}%"))
        .limit(1)
    )
    db_word = result.scalar_one_or_none()
    return db_word.text if db_word else None


async def _generate_explanation(word: str) -> str:
    """Call LLM to generate a child-friendly 1-sentence explanation."""
    try:
        llm = ChatGroq(
            model="llama-3.3-70b-versatile",
            api_key=settings.GROQ_API_KEY,
            max_tokens=80,
        )
        response = await llm.ainvoke(
            [
                HumanMessage(
                    content=(
                        f"Jelaskan kata '{word}' dalam 1 kalimat singkat "
                        f"menggunakan bahasa yang mudah dipahami anak SD. "
                        f"Gunakan Bahasa Indonesia. Jawab langsung tanpa pembuka."
                    )
                )
            ]
        )
        return response.content.strip()
    except Exception as e:
        logger.warning(f"LLM explanation failed for '{word}': {e}")
        return f"Kata '{word}' belum tersedia dalam kamus kami."


async def fallback_suggest(
    gesture_input: str, category: str, db: AsyncSession
) -> FallbackResult:
    """Find nearest word via fuzzy search, then generate LLM explanation."""
    suggested_word = await _fuzzy_lookup(gesture_input, category, db)
    explanation = await _generate_explanation(suggested_word or gesture_input)
    return FallbackResult(suggested_word=suggested_word, explanation=explanation)


async def log_word_request(
    gesture_input: str,
    suggested_word: Optional[str],
    session_id: Optional[str],
    db: AsyncSession,
) -> None:
    """Persist a word_request row for admin content curation."""
    db_request = WordRequest(
        id=str(uuid.uuid4()),
        gesture_input=gesture_input,
        suggested_word=suggested_word,
        session_id=session_id,
    )
    db.add(db_request)
    try:
        await db.commit()
    except Exception as e:
        logger.warning(f"Failed to persist word_request for '{gesture_input}': {e}")
        await db.rollback()

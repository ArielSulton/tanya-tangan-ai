"""
Vocabulary service: word lookup, AI fallback, and multi-layer typo correction

Correction cascade:
  Layer 1: SIBI confusion map (instant, zero-latency)
  Layer 2: DB fuzzy lookup with Levenshtein distance scoring
  Layer 3: LLM correction with vocab category context (ChatGroq)
"""

import logging
import uuid
from typing import List, Optional, Tuple

from langchain_core.messages import HumanMessage
from langchain_groq import ChatGroq
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.config import settings
from app.db.models import Word, WordRequest
from app.models.vocab import FallbackResult, WordComparisonSchema, WordResult
from app.services.typo_correction_service import (
    CORRECTION_THRESHOLDS,
    TypoCorrectionService,
    get_typo_correction_service,
)

logger = logging.getLogger(__name__)

CATEGORIES = ["hewan", "benda", "alam", "perasaan", "kata_keterangan"]


async def lookup_word(
    word: str, category: str, db: AsyncSession
) -> Optional[WordResult]:
    """Find a word by exact text match, preferring the requested category.
    Falls back to cross-category search so words like 'sangat' are found
    even when the user is browsing a different category page.
    """
    # 1. Try exact category match first
    result = await db.execute(
        select(Word)
        .options(selectinload(Word.comparison))
        .where(Word.text == word.strip().lower(), Word.category == category)
    )
    db_word = result.scalar_one_or_none()

    # 2. If not found, search across all categories
    if not db_word:
        result = await db.execute(
            select(Word)
            .options(selectinload(Word.comparison))
            .where(Word.text == word.strip().lower())
            .limit(1)
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

    from app.models.vocab import (
        CertaintyConfigSchema,
        GaugeConfigSchema,
        SliderConfigSchema,
        TimelineConfigSchema,
    )

    slider_config = None
    timeline_config = None
    certainty_config = None
    gauge_config = None

    if db_word.slider_config:
        slider_config = SliderConfigSchema(**db_word.slider_config)
    if db_word.timeline_config:
        timeline_config = TimelineConfigSchema(**db_word.timeline_config)
    if db_word.certainty_config:
        certainty_config = CertaintyConfigSchema(**db_word.certainty_config)
    if db_word.gauge_config:
        gauge_config = GaugeConfigSchema(**db_word.gauge_config)

    return WordResult(
        id=db_word.id,
        text=db_word.text,
        category=db_word.category,
        word_type=db_word.word_type,
        image_url=db_word.image_url,
        comparison=comparison,
        adverb_subcategory=db_word.adverb_subcategory,
        slider_config=slider_config,
        timeline_config=timeline_config,
        certainty_config=certainty_config,
        gauge_config=gauge_config,
    )


async def _fetch_category_vocab(category: str, db: AsyncSession) -> List[str]:
    """Fetch all word texts for a given category from DB.
    Used as candidates for fuzzy matching and LLM context.
    """
    result = await db.execute(select(Word.text).where(Word.category == category))
    rows = result.scalars().all()
    return [r.lower().strip() for r in rows]


async def _fuzzy_lookup(
    gesture_input: str, category: str, db: AsyncSession
) -> Optional[str]:
    """Fuzzy search: find nearest word in DB using ILIKE.
    Wildcards are escaped. Returns the text of the best match or None.
    """
    escaped = (
        gesture_input.strip()
        .lower()
        .replace("\\", "\\\\")
        .replace("%", "\\%")
        .replace("_", "\\_")
    )
    result = await db.execute(
        select(Word)
        .where(Word.category == category)
        .where(Word.text.ilike(f"%{escaped}%"))
        .limit(1)
    )
    db_word = result.scalar_one_or_none()
    return db_word.text if db_word else None


async def _fuzzy_lookup_enhanced(
    gesture_input: str,
    category: str,
    db: AsyncSession,
    correction_service: TypoCorrectionService,
) -> Tuple[Optional[str], float]:
    """Enhanced fuzzy lookup using Jaccard + Levenshtein similarity scoring.

    Fetches all words in the category, computes similarity scores against
    each candidate, and returns the best match with its confidence score.

    Returns (best_match_text, confidence_score) or (None, 0.0).
    """
    candidates = await _fetch_category_vocab(category, db)
    if not candidates:
        return None, 0.0

    input_lower = gesture_input.strip().lower()
    best_match: Optional[str] = None
    best_score = 0.0

    for candidate in candidates:
        # Combined similarity: Jaccard (0.7) + character overlap (0.3)
        similarity = correction_service.compute_similarity_score(input_lower, candidate)
        # Also compute true Levenshtein similarity for short words
        levenshtein_sim = correction_service.compute_levenshtein_similarity(
            input_lower, candidate
        )
        # Weight: prefer Jaccard+overlap for multi-word, Levenshtein for single short words
        if len(input_lower) <= 5 and len(candidate) <= 5:
            combined = 0.4 * similarity + 0.6 * levenshtein_sim
        else:
            combined = 0.7 * similarity + 0.3 * levenshtein_sim

        if combined > best_score:
            best_score = combined
            best_match = candidate

    threshold = CORRECTION_THRESHOLDS["layer2_fuzzy_threshold"]
    if best_score >= threshold and best_match:
        logger.info(
            f'Layer 2 fuzzy match: "{input_lower}" ~ "{best_match}" '
            f"(score={best_score:.3f}, threshold={threshold})"
        )
        return best_match, best_score

    logger.debug(
        f'Layer 2 no match above threshold for "{input_lower}" '
        f'(best="{best_match}", score={best_score:.3f})'
    )
    return None, 0.0


async def _llm_correct(
    gesture_input: str,
    category: str,
    candidates: List[str],
) -> Tuple[Optional[str], str]:
    """Layer 3: LLM correction with DB vocab list as context.

    Unlike tunarasa's RAG-based approach, this uses the category's
    vocabulary list as context — no RAG documents needed.

    Returns (corrected_word_or_None, explanation).
    """
    if not settings.GROQ_API_KEY:
        logger.warning("No GROQ_API_KEY configured, skipping LLM correction")
        return None, f"Kata '{gesture_input}' belum tersedia dalam kamus kami."

    candidate_list = ", ".join(candidates[:50]) if candidates else "(kosong)"

    try:
        llm = ChatGroq(
            model=settings.LLM_MODEL,
            api_key=settings.GROQ_API_KEY,
            temperature=0.1,
            max_tokens=150,
        )

        prompt = (
            f"Koreksi kata dari gerakan isyarat SIBI yang salah dikenali.\n\n"
            f"INPUT: {gesture_input}\n"
            f"KATEGORI: {category}\n"
            f"DAFTAR KATA DALAM KATEGORI: {candidate_list}\n\n"
            f"ATURAN:\n"
            f"1. Cari kata yang paling mirip dari DAFTAR KATA\n"
            f"2. Jika tidak ada yang cocok, kembalikan kata asli\n"
            f"3. Berikan penjelasan singkat 1 kalimat dalam Bahasa Indonesia "
            f"mudah dipahami anak SD\n"
            f"4. FORMAT: KATA|PENJELASAN (pisahkan dengan |)\n"
            f"5. Contoh: kucing|Kucing adalah hewan peliharaan yang suka mengeong\n\n"
            f"JAWABAN:"
        )

        response = await llm.ainvoke([HumanMessage(content=prompt)])
        content = (
            response.content.strip()
            if hasattr(response, "content")
            else str(response).strip()
        )

        # Parse "KATA|PENJELASAN" format
        if "|" in content:
            parts = content.split("|", 1)
            corrected = parts[0].strip()
            explanation = parts[1].strip()
        else:
            corrected = content
            explanation = (
                f"Kata '{gesture_input}' mungkin yang dimaksud adalah '{content}'."
            )

        # Clean markdown artifacts
        corrected = corrected.strip("*").strip("`").strip('"').strip("'")

        logger.info(
            f'Layer 3 LLM correction: "{gesture_input}" -> "{corrected}" '
            f"(candidates={len(candidates)})"
        )
        return corrected, explanation

    except Exception as e:
        logger.error(f'Layer 3 LLM correction failed for "{gesture_input}": {e}')
        return None, f"Kata '{gesture_input}' belum tersedia dalam kamus kami."


async def fallback_suggest(
    gesture_input: str, category: str, db: AsyncSession
) -> FallbackResult:
    """Find nearest word via 3-layer correction cascade, then generate explanation.

    Layer 1: SIBI confusion map (instant)
    Layer 2: DB fuzzy lookup with Levenshtein scoring
    Layer 3: LLM correction with vocab context
    """
    correction_service = get_typo_correction_service()
    input_lower = gesture_input.strip().lower()

    # ── Layer 1: SIBI confusion map (instant, zero-latency) ──
    layer1_result = correction_service.correct_layer1(input_lower)
    if layer1_result.corrected_word:
        logger.info(
            f"Correction cascade resolved at Layer 1: "
            f'"{input_lower}" -> "{layer1_result.corrected_word}"'
        )
        # Try exact lookup of the corrected word
        exact_match = await lookup_word(layer1_result.corrected_word, category, db)
        if exact_match:
            explanation = await _generate_explanation(exact_match.text)
            return FallbackResult(
                suggested_word=exact_match.text,
                explanation=explanation,
                correction_layer="layer1_sibi",
                correction_confidence=layer1_result.confidence,
            )

    # ── Layer 2: DB fuzzy lookup with Levenshtein scoring ──
    fuzzy_match, fuzzy_confidence = await _fuzzy_lookup_enhanced(
        input_lower, category, db, correction_service
    )
    if (
        fuzzy_match
        and fuzzy_confidence >= CORRECTION_THRESHOLDS["layer2_fuzzy_threshold"]
    ):
        logger.info(
            f"Correction cascade resolved at Layer 2: "
            f'"{input_lower}" ~ "{fuzzy_match}" (confidence={fuzzy_confidence:.3f})'
        )
        explanation = await _generate_explanation(fuzzy_match)
        return FallbackResult(
            suggested_word=fuzzy_match,
            explanation=explanation,
            correction_layer="layer2_fuzzy",
            correction_confidence=fuzzy_confidence,
        )

    # Also try Layer 1's corrected word through fuzzy lookup if exact match failed
    if layer1_result.corrected_word:
        fuzzy_match_l1, fuzzy_conf_l1 = await _fuzzy_lookup_enhanced(
            layer1_result.corrected_word, category, db, correction_service
        )
        if (
            fuzzy_match_l1
            and fuzzy_conf_l1 >= CORRECTION_THRESHOLDS["layer2_fuzzy_threshold"]
        ):
            logger.info(
                f"Correction cascade resolved at Layer 1+2: "
                f'"{input_lower}" -> "{layer1_result.corrected_word}" ~ "{fuzzy_match_l1}"'
            )
            explanation = await _generate_explanation(fuzzy_match_l1)
            return FallbackResult(
                suggested_word=fuzzy_match_l1,
                explanation=explanation,
                correction_layer="layer1_sibi+fuzzy",
                correction_confidence=layer1_result.confidence * fuzzy_conf_l1,
            )

    # ── Layer 3: LLM correction with vocab context ──
    candidates = await _fetch_category_vocab(category, db)
    corrected_llm, explanation_llm = await _llm_correct(
        input_lower, category, candidates
    )

    if corrected_llm and corrected_llm.lower() != input_lower:
        # Verify LLM suggestion exists in DB
        llm_match = await lookup_word(corrected_llm.lower(), category, db)
        if llm_match:
            logger.info(
                f"Correction cascade resolved at Layer 3: "
                f'"{input_lower}" -> "{llm_match.text}" (LLM suggested="{corrected_llm}")'
            )
            return FallbackResult(
                suggested_word=llm_match.text,
                explanation=explanation_llm,
                correction_layer="layer3_llm",
                correction_confidence=CORRECTION_THRESHOLDS["layer3_llm_confidence"],
            )

        # LLM suggested a word not in DB — use the suggestion with its explanation
        logger.info(
            f'Correction cascade: LLM suggested "{corrected_llm}" not in DB, '
            f"returning suggestion with explanation"
        )
        return FallbackResult(
            suggested_word=corrected_llm,
            explanation=explanation_llm,
            correction_layer="layer3_llm",
            correction_confidence=CORRECTION_THRESHOLDS["layer3_llm_confidence"] * 0.8,
        )

    # All layers failed, return original input with explanation
    logger.info(f'Correction cascade: all layers failed for "{input_lower}"')
    explanation = await _generate_explanation(input_lower)
    return FallbackResult(
        suggested_word=None,
        explanation=explanation,
        correction_layer=None,
        correction_confidence=0.0,
    )


async def _generate_explanation(word: str) -> str:
    """Call LLM to generate a child-friendly 1-sentence explanation."""
    try:
        llm = ChatGroq(
            model=settings.LLM_MODEL,
            api_key=settings.GROQ_API_KEY,
            max_tokens=80,
            temperature=0.3,
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

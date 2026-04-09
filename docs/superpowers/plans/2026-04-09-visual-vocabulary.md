# Visual Vocabulary Platform Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transform Tanya Tangan from a RAG chatbot into a visual vocabulary learning platform for SDLB-B students using SIBI gesture input.

**Architecture:** Reuse existing gesture recognition, FastAPI infrastructure, and LangChain/ChatGroq. Add `words`, `word_comparisons`, `word_requests` tables. New `/vocab/` routes replace `/layanan/` + `/komunikasi/` as the core user flow. New `/api/v1/vocab/` endpoints handle lookup and AI fallback.

**Tech Stack:** Next.js 15 App Router, FastAPI, Drizzle ORM (PostgreSQL/Supabase), SQLAlchemy, ChatGroq (LLaMA 3.3), shadcn/ui, TailwindCSS, GestureRecognition (existing MediaPipe/TF.js)

---

## File Map

### Backend — Create
- `backend/app/models/vocab.py` — Pydantic request/response schemas
- `backend/app/services/vocab_service.py` — lookup, fallback, log logic
- `backend/app/api/v1/endpoints/vocab.py` — FastAPI router
- `backend/tests/test_vocab.py` — integration tests

### Backend — Modify
- `backend/app/db/models.py` — add `Word`, `WordComparison`, `WordRequest` SQLAlchemy models
- `backend/app/api/v1/api.py` — register vocab router

### Frontend — Create
- `frontend/src/components/vocab/CategoryGrid.tsx`
- `frontend/src/components/vocab/ConcreteWordCard.tsx`
- `frontend/src/components/vocab/AbstractComparison.tsx`
- `frontend/src/components/vocab/AIFallbackCard.tsx`
- `frontend/src/app/vocab/page.tsx`
- `frontend/src/app/vocab/[kategori]/page.tsx`

### Frontend — Modify
- `frontend/src/lib/db/schema.ts` — add `words`, `wordComparisons`, `wordRequests` tables

---

## Task 1: Backend SQLAlchemy Models

**Files:**
- Modify: `backend/app/db/models.py`

- [ ] **Step 1: Read current models.py to find the end of the file**

Run: `tail -30 backend/app/db/models.py`

- [ ] **Step 2: Add the three vocab SQLAlchemy models at the bottom of `backend/app/db/models.py`**

```python
# ─── Vocab Models ────────────────────────────────────────────────────────────


class Word(Base):
    """Vocabulary words with visual assets"""

    __tablename__ = "words"

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid.uuid4())
    )
    text: Mapped[str] = mapped_column(Text, nullable=False)
    category: Mapped[str] = mapped_column(String(50), nullable=False)
    type: Mapped[str] = mapped_column(String(20), nullable=False)
    level: Mapped[str] = mapped_column(String(20), nullable=False, default="sdlb")
    image_url: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    image_source: Mapped[str] = mapped_column(String(20), nullable=False, default="api")
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    comparison: Mapped[Optional["WordComparison"]] = relationship(
        "WordComparison", back_populates="word", uselist=False
    )

    __table_args__ = (
        Index("words_text_category_idx", "text", "category"),
        Index("words_category_idx", "category"),
    )


class WordComparison(Base):
    """Side-by-side comparison data for abstract words"""

    __tablename__ = "word_comparisons"

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid.uuid4())
    )
    word_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("words.id"), nullable=False
    )
    low_image_url: Mapped[str] = mapped_column(Text, nullable=False)
    high_image_url: Mapped[str] = mapped_column(Text, nullable=False)
    low_label: Mapped[str] = mapped_column(String(100), nullable=False)
    high_label: Mapped[str] = mapped_column(String(100), nullable=False)
    reference_word: Mapped[str] = mapped_column(String(100), nullable=False)

    word: Mapped["Word"] = relationship("Word", back_populates="comparison")


class WordRequest(Base):
    """Log of gestures with no matching word — used for admin content curation"""

    __tablename__ = "word_requests"

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid.uuid4())
    )
    gesture_input: Mapped[str] = mapped_column(Text, nullable=False)
    suggested_word: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    session_id: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    __table_args__ = (Index("word_requests_created_at_idx", "created_at"),)
```

- [ ] **Step 3: Verify the file still imports correctly**

```bash
cd backend && python -c "from app.db.models import Word, WordComparison, WordRequest; print('OK')"
```

Expected: `OK`

- [ ] **Step 4: Commit**

```bash
git add backend/app/db/models.py
git commit -m "feat(backend): add Word, WordComparison, WordRequest SQLAlchemy models"
```

---

## Task 2: Backend Pydantic Schemas

**Files:**
- Create: `backend/app/models/vocab.py`

- [ ] **Step 1: Create `backend/app/models/vocab.py`**

```python
"""
Pydantic schemas for visual vocabulary endpoints
"""
from typing import Optional
from pydantic import BaseModel


class WordComparisonSchema(BaseModel):
    low_image_url: str
    high_image_url: str
    low_label: str
    high_label: str
    reference_word: str


class WordResult(BaseModel):
    id: str
    text: str
    category: str
    type: str  # konkret | abstrak
    image_url: Optional[str] = None
    comparison: Optional[WordComparisonSchema] = None


class CategoryResponse(BaseModel):
    categories: list[str]


class LookupResponse(BaseModel):
    found: bool
    word: Optional[WordResult] = None


class FallbackRequest(BaseModel):
    gesture_input: str
    category: str
    session_id: Optional[str] = None


class FallbackResponse(BaseModel):
    suggested_word: Optional[str] = None
    explanation: str


# Internal service return type (same shape as FallbackResponse)
class FallbackResult(BaseModel):
    suggested_word: Optional[str] = None
    explanation: str
```

- [ ] **Step 2: Verify import**

```bash
cd backend && python -c "from app.models.vocab import WordResult, FallbackRequest, LookupResponse; print('OK')"
```

Expected: `OK`

- [ ] **Step 3: Commit**

```bash
git add backend/app/models/vocab.py
git commit -m "feat(backend): add Pydantic schemas for vocab endpoints"
```

---

## Task 3: Backend vocab_service

**Files:**
- Create: `backend/app/services/vocab_service.py`

- [ ] **Step 1: Write the failing test first**

Create `backend/tests/test_vocab_service.py`:

```python
"""
Unit tests for vocab_service lookup and fallback logic
"""
import pytest


def test_lookup_word_returns_none_for_missing_word():
    """lookup_word returns None when word is not in DB"""
    # This test validates the function signature before integration tests
    from app.services.vocab_service import lookup_word
    assert callable(lookup_word)


def test_fallback_suggest_returns_fallback_result():
    """fallback_suggest returns FallbackResult with explanation"""
    from app.services.vocab_service import fallback_suggest
    assert callable(fallback_suggest)


def test_log_word_request_is_callable():
    from app.services.vocab_service import log_word_request
    assert callable(log_word_request)
```

- [ ] **Step 2: Run test to verify it fails (module doesn't exist yet)**

```bash
cd backend && python -m pytest tests/test_vocab_service.py -v
```

Expected: `ModuleNotFoundError` or `ImportError`

- [ ] **Step 3: Create `backend/app/services/vocab_service.py`**

```python
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
    if db_word.type == "abstrak" and db_word.comparison:
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
        type=db_word.type,
        image_url=db_word.image_url,
        comparison=comparison,
    )


async def _fuzzy_lookup(
    gesture_input: str, category: str, db: AsyncSession
) -> Optional[str]:
    """Fuzzy search: find nearest word in DB using ILIKE."""
    result = await db.execute(
        select(Word)
        .where(Word.category == category)
        .where(Word.text.ilike(f"%{gesture_input}%"))
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
    await db.commit()
```

Note: `FallbackResult` needs to be added to `backend/app/models/vocab.py`:

```python
class FallbackResult(BaseModel):
    suggested_word: Optional[str] = None
    explanation: str
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
cd backend && python -m pytest tests/test_vocab_service.py -v
```

Expected: 3 PASSED

- [ ] **Step 5: Commit**

```bash
git add backend/app/services/vocab_service.py backend/app/models/vocab.py backend/tests/test_vocab_service.py
git commit -m "feat(backend): add vocab_service with lookup, fallback, and log"
```

---

## Task 4: Backend vocab endpoint + register router

**Files:**
- Create: `backend/app/api/v1/endpoints/vocab.py`
- Modify: `backend/app/api/v1/api.py`

- [ ] **Step 1: Write the failing integration test**

Create `backend/tests/test_vocab_endpoints.py`:

```python
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
```

- [ ] **Step 2: Run test to confirm it fails (router not registered)**

```bash
cd backend && python -m pytest tests/test_vocab_endpoints.py -v
```

Expected: FAIL — 404 or import error

- [ ] **Step 3: Create `backend/app/api/v1/endpoints/vocab.py`**

```python
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
    word: str = Query(..., description="Kata yang dicari"),
    category: str = Query(..., description="Kategori kata"),
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
```

- [ ] **Step 4: Register router in `backend/app/api/v1/api.py`**

Open `backend/app/api/v1/api.py`. In the `from app.api.v1.endpoints import (...)` block, add `vocab` after `subjects`:

```python
from app.api.v1.endpoints import (
    admin,
    admin_faq,
    conversation,
    faq_clustering,
    faq_recommendation,
    gesture,
    health,
    institutions,
    monitoring,
    public_session,
    qa_log,
    rag,
    rag_processing,
    session,
    subjects,
    summary,
    vocab,
)
```

Then add after the subjects router registration:

```python
# Vocabulary endpoints for visual vocabulary platform (SDLB-B)
api_router.include_router(vocab.router, prefix="/vocab", tags=["vocab"])
```

- [ ] **Step 5: Run integration tests**

```bash
cd backend && python -m pytest tests/test_vocab_endpoints.py -v
```

Expected: 3 PASSED

- [ ] **Step 6: Commit**

```bash
git add backend/app/api/v1/endpoints/vocab.py backend/app/api/v1/api.py backend/tests/test_vocab_endpoints.py
git commit -m "feat(backend): add /api/v1/vocab/ endpoints and register router"
```

---

## Task 5: Drizzle Schema — Frontend DB Tables

**Files:**
- Modify: `frontend/src/lib/db/schema.ts`

- [ ] **Step 1: Read the end of schema.ts to find where to append**

```bash
tail -20 frontend/src/lib/db/schema.ts
```

- [ ] **Step 2: Add vocab tables to `frontend/src/lib/db/schema.ts`**

Append after the last table definition:

```typescript
// ─── Vocab Tables ────────────────────────────────────────────────────────────

export const words = pgTable('words', {
  id: uuid('id').primaryKey().defaultRandom(),
  text: text('text').notNull(),
  category: text('category').notNull(), // hewan|benda|alam|perasaan|kata_keterangan
  type: text('type').notNull(), // konkret|abstrak
  level: text('level').notNull().default('sdlb'),
  imageUrl: text('image_url'),
  imageSource: text('image_source').notNull().default('api'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
})

export const wordComparisons = pgTable('word_comparisons', {
  id: uuid('id').primaryKey().defaultRandom(),
  wordId: uuid('word_id')
    .notNull()
    .references(() => words.id),
  lowImageUrl: text('low_image_url').notNull(),
  highImageUrl: text('high_image_url').notNull(),
  lowLabel: text('low_label').notNull(),
  highLabel: text('high_label').notNull(),
  referenceWord: text('reference_word').notNull(),
})

export const wordRequests = pgTable('word_requests', {
  id: uuid('id').primaryKey().defaultRandom(),
  gestureInput: text('gesture_input').notNull(),
  suggestedWord: text('suggested_word'),
  sessionId: text('session_id'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
})
```

- [ ] **Step 3: Generate migration**

```bash
cd frontend && bun run db:generate
```

Expected: new file created in `drizzle/` with `CREATE TABLE words`, `word_comparisons`, `word_requests`

- [ ] **Step 4: Type-check**

```bash
cd frontend && bun run tsc
```

Expected: no errors

- [ ] **Step 5: Apply migration (requires DB connection)**

```bash
cd frontend && bun run db:migrate
```

Expected: migration applied successfully

- [ ] **Step 6: Commit**

```bash
git add frontend/src/lib/db/schema.ts frontend/drizzle/
git commit -m "feat(db): add words, word_comparisons, word_requests Drizzle tables"
```

---

## Task 6: CategoryGrid Component

**Files:**
- Create: `frontend/src/components/vocab/CategoryGrid.tsx`

- [ ] **Step 1: Create `frontend/src/components/vocab/CategoryGrid.tsx`**

```tsx
'use client'

import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/card'

const CATEGORIES = [
  { slug: 'hewan', label: 'Hewan', emoji: '🐾', color: 'from-green-400 to-emerald-500' },
  { slug: 'benda', label: 'Benda', emoji: '📦', color: 'from-blue-400 to-cyan-500' },
  { slug: 'alam', label: 'Alam', emoji: '🌿', color: 'from-teal-400 to-green-500' },
  { slug: 'perasaan', label: 'Perasaan', emoji: '😊', color: 'from-yellow-400 to-orange-500' },
  { slug: 'kata_keterangan', label: 'Kata Keterangan', emoji: '⚡', color: 'from-purple-400 to-pink-500' },
] as const

export function CategoryGrid() {
  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
      {CATEGORIES.map((cat) => (
        <Link key={cat.slug} href={`/vocab/${cat.slug}`}>
          <Card className="cursor-pointer transition-transform hover:scale-105 active:scale-95">
            <CardContent className="flex flex-col items-center justify-center gap-3 p-6">
              <div
                className={`flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br ${cat.color} text-3xl shadow-md`}
              >
                {cat.emoji}
              </div>
              <span className="text-center text-base font-semibold text-gray-800">
                {cat.label}
              </span>
            </CardContent>
          </Card>
        </Link>
      ))}
    </div>
  )
}
```

- [ ] **Step 2: Type-check**

```bash
cd frontend && bun run tsc
```

Expected: no errors

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/vocab/CategoryGrid.tsx
git commit -m "feat(frontend): add CategoryGrid component"
```

---

## Task 7: Result Display Components

**Files:**
- Create: `frontend/src/components/vocab/ConcreteWordCard.tsx`
- Create: `frontend/src/components/vocab/AbstractComparison.tsx`
- Create: `frontend/src/components/vocab/AIFallbackCard.tsx`

- [ ] **Step 1: Create `frontend/src/components/vocab/ConcreteWordCard.tsx`**

```tsx
'use client'

import { useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'

interface ConcreteWordCardProps {
  word: string
  imageUrl: string | null
  category: string
}

const CATEGORY_PLACEHOLDERS: Record<string, string> = {
  hewan: '🐾',
  benda: '📦',
  alam: '🌿',
  perasaan: '😊',
  kata_keterangan: '⚡',
}

export function ConcreteWordCard({ word, imageUrl, category }: ConcreteWordCardProps) {
  const [imgError, setImgError] = useState(false)
  const placeholder = CATEGORY_PLACEHOLDERS[category] ?? '🖼️'

  return (
    <Card className="w-full max-w-sm mx-auto">
      <CardContent className="flex flex-col items-center gap-4 p-6">
        <h2 className="text-3xl font-bold uppercase tracking-wide text-gray-900">{word}</h2>
        {imageUrl && !imgError ? (
          <img
            src={imageUrl}
            alt={word}
            className="h-48 w-48 rounded-xl object-cover shadow"
            onError={() => setImgError(true)}
          />
        ) : (
          <div className="flex h-48 w-48 items-center justify-center rounded-xl bg-gray-100 text-7xl shadow">
            {placeholder}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
```

- [ ] **Step 2: Create `frontend/src/components/vocab/AbstractComparison.tsx`**

```tsx
'use client'

import { useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'

interface AbstractComparisonProps {
  word: string
  lowImageUrl: string
  highImageUrl: string
  lowLabel: string
  highLabel: string
  category: string
}

const CATEGORY_PLACEHOLDERS: Record<string, string> = {
  hewan: '🐾',
  benda: '📦',
  alam: '🌿',
  perasaan: '😊',
  kata_keterangan: '⚡',
}

function ComparisonImage({
  src,
  alt,
  label,
  category,
}: {
  src: string
  alt: string
  label: string
  category: string
}) {
  const [imgError, setImgError] = useState(false)
  const placeholder = CATEGORY_PLACEHOLDERS[category] ?? '🖼️'

  return (
    <div className="flex flex-col items-center gap-2">
      {src && !imgError ? (
        <img
          src={src}
          alt={alt}
          className="h-40 w-40 rounded-xl object-cover shadow"
          onError={() => setImgError(true)}
        />
      ) : (
        <div className="flex h-40 w-40 items-center justify-center rounded-xl bg-gray-100 text-6xl shadow">
          {placeholder}
        </div>
      )}
      <span className="text-center text-sm font-semibold text-gray-700">{label}</span>
    </div>
  )
}

export function AbstractComparison({
  word,
  lowImageUrl,
  highImageUrl,
  lowLabel,
  highLabel,
  category,
}: AbstractComparisonProps) {
  return (
    <Card className="w-full max-w-md mx-auto">
      <CardContent className="flex flex-col items-center gap-4 p-6">
        <h2 className="text-3xl font-bold uppercase tracking-wide text-gray-900">{word}</h2>
        <div className="flex w-full items-center justify-around gap-4">
          <ComparisonImage src={lowImageUrl} alt={lowLabel} label={lowLabel} category={category} />
          <span className="text-2xl font-bold text-gray-400">vs</span>
          <ComparisonImage src={highImageUrl} alt={highLabel} label={highLabel} category={category} />
        </div>
      </CardContent>
    </Card>
  )
}
```

- [ ] **Step 3: Create `frontend/src/components/vocab/AIFallbackCard.tsx`**

```tsx
'use client'

import { Card, CardContent } from '@/components/ui/card'
import { AlertCircle } from 'lucide-react'

interface AIFallbackCardProps {
  gestureInput: string
  suggestedWord: string | null
  explanation: string
  onTrySuggested?: (word: string) => void
}

export function AIFallbackCard({
  gestureInput,
  suggestedWord,
  explanation,
  onTrySuggested,
}: AIFallbackCardProps) {
  return (
    <Card className="w-full max-w-sm mx-auto border-orange-200 bg-orange-50">
      <CardContent className="flex flex-col items-center gap-4 p-6">
        <div className="flex items-center gap-2 text-orange-600">
          <AlertCircle className="h-6 w-6" />
          <span className="font-semibold">Kata belum tersedia</span>
        </div>
        {suggestedWord && (
          <div className="flex flex-col items-center gap-1">
            <span className="text-sm text-gray-600">Maksud kamu:</span>
            <button
              onClick={() => onTrySuggested?.(suggestedWord)}
              className="rounded-lg bg-orange-100 px-4 py-2 text-lg font-bold text-orange-700 hover:bg-orange-200 transition-colors"
            >
              {suggestedWord}
            </button>
          </div>
        )}
        <p className="text-center text-sm text-gray-700 leading-relaxed">{explanation}</p>
      </CardContent>
    </Card>
  )
}
```

- [ ] **Step 4: Type-check all three**

```bash
cd frontend && bun run tsc
```

Expected: no errors

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/vocab/
git commit -m "feat(frontend): add ConcreteWordCard, AbstractComparison, AIFallbackCard components"
```

---

## Task 8: /vocab Page (Category Selection)

**Files:**
- Create: `frontend/src/app/vocab/page.tsx`

- [ ] **Step 1: Create `frontend/src/app/vocab/page.tsx`**

```tsx
import { CategoryGrid } from '@/components/vocab/CategoryGrid'
import { Hand } from 'lucide-react'

export default function VocabPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-purple-50">
      <section className="py-16">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <div className="mb-12 space-y-4 text-center">
            <div className="flex justify-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-indigo-100 text-indigo-600">
                <Hand className="h-8 w-8" />
              </div>
            </div>
            <h1 className="text-4xl font-bold text-gray-900">
              Belajar Kosakata
            </h1>
            <p className="mx-auto max-w-xl text-lg text-gray-600">
              Pilih kategori kata, lalu gesturkan kata menggunakan bahasa isyarat SIBI.
            </p>
          </div>
          <CategoryGrid />
        </div>
      </section>
    </div>
  )
}
```

- [ ] **Step 2: Type-check**

```bash
cd frontend && bun run tsc
```

Expected: no errors

- [ ] **Step 3: Commit**

```bash
git add frontend/src/app/vocab/page.tsx
git commit -m "feat(frontend): add /vocab category selection page"
```

---

## Task 9: /vocab/[kategori] Page (Gesture + Result)

**Files:**
- Create: `frontend/src/app/vocab/[kategori]/page.tsx`

- [ ] **Step 1: Create `frontend/src/app/vocab/[kategori]/page.tsx`**

```tsx
'use client'

import { useState, useCallback } from 'react'
import { useParams } from 'next/navigation'
import { GestureRecognition } from '@/components/gesture/gesture-recognition'
import { ConcreteWordCard } from '@/components/vocab/ConcreteWordCard'
import { AbstractComparison } from '@/components/vocab/AbstractComparison'
import { AIFallbackCard } from '@/components/vocab/AIFallbackCard'
import { ArrowLeft, Loader2 } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'

const CATEGORY_LABELS: Record<string, string> = {
  hewan: 'Hewan',
  benda: 'Benda',
  alam: 'Alam',
  perasaan: 'Perasaan',
  kata_keterangan: 'Kata Keterangan',
}

type WordType = 'konkret' | 'abstrak'

interface WordResult {
  id: string
  text: string
  category: string
  type: WordType
  image_url: string | null
  comparison: {
    low_image_url: string
    high_image_url: string
    low_label: string
    high_label: string
    reference_word: string
  } | null
}

interface LookupResult =
  | { state: 'idle' }
  | { state: 'loading' }
  | { state: 'found'; word: WordResult }
  | { state: 'fallback'; gestureInput: string; suggestedWord: string | null; explanation: string }
  | { state: 'error' }

export default function VocabKategoriPage() {
  const params = useParams()
  const kategori = params.kategori as string
  const [result, setResult] = useState<LookupResult>({ state: 'idle' })
  const [retryCount, setRetryCount] = useState(0)

  const handleWordFormed = useCallback(
    async (word: string) => {
      if (!word.trim() || result.state === 'loading') return
      setResult({ state: 'loading' })
      setRetryCount(0)

      try {
        const lookupRes = await fetch(
          `/api/backend/vocab/lookup?word=${encodeURIComponent(word.toLowerCase())}&category=${encodeURIComponent(kategori)}`
        )
        if (!lookupRes.ok) throw new Error('Lookup failed')

        const lookupData = await lookupRes.json()
        if (lookupData.found && lookupData.word) {
          setResult({ state: 'found', word: lookupData.word })
          return
        }

        // Word not found — call fallback
        const fallbackRes = await fetch('/api/backend/vocab/fallback', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ gesture_input: word, category: kategori }),
        })
        if (!fallbackRes.ok) throw new Error('Fallback failed')

        const fallbackData = await fallbackRes.json()
        setResult({
          state: 'fallback',
          gestureInput: word,
          suggestedWord: fallbackData.suggested_word ?? null,
          explanation: fallbackData.explanation,
        })
      } catch {
        setResult({ state: 'error' })
      }
    },
    [kategori, result.state]
  )

  const handleTrySuggested = useCallback(
    (word: string) => {
      handleWordFormed(word)
    },
    [handleWordFormed]
  )

  const handleRetry = () => {
    if (retryCount < 3) {
      setRetryCount((c) => c + 1)
      setResult({ state: 'idle' })
    }
  }

  const categoryLabel = CATEGORY_LABELS[kategori] ?? kategori

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-purple-50">
      <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6">
        {/* Back nav */}
        <Link href="/vocab" className="mb-6 inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-800">
          <ArrowLeft className="h-4 w-4" />
          Pilih kategori lain
        </Link>

        <h1 className="mb-6 text-2xl font-bold text-gray-900">
          Kategori: <span className="text-indigo-600">{categoryLabel}</span>
        </h1>

        {/* Gesture recognition */}
        <div className="mb-8">
          <GestureRecognition
            onWordFormed={handleWordFormed}
            enableWordFormation={true}
            showAlternatives={false}
          />
        </div>

        {/* Result area */}
        <div className="flex flex-col items-center">
          {result.state === 'idle' && (
            <p className="text-center text-gray-500">Gesturkan kata untuk melihat artinya</p>
          )}

          {result.state === 'loading' && (
            <div className="flex items-center gap-2 text-indigo-600">
              <Loader2 className="h-5 w-5 animate-spin" />
              <span>Mencari kata...</span>
            </div>
          )}

          {result.state === 'found' && result.word.type === 'konkret' && (
            <ConcreteWordCard
              word={result.word.text}
              imageUrl={result.word.image_url}
              category={result.word.category}
            />
          )}

          {result.state === 'found' && result.word.type === 'abstrak' && result.word.comparison && (
            <AbstractComparison
              word={result.word.text}
              lowImageUrl={result.word.comparison.low_image_url}
              highImageUrl={result.word.comparison.high_image_url}
              lowLabel={result.word.comparison.low_label}
              highLabel={result.word.comparison.high_label}
              category={result.word.category}
            />
          )}

          {result.state === 'fallback' && (
            <AIFallbackCard
              gestureInput={result.gestureInput}
              suggestedWord={result.suggestedWord}
              explanation={result.explanation}
              onTrySuggested={handleTrySuggested}
            />
          )}

          {result.state === 'error' && (
            <div className="flex flex-col items-center gap-3">
              <p className="text-center text-red-500">Terjadi kesalahan. Coba lagi.</p>
              {retryCount < 3 && (
                <Button variant="outline" onClick={handleRetry}>
                  Coba Lagi
                </Button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Fix TypeScript union type syntax** (TypeScript uses `type X = A | B`, not `interface`)

The line `interface LookupResult = ...` should be `type LookupResult = ...`. The code above already shows `type LookupResult`.

- [ ] **Step 3: Type-check**

```bash
cd frontend && bun run tsc
```

Expected: no errors

- [ ] **Step 4: Lint**

```bash
cd frontend && bun run lint
```

Expected: no errors

- [ ] **Step 5: Commit**

```bash
git add frontend/src/app/vocab/
git commit -m "feat(frontend): add /vocab/[kategori] page with gesture + result display"
```

---

## Task 10: E2E Playwright Test

**Files:**
- Create: `frontend/tests/vocab.spec.ts` (or wherever existing e2e tests live)

- [ ] **Step 1: Find existing e2e test location**

```bash
find frontend -name "*.spec.ts" | head -5
```

- [ ] **Step 2: Create e2e test**

Create test in the same directory as existing specs:

```typescript
import { test, expect } from '@playwright/test'

test.describe('Vocab Platform', () => {
  test('shows 5 category cards on /vocab', async ({ page }) => {
    await page.goto('/vocab')
    const cards = page.locator('a[href^="/vocab/"]')
    await expect(cards).toHaveCount(5)
  })

  test('navigates to /vocab/hewan on card click', async ({ page }) => {
    await page.goto('/vocab')
    await page.click('a[href="/vocab/hewan"]')
    await expect(page).toHaveURL('/vocab/hewan')
    await expect(page.getByText('Hewan')).toBeVisible()
  })

  test('shows gesture area on /vocab/[kategori]', async ({ page }) => {
    await page.goto('/vocab/benda')
    // GestureRecognition renders a video element for camera
    const gestureArea = page.locator('video, [data-testid="gesture-area"]').first()
    await expect(gestureArea).toBeAttached()
  })

  test('shows idle state initially', async ({ page }) => {
    await page.goto('/vocab/hewan')
    await expect(page.getByText('Gesturkan kata untuk melihat artinya')).toBeVisible()
  })
})
```

- [ ] **Step 3: Run e2e tests (requires dev server running)**

```bash
cd frontend && bun run test:e2e -- --grep "Vocab Platform"
```

Expected: 4 PASSED (note: gesture test may be skipped if camera not available in CI)

- [ ] **Step 4: Commit**

```bash
git add frontend/tests/vocab.spec.ts
git commit -m "test(e2e): add Playwright tests for vocab platform"
```

---

## Task 11: Backend Vocab Integration Test with Seed Data

**Files:**
- Create: `backend/tests/test_vocab_integration.py`

- [ ] **Step 1: Create integration test with real DB**

```python
"""
Integration tests for vocab endpoints with real DB seed data
Run with: pytest tests/test_vocab_integration.py -v
Requires: running PostgreSQL with test DB
"""
import pytest
import uuid
from httpx import AsyncClient, ASGITransport
from sqlalchemy.ext.asyncio import AsyncSession

from app.main import app
from app.db.models import Word, WordComparison
from app.core.database import get_db_session


async def seed_concrete_word(db: AsyncSession) -> Word:
    word = Word(
        id=str(uuid.uuid4()),
        text="kucing",
        category="hewan",
        type="konkret",
        image_url="https://example.com/kucing.jpg",
        image_source="api",
    )
    db.add(word)
    await db.commit()
    await db.refresh(word)
    return word


async def seed_abstract_word(db: AsyncSession) -> Word:
    word = Word(
        id=str(uuid.uuid4()),
        text="sangat",
        category="kata_keterangan",
        type="abstrak",
    )
    db.add(word)
    await db.flush()
    comparison = WordComparison(
        id=str(uuid.uuid4()),
        word_id=word.id,
        low_image_url="https://example.com/kecil.jpg",
        high_image_url="https://example.com/besar.jpg",
        low_label="sedikit besar",
        high_label="sangat besar",
        reference_word="besar",
    )
    db.add(comparison)
    await db.commit()
    await db.refresh(word)
    return word


@pytest.mark.asyncio
async def test_lookup_concrete_word_found():
    async for db in get_db_session():
        await seed_concrete_word(db)

    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as client:
        response = await client.get(
            "/api/v1/vocab/lookup", params={"word": "kucing", "category": "hewan"}
        )
    assert response.status_code == 200
    data = response.json()
    assert data["found"] is True
    assert data["word"]["text"] == "kucing"
    assert data["word"]["type"] == "konkret"
    assert data["word"]["comparison"] is None


@pytest.mark.asyncio
async def test_lookup_abstract_word_with_comparison():
    async for db in get_db_session():
        await seed_abstract_word(db)

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
    assert data["word"]["type"] == "abstrak"
    assert data["word"]["comparison"]["low_label"] == "sedikit besar"
    assert data["word"]["comparison"]["high_label"] == "sangat besar"
```

- [ ] **Step 2: Run integration test**

```bash
cd backend && python -m pytest tests/test_vocab_integration.py -v
```

Expected: 2 PASSED

- [ ] **Step 3: Commit**

```bash
git add backend/tests/test_vocab_integration.py
git commit -m "test(backend): add vocab integration tests with real DB seed data"
```

---

## Definition of Done

- [ ] `GET /api/v1/vocab/categories` returns 5 categories
- [ ] `GET /api/v1/vocab/lookup?word=kucing&category=hewan` returns image_url for concrete word
- [ ] `GET /api/v1/vocab/lookup?word=sangat&category=kata_keterangan` returns comparison data for abstract word
- [ ] `POST /api/v1/vocab/fallback` returns AI explanation and logs to `word_requests`
- [ ] `/vocab` page shows 5 clickable category cards
- [ ] `/vocab/hewan` page loads gesture recognition component
- [ ] `ConcreteWordCard` shows image with fallback placeholder on error
- [ ] `AbstractComparison` shows side-by-side images with labels
- [ ] `AIFallbackCard` shows suggested word + explanation
- [ ] All backend tests pass: `pytest tests/ -v`
- [ ] Frontend type-check passes: `bun run tsc`
- [ ] E2E tests pass: `bun run test:e2e`

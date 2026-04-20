# Adverb Context-Dependent UI Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement context-dependent UI treatment for adverb vocabulary (kata keterangan) where each subcategory gets a different interactive component instead of the current one-size-fits-all static card.

**Architecture:** Add `adverb_subcategory` column to `words` table with JSONB config columns for component parameters. Backend returns subcategory + config in vocab API responses. Frontend dispatches to specialized interactive components (IntensitySlider, TimelineAnimation, CertaintyDial, SensationGauge) based on subcategory. AbstractComparison remains as fallback.

**Tech Stack:** Next.js 15, React 19, Drizzle ORM (PostgreSQL), SQLAlchemy async, Pydantic v2, shadcn/ui (Slider), Tailwind CSS v4, TypeScript strict, Bun

---

## File Structure

### New Files (Frontend)
- `frontend/src/components/vocab/IntensitySlider.tsx` — Interactive slider for degree adverbs
- `frontend/src/components/vocab/TimelineAnimation.tsx` — Timeline for temporal adverbs
- `frontend/src/components/vocab/CertaintyDial.tsx` — Radial dial for modality adverbs
- `frontend/src/components/vocab/SensationGauge.tsx` — Gauge/thermometer for intensity adverbs
- `frontend/src/lib/adverb-types.ts` — Type definitions for adverb subcategories and configs

### New Files (Frontend Tests)
- `frontend/src/components/vocab/__tests__/IntensitySlider.test.tsx`
- `frontend/src/components/vocab/__tests__/TimelineAnimation.test.tsx`
- `frontend/src/components/vocab/__tests__/CertaintyDial.test.tsx`
- `frontend/src/components/vocab/__tests__/SensationGauge.test.tsx`

### Modified Files
- `frontend/src/lib/db/schema.ts` — Add `adverb_subcategory`, `slider_config`, `timeline_config`, `certainty_config`, `gauge_config` columns to `words` table
- `backend/app/models/vocab.py` — Add `adverb_subcategory` and config fields to `WordResult`
- `backend/app/db/models.py` — Add `adverb_subcategory` and config columns to `Word` model
- `backend/app/services/vocab_service.py` — Map new columns to Pydantic response
- `frontend/src/app/vocab/[kategori]/page.tsx` — Add dispatch logic based on `adverb_subcategory`, update `WordResult` type
- `frontend/src/components/vocab/AbstractComparison.tsx` — No changes (kept as fallback)

### New Files (Backend)
- None — modifications only to existing files

---

## JSONB Config Schema Definitions

Each adverb subcategory has a specific JSONB config shape stored in the `words` table:

```typescript
// Degree adverbs (sangat, agak, terlalu, paling)
interface SliderConfig {
  default_position: number  // 0.0-1.0, where the slider starts (e.g. 0.3 for "agak", 0.9 for "sangat")
  low_label: string         // e.g. "sedikit" or label from word_comparisons
  high_label: string         // e.g. "sangat" or label from word_comparisons
  reference_word: string     // the word being modified, e.g. "besar"
  accent_color: string      // CSS color for the active range, e.g. "#10b981" (emerald)
  emoji_low: string          // emoji for low intensity, e.g. "🌱"
  emoji_high: string         // emoji for high intensity, e.g. "🌳"
}

// Temporal adverbs (sering, jarang, pernah, baru saja)
interface TimelineConfig {
  frequency: number          // 0.0-1.0, how often (1.0 = always, 0.1 = rarely)
  period_label: string       // e.g. "seminggu", "sehari"
  occurrence_count: number   // how many occurrences per period (e.g. 5 for "sering")
  total_slots: number        // total slots in period (e.g. 7 for "seminggu")
  accent_color: string       // CSS color, e.g. "#3b82f6" (blue)
  icon_filled: string        // emoji/icon for filled slots, e.g. "🔵"
  icon_empty: string         // emoji/icon for empty slots, e.g. "⚪"
  description: string        // child-friendly explanation, e.g. "Sering artinya hampir setiap hari!"
}

// Modality adverbs (mungkin, pasti, kira-kira)
interface CertaintyConfig {
  certainty_level: number    // 0.0-1.0 (0.3 = mungkin, 0.7 = kira-kira, 1.0 = pasti)
  low_label: string           // e.g. "tidak yakin"
  high_label: string          // e.g. "sangat yakin"
  accent_color: string        // CSS color, e.g. "#f59e0b" (amber)
  emoji_uncertain: string     // e.g. "🤔"
  emoji_certain: string       // e.g. "✅"
  description: string         // child-friendly explanation
}

// Intensity adverbs (sangat pedas, agak nyeri)
interface GaugeConfig {
  intensity_level: number     // 0.0-1.0
  sensation_word: string      // e.g. "pedas", "nyeri"
  low_label: string            // e.g. "sedikit pedas"
  high_label: string           // e.g. "sangat pedas"
  accent_color: string         // CSS color, e.g. "#ef4444" (red)
  emoji_low: string            // e.g. "😐"
  emoji_high: string           // e.g. "🥵"
  unit_symbol: string          // e.g. "°", "💡" — decoration for the gauge
}
```

---

## Task 1: Backend DB Schema — Add Adverb Subcategory Columns

**Files:**
- Modify: `frontend/src/lib/db/schema.ts:541-558` (words table)
- Modify: `backend/app/db/models.py:595-621` (Word model)

- [ ] **Step 1: Add `adverb_subcategory` and JSONB config columns to Drizzle `words` table**

In `frontend/src/lib/db/schema.ts`, modify the `words` table definition (lines 541-558). Add after `imageSource` and before `createdAt`:

```typescript
export const words = pgTable(
  'words',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    text: text('text').notNull(),
    category: text('category').notNull(), // hewan|benda|alam|perasaan|kata_keterangan
    type: text('type').notNull(), // konkret|abstrak
    level: text('level').notNull().default('sdlb'),
    imageUrl: text('image_url'),
    imageSource: text('image_source').notNull().default('api'),
    // Adverb sub-treatment columns (nullable — only set for kata_keterangan words)
    adverbSubcategory: text('adverb_subcategory'), // degree|temporal|modality|intensity — null for non-adverbs
    sliderConfig: jsonb('slider_config').$type<SliderConfig | null>(),
    timelineConfig: jsonb('timeline_config').$type<TimelineConfig | null>(),
    certaintyConfig: jsonb('certainty_config').$type<CertaintyConfig | null>(),
    gaugeConfig: jsonb('gauge_config').$type<GaugeConfig | null>(),
    createdAt: timestamp('created_at').notNull().defaultNow(),
  },
  (table) => [
    index('words_category_idx').on(table.category),
    index('words_type_idx').on(table.type),
    index('words_level_idx').on(table.level),
    index('words_adverb_subcategory_idx').on(table.adverbSubcategory),
  ],
).enableRLS()
```

Also add the TypeScript type imports at the top of `schema.ts` (after the existing imports). These types will be defined in the next task. For now, use inline type annotations:

```typescript
// Add after imageSource, before createdAt:
adverbSubcategory: text('adverb_subcategory'),
sliderConfig: jsonb('slider_config').$type<{
  default_position: number
  low_label: string
  high_label: string
  reference_word: string
  accent_color: string
  emoji_low: string
  emoji_high: string
} | null>(),
timelineConfig: jsonb('timeline_config').$type<{
  frequency: number
  period_label: string
  occurrence_count: number
  total_slots: number
  accent_color: string
  icon_filled: string
  icon_empty: string
  description: string
} | null>(),
certaintyConfig: jsonb('certainty_config').$type<{
  certainty_level: number
  low_label: string
  high_label: string
  accent_color: string
  emoji_uncertain: string
  emoji_certain: string
  description: string
} | null>(),
gaugeConfig: jsonb('gauge_config').$type<{
  intensity_level: number
  sensation_word: string
  low_label: string
  high_label: string
  accent_color: string
  emoji_low: string
  emoji_high: string
  unit_symbol: string
} | null>(),
```

- [ ] **Step 2: Add `adverb_subcategory` and JSONB columns to SQLAlchemy `Word` model**

In `backend/app/db/models.py`, modify the `Word` class (lines 595-621). Add after `image_source` and before `created_at`:

```python
class Word(Base):
    """Vocabulary words with visual assets"""

    __tablename__ = "words"

    id: Mapped[str] = mapped_column(
        PG_UUID(as_uuid=False), primary_key=True, default=lambda: str(uuid.uuid4())
    )
    text: Mapped[str] = mapped_column(Text, nullable=False)
    category: Mapped[str] = mapped_column(String(50), nullable=False)
    word_type: Mapped[str] = mapped_column("type", String(20), nullable=False)
    level: Mapped[str] = mapped_column(String(20), nullable=False, default="sdlb")
    image_url: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    image_source: Mapped[str] = mapped_column(String(20), nullable=False, default="api")
    # Adverb sub-treatment columns (nullable — only set for kata_keterangan words)
    adverb_subcategory: Mapped[Optional[str]] = mapped_column(
        String(20), nullable=True
    )  # degree|temporal|modality|intensity
    slider_config: Mapped[Optional[Dict]] = mapped_column(JSONB, nullable=True)
    timeline_config: Mapped[Optional[Dict]] = mapped_column(JSONB, nullable=True)
    certainty_config: Mapped[Optional[Dict]] = mapped_column(JSONB, nullable=True)
    gauge_config: Mapped[Optional[Dict]] = mapped_column(JSONB, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    comparison: Mapped[Optional["WordComparison"]] = relationship(
        "WordComparison", back_populates="word", uselist=False, cascade="all, delete-orphan"
    )

    __table_args__ = (
        Index("words_text_category_idx", "text", "category"),
        Index("words_category_idx", "category"),
        Index("words_adverb_subcategory_idx", "adverb_subcategory"),
    )
```

- [ ] **Step 3: Generate and review Drizzle migration**

Run: `cd frontend && bun run db:generate`
Expected: A new migration file in `frontend/drizzle/` adding `adverb_subcategory`, `slider_config`, `timeline_config`, `certainty_config`, `gauge_config` columns to the `words` table, plus the new index.

Review the generated SQL to confirm:
1. All 5 new columns are nullable
2. `adverb_subcategory` is `text` type
3. `slider_config`, `timeline_config`, `certainty_config`, `gauge_config` are `jsonb` type
4. The index `words_adverb_subcategory_idx` is created
5. No data loss for existing rows (nullable columns = safe)

DO NOT apply the migration yet — that's a separate step after verification.

- [ ] **Step 4: Commit schema changes**

```bash
git add frontend/src/lib/db/schema.ts backend/app/db/models.py frontend/drizzle/
git commit -m "feat(vocab): add adverb_subcategory and JSONB config columns to words table"
```

---

## Task 2: Backend API — Return Adverb Subcategory in Vocab Responses

**Files:**
- Create: `frontend/src/lib/adverb-types.ts`
- Modify: `backend/app/models/vocab.py`
- Modify: `backend/app/services/vocab_service.py`

- [ ] **Step 1: Create frontend type definitions for adverb subcategories**

Create `frontend/src/lib/adverb-types.ts`:

```typescript
/**
 * Adverb subcategory types and config interfaces.
 * Each subcategory has a unique interactive UI component.
 * These types mirror the JSONB config columns in the `words` table.
 */

export type AdverbSubcategory = 'degree' | 'temporal' | 'modality' | 'intensity'

/** Degree adverbs (sangat, agak, terlalu, paling) — IntensitySlider component */
export interface SliderConfig {
  default_position: number   // 0.0-1.0, where the slider starts
  low_label: string          // e.g. "sedikit"
  high_label: string          // e.g. "sangat"
  reference_word: string     // the word being modified, e.g. "besar"
  accent_color: string       // CSS color for the active range
  emoji_low: string          // emoji for low intensity, e.g. "🌱"
  emoji_high: string         // emoji for high intensity, e.g. "🌳"
}

/** Temporal adverbs (sering, jarang, pernah, baru saja) — TimelineAnimation component */
export interface TimelineConfig {
  frequency: number          // 0.0-1.0, how often
  period_label: string       // e.g. "seminggu", "sehari"
  occurrence_count: number    // how many occurrences per period
  total_slots: number         // total slots in period (e.g. 7 for "seminggu")
  accent_color: string        // CSS color
  icon_filled: string         // emoji/icon for filled slots
  icon_empty: string          // emoji/icon for empty slots
  description: string        // child-friendly explanation
}

/** Modality adverbs (mungkin, pasti, kira-kira) — CertaintyDial component */
export interface CertaintyConfig {
  certainty_level: number     // 0.0-1.0
  low_label: string           // e.g. "tidak yakin"
  high_label: string          // e.g. "sangat yakin"
  accent_color: string        // CSS color
  emoji_uncertain: string     // e.g. "🤔"
  emoji_certain: string       // e.g. "✅"
  description: string         // child-friendly explanation
}

/** Intensity adverbs (sangat pedas, agak nyeri) — SensationGauge component */
export interface GaugeConfig {
  intensity_level: number     // 0.0-1.0
  sensation_word: string      // e.g. "pedas", "nyeri"
  low_label: string            // e.g. "sedikit pedas"
  high_label: string           // e.g. "sangat pedas"
  accent_color: string         // CSS color
  emoji_low: string            // e.g. "😐"
  emoji_high: string           // e.g. "🥵"
  unit_symbol: string          // e.g. "°", "💡"
}

/**
 * Maps adverb_subcategory to the interactive component type.
 * Returns null for non-adverb words (konkret words and non-kata_keterangan abstrak words).
 */
export function getInteractionComponent(
  category: string,
  adverbSubcategory: AdverbSubcategory | null,
): 'intensity-slider' | 'timeline-animation' | 'certainty-dial' | 'sensation-gauge' | null {
  if (category !== 'kata_keterangan' || !adverbSubcategory) return null
  return (
    {
      degree: 'intensity-slider',
      temporal: 'timeline-animation',
      modality: 'certainty-dial',
      intensity: 'sensation-gauge',
    } as const
  )[adverbSubcategory] ?? null
}
```

- [ ] **Step 2: Update Pydantic schemas in `backend/app/models/vocab.py`**

Replace the entire file with:

```python
"""
Pydantic schemas for visual vocabulary endpoints
"""
from typing import Optional
from pydantic import BaseModel, ConfigDict, Field


class SliderConfigSchema(BaseModel):
    """Config for degree adverbs (sangat, agak, terlalu, paling)"""
    default_position: float = Field(ge=0, le=1, description="Initial slider position 0.0-1.0")
    low_label: str
    high_label: str
    reference_word: str
    accent_color: str = Field(default="#10b981", description="CSS color for active range")
    emoji_low: str = Field(default="🌱")
    emoji_high: str = Field(default="🌳")


class TimelineConfigSchema(BaseModel):
    """Config for temporal adverbs (sering, jarang, pernah, baru saja)"""
    frequency: float = Field(ge=0, le=1, description="How often 0.0-1.0")
    period_label: str
    occurrence_count: int = Field(ge=0)
    total_slots: int = Field(ge=1)
    accent_color: str = Field(default="#3b82f6")
    icon_filled: str = Field(default="🔵")
    icon_empty: str = Field(default="⚪")
    description: str


class CertaintyConfigSchema(BaseModel):
    """Config for modality adverbs (mungkin, pasti, kira-kira)"""
    certainty_level: float = Field(ge=0, le=1, description="Certainty 0.0-1.0")
    low_label: str
    high_label: str
    accent_color: str = Field(default="#f59e0b")
    emoji_uncertain: str = Field(default="🤔")
    emoji_certain: str = Field(default="✅")
    description: str


class GaugeConfigSchema(BaseModel):
    """Config for intensity adverbs (sangat pedas, agak nyeri)"""
    intensity_level: float = Field(ge=0, le=1)
    sensation_word: str
    low_label: str
    high_label: str
    accent_color: str = Field(default="#ef4444")
    emoji_low: str = Field(default="😐")
    emoji_high: str = Field(default="🥵")
    unit_symbol: str = Field(default="°")


class WordComparisonSchema(BaseModel):
    low_image_url: str
    high_image_url: str
    low_label: str
    high_label: str
    reference_word: str


class WordResult(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    text: str
    category: str
    word_type: str = Field(
        description="Word type: 'konkret' (concrete) or 'abstrak' (abstract). Maps to DB column 'type'."
    )
    image_url: Optional[str] = None
    comparison: Optional[WordComparisonSchema] = None
    # Adverb sub-treatment fields (null for non-adverb words)
    adverb_subcategory: Optional[str] = Field(
        default=None,
        description="Adverb subcategory: 'degree', 'temporal', 'modality', or 'intensity'. Null for non-adverbs.",
    )
    slider_config: Optional[SliderConfigSchema] = None
    timeline_config: Optional[TimelineConfigSchema] = None
    certainty_config: Optional[CertaintyConfigSchema] = None
    gauge_config: Optional[GaugeConfigSchema] = None


class CategoryResponse(BaseModel):
    categories: list[str]


class LookupResponse(BaseModel):
    found: bool
    word: Optional[WordResult] = None


class FallbackRequest(BaseModel):
    gesture_input: str = Field(min_length=1, max_length=100)
    category: str = Field(min_length=1)
    session_id: Optional[str] = None


class FallbackResponse(BaseModel):
    suggested_word: Optional[str] = None
    explanation: str


# Internal service return type — same contract as FallbackResponse
FallbackResult = FallbackResponse
```

- [ ] **Step 3: Update `vocab_service.py` to map new columns**

In `backend/app/services/vocab_service.py`, update the `lookup_word` function to include adverb subcategory fields. Replace the entire `lookup_word` function (lines 22-67) with:

```python
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

    # Map adverb subcategory config from JSONB columns to Pydantic schemas
    from app.models.vocab import (
        SliderConfigSchema,
        TimelineConfigSchema,
        CertaintyConfigSchema,
        GaugeConfigSchema,
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
```

- [ ] **Step 4: Run backend type check**

Run: `cd backend && source .venv/bin/activate && mypy app/models/vocab.py app/services/vocab_service.py --ignore-missing-imports`
Expected: No type errors.

- [ ] **Step 5: Commit backend changes**

```bash
git add backend/app/models/vocab.py backend/app/services/vocab_service.py frontend/src/lib/adverb-types.ts
git commit -m "feat(vocab-api): return adverb_subcategory and config JSON in lookup responses"
```

---

## Task 3: Frontend Type Updates — Extend `WordResult` and Dispatch Logic

**Files:**
- Modify: `frontend/src/app/vocab/[kategori]/page.tsx:14-44,241-271`

- [ ] **Step 1: Update `WordResult` interface in vocab page to include adverb fields**

In `frontend/src/app/vocab/[kategori]/page.tsx`, update the `WordComparison` interface and add the `WordResult` interface with adverb fields. Replace lines 22-37:

```typescript
import { type AdverbSubcategory, type SliderConfig, type TimelineConfig, type CertaintyConfig, type GaugeConfig, getInteractionComponent } from '@/lib/adverb-types'

interface WordComparison {
  low_image_url: string
  high_image_url: string
  low_label: string
  high_label: string
  reference_word: string
}

interface WordResult {
  id: string
  text: string
  category: string
  word_type: string
  image_url: string | null
  comparison: WordComparison | null
  adverb_subcategory: AdverbSubcategory | null
  slider_config: SliderConfig | null
  timeline_config: TimelineConfig | null
  certainty_config: CertaintyConfig | null
  gauge_config: GaugeConfig | null
}
```

- [ ] **Step 2: Add component imports to the page**

Add these imports at the top of the file (after existing imports):

```typescript
import { IntensitySlider } from '@/components/vocab/IntensitySlider'
import { TimelineAnimation } from '@/components/vocab/TimelineAnimation'
import { CertaintyDial } from '@/components/vocab/CertaintyDial'
import { SensationGauge } from '@/components/vocab/SensationGauge'
```

- [ ] **Step 3: Update render dispatch logic for adverb words**

Replace the render section at lines 241-271 with context-dependent dispatch. Find the three blocks that handle `result.state === 'found'`:

```tsx
{result.state === 'found' && result.word.word_type === 'konkret' && (
  <div className="animate-in fade-in slide-in-from-bottom-4 w-full duration-500">
    <ConcreteWordCard
      word={result.word.text}
      imageUrl={result.word.image_url}
      category={result.word.category}
    />
  </div>
)}

{result.state === 'found' && result.word.word_type === 'abstrak' && result.word.comparison && (() => {
  // For kata_keterangan with adverb_subcategory, use interactive components
  const interactionType = getInteractionComponent(result.word.category, result.word.adverb_subcategory)

  if (interactionType === 'intensity-slider' && result.word.slider_config) {
    return (
      <div className="animate-in fade-in slide-in-from-bottom-4 w-full duration-500">
        <IntensitySlider
          word={result.word.text}
          config={result.word.slider_config}
          comparison={result.word.comparison}
          category={result.word.category}
        />
      </div>
    )
  }

  if (interactionType === 'timeline-animation' && result.word.timeline_config) {
    return (
      <div className="animate-in fade-in slide-in-from-bottom-4 w-full duration-500">
        <TimelineAnimation
          word={result.word.text}
          config={result.word.timeline_config}
          category={result.word.category}
        />
      </div>
    )
  }

  if (interactionType === 'certainty-dial' && result.word.certainty_config) {
    return (
      <div className="animate-in fade-in slide-in-from-bottom-4 w-full duration-500">
        <CertaintyDial
          word={result.word.text}
          config={result.word.certainty_config}
          category={result.word.category}
        />
      </div>
    )
  }

  if (interactionType === 'sensation-gauge' && result.word.gauge_config) {
    return (
      <div className="animate-in fade-in slide-in-from-bottom-4 w-full duration-500">
        <SensationGauge
          word={result.word.text}
          config={result.word.gauge_config}
          category={result.word.category}
        />
      </div>
    )
  }

  // Fallback: no adverb subcategory or config — use static AbstractComparison
  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 w-full duration-500">
      <AbstractComparison
        word={result.word.text}
        lowImageUrl={result.word.comparison.low_image_url}
        highImageUrl={result.word.comparison.high_image_url}
        lowLabel={result.word.comparison.low_label}
        highLabel={result.word.comparison.high_label}
        category={result.word.category}
        referenceWord={result.word.comparison.reference_word}
      />
    </div>
  )
})()}

{result.state === 'found' && result.word.word_type === 'abstrak' && !result.word.comparison && (
  <div className="animate-in fade-in slide-in-from-bottom-4 w-full rounded-2xl bg-white p-8 text-center shadow-sm ring-1 ring-slate-900/5 duration-500">
    <p className="font-medium text-slate-600">
      Data visual komparatif untuk kata abstrak ini belum tersedia.
    </p>
  </div>
)}
```

- [ ] **Step 4: Run TypeScript type check**

Run: `cd frontend && bun run tsc`
Expected: Should fail because `IntensitySlider`, `TimelineAnimation`, `CertaintyDial`, `SensationGauge` components don't exist yet. That's expected — we'll create them in Tasks 4-7.

- [ ] **Step 5: Do NOT commit yet — wait until components are created**

---

## Task 4: IntensitySlider Component (P0 — Degree Adverbs)

**Files:**
- Create: `frontend/src/components/vocab/IntensitySlider.tsx`
- Create: `frontend/src/components/vocab/__tests__/IntensitySlider.test.tsx`

- [ ] **Step 1: Create `IntensitySlider.tsx`**

Create `frontend/src/components/vocab/IntensitySlider.tsx`:

```tsx
'use client'

import { useState, useCallback } from 'react'
import { Slider } from '@/components/ui/slider'
import { Card, CardContent } from '@/components/ui/card'
import type { SliderConfig } from '@/lib/adverb-types'
import type { WordComparison } from '@/app/vocab/[kategori]/page'

interface IntensitySliderProps {
  word: string
  config: SliderConfig
  comparison: WordComparison | null
  category: string
}

export function IntensitySlider({
  word,
  config,
  comparison,
  category,
}: IntensitySliderProps) {
  const [position, setPosition] = useState(config.default_position)
  const [hasInteracted, setHasInteracted] = useState(false)

  const handlePositionChange = useCallback((value: number[]) => {
    setPosition(value[0])
    if (!hasInteracted) setHasInteracted(true)
  }, [hasInteracted])

  // Visual feedback: scale the emoji and change intensity text based on position
  const intensityScale = 0.5 + position * 1.5 // 0.5x to 2x
  const currentEmoji = position < 0.5 ? config.emoji_low : config.emoji_high
  const currentLabel = position < 0.3
    ? config.low_label
    : position > 0.7
      ? config.high_label
      : `${config.low_label}–${config.high_label}`

  return (
    <Card className="mx-auto w-full max-w-md border-white bg-white/80 shadow-sm backdrop-blur-sm">
      <CardContent className="flex flex-col items-center gap-4 p-4 sm:p-6">
        <h2 className="text-center text-2xl font-bold tracking-wide text-slate-800 uppercase sm:text-3xl">
          {word}
        </h2>
        {comparison?.reference_word && (
          <p className="text-center text-sm text-slate-500">
            memodifikasi: <span className="font-semibold" style={{ color: config.accent_color }}>{comparison.reference_word}</span>
          </p>
        )}

        {/* Interactive emoji that responds to slider position */}
        <div className="flex h-24 w-24 items-center justify-center transition-transform duration-200" style={{ transform: `scale(${intensityScale})` }}>
          <span className="text-5xl sm:text-6xl">{currentEmoji}</span>
        </div>

        {/* Intensity label that changes with slider */}
        <p
          className="text-sm font-semibold transition-colors duration-200"
          style={{ color: config.accent_color }}
        >
          {currentLabel}
        </p>

        {/* Interactive slider */}
        <div className="w-full px-2">
          <Slider
            value={[position]}
            onValueChange={handlePositionChange}
            min={0}
            max={100}
            step={1}
            className="w-full"
            aria-label={`Intensitas ${word}`}
          />
          <div className="mt-2 flex justify-between text-xs text-slate-400">
            <span>{config.low_label}</span>
            <span>{config.high_label}</span>
          </div>
        </div>

        {/* Visual comparison images (from word_comparisons) when available */}
        {comparison && (
          <div className="mt-2 flex w-full items-center justify-between gap-2 sm:gap-4">
            <div className="flex flex-1 flex-col items-center gap-1 text-center">
              <div className="flex aspect-square w-full max-w-[100px] items-center justify-center rounded-lg bg-gray-50 text-3xl">
                {config.emoji_low}
              </div>
              <span className="text-xs font-medium text-slate-500">{comparison.low_label}</span>
            </div>
            <span className="shrink-0 text-lg font-bold text-slate-300">→</span>
            <div className="flex flex-1 flex-col items-center gap-1 text-center">
              <div className="flex aspect-square w-full max-w-[100px] items-center justify-center rounded-lg bg-gray-50 text-3xl">
                {config.emoji_high}
              </div>
              <span className="text-xs font-medium text-slate-500">{comparison.high_label}</span>
            </div>
          </div>
        )}

        {/* Haptic-like feedback on first interaction */}
        {hasInteracted && (
          <div className="mt-2 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <p className="text-center text-xs text-slate-400">
              Geser untuk melihat perbedaan intensitas
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
```

- [ ] **Step 2: Create `IntensitySlider.test.tsx`**

Create `frontend/src/components/vocab/__tests__/IntensitySlider.test.tsx`:

```tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { IntensitySlider } from '../IntensitySlider'
import type { SliderConfig } from '@/lib/adverb-types'

const mockConfig: SliderConfig = {
  default_position: 0.7,
  low_label: 'sedikit',
  high_label: 'sangat',
  reference_word: 'besar',
  accent_color: '#10b981',
  emoji_low: '🌱',
  emoji_high: '🌳',
}

const mockComparison = {
  low_image_url: '/images/kecil.svg',
  high_image_url: '/images/besar.svg',
  low_label: 'kecil',
  high_label: 'besar',
  reference_word: 'besar',
}

describe('IntensitySlider', () => {
  it('renders the word as heading', () => {
    render(<IntensitySlider word="sangat" config={mockConfig} comparison={mockComparison} category="kata_keterangan" />)
    expect(screen.getByText('sangat')).toBeTruthy()
  })

  it('shows reference word when comparison is provided', () => {
    render(<IntensitySlider word="sangat" config={mockConfig} comparison={mockComparison} category="kata_keterangan" />)
    expect(screen.getByText('besar')).toBeTruthy()
  })

  it('displays high emoji when position is above 0.5', () => {
    render(<IntensitySlider word="sangat" config={mockConfig} comparison={null} category="kata_keterangan" />)
    // default_position is 0.7 (70/100), so should show high emoji
    expect(screen.getByText('🌳')).toBeTruthy()
  })

  it('displays low and high labels', () => {
    render(<IntensitySlider word="sangat" config={mockConfig} comparison={null} category="kata_keterangan" />)
    expect(screen.getByText('sedikit')).toBeTruthy()
    expect(screen.getByText('sangat')).toBeTruthy()
  })

  it('renders without comparison images gracefully', () => {
    render(<IntensitySlider word="sangat" config={mockConfig} comparison={null} category="kata_keterangan" />)
    expect(screen.getByText('sangat')).toBeTruthy()
  })
})
```

- [ ] **Step 3: Commit IntensitySlider**

```bash
git add frontend/src/components/vocab/IntensitySlider.tsx frontend/src/components/vocab/__tests__/IntensitySlider.test.tsx
git commit -m "feat(vocab): add IntensitySlider component for degree adverbs"
```

---

## Task 5: TimelineAnimation Component (P1 — Temporal Adverbs)

**Files:**
- Create: `frontend/src/components/vocab/TimelineAnimation.tsx`
- Create: `frontend/src/components/vocab/__tests__/TimelineAnimation.test.tsx`

- [ ] **Step 1: Create `TimelineAnimation.tsx`**

Create `frontend/src/components/vocab/TimelineAnimation.tsx`:

```tsx
'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import type { TimelineConfig } from '@/lib/adverb-types'

interface TimelineAnimationProps {
  word: string
  config: TimelineConfig
  category: string
}

export function TimelineAnimation({
  word,
  config,
  category,
}: TimelineAnimationProps) {
  const [activeSlots, setActiveSlots] = useState<number>(0)
  const [isAnimating, setIsAnimating] = useState(true)

  // Animate: fill slots one by one, then reset
  useEffect(() => {
    if (!isAnimating) return
    const interval = setInterval(() => {
      setActiveSlots((prev) => {
        if (prev >= config.occurrence_count) {
          // Pause briefly, then restart
          setTimeout(() => setActiveSlots(0), 800)
          return prev
        }
        return prev + 1
      })
    }, 300)
    return () => clearInterval(interval)
  }, [isAnimating, config.occurrence_count])

  // Reset animation on toggle
  const handleToggleAnimation = () => {
    setActiveSlots(0)
    setIsAnimating((prev) => !prev)
  }

  const slots = Array.from({ length: config.total_slots }, (_, i) => i)

  return (
    <Card className="mx-auto w-full max-w-md border-white bg-white/80 shadow-sm backdrop-blur-sm">
      <CardContent className="flex flex-col items-center gap-4 p-4 sm:p-6">
        <h2 className="text-center text-2xl font-bold tracking-wide text-slate-800 uppercase sm:text-3xl">
          {word}
        </h2>

        {/* Description */}
        <p
          className="text-center text-sm font-semibold"
          style={{ color: config.accent_color }}
        >
          {config.description}
        </p>

        {/* Timeline grid showing filled/empty slots */}
        <div className="w-full">
          <div className="flex flex-wrap items-center justify-center gap-2">
            {slots.map((i) => (
              <div
                key={i}
                className="flex h-10 w-10 items-center justify-center rounded-lg text-lg transition-all duration-200"
                style={{
                  backgroundColor: i < activeSlots ? config.accent_color : '#f1f5f9',
                  transform: i < activeSlots ? 'scale(1.05)' : 'scale(1)',
                }}
              >
                {i < activeSlots ? config.icon_filled : config.icon_empty}
              </div>
            ))}
          </div>

          {/* Period label */}
          <div className="mt-3 flex justify-between text-xs text-slate-400">
            <span>{config.period_label}</span>
            <span className="font-medium" style={{ color: config.accent_color }}>
              {activeSlots}/{config.total_slots} kali
            </span>
          </div>
        </div>

        {/* Play/pause button (visual/haptic only, no audio) */}
        <button
          onClick={handleToggleAnimation}
          className="rounded-full px-4 py-2 text-sm font-medium text-white transition-transform hover:scale-105 active:scale-95"
          style={{ backgroundColor: config.accent_color }}
        >
          {isAnimating ? '⏸ Jeda' : '▶ Putar Ulang'}
        </button>
      </CardContent>
    </Card>
  )
}
```

- [ ] **Step 2: Create `TimelineAnimation.test.tsx`**

```tsx
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { TimelineAnimation } from '../TimelineAnimation'
import type { TimelineConfig } from '@/lib/adverb-types'

const mockConfig: TimelineConfig = {
  frequency: 0.7,
  period_label: 'seminggu',
  occurrence_count: 5,
  total_slots: 7,
  accent_color: '#3b82f6',
  icon_filled: '🔵',
  icon_empty: '⚪',
  description: 'Sering artinya hampir setiap hari!',
}

describe('TimelineAnimation', () => {
  it('renders the word as heading', () => {
    render(<TimelineAnimation word="sering" config={mockConfig} category="kata_keterangan" />)
    expect(screen.getByText('sering')).toBeTruthy()
  })

  it('displays the description', () => {
    render(<TimelineAnimation word="sering" config={mockConfig} category="kata_keterangan" />)
    expect(screen.getByText('Sering artinya hampir setiap hari!')).toBeTruthy()
  })

  it('renders the correct number of slots', () => {
    render(<TimelineAnimation word="sering" config={mockConfig} category="kata_keterangan" />)
    // 7 slots total (total_slots: 7)
    const emptyIcons = screen.getAllByText('⚪')
    // Initially 0 active, so all 7 should show empty
    expect(emptyIcons.length).toBe(7)
  })

  it('has a play/pause button', () => {
    render(<TimelineAnimation word="sering" config={mockConfig} category="kata_keterangan" />)
    expect(screen.getByText('⏸ Jeda')).toBeTruthy()
  })
})
```

- [ ] **Step 3: Commit TimelineAnimation**

```bash
git add frontend/src/components/vocab/TimelineAnimation.tsx frontend/src/components/vocab/__tests__/TimelineAnimation.test.tsx
git commit -m "feat(vocab): add TimelineAnimation component for temporal adverbs"
```

---

## Task 6: CertaintyDial Component (P1 — Modality Adverbs)

**Files:**
- Create: `frontend/src/components/vocab/CertaintyDial.tsx`
- Create: `frontend/src/components/vocab/__tests__/CertaintyDial.test.tsx`

- [ ] **Step 1: Create `CertaintyDial.tsx`**

Create `frontend/src/components/vocab/CertaintyDial.tsx`:

```tsx
'use client'

import { Card, CardContent } from '@/components/ui/card'
import type { CertaintyConfig } from '@/lib/adverb-types'

interface CertaintyDialProps {
  word: string
  config: CertaintyConfig
  category: string
}

export function CertaintyDial({
  word,
  config,
  category,
}: CertaintyDialProps) {
  // Conic gradient: filled section represents certainty level
  // 0.0 = uncertain (red/amber), 1.0 = certain (green)
  const filledDeg = config.certainty_level * 360
  const emptyDeg = 360 - filledDeg

  // Color transitions: uncertain=amber → mid=yellow → certain=green
  const dialColor = config.certainty_level > 0.7
    ? '#22c55e' // green-500
    : config.certainty_level > 0.4
      ? '#f59e0b' // amber-500
      : '#ef4444' // red-500

  const currentEmoji = config.certainty_level > 0.7
    ? config.emoji_certain
    : config.emoji_uncertain

  return (
    <Card className="mx-auto w-full max-w-md border-white bg-white/80 shadow-sm backdrop-blur-sm">
      <CardContent className="flex flex-col items-center gap-4 p-4 sm:p-6">
        <h2 className="text-center text-2xl font-bold tracking-wide text-slate-800 uppercase sm:text-3xl">
          {word}
        </h2>

        {/* Radial dial using conic gradient */}
        <div className="relative flex items-center justify-center">
          <div
            className="h-40 w-40 rounded-full sm:h-48 sm:w-48"
            style={{
              background: `conic-gradient(${dialColor} ${filledDeg}deg, #e2e8f0 ${filledDeg}deg ${filledDeg + emptyDeg}deg)`,
            }}
          />
          {/* Inner white circle to create donut effect */}
          <div className="absolute flex h-28 w-28 flex-col items-center justify-center rounded-full bg-white shadow-inner sm:h-32 sm:w-32">
            <span className="text-4xl sm:text-5xl">{currentEmoji}</span>
            <span
              className="mt-1 text-xs font-bold uppercase sm:text-sm"
              style={{ color: dialColor }}
            >
              {config.certainty_level > 0.7 ? config.high_label : config.low_label}
            </span>
          </div>
        </div>

        {/* Description */}
        <p
          className="text-center text-sm font-semibold"
          style={{ color: config.accent_color }}
        >
          {config.description}
        </p>

        {/* Certainty scale labels */}
        <div className="flex w-full max-w-xs justify-between text-xs text-slate-400">
          <span>{config.low_label}</span>
          <span className="font-medium" style={{ color: config.accent_color }}>
            {Math.round(config.certainty_level * 100)}% yakin
          </span>
          <span>{config.high_label}</span>
        </div>
      </CardContent>
    </Card>
  )
}
```

- [ ] **Step 2: Create `CertaintyDial.test.tsx`**

```tsx
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { CertaintyDial } from '../CertaintyDial'
import type { CertaintyConfig } from '@/lib/adverb-types'

const mockConfig: CertaintyConfig = {
  certainty_level: 0.9,
  low_label: 'tidak yakin',
  high_label: 'sangat yakin',
  accent_color: '#f59e0b',
  emoji_uncertain: '🤔',
  emoji_certain: '✅',
  description: 'Pasti artinya hampir 100% yakin!',
}

describe('CertaintyDial', () => {
  it('renders the word as heading', () => {
    render(<CertaintyDial word="pasti" config={mockConfig} category="kata_keterangan" />)
    expect(screen.getByText('pasti')).toBeTruthy()
  })

  it('displays the description', () => {
    render(<CertaintyDial word="pasti" config={mockConfig} category="kata_keterangan" />)
    expect(screen.getByText('Pasti artinya hampir 100% yakin!')).toBeTruthy()
  })

  it('shows certain emoji for high certainty', () => {
    render(<CertaintyDial word="pasti" config={mockConfig} category="kata_keterangan" />)
    // certainty_level 0.9 > 0.7, so should show certain emoji
    expect(screen.getByText('✅')).toBeTruthy()
  })

  it('shows certainty level label', () => {
    render(<CertaintyDial word="pasti" config={mockConfig} category="kata_keterangan" />)
    expect(screen.getByText('90% yakin')).toBeTruthy()
  })

  it('shows low and high labels at bottom', () => {
    render(<CertaintyDial word="pasti" config={mockConfig} category="kata_keterangan" />)
    expect(screen.getByText('tidak yakin')).toBeTruthy()
    expect(screen.getByText('sangat yakin')).toBeTruthy()
  })
})
```

- [ ] **Step 3: Commit CertaintyDial**

```bash
git add frontend/src/components/vocab/CertaintyDial.tsx frontend/src/components/vocab/__tests__/CertaintyDial.test.tsx
git commit -m "feat(vocab): add CertaintyDial component for modality adverbs"
```

---

## Task 7: SensationGauge Component (P1 — Intensity Adverbs)

**Files:**
- Create: `frontend/src/components/vocab/SensationGauge.tsx`
- Create: `frontend/src/components/vocab/__tests__/SensationGauge.test.tsx`

- [ ] **Step 1: Create `SensationGauge.tsx`**

Create `frontend/src/components/vocab/SensationGauge.tsx`:

```tsx
'use client'

import { Card, CardContent } from '@/components/ui/card'
import type { GaugeConfig } from '@/lib/adverb-types'

interface SensationGaugeProps {
  word: string
  config: GaugeConfig
  category: string
}

export function SensationGauge({
  word,
  config,
  category,
}: SensationGaugeProps) {
  // Gauge fill percentage for visual display
  const fillPercent = Math.round(config.intensity_level * 100)

  // Emoji transitions based on intensity
  const currentEmoji = config.intensity_level > 0.7
    ? config.emoji_high
    : config.intensity_level > 0.3
      ? '😬'
      : config.emoji_low

  return (
    <Card className="mx-auto w-full max-w-md border-white bg-white/80 shadow-sm backdrop-blur-sm">
      <CardContent className="flex flex-col items-center gap-4 p-4 sm:p-6">
        <h2 className="text-center text-2xl font-bold tracking-wide text-slate-800 uppercase sm:text-3xl">
          {word}
        </h2>

        {/* Emoji display */}
        <div className="flex h-20 w-20 items-center justify-center text-5xl transition-transform duration-200">
          {currentEmoji}
        </div>

        {/* Thermometer/gauge bar */}
        <div className="w-full max-w-xs">
          <div className="relative h-8 w-full overflow-hidden rounded-full bg-slate-100 ring-1 ring-slate-200">
            <div
              className="absolute inset-y-0 left-0 flex items-center justify-end rounded-full transition-all duration-500"
              style={{
                width: `${fillPercent}%`,
                backgroundColor: config.accent_color,
              }}
            >
              {/* Intensity label inside bar if wide enough */}
              {fillPercent > 35 && (
                <span className="px-2 text-xs font-bold text-white">
                  {fillPercent}{config.unit_symbol}
                </span>
              )}
            </div>
            {/* Label outside bar if narrow */}
            {fillPercent <= 35 && (
              <span
                className="absolute inset-y-0 flex items-center pl-2 text-xs font-bold"
                style={{ color: config.accent_color, left: `${fillPercent + 2}%` }}
              >
                {fillPercent}{config.unit_symbol}
              </span>
            )}
          </div>
          {/* Scale labels */}
          <div className="mt-1 flex justify-between text-xs text-slate-400">
            <span>{config.low_label}</span>
            <span>{config.high_label}</span>
          </div>
        </div>

        {/* Sensation word badge */}
        <div
          className="rounded-full px-4 py-1 text-sm font-semibold text-white"
          style={{ backgroundColor: config.accent_color }}
        >
          {config.sensation_word}
        </div>
      </CardContent>
    </Card>
  )
}
```

- [ ] **Step 2: Create `SensationGauge.test.tsx`**

```tsx
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { SensationGauge } from '../SensationGauge'
import type { GaugeConfig } from '@/lib/adverb-types'

const mockConfig: GaugeConfig = {
  intensity_level: 0.85,
  sensation_word: 'pedas',
  low_label: 'sedikit pedas',
  high_label: 'sangat pedas',
  accent_color: '#ef4444',
  emoji_low: '😐',
  emoji_high: '🥵',
  unit_symbol: '🌶️',
}

describe('SensationGauge', () => {
  it('renders the word as heading', () => {
    render(<SensationGauge word="sangat" config={mockConfig} category="kata_keterangan" />)
    expect(screen.getByText('sangat')).toBeTruthy()
  })

  it('shows sensation word badge', () => {
    render(<SensationGauge word="sangat" config={mockConfig} category="kata_keterangan" />)
    expect(screen.getByText('pedas')).toBeTruthy()
  })

  it('shows high emoji for high intensity', () => {
    render(<SensationGauge word="sangat" config={mockConfig} category="kata_keterangan" />)
    // intensity_level 0.85 > 0.7, so should show high emoji
    expect(screen.getByText('🥵')).toBeTruthy()
  })

  it('shows low and high labels', () => {
    render(<SensationGauge word="sangat" config={mockConfig} category="kata_keterangan" />)
    expect(screen.getByText('sedikit pedas')).toBeTruthy()
    expect(screen.getByText('sangat pedas')).toBeTruthy()
  })
})
```

- [ ] **Step 3: Commit SensationGauge**

```bash
git add frontend/src/components/vocab/SensationGauge.tsx frontend/src/components/vocab/__tests__/SensationGauge.test.tsx
git commit -m "feat(vocab): add SensationGauge component for intensity adverbs"
```

---

## Task 8: Integration — Type Check, Migration, and End-to-End Verification

**Files:**
- No new files — verification task

- [ ] **Step 1: Run frontend TypeScript check**

Run: `cd frontend && bun run tsc`
Expected: PASS — no type errors. All adverb types, configs, and components should resolve correctly.

- [ ] **Step 2: Run frontend lint**

Run: `cd frontend && bun run lint`
Expected: PASS — no linting errors.

- [ ] **Step 3: Apply Drizzle migration**

Run: `cd frontend && bun run db:migrate`
Expected: Migration applied successfully. New columns `adverb_subcategory`, `slider_config`, `timeline_config`, `certainty_config`, `gauge_config` added to `words` table, plus `words_adverb_subcategory_idx` index created.

- [ ] **Step 4: Verify backend starts**

Run: `cd backend && source .venv/bin/activate && python -c "from app.models.vocab import WordResult; from app.services.vocab_service import lookup_word; print('✅ Backend imports OK')"`
Expected: No import errors.

- [ ] **Step 5: Seed adverb test data (manual SQL)**

Run the following SQL against the database (via Supabase SQL editor or `db:studio`):

```sql
-- Seed degree adverb: "sangat" (very)
INSERT INTO words (id, text, category, type, adverb_subcategory, slider_config)
VALUES (
  gen_random_uuid(), 'sangat', 'kata_keterangan', 'abstrak', 'degree',
  '{"default_position": 0.9, "low_label": "sedikit", "high_label": "sangat", "reference_word": "besar", "accent_color": "#10b981", "emoji_low": "🌱", "emoji_high": "🌳"}'
);

-- Seed temporal adverb: "sering" (often)
INSERT INTO words (id, text, category, type, adverb_subcategory, timeline_config)
VALUES (
  gen_random_uuid(), 'sering', 'kata_keterangan', 'abstrak', 'temporal',
  '{"frequency": 0.7, "period_label": "seminggu", "occurrence_count": 5, "total_slots": 7, "accent_color": "#3b82f6", "icon_filled": "🔵", "icon_empty": "⚪", "description": "Sering artinya hampir setiap hari!"}'
);

-- Seed modality adverb: "pasti" (definitely)
INSERT INTO words (id, text, category, type, adverb_subcategory, certainty_config)
VALUES (
  gen_random_uuid(), 'pasti', 'kata_keterangan', 'abstrak', 'modality',
  '{"certainty_level": 0.9, "low_label": "tidak yakin", "high_label": "sangat yakin", "accent_color": "#f59e0b", "emoji_uncertain": "🤔", "emoji_certain": "✅", "description": "Pasti artinya hampir 100% yakin!"}'
);

-- Seed intensity adverb: "pedas" (spicy)
INSERT INTO words (id, text, category, type, adverb_subcategory, gauge_config)
VALUES (
  gen_random_uuid(), 'pedas', 'kata_keterangan', 'abstrak', 'intensity',
  '{"intensity_level": 0.85, "sensation_word": "pedas", "low_label": "sedikit pedas", "high_label": "sangat pedas", "accent_color": "#ef4444", "emoji_low": "😐", "emoji_high": "🥵", "unit_symbol": "🌶️"}'
);
```

- [ ] **Step 6: Curl the vocab API to verify new fields**

Run: `curl -s "http://localhost:8000/api/v1/vocab/lookup?word=sangat&category=kata_keterangan" | python3 -m json.tool`
Expected: Response includes `adverb_subcategory: "degree"`, `slider_config` object with all fields, and `null` for other config fields.

- [ ] **Step 7: Final integration commit**

```bash
git add -A
git commit -m "feat(vocab): integrate adverb context-dependent UI with backend and test data"
```

---

## Task 9: Update AGENTS.md with Implementation Status

**Files:**
- Modify: `AGENTS.md`

- [ ] **Step 1: Update the Implementation Roadmap section in AGENTS.md**

Find the "Implementation roadmap" section and update it to reflect completion:

```markdown
**Implementation roadmap**:

- ✅ P0: DB schema (`adverb_subcategory` + `*_config` JSONB columns on `words` table)
- ✅ P0: `<IntensitySlider>` — interactive slider using shadcn Slider + CSS transform scale
- ✅ P1: `<TimelineAnimation>`, `<CertaintyDial>`, `<SensationGauge>`
- ✅ P2: Backend vocab API returns `adverb_subcategory` + config JSON
- 🔵 P2: Drag-and-Drop Quiz mode (audio-free, visual/haptic feedback only)
- ❌ NOT PLANNED: NMM Face Mesh detection — hand gestures only, no facial expression detection
```

Also update the "Current state" description:

```markdown
**Current state**: Interactive components implemented for each adverb subcategory. `IntensitySlider` (degree), `TimelineAnimation` (temporal), `CertaintyDial` (modality), `SensationGauge` (intensity) dispatch from `vocab/[kategori]/page.tsx` based on `adverb_subcategory` field. `AbstractComparison` remains as fallback for abstrak words without adverb config. Next: Drag-and-Drop Quiz mode.
```

- [ ] **Step 2: Commit AGENTS.md update**

```bash
git add AGENTS.md
git commit -m "docs: update AGENTS.md with adverb UI implementation status"
```

---

## Self-Review Checklist

### 1. Spec Coverage

| Requirement | Task |
|---|---|
| `adverb_subcategory` column on `words` table | Task 1 |
| JSONB config columns (`slider_config`, `timeline_config`, `certainty_config`, `gauge_config`) | Task 1 |
| Backend returns `adverb_subcategory` + configs in vocab API | Task 2 |
| Frontend `WordResult` type includes adverb fields | Task 3 |
| Frontend dispatch based on `adverb_subcategory` | Task 3 |
| `<IntensitySlider>` component for degree adverbs | Task 4 |
| `<TimelineAnimation>` component for temporal adverbs | Task 5 |
| `<CertaintyDial>` component for modality adverbs | Task 6 |
| `<SensationGauge>` component for intensity adverbs | Task 7 |
| Drizzle migration generated and applied | Task 8 |
| Test data seeded | Task 8 |
| E2E verification via curl | Task 8 |
| AGENTS.md updated | Task 9 |

### 2. Placeholder Scan

No TBD, TODO, "implement later", or "add appropriate error handling" in this plan. All code blocks contain complete implementation.

### 3. Type Consistency

| Type | Defined In | Used In |
|---|---|---|
| `AdverbSubcategory` | `frontend/src/lib/adverb-types.ts` | `page.tsx` WordResult, `getInteractionComponent()` |
| `SliderConfig` | `frontend/src/lib/adverb-types.ts` | `IntensitySlider.tsx`, `WordResult` |
| `TimelineConfig` | `frontend/src/lib/adverb-types.ts` | `TimelineAnimation.tsx`, `WordResult` |
| `CertaintyConfig` | `frontend/src/lib/adverb-types.ts` | `CertaintyDial.tsx`, `WordResult` |
| `GaugeConfig` | `frontend/src/lib/adverb-types.ts` | `SensationGauge.tsx`, `WordResult` |
| `SliderConfigSchema` | `backend/app/models/vocab.py` | `WordResult` schema, `vocab_service.py` |
| `TimelineConfigSchema` | `backend/app/models/vocab.py` | `WordResult` schema, `vocab_service.py` |
| `CertaintyConfigSchema` | `backend/app/models/vocab.py` | `WordResult` schema, `vocab_service.py` |
| `GaugeConfigSchema` | `backend/app/models/vocab.py` | `WordResult` schema, `vocab_service.py` |
| `adverbSubcategory: text` | `schema.ts` (Drizzle) | `models.py` (SQLAlchemy `adverb_subcategory: String(20)`) |
| `slider_config: jsonb` | `schema.ts` (Drizzle) | `models.py` (SQLAlchemy `JSONB`) |
| `getInteractionComponent()` | `adverb-types.ts` | `page.tsx` dispatch logic |

All types are consistent across frontend TypeScript, Drizzle schema, and backend Python/Pydantic.
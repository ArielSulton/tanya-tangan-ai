"""
Pydantic schemas for visual vocabulary endpoints
"""

from typing import Optional

from pydantic import BaseModel, ConfigDict, Field


class SliderConfigSchema(BaseModel):
    """Config for degree adverbs (sangat, agak, terlalu, paling)"""

    default_position: float = Field(
        ge=0, le=1, description="Initial slider position 0.0-1.0"
    )
    low_label: str
    high_label: str
    reference_word: str
    accent_color: str = Field(
        default="#10b981", description="CSS color for active range"
    )
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


class WordListItem(BaseModel):
    """Minimal word info for quiz/list endpoints"""

    id: str
    text: str
    category: str
    word_type: str = Field(description="Word type: 'konkret' or 'abstrak'")
    image_url: Optional[str] = None


class WordListResponse(BaseModel):
    words: list[WordListItem]


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
    correction_layer: Optional[str] = Field(
        default=None,
        description="Which correction layer resolved the word: 'layer1_sibi', 'layer2_fuzzy', 'layer3_llm', 'layer1_sibi+fuzzy', or None",
    )
    correction_confidence: Optional[float] = Field(
        default=None,
        description="Confidence score (0.0-1.0) from the correction layer that resolved the word",
    )


# Internal service return type — same contract as FallbackResponse
FallbackResult = FallbackResponse


class WordRequestItem(BaseModel):
    id: str
    gesture_input: str
    suggested_word: Optional[str] = None
    session_id: Optional[str] = None
    created_at: Optional[str] = None


class WordRequestListResponse(BaseModel):
    requests: list[WordRequestItem]
    total: int
    page: int
    limit: int
    total_pages: int

"""
Pydantic schemas for visual vocabulary endpoints
"""
from typing import Optional
from pydantic import BaseModel, ConfigDict, Field


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

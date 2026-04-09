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
    word_type: str  # konkret | abstrak  (NOTE: DB column is "type" but Python attr is word_type)
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

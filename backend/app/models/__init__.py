"""
Database models for PENSyarat AI application (New 6-table schema)
"""

from .conversation import Conversation, ConversationCreate, ConversationUpdate
from .messages import Message, MessageCreate, MessageUpdate
from .notes import Note, NoteCreate, NoteUpdate
from .roles import Role, RoleCreate, RoleUpdate
from .user import User, UserCreate, UserUpdate
from .vocab import (
    WordComparisonSchema,
    WordResult,
    CategoryResponse,
    LookupResponse,
    FallbackRequest,
    FallbackResponse,
    FallbackResult,
)

__all__ = [
    # Core models
    "User",
    "UserCreate",
    "UserUpdate",
    "Conversation",
    "ConversationCreate",
    "ConversationUpdate",
    "Message",
    "MessageCreate",
    "MessageUpdate",
    "Note",
    "NoteCreate",
    "NoteUpdate",
    "Role",
    "RoleCreate",
    "RoleUpdate",
    # Vocab schemas
    "WordComparisonSchema",
    "WordResult",
    "CategoryResponse",
    "LookupResponse",
    "FallbackRequest",
    "FallbackResponse",
    "FallbackResult",
]

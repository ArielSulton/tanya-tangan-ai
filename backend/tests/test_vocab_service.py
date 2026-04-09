"""
Unit tests for vocab_service — verifies function signatures before integration tests
"""


def test_lookup_word_is_callable():
    from app.services.vocab_service import lookup_word
    assert callable(lookup_word)


def test_fallback_suggest_is_callable():
    from app.services.vocab_service import fallback_suggest
    assert callable(fallback_suggest)


def test_log_word_request_is_callable():
    from app.services.vocab_service import log_word_request
    assert callable(log_word_request)


def test_categories_constant_has_five_items():
    from app.services.vocab_service import CATEGORIES
    assert len(CATEGORIES) == 5
    assert "hewan" in CATEGORIES
    assert "kata_keterangan" in CATEGORIES

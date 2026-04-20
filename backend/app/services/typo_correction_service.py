"""
Multi-layer typo correction service for SIBI gesture recognition.

Provides a 3-layer correction cascade:
  Layer 1: Hardcoded SIBI confusion map (instant, zero-latency)
  Layer 2: DB fuzzy lookup with Levenshtein distance scoring
  Layer 3: LLM correction with vocab context (ChatGroq)

Layer 1 is SIBI-specific — hand gestures that look similar produce
confused letter sequences. This map corrects those instantly before
any DB or LLM lookup is attempted.
"""

import logging
from dataclasses import dataclass, field
from typing import Dict, List, Optional

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# SIBI Confusion Map
# ---------------------------------------------------------------------------
# SIBI (Sistem Isyarat Bahasa Indonesia) hand shapes that get confused
# by gesture recognition. Grouped by visual similarity of hand positions.
#
# Key = common misrecognition sequence
# Value = correct word/phrase
#
# These are NOT general typos — they are specific to how gesture
# recognition misinterprets physically similar hand shapes.

# Single-letter confusions (most frequent in SIBI)
SIBI_LETTER_CONFUSIONS: Dict[str, List[str]] = {
    # Visually similar hand shapes in SIBI that get swapped
    "a": ["h"],  # A hand shape ↔ H hand shape
    "h": ["a"],
    "b": ["r"],  # B ↔ R (closed fist variants)
    "r": ["b"],
    "d": ["t"],  # D ↔ T (index finger pointing)
    "t": ["d"],
    "g": ["j"],  # G ↔ J (index finger extended variants)
    "j": ["g"],
    "i": ["y"],  # I ↔ Y (pinky finger variations)
    "y": ["i"],
    "k": ["p"],  # K ↔ P (middle finger positions)
    "p": ["k"],
    "m": ["n"],  # M ↔ N (3 vs 2 fingers)
    "n": ["m"],
    "s": ["t"],  # S ↔ T (fist + thumb varies)
    "e": ["o"],  # E ↔ O (rounded hand shapes)
    "o": ["e"],
    "u": ["v"],  # U ↔ V (2-finger variations)
    "v": ["u"],
}

# Full-word corrections — common SIBI gesture misrecognitions
# These are the most common complete words that gesture recognition outputs
# when the user signs a word correctly but CV misinterprets similar hand shapes.
SIBI_WORD_CORRECTIONS: Dict[str, str] = {
    # Bird/animal confusion (SIBI hand shapes for animals)
    "kaop": "kucing",  # kucing (cat) — K↔P confusion
    "hkucing": "kucing",  # kucing — A↔H at start
    "riji": "burung",  # burung — B↔R confusion
    "annjing": "anjing",  # anjing — close but A↔H
    "hansing": "anjing",  # anjing — A↔H confusion
    "hanjing": "anjing",  # anjing — A↔H confusion
    # Object confusion
    "kpala": "kepala",  # kepala (head) — missing vowel
    "mta": "mata",  # mata (eye) — M↔N confusion
    "nta": "mata",  # mata — N↔M confusion
    "telinga": "telinga",  # correct but often typed wrong
    "tarisan": "garisan",  # garis — G↔J + typo
    # Feeling/adverb confusion
    "sangak": "sangat",  # sangat — K↔P confusion at end
    "sgat": "sangat",  # sangat — missing vowels
    "jaranh": "jarang",  # jarang — H confusion
    "agka": "agak",  # agak — K↔P confusion
    "agkaak": "sangat",  # sangat — compound misrecognition
    # Nature confusion
    "haia": "hujan",  # hujan — A↔H + misrecognition
    "aqio": "hujan",  # hujan — A↔H confusion
    "sgala": "langit",  # langit — S↔T + vowel shift
    # Common SIBI double-letter confusions
    "kka": "kecil",  # kecil — K↔P + vowel dropping
    "bcil": "kecil",  # kecil — B↔R + E↔O + K↔P
}

# Confidence thresholds for each correction layer
CORRECTION_THRESHOLDS = {
    "layer1_exact": 1.0,  # Exact SIBI confusion match
    "layer1_letter_swap": 0.85,  # Letter swap correction
    "layer2_fuzzy_threshold": 0.6,  # Minimum similarity for DB fuzzy match
    "layer3_llm_confidence": 0.5,  # Minimum confidence for LLM suggestion
}


@dataclass
class CorrectionResult:
    """Result from the typo correction cascade"""

    original_input: str
    corrected_word: Optional[str] = None
    layer_used: Optional[str] = None  # 'layer1_sibi', 'layer2_fuzzy', 'layer3_llm'
    confidence: float = 0.0
    explanation: Optional[str] = None
    corrections_tried: List[str] = field(default_factory=list)


class TypoCorrectionService:
    """
    Multi-layer typo correction for SIBI gesture recognition.

    Correction cascade:
      1. SIBI confusion map (instant, zero-latency)
      2. DB fuzzy lookup with Levenshtein scoring
      3. LLM correction with vocab context
    """

    def __init__(self) -> None:
        self._letter_confusions = SIBI_LETTER_CONFUSIONS
        self._word_corrections = SIBI_WORD_CORRECTIONS

    def correct_layer1(self, text: str) -> CorrectionResult:
        """
        Layer 1: Apply SIBI confusion map corrections.

        This is instant — no DB or LLM calls. It handles:
        1. Exact word matches from SIBI_WORD_CORRECTIONS
        2. Letter-swapped variants using SIBI_LETTER_CONFUSIONS

        Returns CorrectionResult with layer='layer1_sibi' if corrected.
        """
        original = text.strip().lower()
        result = CorrectionResult(original_input=original)
        result.corrections_tried.append("layer1_sibi")

        # 1a. Exact word match
        if original in self._word_corrections:
            corrected = self._word_corrections[original]
            result.corrected_word = corrected
            result.layer_used = "layer1_sibi"
            result.confidence = CORRECTION_THRESHOLDS["layer1_exact"]
            logger.info(f'Layer 1 exact match: "{original}" → "{corrected}"')
            return result

        # 1b. Letter-swap variant generation
        # Generate possible corrections by swapping confused letters
        candidates = self._generate_letter_swap_variants(original)

        for candidate in candidates:
            if candidate in self._word_corrections:
                corrected = self._word_corrections[candidate]
                result.corrected_word = corrected
                result.layer_used = "layer1_sibi"
                result.confidence = CORRECTION_THRESHOLDS["layer1_letter_swap"]
                logger.info(
                    f'Layer 1 letter-swap match: "{original}" → "{corrected}" '
                    f'(via variant "{candidate}")'
                )
                return result

        # No Layer 1 correction found
        logger.debug(f'Layer 1 no match for: "{original}"')
        return result

    def _generate_letter_swap_variants(self, text: str) -> List[str]:
        """
        Generate variants by swapping commonly confused SIBI letters.

        For each position in the text, if the character has confusion mappings,
        generate a variant where that character is swapped with each of its
        confusions. Returns at most 8 variants to avoid combinatorial explosion.
        """
        variants: List[str] = []
        text_list = list(text)

        for i, char in enumerate(text_list):
            if char in self._letter_confusions:
                for confused_char in self._letter_confusions[char]:
                    variant = text_list.copy()
                    variant[i] = confused_char
                    variants.append("".join(variant))
                    if len(variants) >= 8:
                        return variants

        return variants

    def compute_levenshtein(self, s1: str, s2: str) -> int:
        """
        Compute Levenshtein distance between two strings.

        Uses dynamic programming approach (Wagner-Fischer algorithm).
        """
        if len(s1) < len(s2):
            return self.compute_levenshtein(s2, s1)

        if len(s2) == 0:
            return len(s1)

        previous_row = range(len(s2) + 1)

        for i, c1 in enumerate(s1):
            current_row = [i + 1]
            for j, c2 in enumerate(s2):
                insertions = previous_row[j + 1] + 1
                deletions = current_row[j] + 1
                substitutions = previous_row[j] + (c1 != c2)
                current_row.append(min(insertions, deletions, substitutions))
            previous_row = current_row

        return previous_row[-1]

    def compute_similarity_score(self, input_word: str, candidate: str) -> float:
        """
        Compute combined similarity score using Jaccard + Levenshtein ratio.

        Uses the same weighted formula as gesture_validation_service:
          score = 0.7 * jaccard_similarity + 0.3 * char_overlap_ratio

        Args:
            input_word: The gesture-recognized word (possibly with typos)
            candidate: A word from the vocabulary database

        Returns:
            Float between 0.0 and 1.0
        """
        input_lower = input_word.lower().strip()
        candidate_lower = candidate.lower().strip()

        # Exact match
        if input_lower == candidate_lower:
            return 1.0

        # Jaccard similarity (word-level)
        input_words = set(input_lower.split())
        candidate_words = set(candidate_lower.split())

        if not input_words or not candidate_words:
            return 0.0

        intersection = input_words.intersection(candidate_words)
        union = input_words.union(candidate_words)
        jaccard = len(intersection) / len(union) if union else 0.0

        # Character overlap ratio (Levenshtein approximation)
        common_chars = sum(1 for c in input_lower if c in candidate_lower)
        total_chars = max(len(input_lower), len(candidate_lower))
        char_overlap = common_chars / total_chars if total_chars > 0 else 0.0

        # Combined weighted score (matching gesture_validation_service weights)
        return min(0.7 * jaccard + 0.3 * char_overlap, 1.0)

    def compute_levenshtein_similarity(self, input_word: str, candidate: str) -> float:
        """
        Compute normalized Levenshtein similarity (0.0 to 1.0).

        1.0 = identical, 0.0 = completely different.
        Uses true Levenshtein distance, not approximation.
        """
        input_lower = input_word.lower().strip()
        candidate_lower = candidate.lower().strip()

        if input_lower == candidate_lower:
            return 1.0

        distance = self.compute_levenshtein(input_lower, candidate_lower)
        max_len = max(len(input_lower), len(candidate_lower))

        return 1.0 - (distance / max_len) if max_len > 0 else 0.0


# Singleton instance
_typo_correction_service: Optional[TypoCorrectionService] = None


def get_typo_correction_service() -> TypoCorrectionService:
    """Get typo correction service singleton"""
    global _typo_correction_service
    if _typo_correction_service is None:
        _typo_correction_service = TypoCorrectionService()
    return _typo_correction_service

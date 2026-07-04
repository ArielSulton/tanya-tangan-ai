export interface SentenceToken {
  word: string
  category: string | null
}

export function addToken(tokens: SentenceToken[], token: SentenceToken): SentenceToken[] {
  return [...tokens, token]
}

export function removeTokenAt(tokens: SentenceToken[], index: number): SentenceToken[] {
  return tokens.filter((_, i) => i !== index)
}

export function resetTokens(): SentenceToken[] {
  return []
}

// Dynamic SIBI gesture words rendered as chips directly, bypassing the
// backend lookup entirely — mirrors the same short-circuit already used in
// `/vocab/[kategori]/page.tsx` (DYNAMIC_GESTURE_WORDS), since these words may
// not have a DB entry in any category.
const DYNAMIC_GESTURE_WORDS = new Set(['belajar', 'maaf', 'seperti', 'terima kasih', 'tolong'])

export function isDynamicGestureWord(word: string): boolean {
  return DYNAMIC_GESTURE_WORDS.has(word)
}

export interface FallbackAnyApiResponse {
  found: boolean
  word: { text: string; category: string } | null
  suggested_word: string | null
  explanation: string | null
}

export type ComposerOutcome =
  | { kind: 'found'; word: string; category: string }
  | { kind: 'suggestion'; suggestedWord: string; explanation: string | null }
  | { kind: 'not_found'; explanation: string | null }

export function classifyFallbackAnyResponse(response: FallbackAnyApiResponse): ComposerOutcome {
  if (response.found && response.word) {
    return { kind: 'found', word: response.word.text, category: response.word.category }
  }
  if (response.suggested_word) {
    return { kind: 'suggestion', suggestedWord: response.suggested_word, explanation: response.explanation }
  }
  return { kind: 'not_found', explanation: response.explanation }
}

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

export interface SyntaxValidation {
  valid: boolean
  reason: string | null
}

// Connector/selector words that cannot start or end a sentence, or appear
// back-to-back, at the "level dasar" (S-P) stage per Bu Lely's feedback:
// a sentence needs a noun on each side of a connector.
const CONNECTOR_WORDS = new Set(['dan', 'yang'])

export function validateSentenceSyntax(tokens: SentenceToken[]): SyntaxValidation {
  if (tokens.length === 0) {
    return { valid: true, reason: null }
  }

  const first = tokens[0]
  if (CONNECTOR_WORDS.has(first.word)) {
    return { valid: false, reason: `Kalimat tidak boleh diawali kata sambung "${first.word}".` }
  }

  const last = tokens[tokens.length - 1]
  if (CONNECTOR_WORDS.has(last.word)) {
    return { valid: false, reason: `Kalimat tidak boleh diakhiri kata sambung "${last.word}".` }
  }

  for (let i = 0; i < tokens.length - 1; i++) {
    const current = tokens[i]
    const next = tokens[i + 1]
    if (CONNECTOR_WORDS.has(current.word) && CONNECTOR_WORDS.has(next.word)) {
      return {
        valid: false,
        reason: `Dua kata sambung "${current.word}" dan "${next.word}" tidak boleh berurutan.`,
      }
    }
  }

  return { valid: true, reason: null }
}

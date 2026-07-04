import { describe, expect, test } from 'bun:test'
import { addToken, classifyFallbackAnyResponse, isDynamicGestureWord, removeTokenAt, resetTokens } from './sentence-composer'

describe('addToken', () => {
  test('appends a token to the end', () => {
    const tokens = addToken([{ word: 'kucing', category: 'hewan' }], { word: 'besar', category: 'kata_keterangan' })
    expect(tokens).toEqual([
      { word: 'kucing', category: 'hewan' },
      { word: 'besar', category: 'kata_keterangan' },
    ])
  })

  test('does not mutate the original array', () => {
    const original = [{ word: 'kucing', category: 'hewan' }]
    addToken(original, { word: 'besar', category: 'kata_keterangan' })
    expect(original).toHaveLength(1)
  })
})

describe('removeTokenAt', () => {
  test('removes the token at the given index', () => {
    const tokens = [
      { word: 'kucing', category: 'hewan' },
      { word: 'besar', category: 'kata_keterangan' },
    ]
    expect(removeTokenAt(tokens, 0)).toEqual([{ word: 'besar', category: 'kata_keterangan' }])
  })

  test('out-of-range index leaves the array unchanged', () => {
    const tokens = [{ word: 'kucing', category: 'hewan' }]
    expect(removeTokenAt(tokens, 5)).toEqual(tokens)
  })
})

describe('resetTokens', () => {
  test('returns an empty array', () => {
    expect(resetTokens()).toEqual([])
  })
})

describe('isDynamicGestureWord', () => {
  test('recognizes all 5 hardcoded dynamic gesture words', () => {
    expect(isDynamicGestureWord('belajar')).toBe(true)
    expect(isDynamicGestureWord('maaf')).toBe(true)
    expect(isDynamicGestureWord('seperti')).toBe(true)
    expect(isDynamicGestureWord('terima kasih')).toBe(true)
    expect(isDynamicGestureWord('tolong')).toBe(true)
  })

  test('returns false for a regular vocab word', () => {
    expect(isDynamicGestureWord('kucing')).toBe(false)
  })
})

describe('classifyFallbackAnyResponse', () => {
  test('exact match found', () => {
    const outcome = classifyFallbackAnyResponse({
      found: true,
      word: { text: 'kucing', category: 'hewan' },
      suggested_word: null,
      explanation: null,
    })
    expect(outcome).toEqual({ kind: 'found', word: 'kucing', category: 'hewan' })
  })

  test('fuzzy/LLM suggestion', () => {
    const outcome = classifyFallbackAnyResponse({
      found: false,
      word: null,
      suggested_word: 'kucing',
      explanation: 'Kucing adalah hewan peliharaan.',
    })
    expect(outcome).toEqual({
      kind: 'suggestion',
      suggestedWord: 'kucing',
      explanation: 'Kucing adalah hewan peliharaan.',
    })
  })

  test('not found at all', () => {
    const outcome = classifyFallbackAnyResponse({
      found: false,
      word: null,
      suggested_word: null,
      explanation: 'Kata belum tersedia dalam kamus kami.',
    })
    expect(outcome).toEqual({ kind: 'not_found', explanation: 'Kata belum tersedia dalam kamus kami.' })
  })
})

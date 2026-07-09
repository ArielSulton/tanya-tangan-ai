import { describe, expect, test } from 'bun:test'
import {
  addToken,
  compareToTarget,
  isDynamicGestureWord,
  removeTokenAt,
  resetTokens,
  validateSentenceSyntax,
} from './sentence-composer'

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

describe('validateSentenceSyntax', () => {
  test('empty sentence is valid', () => {
    expect(validateSentenceSyntax([])).toEqual({ valid: true, reason: null })
  })

  test('single noun is valid', () => {
    const tokens = [{ word: 'kucing', category: 'hewan' }]
    expect(validateSentenceSyntax(tokens)).toEqual({ valid: true, reason: null })
  })

  test('noun-dan-noun is valid', () => {
    const tokens = [
      { word: 'kucing', category: 'hewan' },
      { word: 'dan', category: 'kata_keterangan' },
      { word: 'gajah', category: 'hewan' },
    ]
    expect(validateSentenceSyntax(tokens)).toEqual({ valid: true, reason: null })
  })

  test('noun-yang-modifier is valid', () => {
    const tokens = [
      { word: 'apel', category: 'benda' },
      { word: 'yang', category: 'kata_keterangan' },
      { word: 'besar', category: 'kata_keterangan' },
    ]
    expect(validateSentenceSyntax(tokens)).toEqual({ valid: true, reason: null })
  })

  test('sentence starting with a connector is invalid', () => {
    const tokens = [
      { word: 'dan', category: 'kata_keterangan' },
      { word: 'kucing', category: 'hewan' },
    ]
    expect(validateSentenceSyntax(tokens)).toEqual({
      valid: false,
      reason: 'Kalimat tidak boleh diawali kata sambung "dan".',
    })
  })

  test('sentence ending with a connector is invalid', () => {
    const tokens = [
      { word: 'kucing', category: 'hewan' },
      { word: 'yang', category: 'kata_keterangan' },
    ]
    expect(validateSentenceSyntax(tokens)).toEqual({
      valid: false,
      reason: 'Kalimat tidak boleh diakhiri kata sambung "yang".',
    })
  })

  test('two consecutive connectors is invalid', () => {
    const tokens = [
      { word: 'kucing', category: 'hewan' },
      { word: 'dan', category: 'kata_keterangan' },
      { word: 'yang', category: 'kata_keterangan' },
      { word: 'gajah', category: 'hewan' },
    ]
    expect(validateSentenceSyntax(tokens)).toEqual({
      valid: false,
      reason: 'Dua kata sambung "dan" dan "yang" tidak boleh berurutan.',
    })
  })
})

describe('compareToTarget', () => {
  test('every word matches → every result is correct', () => {
    const result = compareToTarget(['kucing', 'dan', 'gajah'], ['kucing', 'dan', 'gajah'])
    expect(result).toEqual([
      { index: 0, word: 'kucing', correct: true },
      { index: 1, word: 'dan', correct: true },
      { index: 2, word: 'gajah', correct: true },
    ])
  })

  test('every word differs → every result is incorrect', () => {
    const result = compareToTarget(['a', 'b', 'c'], ['x', 'y', 'z'])
    expect(result).toEqual([
      { index: 0, word: 'a', correct: false },
      { index: 1, word: 'b', correct: false },
      { index: 2, word: 'c', correct: false },
    ])
  })

  test('partial match → mixed correct/incorrect per position', () => {
    const result = compareToTarget(['kucing', 'yang', 'besar'], ['kucing', 'besar', 'yang'])
    expect(result).toEqual([
      { index: 0, word: 'kucing', correct: true },
      { index: 1, word: 'yang', correct: false },
      { index: 2, word: 'besar', correct: false },
    ])
  })

  test('shorter submitted list only compares up to its own length', () => {
    const result = compareToTarget(['kucing'], ['kucing', 'dan', 'gajah'])
    expect(result).toEqual([{ index: 0, word: 'kucing', correct: true }])
  })
})

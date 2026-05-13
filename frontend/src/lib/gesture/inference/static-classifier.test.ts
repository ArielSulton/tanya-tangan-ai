import { describe, expect, test } from 'bun:test'
import { argmax, softmaxToResult } from './static-classifier'

describe('argmax', () => {
  test('returns the index of the largest value', () => {
    expect(argmax([0.1, 0.5, 0.3, 0.1])).toBe(1)
  })

  test('ties go to the lowest index', () => {
    expect(argmax([0.4, 0.4, 0.2])).toBe(0)
  })

  test('throws on empty input', () => {
    expect(() => argmax([])).toThrow(/empty/)
  })
})

describe('softmaxToResult', () => {
  test('returns label+confidence from softmax probs and labels', () => {
    const probs = [0.1, 0.7, 0.2]
    const labels = ['A', 'B', 'C']
    const r = softmaxToResult(probs, labels)
    expect(r.label).toBe('B')
    expect(r.confidence).toBeCloseTo(0.7, 6)
  })

  test('returns null when max confidence is below threshold', () => {
    const probs = [0.33, 0.34, 0.33]
    const labels = ['A', 'B', 'C']
    const r = softmaxToResult(probs, labels, 0.5)
    expect(r).toBeNull()
  })

  test('default threshold of 0 always returns a result for non-empty probs', () => {
    const probs = [0.33, 0.34, 0.33]
    const labels = ['A', 'B', 'C']
    const r = softmaxToResult(probs, labels)
    expect(r).not.toBeNull()
    expect(r!.label).toBe('B')
  })

  test('throws when probs and labels lengths mismatch', () => {
    expect(() => softmaxToResult([0.5, 0.5], ['A'])).toThrow(/mismatch/)
  })
})

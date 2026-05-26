import { describe, expect, test } from 'bun:test'
import { decideYoloEmission, type YoloDedupeState } from './yolo-validation'

const fresh: YoloDedupeState = { lastEmittedLetter: null }

describe('decideYoloEmission', () => {
  test('emits when backend validated and letter not yet emitted', () => {
    const r = decideYoloEmission(fresh, 'A', true)
    expect(r.validated).toBe(true)
    expect(r.nextState.lastEmittedLetter).toBe('A')
  })

  test('does NOT re-emit the same held letter on subsequent validated frames', () => {
    const r = decideYoloEmission({ lastEmittedLetter: 'A' }, 'A', true)
    expect(r.validated).toBe(false)
    expect(r.nextState.lastEmittedLetter).toBe('A')
  })

  test('does not emit when backend has not validated yet', () => {
    const r = decideYoloEmission(fresh, 'A', false)
    expect(r.validated).toBe(false)
    expect(r.nextState.lastEmittedLetter).toBeNull()
  })

  test('clears latch when a different letter appears, then emits it once validated', () => {
    const r = decideYoloEmission({ lastEmittedLetter: 'A' }, 'B', true)
    expect(r.validated).toBe(true)
    expect(r.nextState.lastEmittedLetter).toBe('B')
  })

  test('different letter not-yet-validated clears latch but does not emit', () => {
    const r = decideYoloEmission({ lastEmittedLetter: 'A' }, 'B', false)
    expect(r.validated).toBe(false)
    expect(r.nextState.lastEmittedLetter).toBeNull()
  })
})

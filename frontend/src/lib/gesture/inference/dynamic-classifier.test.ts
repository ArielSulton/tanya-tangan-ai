import { describe, expect, test } from 'bun:test'
import { historyToFeatures } from './dynamic-classifier'
import { DYNAMIC_HISTORY_SIZE, DYNAMIC_FEATURE_LENGTH } from '../recording/types'

describe('historyToFeatures', () => {
  test('flattens an N-frame history into 2N floats interleaved x,y', () => {
    const history = Array.from({ length: DYNAMIC_HISTORY_SIZE }, (_, i) => ({ x: i, y: i * 2 }))
    const feats = historyToFeatures(history)
    expect(feats).toHaveLength(DYNAMIC_FEATURE_LENGTH)
    expect(feats[0]).toBe(0) // x0
    expect(feats[1]).toBe(0) // y0
    expect(feats[2]).toBe(1) // x1
    expect(feats[3]).toBe(2) // y1
    const lastIdx = DYNAMIC_HISTORY_SIZE - 1
    expect(feats[2 * lastIdx]).toBe(lastIdx)
    expect(feats[2 * lastIdx + 1]).toBe(lastIdx * 2)
  })

  test('throws when history length does not match DYNAMIC_HISTORY_SIZE', () => {
    expect(() => historyToFeatures([{ x: 0, y: 0 }])).toThrow(new RegExp(String(DYNAMIC_HISTORY_SIZE)))
  })
})

import { describe, expect, test } from 'bun:test'
import { historyToFeatures } from './dynamic-classifier'

describe('historyToFeatures', () => {
  test('flattens 24-frame history into 48 floats interleaved x,y', () => {
    const history = Array.from({ length: 24 }, (_, i) => ({ x: i, y: i * 2 }))
    const feats = historyToFeatures(history)
    expect(feats).toHaveLength(48)
    expect(feats[0]).toBe(0) // x0
    expect(feats[1]).toBe(0) // y0
    expect(feats[2]).toBe(1) // x1
    expect(feats[3]).toBe(2) // y1
    expect(feats[46]).toBe(23) // x23
    expect(feats[47]).toBe(46) // y23
  })

  test('throws when history length is not 24', () => {
    expect(() => historyToFeatures([{ x: 0, y: 0 }])).toThrow(/24/)
  })
})

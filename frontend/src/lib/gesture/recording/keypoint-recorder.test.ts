import { describe, expect, test } from 'bun:test'
import { captureStaticSample } from './keypoint-recorder'
import type { HandPair, NormalizedHand } from '../types'

function makeHand(seed: number): NormalizedHand {
  return {
    landmarks: Array.from({ length: 21 }, (_, i) => ({ x: seed + i, y: seed - i, z: 0 })),
    confidence: 1,
  }
}

describe('captureStaticSample', () => {
  test('returns 84-float features + label + uuid id + timestamp', () => {
    const pair: HandPair = [makeHand(1), null]
    const sample = captureStaticSample(pair, 'A', 'manual')
    expect(sample.label).toBe('A')
    expect(sample.features).toHaveLength(84)
    expect(sample.source).toBe('manual')
    expect(typeof sample.id).toBe('string')
    expect(sample.id.length).toBeGreaterThan(0)
    expect(sample.capturedAt).toBeGreaterThan(0)
  })

  test('zero-fills slot 1 when only one hand is present', () => {
    const pair: HandPair = [makeHand(1), null]
    const sample = captureStaticSample(pair, 'A', 'manual')
    for (let i = 42; i < 84; i++) {
      expect(sample.features[i]).toBe(0)
    }
    expect(sample.features[0]).toBe(1) // slot0 x0
  })

  test('records source = yolo-auto when specified', () => {
    const pair: HandPair = [makeHand(1), null]
    const sample = captureStaticSample(pair, 'A', 'yolo-auto')
    expect(sample.source).toBe('yolo-auto')
  })
})

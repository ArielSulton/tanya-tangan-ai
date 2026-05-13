import { describe, expect, test } from 'bun:test'
import { extractFrameFeatures } from './feature-extractor'
import type { HandPair, NormalizedHand } from './types'

function fakeHand(seed: number): NormalizedHand {
  return {
    landmarks: Array.from({ length: 21 }, (_, i) => ({ x: seed + i, y: seed - i, z: 0 })),
    confidence: 1,
  }
}

describe('extractFrameFeatures', () => {
  test('both slots null → 84 zeros', () => {
    const pair: HandPair = [null, null]
    const features = extractFrameFeatures(pair)
    expect(features).toHaveLength(84)
    expect(features.every((v) => v === 0)).toBe(true)
  })

  test('only slot 0 populated → slot 1 region is zero', () => {
    const pair: HandPair = [fakeHand(1), null]
    const features = extractFrameFeatures(pair)
    expect(features).toHaveLength(84)
    // Slot 0: first 42 floats
    expect(features[0]).toBe(1) // x0
    expect(features[1]).toBe(1) // y0
    // Slot 1: last 42 floats — all zero
    for (let i = 42; i < 84; i++) {
      expect(features[i]).toBe(0)
    }
  })

  test('only slot 1 populated → slot 0 region is zero', () => {
    const pair: HandPair = [null, fakeHand(10)]
    const features = extractFrameFeatures(pair)
    for (let i = 0; i < 42; i++) {
      expect(features[i]).toBe(0)
    }
    expect(features[42]).toBe(10) // slot 1 x0
    expect(features[43]).toBe(10) // slot 1 y0
  })

  test('both slots populated → layout is [slot0_xy_pairs, slot1_xy_pairs]', () => {
    const a = fakeHand(1)
    const b = fakeHand(100)
    const pair: HandPair = [a, b]
    const features = extractFrameFeatures(pair)
    expect(features).toHaveLength(84)
    // First landmark of slot 0
    expect(features[0]).toBe(a.landmarks[0].x)
    expect(features[1]).toBe(a.landmarks[0].y)
    // Last landmark of slot 0 (id 20) → index 40 (x) and 41 (y)
    expect(features[40]).toBe(a.landmarks[20].x)
    expect(features[41]).toBe(a.landmarks[20].y)
    // First landmark of slot 1 → index 42 (x), 43 (y)
    expect(features[42]).toBe(b.landmarks[0].x)
    expect(features[43]).toBe(b.landmarks[0].y)
    // Last landmark of slot 1 → index 82, 83
    expect(features[82]).toBe(b.landmarks[20].x)
    expect(features[83]).toBe(b.landmarks[20].y)
  })

  test('z is dropped (only x and y included)', () => {
    const hand: NormalizedHand = {
      landmarks: Array.from({ length: 21 }, () => ({ x: 1, y: 2, z: 999 })),
      confidence: 1,
    }
    const features = extractFrameFeatures([hand, null])
    // Should never see 999 anywhere
    expect(features.includes(999)).toBe(false)
  })
})

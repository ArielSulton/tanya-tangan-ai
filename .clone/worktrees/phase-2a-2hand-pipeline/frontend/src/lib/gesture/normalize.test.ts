import { describe, expect, test } from 'bun:test'
import { normalizeHand } from './normalize'
import type { RawHand } from './types'

function makeHand(points: Array<[number, number]>): RawHand {
  return {
    landmarks: points.map(([x, y]) => ({ x, y, z: 0 })),
    confidence: 1,
  }
}

describe('normalizeHand', () => {
  test('places wrist (landmark 0) at the origin', () => {
    // 21 landmarks, all with z=0, arbitrary positions but wrist at (100, 200)
    const points: Array<[number, number]> = Array.from({ length: 21 }, (_, i) => [
      100 + i,
      200 + i,
    ])
    const result = normalizeHand(makeHand(points))
    expect(result.landmarks[0].x).toBeCloseTo(0, 6)
    expect(result.landmarks[0].y).toBeCloseTo(0, 6)
  })

  test('scales so wrist→middle-MCP distance equals 1', () => {
    // wrist at (0,0); middle-MCP (id 9) at (3,4) → distance 5
    const points: Array<[number, number]> = Array.from({ length: 21 }, () => [0, 0])
    points[0] = [0, 0]
    points[9] = [3, 4]
    const result = normalizeHand(makeHand(points))
    const m = result.landmarks[9]
    const palmDist = Math.sqrt(m.x * m.x + m.y * m.y)
    expect(palmDist).toBeCloseTo(1, 6)
  })

  test('is invariant to translation', () => {
    const base: Array<[number, number]> = Array.from({ length: 21 }, (_, i) => [i, i * 2])
    const translated: Array<[number, number]> = base.map(([x, y]) => [x + 500, y - 300])
    const a = normalizeHand(makeHand(base))
    const b = normalizeHand(makeHand(translated))
    for (let i = 0; i < 21; i++) {
      expect(a.landmarks[i].x).toBeCloseTo(b.landmarks[i].x, 5)
      expect(a.landmarks[i].y).toBeCloseTo(b.landmarks[i].y, 5)
    }
  })

  test('is invariant to uniform scale', () => {
    const base: Array<[number, number]> = Array.from({ length: 21 }, (_, i) => [i + 1, i * 2 + 1])
    const scaled: Array<[number, number]> = base.map(([x, y]) => [x * 3, y * 3])
    const a = normalizeHand(makeHand(base))
    const b = normalizeHand(makeHand(scaled))
    for (let i = 0; i < 21; i++) {
      expect(a.landmarks[i].x).toBeCloseTo(b.landmarks[i].x, 5)
      expect(a.landmarks[i].y).toBeCloseTo(b.landmarks[i].y, 5)
    }
  })

  test('preserves confidence', () => {
    const points: Array<[number, number]> = Array.from({ length: 21 }, () => [1, 1])
    const result = normalizeHand({ ...makeHand(points), confidence: 0.42 })
    expect(result.confidence).toBe(0.42)
  })
})

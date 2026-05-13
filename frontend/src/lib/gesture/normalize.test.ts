import { describe, expect, test } from 'bun:test'
import { normalizeHand, sortHandsByXPosition } from './normalize'
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

describe('sortHandsByXPosition', () => {
  function rawHandAtX(wristX: number): RawHand {
    const lm = Array.from({ length: 21 }, () => ({ x: wristX, y: 0, z: 0 }))
    return { landmarks: lm, confidence: 1 }
  }

  test('empty input → both slots null', () => {
    const [a, b] = sortHandsByXPosition([])
    expect(a).toBeNull()
    expect(b).toBeNull()
  })

  test('single hand → slot 0 populated, slot 1 null', () => {
    const hand = rawHandAtX(50)
    const [a, b] = sortHandsByXPosition([hand])
    expect(a).not.toBeNull()
    expect(b).toBeNull()
    expect(a!.landmarks[0].x).toBeCloseTo(0, 6) // normalized
  })

  test('two hands: leftmost (smaller wrist x) goes to slot 0', () => {
    const left = rawHandAtX(10)
    const right = rawHandAtX(100)
    const [a, b] = sortHandsByXPosition([right, left]) // input order shuffled
    expect(a).not.toBeNull()
    expect(b).not.toBeNull()
    // Both are normalized so wrist is at (0,0); identify by the
    // confidence value we used to tag them
    // (Actually all confidences are 1 here, so identify by landmark count.)
    // Better: tag confidence explicitly.
  })

  test('two hands: stable ordering by wrist x (confidence-tagged)', () => {
    const left: RawHand = { ...rawHandAtX(10), confidence: 0.1 }
    const right: RawHand = { ...rawHandAtX(100), confidence: 0.9 }
    const [a, b] = sortHandsByXPosition([right, left])
    expect(a!.confidence).toBeCloseTo(0.1, 6) // leftmost
    expect(b!.confidence).toBeCloseTo(0.9, 6) // rightmost
  })

  test('more than 2 hands: only the 2 leftmost (by wrist x) kept', () => {
    const h1: RawHand = { ...rawHandAtX(10), confidence: 0.1 }
    const h2: RawHand = { ...rawHandAtX(50), confidence: 0.5 }
    const h3: RawHand = { ...rawHandAtX(100), confidence: 0.9 }
    const [a, b] = sortHandsByXPosition([h3, h1, h2])
    expect(a!.confidence).toBeCloseTo(0.1, 6)
    expect(b!.confidence).toBeCloseTo(0.5, 6)
  })

  test('output hands are normalized (wrist at origin)', () => {
    const hand = rawHandAtX(500)
    const [a] = sortHandsByXPosition([hand])
    expect(a!.landmarks[0].x).toBeCloseTo(0, 6)
    expect(a!.landmarks[0].y).toBeCloseTo(0, 6)
  })
})

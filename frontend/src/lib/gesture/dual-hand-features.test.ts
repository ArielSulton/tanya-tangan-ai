import { describe, expect, test } from 'bun:test'
import { buildDualHandFrame, FEATURE_DIM } from './dual-hand-features'
import type { RawHand, RawHandLandmark } from './types'

function makeHand(overrides: Partial<Record<number, Partial<RawHandLandmark>>>, handedness?: 'Left' | 'Right'): RawHand {
  const landmarks: RawHandLandmark[] = Array.from({ length: 21 }, (_, i) => ({
    x: overrides[i]?.x ?? 1,
    y: overrides[i]?.y ?? 1,
    z: overrides[i]?.z ?? 1,
  }))
  return { landmarks, confidence: 0.9, handedness }
}

describe('buildDualHandFrame', () => {
  test('no hands → 127 floats, numHands=0, both blocks zero', () => {
    const out = buildDualHandFrame([])
    expect(out).toHaveLength(FEATURE_DIM)
    expect(out[0]).toBe(0)
    expect(out.slice(1)).toEqual(new Array(126).fill(0))
  })

  test('single hand labelled Right fills the right block, numHands=1', () => {
    const hand = makeHand({ 0: { x: 0, y: 0, z: 0 }, 5: { x: 2, y: 0, z: 0 } }, 'Right')
    const out = buildDualHandFrame([hand])
    expect(out).toHaveLength(FEATURE_DIM)
    expect(out[0]).toBe(1)
    // right block occupies indices [1, 64); left block [64, 127) must be all zero.
    expect(out.slice(64, 127)).toEqual(new Array(63).fill(0))
    // right block must NOT be all zero (hand had non-degenerate spread).
    expect(out.slice(1, 64).some((v) => v !== 0)).toBe(true)
  })

  test('single hand labelled Left fills the left block, right block stays zero', () => {
    const hand = makeHand({ 0: { x: 0, y: 0, z: 0 }, 5: { x: 2, y: 0, z: 0 } }, 'Left')
    const out = buildDualHandFrame([hand])
    expect(out[0]).toBe(1)
    expect(out.slice(1, 64)).toEqual(new Array(63).fill(0))
    expect(out.slice(64, 127).some((v) => v !== 0)).toBe(true)
  })

  test('two hands (Right + Left) fill both blocks, numHands=2', () => {
    const right = makeHand({ 0: { x: 0, y: 0, z: 0 }, 5: { x: 2, y: 0, z: 0 } }, 'Right')
    const left = makeHand({ 0: { x: 5, y: 5, z: 0 }, 5: { x: 7, y: 5, z: 0 } }, 'Left')
    const out = buildDualHandFrame([right, left])
    expect(out[0]).toBe(2)
    expect(out.slice(1, 64).some((v) => v !== 0)).toBe(true)
    expect(out.slice(64, 127).some((v) => v !== 0)).toBe(true)
  })

  test('hand with no handedness label: first fills right slot, second fills left', () => {
    const a = makeHand({ 0: { x: 0, y: 0, z: 0 }, 5: { x: 2, y: 0, z: 0 } })
    const b = makeHand({ 0: { x: 9, y: 9, z: 0 }, 5: { x: 11, y: 9, z: 0 } })
    const out = buildDualHandFrame([a, b])
    expect(out[0]).toBe(2)
    expect(out.slice(1, 64).some((v) => v !== 0)).toBe(true)
    expect(out.slice(64, 127).some((v) => v !== 0)).toBe(true)
  })

  test('wrist landmark always normalizes to (0,0,0) within a hand block', () => {
    const hand = makeHand({ 0: { x: 3, y: 4, z: 5 }, 5: { x: 5, y: 4, z: 5 } }, 'Right')
    const out = buildDualHandFrame([hand])
    // right block: 21 landmarks x (x,y,z), landmark 0 (wrist) is the first 3 values.
    expect(out[1]).toBeCloseTo(0, 10)
    expect(out[2]).toBeCloseTo(0, 10)
    expect(out[3]).toBeCloseTo(0, 10)
  })

  test('degenerate hand (all landmarks identical, zero spread) normalizes to all zeros', () => {
    const hand = makeHand({}, 'Right') // every landmark defaults to (1,1,1) — zero spread
    const out = buildDualHandFrame([hand])
    expect(out[0]).toBe(1) // still counted as a detected hand...
    expect(out.slice(1, 64)).toEqual(new Array(63).fill(0)) // ...but block is zero-filled (degenerate scale)
  })
})

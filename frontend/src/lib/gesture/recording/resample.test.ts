import { describe, expect, test } from 'bun:test'
import { resampleToN, type TimedPoint } from './resample'

describe('resampleToN', () => {
  test('empty buffer → empty output', () => {
    expect(resampleToN([], 32, 1500)).toHaveLength(0)
  })

  test('single point → n copies of that point', () => {
    const out = resampleToN([{ x: 10, y: 20, t: 0 }], 4, 1000)
    expect(out).toHaveLength(4)
    for (const p of out) {
      expect(p.x).toBe(10)
      expect(p.y).toBe(20)
    }
  })

  test('linear path resamples to evenly-spaced points', () => {
    // 3 raw points spanning 1s, linear in both x and y.
    const buf: TimedPoint[] = [
      { x: 0, y: 0, t: 0 },
      { x: 50, y: 100, t: 500 },
      { x: 100, y: 200, t: 1000 },
    ]
    const out = resampleToN(buf, 5, 1000)
    expect(out).toHaveLength(5)
    // i=0 → 0% along: (0,0); i=4 → 100% along: (100,200); midpoint i=2 → (50,100)
    expect(out[0].x).toBeCloseTo(0, 5)
    expect(out[0].y).toBeCloseTo(0, 5)
    expect(out[2].x).toBeCloseTo(50, 5)
    expect(out[2].y).toBeCloseTo(100, 5)
    expect(out[4].x).toBeCloseTo(100, 5)
    expect(out[4].y).toBeCloseTo(200, 5)
  })

  test('non-uniform timestamps still produce uniform-time output', () => {
    // Two samples clustered early, one late → linear-interp should still
    // place output[i] at t = i/(n-1) * duration along the original path.
    const buf: TimedPoint[] = [
      { x: 0, y: 0, t: 0 },
      { x: 10, y: 0, t: 100 }, // very early second point
      { x: 100, y: 0, t: 1000 },
    ]
    const out = resampleToN(buf, 3, 1000)
    // i=1 → targetT = 500 ms. Between t=100 (x=10) and t=1000 (x=100).
    // frac = (500-100)/(1000-100) = 400/900 ≈ 0.4444
    // x = 10 + 0.4444 * (100-10) = 10 + 40 = 50
    expect(out[1].x).toBeCloseTo(50, 3)
  })

  test('out-of-range target time clamps to last point', () => {
    // Duration says 2000ms but buffer only spans 500ms — i=last would project
    // past the buffer. Should clamp instead of NaN.
    const buf: TimedPoint[] = [
      { x: 0, y: 0, t: 0 },
      { x: 50, y: 50, t: 500 },
    ]
    const out = resampleToN(buf, 4, 2000)
    expect(out).toHaveLength(4)
    // Last few outputs are past the buffer; clamp to last (50,50).
    expect(out[3].x).toBe(50)
    expect(out[3].y).toBe(50)
  })
})

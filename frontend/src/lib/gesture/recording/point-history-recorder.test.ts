import { describe, expect, test } from 'bun:test'
import { PointHistoryRecorder } from './point-history-recorder'
import { DYNAMIC_HISTORY_SIZE } from './types'
import { DYNAMIC_BUFFER_DURATION_MS } from './resample'

// Test clock helper — lets us simulate any FPS without sleeping.
function makeClock() {
  let t = 0
  return {
    now: () => t,
    advance: (ms: number) => {
      t += ms
    },
  }
}

describe('PointHistoryRecorder', () => {
  test('buffer freezes once the duration window fills', () => {
    const clock = makeClock()
    const r = new PointHistoryRecorder(clock.now)
    // Push 100 points at 30fps (~33ms apart) — covers ~3.3s but the buffer
    // should freeze at the first point that brings durationMs past 1.5s.
    for (let i = 0; i < 100; i++) {
      r.push({ x: i, y: -i })
      clock.advance(33)
    }
    expect(r.durationMs).toBeGreaterThanOrEqual(DYNAMIC_BUFFER_DURATION_MS)
    expect(r.durationMs).toBeLessThan(DYNAMIC_BUFFER_DURATION_MS + 100)
    // First frame preserved: buffer should contain the x=0 anchor.
    // (Can't access buffer directly, but takeSample resamples from t=0 so
    // first output point reflects the first push.)
    const s = r.takeSample('jeruk')
    expect(s.history[0].x).toBeCloseTo(0, 5)
    expect(s.history[0].y).toBeCloseTo(0, 5)
  })

  test('frozen buffer ignores further pushes until reset', () => {
    const clock = makeClock()
    const r = new PointHistoryRecorder(clock.now)
    // Fill the buffer.
    for (let i = 0; i < 60; i++) {
      r.push({ x: i, y: i })
      clock.advance(33)
    }
    const sizeAfterFill = r.size
    const durAfterFill = r.durationMs
    // Continue pushing — should be ignored.
    for (let i = 100; i < 130; i++) {
      r.push({ x: i, y: i })
      clock.advance(33)
    }
    expect(r.size).toBe(sizeAfterFill)
    expect(r.durationMs).toBe(durAfterFill)
  })

  test('takeSample on under-duration buffer rejects', () => {
    const clock = makeClock()
    const r = new PointHistoryRecorder(clock.now)
    // Only 500ms of data — under the 1500ms threshold.
    for (let i = 0; i < 16; i++) {
      r.push({ x: i, y: i })
      clock.advance(33)
    }
    expect(() => r.takeSample('jeruk')).toThrow(/buffer/)
  })

  test('null pushes are skipped', () => {
    const clock = makeClock()
    const r = new PointHistoryRecorder(clock.now)
    // Half the pushes null — only valid ones land in buffer. We just verify
    // some valid pushes accumulated and trim still bounds the span roughly
    // to the target window.
    for (let i = 0; i < 60; i++) {
      r.push(i % 2 === 0 ? null : { x: i, y: i })
      clock.advance(33)
    }
    expect(r.size).toBeGreaterThan(0)
    // Spread between valid pushes is ~66ms (every other tick). Span bounded
    // to roughly the window — allow up to 2× the tick interval of slack.
    expect(r.durationMs).toBeLessThan(DYNAMIC_BUFFER_DURATION_MS + 200)
  })

  test('reset() empties the buffer', () => {
    const clock = makeClock()
    const r = new PointHistoryRecorder(clock.now)
    for (let i = 0; i < 50; i++) {
      r.push({ x: i, y: i })
      clock.advance(33)
    }
    r.reset()
    expect(r.size).toBe(0)
    expect(r.durationMs).toBe(0)
  })

  test('takeSample on full-duration buffer produces DYNAMIC_HISTORY_SIZE uniform points', () => {
    const clock = makeClock()
    const r = new PointHistoryRecorder(clock.now)
    // Push for slightly more than the window so we exceed it.
    for (let i = 0; i < 60; i++) {
      r.push({ x: i, y: i })
      clock.advance(33) // ~30fps
    }
    const s = r.takeSample('jeruk')
    expect(s.label).toBe('jeruk')
    expect(s.source).toBe('manual')
    expect(s.history).toHaveLength(DYNAMIC_HISTORY_SIZE)
    expect(typeof s.id).toBe('string')
    expect(s.capturedAt).toBeGreaterThan(0)
    // Sanity: linear push of x=i means resampled output is monotonic in x.
    for (let i = 1; i < s.history.length; i++) {
      expect(s.history[i].x).toBeGreaterThanOrEqual(s.history[i - 1].x)
    }
  })
})

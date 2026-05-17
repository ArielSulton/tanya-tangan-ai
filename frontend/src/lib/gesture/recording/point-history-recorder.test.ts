import { describe, expect, test } from 'bun:test'
import { PointHistoryRecorder } from './point-history-recorder'
import { DYNAMIC_HISTORY_SIZE } from './types'
import { DYNAMIC_BUFFER_DURATION_MS } from './resample'

// Test clock helper — lets us simulate any FPS without sleeping.
function makeClock() {
  let t = 0
  return { now: () => t, advance: (ms: number) => { t += ms } }
}

describe('PointHistoryRecorder', () => {
  test('buffer trims to the duration window', () => {
    const clock = makeClock()
    const r = new PointHistoryRecorder(clock.now)
    // Push 100 points at 30fps (~33ms apart) — covers ~3.3s but window is 1.5s,
    // so older points should drop out.
    for (let i = 0; i < 100; i++) {
      r.push({ x: i, y: -i })
      clock.advance(33)
    }
    // Trim policy keeps span slightly OVER the target duration (within one
    // tick interval) so durationMs reliably crosses the threshold for save.
    expect(r.durationMs).toBeGreaterThanOrEqual(DYNAMIC_BUFFER_DURATION_MS)
    expect(r.durationMs).toBeLessThan(DYNAMIC_BUFFER_DURATION_MS + 100)
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

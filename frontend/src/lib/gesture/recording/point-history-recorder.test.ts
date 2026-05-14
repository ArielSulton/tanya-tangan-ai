import { describe, expect, test } from 'bun:test'
import { PointHistoryRecorder } from './point-history-recorder'
import { DYNAMIC_HISTORY_SIZE } from './types'

const N = DYNAMIC_HISTORY_SIZE
const RE_N = new RegExp(String(N))

describe('PointHistoryRecorder', () => {
  test(`buffer fills to capacity ${N}`, () => {
    const r = new PointHistoryRecorder()
    for (let i = 0; i < N + 6; i++) r.push({ x: i, y: -i })
    const sample = r.takeSample('jeruk')
    expect(sample.history).toHaveLength(N)
    // The last N pushes are kept: x = 6..(N+5)
    expect(sample.history[0]).toEqual({ x: 6, y: -6 })
    expect(sample.history[N - 1]).toEqual({ x: N + 5, y: -(N + 5) })
  })

  test('takeSample on partial buffer rejects', () => {
    const r = new PointHistoryRecorder()
    for (let i = 0; i < 10; i++) r.push({ x: i, y: i })
    expect(() => r.takeSample('jeruk')).toThrow(RE_N)
  })

  test('null pushes are skipped (no-op)', () => {
    const r = new PointHistoryRecorder()
    for (let i = 0; i < N; i++) {
      r.push(i % 2 === 0 ? null : { x: i, y: i })
    }
    expect(() => r.takeSample('jeruk')).toThrow(RE_N)
  })

  test('reset() empties the buffer', () => {
    const r = new PointHistoryRecorder()
    for (let i = 0; i < N; i++) r.push({ x: i, y: i })
    r.reset()
    expect(() => r.takeSample('jeruk')).toThrow(RE_N)
  })

  test('produced sample has id, timestamp, source manual', () => {
    const r = new PointHistoryRecorder()
    for (let i = 0; i < N; i++) r.push({ x: i, y: i })
    const s = r.takeSample('jeruk')
    expect(s.label).toBe('jeruk')
    expect(s.source).toBe('manual')
    expect(typeof s.id).toBe('string')
    expect(s.capturedAt).toBeGreaterThan(0)
  })
})

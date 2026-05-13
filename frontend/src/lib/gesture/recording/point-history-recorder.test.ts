import { describe, expect, test } from 'bun:test'
import { PointHistoryRecorder } from './point-history-recorder'

describe('PointHistoryRecorder', () => {
  test('buffer fills to capacity 24', () => {
    const r = new PointHistoryRecorder()
    for (let i = 0; i < 30; i++) r.push({ x: i, y: -i })
    const sample = r.takeSample('jeruk')
    expect(sample.history).toHaveLength(24)
    // The last 24 pushes are kept: x=6..29
    expect(sample.history[0]).toEqual({ x: 6, y: -6 })
    expect(sample.history[23]).toEqual({ x: 29, y: -29 })
  })

  test('takeSample on partial buffer rejects', () => {
    const r = new PointHistoryRecorder()
    for (let i = 0; i < 10; i++) r.push({ x: i, y: i })
    expect(() => r.takeSample('jeruk')).toThrow(/24/)
  })

  test('null pushes are skipped (no-op)', () => {
    const r = new PointHistoryRecorder()
    for (let i = 0; i < 24; i++) {
      r.push(i % 2 === 0 ? null : { x: i, y: i })
    }
    expect(() => r.takeSample('jeruk')).toThrow(/24/)
  })

  test('reset() empties the buffer', () => {
    const r = new PointHistoryRecorder()
    for (let i = 0; i < 24; i++) r.push({ x: i, y: i })
    r.reset()
    expect(() => r.takeSample('jeruk')).toThrow(/24/)
  })

  test('produced sample has id, timestamp, source manual', () => {
    const r = new PointHistoryRecorder()
    for (let i = 0; i < 24; i++) r.push({ x: i, y: i })
    const s = r.takeSample('jeruk')
    expect(s.label).toBe('jeruk')
    expect(s.source).toBe('manual')
    expect(typeof s.id).toBe('string')
    expect(s.capturedAt).toBeGreaterThan(0)
  })
})

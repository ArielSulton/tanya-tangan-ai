import { describe, expect, test } from 'bun:test'
import { computeSampleTimestamps } from './video-frame-sampler'

describe('computeSampleTimestamps', () => {
  test('returns empty array for zero duration', () => {
    expect(computeSampleTimestamps(0, 150)).toEqual([])
  })

  test('returns empty array for negative duration', () => {
    expect(computeSampleTimestamps(-1, 150)).toEqual([])
  })

  test('returns empty array for non-finite duration (Infinity)', () => {
    expect(computeSampleTimestamps(Infinity, 150)).toEqual([])
  })

  test('returns empty array for NaN duration', () => {
    expect(computeSampleTimestamps(NaN, 150)).toEqual([])
  })

  test('returns empty array for zero interval', () => {
    expect(computeSampleTimestamps(1, 0)).toEqual([])
  })

  test('returns a single timestamp when interval exceeds duration', () => {
    expect(computeSampleTimestamps(0.1, 150)).toEqual([0])
  })

  test('returns evenly spaced timestamps for a normal case', () => {
    // 1 second video, 250ms interval -> 0, 0.25, 0.5, 0.75
    expect(computeSampleTimestamps(1, 250)).toEqual([0, 0.25, 0.5, 0.75])
  })

  test('does not include a timestamp at or beyond duration', () => {
    // 0.9s video, 250ms interval -> 0, 0.25, 0.5, 0.75 (1.0 excluded, > duration)
    expect(computeSampleTimestamps(0.9, 250)).toEqual([0, 0.25, 0.5, 0.75])
  })
})

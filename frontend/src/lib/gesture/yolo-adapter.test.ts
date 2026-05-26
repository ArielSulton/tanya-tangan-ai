import { describe, expect, test } from 'bun:test'
import { adaptYoloResponse } from './yolo-adapter'
import type { YoloRecognizeResponse } from '@/lib/api/gesture-client'

const base: YoloRecognizeResponse = {
  letter: 'A',
  confidence: 0.92,
  alternatives: [{ letter: 'B', confidence: 0.4 }],
  processing_time_ms: 35,
  detected: true,
  validated: true,
  yolo_bbox: { x1: 0.1, y1: 0.1, x2: 0.5, y2: 0.6 },
}

describe('adaptYoloResponse', () => {
  test('maps a detected letter to a static BrowserGestureResult', () => {
    const r = adaptYoloResponse(base)
    expect(r).not.toBeNull()
    expect(r!.letter).toBe('A')
    expect(r!.confidence).toBeCloseTo(0.92, 6)
    expect(r!.source).toBe('yolo')
    expect(r!.gestureType).toBe('static')
    expect(r!.validated).toBe(true)
    expect(r!.alternatives).toEqual([{ letter: 'B', confidence: 0.4 }])
  })

  test('returns null when detected is false', () => {
    expect(adaptYoloResponse({ ...base, detected: false })).toBeNull()
  })

  test('returns null when letter is null', () => {
    expect(adaptYoloResponse({ ...base, letter: null })).toBeNull()
  })

  test('defaults missing alternatives to an empty array', () => {
    const r = adaptYoloResponse({ ...base, alternatives: undefined as never })
    expect(r!.alternatives).toEqual([])
  })

  test('preserves validated:false from the backend', () => {
    const r = adaptYoloResponse({ ...base, validated: false })
    expect(r!.validated).toBe(false)
  })
})

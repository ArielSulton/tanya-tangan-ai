import type { BrowserGestureResult } from './types'
import type { YoloRecognizeResponse } from '@/lib/api/gesture-client'

/**
 * Maps the backend /api/v1/gesture/recognize response into the
 * BrowserGestureResult shape the hook/engine pipeline consumes. Returns null
 * when no hand was detected or no letter was produced (not an error — the
 * caller simply emits nothing that frame). YOLO results are always 'static':
 * the backend maps both letters and word-classes to single emissions.
 */
export function adaptYoloResponse(resp: YoloRecognizeResponse): BrowserGestureResult | null {
  if (!resp.detected || !resp.letter) return null
  return {
    letter: resp.letter,
    confidence: resp.confidence,
    alternatives: resp.alternatives ?? [],
    timestamp: Date.now(),
    processingTimeMs: resp.processing_time_ms ?? 0,
    source: 'yolo',
    gestureType: 'static',
    validated: resp.validated,
  }
}

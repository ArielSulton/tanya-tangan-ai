import type { HandPair } from '../types'
import { extractFrameFeatures } from '../feature-extractor'
import type { StaticSample } from './types'

function genId(): string {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `s-${Date.now()}-${Math.random().toString(36).slice(2)}`
}

/**
 * Capture a static keypoint sample from the current sorted+normalized HandPair.
 * The HandPair must come from sortHandsByXPosition (Phase 2A) so the feature
 * layout matches what the static classifier will see at inference time.
 */
export function captureStaticSample(
  pair: HandPair,
  label: string,
  source: 'manual' | 'yolo-auto',
): StaticSample {
  return {
    id: genId(),
    label,
    features: extractFrameFeatures(pair),
    capturedAt: Date.now(),
    source,
  }
}

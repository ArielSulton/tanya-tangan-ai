import type { RawHand, NormalizedHand } from './types'

const WRIST_INDEX = 0
const MIDDLE_MCP_INDEX = 9
const MIN_PALM_DISTANCE = 1e-6

/**
 * Normalize a hand observation:
 *   1. Translate so the wrist (landmark 0) is at the origin.
 *   2. Scale so the distance from wrist to middle-finger MCP (landmark 9) is 1.
 *
 * If the palm distance is too small (degenerate hand), the scale step is skipped
 * to avoid divide-by-near-zero; only translation is applied.
 *
 * z values are preserved untouched (handpose v0.1.0 reports z=0 anyway).
 */
export function normalizeHand(hand: RawHand): NormalizedHand {
  const wrist = hand.landmarks[WRIST_INDEX]
  const middleMcp = hand.landmarks[MIDDLE_MCP_INDEX]

  const dx = middleMcp.x - wrist.x
  const dy = middleMcp.y - wrist.y
  const palmDistance = Math.sqrt(dx * dx + dy * dy)
  const scale = palmDistance > MIN_PALM_DISTANCE ? 1 / palmDistance : 1

  const landmarks = hand.landmarks.map((p) => ({
    x: (p.x - wrist.x) * scale,
    y: (p.y - wrist.y) * scale,
    z: p.z,
  }))

  return { landmarks, confidence: hand.confidence }
}

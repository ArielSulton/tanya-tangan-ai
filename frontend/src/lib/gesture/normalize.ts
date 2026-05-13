import type { RawHand, NormalizedHand, HandPair } from './types'

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

/**
 * Take up to N raw hand observations, sort them by wrist x-position
 * (ascending: leftmost first), normalize each, and return a [slot0, slot1]
 * pair. Missing slots are null. If more than 2 hands are detected, only
 * the 2 leftmost are kept.
 *
 * The ordering is positional only — slot 0 is "the hand that appears further
 * left in the image", which is NOT necessarily the user's left hand
 * (especially when the camera is flipped). Stability is what the classifier
 * needs; biological handedness can be encoded later if required.
 */
export function sortHandsByXPosition(hands: RawHand[]): HandPair {
  if (hands.length === 0) return [null, null]

  const sorted = [...hands].sort((a, b) => a.landmarks[WRIST_INDEX].x - b.landmarks[WRIST_INDEX].x)
  const slot0 = sorted[0] ? normalizeHand(sorted[0]) : null
  const slot1 = sorted[1] ? normalizeHand(sorted[1]) : null
  return [slot0, slot1]
}

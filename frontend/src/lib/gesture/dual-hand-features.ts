import type { RawHand } from './types'

/** Sequence length the dynamic_v2 GRU model was trained on. */
export const SEQ_LENGTH = 30
/** Per-frame feature vector length: 1 (numHands) + 63 (right hand) + 63 (left hand). */
export const FEATURE_DIM = 127

const NUM_LANDMARKS = 21
const HAND_BLOCK_SIZE = NUM_LANDMARKS * 3 // 63 — x,y,z per landmark
const WRIST_IDX = 0
// Index/middle/ring/pinky MCP — mean wrist-to-knuckle distance is the scale
// factor, matching landmark_features.py's compute_hand_size.
const KNUCKLE_IDXS = [5, 9, 13, 17]
const NORMALIZATION_EPSILON = 1e-6

function isValidHand(hand: RawHand | null): hand is RawHand {
  if (hand === null) return false
  if (hand.landmarks.length !== NUM_LANDMARKS) return false
  return hand.landmarks.every((p) => Number.isFinite(p.x) && Number.isFinite(p.y) && Number.isFinite(p.z))
}

/**
 * Assign up to 2 detected hands to right/left slots using MediaPipe's
 * handedness label. Mirrors test_sequence_interface.py's
 * `_build_feature_from_result`: trust the label when present; if a hand
 * has no label (shouldn't happen with @tensorflow-models/hand-pose-detection,
 * whose Hand.handedness is always 'Left'|'Right', but defensive nonetheless),
 * the first unlabelled hand fills the right slot, the second fills the left.
 *
 * Exported (not just used internally) so the recorder's raw-capture path
 * (recording-state-machine.ts) can assign hands to the same right/left
 * slots as live inference, without duplicating this logic.
 */
export function assignHands(hands: RawHand[]): { right: RawHand | null; left: RawHand | null } {
  let right: RawHand | null = null
  let left: RawHand | null = null
  for (const h of hands) {
    if (h.handedness === 'Right' && right === null) right = h
    else if (h.handedness === 'Left' && left === null) left = h
    else if (right === null) right = h
    else if (left === null) left = h
  }
  return { right, left }
}

/**
 * Normalize one hand to a 63-float block: wrist-relative translation, then
 * scaled by the mean wrist→knuckle distance (index/middle/ring/pinky MCP).
 * Returns 63 zeros for a missing/invalid/degenerate (near-zero-size) hand.
 * Ported from landmark_features.py's normalize_hand_landmarks +
 * compute_hand_size — verified to match its numpy output (see Task 3/4's
 * end-to-end numeric parity check against the real trained model).
 */
function normalizeHandBlock(hand: RawHand | null): number[] {
  if (!isValidHand(hand)) return new Array(HAND_BLOCK_SIZE).fill(0)

  const wrist = hand.landmarks[WRIST_IDX]
  const translated = hand.landmarks.map((p) => ({ x: p.x - wrist.x, y: p.y - wrist.y, z: p.z - wrist.z }))

  let sumDist = 0
  for (const idx of KNUCKLE_IDXS) {
    const p = translated[idx]
    sumDist += Math.sqrt(p.x * p.x + p.y * p.y + p.z * p.z)
  }
  const handSize = sumDist / KNUCKLE_IDXS.length

  if (!(handSize > NORMALIZATION_EPSILON)) {
    return new Array(HAND_BLOCK_SIZE).fill(0)
  }

  const out: number[] = []
  for (const p of translated) {
    out.push(p.x / handSize, p.y / handSize, p.z / handSize)
  }
  return out
}

/**
 * Build the 127-dim dual-hand frame feature vector the dynamic_v2 GRU model
 * expects: [numHands, ...rightHandBlock(63), ...leftHandBlock(63)].
 * `numHands` only counts hands that pass `isValidHand` (matches
 * landmark_features.py's `hand_block_is_valid` gating both the count and
 * the per-hand block).
 */
export function buildDualHandFrame(hands: RawHand[]): number[] {
  const { right, left } = assignHands(hands)
  const rightValid = isValidHand(right)
  const leftValid = isValidHand(left)
  const numHands = (rightValid ? 1 : 0) + (leftValid ? 1 : 0)
  return [numHands, ...normalizeHandBlock(rightValid ? right : null), ...normalizeHandBlock(leftValid ? left : null)]
}

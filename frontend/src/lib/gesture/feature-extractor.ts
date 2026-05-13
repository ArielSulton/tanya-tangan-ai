import type { HandPair, NormalizedHand, FrameFeatures } from './types'

const LANDMARKS_PER_HAND = 21
const COORDS_PER_LANDMARK = 2 // x, y (z is intentionally dropped)
const FLOATS_PER_HAND = LANDMARKS_PER_HAND * COORDS_PER_LANDMARK // 42
export const FRAME_FEATURE_LENGTH = FLOATS_PER_HAND * 2 // 84

function appendHand(out: number[], hand: NormalizedHand | null): void {
  if (hand === null) {
    for (let i = 0; i < FLOATS_PER_HAND; i++) out.push(0)
    return
  }
  for (const lm of hand.landmarks) {
    out.push(lm.x, lm.y)
  }
}

/**
 * Flatten a sorted [slot0, slot1] hand pair into an 84-float feature vector.
 *
 * Layout: [slot0_x0, slot0_y0, ..., slot0_x20, slot0_y20,
 *          slot1_x0, slot1_y0, ..., slot1_x20, slot1_y20]
 *
 * Missing hand slots are zero-filled. z coordinates are dropped.
 */
export function extractFrameFeatures(pair: HandPair): FrameFeatures {
  const out: number[] = []
  appendHand(out, pair[0])
  appendHand(out, pair[1])
  return out
}

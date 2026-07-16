import { buildDualHandFrame, assignHands, SEQ_LENGTH } from './dual-hand-features'
import type { RawHand } from './types'

export { SEQ_LENGTH }

// Ported from the reference project's realtime_inference_sync.py state
// machine constants — starting point, tunable once real webcam testing is
// possible against the actual trained dynamic_v2 model's confidence profile.
export const DETECTION_FRAMES = 6
export const HAND_LOST_FRAMES = 8
export const COOLDOWN_FRAMES = 12
export const SLIDE_STEP = 2
export const SMOOTH_WINDOW = 5
export const VOTE_MIN_COUNT = 3
export const MIN_FINAL_CONFIDENCE = 0.45

// Motion gate: minimum 2D variance of the index fingertip position across
// the prediction window for shouldPredict to fire. Guards against the GRU
// classifying a HELD STATIC POSE: the model has no background class, so with
// a window of near-identical frames it is forced to emit *some* word —
// consistently, which sails through the majority vote (the "L YANG"
// double-detection bug).
//
// The fingertip position is normalized by the hand's own size (mean
// wrist→knuckle distance, same measure as dual-hand-features.ts) before the
// variance is taken, making the gate invariant to BOTH camera resolution
// (mobile streams are often portrait / higher-res than the 640x480 ideal)
// and hand distance from the camera. It must still start from raw pixel
// coordinates — the 127-dim model features are wrist-relative-normalized,
// which erases global hand motion entirely.
//
// Calibration: motion-detector.ts's pixel-space reference points (640x480,
// hold jitter ≈ 300 px², clear motion ≥ 1500 px²) with a typical on-screen
// hand size of ~80px map to ≈ 0.05 and ≈ 0.23 in hand-size units; 0.1 sits
// between with margin on both sides.
export const MOTION_MIN_VARIANCE = 0.1
const FINGERTIP_IDX = 8
const WRIST_IDX = 0
const KNUCKLE_IDXS = [5, 9, 13, 17]
const HAND_SIZE_EPSILON = 1e-6

interface TrackPoint {
  x: number
  y: number
}

/** Mean wrist→knuckle distance in the hand's own coordinate space — the
 *  scale factor used to normalize fingertip motion. Returns 0 for a
 *  degenerate hand. */
function handSizeOf(hand: RawHand): number {
  const wrist = hand.landmarks[WRIST_IDX]
  let sum = 0
  for (const idx of KNUCKLE_IDXS) {
    const p = hand.landmarks[idx]
    const dx = p.x - wrist.x
    const dy = p.y - wrist.y
    sum += Math.sqrt(dx * dx + dy * dy)
  }
  return sum / KNUCKLE_IDXS.length
}

/** Index fingertip position in hand-size units, or null for a degenerate
 *  (near-zero-size) hand. */
function normalizedFingertip(hand: RawHand): TrackPoint | null {
  const size = handSizeOf(hand)
  if (!(size > HAND_SIZE_EPSILON)) return null
  const tip = hand.landmarks[FINGERTIP_IDX]
  return { x: tip.x / size, y: tip.y / size }
}

function varianceOf(points: TrackPoint[]): number {
  if (points.length < 2) return 0
  let mx = 0
  let my = 0
  for (const p of points) {
    mx += p.x
    my += p.y
  }
  mx /= points.length
  my /= points.length
  let v = 0
  for (const p of points) {
    const dx = p.x - mx
    const dy = p.y - my
    v += dx * dx + dy * dy
  }
  return v / points.length
}

export type SequenceState = 'idle' | 'recording' | 'predicting' | 'cooldown'

export interface SequenceStepResult {
  state: SequenceState
  /** True only on the frame where the caller should run the classifier. */
  shouldPredict: boolean
  /** The SEQ_LENGTH-frame buffer snapshot to classify, present iff shouldPredict. */
  frames: number[][] | null
}

/**
 * IDLE → RECORDING → PREDICTING → COOLDOWN cycle driving when the dynamic
 * classifier runs, ported from the reference project's
 * realtime_inference_sync.py state machine. Recording/predicting is entered
 * on hand presence alone, but shouldPredict additionally requires real
 * motion across the window (MOTION_MIN_VARIANCE on raw fingertip pixels).
 * The original port assumed the model itself would discriminate a static
 * hold from a gesture — false in practice: with no background class the
 * softmax must pick some word for a frozen window, and it does so
 * consistently, defeating the majority vote.
 */
export class SequenceStateMachine {
  private state: SequenceState = 'idle'
  private buffer: number[][] = []
  // Raw fingertip positions per buffered frame (right/left slots), kept in
  // lockstep with `buffer` for the motion-gate variance computation.
  private motionPoints: { right: TrackPoint | null; left: TrackPoint | null }[] = []
  private handSeenFrames = 0
  private handLostFrames = 0
  private cooldownCounter = 0
  private frameCounter = 0

  getState(): SequenceState {
    return this.state
  }

  /** Advance one processed frame. `hands` is the frame's raw detections (empty = no hand). */
  step(hands: RawHand[]): SequenceStepResult {
    this.frameCounter++
    const hasHand = hands.length > 0

    if (hasHand) {
      this.handLostFrames = 0
      this.handSeenFrames++
    } else {
      this.handSeenFrames = 0
      this.handLostFrames++
    }

    if (this.state === 'idle') {
      if (this.handSeenFrames >= DETECTION_FRAMES) {
        this.state = 'recording'
        this.buffer = []
        this.motionPoints = []
      }
      return { state: this.state, shouldPredict: false, frames: null }
    }

    if (this.state === 'cooldown') {
      this.cooldownCounter++
      if (this.cooldownCounter >= COOLDOWN_FRAMES) {
        this.reset()
      }
      return { state: this.state, shouldPredict: false, frames: null }
    }

    // recording or predicting
    if (this.handLostFrames >= HAND_LOST_FRAMES) {
      this.reset()
      return { state: this.state, shouldPredict: false, frames: null }
    }

    if (hasHand) {
      this.buffer.push(buildDualHandFrame(hands))
      const { right, left } = assignHands(hands)
      this.motionPoints.push({
        right: right ? normalizedFingertip(right) : null,
        left: left ? normalizedFingertip(left) : null,
      })
      if (this.buffer.length > SEQ_LENGTH) this.buffer.shift()
      if (this.motionPoints.length > SEQ_LENGTH) this.motionPoints.shift()
    }

    if (this.state === 'recording' && this.buffer.length >= SEQ_LENGTH) {
      this.state = 'predicting'
    }

    if (
      this.state === 'predicting' &&
      this.buffer.length >= SEQ_LENGTH &&
      this.frameCounter % SLIDE_STEP === 0 &&
      this.hasWindowMotion()
    ) {
      return { state: this.state, shouldPredict: true, frames: this.buffer.slice(-SEQ_LENGTH) }
    }

    return { state: this.state, shouldPredict: false, frames: null }
  }

  /** True iff either hand's fingertip (in hand-size units) moved enough
   *  across the buffered window to clear MOTION_MIN_VARIANCE — the motion
   *  gate that stops the classifier from running on a held static pose. */
  private hasWindowMotion(): boolean {
    const rights: TrackPoint[] = []
    const lefts: TrackPoint[] = []
    for (const p of this.motionPoints) {
      if (p.right) rights.push(p.right)
      if (p.left) lefts.push(p.left)
    }
    return Math.max(varianceOf(rights), varianceOf(lefts)) >= MOTION_MIN_VARIANCE
  }

  /** Call once a caller-side majority vote + confidence gate accepts a
   *  prediction — moves to cooldown and clears the frame buffer. */
  acceptPrediction(): void {
    this.state = 'cooldown'
    this.cooldownCounter = 0
    this.buffer = []
    this.motionPoints = []
  }

  reset(): void {
    this.state = 'idle'
    this.buffer = []
    this.motionPoints = []
    this.handSeenFrames = 0
    this.handLostFrames = 0
    this.cooldownCounter = 0
  }
}

/**
 * Majority-vote smoothing across consecutive classifier calls (ported from
 * realtime_inference_sync.py's majority_vote). Returns the label with the
 * most occurrences in `history`, or null if none reaches `minCount`.
 */
export function majorityVote(history: string[], minCount: number): string | null {
  if (history.length === 0) return null
  const counts = new Map<string, number>()
  for (const label of history) counts.set(label, (counts.get(label) ?? 0) + 1)
  let bestLabel: string | null = null
  let bestCount = 0
  for (const [label, count] of counts) {
    if (count > bestCount) {
      bestCount = count
      bestLabel = label
    }
  }
  return bestCount >= minCount ? bestLabel : null
}

import { buildDualHandFrame, SEQ_LENGTH } from './dual-hand-features'
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
 * realtime_inference_sync.py state machine. Unlike the old MotionDetector
 * (variance-threshold based), this triggers purely on hand presence/absence
 * — motion is implicit in the fact that a real gesture fills the window
 * with genuinely different per-frame hand poses, which the model itself
 * discriminates.
 */
export class SequenceStateMachine {
  private state: SequenceState = 'idle'
  private buffer: number[][] = []
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
      if (this.buffer.length > SEQ_LENGTH) this.buffer.shift()
    }

    if (this.state === 'recording' && this.buffer.length >= SEQ_LENGTH) {
      this.state = 'predicting'
    }

    if (this.state === 'predicting' && this.buffer.length >= SEQ_LENGTH && this.frameCounter % SLIDE_STEP === 0) {
      return { state: this.state, shouldPredict: true, frames: this.buffer.slice(-SEQ_LENGTH) }
    }

    return { state: this.state, shouldPredict: false, frames: null }
  }

  /** Call once a caller-side majority vote + confidence gate accepts a
   *  prediction — moves to cooldown and clears the frame buffer. */
  acceptPrediction(): void {
    this.state = 'cooldown'
    this.cooldownCounter = 0
    this.buffer = []
  }

  reset(): void {
    this.state = 'idle'
    this.buffer = []
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

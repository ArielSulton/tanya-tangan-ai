import type { HandPair, MotionState } from './types'

const WINDOW_SIZE = 15 // ~500ms @ 30fps
const MOTION_START_THRESHOLD = 2000 // variance high enough to be "moving" (raw landmark coords)
const MOTION_END_THRESHOLD = 400 // variance below which we're "still" (raw landmark coords)

/**
 * Variance-based motion detector with hysteresis.
 *
 * Tracks the wrist position of slot 0 over a rolling WINDOW_SIZE-frame buffer
 * and computes 2D variance. Two thresholds (start > end) prevent flapping at
 * the boundary. The state machine:
 *
 *   idle  ──(hand appears)──→  still
 *   still ──(variance ≥ START)──→  moving
 *   moving ──(variance ≤ END)──→  motion_end (one frame) → still
 *   any state ──(no hand)──→  idle (buffer cleared)
 *
 * `update(pair)` advances by exactly one frame and returns the resulting state.
 * `state` property mirrors the last returned value.
 */
export class MotionDetector {
  private buffer: Array<{ x: number; y: number }> = []
  state: MotionState = 'idle'
  private wasMoving = false

  update(pair: HandPair): MotionState {
    const slot0 = pair[0]
    if (slot0 === null) {
      this.buffer = []
      this.wasMoving = false
      this.state = 'idle'
      return this.state
    }

    const wrist = slot0.landmarks[0]
    this.buffer.push({ x: wrist.x, y: wrist.y })
    if (this.buffer.length > WINDOW_SIZE) {
      this.buffer.shift()
    }

    if (this.buffer.length < WINDOW_SIZE) {
      // Not enough samples yet — report 'still' once a hand is present
      this.state = 'still'
      return this.state
    }

    const variance = this.computeVariance()

    if (this.wasMoving) {
      if (variance <= MOTION_END_THRESHOLD) {
        this.wasMoving = false
        this.state = 'motion_end'
      } else {
        this.state = 'moving'
      }
    } else {
      if (variance >= MOTION_START_THRESHOLD) {
        this.wasMoving = true
        this.state = 'moving'
      } else {
        this.state = 'still'
      }
    }
    return this.state
  }

  private computeVariance(): number {
    let mx = 0
    let my = 0
    for (const p of this.buffer) {
      mx += p.x
      my += p.y
    }
    mx /= this.buffer.length
    my /= this.buffer.length

    let v = 0
    for (const p of this.buffer) {
      const dx = p.x - mx
      const dy = p.y - my
      v += dx * dx + dy * dy
    }
    return v / this.buffer.length
  }
}

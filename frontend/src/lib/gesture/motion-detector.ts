import type { MotionState } from './types'

const WINDOW_SIZE = 15 // ~500ms @ 30fps
// Thresholds are coordinate-space-dependent. These defaults assume raw
// pixel-space wrist positions from a ~640x480 frame: a variance of ~400
// corresponds to small jitter, ~2000+ to clear motion. When calling this
// detector, the caller must feed wrist coordinates in a consistent space
// (typically raw image pixels, NOT palm-normalized landmark space, where
// the wrist is at (0,0) by construction and variance would be zero).
const MOTION_START_THRESHOLD = 2000
const MOTION_END_THRESHOLD = 400

export interface TrackingPoint {
  x: number
  y: number
}

/**
 * Variance-based motion detector with hysteresis.
 *
 * Tracks a single 2D point (typically slot 0's wrist position in image pixel
 * space) over a rolling WINDOW_SIZE-frame buffer and computes 2D variance.
 * Two thresholds (start > end) prevent flapping at the boundary.
 *
 * State machine:
 *   idle  ──(point appears)──→  still
 *   still ──(variance ≥ START)──→  moving
 *   moving ──(variance ≤ END)──→  motion_end (one frame) → still
 *   any state ──(point disappears, null)──→  idle (buffer cleared)
 *
 * Important: caller must pass coordinates in a frame where motion is
 * observable — i.e. NOT palm-normalized landmark coordinates (where the
 * wrist is at the origin). Pass image-pixel wrist positions or another
 * coordinate space that varies as the hand moves.
 *
 * `update(point)` advances by exactly one frame and returns the resulting
 * state. `state` property mirrors the last returned value.
 */
export class MotionDetector {
  private buffer: TrackingPoint[] = []
  state: MotionState = 'idle'
  private wasMoving = false

  update(point: TrackingPoint | null): MotionState {
    if (point === null) {
      this.buffer = []
      this.wasMoving = false
      this.state = 'idle'
      return this.state
    }

    this.buffer.push({ x: point.x, y: point.y })
    if (this.buffer.length > WINDOW_SIZE) {
      this.buffer.shift()
    }

    if (this.buffer.length < WINDOW_SIZE) {
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

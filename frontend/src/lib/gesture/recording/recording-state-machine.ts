import { assignHands } from '../dual-hand-features'
import type { RawHand } from '../types'

// Ported verbatim from the reference project's collect_landmarks.py
// "Phase 3 capture constants".
export const START_THRESHOLD = 3
export const END_THRESHOLD = 8
export const MAX_RECORDING_FRAMES = 120
export const MAX_RECORDING_SECONDS = 3.0
export const MIN_ACTIVE_FRAMES = 3

const NUM_LANDMARKS = 21

export type RecordingState = 'idle' | 'recording'

/** One frame's raw (unnormalized) dual-hand landmarks — mirrors the reference's
 *  wide two-hand CSV schema (SEQUENCE_HEADER), pre-normalization. */
export interface RawFrameRow {
  handCount: number
  leftPresent: boolean
  rightPresent: boolean
  /** 63 raw x,y,z floats (image-space, NOT wrist-normalized), or null if absent. */
  left: number[] | null
  right: number[] | null
}

export interface RecordingStepResult {
  state: RecordingState
  /** Present only on the frame a take was auto-finalized (saved or discarded). */
  finished: { rows: RawFrameRow[]; discarded: boolean } | null
}

function flattenRawLandmarks(hand: RawHand | null): number[] | null {
  if (hand === null) return null
  if (hand.landmarks.length !== NUM_LANDMARKS) return null
  const out: number[] = []
  for (const lm of hand.landmarks) out.push(lm.x, lm.y, lm.z)
  return out
}

/** Build one raw frame row from this tick's detected hands, using the same
 *  handedness-based right/left assignment as live inference (assignHands). */
export function rawHandsToFrameRow(hands: RawHand[]): RawFrameRow {
  const { right, left } = assignHands(hands)
  const rightFlat = flattenRawLandmarks(right)
  const leftFlat = flattenRawLandmarks(left)
  return {
    handCount: (rightFlat !== null ? 1 : 0) + (leftFlat !== null ? 1 : 0),
    leftPresent: leftFlat !== null,
    rightPresent: rightFlat !== null,
    left: leftFlat,
    right: rightFlat,
  }
}

/**
 * Automatic IDLE → RECORDING capture state machine, ported from
 * collect_landmarks.py's process_frame. No manual start/stop — a take
 * begins after START_THRESHOLD consecutive hand-present frames (warm-started
 * from a prebuffer so the trigger frames themselves aren't lost) and ends
 * when the hand is lost for END_THRESHOLD frames, or MAX_RECORDING_FRAMES /
 * MAX_RECORDING_SECONDS is hit. Finalized takes with too few active frames
 * are reported as discarded rather than silently dropped, so the UI can
 * show the operator what happened.
 */
export class RecordingStateMachine {
  private state: RecordingState = 'idle'
  private consecActive = 0
  private consecInactive = 0
  private prebuffer: RawFrameRow[] = []
  private recordingBuffer: RawFrameRow[] = []
  private recordingStartTime: number | null = null
  private readonly now: () => number

  constructor(now: () => number = () => Date.now()) {
    this.now = now
  }

  getState(): RecordingState {
    return this.state
  }

  reset(): void {
    this.state = 'idle'
    this.consecActive = 0
    this.consecInactive = 0
    this.prebuffer = []
    this.recordingBuffer = []
    this.recordingStartTime = null
  }

  step(hands: RawHand[]): RecordingStepResult {
    const row = rawHandsToFrameRow(hands)
    const numHands = row.handCount

    this.prebuffer.push(row)
    if (this.prebuffer.length > START_THRESHOLD) this.prebuffer.shift()

    if (this.state === 'idle') {
      this.consecActive = numHands > 0 ? this.consecActive + 1 : 0
      if (this.consecActive >= START_THRESHOLD) {
        this.recordingBuffer = [...this.prebuffer]
        this.state = 'recording'
        this.consecInactive = 0
        this.consecActive = 0
        this.recordingStartTime = this.now()
      }
      return { state: this.state, finished: null }
    }

    // recording
    this.recordingBuffer.push(row)
    if (numHands > 0) {
      this.consecInactive = 0
    } else {
      this.consecInactive++
    }

    const elapsedMs = this.recordingStartTime !== null ? this.now() - this.recordingStartTime : 0
    const maxFramesReached = this.recordingBuffer.length >= MAX_RECORDING_FRAMES
    const maxTimeReached = elapsedMs >= MAX_RECORDING_SECONDS * 1000

    if (this.consecInactive >= END_THRESHOLD || maxFramesReached || maxTimeReached) {
      const rows = this.recordingBuffer
      const activeCount = rows.filter((r) => r.handCount > 0).length
      this.reset()
      return { state: this.state, finished: { rows, discarded: activeCount < MIN_ACTIVE_FRAMES } }
    }

    return { state: this.state, finished: null }
  }
}

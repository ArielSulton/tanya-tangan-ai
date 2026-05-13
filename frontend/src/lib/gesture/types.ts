/**
 * Shared types for the browser-side gesture recognition engine.
 *
 * The engine adapts the existing GestureRecognitionService output
 * to the GestureResult shape consumed by useGestureRecognition.
 */

export interface BrowserGestureResult {
  letter: string
  confidence: number
  alternatives: Array<{ letter: string; confidence: number }>
  timestamp: number
  processingTimeMs: number
  /**
   * Source of the result. 'browser' = in-browser HandPose + Fingerpose.
   * 'yolo-fallback' = legacy backend YOLO endpoint, used when browser init failed.
   */
  source: 'browser' | 'yolo-fallback'
}

export type EngineStatus =
  | 'uninitialized'
  | 'initializing'
  | 'ready'
  | 'running'
  | 'stopped'
  | 'failed-falling-back'
  | 'fallback-ready'

/**
 * A single hand landmark in normalized image coordinates from MediaPipe.
 * x and y are 2D image coordinates (pixels or normalized depending on caller);
 * z is depth (often 0 in the v0.1.0 handpose model).
 */
export interface RawHandLandmark {
  x: number
  y: number
  z: number
}

/**
 * A raw hand observation from MediaPipe HandPose: 21 landmarks plus a
 * confidence score. No ordering / handedness implied yet.
 */
export interface RawHand {
  landmarks: RawHandLandmark[]
  confidence: number
}

/**
 * A hand that has been normalized: wrist (landmark 0) is the origin, and the
 * distance from wrist to middle-finger MCP (landmark 9) is unit length.
 * 21 landmarks, same indexing as RawHand.
 */
export interface NormalizedHand {
  landmarks: RawHandLandmark[]
  confidence: number
}

/**
 * Two-slot tuple where slot 0 is the leftmost hand (smallest wrist x) and slot
 * 1 is the rightmost. Either slot may be null if fewer than 2 hands were
 * detected this frame. Slot order is positional, NOT biological L/R handedness.
 */
export type HandPair = [NormalizedHand | null, NormalizedHand | null]

/**
 * Frame-level feature vector consumed by the static classifier (Phase 2D).
 * Layout: [slot0_x0, slot0_y0, ..., slot0_x20, slot0_y20,
 *          slot1_x0, slot1_y0, ..., slot1_x20, slot1_y20]
 * Length is always 84. Missing hand slots are filled with zeros.
 */
export type FrameFeatures = number[]

/**
 * Result of running the motion detector over the recent landmark history.
 *
 * - 'idle':         no hand visible
 * - 'still':        at least one hand visible and motion below threshold
 * - 'moving':       motion above threshold
 * - 'motion_end':   transient — most recent step crossed from moving → still
 *
 * Consumers treat 'motion_end' as a one-shot trigger (dispatch dynamic
 * classifier on the window leading up to it).
 */
export type MotionState = 'idle' | 'still' | 'moving' | 'motion_end'

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

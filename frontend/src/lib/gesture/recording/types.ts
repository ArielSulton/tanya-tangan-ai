/**
 * Types for the gesture-recorder dev tool. Static samples capture a single
 * frame's 84-float feature vector; dynamic samples capture a 24-frame
 * point-history buffer of the dominant hand's wrist position in image
 * pixel space (matching the Kazuhito reference layout but with our own
 * coordinate space).
 */

import type { FrameFeatures } from '../types'

/**
 * Length of the rolling wrist-trajectory buffer for dynamic gestures.
 * At ~30fps this gives a ~1.1s window — balance between covering motion
 * words (jeruk-mengupas, kucing, etc.) and keeping motion_end latency low.
 *
 * CHANGING THIS REQUIRES retraining the dynamic model (input shape changes),
 * regenerating point-history CSVs, and updating training/train_dynamic.ipynb
 * (FEATURE_LENGTH = DYNAMIC_HISTORY_SIZE * 2).
 */
export const DYNAMIC_HISTORY_SIZE = 32
export const DYNAMIC_FEATURE_LENGTH = DYNAMIC_HISTORY_SIZE * 2

/** Static keypoint sample: one frame, 84 floats, labelled. */
export interface StaticSample {
  /** Stable unique id (uuid). */
  id: string
  /** Class label (e.g., 'A', 'B', ... 'Z'). */
  label: string
  /** 84-float feature vector from extractFrameFeatures. */
  features: FrameFeatures
  /** Capture timestamp (ms since epoch). */
  capturedAt: number
  /** How the label was assigned. */
  source: 'manual' | 'yolo-auto'
}

/** A single point in the dynamic history buffer (image-pixel coordinates). */
export interface HistoryPoint {
  x: number
  y: number
}

/** Dynamic point-history sample: 24-frame buffer, labelled. */
export interface DynamicSample {
  id: string
  /** Class label (e.g., 'jeruk', 'besar', 'kecil'). */
  label: string
  /** 24-element buffer of dominant-hand wrist positions over time. */
  history: HistoryPoint[]
  capturedAt: number
  source: 'manual'
}

/** Static class set (SIBI alphabet, J excluded as per existing convention). */
// J and Z are traced in the air (motion gestures), so they belong in the
// dynamic class set, not static. 24 static alphabet classes total.
export const STATIC_CLASSES = [
  'A',
  'B',
  'C',
  'D',
  'E',
  'F',
  'G',
  'H',
  'I',
  'K',
  'L',
  'M',
  'N',
  'O',
  'P',
  'Q',
  'R',
  'S',
  'T',
  'U',
  'V',
  'W',
  'X',
  'Y',
] as const

export type StaticClass = (typeof STATIC_CLASSES)[number]

/**
 * Suggested dynamic-class names. Shown in the recorder UI as quick-pick chips,
 * but the user is free to type any label — DynamicClass is plain string and
 * the trained model's label set is whatever appears in the exported CSV.
 */
export const DYNAMIC_CLASS_SUGGESTIONS = ['jeruk', 'kucing', 'besar', 'kecil', 'sangat', 'j', 'z'] as const

export type DynamicClass = string

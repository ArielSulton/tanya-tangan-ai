/**
 * Types for the gesture-recorder dev tool. Static samples capture a single
 * frame's 84-float feature vector; dynamic samples capture a 24-frame
 * point-history buffer of the dominant hand's wrist position in image
 * pixel space (matching the Kazuhito reference layout but with our own
 * coordinate space).
 */

import type { FrameFeatures } from '../types'

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
export const STATIC_CLASSES = [
  'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I',
  'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S',
  'T', 'U', 'V', 'W', 'X', 'Y', 'Z',
] as const

export type StaticClass = (typeof STATIC_CLASSES)[number]

/** Initial dynamic class set (extend as needed in Phase 2E). */
export const DYNAMIC_CLASSES = [
  'jeruk', 'kucing', 'besar', 'kecil', 'sangat',
] as const

export type DynamicClass = (typeof DYNAMIC_CLASSES)[number]

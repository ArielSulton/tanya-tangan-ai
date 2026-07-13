import type { RawFrameRow } from './recording-state-machine'

/**
 * A dynamic_v2 take: raw (unnormalized, un-resampled) per-frame dual-hand
 * landmark rows produced by RecordingStateMachine, stamped with a label.
 * Kept separate from the old `DynamicSample`/`HistoryPoint` in ./types.ts
 * (wrist-only, 32-frame) per project decision — that old path stays in the
 * repo, unmodified, unused. Normalization + resampling-to-30-frames happens
 * offline (Task 6's Python preprocessing script), not here.
 */
export interface DynamicSampleV2 {
  id: string
  label: string
  capturedAt: number
  /** Matches DynamicSample's convention — SampleList's badge expects this field. */
  source: 'manual'
  rows: RawFrameRow[]
}

/** Suggested dynamic_v2 class names, shown as quick-pick chips in the recorder. */
export const DYNAMIC_V2_CLASS_SUGGESTIONS = ['halo', 'seperti', 'yang'] as const

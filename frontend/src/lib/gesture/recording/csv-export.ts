import { DYNAMIC_HISTORY_SIZE, type StaticSample, type DynamicSample } from './types'
import type { DynamicSampleV2 } from './dynamic-v2-types'
import type { RawFrameRow } from './recording-state-machine'

const STATIC_FEATURE_LENGTH = 84
const DYNAMIC_HISTORY_LENGTH = DYNAMIC_HISTORY_SIZE
const NUM_LANDMARKS = 21
const HAND_RAW_LEN = NUM_LANDMARKS * 3

/**
 * Serialize a list of static samples to CSV.
 * Format: label,f0,f1,...,f83  (85 columns)
 * Empty list returns header-only CSV with no trailing newline.
 */
export function staticSamplesToCsv(samples: StaticSample[]): string {
  const headers = ['label', ...Array.from({ length: STATIC_FEATURE_LENGTH }, (_, i) => `f${i}`)]
  const lines: string[] = [headers.join(',')]
  for (const s of samples) {
    if (s.features.length !== STATIC_FEATURE_LENGTH) {
      throw new Error(
        `staticSamplesToCsv: sample "${s.id}" has ${s.features.length} features, expected ${STATIC_FEATURE_LENGTH}`,
      )
    }
    lines.push([s.label, ...s.features].join(','))
  }
  return lines.join('\n')
}

/**
 * Serialize a list of dynamic samples to CSV.
 * Format: label,x0,y0,x1,y1,...,x{N-1},y{N-1} where N = DYNAMIC_HISTORY_SIZE.
 */
export function dynamicSamplesToCsv(samples: DynamicSample[]): string {
  const headers = ['label', ...Array.from({ length: DYNAMIC_HISTORY_LENGTH }, (_, i) => [`x${i}`, `y${i}`]).flat()]
  const lines: string[] = [headers.join(',')]
  for (const s of samples) {
    if (s.history.length !== DYNAMIC_HISTORY_LENGTH) {
      throw new Error(
        `dynamicSamplesToCsv: sample "${s.id}" has ${s.history.length} history points, expected ${DYNAMIC_HISTORY_LENGTH}`,
      )
    }
    const flat = s.history.flatMap((p) => [p.x, p.y])
    lines.push([s.label, ...flat].join(','))
  }
  return lines.join('\n')
}

function landmarkCols(prefix: 'left' | 'right'): string[] {
  const cols: string[] = []
  for (let i = 0; i < NUM_LANDMARKS; i++) {
    cols.push(`${prefix}_x${i}`, `${prefix}_y${i}`, `${prefix}_z${i}`)
  }
  return cols
}

function rowValues(row: RawFrameRow): number[] {
  const left = row.left ?? new Array(HAND_RAW_LEN).fill(0)
  const right = row.right ?? new Array(HAND_RAW_LEN).fill(0)
  return [row.handCount, row.leftPresent ? 1 : 0, row.rightPresent ? 1 : 0, ...left, ...right]
}

/**
 * Serialize dynamic_v2 takes to a raw, wide-schema CSV — ONE ROW PER FRAME,
 * matching the reference project's SEQUENCE_HEADER exactly:
 * label,sample_id,hand_count,left_present,right_present,left_x0..z20,right_x0..z20
 * (131 columns). Deliberately NOT normalized or resampled here — that's
 * Task 6's Python preprocessing script's job, mirroring how the reference
 * project separates raw capture from offline feature engineering.
 */
export function dynamicV2SamplesToCsv(samples: DynamicSampleV2[]): string {
  const headers = [
    'label',
    'sample_id',
    'hand_count',
    'left_present',
    'right_present',
    ...landmarkCols('left'),
    ...landmarkCols('right'),
  ]
  const lines: string[] = [headers.join(',')]
  for (const s of samples) {
    for (const row of s.rows) {
      lines.push([s.label, s.id, ...rowValues(row)].join(','))
    }
  }
  return lines.join('\n')
}

import { DYNAMIC_HISTORY_SIZE, type StaticSample, type DynamicSample } from './types'

const STATIC_FEATURE_LENGTH = 84
const DYNAMIC_HISTORY_LENGTH = DYNAMIC_HISTORY_SIZE

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
  const headers = [
    'label',
    ...Array.from({ length: DYNAMIC_HISTORY_LENGTH }, (_, i) => [`x${i}`, `y${i}`]).flat(),
  ]
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

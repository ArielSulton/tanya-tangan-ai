import type { HistoryPoint } from './types'

/**
 * Wall-clock window that the dynamic recorder/engine collects raw wrist
 * points over before resampling to DYNAMIC_HISTORY_SIZE uniform output
 * points. Decouples sample length from the host laptop's MediaPipe inference
 * rate — a "jeruk" gesture takes the same temporal shape on a 30fps laptop
 * and a 10fps laptop after resampling.
 */
export const DYNAMIC_BUFFER_DURATION_MS = 1500

/** A wrist landmark observation with a wall-clock timestamp (ms epoch). */
export interface TimedPoint {
  x: number
  y: number
  t: number
}

/**
 * Linear-interpolate a timed-point buffer into `n` uniformly-spaced output
 * points spanning `durationMs` (anchored to buffer[0].t). Output is plain
 * {x,y} so downstream consumers (CSV, model) see no schema change.
 *
 * - Empty buffer → empty output.
 * - Single point → output is n copies of that point.
 * - Target times beyond the buffer's last sample are clamped to the last
 *   point (rare since callers gate on durationMs, but defensive).
 */
export function resampleToN(buffer: TimedPoint[], n: number, durationMs: number): HistoryPoint[] {
  if (buffer.length === 0) return []
  if (buffer.length === 1) {
    return Array.from({ length: n }, () => ({ x: buffer[0].x, y: buffer[0].y }))
  }
  const out: HistoryPoint[] = []
  const tStart = buffer[0].t
  const last = buffer[buffer.length - 1]
  let j = 1
  for (let i = 0; i < n; i++) {
    const targetT = tStart + (i / (n - 1)) * durationMs
    while (j < buffer.length && buffer[j].t < targetT) j++
    if (j >= buffer.length) {
      out.push({ x: last.x, y: last.y })
      continue
    }
    const a = buffer[j - 1]
    const b = buffer[j]
    const span = b.t - a.t
    const frac = span > 0 ? (targetT - a.t) / span : 0
    out.push({
      x: a.x + frac * (b.x - a.x),
      y: a.y + frac * (b.y - a.y),
    })
  }
  return out
}

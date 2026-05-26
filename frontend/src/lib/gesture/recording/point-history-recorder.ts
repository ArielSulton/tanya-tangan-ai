import { DYNAMIC_HISTORY_SIZE, type HistoryPoint, type DynamicSample } from './types'
import { DYNAMIC_BUFFER_DURATION_MS, resampleToN, type TimedPoint } from './resample'

function genId(): string {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `d-${Date.now()}-${Math.random().toString(36).slice(2)}`
}

/**
 * Time-windowed buffer of wrist positions for dynamic gesture sampling.
 *
 * Each push records (x, y, t). The buffer keeps points within a rolling
 * DYNAMIC_BUFFER_DURATION_MS window from the most recent push. takeSample()
 * resamples the buffer to a uniform DYNAMIC_HISTORY_SIZE-point trajectory
 * spanning that fixed duration — so a "jeruk" gesture recorded on a 30fps
 * laptop and a 10fps laptop produce identically-shaped training data.
 *
 * The clock can be injected (constructor `now`) for deterministic tests.
 */
export class PointHistoryRecorder {
  private buffer: TimedPoint[] = []
  private readonly now: () => number

  constructor(now: () => number = () => Date.now()) {
    this.now = now
  }

  push(point: HistoryPoint | null): void {
    if (point === null) return
    // Freeze once the buffer reaches target duration — preserves the FIRST
    // frame as the gesture anchor. takeSample() / reset() clears the buffer
    // so the next push starts a fresh recording. No rolling trim: this is
    // user-driven sample collection, not continuous inference.
    if (this.durationMs >= DYNAMIC_BUFFER_DURATION_MS) return
    this.buffer.push({ x: point.x, y: point.y, t: this.now() })
  }

  reset(): void {
    this.buffer = []
  }

  /** Number of raw points currently buffered. Mostly diagnostic. */
  get size(): number {
    return this.buffer.length
  }

  /** Wall-clock duration spanned by the buffer, in ms. */
  get durationMs(): number {
    if (this.buffer.length < 2) return 0
    return this.buffer[this.buffer.length - 1].t - this.buffer[0].t
  }

  /** 0..1 — how close the buffer is to the target duration. UI uses this for the progress bar. */
  get progress(): number {
    return Math.min(1, this.durationMs / DYNAMIC_BUFFER_DURATION_MS)
  }

  takeSample(label: string): DynamicSample {
    if (this.durationMs < DYNAMIC_BUFFER_DURATION_MS) {
      throw new Error(
        `PointHistoryRecorder.takeSample: buffer only ${Math.round(this.durationMs)}ms / ${DYNAMIC_BUFFER_DURATION_MS}ms; let it fill first`,
      )
    }
    const history = resampleToN(this.buffer, DYNAMIC_HISTORY_SIZE, DYNAMIC_BUFFER_DURATION_MS)
    return {
      id: genId(),
      label,
      history,
      capturedAt: this.now(),
      source: 'manual',
    }
  }
}

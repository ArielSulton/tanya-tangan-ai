import { DYNAMIC_HISTORY_SIZE, type HistoryPoint, type DynamicSample } from './types'

const BUFFER_SIZE = DYNAMIC_HISTORY_SIZE

function genId(): string {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `d-${Date.now()}-${Math.random().toString(36).slice(2)}`
}

/**
 * Rolling buffer of wrist positions for dynamic gesture sampling
 * (capacity = DYNAMIC_HISTORY_SIZE).
 * Callers push the slot-0 wrist position each frame (or null when no hand
 * is visible — null pushes are skipped so the buffer only contains valid
 * observations). takeSample(label) snapshots the buffer as a DynamicSample.
 */
export class PointHistoryRecorder {
  private buffer: HistoryPoint[] = []

  push(point: HistoryPoint | null): void {
    if (point === null) return
    this.buffer.push({ x: point.x, y: point.y })
    if (this.buffer.length > BUFFER_SIZE) {
      this.buffer.shift()
    }
  }

  reset(): void {
    this.buffer = []
  }

  /** Returns the current buffer length so the UI can show a progress bar. */
  get size(): number {
    return this.buffer.length
  }

  takeSample(label: string): DynamicSample {
    if (this.buffer.length !== BUFFER_SIZE) {
      throw new Error(
        `PointHistoryRecorder.takeSample: buffer has ${this.buffer.length}/${BUFFER_SIZE} points; let it fill first`,
      )
    }
    return {
      id: genId(),
      label,
      history: this.buffer.map((p) => ({ x: p.x, y: p.y })),
      capturedAt: Date.now(),
      source: 'manual',
    }
  }
}

/**
 * Given a video's duration and a target sampling interval, compute the
 * timestamps (in seconds) to seek to and extract a frame at. Pure — no DOM
 * dependency — so it's independently testable, unlike the actual seek+detect
 * loop that consumes it (VideoImporter.tsx, which needs a real
 * HTMLVideoElement and has no automated test coverage in this codebase).
 *
 * Timestamps are computed via index multiplication (i * intervalSec), not
 * repeated addition, to avoid floating-point drift accumulating over a long
 * video.
 */
export function computeSampleTimestamps(durationSec: number, intervalMs: number): number[] {
  if (!Number.isFinite(durationSec) || durationSec <= 0) return []
  if (!Number.isFinite(intervalMs) || intervalMs <= 0) return []
  const intervalSec = intervalMs / 1000
  const count = Math.ceil(durationSec / intervalSec)
  const timestamps: number[] = []
  for (let i = 0; i < count; i++) {
    const t = i * intervalSec
    if (t < durationSec) timestamps.push(t)
  }
  return timestamps
}

/**
 * Resolves which gesture inference engine to use from the
 * NEXT_PUBLIC_GESTURE_ENGINE env value. Anything other than an explicit
 * 'yolo' (case-insensitive, trimmed) falls back to the in-browser MediaPipe
 * engine — the safe default that needs no backend round-trip.
 */
export type GestureEngineKind = 'mediapipe' | 'yolo'

export function selectGestureEngine(envValue: string | undefined): GestureEngineKind {
  return envValue?.trim().toLowerCase() === 'yolo' ? 'yolo' : 'mediapipe'
}
